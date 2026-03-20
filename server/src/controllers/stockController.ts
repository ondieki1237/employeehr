import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { StockCategory } from "../models/StockCategory"
import { StockProduct } from "../models/StockProduct"
import { StockEntry } from "../models/StockEntry"
import { StockSale } from "../models/StockSale"
import { User } from "../models/User"
import emailService from "../services/email.service"

const ADMIN_ROLES = ["company_admin", "hr"]

function isAdminRole(role?: string) {
  return !!role && ADMIN_ROLES.includes(role)
}

async function sendLowStockAlert(product: any, orgId: string) {
  if (product.currentQuantity > product.minAlertQuantity) return

  const recipients = await User.find({
    org_id: orgId,
    role: { $in: ADMIN_ROLES },
    status: "active",
  })
    .select("email firstName")
    .lean()

  if (!recipients.length) return

  const subject = `Low Stock Alert: ${product.name}`
  const html = `
    <h2>Low Stock Alert</h2>
    <p>The product <strong>${product.name}</strong> has reached the alert threshold.</p>
    <p><strong>Remaining Quantity:</strong> ${product.currentQuantity}</p>
    <p><strong>Alert Threshold:</strong> ${product.minAlertQuantity}</p>
    <p>Advice: Please restock this product soon.</p>
  `

  await Promise.all(
    recipients.map((recipient) =>
      emailService.sendEmail({
        to: recipient.email,
        subject,
        html,
        companyId: orgId,
      }),
    ),
  )
}

export class StockController {
  static async createCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const createdBy = req.user?.userId

