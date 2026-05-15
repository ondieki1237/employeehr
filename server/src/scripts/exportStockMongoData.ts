import "dotenv/config"
import mongoose from "mongoose"
import { promises as fs } from "fs"
import path from "path"
import { StockClient } from "../models/StockClient"
import { StockCategory } from "../models/StockCategory"
import { StockProduct } from "../models/StockProduct"
import { StockEntry } from "../models/StockEntry"
import { StockQuotation } from "../models/StockQuotation"
import { StockInvoice } from "../models/StockInvoice"
import { StockInvoicePayment } from "../models/StockInvoicePayment"
import { StockSale } from "../models/StockSale"

const MONGODB_URI = process.env.MONGODB_URI

async function exportStockData() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI not set in environment")
    process.exit(1)
  }

  try {
    console.log("Connecting to MongoDB...")
    await mongoose.connect(MONGODB_URI)

    // Fetch all stock data
    const [clients, categories, products, entries, quotations, invoices, payments, sales] = await Promise.all([
      StockClient.find().lean().exec(),
      StockCategory.find().lean().exec(),
      StockProduct.find().lean().exec(),
      StockEntry.find().lean().exec(),
      StockQuotation.find().lean().exec(),
      StockInvoice.find().lean().exec(),
      StockInvoicePayment.find().lean().exec(),
      StockSale.find().lean().exec(),
    ])

    const exportData = {
      exportedAt: new Date().toISOString(),
      stockClients: clients,
      stockCategories: categories,
      stockProducts: products,
      stockEntries: entries,
      stockQuotations: quotations,
      stockInvoices: invoices,
      stockInvoicePayments: payments,
      stockSales: sales,
      summary: {
        clients: clients.length,
        categories: categories.length,
        products: products.length,
        entries: entries.length,
        quotations: quotations.length,
        invoices: invoices.length,
        payments: payments.length,
        sales: sales.length,
      },
    }

    // Create migrations directory if it doesn't exist
    const migrationsDir = path.join(process.cwd(), "data", "migrations")
    await fs.mkdir(migrationsDir, { recursive: true })

    // Generate timestamped filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)
    const filename = `stock-mongo-export-${timestamp}.json`
    const filepath = path.join(migrationsDir, filename)

    // Write export file
    await fs.writeFile(filepath, JSON.stringify(exportData, null, 2))

    console.log(`✅ Export successful!`)
    console.log(`📊 Summary:`)
    console.log(`   - Stock Clients: ${exportData.summary.clients}`)
    console.log(`   - Stock Categories: ${exportData.summary.categories}`)
    console.log(`   - Stock Products: ${exportData.summary.products}`)
    console.log(`   - Stock Entries: ${exportData.summary.entries}`)
    console.log(`   - Stock Quotations: ${exportData.summary.quotations}`)
    console.log(`   - Stock Invoices: ${exportData.summary.invoices}`)
    console.log(`   - Stock Invoice Payments: ${exportData.summary.payments}`)
    console.log(`   - Stock Sales: ${exportData.summary.sales}`)
    console.log(`📄 Export file: ${filepath}`)

    process.exit(0)
  } catch (error) {
    console.error("Export failed:", error instanceof Error ? error.message : error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
  }
}

exportStockData()
