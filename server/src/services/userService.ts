import prisma from "../lib/prisma"
import { toLegacyUser } from "../lib/mysqlAdapters"
import { stripUserPassword } from "../lib/userResponse"
import type { IUser, IAPIResponse } from "../types/interfaces"

export class UserService {
  static async getAllUsers(org_id: string): Promise<IAPIResponse<IUser[]>> {
    try {
      const users = await prisma.user.findMany({
        where: { orgId: org_id },
      })
      return {
        success: true,
        message: "Users fetched successfully",
        data: users.map((u) => stripUserPassword(toLegacyUser(u))),
      }
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch users",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  static async getUserById(org_id: string, userId: string): Promise<IAPIResponse<IUser>> {
    try {
      const user = await prisma.user.findFirst({
        where: { id: userId, orgId: org_id },
      })

      if (!user) {
        return {
          success: false,
          message: "User not found",
        }
      }

      return {
        success: true,
        message: "User fetched successfully",
        data: stripUserPassword(toLegacyUser(user)),
      }
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch user",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  static async updateUser(org_id: string, userId: string, data: Partial<IUser>): Promise<IAPIResponse<IUser>> {
    try {
      const existing = await prisma.user.findFirst({ where: { id: userId, orgId: org_id } })

      if (!existing) {
        return {
          success: false,
          message: "User not found",
        }
      }

      const user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          firstName: data.firstName ?? undefined,
          lastName: data.lastName ?? undefined,
          email: data.email ? data.email.toLowerCase() : undefined,
          role: data.role ?? undefined,
          department: data.department ?? undefined,
          position: data.position ?? undefined,
          managerId: data.manager_id ?? undefined,
          avatar: data.avatar ?? undefined,
          signatureUrl: data.signatureUrl ?? undefined,
          phone: data.phone ?? undefined,
          status: data.status ?? undefined,
          salary: data.salary ?? undefined,
          bankDetails: data.bankDetails ?? undefined,
        },
      })

      return {
        success: true,
        message: "User updated successfully",
        data: stripUserPassword(toLegacyUser(user)),
      }
    } catch (error) {
      return {
        success: false,
        message: "Failed to update user",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  static async getTeamMembers(org_id: string, managerId: string): Promise<IAPIResponse<IUser[]>> {
    try {
      const teamMembers = await prisma.user.findMany({
        where: { orgId: org_id, managerId },
      })
      return {
        success: true,
        message: "Team members fetched successfully",
        data: teamMembers.map((u) => stripUserPassword(toLegacyUser(u))),
      }
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch team members",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  static async deleteUser(org_id: string, userId: string): Promise<IAPIResponse<null>> {
    try {
      const user = await prisma.user.findFirst({ where: { id: userId, orgId: org_id } })

      if (!user) {
        return {
          success: false,
          message: "User not found",
        }
      }

      if (user.role === "company_admin") {
        return {
          success: false,
          message: "Cannot delete company admin user",
        }
      }

      await prisma.user.delete({ where: { id: user.id } })

      return {
        success: true,
        message: "User deleted successfully",
        data: null,
      }
    } catch (error) {
      return {
        success: false,
        message: "Failed to delete user",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }
}
