'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle2, Send } from 'lucide-react'
import API_URL from '@/lib/apiBase'
import { toast } from 'sonner'

interface Question {
  field_id: string
  label: string
  type: string
  required: boolean
  placeholder?: string
  options?: string[]
  order: number
}

interface PoolMember {
  _id: string
  employee_name: string
  role: string
  submission_count: number
}

interface PoolData {
  pool: {
    _id: string
    name: string
    description?: string
  }
  members: PoolMember[]
  survey: {
    _id: string
    name: string
    description?: string
    form_config: {
      questions: Question[]
    }
  }
}

export default function PublicFeedbackPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const poolId = params.poolId as string
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [poolData, setPoolData] = useState<PoolData | null>(null)
  const [currentUser, setCurrentUser] = useState<string>('')
  const [selectedMember, setSelectedMember] = useState<string>('')
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [availableMembers, setAvailableMembers] = useState<PoolMember[]>([])
  const [completedCount, setCompletedCount] = useState(0)

  useEffect(() => {
    if (poolId) {
      // poolId can be either the actual pool ID (with token query param) or the token itself
      fetchPoolData()
    } else {
      setError('Invalid feedback link')
      setLoading(false)
    }
  }, [poolId, token])

  useEffect(() => {
    if (poolData && currentUser) {
      // Filter out the current user and already completed members
      const others = poolData.members.filter(m => m._id !== currentUser)
      setAvailableMembers(others)
    }
  }, [poolData, currentUser])

  const fetchPoolData = async () => {
    try {
      // Build URL with token query param if it exists
      const url = token 
        ? `${API_URL}/api/feedback-surveys/public/${poolId}?token=${token}`
        : `${API_URL}/api/feedback-surveys/public/${poolId}`
      
      const res = await fetch(url)

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to load feedback form')
      }

      const data = await res.json()
      setPoolData(data.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!poolData || !currentUser) return

    // Validate member selection
    if (!selectedMember) {
      toast.error('Please select a member to provide feedback for')
      return
    }

    // Validate required fields
    const requiredFields = poolData.survey.form_config.questions.filter(q => q.required)
    const missingFields = requiredFields.filter(q => !answers[q.field_id])

    if (missingFields.length > 0) {
      toast.error('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Format answers array
      const formattedAnswers = Object.entries(answers).map(([question_id, answer]) => ({
        question_id,
        answer,
      }))

      const res = await fetch(`${API_URL}/api/feedback-surveys/public/${poolId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          submitter_id: currentUser,
          member_id: selectedMember,
          answers: formattedAnswers,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit feedback')
      }

      // Clear form for next submission
      setAnswers({})
      setSelectedMember('')
      setCompletedCount(prev => prev + 1)
      
      // Remove the member from available list
      setAvailableMembers(prev => prev.filter(m => m._id !== selectedMember))
      
      toast.success('Feedback submitted successfully!')

      // Check if all feedback is complete (4 submissions)
      if (completedCount + 1 >= 4) {
        setSubmitted(true)
      }
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const renderField = (question: Question) => {
    const value = answers[question.field_id] || ''

    const updateAnswer = (newValue: any) => {
      setAnswers(prev => ({ ...prev, [question.field_id]: newValue }))
    }

    switch (question.type) {
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => updateAnswer(e.target.value)}
            placeholder={question.placeholder}
            rows={4}
            required={question.required}
          />
        )

      case 'select':
        return (
          <Select value={value} onValueChange={updateAnswer} required={question.required}>
            <SelectTrigger>
              <SelectValue placeholder={question.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option, i) => (
                <SelectItem key={i} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'radio':
        return (
          <div className="space-y-2">
            {question.options?.map((option, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={question.field_id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => updateAnswer(e.target.value)}
                  className="w-4 h-4"
                  required={question.required}
                />
                <span>{option}</span>
              </div>
            ))}
          </div>
        )

      case 'checkbox':
        return (
          <div className="space-y-2">
            {question.options?.map((option, i) => (
              <div key={i} className="flex items-center gap-2">
                <Checkbox
                  checked={Array.isArray(value) && value.includes(option)}
                  onCheckedChange={(checked) => {
                    const currentValues = Array.isArray(value) ? value : []
                    if (checked) {
                      updateAnswer([...currentValues, option])
                    } else {
                      updateAnswer(currentValues.filter((v: string) => v !== option))
                    }
                  }}
                />
                <span>{option}</span>
              </div>
            ))}
          </div>
        )

      case 'rating':
        const min = parseInt(question.options?.[0] || '1')
        const max = parseInt(question.options?.[1] || '5')
        return (
          <div className="flex items-center gap-2">
            {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => updateAnswer(rating)}
                className={`w-12 h-12 rounded-full border-2 ${
                  value === rating
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'border-gray-300 hover:border-blue-400'
                }`}
              >
                {rating}
              </button>
            ))}
          </div>
        )

      case 'slider':
        const sliderMin = parseInt(question.options?.[0] || '0')
        const sliderMax = parseInt(question.options?.[1] || '100')
        return (
          <div className="space-y-2">
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              value={value || sliderMin}
              onChange={(e) => updateAnswer(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>{sliderMin}</span>
              <span className="font-medium">{value || sliderMin}</span>
              <span>{sliderMax}</span>
            </div>
          </div>
        )

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => updateAnswer(e.target.value)}
            required={question.required}
          />
        )

      case 'email':
        return (
          <Input
            type="email"
            value={value}
            onChange={(e) => updateAnswer(e.target.value)}
            placeholder={question.placeholder}
            required={question.required}
          />
        )

      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => updateAnswer(e.target.value)}
            placeholder={question.placeholder}
            required={question.required}
          />
        )

      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => updateAnswer(e.target.value)}
            placeholder={question.placeholder}
            required={question.required}
          />
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error && !poolData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Error</h2>
              <p className="text-gray-600">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show completion screen when all 4 feedbacks are submitted
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">All Feedback Submitted!</h2>
              <p className="text-gray-600">
                You have successfully provided feedback for all {completedCount} team members. Thank you for your participation!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!poolData) return null

  // Show member identification step first
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">360° Feedback Survey</CardTitle>
              <CardDescription className="text-base">{poolData.survey.name}</CardDescription>
              <p className="text-sm text-muted-foreground mt-2">
                Pool: {poolData.pool.name}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please identify yourself from the list below to begin providing feedback.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="user-select" className="text-base font-semibold">
                    Who are you? *
                  </Label>
                  <Select value={currentUser} onValueChange={setCurrentUser} required>
                    <SelectTrigger id="user-select" className="w-full">
                      <SelectValue placeholder="Select your name..." />
                    </SelectTrigger>
                    <SelectContent>
                      {poolData.members.map((member) => (
                        <SelectItem key={member._id} value={member._id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{member.employee_name}</span>
                            <span className="text-sm text-muted-foreground">{member.role}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Main feedback form
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pool: {poolData.pool.name}</p>
                <p className="text-sm text-gray-500">
                  Progress: {completedCount} of 4 completed
                </p>
              </div>
              {completedCount > 0 && (
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">
                    {4 - completedCount} remaining
                  </p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
              {/* Member Selection */}
              <div className="border-b pb-6">
                <Label htmlFor="member-select" className="text-base font-semibold">
                  Provide Feedback For *
                </Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Select which team member you are evaluating ({availableMembers.length} remaining)
                </p>
                <Select value={selectedMember} onValueChange={setSelectedMember} required>
                  <SelectTrigger id="member-select" className="w-full">
                    <SelectValue placeholder="Select a team member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.map((member) => (
                      <SelectItem key={member._id} value={member._id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{member.employee_name}</span>
                          <span className="text-sm text-muted-foreground">{member.role}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {poolData.survey.form_config.questions
                .sort((a, b) => a.order - b.order)
                .map((question) => (
                  <div key={question.field_id} className="space-y-2">
                    <Label>
                      {question.label}
                      {question.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {renderField(question)}
                  </div>
                ))}

              <div className="flex gap-4">
                <Button type="submit" className="flex-1" size="lg" disabled={submitting || availableMembers.length === 0}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Feedback
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
