"use client"

import { useEffect, useMemo, useState } from "react"
import { api, stockApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const roomTemplates = [
  "Telesales",
  "Customer Support",
  "Product Follow-up",
  "Quotations",
  "Technical Support",
  "After Sales",
  "Marketing Campaigns",
  "Complaints & Feedback",
  "VIP Clients",
]

const eventTemplates = ["Health Expo", "Medical Camp", "Product Launch", "CME Training", "Hospital Visit", "Trade Fair"]
const clientCategories = ["Hospital", "Clinic", "Pharmacy", "NGO", "Government", "Private Practice"]
const quotationStatuses = ["Interested", "Follow-up Needed", "Closed", "Pending", "Converted to Sale"]
const walkInUrgency = ["High", "Medium", "Low"]
const walkInReasons = ["Price", "Budget", "Waiting Approval", "Comparing Options", "No Stock", "Other"]

function fmtDate(value?: string | Date) {
  if (!value) return "—"
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString()
}

function fmtDay(value?: string | Date) {
  if (!value) return "—"
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString()
}

export default function ClientCommunicationStandard({ docText }: { docText: string }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [quotations, setQuotations] = useState<any[]>([])
  const [selectedQuotation, setSelectedQuotation] = useState<any | null>(null)
  const [followUps, setFollowUps] = useState<any[]>([])
  const [quotationNote, setQuotationNote] = useState("")
  const [activeSection, setActiveSection] = useState<"quotations" | "rooms" | "events" | "walk-ins" | "analytics">("quotations")

  const [selectedRoom, setSelectedRoom] = useState(roomTemplates[3])
  const [roomNote, setRoomNote] = useState("")
  const [roomAssignedTo, setRoomAssignedTo] = useState("")
  const [roomFollowUpDate, setRoomFollowUpDate] = useState("")
  const [roomStatus, setRoomStatus] = useState("Follow-up Needed")
  const [roomDocName, setRoomDocName] = useState("")

  const [eventForm, setEventForm] = useState({
    eventName: "Health Expo 2026",
    eventType: "Exhibition",
    venue: "Main Hall",
    eventDate: "",
    organizer: "",
    status: "Upcoming",
  })
  const [eventClientForm, setEventClientForm] = useState({
    companyName: "",
    interest: "",
    contactPerson: "",
    phone: "",
    email: "",
    followUpDate: "",
    clientStatus: "Interested",
    notes: "",
  })
  const [eventClients, setEventClients] = useState<any[]>([
    {
      companyName: "Accord Hospital",
      interest: "Diagnostic equipment",
      contactPerson: "Dr. M. Akinyi",
      phone: "+254700000000",
      email: "procurement@accord.example",
      followUpDate: "2026-05-18",
      clientStatus: "Interested",
      notes: "Requested proposal and demo.",
    },
  ])
  const [eventsList, setEventsList] = useState<any[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  const [walkInForm, setWalkInForm] = useState({
    clientName: "",
    companyFacility: "",
    phone: "",
    email: "",
    productInterestedIn: "",
    budgetRange: "",
    urgency: "High",
    intendedPurchaseDate: "",
    reasonForNotBuying: "",
    followUpNeeded: true,
    assignedSalesPerson: "",
    notes: "",
  })
  const [walkIns, setWalkIns] = useState<any[]>([
    {
      clientName: "Sarah Ouma",
      companyFacility: "City Clinic",
      phone: "+254711111111",
      email: "",
      productInterestedIn: "Ultrasound machine",
      budgetRange: "KES 450k - 650k",
      urgency: "High",
      intendedPurchaseDate: "2026-05-20",
      reasonForNotBuying: "Waiting Approval",
      followUpNeeded: true,
      assignedSalesPerson: "Daniel",
      notes: "Needs quote and financing options.",
    },
  ])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [usersRes, quotationsRes] = await Promise.all([api.users.getAll(), stockApi.getQuotations()])
        setUsers((usersRes.data || []) as any[])
        const docs = quotationsRes.data || []
        const oneWeek = Date.now() - 7 * 24 * 60 * 60 * 1000
        setQuotations(
          docs.filter((q: any) => {
            const created = new Date(q.createdAt || q._id || Date.now()).getTime()
            return created <= oneWeek && (q.status === "pending_approval" || q.status === "draft")
          }),
        )
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedQuotation && quotations.length > 0) setSelectedQuotation(quotations[0])
  }, [quotations, selectedQuotation])

  useEffect(() => {
    const loadFollowUps = async () => {
      if (!selectedQuotation) return
      try {
        const res = await stockApi.getQuotationFollowUps(selectedQuotation._id)
        setFollowUps(res.data || [])
      } catch (error) {
        console.error(error)
      }
    }
    loadFollowUps()
  }, [selectedQuotation])

  const staffMembers = useMemo(() => {
    return users
      .filter((user) => ["company_admin", "hr", "manager"].includes(user.role))
      .map((user) => ({
        id: user._id,
        name: `${user.first_name || user.firstName || ""} ${user.last_name || user.lastName || ""}`.trim() || user.email,
      }))
  }, [users])

  const analytics = useMemo(() => {
    const walkInsTotal = walkIns.length
    const needsFollowUp = walkIns.filter((item) => item.followUpNeeded).length + eventClients.filter((item) => item.followUpDate).length
    const conversions = quotations.filter((q) => q.status === "converted").length
    return [
      { label: "Total walk-in clients", value: walkInsTotal },
      { label: "Upcoming follow-ups", value: needsFollowUp },
      { label: "Converted quotations", value: conversions },
      { label: "Active rooms", value: roomTemplates.length },
      { label: "Event clients", value: eventClients.length },
      { label: "Needs follow-up", value: quotations.length },
    ]
  }, [walkIns, eventClients, quotations])

  const sectionTitle = "text-xl font-semibold tracking-tight text-slate-900"
  const sectionText = "text-sm leading-6 text-slate-700"
  const labelText = "text-sm font-medium text-slate-900"
  const mutedText = "text-sm text-slate-600"

  const saveRoomConversation = async () => {
    if (!roomNote.trim()) return alert("Add a note for this conversation")
    setSaving(true)
    try {
      alert(`Saved conversation in ${selectedRoom} room with status ${roomStatus}`)
      setRoomNote("")
      setRoomDocName("")
      setRoomFollowUpDate("")
    } finally {
      setSaving(false)
    }
  }

  const saveEventClient = async () => {
    if (!eventClientForm.companyName.trim() || !eventClientForm.phone.trim()) {
      alert("Company name and phone are required")
      return
    }

    setSaving(true)
    try {
      // Prepare payload for client profile
      const payload = {
        sourceName: eventClientForm.companyName,
        sourceNumber: eventClientForm.phone,
        sourceLocation: (selectedEventId && eventsList.find((e) => e._id === selectedEventId)?.title) || eventForm.venue || 'event',
        legalName: eventClientForm.companyName,
        email: eventClientForm.email || undefined,
      }

      let createdProfile: any = null
      try {
        const res = await api.stock.saveClient(payload)
        createdProfile = res.data || res
      } catch (err) {
        console.warn('saveClient failed, falling back to local client save', err)
      }

      const clientRecord = createdProfile
        ? { ...eventClientForm, clientProfileId: createdProfile._id, _client: createdProfile }
        : { ...eventClientForm }

      if (selectedEventId) {
        setEventsList((prev) =>
          prev.map((ev) => (ev._id === selectedEventId ? { ...ev, clients: [clientRecord, ...(ev.clients || [])] } : ev)),
        )
      } else {
        setEventClients((prev) => [clientRecord, ...prev])
      }

      setEventClientForm({
        companyName: "",
        interest: "",
        contactPerson: "",
        phone: "",
        email: "",
        followUpDate: "",
        clientStatus: "Interested",
        notes: "",
      })
    } finally {
      setSaving(false)
    }
  }

  const saveEvent = async () => {
    if (!eventForm.eventName.trim()) return alert('Event name is required')
    setSaving(true)
    try {
      // Try saving to backend via meetings API
      let created: any = null
      try {
        const payload = {
          title: eventForm.eventName,
          description: `${eventForm.eventType} - ${eventForm.venue}`,
          scheduled_start: eventForm.eventDate || new Date().toISOString(),
          scheduled_end: eventForm.eventDate || new Date().toISOString(),
          meeting_type: 'client',
        }
        const res = await api.meetings.create(payload as any)
        created = res.data || res
      } catch (err) {
        console.warn('meetings.create failed, falling back to local save', err)
      }

      if (created) {
        // Ensure clients field exists
        const ev = { ...created, clients: eventClients }
        setEventsList((prev) => [ev, ...prev])
        setSelectedEventId(created._id || created.id)
      } else {
        // Local fallback
        const localId = `local_${Date.now()}`
        const ev = { _id: localId, title: eventForm.eventName, eventType: eventForm.eventType, venue: eventForm.venue, eventDate: eventForm.eventDate, organizer: eventForm.organizer, status: eventForm.status, clients: eventClients }
        setEventsList((prev) => [ev, ...prev])
        setSelectedEventId(localId)
      }

      // clear the temporary client list (they are now attached to the saved event)
      setEventClients([])
      alert('Event saved')
    } finally {
      setSaving(false)
    }
  }

  const saveWalkIn = () => {
    if (!walkInForm.clientName.trim() || !walkInForm.phone.trim()) {
      alert("Client name and phone are required")
      return
    }
    setWalkIns((prev) => [{ ...walkInForm }, ...prev])
    setWalkInForm({
      clientName: "",
      companyFacility: "",
      phone: "",
      email: "",
      productInterestedIn: "",
      budgetRange: "",
      urgency: "High",
      intendedPurchaseDate: "",
      reasonForNotBuying: "",
      followUpNeeded: true,
      assignedSalesPerson: "",
      notes: "",
    })
  }

  const convertQuotation = async (quotationId: string) => {
    if (!confirm("Convert this quotation to an invoice?")) return
    try {
      await stockApi.convertQuotation(quotationId)
      alert("Quotation converted to invoice")
      setQuotations((prev) => prev.filter((q) => q._id !== quotationId))
      if (selectedQuotation?._id === quotationId) setSelectedQuotation(null)
    } catch (error: any) {
      alert(error?.message || "Failed to convert quotation")
    }
  }

  const saveQuotationOutcome = async () => {
    if (!selectedQuotation || !quotationNote.trim()) return
    try {
      await stockApi.addQuotationFollowUp(selectedQuotation._id, { note: quotationNote, callMade: true, outcome: roomStatus })
      const res = await stockApi.getQuotationFollowUps(selectedQuotation._id)
      setFollowUps(res.data || [])
      setQuotationNote("")
    } catch (error: any) {
      alert(error?.message || "Failed to save follow-up")
    }
  }

  if (loading) {
    return <div className="rounded border bg-card p-6 text-sm text-slate-600">Loading communication workspace...</div>
  }

  const sections = [
    { id: "quotations", label: "Quotations", icon: "📋" },
    { id: "rooms", label: "Rooms", icon: "🏢" },
    { id: "events", label: "Events", icon: "📅" },
    { id: "walk-ins", label: "Walk-ins", icon: "👥" },
    { id: "analytics", label: "Analytics", icon: "📊" },
  ] as const

  return (
    <div className="space-y-8">
      <Card className="border-border/70 bg-card p-6 shadow-sm">
        <div className="space-y-4">
          <div className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-800">
            Independent client communication section
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Client Communication</h1>
            <p className={`${sectionText} max-w-4xl`}>
              A structured workspace for client communication rooms, events, walk-ins, quotation follow-ups, and analytics.
            </p>
          </div>
        </div>
      </Card>

      {/* Function Switcher Tab Bar */}
      <Card className="border-border/70 bg-card p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                activeSection === section.id
                  ? "border-1 border-slate-900 bg-slate-900 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
              }`}
            >
              <span>{section.icon}</span>
              <span>{section.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Quotations Section */}
      {activeSection === "quotations" && (
        <section className="space-y-4">
          <div>
            <h2 className={sectionTitle}>Quotation Follow-up Queue</h2>
            <p className={sectionText}>Quotations older than a week with no response are listed here for conversion and call follow-up.</p>
          </div>
          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <Card className="border-border/70 bg-card p-6 shadow-sm">
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-900">Stale quotations</div>
                <div className="text-sm text-slate-600">Older than 7 days and still pending or draft.</div>
              </div>
              <div className="mt-4 space-y-2 max-h-[26rem] overflow-auto pr-1">
                {quotations.length === 0 ? (
                  <p className="text-sm text-slate-600">No stale quotations found.</p>
                ) : quotations.map((quotation) => (
                  <button
                    key={quotation._id}
                    onClick={() => setSelectedQuotation(quotation)}
                    className={`w-full rounded-lg border p-3 text-left transition ${selectedQuotation?._id === quotation._id ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-slate-900">{quotation.quotationNumber}</div>
                      <div className="text-xs text-slate-600 capitalize">{quotation.status}</div>
                    </div>
                    <div className="text-sm text-slate-900">{quotation.client?.name}</div>
                    <div className="text-xs text-slate-600">Created: {fmtDate(quotation.createdAt)}</div>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="border-border/70 bg-card p-6 shadow-sm">
              {!selectedQuotation ? (
                <p className="text-sm text-slate-600">Select a quotation to convert or record a call note.</p>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold text-slate-900">{selectedQuotation.quotationNumber}</div>
                        <div className="text-sm text-slate-600">{selectedQuotation.client?.name} • {selectedQuotation.client?.number}</div>
                        <div className="text-sm text-slate-600">Follow-up status: {selectedQuotation.status}</div>
                      </div>
                      <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => convertQuotation(selectedQuotation._id)}>Convert to invoice</Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className={labelText}>Call outcome note</Label>
                    <Textarea className="text-slate-900" value={quotationNote} onChange={(e) => setQuotationNote(e.target.value)} placeholder="Write the outcome of the conversation" />
                    <p className="text-xs text-slate-600">Document the call outcome after the follow-up.</p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="border-slate-300 text-slate-900 hover:bg-slate-50" onClick={() => setQuotationNote("")}>Clear note</Button>
                    <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={saveQuotationOutcome}>Save call outcome</Button>
                  </div>

                  <div>
                    <h3 className={labelText}>Recent follow-up notes</h3>
                    <div className="mt-3 space-y-2 max-h-60 overflow-auto">
                      {followUps.length === 0 ? (
                        <p className="text-sm text-slate-600">No follow-ups recorded yet.</p>
                      ) : followUps.map((followUp) => (
                        <div key={followUp._id} className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium text-slate-900">{followUp.callMade ? "Call made" : "Follow-up"}</div>
                            <div className="text-xs text-slate-600">{fmtDate(followUp.createdAt)}</div>
                          </div>
                          <div className="mt-1 text-sm text-slate-700">{followUp.note}</div>
                          {followUp.outcome ? <div className="mt-1 text-xs text-slate-700">Outcome: {followUp.outcome}</div> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </section>
      )}

      {/* Rooms Section */}
      {activeSection === "rooms" && (
        <section className="space-y-4">
          <div>
            <h2 className={sectionTitle}>Client Communication Rooms</h2>
            <p className={sectionText}>Manage client conversations by room, then attach notes, staff, follow-up dates, documents, and a clean status label.</p>
          </div>
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Card className="border-border/70 bg-card p-6 shadow-sm">
              <div className="flex flex-wrap gap-2">
                {roomTemplates.map((room) => (
                  <button
                    key={room}
                    onClick={() => setSelectedRoom(room)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${selectedRoom === room ? "border-slate-400 bg-slate-100 text-slate-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                  >
                    {room}
                  </button>
                ))}
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label className={labelText}>Conversation note</Label>
                  <Textarea className="text-slate-900" value={roomNote} onChange={(e) => setRoomNote(e.target.value)} placeholder="Add note per conversation" />
                </div>
                <div className="space-y-2">
                  <Label className={labelText}>Assign staff member</Label>
                  <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900" value={roomAssignedTo} onChange={(e) => setRoomAssignedTo(e.target.value)}>
                    <option value="">Select staff member</option>
                    {staffMembers.map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className={labelText}>Follow-up date</Label>
                  <Input className="text-slate-900" type="date" value={roomFollowUpDate} onChange={(e) => setRoomFollowUpDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className={labelText}>Status</Label>
                  <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900" value={roomStatus} onChange={(e) => setRoomStatus(e.target.value)}>
                    {quotationStatuses.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className={labelText}>Upload quotations/documents</Label>
                  <Input className="text-slate-900" value={roomDocName} onChange={(e) => setRoomDocName(e.target.value)} placeholder="File name or document reference" />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={saveRoomConversation} disabled={saving}>Save conversation note</Button>
                <Button variant="outline" className="border-slate-300 text-slate-900 hover:bg-slate-50" onClick={() => setRoomNote("")}>Clear</Button>
              </div>
            </Card>

            <Card className="border-border/70 bg-card p-6 shadow-sm">
              <h3 className={labelText}>Room details</h3>
              <div className="mt-3 space-y-3 text-sm text-slate-700">
                <div><span className={labelText}>Selected room:</span> <span className="text-slate-900">{selectedRoom}</span></div>
                <div><span className={labelText}>Follow-up date:</span> <span className="text-slate-900">{roomFollowUpDate ? fmtDay(roomFollowUpDate) : "Not set"}</span></div>
                <div><span className={labelText}>Document:</span> <span className="text-slate-900">{roomDocName || "No file attached"}</span></div>
                <div><span className={labelText}>Status:</span> <span className="text-slate-900">{roomStatus}</span></div>
                <div><span className={labelText}>Assigned staff:</span> <span className="text-slate-900">{staffMembers.find((s) => s.id === roomAssignedTo)?.name || "Not assigned"}</span></div>
              </div>
              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                Notes are kept close to the room so the team can follow the outcome of every client conversation.
              </div>
            </Card>
          </div>
        </section>
      )}

      {/* Events Section */}
      {activeSection === "events" && (
        <section className="space-y-4">
          <div>
            <h2 className={sectionTitle}>Event Management Section</h2>
            <p className={sectionText}>Create events such as Health Expo, Medical Camp, Product Launch, CME Training, Hospital Visit, and Trade Fair.</p>
          </div>
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Card className="border-border/70 bg-card p-6 shadow-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label className={labelText}>Event Name</Label>
                  <Input className="text-slate-900" value={eventForm.eventName} onChange={(e) => setEventForm((prev) => ({ ...prev, eventName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className={labelText}>Event Type</Label>
                  <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900" value={eventForm.eventType} onChange={(e) => setEventForm((prev) => ({ ...prev, eventType: e.target.value }))}>
                    {eventTemplates.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className={labelText}>Venue</Label>
                  <Input className="text-slate-900" value={eventForm.venue} onChange={(e) => setEventForm((prev) => ({ ...prev, venue: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className={labelText}>Event Date</Label>
                  <Input type="date" className="text-slate-900" value={eventForm.eventDate} onChange={(e) => setEventForm((prev) => ({ ...prev, eventDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className={labelText}>Organizer</Label>
                  <Input className="text-slate-900" value={eventForm.organizer} onChange={(e) => setEventForm((prev) => ({ ...prev, organizer: e.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className={labelText}>Status</Label>
                  <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900" value={eventForm.status} onChange={(e) => setEventForm((prev) => ({ ...prev, status: e.target.value }))}>
                    {['Upcoming', 'Ongoing', 'Completed'].map((status) => <option key={status}>{status}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={saveEvent} disabled={saving}>Save event</Button>
                <Button variant="outline" className="border-slate-300 text-slate-900 hover:bg-slate-50">Add another</Button>
              </div>
            </Card>
            <Card className="border-border/70 bg-card p-6 shadow-sm">
              <h3 className={labelText}>Exhibitor / Invited Clients</h3>
              <div className="mt-3 space-y-3">
                <div className="text-sm text-slate-600">Saved events</div>
                <div className="flex flex-wrap gap-2">
                  {eventsList.length === 0 ? (
                    <div className="text-sm text-slate-500">No saved events yet.</div>
                  ) : eventsList.map((ev) => (
                    <button
                      key={ev._id}
                      onClick={() => setSelectedEventId(ev._id)}
                      className={`rounded px-3 py-1 text-sm ${selectedEventId === ev._id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-900'}`}
                    >
                      {ev.title || ev.eventName}
                    </button>
                  ))}
                  {eventsList.length > 0 && (
                    <button onClick={() => setSelectedEventId(null)} className="rounded px-3 py-1 text-sm bg-white border border-slate-200 text-slate-900">Clear selection</button>
                  )}
                </div>

                {/* Client entry form */}
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="space-y-2"><Label className={labelText}>Company Name</Label><Input className="text-slate-900" value={eventClientForm.companyName} onChange={(e) => setEventClientForm((p) => ({ ...p, companyName: e.target.value }))} /></div>
                  <div className="space-y-2"><Label className={labelText}>Interest</Label><Input className="text-slate-900" value={eventClientForm.interest} onChange={(e) => setEventClientForm((p) => ({ ...p, interest: e.target.value }))} /></div>
                  <div className="space-y-2"><Label className={labelText}>Contact Person</Label><Input className="text-slate-900" value={eventClientForm.contactPerson} onChange={(e) => setEventClientForm((p) => ({ ...p, contactPerson: e.target.value }))} /></div>
                  <div className="space-y-2"><Label className={labelText}>Phone</Label><Input className="text-slate-900" value={eventClientForm.phone} onChange={(e) => setEventClientForm((p) => ({ ...p, phone: e.target.value }))} /></div>
                  <div className="space-y-2"><Label className={labelText}>Email</Label><Input className="text-slate-900" value={eventClientForm.email} onChange={(e) => setEventClientForm((p) => ({ ...p, email: e.target.value }))} /></div>
                  <div className="space-y-2"><Label className={labelText}>Follow-up Date</Label><Input type="date" className="text-slate-900" value={eventClientForm.followUpDate} onChange={(e) => setEventClientForm((p) => ({ ...p, followUpDate: e.target.value }))} /></div>
                  <div className="space-y-2 md:col-span-2"><Label className={labelText}>Notes</Label><Textarea className="text-slate-900" value={eventClientForm.notes} onChange={(e) => setEventClientForm((p) => ({ ...p, notes: e.target.value }))} /></div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={saveEventClient}>Save client</Button>
                  <Button variant="outline" className="border-slate-300 text-slate-900 hover:bg-slate-50" onClick={() => setEventClientForm({ companyName: '', interest: '', contactPerson: '', phone: '', email: '', followUpDate: '', clientStatus: 'Interested', notes: '' })}>Clear</Button>
                </div>

                {/* Clients table for selected or temporary list */}
                <div className="mt-4 max-h-[24rem] overflow-auto rounded-lg border border-slate-200 bg-white">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-slate-50 text-left text-slate-900">
                      <tr>
                        <th className="px-3 py-2">Company Name</th>
                        <th className="px-3 py-2">Interest</th>
                        <th className="px-3 py-2">Contact</th>
                        <th className="px-3 py-2">Phone</th>
                        <th className="px-3 py-2">Follow-up</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedEventId ? (eventsList.find((e) => e._id === selectedEventId)?.clients || []) : eventClients).map((client: any, idx: number) => (
                        <tr key={idx} className="border-b text-slate-700">
                          <td className="px-3 py-2">{client.companyName}</td>
                          <td className="px-3 py-2">{client.interest}</td>
                          <td className="px-3 py-2">{client.contactPerson}</td>
                          <td className="px-3 py-2">{client.phone}</td>
                          <td className="px-3 py-2">{client.followUpDate ? fmtDay(client.followUpDate) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  Add invited or exhibitor clients to each saved event. Select an event at the top to attach clients to it.
                </div>
              </div>
            </Card>
          </div>
        </section>
      )}

      {/* Walk-ins Section */}
      {activeSection === "walk-ins" && (
        <section className="space-y-4">
          <div>
            <h2 className={sectionTitle}>Walk-in Clients Section</h2>
            <p className={sectionText}>Capture office, showroom, or booth visitors with budget, urgency, reasons for not buying, and assigned sales person.</p>
          </div>
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Card className="border-border/70 bg-card p-6 shadow-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label className={labelText}>Client Name</Label><Input className="text-slate-900" value={walkInForm.clientName} onChange={(e) => setWalkInForm((prev) => ({ ...prev, clientName: e.target.value }))} /></div>
                <div className="space-y-2"><Label className={labelText}>Company/Facility</Label><Input className="text-slate-900" value={walkInForm.companyFacility} onChange={(e) => setWalkInForm((prev) => ({ ...prev, companyFacility: e.target.value }))} /></div>
                <div className="space-y-2"><Label className={labelText}>Phone Number</Label><Input className="text-slate-900" value={walkInForm.phone} onChange={(e) => setWalkInForm((prev) => ({ ...prev, phone: e.target.value }))} /></div>
                <div className="space-y-2"><Label className={labelText}>Email</Label><Input className="text-slate-900" value={walkInForm.email} onChange={(e) => setWalkInForm((prev) => ({ ...prev, email: e.target.value }))} /></div>
                <div className="space-y-2"><Label className={labelText}>Product Interested In</Label><Input className="text-slate-900" value={walkInForm.productInterestedIn} onChange={(e) => setWalkInForm((prev) => ({ ...prev, productInterestedIn: e.target.value }))} /></div>
                <div className="space-y-2"><Label className={labelText}>Budget Range</Label><Input className="text-slate-900" value={walkInForm.budgetRange} onChange={(e) => setWalkInForm((prev) => ({ ...prev, budgetRange: e.target.value }))} /></div>
                <div className="space-y-2"><Label className={labelText}>Urgency of Purchase</Label><select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900" value={walkInForm.urgency} onChange={(e) => setWalkInForm((prev) => ({ ...prev, urgency: e.target.value }))}>{walkInUrgency.map((item) => <option key={item}>{item}</option>)}</select></div>
                <div className="space-y-2"><Label className={labelText}>Intended Purchase Date</Label><Input type="date" className="text-slate-900" value={walkInForm.intendedPurchaseDate} onChange={(e) => setWalkInForm((prev) => ({ ...prev, intendedPurchaseDate: e.target.value }))} /></div>
                <div className="space-y-2 md:col-span-2"><Label className={labelText}>Reason for Not Buying</Label><select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900" value={walkInForm.reasonForNotBuying} onChange={(e) => setWalkInForm((prev) => ({ ...prev, reasonForNotBuying: e.target.value }))}>{walkInReasons.map((reason) => <option key={reason}>{reason}</option>)}</select></div>
                <div className="space-y-2"><Label className={labelText}>Follow-up Needed</Label><select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900" value={String(walkInForm.followUpNeeded)} onChange={(e) => setWalkInForm((prev) => ({ ...prev, followUpNeeded: e.target.value === 'true' }))}><option value="true">Yes</option><option value="false">No</option></select></div>
                <div className="space-y-2"><Label className={labelText}>Assigned Sales Person</Label><select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900" value={walkInForm.assignedSalesPerson} onChange={(e) => setWalkInForm((prev) => ({ ...prev, assignedSalesPerson: e.target.value }))}><option value="">Select staff member</option>{staffMembers.map((staff) => <option key={staff.id}>{staff.name}</option>)}</select></div>
                <div className="space-y-2 md:col-span-2"><Label className={labelText}>Notes</Label><Textarea className="text-slate-900" value={walkInForm.notes} onChange={(e) => setWalkInForm((prev) => ({ ...prev, notes: e.target.value }))} /></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={saveWalkIn}>Save walk-in client</Button>
                <Button variant="outline" className="border-slate-300 text-slate-900 hover:bg-slate-50">Export</Button>
              </div>
            </Card>

            <Card className="border-border/70 bg-card p-6 shadow-sm">
              <h3 className={labelText}>Walk-in clients table</h3>
              <div className="mt-4 max-h-[30rem] overflow-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="border-b bg-slate-50 text-left text-slate-900">
                    <tr>
                      <th className="px-3 py-2">Client</th>
                      <th className="px-3 py-2">Company</th>
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2">Budget</th>
                      <th className="px-3 py-2">Urgency</th>
                      <th className="px-3 py-2">Follow-up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {walkIns.map((client, idx) => (
                      <tr key={idx} className="border-b text-slate-700">
                        <td className="px-3 py-2">{client.clientName}</td>
                        <td className="px-3 py-2">{client.companyFacility}</td>
                        <td className="px-3 py-2">{client.productInterestedIn}</td>
                        <td className="px-3 py-2">{client.budgetRange}</td>
                        <td className="px-3 py-2">{client.urgency}</td>
                        <td className="px-3 py-2">{client.followUpNeeded ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </section>
      )}

      {/* Analytics Section */}
      {activeSection === "analytics" && (
        <section className="space-y-4">
          <div>
            <h2 className={sectionTitle}>Analytics Dashboard</h2>
            <p className={sectionText}>A clean summary of communication activity and client follow-up performance.</p>
          </div>
          <Card className="border-border/70 bg-card p-6 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {analytics.map((item) => (
                <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="text-[11px] uppercase tracking-wide text-slate-600">{item.label}</div>
                  <div className="mt-1 font-semibold text-slate-900">{item.value}</div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}
    </div>
  )
}
