"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Calculator, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { format } from "date-fns"

type SalaryMode = "gross" | "net"
type DeductionType = "percentage" | "fixed"

type DeductionRule = {
    id: string
    name: string
    type: DeductionType | "progressive"
    value: number
    enabled: boolean
    note?: string
}

type DeductionItem = { name: string; amount: number }
type PayrollEmployeeDetails = {
    shaId: string
    kraPin: string
    nationalId: string
    bankName: string
    bankBranch: string
    accountNumber: string
    nssf: string
}

const PAYE_BANDS = [
    { upTo: 24000, rate: 10 },
    { upTo: 32333, rate: 25 },
    { upTo: Number.POSITIVE_INFINITY, rate: 30 },
]

const DEFAULT_DEDUCTION_RULES: DeductionRule[] = [
    { id: "paye", name: "PAYE", type: "progressive", value: 0, enabled: true, note: "10% – 30% progressive" },
    { id: "sha", name: "SHA", type: "percentage", value: 2.75, enabled: true, note: "~2.75%" },
    { id: "nssf", name: "NSSF", type: "percentage", value: 3, enabled: true, note: "~3% employee (6% total)" },
    { id: "housing", name: "Housing Levy", type: "percentage", value: 1.5, enabled: true, note: "1.5% employee" },
]

const SAVED_DEDUCTIONS_KEY = "elevate_payroll_saved_deductions"
const HELB_DEDUCTION_KEY = "elevate_payroll_helb_enabled"

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

