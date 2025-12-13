import { User } from "../models/User"
import type { IUser, IAPIResponse } from "../types/interfaces"

export class UserService {
  static async getAllUsers(org_id: string): Promise<IAPIResponse<IUser[]>> {
    try {
      const users = await User.find({ org_id }).select("-password")
      return {
        success: true,
        message: "Users fetched successfully",
        data: users.map((u) => u.toObject()),
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
      const user = await User.findOne({ _id: userId, org_id }).select("-password")

      if (!user) {
        return {
          success: false,
          message: "User not found",
        }
      }

      return {
        success: true,
        message: "User fetched successfully",
        data: user.toObject(),
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
      const user = await User.findOneAndUpdate({ _id: userId, org_id }, { $set: data }, { new: true }).select(
        "-password",
      )

      if (!user) {
        return {
          success: false,
          message: "User not found",
        }
      }

      return {
        success: true,
        message: "User updated successfully",
        data: user.toObject(),
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
      const teamMembers = await User.find({ org_id, manager_id: managerId }).select("-password")
      return {
        success: true,
        message: "Team members fetched successfully",
        data: teamMembers.map((u) => u.toObject()),
      }
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch team members",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }
}
