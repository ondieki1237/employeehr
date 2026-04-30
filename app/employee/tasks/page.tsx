"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react"
import { getToken } from "@/lib/auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010"

interface Task {
  _id: string
  title: string
  description: string
  status: "pending" | "in_progress" | "completed" | "cancelled"
  priority: "low" | "medium" | "high" | "urgent"
  due_date?: string
  assigned_by_user?: {
    firstName: string
    lastName: string
  }
  completed_at?: string
  createdAt: string
  related_entity_type?: string
  related_entity_id?: string
  source_label?: string
  is_packaging_duty?: boolean
}

export default function EmployeeTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all")
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [noteText, setNoteText] = useState("")
  const [postponeDate, setPostponeDate] = useState<string | null>(null)
  const [postponeReason, setPostponeReason] = useState("")

  useEffect(() => {
    fetchTasks()
  }, [filter])

  const fetchTasks = async () => {
    try {
      const token = getToken()
      if (!token) {
        setError("You are not signed in. Please log in again.")
        setTasks([])
        return
      }

      const statusParam = filter !== "all" ? `?status=${filter}` : ""
      
      const response = await fetch(`${API_URL}/api/tasks${statusParam}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setTasks(data.data)
        setError(null)
      } else {
        setTasks([])
        setError(data.message || "Failed to load tasks")
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error)
      setError("Failed to load tasks")
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      const token = getToken()
      if (!token) return
      
      const response = await fetch(`${API_URL}/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: "Task completed by employee" }),
      })

      const data = await response.json()
      if (data.success) {
        // Refresh tasks
        fetchTasks()
      }
    } catch (error) {
      console.error("Failed to complete task:", error)
    }
  }

  const fetchTaskDetails = async (taskId: string) => {
    try {
      setDetailLoading(true)
      const token = getToken()
      if (!token) {
        setError("You are not signed in. Please log in again.")
        return
      }

      const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setSelectedTask(data.data)
        setError(null)
      } else {
        setSelectedTask(null)
        setError(data.message || "Failed to load task")
      }
    } catch (err) {
      console.error(err)
      setError("Failed to load task")
    } finally {
      setDetailLoading(false)
    }
  }

  const handleOpenTask = (taskId: string) => {
    fetchTaskDetails(taskId)
  }

  const handleAddNote = async () => {
    if (!selectedTask) return
    try {
      const token = getToken()
      if (!token) return
      const res = await fetch(`${API_URL}/api/tasks/${selectedTask._id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: noteText }),
      })
      const data = await res.json()
      if (data.success) {
        setNoteText("")
        // refresh details and tasks
        fetchTaskDetails(selectedTask._id)
        fetchTasks()
      } else {
        setError(data.message || "Failed to add note")
      }
    } catch (err) {
      console.error(err)
      setError("Failed to add note")
    }
  }

  const handleRequestPostpone = async () => {
    if (!selectedTask) return
    try {
      const token = getToken()
      if (!token) return
      const res = await fetch(`${API_URL}/api/tasks/${selectedTask._id}/postpone`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ new_due_date: postponeDate, reason: postponeReason }),
      })
      const data = await res.json()
      if (data.success) {
        setPostponeDate(null)
        setPostponeReason("")
        fetchTaskDetails(selectedTask._id)
        fetchTasks()
      } else {
        setError(data.message || "Failed to request postpone")
      }
    } catch (err) {
      console.error(err)
      setError("Failed to request postpone")
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500"
      case "high": return "bg-orange-500"
      case "medium": return "bg-yellow-500"
      case "low": return "bg-green-500"
      default: return "bg-gray-500"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "in_progress": return <Clock className="h-5 w-5 text-blue-500" />
      case "pending": return <Circle className="h-5 w-5 text-gray-400" />
      default: return <AlertCircle className="h-5 w-5 text-orange-500" />
    }
  }

  const filteredTasks = filter === "all" 
    ? tasks 
    : tasks.filter(task => task.status === filter)

  const packagingTasks = tasks.filter(
    (task) =>
      task.is_packaging_duty ||
      task.related_entity_type === "invoice" ||
      String(task.source_label || "").toLowerCase().includes("packaging") ||
      String(task.title || "").toLowerCase().includes("packaging"),
  )

  return (
    <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Tasks</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your assigned duties and track your progress
              </p>
              {error && (
                <p className="mt-2 text-sm text-red-500">{error}</p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{tasks.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Pending
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-orange-500">
                    {tasks.filter(t => t.status === "pending").length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    In Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-500">
                    {tasks.filter(t => t.status === "in_progress").length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Completed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-500">
                    {tasks.filter(t => t.status === "completed").length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Packaging Duties
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-amber-500">
                    {packagingTasks.length}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="all">All Tasks</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>

              <TabsContent value={filter} className="mt-6">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500 dark:text-gray-400">No tasks found</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {filteredTasks.map((task) => (
                      <Card key={task._id}>
                        <CardContent className="p-6 cursor-pointer" onClick={() => handleOpenTask(task._id)}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4 flex-1">
                              {/* Checkbox */}
                              <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                                {task.status === "completed" ? (
                                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                                ) : (
                                  <Checkbox
                                    checked={task.status === "completed"}
                                    onCheckedChange={() => handleCompleteTask(task._id)}
                                  />
                                )}
                              </div>

                              {/* Task Details */}
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  {getStatusIcon(task.status)}
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {task.title}
                                  </h3>
                                  {(task.is_packaging_duty || task.related_entity_type === "invoice") && (
                                    <Badge variant="secondary">Packaging</Badge>
                                  )}
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 mb-3">
                                  {task.description}
                                </p>

                                {/* Metadata */}
                                <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
                                  {task.assigned_by_user && (
                                    <span>
                                      Assigned by: {task.assigned_by_user.firstName} {task.assigned_by_user.lastName}
                                    </span>
                                  )}
                                  {task.due_date && (
                                    <span>
                                      Due: {new Date(task.due_date).toLocaleDateString()}
                                    </span>
                                  )}
                                  {task.completed_at && (
                                    <span>
                                      Completed: {new Date(task.completed_at).toLocaleDateString()}
                                    </span>
                                  )}
                                  {(task.related_entity_type === "invoice" && task.related_entity_id) && (
                                    <span>
                                      Linked Invoice Duty
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Priority Badge */}
                            <Badge className={`${getPriorityColor(task.priority)} text-white`}>
                              {task.priority.toUpperCase()}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
            {/* Task detail panel */}
            {selectedTask && (
              <div className="fixed right-6 top-20 w-96 bg-white dark:bg-gray-800 border rounded shadow p-4 z-50">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold">{selectedTask.title}</h3>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTask(null)}>Close</Button>
                </div>

                <p className="text-sm text-gray-600 mb-2">{selectedTask.description}</p>

                <div className="text-sm text-gray-500 mb-2">
                  Assigned by: {selectedTask.assigned_by_user?.firstName} {selectedTask.assigned_by_user?.lastName}
                </div>

                <div className="mb-3">
                  <h4 className="font-medium">Notes</h4>
                  <div className="space-y-2 max-h-40 overflow-auto">
                    {(selectedTask.notes_history || []).map((n: any, i: number) => (
                      <div key={i} className="text-sm p-2 bg-gray-100 dark:bg-gray-700 rounded">
                        <div className="text-xs text-gray-500">{n.user_name} • {new Date(n.createdAt).toLocaleString()}</div>
                        <div>{n.text}</div>
                      </div>
                    ))}
                  </div>
                  <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} className="w-full mt-2 p-2 border rounded" placeholder="Write a note..." />
                  <div className="flex gap-2 mt-2">
                    <Button onClick={handleAddNote}>Add Note</Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium">Request Postpone</h4>
                  <input type="date" value={postponeDate || ""} onChange={(e) => setPostponeDate(e.target.value)} className="w-full mt-2 p-2 border rounded" />
                  <textarea value={postponeReason} onChange={(e) => setPostponeReason(e.target.value)} className="w-full mt-2 p-2 border rounded" placeholder="Reason (optional)" />
                  <div className="flex gap-2 mt-2">
                    <Button onClick={handleRequestPostpone}>Request Postpone</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
    </main>
  )
}
