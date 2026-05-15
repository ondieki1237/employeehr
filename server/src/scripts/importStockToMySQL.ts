import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { promises as fs } from "fs"
import path from "path"

const prisma = new PrismaClient()

interface StockExportData {
  exportedAt: string
  stockClients: any[]
  stockCategories: any[]
  stockProducts: any[]
  stockEntries: any[]
  stockQuotations: any[]
  stockInvoices: any[]
  stockInvoicePayments: any[]
  stockSales: any[]
  summary: Record<string, number>
}

async function importStockData(filePath: string) {
  try {
    console.log(`📂 Reading export file: ${filePath}`)
    const fileContent = await fs.readFile(filePath, "utf-8")
    const data: StockExportData = JSON.parse(fileContent)

    console.log(`📊 Import Summary:`)
    console.log(`   - Stock Clients: ${data.summary.clients}`)
    console.log(`   - Stock Categories: ${data.summary.categories}`)
    console.log(`   - Stock Products: ${data.summary.products}`)
    console.log(`   - Stock Entries: ${data.summary.entries}`)
    console.log(`   - Stock Quotations: ${data.summary.quotations}`)
    console.log(`   - Stock Invoices: ${data.summary.invoices}`)
    console.log(`   - Stock Invoice Payments: ${data.summary.payments}`)
    console.log(`   - Stock Sales: ${data.summary.sales}`)

    console.log(`\n⏳ Importing Stock Clients...`)
    let importedClients = 0
    for (const client of data.stockClients) {
      try {
        await prisma.stockClient.upsert({
          where: { id: client._id },
          update: {
            orgId: client.org_id,
            sourceName: client.sourceName,
            sourceNumber: client.sourceNumber,
            sourceLocation: client.sourceLocation,
            legalName: client.legalName,
            kraPin: client.kraPin || null,
            email: client.email || null,
            branchId: client.branchId || null,
            hasKraDetails: client.hasKraDetails || false,
            createdBy: client.createdBy,
            updatedBy: client.updatedBy,
          },
          create: {
            id: client._id,
            orgId: client.org_id,
            sourceName: client.sourceName,
            sourceNumber: client.sourceNumber,
            sourceLocation: client.sourceLocation,
            legalName: client.legalName,
            kraPin: client.kraPin || null,
            email: client.email || null,
            branchId: client.branchId || null,
            hasKraDetails: client.hasKraDetails || false,
            createdBy: client.createdBy,
            updatedBy: client.updatedBy,
            createdAt: client.createdAt ? new Date(client.createdAt) : new Date(),
            updatedAt: client.updatedAt ? new Date(client.updatedAt) : new Date(),
          },
        })
        importedClients++
      } catch (err) {
        console.warn(`   ⚠️  Failed to import client ${client._id}:`, (err as Error).message)
      }
    }
    console.log(`   ✅ Imported ${importedClients}/${data.stockClients.length} Stock Clients`)

    console.log(`\n⏳ Importing Stock Categories...`)
    let importedCategories = 0
    for (const category of data.stockCategories) {
      try {
        await prisma.stockCategory.upsert({
          where: { id: category._id },
          update: {
            orgId: category.org_id,
            name: category.name,
            description: category.description || null,
            createdBy: category.createdBy,
            updatedBy: category.createdBy,
          },
          create: {
            id: category._id,
            orgId: category.org_id,
            name: category.name,
            description: category.description || null,
            createdBy: category.createdBy,
            updatedBy: category.createdBy || "system",
            createdAt: category.createdAt ? new Date(category.createdAt) : new Date(),
            updatedAt: category.updatedAt ? new Date(category.updatedAt) : new Date(),
          },
        })
        importedCategories++
      } catch (err) {
        console.warn(`   ⚠️  Failed to import category ${category._id}:`, (err as Error).message)
      }
    }
    console.log(`   ✅ Imported ${importedCategories}/${data.stockCategories.length} Stock Categories`)

    console.log(`\n⏳ Importing Stock Products...`)
    let importedProducts = 0
    for (const product of data.stockProducts) {
      try {
        await prisma.stockProduct.upsert({
          where: { id: product._id },
          update: {
            orgId: product.org_id,
            categoryId: product.category,  // MongoDB stores category ID directly
            name: product.name,
            description: null,  // Not in MongoDB export
            sku: `SKU-${product._id.substring(0, 8)}`,  // Generate SKU if missing
            unitPrice: product.sellingPrice,
            quantity: product.currentQuantity,
            reorderLevel: product.minAlertQuantity,
            supplier: null,  // Not in MongoDB export
            createdBy: product.createdBy,
            updatedBy: product.createdBy,
          },
          create: {
            id: product._id,
            orgId: product.org_id,
            categoryId: product.category,
            name: product.name,
            description: null,
            sku: `SKU-${product._id.substring(0, 8)}`,
            unitPrice: product.sellingPrice,
            quantity: product.currentQuantity,
            reorderLevel: product.minAlertQuantity,
            supplier: null,
            createdBy: product.createdBy,
            updatedBy: product.createdBy || "system",
            createdAt: product.createdAt ? new Date(product.createdAt) : new Date(),
            updatedAt: product.updatedAt ? new Date(product.updatedAt) : new Date(),
          },
        })
        importedProducts++
      } catch (err) {
        console.warn(`   ⚠️  Failed to import product ${product._id}:`, (err as Error).message)
      }
    }
    console.log(`   ✅ Imported ${importedProducts}/${data.stockProducts.length} Stock Products`)

    console.log(`\n⏳ Importing Stock Entries...`)
    let importedEntries = 0
    for (const entry of data.stockEntries) {
      try {
        // Skip if StockEntry model is missing from Prisma
        if (!(prisma as any).stockEntry) {
          console.warn(`   ℹ️  StockEntry model not available - skipping ${data.stockEntries.length} entries`)
          break
        }
        await (prisma as any).stockEntry.upsert({
          where: { id: entry._id },
          update: {
            orgId: entry.org_id,
            productId: entry.productId,
            entryType: "purchase",  // Default entry type
            quantity: entry.quantityAdded,
            reference: entry.note || null,
            notes: entry.note || null,
            createdBy: entry.addedBy,
          },
          create: {
            id: entry._id,
            orgId: entry.org_id,
            productId: entry.productId,
            entryType: "purchase",
            quantity: entry.quantityAdded,
            reference: entry.note || null,
            notes: entry.note || null,
            createdBy: entry.addedBy,
            createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date(),
            updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : new Date(),
          },
        })
        importedEntries++
      } catch (err) {
        console.warn(`   ⚠️  Failed to import entry ${entry._id}:`, (err as Error).message)
      }
    }
    console.log(`   ✅ Imported ${importedEntries}/${data.stockEntries.length} Stock Entries`)

    console.log(`\n⏳ Importing Stock Quotations...`)
    let importedQuotations = 0
    for (const quotation of data.stockQuotations) {
      try {
        // Quotation data in MongoDB stored embedded client data, need to find or skip clientId
        const clientName = quotation.client?.name || "Unknown Client"
        
        await prisma.stockQuotation.upsert({
          where: { id: quotation._id },
          update: {
            orgId: quotation.org_id,
            clientId: quotation.client_id || "unknown",  // May not exist, use placeholder
            quotationNumber: quotation.quotationNumber,
            items: quotation.items ? JSON.stringify(quotation.items) : null,
            totalAmount: quotation.subTotal || 0,
            status: quotation.status === "converted" ? "accepted" : "draft",  // Map status
            validUntil: null,
            notes: null,
            createdBy: quotation.createdBy,
          },
          create: {
            id: quotation._id,
            orgId: quotation.org_id,
            clientId: quotation.client_id || "unknown",
            quotationNumber: quotation.quotationNumber,
            items: quotation.items ? JSON.stringify(quotation.items) : null,
            totalAmount: quotation.subTotal ||0,
            status: quotation.status === "converted" ? "accepted" : "draft",
            validUntil: null,
            notes: null,
            createdBy: quotation.createdBy,
            createdAt: quotation.createdAt ? new Date(quotation.createdAt) : new Date(),
            updatedAt: quotation.updatedAt ? new Date(quotation.updatedAt) : new Date(),
          },
        })
        importedQuotations++
      } catch (err) {
        console.warn(`   ⚠️  Failed to import quotation ${quotation._id}:`, (err as Error).message)
      }
    }
    console.log(`   ✅ Imported ${importedQuotations}/${data.stockQuotations.length} Stock Quotations`)

    console.log(`\n⏳ Importing Stock Invoices...`)
    let importedInvoices = 0
    for (const invoice of data.stockInvoices) {
      try {
        await prisma.stockInvoice.upsert({
          where: { id: invoice._id },
          update: {
            orgId: invoice.org_id,
            clientId: invoice.client_id || "unknown",
            invoiceNumber: invoice.invoiceNumber,
            items: invoice.items ? JSON.stringify(invoice.items) : null,
            subtotal: invoice.subTotal || 0,
            tax: 0,
            total: invoice.subTotal || 0,
            status: invoice.status || "draft",
            dueDate: null,
            notes: null,
            createdBy: invoice.createdBy,
          },
          create: {
            id: invoice._id,
            orgId: invoice.org_id,
            clientId: invoice.client_id || "unknown",
            invoiceNumber: invoice.invoiceNumber,
            items: invoice.items ? JSON.stringify(invoice.items) : null,
            subtotal: invoice.subTotal || 0,
            tax: 0,
            total: invoice.subTotal || 0,
            status: invoice.status || "draft",
            dueDate: null,
            notes: null,
            createdBy: invoice.createdBy,
            createdAt: invoice.createdAt ? new Date(invoice.createdAt) : new Date(),
            updatedAt: invoice.updatedAt ? new Date(invoice.updatedAt) : new Date(),
          },
        })
        importedInvoices++
      } catch (err) {
        console.warn(`   ⚠️  Failed to import invoice ${invoice._id}:`, (err as Error).message)
      }
    }
    console.log(`   ✅ Imported ${importedInvoices}/${data.stockInvoices.length} Stock Invoices`)

    console.log(`\n⏳ Importing Stock Invoice Payments...`)
    let importedPayments = 0
    for (const payment of data.stockInvoicePayments) {
      try {
        await prisma.stockInvoicePayment.upsert({
          where: { id: payment._id },
          update: {
            invoiceId: payment.invoiceId,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod || "cash",
            paymentDate: payment.paidAt ? new Date(payment.paidAt) : new Date(),
            reference: payment.reference || null,
            notes: payment.note || null,
            createdBy: payment.receivedBy || "system",
          },
          create: {
            id: payment._id,
            invoiceId: payment.invoiceId,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod || "cash",
            paymentDate: payment.paidAt ? new Date(payment.paidAt) : new Date(),
            reference: payment.reference || null,
            notes: payment.note || null,
            createdBy: payment.receivedBy || "system",
            createdAt: payment.createdAt ? new Date(payment.createdAt) : new Date(),
          },
        })
        importedPayments++
      } catch (err) {
        console.warn(`   ⚠️  Failed to import payment ${payment._id}:`, (err as Error).message)
      }
    }
    console.log(`   ✅ Imported ${importedPayments}/${data.stockInvoicePayments.length} Stock Invoice Payments`)

    console.log(`\n⏳ Importing Stock Sales...`)
    let importedSales = 0
    for (const sale of data.stockSales) {
      try {
        await prisma.stockSale.upsert({
          where: { id: sale._id },
          update: {
            orgId: sale.org_id,
            saleNumber: sale.receiptNumber || `SALE-${sale._id.substring(0, 8)}`,
            clientId: "unknown",  // IDs not directly linked in MongoDB
            subtotal: sale.soldPrice * sale.quantitySold,
            tax: 0,
            total: sale.soldPrice * sale.quantitySold,
            status: "completed",
            saleDate: new Date(sale.createdAt),
            notes: sale.buyerName ? `Sold to: ${sale.buyerName} (${sale.buyerLocation})` : null,
            createdBy: sale.soldBy || "system",
          },
          create: {
            id: sale._id,
            orgId: sale.org_id,
            saleNumber: sale.receiptNumber || `SALE-${sale._id.substring(0, 8)}`,
            clientId: "unknown",
            subtotal: sale.soldPrice * sale.quantitySold,
            tax: 0,
            total: sale.soldPrice * sale.quantitySold,
            status: "completed",
            saleDate: new Date(sale.createdAt),
            notes: sale.buyerName ? `Sold to: ${sale.buyerName} (${sale.buyerLocation})` : null,
            createdBy: sale.soldBy || "system",
            createdAt: sale.createdAt ? new Date(sale.createdAt) : new Date(),
            updatedAt: sale.updatedAt ? new Date(sale.updatedAt) : new Date(),
          },
        })
        importedSales++
      } catch (err) {
        console.warn(`   ⚠️  Failed to import sale ${sale._id}:`, (err as Error).message)
      }
    }
    console.log(`   ✅ Imported ${importedSales}/${data.stockSales.length} Stock Sales`)

    console.log(`\n✅ Stock data import complete!`)
    console.log(
      `\n📊 Final Import Count: \n   Clients: ${importedClients}, Categories: ${importedCategories}, Products: ${importedProducts}, Entries: ${importedEntries}, Quotations: ${importedQuotations}, Invoices: ${importedInvoices}, Payments: ${importedPayments}, Sales: ${importedSales}`,
    )

    process.exit(0)
  } catch (error) {
    console.error("Import failed:", error instanceof Error ? error.message : error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Get file path from command line arguments or find latest
async function main() {
  const filePath = process.argv[2]

  if (!filePath) {
    console.error("Usage: npx tsx importStockToMySQL.ts <path-to-export-file>")
    process.exit(1)
  }

  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)

  try {
    await fs.access(absolutePath)
  } catch {
    console.error(`File not found: ${absolutePath}`)
    process.exit(1)
  }

  await importStockData(absolutePath)
}

main()
