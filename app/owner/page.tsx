"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Lock, 
  Unlock, 
  Search, 
  Settings, 
  Activity, 
  Globe, 
  ShieldCheck, 
  Clock, 
  LayoutGrid, 
  Users, 
  Building2,
  ChevronRight,
  ChevronDown,
  Folder,
  X
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getToken, getUser } from "@/lib/auth"
import API_URL from "@/lib/apiBase"

interface Company {
  _id: string
  name: string
  email: string
  slug: string
  phone?: string
  industry?: string
  status: string
  subscription: string
  isFrozen?: boolean
  frozenReason?: string
  frozenAt?: Date
  enabledPages?: string[]
  maxEmployees?: number
  employeeCount?: number
  createdAt?: string
}

interface UserActivity {
  _id: string
  firstName: string
  lastName: string
  email: string
  role: string
  lastLoginAt?: string
  lastActiveAt?: string
  isOnline: boolean
  mostVisitedSection: string
  org_id: string
  companyName: string
}

const FEATURE_SECTIONS = {
  "Human Resources": [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "attendance", label: "Attendance Tracking", icon: "📍" },
    { id: "leave", label: "Leave Management", icon: "🏖️" },
    { id: "payroll", label: "Payroll", icon: "💰" },
  ],
  "Performance & Development": [
    { id: "performance", label: "Performance Reviews", icon: "⭐" },
    { id: "kpis", label: "KPIs & Goals", icon: "🎯" },
    { id: "feedback", label: "360° Feedback", icon: "💬" },
  ],
  "Operations": [
    { id: "meetings", label: "Meetings", icon: "📅" },
    { id: "communications", label: "Communications", icon: "📢" },
    { id: "stock", label: "Stock Management", icon: "📦" },
  ],
  "Analytics": [
    { id: "reports", label: "Reports", icon: "📈" },
    { id: "recruitment", label: "Recruitment", icon: "👥" },
  ],
}

const OWNER_EMAIL = "bellarinseth@gmail.com"

