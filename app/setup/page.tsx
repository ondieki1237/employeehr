"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import CompanySetup from "@/components/setup/company-setup"
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react"
import { api } from "@/lib/api"

export default function SetupPage() {
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState("company")
  const [companyData, setCompanyData] = useState<any>(null)

  const steps = ["company", "team", "confirmation"]

  const handleStepComplete = (step: string) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps([...completedSteps, step])
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Progress Indicator */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-8">
            {steps.map((step, index) => (
              <div key={step} className="flex-1 flex items-center">
                <button
                  onClick={() => setCurrentStep(step)}
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition ${
                    step === currentStep
                      ? "bg-primary text-primary-foreground"
                      : completedSteps.includes(step)
                        ? "bg-accent text-accent-foreground"
                        : "bg-border text-muted-foreground"
                  }`}
                >
                  {completedSteps.includes(step) ? <CheckCircle2 size={20} /> : index + 1}
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-4 rounded transition ${
                      completedSteps.includes(step) ? "bg-accent" : "bg-border"
                    }`}
                  ></div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between text-sm">
            <span className={currentStep === "company" ? "font-semibold text-foreground" : "text-muted-foreground"}>
              Company Info
            </span>
            <span className={currentStep === "team" ? "font-semibold text-foreground" : "text-muted-foreground"}>
              Invite Team
            </span>
            <span
              className={currentStep === "confirmation" ? "font-semibold text-foreground" : "text-muted-foreground"}
            >
              Confirm
            </span>
          </div>
        </div>

        {/* Step Content */}
        <div>
          {currentStep === "company" && (
            <CompanySetup
              onNext={(data) => {
                setCompanyData(data)
                handleStepComplete("company")
                setCurrentStep("team")
              }}
            />
          )}

          {currentStep === "team" && (
            <TeamInviteSetup
              companyData={companyData}
              onNext={() => {
                handleStepComplete("team")
                setCurrentStep("confirmation")
              }}
              onBack={() => setCurrentStep("company")}
            />
          )}

          {currentStep === "confirmation" && <ConfirmationStep onBack={() => setCurrentStep("team")} />}
        </div>
      </div>
    </div>
  )
}

function TeamInviteSetup({
  companyData,
  onNext,
  onBack,
}: {
  companyData: any
  onNext: () => void
  onBack: () => void
}) {
  const [team, setTeam] = useState<{ email: string; role: string }[]>([{ email: "", role: "manager" }])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const addTeamMember = () => {
    setTeam([...team, { email: "", role: "manager" }])
  }

  const removeTeamMember = (index: number) => {
    setTeam(team.filter((_, i) => i !== index))
  }

  const updateTeamMember = (index: number, field: "email" | "role", value: string) => {
    const updated = [...team]
    updated[index][field] = value
    setTeam(updated)
  }

  const handleContinue = async () => {
    setError("")

    // Filter empty emails
    const validTeamMembers = team.filter((member) => member.email.trim())

    // If there are team members to invite, send invitations
    if (validTeamMembers.length > 0) {
      setIsLoading(true)

      try {
        // Get company domain from the current URL or use the company data
        const companyDomain = companyData?.domain || window.location.hostname

        const response = await api.invitations.send({
          team_members: validTeamMembers,
          company_domain: companyDomain,
        })

        if (response.success) {
          onNext()
        } else {
          setError(response.message || "Failed to send invitations")
        }
      } catch (err: any) {
        setError(err.message || "An error occurred while sending invitations")
      } finally {
        setIsLoading(false)
      }
    } else {
      // No team members to invite, just continue
      onNext()
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-8">
      <h2 className="text-2xl font-bold mb-2">Invite Your Team</h2>
      <p className="text-muted-foreground mb-8">
        Add team members who will use Elevate. You can invite more people later.
      </p>

      <div className="space-y-4 mb-8">
        {team.map((member, index) => (
          <div key={index} className="flex gap-3">
            <input
              type="email"
              placeholder="team@company.com"
              value={member.email}
              onChange={(e) => updateTeamMember(index, "email", e.target.value)}
              className="flex-1 px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            />
            <select
              value={member.role}
              onChange={(e) => updateTeamMember(index, "role", e.target.value)}
              className="px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            >
              <option value="manager">Manager</option>
              <option value="employee">Employee</option>
              <option value="hr">HR</option>
            </select>
            {team.length > 1 && (
              <button
                onClick={() => removeTeamMember(index)}
                className="px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition disabled:opacity-50"
                disabled={isLoading}
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addTeamMember}
        className="text-primary hover:text-primary/80 font-medium mb-8 transition disabled:opacity-50"
        disabled={isLoading}
      >
        + Add another team member
      </button>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm flex gap-3 mb-8">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-3 pt-8 border-t border-border">
        <button
          onClick={onBack}
          className="flex-1 px-6 py-3 border border-border rounded-lg hover:bg-secondary transition font-medium disabled:opacity-50"
          disabled={isLoading}
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          disabled={isLoading}
        >
          {isLoading && <Loader2 size={18} className="animate-spin" />}
          {isLoading ? "Sending invitations..." : "Continue"}
        </button>
      </div>
    </div>
  )
}

function ConfirmationStep({ onBack }: { onBack: () => void }) {
  // Read user from localStorage to route based on role
  const goToDashboard = () => {
    try {
      const raw = localStorage.getItem('elevate_user')
      const user = raw ? JSON.parse(raw) : null
      const role = user?.role
      if (role === 'company_admin' || role === 'hr') {
        window.location.href = '/admin'
      } else if (role === 'manager') {
        window.location.href = '/manager'
      } else {
        window.location.href = '/employee'
      }
    } catch (e) {
      window.location.href = '/dashboard'
    }
  }
  return (
    <div className="bg-card border border-border rounded-lg p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 size={32} className="text-accent" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Setup Complete!</h2>
      <p className="text-muted-foreground mb-8">
        Your organization is ready to start using Elevate. Invitations have been sent to your team.
      </p>

      <div className="bg-secondary rounded-lg p-6 mb-8 text-left">
        <h3 className="font-semibold mb-3">Next steps:</h3>
        <ul className="space-y-2 text-sm text-foreground">
          <li>✓ Set up your performance categories and KPIs</li>
          <li>✓ Configure your PDP templates</li>
          <li>✓ Customize award criteria</li>
          <li>✓ Invite your employees to get started</li>
        </ul>
      </div>

      <button
        onClick={goToDashboard}
        className="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition font-medium mb-3"
      >
        Go to Dashboard
      </button>
      <button
        onClick={onBack}
        className="w-full px-6 py-3 border border-border rounded-lg hover:bg-secondary transition font-medium"
      >
        Back
      </button>
    </div>
  )
}
