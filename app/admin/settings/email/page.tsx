"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Mail, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

export default function EmailSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const [config, setConfig] = useState({
    enabled: false,
    verified: false,
    fromName: "",
    fromEmail: "",
    smtp: {
      host: "",
      port: 587,
      secure: false,
      username: "",
      password: "",
    },
  })

  const [testEmail, setTestEmail] = useState("")

  useEffect(() => {
    fetchEmailConfig()
  }, [])

  const fetchEmailConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/company/email-config", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      const data = await response.json()

      if (data.success && data.data) {
        setConfig({
          ...data.data,
          smtp: data.data.smtp || {
            host: "",
            port: 587,
            secure: false,
            username: "",
            password: "",
          },
        })
      }
    } catch (error) {
      console.error("Failed to fetch email config:", error)
      toast.error("Failed to load email configuration")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const response = await fetch("/api/company/email-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(config),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Email configuration saved successfully")
        // Reset verified status since config changed
        setConfig((prev) => ({ ...prev, verified: false }))
      } else {
        toast.error(data.message || "Failed to save configuration")
      }
    } catch (error) {
      console.error("Save error:", error)
      toast.error("Failed to save email configuration")
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error("Please enter a test email address")
      return
    }

    try {
      setTesting(true)

      const response = await fetch("/api/company/email-config/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ testEmail }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Email verified! Test email sent successfully")
        setConfig((prev) => ({ ...prev, verified: true }))
      } else {
        toast.error(data.message || "Email verification failed")
      }
    } catch (error) {
      console.error("Test error:", error)
      toast.error("Failed to verify email configuration")
    } finally {
      setTesting(false)
    }
  }

  const handleDisable = async () => {
    try {
      const response = await fetch("/api/company/email-config/disable", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Company email disabled. Using system email.")
        setConfig((prev) => ({ ...prev, enabled: false }))
      } else {
        toast.error(data.message || "Failed to disable email")
      }
    } catch (error) {
      console.error("Disable error:", error)
      toast.error("Failed to disable email configuration")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email Settings</h1>
        <p className="text-muted-foreground">
          Configure your company email to send emails using your own SMTP server
        </p>
      </div>

      {/* Status Banner */}
      {config.enabled && (
        <Card className="p-4 border-l-4 border-l-primary">
          <div className="flex items-center gap-3">
            {config.verified ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium">Company Email Active</p>
                  <p className="text-sm text-muted-foreground">
                    All emails are being sent from {config.fromEmail}
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="font-medium">Email Not Verified</p>
                  <p className="text-sm text-muted-foreground">
                    Please verify your email configuration below
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {!config.enabled && (
        <Card className="p-4 border-l-4 border-l-gray-400">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-gray-600" />
            <div>
              <p className="font-medium">Using System Email</p>
              <p className="text-sm text-muted-foreground">
                All emails are being sent from the platform's default email address
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Configuration Form */}
      <Card className="p-6">
        <div className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Use Company Email</Label>
              <p className="text-sm text-muted-foreground">
                Send emails using your own email address
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
            />
          </div>

          {config.enabled && (
            <>
              {/* From Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>From Name</Label>
                  <Input
                    value={config.fromName}
                    onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
                    placeholder="Your Company Name"
                  />
                </div>
                <div>
                  <Label>From Email</Label>
                  <Input
                    type="email"
                    value={config.fromEmail}
                    onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
                    placeholder="noreply@yourcompany.com"
                  />
                </div>
              </div>

              {/* SMTP Configuration */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">SMTP Configuration</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>SMTP Host</Label>
                    <Input
                      value={config.smtp.host}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          smtp: { ...config.smtp, host: e.target.value },
                        })
                      }
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div>
                    <Label>SMTP Port</Label>
                    <Input
                      type="number"
                      value={config.smtp.port}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          smtp: { ...config.smtp, port: Number(e.target.value) },
                        })
                      }
                      placeholder="587"
                    />
                  </div>
                  <div>
                    <Label>SMTP Username</Label>
                    <Input
                      value={config.smtp.username}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          smtp: { ...config.smtp, username: e.target.value },
                        })
                      }
                      placeholder="your-email@gmail.com"
                    />
                  </div>
                  <div>
                    <Label>SMTP Password</Label>
                    <Input
                      type="password"
                      value={config.smtp.password}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          smtp: { ...config.smtp, password: e.target.value },
                        })
                      }
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Switch
                    checked={config.smtp.secure}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        smtp: { ...config.smtp, secure: checked },
                      })
                    }
                  />
                  <Label>Use SSL/TLS (Port 465)</Label>
                </div>
              </div>

              {/* Test Email */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Test Configuration</h3>
                <div className="flex gap-4">
                  <Input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Enter email to receive test message"
                    className="flex-1"
                  />
                  <Button onClick={handleTestEmail} disabled={testing}>
                    {testing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Test Email
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  We'll send a test email to verify your configuration
                </p>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-between border-t pt-6">
            {config.enabled && (
              <Button variant="outline" onClick={handleDisable}>
                Disable Company Email
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={fetchEmailConfig}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Configuration"
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Help Section */}
      <Card className="p-6 bg-muted/50">
        <h3 className="font-semibold mb-2">Need Help?</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Gmail:</strong> Enable 2-factor auth and create an App Password
          </p>
          <p>
            <strong>Office 365:</strong> Use smtp.office365.com on port 587
          </p>
          <p>
            <strong>Custom SMTP:</strong> Contact your email provider for SMTP settings
          </p>
        </div>
      </Card>
    </div>
  )
}