      if (!org_id || !createdBy) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can create categories" })
      }

      const { name, description } = req.body
      if (!name) {
        return res.status(400).json({ success: false, message: "Category name is required" })
      }

      const existing = await StockCategory.findOne({ org_id, name: String(name).trim() })
      if (existing) {
        return res.status(409).json({ success: false, message: "Category already exists" })
      }

      const category = await StockCategory.create({
        org_id,
        name: String(name).trim(),
        description: description ? String(description).trim() : undefined,
        createdBy,
      })

      return res.status(201).json({ success: true, data: category })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to create category" })
    }
  }

  static async getCategories(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const categories = await StockCategory.find({ org_id }).sort({ name: 1 }).lean()
      return res.status(200).json({ success: true, data: categories })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch categories" })
    }
  }

  static async createProduct(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const createdBy = req.user?.userId

      if (!org_id || !createdBy) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can create products" })
      }

      const {
        name,
        category,
        startingPrice,
        sellingPrice,
        minAlertQuantity,
        currentQuantity = 0,
        assignedUsers = [],
      } = req.body

      if (!name || !category) {
        return res.status(400).json({ success: false, message: "Product name and category are required" })
      }

      if (Number(startingPrice) < 0 || Number(sellingPrice) < 0 || Number(minAlertQuantity) < 0 || Number(currentQuantity) < 0) {
        return res.status(400).json({ success: false, message: "Price and quantity values must be positive" })
      }

      const categoryExists = await StockCategory.findOne({ _id: category, org_id })
      if (!categoryExists) {
        return res.status(404).json({ success: false, message: "Category not found" })
      }

      const product = await StockProduct.create({
        org_id,
        name: String(name).trim(),
        category,
        startingPrice: Number(startingPrice),
        sellingPrice: Number(sellingPrice),
        minAlertQuantity: Number(minAlertQuantity),
        currentQuantity: Number(currentQuantity),
        assignedUsers: Array.isArray(assignedUsers) ? assignedUsers : [],
        createdBy,
      })

      return res.status(201).json({ success: true, data: product })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to create product" })
    }
  }

  static async getProducts(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const products = await StockProduct.find({ org_id })
        .sort({ createdAt: -1 })
        .lean()

      const categoryIds = [...new Set(products.map((product) => product.category).filter(Boolean))]
      const categories = await StockCategory.find({ _id: { $in: categoryIds }, org_id }).lean()
      const categoryMap = new Map(categories.map((category) => [String(category._id), category]))

      const data = products.map((product) => ({
        ...product,
        categoryDetails: categoryMap.get(String(product.category)) || null,
      }))

      return res.status(200).json({ success: true, data })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch products" })
    }
  }

  static async updateProduct(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can update products" })
      }

      const { id } = req.params
      const {
        name,
        category,
        startingPrice,
        sellingPrice,
        minAlertQuantity,
        currentQuantity,
        assignedUsers,
        isActive,
      } = req.body

      const payload: any = {}
      if (name !== undefined) payload.name = String(name).trim()
      if (category !== undefined) payload.category = category
      if (startingPrice !== undefined) payload.startingPrice = Number(startingPrice)
      if (sellingPrice !== undefined) payload.sellingPrice = Number(sellingPrice)
      if (minAlertQuantity !== undefined) payload.minAlertQuantity = Number(minAlertQuantity)
      if (currentQuantity !== undefined) payload.currentQuantity = Number(currentQuantity)
      if (assignedUsers !== undefined) payload.assignedUsers = Array.isArray(assignedUsers) ? assignedUsers : []
      if (isActive !== undefined) payload.isActive = Boolean(isActive)

      if (
        payload.startingPrice < 0 ||
        payload.sellingPrice < 0 ||
        payload.minAlertQuantity < 0 ||
        payload.currentQuantity < 0
      ) {
        return res.status(400).json({ success: false, message: "Price and quantity values must be positive" })
      }

      const product = await StockProduct.findOneAndUpdate({ _id: id, org_id }, { $set: payload }, { new: true })
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" })
      }

      return res.status(200).json({ success: true, data: product })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to update product" })
    }
  }

  static async addStock(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId

      if (!org_id || !actorId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { productId, quantityAdded, note } = req.body

      if (!productId || Number(quantityAdded) <= 0) {
        return res.status(400).json({ success: false, message: "productId and positive quantityAdded are required" })
      }

      const product = await StockProduct.findOne({ _id: productId, org_id })
      if (!product) return res.status(404).json({ success: false, message: "Product not found" })

      const canManage =
        isAdminRole(req.user?.role) ||
        product.assignedUsers.map(String).includes(String(actorId))

      if (!canManage) {
        return res.status(403).json({ success: false, message: "You are not assigned to manage this product" })
      }

      product.currentQuantity += Number(quantityAdded)
      await product.save()

      const stockEntry = await StockEntry.create({
        org_id,
        productId,
        quantityAdded: Number(quantityAdded),
        addedBy: actorId,
        note: note ? String(note) : undefined,
      })

      await sendLowStockAlert(product, org_id)

      return res.status(201).json({
        success: true,
        data: {
          stockEntry,
          product,
        },
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to add stock" })
    }
  }

  static async createSale(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { productId, quantitySold, soldPrice, isSalesCompany = false, salesEmployeeId } = req.body

      if (!productId || Number(quantitySold) <= 0 || Number(soldPrice) < 0) {
        return res.status(400).json({ success: false, message: "productId, positive quantitySold and soldPrice are required" })
      }

      if (isSalesCompany && !salesEmployeeId) {
        return res.status(400).json({ success: false, message: "salesEmployeeId is required when isSalesCompany is true" })
      }

      const product = await StockProduct.findOne({ _id: productId, org_id })
      if (!product) return res.status(404).json({ success: false, message: "Product not found" })

      const canManage =
        isAdminRole(req.user?.role) ||
        product.assignedUsers.map(String).includes(String(actorId))

      if (!canManage) {
        return res.status(403).json({ success: false, message: "You are not assigned to sell this product" })
      }

      if (product.currentQuantity < Number(quantitySold)) {
        return res.status(400).json({ success: false, message: "Cannot sell more than available stock" })
      }

      product.currentQuantity -= Number(quantitySold)
      await product.save()

      const sale = await StockSale.create({
        org_id,
        productId,
        quantitySold: Number(quantitySold),
        soldPrice: Number(soldPrice),
        soldBy: actorId,
        isSalesCompany: Boolean(isSalesCompany),
        salesEmployeeId: isSalesCompany ? String(salesEmployeeId) : undefined,
        remainingQuantity: product.currentQuantity,
      })

      await sendLowStockAlert(product, org_id)

      return res.status(201).json({ success: true, data: { sale, product } })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to record sale" })
    }
  }

  static async getSales(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const query: any = { org_id }
      if (!isAdminRole(req.user?.role)) {
        query.soldBy = req.user?.userId
      }

      const sales = await StockSale.find(query).sort({ createdAt: -1 }).lean()

      const productIds = [...new Set(sales.map((sale) => sale.productId).filter(Boolean))]
      const userIds = [
        ...new Set(
          sales
            .flatMap((sale) => [sale.soldBy, sale.salesEmployeeId])
            .filter(Boolean)
            .map(String),
        ),
      ]

      const [products, users] = await Promise.all([
        StockProduct.find({ _id: { $in: productIds }, org_id }).lean(),
        User.find({ _id: { $in: userIds }, org_id }).select("firstName lastName email").lean(),
      ])

      const productMap = new Map(products.map((product) => [String(product._id), product]))
      const userMap = new Map(users.map((user) => [String(user._id), user]))

      const data = sales.map((sale) => ({
        ...sale,
        product: productMap.get(String(sale.productId)) || null,
        soldByUser: sale.soldBy ? userMap.get(String(sale.soldBy)) || null : null,
        salesEmployee: sale.salesEmployeeId ? userMap.get(String(sale.salesEmployeeId)) || null : null,
      }))

      return res.status(200).json({ success: true, data })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch sales" })
    }
  }

  static async getStockEntries(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      const query: any = { org_id }
      if (!isAdminRole(req.user?.role)) {
        query.addedBy = req.user?.userId
      }

      const entries = await StockEntry.find(query).sort({ createdAt: -1 }).lean()
      return res.status(200).json({ success: true, data: entries })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch stock entries" })
    }
  }
}