export default function OwnerPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"companies" | "activity">("companies")
  const [companies, setCompanies] = useState<Company[]>([])
  const [userActivities, setUserActivities] = useState<UserActivity[]>([])
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set())
  const [freezeReason, setFreezeReason] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  
  const user = getUser()
  const token = getToken()

  useEffect(() => {
    if (!user || !token || user.email?.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
      router.push("/auth/login")
      return
    }
    loadData()
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    try {
      const endpoint = activeTab === "companies" ? "owner/companies" : "owner/user-activity"
      const res = await fetch(`${API_URL}/api/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await res.json()
      if (activeTab === "companies") setCompanies(result.data || [])
      else setUserActivities(result.data || [])
    } catch (error) {
      toast({ description: "Failed to load system data", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePages = async (companyId: string, enabledPages: string[]) => {
    try {
      const res = await fetch(`${API_URL}/api/owner/companies/${companyId}/pages`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabledPages }),
      })
      if (res.ok) {
        toast({ description: "Permissions synchronized" })
        loadData()
      }
    } catch (error) {
      toast({ description: "Update failed", variant: "destructive" })
    }
  }

  const handleAccountStatus = async (companyId: string, action: 'freeze' | 'unfreeze') => {
    try {
      const res = await fetch(`${API_URL}/api/owner/companies/${companyId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: action === 'freeze' ? JSON.stringify({ reason: freezeReason }) : undefined,
      })
      if (res.ok) {
        toast({ description: `Account ${action}d successfully` })
        setFreezeReason("")
        setSelectedCompany(null)
        loadData()
      }
    } catch (error) {
      toast({ description: "Action failed", variant: "destructive" })
    }
  }

  const toggleCompany = (orgId: string) => {
    const next = new Set(expandedCompanies)
    if (next.has(orgId)) next.delete(orgId)
    else next.add(orgId)
    setExpandedCompanies(next)
  }

  const groupActivitiesByCompany = () => {
    const groups: Record<string, { name: string, users: UserActivity[] }> = {}
    userActivities.forEach(a => {
      if (!groups[a.org_id]) {
        groups[a.org_id] = { name: a.companyName, users: [] }
      }
      if (
        a.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.companyName.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        groups[a.org_id].users.push(a)
      }
    })
    return groups
  }

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.slug.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const activityGroups = groupActivitiesByCompany()

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-4 md:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-blue-600" />
              System Infrastructure
            </h1>
            <p className="text-sm text-gray-500 mt-1">Global administrative control and real-time environment monitoring</p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 p-1 rounded-md shadow-sm">
            <Button 
               variant={activeTab === "companies" ? "default" : "ghost"} 
               onClick={() => setActiveTab("companies")}
               size="sm"
               className="h-8 text-xs font-semibold px-4"
            >
              Enterprise Grid
            </Button>
            <Button 
               variant={activeTab === "activity" ? "default" : "ghost"} 
               onClick={() => setActiveTab("activity")}
               size="sm"
               className="h-8 text-xs font-semibold px-4"
            >
              Interaction Logs
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-gray-200 shadow-sm transition-all hover:shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Companies</p>
                <h3 className="text-2xl font-bold text-gray-900">{companies.length}</h3>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border border-gray-200 shadow-sm transition-all hover:shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Nodes</p>
                <h3 className="text-2xl font-bold text-green-600">{companies.filter(c => !c.isFrozen).length}</h3>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <Globe className="h-6 w-6 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border border-gray-200 shadow-sm transition-all hover:shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Live Sessions</p>
                <h3 className="text-2xl font-bold text-blue-600">{userActivities.filter(a => a.isOnline).length}</h3>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border border-gray-200 shadow-sm transition-all hover:shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Personnel</p>
                <h3 className="text-2xl font-bold text-gray-900">{companies.reduce((s, c) => s + (c.employeeCount || 0), 0)}</h3>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <Users className="h-6 w-6 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Toolbar */}
        <div className="flex flex-col md:flex-row items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            <Input 
              placeholder={`Quick search across ${activeTab === 'companies' ? 'registered companies' : 'organizational folders'}...`} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" onClick={loadData} className="h-9 gap-2">
            <Activity className="h-3.5 w-3.5" />
            Sync Logs
          </Button>
        </div>

        {/* Main View */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
          {loading ? (
            <div className="p-20 text-center text-gray-500 italic text-sm animate-pulse">Retrieving system interaction logs...</div>
          ) : activeTab === "companies" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#fcfcfc] border-b border-gray-200">
                  <tr>
                    <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest w-[30%]">Organization</th>
                    <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Status</th>
                    <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Plan</th>
                    <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Resources</th>
                    <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Settings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCompanies.map(company => (
                    <tr key={company._id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-md flex items-center justify-center font-bold text-sm ${company.isFrozen ? 'bg-red-50 text-red-600 shadow-inner' : 'bg-blue-50 text-blue-600 shadow-inner'}`}>
                            {company.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">{company.name}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">/{company.slug} • {company.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <Badge className={`${company.isFrozen ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'} uppercase text-[9px] px-2 py-0.5 font-bold`}>
                           {company.isFrozen ? 'Restricted' : 'Operational'}
                        </Badge>
                      </td>
                      <td className="p-4 capitalize text-xs font-semibold text-gray-700">{company.subscription}</td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1 w-32">
                          <span className="text-xs font-medium text-gray-900">{company.employeeCount || 0} / {company.maxEmployees || "∞"}</span>
                          <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 transition-all duration-500" 
                              style={{ width: `${Math.min(100, ((company.employeeCount || 0) / (company.maxEmployees || 100)) * 100)}%` }} 
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setSelectedCompany(company)}>
                          <Settings className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Interaction Logs with Folders (Grouped by Company) */
            <div className="divide-y divide-gray-100">
               {Object.entries(activityGroups).filter(([_, group]) => group.users.length > 0).map(([orgId, group]) => (
                  <div key={orgId} className="group/folder">
                     <button 
                       onClick={() => toggleCompany(orgId)}
                       className="w-full flex items-center justify-between p-4 hover:bg-gray-50/80 transition-colors text-left"
                     >
                       <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg text-gray-500 group-hover/folder:bg-blue-50 group-hover/folder:text-blue-600 transition-colors">
                             <Folder className="h-5 w-5" />
                          </div>
                          <div>
                             <h4 className="font-bold text-sm text-gray-900">{group.name}</h4>
                             <p className="text-[11px] text-gray-500">{group.users.length} active personnel tracked</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                          <div className="hidden md:flex items-center gap-1.5">
                             <span className="h-2 w-2 rounded-full bg-green-500" />
                             <span className="text-[10px] font-bold text-gray-400 uppercase">{group.users.filter(u => u.isOnline).length} Online</span>
                          </div>
                          {expandedCompanies.has(orgId) ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                       </div>
                     </button>
                     
                     {/* User List within Folder */}
                     {expandedCompanies.has(orgId) && (
                       <div className="bg-gray-50/40 border-t border-gray-100 overflow-x-auto anim-fade-in">
                          <table className="w-full text-left border-collapse">
                             <thead className="bg-[#fcfcfc]/50 text-[9px] font-black uppercase text-gray-400 tracking-widest border-b">
                                <tr>
                                   <th className="p-4 pl-16">Personnel</th>
                                   <th className="p-4">Authorization</th>
                                   <th className="p-4">Last Telemetry</th>
                                   <th className="p-4 text-center">Top Sector</th>
                                   <th className="p-4 text-right">Status</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-100">
                                {group.users.sort((a,b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0)).map(activity => (
                                   <tr key={activity._id} className="hover:bg-blue-50/30 transition-colors">
                                      <td className="p-4 pl-16">
                                         <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 uppercase shadow-sm">
                                               {activity.firstName.charAt(0)}{activity.lastName.charAt(0)}
                                            </div>
                                            <div>
                                               <p className="font-semibold text-sm text-gray-900">{activity.firstName} {activity.lastName}</p>
                                               <p className="text-[10px] text-gray-500">{activity.email}</p>
                                            </div>
                                         </div>
                                      </td>
                                      <td className="p-4">
                                         <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 font-bold border-gray-200 bg-white">
                                            {activity.role.replace('_', ' ')}
                                         </Badge>
                                      </td>
                                      <td className="p-4">
                                         <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                                            <Clock className="h-3 w-3 text-gray-400" />
                                            {activity.lastActiveAt ? new Date(activity.lastActiveAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : 'Never'}
                                         </div>
                                      </td>
                                      <td className="p-4 text-center">
                                         <span className="text-[10px] font-bold text-blue-600 bg-white px-2 py-0.5 rounded-full border border-blue-100 uppercase shadow-sm">
                                            {activity.mostVisitedSection.replace('/admin/', '').replace('/employee/', '') || '—'}
                                         </span>
                                      </td>
                                      <td className="p-4 text-right">
                                         {activity.isOnline ? (
                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 border border-green-100 shadow-sm">
                                               <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                               <span className="text-[10px] font-bold text-green-700 uppercase">Live</span>
                                            </div>
                                         ) : (
                                            <span className="text-[10px] font-bold text-gray-400 uppercase mr-2 tracking-tighter">Offline</span>
                                         )}
                                      </td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                     )}
                  </div>
               ))}
               {Object.values(activityGroups).every(g => g.users.length === 0) && (
                 <div className="p-20 text-center text-gray-400 text-sm italic">No interactions recorded matching your search.</div>
               )}
            </div>
          )}
        </div>
      </div>

      {/* Global Admin Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-white shadow-2xl border-none overflow-hidden rounded-lg">
            <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-600 text-white flex items-center justify-center font-bold text-xl rounded shadow-sm">
                  {selectedCompany.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedCompany.name}</h2>
                  <p className="text-[11px] font-medium text-gray-500 uppercase tracking-widest">{selectedCompany.subscription} INFRASTRUCTURE</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedCompany(null)} className="h-8 w-8 rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6 space-y-8">
               {/* Permissions Multi-selector */}
               <div>
                  <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                    <LayoutGrid className="h-4 w-4 text-blue-600" />
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Global Module Rights</h3>
                  </div>
                  <div className="space-y-6">
                    {Object.entries(FEATURE_SECTIONS).map(([section, features]) => (
                      <div key={section} className="space-y-3">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{section}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {features.map((f) => (
                            <label key={f.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-md bg-gray-50/30 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group">
                                <span className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                                  <span className="grayscale group-hover:grayscale-0 transition-all">{f.icon}</span> {f.label}
                                </span>
                                <Checkbox 
                                  checked={selectedCompany.enabledPages?.includes(f.id) ?? true}
                                  onCheckedChange={(checked) => {
                                    const pages = selectedCompany.enabledPages || []
                                    const next = checked ? [...pages, f.id] : pages.filter(p => p !== f.id)
                                    handleUpdatePages(selectedCompany._id, next)
                                  }}
                                  className="h-4 w-4"
                                />
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
               </div>

               {/* Enforcement Action */}
               <div className={`p-5 rounded-lg border-l-4 ${selectedCompany.isFrozen ? 'bg-red-50 border-red-500' : 'bg-amber-50 border-amber-500'}`}>
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2 mb-4">
                    {selectedCompany.isFrozen ? <Lock className="h-4 w-4 text-red-600" /> : <Unlock className="h-4 w-4 text-amber-600" />}
                    Governance Enforcement
                  </h3>
                  
                  {selectedCompany.isFrozen ? (
                    <div className="space-y-3">
                       <p className="text-[11px] text-red-800 font-medium bg-red-100/50 p-3 rounded border border-red-200">
                         <strong>Enforced Policy:</strong> {selectedCompany.frozenReason || 'Account restricted by infrastructure owner.'}
                       </p>
                       <Button className="w-full bg-green-600 hover:bg-green-700 h-9 text-xs font-bold font-sans rounded shadow-sm" onClick={() => handleAccountStatus(selectedCompany._id, 'unfreeze')}>
                         RESUME NODE SERVICE
                       </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Enforcement Note</label>
                        <Input 
                          placeholder="State reason for restriction..."
                          value={freezeReason}
                          onChange={(e) => setFreezeReason(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <Button className="w-full bg-red-600 hover:bg-red-700 h-9 text-xs font-bold font-sans rounded shadow-sm" onClick={() => handleAccountStatus(selectedCompany._id, 'freeze')}>
                        INITIATE EMERGENCY FREEZE
                      </Button>
                    </div>
                  )}
               </div>
            </div>

            <div className="p-4 bg-gray-50 border-t flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedCompany(null)} className="h-8 font-bold text-[10px] uppercase tracking-widest px-6">Close</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
