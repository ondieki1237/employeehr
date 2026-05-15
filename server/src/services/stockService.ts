import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export class StockService {
  // ==================== CATEGORY OPERATIONS ====================

  static async createCategory(data: {
    orgId: string
    name: string
    description?: string
    parentId?: string
    createdBy: string
  }) {
    try {
      // Determine level based on parentId
      let level = 1
      if (data.parentId) {
        const parent = await prisma.stockCategory.findUnique({
          where: { id: data.parentId },
        })
        if (!parent) {
          throw new Error("Parent category not found")
        }
        if (parent.level >= 3) {
          throw new Error("Cannot create category deeper than level 3")
        }
        level = parent.level + 1
      }

      // Check for name uniqueness under parent
      const existing = await prisma.stockCategory.findFirst({
        where: {
          orgId: data.orgId,
          name: data.name,
          parentId: data.parentId || null,
        },
      })

      if (existing) {
        throw new Error("Category with this name already exists at this level")
      }

      const category = await prisma.stockCategory.create({
        data: {
          orgId: data.orgId,
          name: data.name,
          description: data.description,
          level,
          parentId: data.parentId || null,
          createdBy: data.createdBy,
          updatedBy: data.createdBy,
        },
        include: {
          parent: true,
          children: true,
        },
      })

      return category
    } catch (error) {
      throw error
    }
  }

  static async updateCategory(data: {
    id: string
    orgId: string
    name?: string
    description?: string
    updatedBy: string
  }) {
    try {
      const category = await prisma.stockCategory.findUnique({
        where: { id: data.id },
      })

      if (!category || category.orgId !== data.orgId) {
        throw new Error("Category not found")
      }

      // If changing name, check uniqueness
      if (data.name && data.name !== category.name) {
        const existing = await prisma.stockCategory.findFirst({
          where: {
            orgId: data.orgId,
            name: data.name,
            parentId: category.parentId,
            NOT: { id: data.id },
          },
        })

        if (existing) {
          throw new Error("Category with this name already exists at this level")
        }
      }

      const updated = await prisma.stockCategory.update({
        where: { id: data.id },
        data: {
          name: data.name,
          description: data.description,
          updatedBy: data.updatedBy,
        },
        include: {
          parent: true,
          children: true,
          products: { select: { id: true } },
        },
      })

      return updated
    } catch (error) {
      throw error
    }
  }

  static async getCategories(orgId: string, parentId?: string | null) {
    try {
      const categories = await prisma.stockCategory.findMany({
        where: {
          orgId,
          parentId: parentId === undefined ? null : parentId,
        },
        include: {
          children: {
            include: {
              children: true,
            },
          },
          products: {
            select: { id: true, name: true },
            take: 5,
          },
          parent: {
            select: { id: true, name: true },
          },
        },
        orderBy: [{ name: "asc" }],
      })

      return categories
    } catch (error) {
      throw error
    }
  }

  static async getCategoryWithHierarchy(id: string, orgId: string) {
    try {
      const category = await prisma.stockCategory.findUnique({
        where: { id },
        include: {
          parent: true,
          children: {
            include: {
              children: {
                include: {
                  children: true,
                },
              },
            },
          },
          products: {
            include: {
              category: true,
            },
          },
        },
      })

      if (!category || category.orgId !== orgId) {
        throw new Error("Category not found")
      }

      return category
    } catch (error) {
      throw error
    }
  }

  static async deleteCategory(id: string, orgId: string) {
    try {
      const category = await prisma.stockCategory.findUnique({
        where: { id },
        include: { products: true, children: true },
      })

      if (!category || category.orgId !== orgId) {
        throw new Error("Category not found")
      }

      if (category.products.length > 0) {
        throw new Error("Cannot delete category with products")
      }

      if (category.children.length > 0) {
        throw new Error("Cannot delete category with subcategories")
      }

      const deleted = await prisma.stockCategory.delete({
        where: { id },
      })

      return deleted
    } catch (error) {
      throw error
    }
  }

  // ==================== PRODUCT OPERATIONS ====================

  static async createProduct(data: {
    orgId: string
    categoryId: string
    name: string
    description?: string
    sku: string
    unitPrice: number
    quantity?: number
    reorderLevel?: number
    supplier?: string
    createdBy: string
  }) {
    try {
      // Verify category exists
      const category = await prisma.stockCategory.findUnique({
        where: { id: data.categoryId },
      })

      if (!category || category.orgId !== data.orgId) {
        throw new Error("Category not found")
      }

      // Check SKU uniqueness
      const existing = await prisma.stockProduct.findFirst({
        where: {
          orgId: data.orgId,
          sku: data.sku,
        },
      })

      if (existing) {
        throw new Error("Product with this SKU already exists")
      }

      const product = await prisma.stockProduct.create({
        data: {
          orgId: data.orgId,
          categoryId: data.categoryId,
          name: data.name,
          description: data.description,
          sku: data.sku,
          unitPrice: data.unitPrice,
          quantity: data.quantity || 0,
          reorderLevel: data.reorderLevel || 10,
          supplier: data.supplier,
          createdBy: data.createdBy,
          updatedBy: data.createdBy,
        },
        include: {
          category: true,
        },
      })

      return product
    } catch (error) {
      throw error
    }
  }

  static async updateProduct(data: {
    id: string
    orgId: string
    name?: string
    description?: string
    categoryId?: string
    unitPrice?: number
    quantity?: number
    reorderLevel?: number
    supplier?: string
    updatedBy: string
  }) {
    try {
      const product = await prisma.stockProduct.findUnique({
        where: { id: data.id },
      })

      if (!product || product.orgId !== data.orgId) {
        throw new Error("Product not found")
      }

      // Verify category if changing
      if (data.categoryId) {
        const category = await prisma.stockCategory.findUnique({
          where: { id: data.categoryId },
        })

        if (!category || category.orgId !== data.orgId) {
          throw new Error("Category not found")
        }
      }

      const updated = await prisma.stockProduct.update({
        where: { id: data.id },
        data: {
          name: data.name,
          description: data.description,
          categoryId: data.categoryId,
          unitPrice: data.unitPrice,
          quantity: data.quantity,
          reorderLevel: data.reorderLevel,
          supplier: data.supplier,
          updatedBy: data.updatedBy,
        },
        include: {
          category: true,
        },
      })

      return updated
    } catch (error) {
      throw error
    }
  }

  static async getProducts(orgId: string, categoryId?: string) {
    try {
      const products = await prisma.stockProduct.findMany({
        where: {
          orgId,
          ...(categoryId && { categoryId }),
        },
        include: {
          category: {
            include: {
              parent: true,
            },
          },
        },
        orderBy: { name: "asc" },
      })

      return products
    } catch (error) {
      throw error
    }
  }

  static async getProduct(id: string, orgId: string) {
    try {
      const product = await prisma.stockProduct.findUnique({
        where: { id },
        include: {
          category: {
            include: {
              parent: true,
              children: true,
            },
          },
          entries: true,
          salesItems: true,
        },
      })

      if (!product || product.orgId !== orgId) {
        throw new Error("Product not found")
      }

      return product
    } catch (error) {
      throw error
    }
  }

  static async deleteProduct(id: string, orgId: string) {
    try {
      const product = await prisma.stockProduct.findUnique({
        where: { id },
        include: { entries: true, salesItems: true },
      })

      if (!product || product.orgId !== orgId) {
        throw new Error("Product not found")
      }

      if (product.entries.length > 0 || product.salesItems.length > 0) {
        throw new Error("Cannot delete product with existing entries or sales")
      }

      const deleted = await prisma.stockProduct.delete({
        where: { id },
      })

      return deleted
    } catch (error) {
      throw error
    }
  }

  // ==================== ANALYTICS ====================

  static async getStockSummary(orgId: string) {
    try {
      const products = await prisma.stockProduct.findMany({
        where: { orgId },
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          reorderLevel: true,
        },
      })

      const totalProducts = products.length
      const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0)
      const totalValue = products.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0)
      const lowStockCount = products.filter((p) => p.quantity <= p.reorderLevel).length

      return {
        totalProducts,
        totalQuantity,
        totalValue,
        lowStockCount,
        averageUnitPrice: totalProducts > 0 ? products.reduce((sum, p) => sum + p.unitPrice, 0) / totalProducts : 0,
      }
    } catch (error) {
      throw error
    }
  }
}
