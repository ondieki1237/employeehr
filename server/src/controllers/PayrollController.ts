import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { Payroll } from "../models/Payroll"
import { User } from "../models/User"

export class PayrollController {
    // Generate Payroll (Admin)
    static async generate(req: AuthenticatedRequest, res: Response) {
        try {
            const { user_id, month, bonus = 0, deductions = 0 } = req.body
            const org_id = req.user?.org_id

            const user = await User.findById(user_id)
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" })
            }

            if (!user.salary) {
                return res.status(400).json({ success: false, message: "User has no base salary set" })
            }

            const base_salary = user.salary
            // Simple tax calculation could go here (e.g. 30% flat for now as placeholder or 0)
            // Let's assume deductions passed in body include tax for now to keep it flexible
            const net_pay = base_salary + bonus - deductions

            const payroll = await Payroll.create({
                org_id,
                user_id,
                month,
                base_salary,
                bonus,
                deductions,
                net_pay,
                status: 'processed'
            })

            res.status(201).json({ success: true, data: payroll })
            return
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message })
            return
        }
    }

    // Get My Payslips
    static async getMyPayslips(req: AuthenticatedRequest, res: Response) {
        try {
            const user_id = req.user?.userId
            const payslips = await Payroll.find({ user_id }).sort({ month: -1 })
            res.status(200).json({ success: true, data: payslips })
            return
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message })
            return
        }
    }

    // Get Company Payrolls (Admin)
    static async getAll(req: AuthenticatedRequest, res: Response) {
        try {
            const org_id = req.user?.org_id
            const { month } = req.query

            const query: any = { org_id }
            if (month) query.month = month

            const payrolls = await Payroll.find(query).sort({ month: -1 })
            res.status(200).json({ success: true, data: payrolls })
            return
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message })
            return
        }
    }
}
