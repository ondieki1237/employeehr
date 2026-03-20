import { Router } from "express"
import { StockController } from "../controllers/stockController"
import { authMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"

const router = Router()

router.use(authMiddleware, orgMiddleware, tenantIsolation)

router.post("/categories", StockController.createCategory)
router.get("/categories", StockController.getCategories)

router.post("/quotations", StockController.createQuotation)
router.get("/quotations", StockController.getQuotations)
router.post("/quotations/:quotationId/convert", StockController.convertQuotationToInvoice)

router.get("/invoices", StockController.getInvoices)

router.post("/products", StockController.createProduct)
router.get("/products", StockController.getProducts)
router.put("/products/:id", StockController.updateProduct)

router.post("/add", StockController.addStock)
router.get("/entries", StockController.getStockEntries)

router.post("/sales", StockController.createSale)
router.get("/sales", StockController.getSales)

export default router
