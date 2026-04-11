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
router.put("/quotations/:quotationId", StockController.updateQuotation)
router.post("/quotations/:quotationId/convert", StockController.convertQuotationToInvoice)
router.get("/clients", StockController.getClients)

router.get("/invoices", StockController.getInvoices)
router.get("/invoices/:invoiceId", StockController.getInvoiceById)
router.get("/accounts/posts", StockController.getAccountsPosts)
router.put("/accounts/posts/:invoiceId/client", StockController.upsertInvoiceClientProfile)
router.post("/accounts/posts/:invoiceId/post-etims", StockController.postInvoiceToEtims)
router.get("/accounts/expenses", StockController.getExpenses)
router.post("/accounts/expenses/initiate", StockController.initiateExpense)
router.get("/accounts/repeat-bills", StockController.getRepeatBills)
router.post("/accounts/repeat-bills", StockController.createRepeatBill)
router.post("/accounts/repeat-bills/:repeatBillId/run", StockController.runRepeatBill)
router.post("/invoices/:invoiceId/dispatch/assign", StockController.assignInvoiceToDispatch)
router.put("/invoices/:invoiceId/dispatch/packing", StockController.updateDispatchPacking)
router.post("/invoices/:invoiceId/dispatch/dispatch", StockController.markInvoiceDispatched)
router.get("/invoices/:invoiceId/dispatch/notifications", StockController.getDispatchNotifications)
router.post("/invoices/:invoiceId/dispatch/notify-client", StockController.sendDispatchClientNotification)
router.post("/invoices/:invoiceId/dispatch/inquiry", StockController.addDispatchInquiry)
router.post("/invoices/:invoiceId/dispatch/delivery", StockController.confirmInvoiceDelivery)
router.post("/dispatch/notifications/:notificationId/retry", StockController.retryDispatchNotification)

router.get("/dispatch/my", StockController.getMyDispatchInvoices)
router.get("/dispatch/analytics", StockController.getDispatchAnalytics)

router.get("/couriers", StockController.getCouriers)
router.post("/couriers", StockController.createCourier)

router.post("/products", StockController.createProduct)
router.get("/products", StockController.getProducts)
router.put("/products/:id", StockController.updateProduct)

router.post("/add", StockController.addStock)
router.get("/entries", StockController.getStockEntries)
router.post("/check-expiry", StockController.checkExpiringProducts)

router.post("/sales", StockController.createSale)
router.get("/sales", StockController.getSales)

export default router
