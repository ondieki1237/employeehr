import mongoose, { Schema } from "mongoose"

const departmentSchema = new Schema(
  {
    name: { type: String, required: true },
    org_id: { type: String, required: true },
    managerId: { type: String, required: false },
  },
  { timestamps: true }
)

export const Department = mongoose.model("Department", departmentSchema)