const loadSavedDeductions = (): DeductionRule[] => {
    if (typeof window === "undefined") return []
    try {
        const raw = localStorage.getItem(SAVED_DEDUCTIONS_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

const computePaye = (gross: number) => {
    let remaining = gross
    let previousLimit = 0
    let total = 0

    for (const band of PAYE_BANDS) {
        const taxable = Math.min(remaining, band.upTo - previousLimit)
        if (taxable <= 0) break
        total += taxable * (band.rate / 100)
        remaining -= taxable
        previousLimit = band.upTo
    }

    return total
}

const getRuleAmount = (rule: DeductionRule, gross: number) => {
    if (!rule.enabled) return 0
    if (rule.type === "progressive") return computePaye(gross)
    if (rule.type === "percentage") return gross * (rule.value / 100)
    return rule.value
}

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
    const [genDeductionItems, setGenDeductionItems] = useState<{ name: string, amount: number }[]>([])

    const [deductHelb, setDeductHelb] = useState(false)
    const [helbAmount, setHelbAmount] = useState("")
    const [otherDeductionItems, setOtherDeductionItems] = useState<DeductionItem[]>([])
    const [newOtherDeductionName, setNewOtherDeductionName] = useState("")
    const [newOtherDeductionAmount, setNewOtherDeductionAmount] = useState("")
    const [otherBonusItems, setOtherBonusItems] = useState<DeductionItem[]>([])
    const [newOtherBonusName, setNewOtherBonusName] = useState("")
    const [newOtherBonusAmount, setNewOtherBonusAmount] = useState("")
    const [standardDeductionOverrides, setStandardDeductionOverrides] = useState<Record<string, string>>({})

    const [employeeDetails, setEmployeeDetails] = useState<PayrollEmployeeDetails>({
        shaId: "",
        kraPin: "",
        nationalId: "",
        bankName: "",
        bankBranch: "",
        accountNumber: "",
        nssf: "",
    })

    // Salary calculator state
    const [salaryMode, setSalaryMode] = useState<SalaryMode>("gross")
    const [salaryInput, setSalaryInput] = useState("")
    const [customRules, setCustomRules] = useState<DeductionRule[]>([])
    const [savedRules, setSavedRules] = useState<DeductionRule[]>([])
    const [customRuleName, setCustomRuleName] = useState("")
    const [customRuleType, setCustomRuleType] = useState<DeductionType>("percentage")
    const [customRuleValue, setCustomRuleValue] = useState("")

    const [generating, setGenerating] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)

    // Employee Details Editor State
    const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null)
    const [editingDetails, setEditingDetails] = useState<PayrollEmployeeDetails>({
        shaId: "",
        kraPin: "",
        nationalId: "",
        bankName: "",
        bankBranch: "",
        accountNumber: "",
        nssf: "",
    })
    const [savingDetails, setSavingDetails] = useState(false)

    const selectedEmployee = useMemo(
        () => employees.find((e) => e._id === genEmployeeId) || null,
        [employees, genEmployeeId]
    )

    const editingEmployee = useMemo(
        () => employees.find((e) => e._id === editingEmployeeId) || null,
        [employees, editingEmployeeId]
    )

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

    useEffect(() => {
        setSavedRules(loadSavedDeductions())
    }, [])

    useEffect(() => {
        if (typeof window !== "undefined") {
            const storedHelb = localStorage.getItem(HELB_DEDUCTION_KEY)
            setDeductHelb(storedHelb === "true")
        }
    }, [])

    // Auto-fill salary when employee selected (only if not editing or salary empty)
    useEffect(() => {
        if (!selectedEmployee) return

        const salary = selectedEmployee.salary ? selectedEmployee.salary.toString() : ""

        if (genEmployeeId && !editId && salary) {
            setGenSalary(salary)
            setSalaryMode("gross")
            setSalaryInput(salary)
        }

        setEmployeeDetails({
            shaId: selectedEmployee.sha_id || selectedEmployee.shaId || "",
            kraPin: selectedEmployee.kra_pin || selectedEmployee.kraPin || "",
            nationalId: selectedEmployee.national_id || selectedEmployee.nationalId || "",
            bankName: selectedEmployee.bankDetails?.bankName || selectedEmployee.bank_name || "",
            bankBranch: selectedEmployee.bankDetails?.bankBranch || selectedEmployee.bank_branch || "",
            accountNumber: selectedEmployee.bankDetails?.accountNumber || selectedEmployee.bank_account_number || "",
            nssf: selectedEmployee.nssf_number || selectedEmployee.nssf || "",
        })

        if (!salary && !editId) {
            setGenSalary("")
        }
    }, [genEmployeeId, employees, selectedEmployee, editId])

    const calculatorRules = useMemo(() => [...DEFAULT_DEDUCTION_RULES, ...customRules], [customRules])

    const standardDeductionRules = useMemo(() => {
        return calculatorRules.filter((rule) => rule.enabled && rule.type === "progressive" || rule.type === "percentage" || rule.type === "fixed")
    }, [calculatorRules])

    const calculatorResult = useMemo(() => {
        const inputAmount = Number(salaryInput || 0)
        const bonusAmount = Number(genBonus || 0)
        const otherBonusTotal = roundCurrency(otherBonusItems.reduce((sum, item) => sum + Number(item.amount || 0), 0))

        const buildItems = (gross: number) => {
            const standardItems = calculatorRules
                .filter((rule) => rule.enabled)
                .map((rule) => ({
                    name: rule.name,
                    amount: roundCurrency(
                        standardDeductionOverrides[rule.id] !== undefined && standardDeductionOverrides[rule.id] !== ""
                            ? Number(standardDeductionOverrides[rule.id])
                            : getRuleAmount(rule, gross)
                    ),
                }))

            const helbItems = deductHelb && helbAmount
                ? [{ name: "HELB", amount: roundCurrency(Number(helbAmount)) }]
                : []

            const customOtherItems = otherDeductionItems.map((item) => ({
                name: item.name,
                amount: roundCurrency(Number(item.amount || 0)),
            }))

            return [...standardItems, ...helbItems, ...customOtherItems]
        }

        const computeFromGross = (gross: number) => {
            const items = buildItems(gross)
            const totalDeductions = roundCurrency(items.reduce((sum, item) => sum + item.amount, 0))
            const net = roundCurrency(gross + bonusAmount + otherBonusTotal - totalDeductions)
            return { gross: roundCurrency(gross), net, totalDeductions, items }
        }

        if (!inputAmount) {
            return { gross: 0, net: 0, totalDeductions: 0, items: [] as DeductionItem[] }
        }

        if (salaryMode === "gross") {
            return computeFromGross(inputAmount)
        }

        const targetNet = inputAmount
        let low = 0
        let high = Math.max(targetNet * 2, 50000)

        while (computeFromGross(high).net < targetNet && high < targetNet * 20 + 100000) {
            high *= 2
        }

        for (let i = 0; i < 50; i++) {
            const mid = (low + high) / 2
            const midNet = computeFromGross(mid).net
            if (midNet > targetNet) {
                high = mid
            } else {
                low = mid
            }
        }

        return computeFromGross(high)
    }, [salaryInput, salaryMode, genBonus, calculatorRules, deductHelb, helbAmount, otherDeductionItems, otherBonusItems, standardDeductionOverrides])

    const applyCalculatorToPayrollForm = () => {
        if (!salaryInput) return
        setGenSalary(calculatorResult.gross > 0 ? calculatorResult.gross.toString() : salaryInput)
        setGenDeductionItems(calculatorResult.items)
    }

    const addCustomRule = () => {
        if (!customRuleName.trim() || !customRuleValue) return
        const nextRule: DeductionRule = {
            id: `${customRuleName.trim().toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
            name: customRuleName.trim(),
            type: customRuleType,
            value: Number(customRuleValue),
            enabled: true,
        }
        setCustomRules((prev) => [...prev, nextRule])
        setCustomRuleName("")
        setCustomRuleValue("")
    }

    const saveCurrentRuleSet = () => {
        if (typeof window === "undefined") return
        const customPayload = customRules.map((rule) => ({ ...rule, enabled: true }))
        const merged = [...savedRules, ...customPayload]
        localStorage.setItem(SAVED_DEDUCTIONS_KEY, JSON.stringify(merged))
        setSavedRules(merged)
        toast({ description: "Deduction set saved for reuse" })
    }

    const toggleHelb = () => {
        const next = !deductHelb
        setDeductHelb(next)
        if (typeof window !== "undefined") {
            localStorage.setItem(HELB_DEDUCTION_KEY, String(next))
        }
    }

    const addOtherDeduction = () => {
        if (!newOtherDeductionName.trim() || !newOtherDeductionAmount) return
        setOtherDeductionItems((prev) => [
            ...prev,
            { name: newOtherDeductionName.trim(), amount: Number(newOtherDeductionAmount) },
        ])
        setNewOtherDeductionName("")
        setNewOtherDeductionAmount("")
    }

    const addOtherBonus = () => {
        if (!newOtherBonusName.trim() || !newOtherBonusAmount) return
        setOtherBonusItems((prev) => [
            ...prev,
            { name: newOtherBonusName.trim(), amount: Number(newOtherBonusAmount) },
        ])
        setNewOtherBonusName("")
        setNewOtherBonusAmount("")
    }

    const removeOtherBonus = (index: number) => {
        setOtherBonusItems((prev) => prev.filter((_, idx) => idx !== index))
    }

    const removeOtherDeduction = (index: number) => {
        setOtherDeductionItems((prev) => prev.filter((_, idx) => idx !== index))
    }

    const addSavedRule = (rule: DeductionRule) => {
        setCustomRules((prev) => [...prev, { ...rule, id: `${rule.id}-${Date.now()}`, enabled: true }])
    }

    const openEdit = (payroll: any) => {
        setEditId(payroll._id)
        setGenEmployeeId(payroll.user_id)
        setGenSalary(payroll.base_salary.toString())
        setSalaryInput(payroll.base_salary.toString())
        setSalaryMode("gross")
        setGenBonus(payroll.bonus.toString())
        setOtherDeductionItems(payroll.deduction_items || [])
        setOtherBonusItems(payroll.other_bonus_items || [])
        setSidebarOpen(true)
    }

    const resetForm = (open: boolean) => {
        setSidebarOpen(open)
        if (!open) {
            setEditId(null)
            setGenEmployeeId("")
            setGenSalary("")
            setSalaryInput("")
            setGenBonus("0")
            setGenDeductionItems([])
            setOtherDeductionItems([])
            setNewOtherDeductionName("")
            setNewOtherDeductionAmount("")
            setOtherBonusItems([])
            setNewOtherBonusName("")
            setNewOtherBonusAmount("")
            setStandardDeductionOverrides({})
            setEmployeeDetails({
                shaId: "",
                kraPin: "",
                nationalId: "",
                bankName: "",
                bankBranch: "",
                accountNumber: "",
                nssf: "",
            })
        }
    }

    const saveEmployeeDetails = async () => {
        try {
            if (!genEmployeeId) return

            const updatePayload: Partial<any> = {
                sha_id: employeeDetails.shaId,
                kra_pin: employeeDetails.kraPin,
                national_id: employeeDetails.nationalId,
                nssf_number: employeeDetails.nssf,
                bankDetails: {
                    bankName: employeeDetails.bankName,
                    bankBranch: employeeDetails.bankBranch,
                    accountNumber: employeeDetails.accountNumber,
                },
            }

            await api.users.update(genEmployeeId, updatePayload)
        } catch (error) {
            console.error("Failed to save employee details:", error)
            // Continue anyway - don't block payroll generation
        }
    }

    const handleGenerate = async () => {
        try {
            if (!genEmployeeId) {
                toast({ variant: "destructive", description: "Please select an employee" })
                return
            }

            if (!calculatorResult.gross) {
                toast({ variant: "destructive", description: "Enter a gross or net salary to calculate the payroll" })
                return
            }

            setGenerating(true)

            // Save employee details first
            await saveEmployeeDetails()

            const payload = {
                user_id: genEmployeeId,
                month: selectedMonth,
                base_salary: Number(calculatorResult.gross || genSalary || 0),
                bonus: Number(genBonus) + otherBonusItems.reduce((sum, item) => sum + Number(item.amount || 0), 0),
                other_bonus_items: otherBonusItems,
                deduction_items: calculatorResult.items,
                standard_deduction_overrides: standardDeductionOverrides,
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

    const handleSaveEmployeeDetails = async () => {
        try {
            if (!editingEmployeeId) return

            setSavingDetails(true)
            const updatePayload: Partial<any> = {
                sha_id: editingDetails.shaId,
                kra_pin: editingDetails.kraPin,
                national_id: editingDetails.nationalId,
                nssf_number: editingDetails.nssf,
                bankDetails: {
                    bankName: editingDetails.bankName,
                    bankBranch: editingDetails.bankBranch,
                    accountNumber: editingDetails.accountNumber,
                },
            }

            await api.users.update(editingEmployeeId, updatePayload)
            toast({ description: "Employee details saved successfully" })
            setEditingEmployeeId(null)
            fetchData()
        } catch (error: any) {
            toast({ variant: "destructive", description: error.message || "Failed to save details" })
        } finally {
            setSavingDetails(false)
        }
    }

    const openEmployeeEditor = (employeeId: string) => {
        setEditingEmployeeId(employeeId)
        const emp = employees.find(e => e._id === employeeId)
        if (emp) {
            setEditingDetails({
                shaId: emp.sha_id || emp.shaId || "",
                kraPin: emp.kra_pin || emp.kraPin || "",
                nationalId: emp.national_id || emp.nationalId || "",
                bankName: emp.bankDetails?.bankName || emp.bank_name || "",
                bankBranch: emp.bankDetails?.bankBranch || emp.bank_branch || "",
                accountNumber: emp.bankDetails?.accountNumber || emp.bank_account_number || "",
                nssf: emp.nssf_number || emp.nssf || "",
            })
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
                        <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>{editId ? "Edit Payslip" : "Generate Payslip"} for {selectedMonth}</DialogTitle>
                            </DialogHeader>
                            
                            <div className="space-y-6 py-4">
                                {/* Employee Selector */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold">Select Employee</Label>
                                    <Select value={genEmployeeId} onValueChange={setGenEmployeeId}>
                                        <SelectTrigger className="h-10 text-base">
                                            <SelectValue placeholder="Choose an employee..." />
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

                                {/* 3-Column Layout */}
                                <div className="grid grid-cols-3 gap-6">
                                    {/* LEFT: Employee Compliance Details */}
                                    <div className="rounded-lg border bg-slate-50 p-6 space-y-5">
                                        <div>
                                            <p className="font-bold text-base mb-2">Employee Details</p>
                                            <p className="text-sm text-muted-foreground">
                                                {selectedEmployee ? `${selectedEmployee.position || "Employee"} · ${selectedEmployee.department || "No dept"}` : "Select employee to populate"}
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">SHA ID</Label>
                                                <Input value={employeeDetails.shaId} onChange={(e) => setEmployeeDetails((prev) => ({ ...prev, shaId: e.target.value }))} placeholder="e.g., SH12345" className="text-base h-10" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">KRA PIN</Label>
                                                <Input value={employeeDetails.kraPin} onChange={(e) => setEmployeeDetails((prev) => ({ ...prev, kraPin: e.target.value }))} placeholder="e.g., A001234567K" className="text-base h-10" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">National ID</Label>
                                                <Input value={employeeDetails.nationalId} onChange={(e) => setEmployeeDetails((prev) => ({ ...prev, nationalId: e.target.value }))} placeholder="e.g., 12345678" className="text-base h-10" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">NSSF Number</Label>
                                                <Input value={employeeDetails.nssf} onChange={(e) => setEmployeeDetails((prev) => ({ ...prev, nssf: e.target.value }))} placeholder="e.g., 50/5967/5967" className="text-base h-10" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Bank Name</Label>
                                                <Input value={employeeDetails.bankName} onChange={(e) => setEmployeeDetails((prev) => ({ ...prev, bankName: e.target.value }))} placeholder="e.g., Equity Bank" className="text-base h-10" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Bank Branch</Label>
                                                <Input value={employeeDetails.bankBranch} onChange={(e) => setEmployeeDetails((prev) => ({ ...prev, bankBranch: e.target.value }))} placeholder="e.g., Nairobi CBD" className="text-base h-10" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Account Number</Label>
                                                <Input value={employeeDetails.accountNumber} onChange={(e) => setEmployeeDetails((prev) => ({ ...prev, accountNumber: e.target.value }))} placeholder="e.g., 0123456789" className="text-base h-10" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* MIDDLE: Salary Calculator */}
                                    <div className="rounded-lg border bg-white p-6 space-y-5">
                                        <div>
                                            <p className="font-bold text-base mb-4">Salary Calculator</p>
                                            <div className="flex gap-3 mb-4">
                                                <Button type="button" size="lg" variant={salaryMode === "gross" ? "default" : "outline"} onClick={() => setSalaryMode("gross")} className="text-base h-10 flex-1">Gross</Button>
                                                <Button type="button" size="lg" variant={salaryMode === "net" ? "default" : "outline"} onClick={() => setSalaryMode("net")} className="text-base h-10 flex-1">Net</Button>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">{salaryMode === "gross" ? "Gross Salary" : "Net Salary"}</Label>
                                                <Input
                                                    type="number"
                                                    value={salaryInput}
                                                    onChange={(e) => {
                                                        const value = e.target.value
                                                        setSalaryInput(value)
                                                        setGenSalary(value)
                                                    }}
                                                    placeholder={salaryMode === "gross" ? "Enter gross salary" : "Enter net salary"}
                                                    className="text-base h-10"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Bonus (Optional)</Label>
                                                <Input type="number" value={genBonus} onChange={(e) => setGenBonus(e.target.value)} placeholder="Enter bonus amount" className="text-base h-10" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-md border bg-blue-50 p-4">
                                                <p className="text-xs text-blue-700 font-semibold">GROSS SALARY</p>
                                                <p className="font-bold text-lg mt-2">KES {calculatorResult.gross.toLocaleString()}</p>
                                            </div>
                                            <div className="rounded-md border bg-green-50 p-4">
                                                <p className="text-xs text-green-700 font-semibold">NET SALARY</p>
                                                <p className="font-bold text-lg text-green-700 mt-2">KES {calculatorResult.net.toLocaleString()}</p>
                                            </div>
                                            <div className="rounded-md border bg-red-50 p-4">
                                                <p className="text-xs text-red-700 font-semibold">TOTAL DEDUCTIONS</p>
                                                <p className="font-bold text-lg text-red-600 mt-2">KES {calculatorResult.totalDeductions.toLocaleString()}</p>
                                            </div>
                                            <div className="rounded-md border bg-amber-50 p-4">
                                                <p className="text-xs text-amber-700 font-semibold">BONUS</p>
                                                <p className="font-bold text-lg mt-2">KES {Number(genBonus || 0).toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <div className="border-t pt-4">
                                            <p className="text-sm font-semibold text-slate-700 mb-3">Deduction Breakdown</p>
                                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                                {calculatorResult.items.length === 0 ? (
                                                    <p className="text-sm text-muted-foreground">Enter salary to see breakdown</p>
                                                ) : (
                                                    calculatorResult.items.map((item) => (
                                                        <div key={item.name} className="flex justify-between text-sm bg-slate-50 p-3 rounded">
                                                            <span className="font-medium">{item.name}</span>
                                                            <span className="font-semibold text-red-600">-KES {item.amount.toLocaleString()}</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* RIGHT: Summary & Controls */}
                                    <div className="rounded-lg border bg-white p-6 space-y-5 flex flex-col">
                                        <div>
                                            <p className="font-bold text-base mb-4">Summary & Actions</p>
                                        </div>

                                        <div className="border-b pb-4">
                                            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 border border-blue-400 p-5 text-white">
                                                <p className="text-sm font-semibold opacity-90">ESTIMATED NET PAY</p>
                                                <p className="text-4xl font-bold mt-3">KES {calculatorResult.net.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <Label className="text-sm font-medium">HELB Deduction</Label>
                                                    <p className="text-xs text-muted-foreground mt-1">Higher Education Loans Board</p>
                                                </div>
                                                <Button type="button" variant={deductHelb ? "default" : "outline"} onClick={toggleHelb} className="h-9 px-6">
                                                    {deductHelb ? "Enabled" : "Disabled"}
                                                </Button>
                                            </div>
                                            {deductHelb && (
                                                <Input
                                                    type="number"
                                                    value={helbAmount}
                                                    onChange={(e) => setHelbAmount(e.target.value)}
                                                    placeholder="Enter HELB amount"
                                                    className="text-base h-10"
                                                />
                                            )}
                                        </div>

                                        {otherDeductionItems.length > 0 && (
                                            <div className="space-y-3 border-t pt-3">
                                                <p className="text-sm font-semibold text-slate-700">Other Deductions</p>
                                                {otherDeductionItems.map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between text-sm bg-slate-50 p-3 rounded-md">
                                                        <span className="font-medium">{item.name}</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-red-600 font-semibold">-KES {item.amount.toLocaleString()}</span>
                                                            <Button size="sm" variant="ghost" onClick={() => removeOtherDeduction(idx)} className="h-7 w-7 p-0 text-gray-500 hover:text-red-600">
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex-1" />

                                        <div className="space-y-3 border-t pt-3">
                                            <p className="text-sm font-semibold text-slate-700">Add Deduction</p>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={newOtherDeductionName}
                                                    onChange={(e) => setNewOtherDeductionName(e.target.value)}
                                                    placeholder="Name"
                                                    className="text-sm h-10 flex-1"
                                                />
                                                <Input
                                                    type="number"
                                                    value={newOtherDeductionAmount}
                                                    onChange={(e) => setNewOtherDeductionAmount(e.target.value)}
                                                    placeholder="Amount"
                                                    className="text-sm h-10 w-32"
                                                />
                                                <Button size="lg" type="button" onClick={addOtherDeduction} disabled={!newOtherDeductionName || !newOtherDeductionAmount} className="h-10 px-5">Add</Button>
                                            </div>
                                        </div>

                                        <Button className="w-full h-12 text-base font-semibold mt-4" onClick={handleGenerate} disabled={generating || !genSalary}>
                                            {generating && <Loader2 className="mr-2 w-5 h-5 animate-spin" />}
                                            {editId ? "Update Payroll" : "Generate Payroll"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Employee Details Management</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Select Employee</Label>
                            <Select
                                value={editingEmployeeId || genEmployeeId}
                                onValueChange={(value) => {
                                    setGenEmployeeId(value)
                                    openEmployeeEditor(value)
                                }}
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Choose an employee..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map((emp) => (
                                        <SelectItem key={emp._id} value={emp._id}>
                                            {emp.firstName} {emp.lastName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">SHA ID</Label>
                                <Input value={editingDetails.shaId} onChange={(e) => setEditingDetails((prev) => ({ ...prev, shaId: e.target.value }))} placeholder="e.g., SH12345" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">KRA PIN</Label>
                                <Input value={editingDetails.kraPin} onChange={(e) => setEditingDetails((prev) => ({ ...prev, kraPin: e.target.value }))} placeholder="e.g., A001234567K" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">National ID</Label>
                                <Input value={editingDetails.nationalId} onChange={(e) => setEditingDetails((prev) => ({ ...prev, nationalId: e.target.value }))} placeholder="e.g., 12345678" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">NSSF Number</Label>
                                <Input value={editingDetails.nssf} onChange={(e) => setEditingDetails((prev) => ({ ...prev, nssf: e.target.value }))} placeholder="e.g., 50/5967/5967" />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label className="text-sm font-medium">Bank Name</Label>
                                <Input value={editingDetails.bankName} onChange={(e) => setEditingDetails((prev) => ({ ...prev, bankName: e.target.value }))} placeholder="e.g., Equity Bank" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Bank Branch</Label>
                                <Input value={editingDetails.bankBranch} onChange={(e) => setEditingDetails((prev) => ({ ...prev, bankBranch: e.target.value }))} placeholder="e.g., Nairobi CBD" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Account Number</Label>
                                <Input value={editingDetails.accountNumber} onChange={(e) => setEditingDetails((prev) => ({ ...prev, accountNumber: e.target.value }))} placeholder="e.g., 0123456789" />
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 rounded-lg border bg-slate-50 p-4">
                            <div>
                                <p className="font-semibold">{editingEmployee ? `${editingEmployee.firstName} ${editingEmployee.lastName}` : "No employee selected"}</p>
                                <p className="text-xs text-muted-foreground">Accountant can update compliance and banking details here.</p>
                            </div>
                            <Button onClick={handleSaveEmployeeDetails} disabled={savingDetails || !editingEmployeeId}>
                                {savingDetails && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                                Save Details
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calculator className="w-5 h-5" /> Payroll Generator
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="rounded-lg border bg-slate-50 p-4 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold">Payroll calculation</p>
                                    <p className="text-xs text-muted-foreground">Keep the inputs spaced and use the company buttons for actions.</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant={salaryMode === "gross" ? "default" : "outline"}
                                        onClick={() => setSalaryMode("gross")}
                                    >
                                        Gross → Net
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={salaryMode === "net" ? "default" : "outline"}
                                        onClick={() => setSalaryMode("net")}
                                    >
                                        Net → Gross
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => setSalaryInput("")}>Clear</Button>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                            <div className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>{salaryMode === "gross" ? "Gross Salary" : "Net Salary"}</Label>
                                        <Input
                                            type="number"
                                            value={salaryInput}
                                            onChange={(e) => setSalaryInput(e.target.value)}
                                            placeholder={salaryMode === "gross" ? "Enter gross salary" : "Enter net salary"}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Bonus</Label>
                                        <Input
                                            type="number"
                                            value={genBonus}
                                            onChange={(e) => setGenBonus(e.target.value)}
                                            placeholder="Optional bonus"
                                        />
                                    </div>
                                </div>

                                <div className="rounded-lg border bg-white p-5 space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold">Standard deductions</p>
                                            <p className="text-xs text-muted-foreground">PAYE, SHA, NSSF and Housing Levy are applied automatically.</p>
                                        </div>
                                        <Button type="button" variant="outline" onClick={saveCurrentRuleSet}>Save deduction set</Button>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                        {DEFAULT_DEDUCTION_RULES.map((rule) => (
                                            <div key={rule.id} className="rounded-lg border bg-slate-50 p-4 text-sm">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <p className="font-medium">{rule.name}</p>
                                                        <p className="text-xs text-muted-foreground">{rule.note}</p>
                                                    </div>
                                                    <span className="rounded-full border bg-white px-2 py-1 text-xs font-medium text-muted-foreground">
                                                        {rule.type === "progressive" ? "Progressive" : `${rule.value}%`}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-4 border-t pt-4">
                                        <div className="grid gap-3 md:grid-cols-[1.3fr_0.8fr_0.8fr_auto]">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Custom deduction name</Label>
                                                <Input value={customRuleName} onChange={(e) => setCustomRuleName(e.target.value)} placeholder="e.g. HELB" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Type</Label>
                                                <Select value={customRuleType} onValueChange={(value) => setCustomRuleType(value as DeductionType)}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="percentage">Percentage</SelectItem>
                                                        <SelectItem value="fixed">Fixed amount</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Value</Label>
                                                <Input
                                                    type="number"
                                                    value={customRuleValue}
                                                    onChange={(e) => setCustomRuleValue(e.target.value)}
                                                    placeholder={customRuleType === "percentage" ? "%" : "Amount"}
                                                />
                                            </div>
                                            <div className="flex items-end">
                                                <Button type="button" onClick={addCustomRule} disabled={!customRuleName.trim() || !customRuleValue} className="w-full">Add</Button>
                                            </div>
                                        </div>

                                        {customRules.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold uppercase text-muted-foreground">Custom deductions</p>
                                                <div className="grid gap-2 md:grid-cols-2">
                                                    {customRules.map((rule) => (
                                                        <div key={rule.id} className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm">
                                                            <div>
                                                                <p className="font-medium">{rule.name}</p>
                                                                <p className="text-xs text-muted-foreground">{rule.type === "fixed" ? `KES ${rule.value.toLocaleString()}` : `${rule.value}%`}</p>
                                                            </div>
                                                            <span className="font-medium text-muted-foreground">KES {getRuleAmount(rule, Number(salaryInput || 0)).toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {savedRules.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold uppercase text-muted-foreground">Saved templates</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {savedRules.map((rule) => (
                                                        <Button key={rule.id} type="button" variant="outline" size="sm" onClick={() => addSavedRule(rule)}>
                                                            + {rule.name}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-lg border bg-white p-5 space-y-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <p className="font-semibold">Deduction breakdown</p>
                                            <p className="text-xs text-muted-foreground">Amounts update live as the salary changes.</p>
                                        </div>
                                        <Button type="button" onClick={applyCalculatorToPayrollForm}>Use in payroll form</Button>
                                    </div>
                                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                        {calculatorResult.items.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">Enter a salary amount to calculate deductions.</p>
                                        ) : (
                                            calculatorResult.items.map((item) => (
                                                <div key={item.name} className="flex items-center justify-between rounded-lg border bg-slate-50 px-3 py-2 text-sm">
                                                    <span>{item.name}</span>
                                                    <span className="font-semibold text-muted-foreground">KES {item.amount.toLocaleString()}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 rounded-lg border bg-slate-50 p-5">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-lg border bg-white p-4">
                                        <p className="text-xs text-muted-foreground">Estimated Gross</p>
                                        <p className="mt-2 text-2xl font-bold">KES {calculatorResult.gross.toLocaleString()}</p>
                                    </div>
                                    <div className="rounded-lg border bg-white p-4">
                                        <p className="text-xs text-muted-foreground">Estimated Net</p>
                                        <p className="mt-2 text-2xl font-bold">KES {calculatorResult.net.toLocaleString()}</p>
                                    </div>
                                    <div className="rounded-lg border bg-white p-4">
                                        <p className="text-xs text-muted-foreground">Total Deductions</p>
                                        <p className="mt-2 text-2xl font-bold">KES {calculatorResult.totalDeductions.toLocaleString()}</p>
                                    </div>
                                    <div className="rounded-lg border bg-white p-4">
                                        <p className="text-xs text-muted-foreground">Calculated Bonus</p>
                                        <p className="mt-2 text-2xl font-bold">KES {Number(genBonus || 0).toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="rounded-lg border bg-white p-5 space-y-4">
                                    <div>
                                        <p className="text-sm font-semibold">Generation actions</p>
                                        <p className="text-xs text-muted-foreground">Use the company buttons to generate the payslip or open the editor.</p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="rounded-lg border bg-slate-50 p-4">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <Label className="text-sm font-medium">HELB Deduction</Label>
                                                    <p className="text-xs text-muted-foreground mt-1">Higher Education Loans Board</p>
                                                </div>
                                                <Button type="button" variant={deductHelb ? "default" : "outline"} onClick={toggleHelb} className="px-5">
                                                    {deductHelb ? "Enabled" : "Disabled"}
                                                </Button>
                                            </div>
                                            {deductHelb && (
                                                <div className="mt-3">
                                                    <Input
                                                        type="number"
                                                        value={helbAmount}
                                                        onChange={(e) => setHelbAmount(e.target.value)}
                                                        placeholder="Enter HELB amount"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {otherDeductionItems.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-sm font-semibold">Other Deductions</p>
                                                {otherDeductionItems.map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm">
                                                        <span className="font-medium">{item.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-muted-foreground">KES {item.amount.toLocaleString()}</span>
                                                            <Button size="sm" variant="ghost" onClick={() => removeOtherDeduction(idx)} className="h-8 w-8 p-0">
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="grid gap-2 md:grid-cols-[1fr_160px_auto]">
                                            <Input
                                                value={newOtherDeductionName}
                                                onChange={(e) => setNewOtherDeductionName(e.target.value)}
                                                placeholder="Deduction name"
                                            />
                                            <Input
                                                type="number"
                                                value={newOtherDeductionAmount}
                                                onChange={(e) => setNewOtherDeductionAmount(e.target.value)}
                                                placeholder="Amount"
                                            />
                                            <Button type="button" onClick={addOtherDeduction} disabled={!newOtherDeductionName || !newOtherDeductionAmount}>
                                                Add
                                            </Button>
                                        </div>

                                        <Button className="w-full h-12 text-base font-semibold" onClick={handleGenerate} disabled={generating || !genSalary}>
                                            {generating && <Loader2 className="mr-2 w-5 h-5 animate-spin" />}
                                            {editId ? "Update Payroll" : "Generate Payroll"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="overflow-hidden border-slate-200 shadow-sm">
                    <div className="h-1 bg-blue-500" />
                    <CardContent className="p-6 space-y-1">
                        <p className="text-sm text-muted-foreground">Total Processed</p>
                        <p className="text-2xl font-bold tracking-tight">{payrolls.length}</p>
                    </CardContent>
                </Card>
                <Card className="overflow-hidden border-slate-200 shadow-sm">
                    <div className="h-1 bg-emerald-500" />
                    <CardContent className="p-6 space-y-1">
                        <p className="text-sm text-muted-foreground">Total Payout</p>
                        <p className="text-2xl font-bold tracking-tight">
                            {payrolls.reduce((sum, p) => sum + p.net_pay, 0).toLocaleString()}
                        </p>
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
