"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, FileText, Building2, Calendar } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getToken } from "@/lib/auth"
import Image from "next/image"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010"

interface Payslip {
  _id: string
  month: string
  base_salary: number
  bonus: number
  deduction_items: { name: string; amount: number }[]
  total_deductions: number
  net_pay: number
  status: string
  generated_at: string
  user?: {
    firstName: string
    lastName: string
    employee_id: string
    email: string
    position?: string
    department?: string
  }
}

interface PayslipDetail {
  payslip: Payslip
  user: {
    firstName: string
    lastName: string
    employee_id: string
    email: string
    position?: string
    department?: string
  }
  company: {
    name: string
    logo?: string
    email: string
    phone?: string
    city?: string
    state?: string
    country?: string
  }
}

export default function PayslipPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipDetail | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)

  useEffect(() => {
    fetchPayslips()
  }, [])

  const fetchPayslips = async () => {
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/payroll/my-payslips`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setPayslips(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch payslips:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPayslipDetails = async (payslipId: string) => {
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/payroll/payslip/${payslipId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setSelectedPayslip(data.data)
        setViewDialogOpen(true)
      }
    } catch (error) {
      console.error("Failed to fetch payslip details:", error)
    }
  }

  const downloadPayslip = () => {
    if (!selectedPayslip) return

    const { payslip, user, company } = selectedPayslip
    
    // Create printable HTML content
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payslip - ${payslip.month}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .company-logo { max-width: 150px; margin-bottom: 10px; }
          .company-name { font-size: 24px; font-weight: bold; margin: 10px 0; }
          .payslip-title { font-size: 20px; color: #666; margin-top: 20px; }
          .info-section { margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
          .info-label { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .total-row { font-weight: bold; font-size: 16px; background-color: #f9f9f9; }
          .net-pay { font-size: 18px; color: #059669; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          ${company.logo ? `<img src="${company.logo}" alt="${company.name}" class="company-logo" />` : ''}
          <div class="company-name">${company.name}</div>
          <div>${company.email || ''} ${company.phone ? '• ' + company.phone : ''}</div>
          <div>${[company.city, company.state, company.country].filter(Boolean).join(', ')}</div>
          <div class="payslip-title">PAYSLIP - ${new Date(payslip.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
        </div>

        <div class="info-section">
          <div class="info-row">
            <span class="info-label">Employee Name:</span>
            <span>${user.firstName} ${user.lastName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Employee ID:</span>
            <span>${user.employee_id}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Position:</span>
            <span>${user.position || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Department:</span>
            <span>${user.department || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Payment Date:</span>
            <span>${new Date(payslip.generated_at).toLocaleDateString()}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Base Salary</td>
              <td style="text-align: right;">KES ${payslip.base_salary.toLocaleString()}</td>
            </tr>
            ${payslip.bonus > 0 ? `
            <tr>
              <td>Bonus</td>
              <td style="text-align: right;">KES ${payslip.bonus.toLocaleString()}</td>
            </tr>
            ` : ''}
            <tr class="total-row">
              <td>Gross Pay</td>
              <td style="text-align: right;">KES ${(payslip.base_salary + payslip.bonus).toLocaleString()}</td>
            </tr>
            ${payslip.deduction_items.map(item => `
            <tr>
              <td>${item.name} (Deduction)</td>
              <td style="text-align: right; color: red;">- KES ${item.amount.toLocaleString()}</td>
            </tr>
            `).join('')}
            <tr class="total-row">
              <td>Total Deductions</td>
              <td style="text-align: right; color: red;">- KES ${payslip.total_deductions.toLocaleString()}</td>
            </tr>
            <tr class="total-row net-pay">
              <td>NET PAY</td>
              <td style="text-align: right;">KES ${payslip.net_pay.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>This is a computer-generated document. No signature is required.</p>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
      </body>
      </html>
    `

    // Open print dialog
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }

  const formatMonth = (month: string) => {
    return new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-gray-600 dark:text-gray-400">Loading payslips...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Payslips</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View and download your salary payslips
          </p>
        </div>

        {/* Payslips List */}
        {payslips.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No payslips available yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {payslips.map((payslip) => (
              <Card key={payslip._id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                        <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                          {formatMonth(payslip.month)}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Generated on {new Date(payslip.generated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Net Pay</p>
                        <p className="text-xl font-bold text-green-600 dark:text-green-400">
                          KES {payslip.net_pay.toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={payslip.status === 'paid' ? 'default' : 'secondary'}>
                        {payslip.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchPayslipDetails(payslip._id)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Payslip Detail Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Payslip Details</DialogTitle>
            </DialogHeader>

            {selectedPayslip && (
              <div className="space-y-6">
                {/* Company Header */}
                <div className="text-center border-b pb-4">
                  {selectedPayslip.company.logo && (
                    <div className="flex justify-center mb-2">
                      <img 
                        src={selectedPayslip.company.logo} 
                        alt={selectedPayslip.company.name}
                        className="h-16 object-contain"
                      />
                    </div>
                  )}
                  <h2 className="text-2xl font-bold">{selectedPayslip.company.name}</h2>
                  <p className="text-sm text-gray-600">
                    {selectedPayslip.company.email}
                    {selectedPayslip.company.phone && ` • ${selectedPayslip.company.phone}`}
                  </p>
                  {selectedPayslip.company.city && (
                    <p className="text-sm text-gray-600">
                      {[selectedPayslip.company.city, selectedPayslip.company.state, selectedPayslip.company.country]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                  <h3 className="text-lg font-semibold mt-4">
                    PAYSLIP - {formatMonth(selectedPayslip.payslip.month)}
                  </h3>
                </div>

                {/* Employee Info */}
                <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Employee Name</p>
                    <p className="font-semibold">
                      {selectedPayslip.user.firstName} {selectedPayslip.user.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Employee ID</p>
                    <p className="font-semibold">{selectedPayslip.user.employee_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Position</p>
                    <p className="font-semibold">{selectedPayslip.user.position || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Department</p>
                    <p className="font-semibold">{selectedPayslip.user.department || 'N/A'}</p>
                  </div>
                </div>

                {/* Salary Breakdown */}
                <div>
                  <h4 className="font-semibold mb-3">Salary Breakdown</h4>
                  <table className="w-full">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                      <tr>
                        <th className="text-left p-3">Description</th>
                        <th className="text-right p-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-3">Base Salary</td>
                        <td className="p-3 text-right">KES {selectedPayslip.payslip.base_salary.toLocaleString()}</td>
                      </tr>
                      {selectedPayslip.payslip.bonus > 0 && (
                        <tr className="border-b">
                          <td className="p-3">Bonus</td>
                          <td className="p-3 text-right">KES {selectedPayslip.payslip.bonus.toLocaleString()}</td>
                        </tr>
                      )}
                      <tr className="border-b bg-gray-50 dark:bg-gray-800 font-semibold">
                        <td className="p-3">Gross Pay</td>
                        <td className="p-3 text-right">
                          KES {(selectedPayslip.payslip.base_salary + selectedPayslip.payslip.bonus).toLocaleString()}
                        </td>
                      </tr>
                      {selectedPayslip.payslip.deduction_items.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-3">{item.name} (Deduction)</td>
                          <td className="p-3 text-right text-red-600">- KES {item.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr className="border-b bg-gray-50 dark:bg-gray-800 font-semibold">
                        <td className="p-3">Total Deductions</td>
                        <td className="p-3 text-right text-red-600">
                          - KES {selectedPayslip.payslip.total_deductions.toLocaleString()}
                        </td>
                      </tr>
                      <tr className="bg-green-50 dark:bg-green-900 font-bold text-lg">
                        <td className="p-3">NET PAY</td>
                        <td className="p-3 text-right text-green-600 dark:text-green-400">
                          KES {selectedPayslip.payslip.net_pay.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Download Button */}
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={downloadPayslip}>
                    <Download className="h-4 w-4 mr-2" />
                    Download / Print
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}
