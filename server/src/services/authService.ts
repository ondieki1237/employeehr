import bcrypt from "bcryptjs"
import prisma from "../lib/prisma"
import { splitName, toLegacyCompany, toLegacyUser } from "../lib/mysqlAdapters"
import { generateToken } from "../config/auth"
import type { Prisma } from "@prisma/client"
import type { IUser, ICompany, IJWTPayload, IAPIResponse } from "../types/interfaces"
import { emailService } from "./emailService"

export class AuthService {
  // Company Registration
  static async registerCompany(
    data: Partial<ICompany> & { adminEmail: string; adminPassword: string; adminName: string },
  ): Promise<IAPIResponse<{ company: ICompany; user: IUser; token: string }>> {
    try {
      const companyEmail = String(data.email || "").toLowerCase().trim()
      const adminEmail = String(data.adminEmail || "").toLowerCase().trim()
      const companyName = String(data.name || "").trim()

      if (!companyName || !String(data.industry || "").trim() || !Number(data.employeeCount) || !adminEmail || !data.adminPassword || !String(data.adminName || "").trim()) {
        return {
          success: false,
          message: "Company name, industry, employee count, admin name, admin email, and admin password are required",
        }
      }

      // Check if company email already exists
      const existingCompany = await prisma.company.findUnique({ where: { email: companyEmail } })
      if (existingCompany) {
        return {
          success: false,
          message: "Company with this email already exists",
        }
      }

      // Generate unique slug from company name
      const baseSlug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
      
      let slug = baseSlug
      let slugCounter = 1
      
      // Ensure slug is unique
      while (await prisma.company.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${slugCounter}`
        slugCounter++
      }

      const hashedPassword = await bcrypt.hash(data.adminPassword, 10)
      const { firstName, lastName } = splitName(data.adminName)

      const saved = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const company = await tx.company.create({
          data: {
            name: companyName,
            slug,
            email: companyEmail,
            phone: data.phone || null,
            website: data.website || null,
            industry: String(data.industry || "").trim(),
            employeeCount: Number(data.employeeCount || 0),
          },
        })

        const user = await tx.user.create({
          data: {
            orgId: company.id,
            firstName,
            lastName,
            email: adminEmail,
            password: hashedPassword,
            role: "company_admin",
            status: "active",
          },
        })

        return { company, user }
      })

      // Generate token
      const payload: IJWTPayload = {
        userId: saved.user.id,
        org_id: saved.company.id,
        email: saved.user.email,
        role: saved.user.role,
      }

      const token = generateToken(payload)

      return {
        success: true,
        message: "Company registered successfully",
        data: {
          company: toLegacyCompany(saved.company),
          user: (() => {
            const legacyUser = toLegacyUser(saved.user)
            delete (legacyUser as unknown as { password?: string }).password
            return legacyUser
          })(),
          token,
        },
      }
    } catch (error) {
      return {
        success: false,
        message: "Registration failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  // User Login
  static async login(email: string, password: string): Promise<IAPIResponse<{ user: IUser; token: string }>> {
    try {
      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })

      if (!user) {
        return {
          success: false,
          message: "User not found",
        }
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password)
      if (!isPasswordValid) {
        return {
          success: false,
          message: "Invalid credentials",
        }
      }

      // Check if user is active
      if (user.status !== "active") {
        return {
          success: false,
          message: "User account is inactive",
        }
      }

      // Check if company is frozen
      const company = await prisma.company.findUnique({ where: { id: user.orgId } })
      if (company?.isFrozen) {
        return {
          success: false,
          message: "Your account has been Frozen by the System owner. Contact him for Unlocking",
        }
      }

      // Generate token
      const payload: IJWTPayload = {
        userId: user.id,
        org_id: user.orgId,
        email: user.email,
        role: user.role,
      }

      const token = generateToken(payload)

      return {
        success: true,
        message: "Login successful",
        data: {
          user: (() => {
            const legacyUser = toLegacyUser(user)
            delete (legacyUser as unknown as { password?: string }).password
            return legacyUser
          })(),
          token,
        },
      }
    } catch (error) {
      return {
        success: false,
        message: "Login failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  // Create Employee User
  static async createEmployee(
    org_id: string,
    data: Partial<IUser> & { email: string; password?: string; inviter_name?: string },
  ): Promise<IAPIResponse<IUser>> {
    try {
      const email = String(data.email || "").toLowerCase().trim()

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({ where: { email } })

      if (existingUser) {
        return {
          success: false,
          message: "User with this email already exists in organization",
        }
      }

      const tempPassword = data.password || Math.random().toString(36).slice(-8)
      const hashedPassword = await bcrypt.hash(tempPassword, 10)

      // Support both camelCase and snake_case field names
      const firstName = String(data.firstName || (data as any).first_name || "").trim() || "Employee"
      const lastName = String(data.lastName || (data as any).last_name || "").trim() || "User"

      const savedUser = await prisma.user.create({
        data: {
          orgId: org_id,
          firstName,
          lastName,
          email,
          password: hashedPassword,
          role: data.role || "employee",
          department: data.department || null,
          managerId: data.manager_id || null,
          status: "active",
        },
      })

      // Send invitation email
      try {
                const loginUrl = process.env.FRONTEND_URL || "https://hr.codewithseth.co.ke"
        await emailService.sendInvitationEmail({
          recipientEmail: savedUser.email,
          recipientName: `${savedUser.firstName} ${savedUser.lastName}`,
          inviterName: data.inviter_name || "Administrator",
          role: savedUser.role,
          temporaryPassword: tempPassword,
          loginUrl: `${loginUrl}/auth/login`,
          companyId: org_id,
        })
        console.log(`Invitation email sent to ${savedUser.email}`)
      } catch (emailError) {
        console.error("Failed to send invitation email:", emailError)
        // Don't fail the user creation if email fails
      }

      return {
        success: true,
        message: "Employee created successfully",
        data: (() => {
          const legacyUser = toLegacyUser(savedUser)
          delete (legacyUser as unknown as { password?: string }).password
          return legacyUser
        })() as IUser,
      }
    } catch (error) {
      return {
        success: false,
        message: "Failed to create employee",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  // Change Password
  static async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<IAPIResponse<null>> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } })

      if (!user) {
        return {
          success: false,
          message: "User not found",
        }
      }

      // Verify old password
      const isPasswordValid = await bcrypt.compare(oldPassword, user.password)
      if (!isPasswordValid) {
        return {
          success: false,
          message: "Current password is incorrect",
        }
      }

      // Hash and save new password
      const hashedPassword = await bcrypt.hash(newPassword, 10)
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      })

      return {
        success: true,
        message: "Password changed successfully",
      }
    } catch (error) {
      return {
        success: false,
        message: "Failed to change password",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  // Company-specific login (for employees via company slug)
  static async companyLogin(
    slug: string,
    email: string,
    password: string
  ): Promise<IAPIResponse<{ user: IUser; token: string; company: ICompany }>> {
    try {
      // First, find the company by slug
      const company = await prisma.company.findUnique({ where: { slug: slug.toLowerCase() } })

      if (!company) {
        return {
          success: false,
          message: "Company not found",
        }
      }

      if (company.status !== "active") {
        return {
          success: false,
          message: "Company account is not active",
        }
      }

      // Check if company is frozen
      if (company.isFrozen) {
        return {
          success: false,
          message: "Your account has been Frozen by the System owner. Contact him for Unlocking",
        }
      }

      // Find user in that company
      const user = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          orgId: company.id,
        },
      })

      if (!user) {
        return {
          success: false,
          message: "Invalid credentials",
        }
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password)
      if (!isPasswordValid) {
        return {
          success: false,
          message: "Invalid credentials",
        }
      }

      // Check if user is active
      if (user.status !== "active") {
        return {
          success: false,
          message: "User account is inactive",
        }
      }

      // Generate token
      const payload: IJWTPayload = {
        userId: user.id,
        org_id: user.orgId,
        email: user.email,
        role: user.role,
      }

      const token = generateToken(payload)

      return {
        success: true,
        message: "Login successful",
        data: {
          user: { ...toLegacyUser(user), password: undefined } as any,
          token,
          company: toLegacyCompany(company),
        },
      }
    } catch (error) {
      return {
        success: false,
        message: "Login failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  // Validate company exists
  static async validateCompany(slug: string): Promise<IAPIResponse<{ company: Partial<ICompany> }>> {
    try {
      const company = await prisma.company.findUnique({
        where: { slug: slug.toLowerCase() },
        select: { name: true, slug: true, logo: true, primaryColor: true, secondaryColor: true, status: true },
      })

      if (!company) {
        return {
          success: false,
          message: "Company not found",
        }
      }

      if (company.status !== "active") {
        return {
          success: false,
          message: "Company is not active",
        }
      }

      return {
        success: true,
        message: "Company found",
        data: {
          company: company as any,
        },
      }
    } catch (error) {
      return {
        success: false,
        message: "Validation failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  // Employee ID login (for /employee route)
  static async employeeIdLogin(
    employee_id: string,
    password: string
  ): Promise<IAPIResponse<{ user: IUser; token: string; company: ICompany }>> {
    try {
      // Find user by employee_id
      const user = await prisma.user.findFirst({
        where: { employeeId: employee_id.toUpperCase() },
      })

      if (!user) {
        return {
          success: false,
          message: "Invalid employee ID or password",
        }
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password)
      if (!isPasswordValid) {
        return {
          success: false,
          message: "Invalid employee ID or password",
        }
      }

      // Check if user is active
      if (user.status !== "active") {
        return {
          success: false,
          message: "Employee account is inactive",
        }
      }

      // Get company info
      const company = await prisma.company.findUnique({ where: { id: user.orgId } })
      if (!company) {
        return {
          success: false,
          message: "Company not found",
        }
      }

      if (company.status !== "active") {
        return {
          success: false,
          message: "Company account is not active",
        }
      }

      // Generate token
      const payload: IJWTPayload = {
        userId: user.id,
        org_id: user.orgId,
        email: user.email,
        role: user.role,
      }

      const token = generateToken(payload)

      return {
        success: true,
        message: "Login successful",
        data: {
          user: { ...toLegacyUser(user), password: undefined } as any,
          token,
          company: toLegacyCompany(company),
        },
      }
    } catch (error) {
      return {
        success: false,
        message: "Login failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }
}
