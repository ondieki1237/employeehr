import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { User } from "../models/User"
import { Company } from "../models/Company"
import { generateToken } from "../config/auth"
import type { IUser, ICompany, IJWTPayload, IAPIResponse } from "../types/interfaces"
import { emailService } from "./emailService"

export class AuthService {
  // Company Registration
  static async registerCompany(
    data: Partial<ICompany> & { adminEmail: string; adminPassword: string; adminName: string },
  ): Promise<IAPIResponse<{ company: ICompany; user: IUser; token: string }>> {
    try {
      // Check if company email already exists
      const existingCompany = await Company.findOne({ email: data.email })
      if (existingCompany) {
        return {
          success: false,
          message: "Company with this email already exists",
        }
      }

      // Generate unique slug from company name
      const baseSlug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
      
      let slug = baseSlug
      let slugCounter = 1
      
      // Ensure slug is unique
      while (await Company.findOne({ slug })) {
        slug = `${baseSlug}-${slugCounter}`
        slugCounter++
      }

      // Create company
      const company = new Company({
        name: data.name,
        slug,
        email: data.email,
        phone: data.phone,
        website: data.website,
        industry: data.industry,
        employeeCount: data.employeeCount,
      })

      const savedCompany = await company.save()

      // Create admin user
      const hashedPassword = await bcrypt.hash(data.adminPassword, 10)
      const [firstName, ...lastNameParts] = data.adminName.split(" ")
      const lastName = lastNameParts.join(" ") || "Admin"

      const user = new User({
        org_id: savedCompany._id.toString(),
        firstName,
        lastName,
        email: data.adminEmail,
        password: hashedPassword,
        role: "company_admin",
        status: "active",
      })

      const savedUser = await user.save()

      // Generate token
      const payload: IJWTPayload = {
        userId: savedUser._id.toString(),
        org_id: savedCompany._id.toString(),
        email: savedUser.email,
        role: savedUser.role,
      }

      const token = generateToken(payload)

      return {
        success: true,
        message: "Company registered successfully",
        data: {
          company: savedCompany.toObject(),
          user: { ...savedUser.toObject(), password: undefined },
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
      const user = await User.findOne({ email: email.toLowerCase() })

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

      // Generate token
      const payload: IJWTPayload = {
        userId: user._id.toString(),
        org_id: user.org_id,
        email: user.email,
        role: user.role,
      }

      const token = generateToken(payload)

      return {
        success: true,
        message: "Login successful",
        data: {
          user: { ...user.toObject(), password: undefined },
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
      // Check if user already exists
      const existingUser = await User.findOne({
        org_id,
        email: data.email.toLowerCase(),
      })

      if (existingUser) {
        return {
          success: false,
          message: "User with this email already exists in organization",
        }
      }

      const tempPassword = data.password || Math.random().toString(36).slice(-8)
      const hashedPassword = await bcrypt.hash(tempPassword, 10)

      // Support both camelCase and snake_case field names
      const firstName = data.firstName || (data as any).first_name
      const lastName = data.lastName || (data as any).last_name

      const user = new User({
        org_id,
        firstName,
        lastName,
        email: data.email.toLowerCase(),
        password: hashedPassword,
        role: data.role || "employee",
        department: data.department,
        manager_id: data.manager_id,
        status: "active",
      })

      const savedUser = await user.save()

      // Send invitation email
      try {
        const loginUrl = process.env.FRONTEND_URL || "http://localhost:3000"
        await emailService.sendInvitationEmail({
          recipientEmail: savedUser.email,
          recipientName: `${savedUser.firstName} ${savedUser.lastName}`,
          inviterName: data.inviter_name || "Administrator",
          role: savedUser.role,
          temporaryPassword: tempPassword,
          loginUrl: `${loginUrl}/auth/login`,
        })
        console.log(`Invitation email sent to ${savedUser.email}`)
      } catch (emailError) {
        console.error("Failed to send invitation email:", emailError)
        // Don't fail the user creation if email fails
      }

      return {
        success: true,
        message: "Employee created successfully",
        data: { ...savedUser.toObject(), password: undefined } as IUser,
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
      const user = await User.findById(userId)

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
      user.password = hashedPassword
      await user.save()

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
      const company = await Company.findOne({ slug: slug.toLowerCase() })

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

      // Find user in that company
      const user = await User.findOne({
        email: email.toLowerCase(),
        org_id: company._id.toString(),
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
        userId: user._id.toString(),
        org_id: user.org_id,
        email: user.email,
        role: user.role,
      }

      const token = generateToken(payload)

      return {
        success: true,
        message: "Login successful",
        data: {
          user: { ...user.toObject(), password: undefined } as any,
          token,
          company: { ...company.toObject() } as ICompany,
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
      const company = await Company.findOne(
        { slug: slug.toLowerCase() },
        { name: 1, slug: 1, logo: 1, primaryColor: 1, secondaryColor: 1, status: 1 }
      )

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
          company: company.toObject() as any,
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
      const user = await User.findOne({ employee_id: employee_id.toUpperCase() })

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
      const company = await Company.findById(user.org_id)
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
        userId: user._id.toString(),
        org_id: user.org_id,
        email: user.email,
        role: user.role,
      }

      const token = generateToken(payload)

      return {
        success: true,
        message: "Login successful",
        data: {
          user: { ...user.toObject(), password: undefined } as any,
          token,
          company: { ...company.toObject() } as ICompany,
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
