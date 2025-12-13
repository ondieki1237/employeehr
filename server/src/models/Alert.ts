import mongoose from "mongoose"

const alertSchema = new mongoose.Schema(
  {
    org_id: {
      type: String,
      required: true,
      index: true,
    },
    user_id: {
      type: String,
      required: true,
      index: true,
    },
    alert_type: {
      type: String,
      enum: [
        "contract_expiry",
        "incomplete_pdp",
        "attendance_anomaly",
        "task_overload",
        "performance_low",
        "leave_balance_low",
        "project_deadline",
        "feedback_pending",
      ],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    related_id: String, // ID of related entity (contract, pdp, attendance record, task, etc.)
    related_type: String, // Type of related entity
    action_url: String, // URL to take action on the alert
    action_label: String, // Label for the action button
    is_read: {
      type: Boolean,
      default: false,
      index: true,
    },
    is_dismissed: {
      type: Boolean,
      default: false,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expires_at: {
      type: Date,
      index: true,
      // Auto-delete alerts after 30 days
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
)

// Compound indexes for common queries
alertSchema.index({ org_id: 1, user_id: 1, is_read: 1, is_dismissed: 1 })
alertSchema.index({ org_id: 1, user_id: 1, alert_type: 1 })
alertSchema.index({ org_id: 1, severity: 1, is_dismissed: 1 })

// TTL index to auto-delete expired alerts
alertSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 })

export default mongoose.model("Alert", alertSchema)
