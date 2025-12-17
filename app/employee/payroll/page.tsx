"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { format } from "date-fns"
import { Loader2, Download, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function EmployeePayrollPage() {
    const [payslips, setPayslips] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchPayslips = async () => {
            try {
                const res = await api.payroll.getMyPayslips()
                if (res.success) {
                    setPayslips(res.data)
                }
            } catch (error) {
                console.error("Failed to fetch payslips", error)
            } finally {
                setLoading(false)
            }
        }
        fetchPayslips()
    }, [])

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
    }

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold">My Payslips</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                    {payslips.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">No payslips available yet.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Month</TableHead>
                                    <TableHead>Base Salary</TableHead>
                                    <TableHead>Bonus</TableHead>
                                    <TableHead>Deductions</TableHead>
                                    <TableHead className="font-bold">Net Pay</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payslips.map((slip) => (
                                    <TableRow key={slip._id}>
                                        <TableCell className="font-medium">{slip.month}</TableCell>
                                        <TableCell>{slip.currency} {slip.base_salary.toLocaleString()}</TableCell>
                                        <TableCell className="text-green-600">
                                            {slip.bonus > 0 ? `+ ${slip.currency} ${slip.bonus.toLocaleString()}` : '-'}
                                        </TableCell>
                                        <TableCell className="text-red-600">
                                            {slip.deductions > 0 ? `- ${slip.currency} ${slip.deductions.toLocaleString()}` : '-'}
                                        </TableCell>
                                        <TableCell className="font-bold">
                                            {slip.currency} {slip.net_pay.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${slip.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {slip.status.toUpperCase()}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">
                                                <Download className="w-4 h-4 mr-2" />
                                                Download
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
