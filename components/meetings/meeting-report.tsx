'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CheckCircle,
  AlertCircle,
  Loader,
  MessageSquare,
  Users,
  Target,
} from 'lucide-react'

interface ActionItem {
  description: string
  assigned_to: string
  due_date?: string
  task_id?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}

interface MeetingReportProps {
  title: string
  summary?: string
  keyPoints?: string[]
  actionItems?: ActionItem[]
  transcript?: string
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed'
  processingError?: string
  sentiment?: 'positive' | 'neutral' | 'negative'
}

export function MeetingReport({
  title,
  summary,
  keyPoints = [],
  actionItems = [],
  transcript = '',
  processingStatus = 'pending',
  processingError = '',
  sentiment = 'neutral',
}: MeetingReportProps) {
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return '😊'
      case 'negative':
        return '😟'
      default:
        return '😐'
    }
  }

  if (processingStatus === 'processing') {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center">
          <Loader className="w-8 h-8 animate-spin mb-4 text-blue-600" />
          <h3 className="text-lg font-semibold mb-2">Processing Meeting</h3>
          <p className="text-gray-600 text-center">
            Our AI is analyzing the meeting transcript and generating insights.
            This usually takes 1-2 minutes.
          </p>
        </div>
      </Card>
    )
  }

  if (processingStatus === 'failed') {
    return (
      <Card className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div>
              <h3 className="font-semibold mb-2">Processing Failed</h3>
              <p className="text-sm">{processingError}</p>
            </div>
          </AlertDescription>
        </Alert>
      </Card>
    )
  }

  if (processingStatus !== 'completed') {
    return (
      <Card className="p-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Meeting report is not yet available. Please check back later.
          </AlertDescription>
        </Alert>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">{title}</h2>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getSentimentIcon(sentiment)}</span>
            <Badge
              variant={
                sentiment === 'positive'
                  ? 'default'
                  : sentiment === 'negative'
                    ? 'destructive'
                    : 'secondary'
              }
            >
              {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)} Sentiment
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="points">Key Points</TabsTrigger>
          <TabsTrigger value="actions">Action Items</TabsTrigger>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Executive Summary
            </h3>
            {summary ? (
              <p className="text-gray-700 leading-relaxed">{summary}</p>
            ) : (
              <p className="text-gray-500">No summary available</p>
            )}
          </Card>
        </TabsContent>

        {/* Key Points Tab */}
        <TabsContent value="points" className="space-y-3">
          {keyPoints.length > 0 ? (
            <div className="grid gap-3">
              {keyPoints.map((point, idx) => (
                <Card key={idx} className="p-4 flex gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700">{point}</p>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <p className="text-gray-500">No key points identified</p>
            </Card>
          )}
        </TabsContent>

        {/* Action Items Tab */}
        <TabsContent value="actions" className="space-y-3">
          {actionItems.length > 0 ? (
            <div className="grid gap-3">
              {actionItems.map((item, idx) => (
                <Card key={idx} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        {item.description}
                      </h4>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {item.assigned_to}
                        </Badge>
                        {item.due_date && (
                          <Badge variant="outline">
                            Due: {new Date(item.due_date).toLocaleDateString()}
                          </Badge>
                        )}
                        {item.priority && (
                          <Badge className={getPriorityColor(item.priority)}>
                            {item.priority.charAt(0).toUpperCase() +
                              item.priority.slice(1)}{' '}
                            Priority
                          </Badge>
                        )}
                      </div>
                    </div>
                    {item.task_id && (
                      <Badge className="bg-green-600">Task Created</Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <Target className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No action items identified</p>
            </Card>
          )}
        </TabsContent>

        {/* Transcript Tab */}
        <TabsContent value="transcript" className="space-y-4">
          <Card className="p-6">
            {transcript ? (
              <div className="max-h-96 overflow-y-auto">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {transcript}
                </p>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No transcript available
              </p>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600 mb-1">
            {keyPoints.length}
          </div>
          <p className="text-sm text-gray-600">Key Points</p>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600 mb-1">
            {actionItems.length}
          </div>
          <p className="text-sm text-gray-600">Action Items</p>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600 mb-1">
            {actionItems.filter((a) => a.task_id).length}
          </div>
          <p className="text-sm text-gray-600">Tasks Created</p>
        </Card>
      </div>
    </div>
  )
}
