"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Users, Calculator, DollarSign, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { format } from "date-fns"

export default function AdminPayrollPage() {
    const { toast } = useToast()
    const [payrolls, setPayrolls] = useState<any[]>([])
    const [employees, setEmployees] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM

    // Generate Form State
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [genEmployeeId, setGenEmployeeId] = useState("")
    const [genSalary, setGenSalary] = useState("")
    const [genBonus, setGenBonus] = useState("0")
    // Use proper array state for named deductions
    const [genDeductionItems, setGenDeductionItems] = useState<{ name: string, amount: number }[]>([])
    const [newDeductionName, setNewDeductionName] = useState("")
    const [newDeductionAmount, setNewDeductionAmount] = useState("")

    const [generating, setGenerating] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)

    const fetchData = async () => {
        try {
            setLoading(true)
            const [payrollRes, usersRes] = await Promise.all([
                api.payroll.getAll(selectedMonth),
                api.users.getAll()
            ])

            if (payrollRes.success) setPayrolls(payrollRes.data || [])
            if (usersRes?.success && Array.isArray(usersRes.data)) {
                setEmployees(usersRes.data.filter((u: any) => u.role !== 'company_admin'))
            }
        } catch (error) {
            console.error("Failed to fetch payroll data", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [selectedMonth])

    // Auto-fill salary when employee selected (only if not editing or salary empty)
    useEffect(() => {
        if (genEmployeeId && !editId) {
            const emp = employees.find(e => e._id === genEmployeeId)
            if (emp && emp.salary) {
                setGenSalary(emp.salary.toString())
            } else {
                setGenSalary("")
            }
        }
    }, [genEmployeeId])

    const openEdit = (payroll: any) => {
        setEditId(payroll._id)
        setGenEmployeeId(payroll.user_id)
        setGenSalary(payroll.base_salary.toString())
        setGenBonus(payroll.bonus.toString())
        // Load existing deduction items, or empty array
        setGenDeductionItems(payroll.deduction_items || [])
        setSidebarOpen(true)
    }

    const resetForm = (open: boolean) => {
        setSidebarOpen(open)
        if (!open) {
            setEditId(null)
            setGenEmployeeId("")
            setGenSalary("")
            setGenBonus("0")
            setGenDeductionItems([])
            setNewDeductionName("")
            setNewDeductionAmount("")
        }
    }

    const addDeduction = () => {
        if (!newDeductionName || !newDeductionAmount) return
        setGenDeductionItems([...genDeductionItems, { name: newDeductionName, amount: Number(newDeductionAmount) }])
        setNewDeductionName("")
        setNewDeductionAmount("")
    }

    const removeDeduction = (index: number) => {
        const newItems = [...genDeductionItems]
        newItems.splice(index, 1)
        setGenDeductionItems(newItems)
    }

    const handleGenerate = async () => {
        try {
            if (!genEmployeeId) {
                toast({ variant: "destructive", description: "Please select an employee" })
                return
            }

            setGenerating(true)

            const payload = {
                user_id: genEmployeeId,
                month: selectedMonth,
                base_salary: Number(genSalary),
                bonus: Number(genBonus),
                deduction_items: genDeductionItems
            }

            if (editId) {
                await api.payroll.update(editId, payload)
                toast({ description: "Payroll updated successfully" })
            } else {
                await api.payroll.generate(payload)
                toast({ description: "Payroll generated successfully" })
            }

            resetForm(false)
            fetchData()
        } catch (error: any) {
            if (error.message?.includes("already exists")) {
                toast({
                    variant: "destructive",
                    title: "Duplicate",
                    description: error.message
                })
            } else {
                toast({ variant: "destructive", description: error.message || "Operation failed" })
            }
        } finally {
            setGenerating(false)
        }
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Payroll Management</h1>
                    <p className="text-muted-foreground">Generate and view monthly payrolls.</p>
                </div>
                <div className="flex gap-4">
                    <Input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-40"
                    />

                    <Dialog open={sidebarOpen} onOpenChange={resetForm}>
                        <DialogTrigger asChild>
                            <Button className="gap-2" onClick={() => resetForm(true)}>
                                <Plus className="w-4 h-4" /> Generate Payslip
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editId ? "Edit Payslip" : "Generate Payslip"} for {selectedMonth}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Employee</Label>
                                    <Select value={genEmployeeId} onValueChange={setGenEmployeeId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Employee" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {employees.map(emp => (
                                                <SelectItem key={emp._id} value={emp._id}>
                                                    {emp.firstName} {emp.lastName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Base Salary</Label>
                                    <Input
                                        type="number"
                                        value={genSalary}
                                        onChange={(e) => setGenSalary(e.target.value)}
                                        placeholder="Enter Base Salary"
                                    />
                                    {!genSalary && genEmployeeId && <p className="text-xs text-yellow-500">Please enter base salary manually if not auto-filled.</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label>Bonus</Label>
                                    <Input type="number" value={genBonus} onChange={(e) => setGenBonus(e.target.value)} />
                                </div>

                                <div className="space-y-3 border p-3 rounded-lg">
                                    <Label>Deductions</Label>
                                    <div className="space-y-2">
                                        {genDeductionItems.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded text-sm">
                                                <span className="flex-1 font-medium">{item.name}</span>
                                                <span className="font-mono text-red-600">-{item.amount}</span>
                                                <Button size="sm" variant="ghost" onClick={() => removeDeduction(idx)} className="h-6 w-6 p-0 text-gray-500 hover:text-red-500">
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 items-end">
                                        <div className="flex-1 space-y-1">
                                            <Label className="text-xs">Name</Label>
                                            <Input
                                                value={newDeductionName}
                                                onChange={(e) => setNewDeductionName(e.target.value)}
                                                placeholder="e.g. Tax"
                                                className="h-8"
                                            />
                                        </div>
                                        <div className="w-24 space-y-1">
                                            <Label className="text-xs">Amount</Label>
                                            <Input
                                                type="number"
                                                value={newDeductionAmount}
                                                onChange={(e) => setNewDeductionAmount(e.target.value)}
                                                placeholder="0"
                                                className="h-8"
                                            />
                                        </div>
                                        <Button size="sm" type="button" onClick={addDeduction} disabled={!newDeductionName || !newDeductionAmount} className="h-8">Add</Button>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                                        <span className="font-semibold">Estimated Net Pay:</span>
                                        <span className="text-xl font-bold">
                                            {(Number(genSalary || 0) + Number(genBonus) - genDeductionItems.reduce((acc, item) => acc + item.amount, 0)).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <Button className="w-full mt-4" onClick={handleGenerate} disabled={generating || !genSalary}>
                                    {generating && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                                    {editId ? "Update Payroll" : "Generate Payroll"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-full text-blue-600"><Users className="w-6 h-6" /></div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Processed</p>
                            <p className="text-2xl font-bold">{payrolls.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-green-100 rounded-full text-green-600"><DollarSign className="w-6 h-6" /></div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Payout</p>
                            <p className="text-2xl font-bold">
                                {payrolls.reduce((sum, p) => sum + p.net_pay, 0).toLocaleString()}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Payroll List - {selectedMonth}</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                    ) : payrolls.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Calculator className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>No payroll records found for this month.</p>
                            <Button variant="link" onClick={() => setSidebarOpen(true)}>Generate your first payslip</Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-700 uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Employee</th>
                                        <th className="px-4 py-3">Base Salary</th>
                                        <th className="px-4 py-3">Bonus</th>
                                        <th className="px-4 py-3">Deductions</th>
                                        <th className="px-4 py-3">Net Pay</th>
                                        <th className="px-4 py-3">Generated At</th>
                                        <th className="px-4 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {payrolls.map((p) => {
                                        // Find employee name from cached list or use ID if not found
                                        const emp = employees.find(e => e._id === p.user_id)
                                        const name = emp ? `${emp.firstName} ${emp.lastName}` : p.user_id

                                        return (
                                            <tr key={p._id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => openEdit(p)}>
                                                <td className="px-4 py-3 font-medium">{name}</td>
                                                <td className="px-4 py-3">{p.base_salary.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-green-600">{p.bonus > 0 ? `+${p.bonus}` : '-'}</td>
                                                <td className="px-4 py-3 text-red-600">{p.total_deductions > 0 ? `-${p.total_deductions}` : '-'}</td>
                                                <td className="px-4 py-3 font-bold">{p.net_pay.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{format(new Date(p.generated_at), 'MMM d, HH:mm')}</td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                                                        {p.status.toUpperCase()}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div >
    )
}
