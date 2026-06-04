import { Router } from "express"
import { StockController } from "../controllers/stockController"
import { authMiddleware, orgMiddleware } from "../middleware/auth"
import { tenantIsolation } from "../middleware/tenantIsolation.middleware"
import { uploadApplicationFiles } from "../middleware/upload.middleware"

const router = Router()

router.use(authMiddleware, orgMiddleware, tenantIsolation)

router.post("/categories", StockController.createCategory)
router.get("/categories", StockController.getCategories)
router.get("/categories/:id", StockController.getCategoryById)
router.get("/categories/:id/sales", StockController.getCategorySales)
router.get("/categories/sales", StockController.getAllCategorySales)
router.put("/categories/:id", StockController.updateCategory)
router.delete("/categories/:id", StockController.deleteCategory)

router.post("/quotations", StockController.createQuotation)
router.get("/quotations", StockController.getQuotations)
router.put("/quotations/:quotationId", StockController.updateQuotation)
router.post("/quotations/:quotationId/approve", StockController.approveQuotation)
router.post("/quotations/:quotationId/reject", StockController.rejectQuotation)
router.post("/quotations/:quotationId/convert", StockController.convertQuotationToInvoice)
router.post("/quotations/:quotationId/followups", StockController.addQuotationFollowUp)
router.get("/quotations/:quotationId/followups", StockController.getQuotationFollowUps)
router.get("/clients", StockController.getClients)
router.get("/clients/saved", StockController.getSavedClients)
router.post("/accounts/clients", StockController.createOrUpdateClient)
router.post("/clients/bulk", uploadApplicationFiles.single("file"), StockController.bulkUploadClients)
router.get("/bulk-sms/audience", StockController.getBulkSmsAudience)
router.get("/bulk-sms/campaigns", StockController.getBulkSmsCampaigns)
router.post("/bulk-sms/campaigns", StockController.sendBulkSmsCampaign)

router.get("/invoices", StockController.getInvoices)
router.post("/invoices/create", StockController.createInvoiceFromItems)
router.get("/invoices/:invoiceId/lifecycle", StockController.getInvoiceLifecycle)
router.get("/invoices/:invoiceId", StockController.getInvoiceById)
router.get("/accounts/posts", StockController.getAccountsPosts)
router.get("/accounts/clients", StockController.getAccountsClients)
router.put("/accounts/posts/:invoiceId/client", StockController.upsertInvoiceClientProfile)
router.post("/accounts/posts/:invoiceId/post-etims", StockController.postInvoiceToEtims)
router.get("/accounts/payments", StockController.getAccountsPayments)
router.post("/accounts/payments/:invoiceId", StockController.addInvoicePayment)
router.get("/accounts/debts", StockController.getDebtManagement)
router.get("/accounts/debts/aging", StockController.getAgingDebtReport)
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
router.get("/analytics/profit-margins", StockController.getProfitMarginAnalytics)
router.get("/analytics/movement-forecast", StockController.getProductMovementForecast)
router.get("/analytics/valuation", StockController.getInventoryValuationReport)
router.get("/analytics/financial-breakdown", StockController.getFinancialBreakdown)

router.get("/couriers", StockController.getCouriers)
router.post("/couriers", StockController.createCourier)

router.post("/products", StockController.createProduct)
router.get("/products", StockController.getProducts)
router.put("/products/:id", StockController.updateProduct)
router.delete("/products/:id", StockController.deleteProduct)
router.post("/products/bulk", uploadApplicationFiles.single("file"), StockController.bulkUploadProducts)

router.post("/add", StockController.addStock)
router.get("/entries", StockController.getStockEntries)
router.post("/check-expiry", StockController.checkExpiringProducts)

router.post("/sales", StockController.createSale)
router.get("/sales", StockController.getSales)

export default router
