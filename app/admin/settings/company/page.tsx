"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { Loader2, Image as ImageIcon, Palette, RefreshCw, Type, Layout, Eye, Edit2, Trash2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { LocationSelector } from "@/components/ui/location-selector"
import { Building2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function CompanySettingsPage() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)

  const [name, setName] = useState("")
  const [logo, setLogo] = useState<string | undefined>(undefined)
  const [primaryColor, setPrimaryColor] = useState("#2563eb")
  const [secondaryColor, setSecondaryColor] = useState("#059669")
  const [accentColor, setAccentColor] = useState("#f59e0b")
  const [backgroundColor, setBackgroundColor] = useState("#ffffff")
  const [textColor, setTextColor] = useState("#1f2937")
  const [borderRadius, setBorderRadius] = useState("0.5rem")
  const [fontFamily, setFontFamily] = useState("system-ui")
  const [buttonStyle, setButtonStyle] = useState("rounded")

  // Location & Holidays
  const [country, setCountry] = useState("")
  const [state, setState] = useState("")
  const [city, setCity] = useState("")
  const [countryCode, setCountryCode] = useState("")
  const [syncingHolidays, setSyncingHolidays] = useState(false)
  const [departments, setDepartments] = useState<any[]>([])
  const [newDept, setNewDept] = useState("")
  const [kpis, setKpis] = useState<any[]>([])
  const [newKpi, setNewKpi] = useState({
    name: "",
    description: "",
    category: "Operations",
    weight: "50",
    target: "100",
    unit: "%",
    department_id: "",
  })

  useEffect(() => {
    loadBranding()
    loadDepartments()
    loadKpis()
  }, [])

  const loadDepartments = async () => {
    try {
      const res = await api.company.getDepartments()
      if (res?.success) setDepartments(res.data || [])
    } catch (e) {
      console.error('Failed to load departments', e)
    }
  }

  const loadKpis = async () => {
    try {
      const res = await api.kpis.getAll()
      if (res?.success) setKpis(res.data || [])
    } catch (e) {
      console.error('Failed to load KPIs', e)
    }
  }

  const loadBranding = async () => {
    try {
      setLoading(true)
      const res = await api.company.getBranding()
      if (res?.success && res.data) {
        setName(res.data.name || "")
        setLogo(res.data.logo)
        setPrimaryColor(res.data.primaryColor || "#2563eb")
        setSecondaryColor(res.data.secondaryColor || "#059669")
        setAccentColor(res.data.accentColor || "#f59e0b")
        setBackgroundColor(res.data.backgroundColor || "#ffffff")
        setTextColor(res.data.textColor || "#1f2937")
        setBorderRadius(res.data.borderRadius || "0.5rem")
        setFontFamily(res.data.fontFamily || "system-ui")
        setButtonStyle(res.data.buttonStyle || "rounded")
        setCountry(res.data.country || "")
        setState(res.data.state || "")
        setCity(res.data.city || "")
        setCountryCode(res.data.countryCode || "")

        // Apply colors immediately after loading
        setTimeout(() => {
          applyCssVarsFromApi(
            res.data.primaryColor || "#2563eb",
            res.data.secondaryColor || "#059669",
            res.data.accentColor || "#f59e0b",
            res.data.backgroundColor || "#ffffff",
            res.data.textColor || "#1f2937",
            res.data.borderRadius || "0.5rem",
            res.data.logo
          )
        }, 0)
      }
    } catch (e: any) {
      toast({ description: e.message || "Failed to load branding", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const applyCssVarsFromApi = (
    pc: string,
    sc: string,
    ac: string,
    bgc: string,
    tc: string,
    br: string,
    logo?: string
  ) => {
    const root = document.documentElement
    root.style.setProperty("--brand-primary", pc)
    root.style.setProperty("--primary", pc)
    root.style.setProperty("--brand-secondary", sc)
    root.style.setProperty("--brand-accent", ac)
    root.style.setProperty("--accent", ac)
    root.style.setProperty("--brand-background", bgc)
    root.style.setProperty("--brand-text", tc)
    root.style.setProperty("--background", bgc)
    root.style.setProperty("--foreground", tc)
    root.style.setProperty("--brand-radius", br)
    root.style.setProperty("--radius", br)
    root.style.backgroundColor = bgc
    if (logo) root.style.setProperty("--company-logo-url", `url('${logo}')`)
  }

  const onLogoFile = (file: File) => {
    if (!file) return
    setLogoFile(file)
    // Show preview
    const reader = new FileReader()
    reader.onload = () => {
      setLogo(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const applyCssVars = () => {
    const root = document.documentElement
    root.style.setProperty("--brand-primary", primaryColor)
    root.style.setProperty("--primary", primaryColor)
    root.style.setProperty("--brand-secondary", secondaryColor)
    root.style.setProperty("--brand-accent", accentColor)
    root.style.setProperty("--accent", accentColor)
    root.style.setProperty("--brand-background", backgroundColor)
    root.style.setProperty("--brand-text", textColor)
    root.style.setProperty("--background", backgroundColor)
    root.style.setProperty("--foreground", textColor)
    root.style.setProperty("--brand-radius", borderRadius)
    root.style.setProperty("--radius", borderRadius)
    root.style.setProperty("--brand-font", fontFamily)
    // Apply to actual page background
    root.style.backgroundColor = backgroundColor
    if (logo) root.style.setProperty("--company-logo-url", `url('${logo}')`)
  }

  const saveBranding = async () => {
    try {
      setSaving(true)
      const res = await api.company.updateBranding({
        primaryColor,
        secondaryColor,
        accentColor,
        backgroundColor,
        textColor,
        borderRadius,
        fontFamily,
        buttonStyle,
        logoFile: logoFile || undefined,
        logoUrl: logoFile ? undefined : logo,
        country,
        state,
        city,
        countryCode
      })
      if (res?.success && res.data) {
        // Confirm data persisted to database
        console.log('✓ Branding saved to database:', res.data)
        // Update logo display with the server response
        setLogo(res.data.logo)
        setLogoFile(null) // Clear file input
        applyCssVars()
        toast({
          description: "✓ Branding updated and synced across your organization. All employees will see the new branding when they refresh.",
          variant: "default"
        })
      } else {
        throw new Error('No response data')
      }
    } catch (e: any) {
      console.error('Save error:', e)
      toast({ description: e.message || "Failed to save branding", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleSyncHolidays = async () => {
    try {
      setSyncingHolidays(true)
      // Save location first if changed
      if (countryCode) {
        await api.company.updateBranding({ countryCode })
      }

      const res = await api.holidays.sync({ year: new Date().getFullYear() })
      if (res.success) {
        toast({
          description: `✓ ${res.message}`,
          variant: "default"
        })
      } else {
        throw new Error(res.message)
      }
    } catch (e: any) {
      toast({ description: e.message || "Failed to sync holidays", variant: "destructive" })
    } finally {
      setSyncingHolidays(false)
    }
  }

  const resetDefaults = () => {
    setPrimaryColor("#2563eb")
    setSecondaryColor("#059669")
    setAccentColor("#f59e0b")
    setBackgroundColor("#ffffff")
    setTextColor("#1f2937")
    setBorderRadius("0.5rem")
    setFontFamily("system-ui")
    setButtonStyle("rounded")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg"><Palette className="w-5 h-5 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Company Branding</h1>
            <p className="text-muted-foreground">Set your logo and brand colors. Changes apply to all users in your organization.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetDefaults} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Reset
          </Button>
          <Button onClick={saveBranding} disabled={saving} className="gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Departments */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">Departments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input placeholder="New department name" value={newDept} onChange={(e) => setNewDept(e.target.value)} />
                <Button onClick={async () => {
                  if (!newDept.trim()) return
                  try {
                    const r = await api.company.createDepartment({ name: newDept.trim() })
                    if (r?.success) {
                      setNewDept('')
                      loadDepartments()
                      toast({ description: 'Department created' })
                    }
                  } catch (err: any) {
                    toast({ description: err.message || 'Failed to create department', variant: 'destructive' })
                  }
                }}>Create</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {departments.map((d: any) => (
                  <div key={d._id} className="flex items-center gap-2">
                    <Badge>{d.name}</Badge>
                    <Button size="sm" variant="outline" onClick={async () => {
                      const newName = window.prompt('Rename department', d.name)
                      if (!newName) return
                      try {
                        const r = await api.company.updateDepartment(d._id, { name: newName.trim() })
                        if (r?.success) {
                          toast({ description: 'Department renamed' })
                          loadDepartments()
                        }
                      } catch (err: any) {
                        toast({ description: err.message || 'Failed to rename department', variant: 'destructive' })
                      }
                    }}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => {
                      if (!confirm(`Delete department "${d.name}"?`)) return
                      try {
                        const r = await api.company.deleteDepartment(d._id)
                        if (r?.success) {
                          toast({ description: 'Department deleted' })
                          loadDepartments()
                        }
                      } catch (err: any) {
                        toast({ description: err.message || 'Failed to delete department', variant: 'destructive' })
                      }
                    }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Department KPIs */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">Department KPIs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="KPI name" value={newKpi.name} onChange={(e) => setNewKpi({ ...newKpi, name: e.target.value })} />
              <Select value={newKpi.department_id} onValueChange={(v) => setNewKpi({ ...newKpi, department_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d: any) => (
                    <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Category" value={newKpi.category} onChange={(e) => setNewKpi({ ...newKpi, category: e.target.value })} />
              <Input placeholder="Unit" value={newKpi.unit} onChange={(e) => setNewKpi({ ...newKpi, unit: e.target.value })} />
              <Input placeholder="Weight" type="number" value={newKpi.weight} onChange={(e) => setNewKpi({ ...newKpi, weight: e.target.value })} />
              <Input placeholder="Target" type="number" value={newKpi.target} onChange={(e) => setNewKpi({ ...newKpi, target: e.target.value })} />
            </div>
            <Input placeholder="Description" value={newKpi.description} onChange={(e) => setNewKpi({ ...newKpi, description: e.target.value })} />
            <Button onClick={async () => {
              if (!newKpi.name.trim()) return
              try {
                const r = await api.kpis.create({
                  name: newKpi.name.trim(),
                  description: newKpi.description.trim(),
                  category: newKpi.category.trim(),
                  weight: Number(newKpi.weight) || 50,
                  target: Number(newKpi.target) || 100,
                  unit: newKpi.unit.trim(),
                  department_id: newKpi.department_id || undefined,
                } as any)
                if (r?.success) {
                  toast({ description: 'KPI created' })
                  setNewKpi({ name: '', description: '', category: 'Operations', weight: '50', target: '100', unit: '%', department_id: '' })
                  loadKpis()
                }
              } catch (err: any) {
                toast({ description: err.message || 'Failed to create KPI', variant: 'destructive' })
              }
            }}>Create KPI</Button>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {kpis.map((kpi: any) => (
                <div key={kpi._id} className="flex items-center justify-between gap-2 rounded-md border p-3">
                  <div>
                    <div className="font-medium">{kpi.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {kpi.category} • {departments.find((d) => d._id === kpi.department_id)?.name || 'All departments'}
                    </div>
                  </div>
                  <Button variant="ghost" className="text-destructive" size="sm" onClick={async () => {
                    if (!confirm(`Delete KPI \"${kpi.name}\"?`)) return
                    try {
                      const r = await api.kpis.delete(kpi._id)
                      if (r?.success) {
                        toast({ description: 'KPI deleted' })
                        loadKpis()
                      }
                    } catch (err: any) {
                      toast({ description: err.message || 'Failed to delete KPI', variant: 'destructive' })
                    }
                  }}>Delete</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Location & Holidays */}
        <Card className="md:col-span-2 border-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Location & Holidays
              </div>
              <Button variant="outline" size="sm" onClick={handleSyncHolidays} disabled={syncingHolidays || !countryCode}>
                {syncingHolidays ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Sync Public Holidays
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <LocationSelector
              country={country}
              state={state}
              city={city}
              onCountryChange={(name, code) => {
                setCountry(name)
                setCountryCode(code)
                setState("")
                setCity("")
              }}
              onStateChange={(name) => {
                setState(name)
                setCity("")
              }}
              onCityChange={(name) => setCity(name)}
              disabled={saving || loading}
            />
            {!countryCode && <p className="text-sm text-yellow-600">Please select a country to enable holiday synchronization.</p>}
          </CardContent>
        </Card>

        {/* Logo */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Company Logo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {logo ? (
                <img
                  src={logo}
                  alt="Logo preview"
                  className="w-20 h-20 border rounded object-contain"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    console.warn('Logo failed to load:', logo)
                    // hide the broken image and clear the logo state so UI shows placeholder
                    e.currentTarget.style.display = 'none'
                    setLogo(undefined)
                  }}
                />
              ) : (
                <div className="w-20 h-20 border rounded bg-center bg-no-repeat bg-contain bg-gray-100" />
              )}
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">PNG or SVG, up to ~300 KB recommended</p>
                {logo && <p className="text-xs text-gray-500 mb-2 break-all">{logo}</p>}
                <label className="inline-flex items-center gap-2 px-3 py-2 border rounded cursor-pointer hover:bg-secondary">
                  <ImageIcon className="w-4 h-4" />
                  <span>Upload Logo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && onLogoFile(e.target.files[0])} />
                </label>
              </div>
            </div>
            <div>
              <Label>Or Logo URL</Label>
              <Input placeholder="https://.../logo.png" value={logo || ""} onChange={(e) => setLogo(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Primary & Secondary Colors */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Primary & Secondary Colors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-[80px_1fr] gap-3 items-center">
              <Label>Primary</Label>
              <div className="flex gap-2">
                <input type="color" className="h-10 w-16 rounded border cursor-pointer" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
                <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1" />
              </div>
            </div>

            <div className="grid grid-cols-[80px_1fr] gap-3 items-center">
              <Label>Secondary</Label>
              <div className="flex gap-2">
                <input type="color" className="h-10 w-16 rounded border cursor-pointer" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} />
                <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="flex-1" />
              </div>
            </div>

            <div className="grid grid-cols-[80px_1fr] gap-3 items-center">
              <Label>Accent</Label>
              <div className="flex gap-2">
                <input type="color" className="h-10 w-16 rounded border cursor-pointer" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
                <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="flex-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Background & Text */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layout className="w-4 h-4" />
              Background & Text
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-[80px_1fr] gap-3 items-center">
              <Label>Background</Label>
              <div className="flex gap-2">
                <input type="color" className="h-10 w-16 rounded border cursor-pointer" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />
                <Input value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="flex-1" />
              </div>
            </div>

            <div className="grid grid-cols-[80px_1fr] gap-3 items-center">
              <Label>Text</Label>
              <div className="flex gap-2">
                <input type="color" className="h-10 w-16 rounded border cursor-pointer" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
                <Input value={textColor} onChange={(e) => setTextColor(e.target.value)} className="flex-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Typography & Style */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Type className="w-4 h-4" />
              Typography & Style
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Font Family</Label>
              <Select value={fontFamily} onValueChange={setFontFamily}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system-ui">System UI</SelectItem>
                  <SelectItem value="Inter, sans-serif">Inter</SelectItem>
                  <SelectItem value="Roboto, sans-serif">Roboto</SelectItem>
                  <SelectItem value="'Open Sans', sans-serif">Open Sans</SelectItem>
                  <SelectItem value="'Poppins', sans-serif">Poppins</SelectItem>
                  <SelectItem value="'Montserrat', sans-serif">Montserrat</SelectItem>
                  <SelectItem value="'Lato', sans-serif">Lato</SelectItem>
                  <SelectItem value="Georgia, serif">Georgia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Border Radius</Label>
              <Select value={borderRadius} onValueChange={setBorderRadius}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None (0)</SelectItem>
                  <SelectItem value="0.25rem">Small (0.25rem)</SelectItem>
                  <SelectItem value="0.5rem">Medium (0.5rem)</SelectItem>
                  <SelectItem value="0.75rem">Large (0.75rem)</SelectItem>
                  <SelectItem value="1rem">Extra Large (1rem)</SelectItem>
                  <SelectItem value="9999px">Full (Pill)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Button Style</Label>
              <Select value={buttonStyle} onValueChange={setButtonStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rounded">Rounded</SelectItem>
                  <SelectItem value="sharp">Sharp</SelectItem>
                  <SelectItem value="pill">Pill</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Preview */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Live Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border p-6 space-y-4" style={{
            background: backgroundColor,
            color: textColor,
            fontFamily: fontFamily
          }}>
            <h3 className="text-lg font-semibold">Sample Card</h3>
            <p className="text-sm opacity-80">This is how your branding will appear across the platform.</p>
            <div className="flex gap-3 flex-wrap">
              <button
                className="px-4 py-2 text-white font-medium transition hover:opacity-90"
                style={{
                  background: primaryColor,
                  borderRadius: buttonStyle === 'pill' ? '9999px' : buttonStyle === 'sharp' ? '0' : borderRadius
                }}
              >
                Primary Button
              </button>
              <button
                className="px-4 py-2 text-white font-medium transition hover:opacity-90"
                style={{
                  background: secondaryColor,
                  borderRadius: buttonStyle === 'pill' ? '9999px' : buttonStyle === 'sharp' ? '0' : borderRadius
                }}
              >
                Secondary Button
              </button>
              <button
                className="px-4 py-2 text-white font-medium transition hover:opacity-90"
                style={{
                  background: accentColor,
                  borderRadius: buttonStyle === 'pill' ? '9999px' : buttonStyle === 'sharp' ? '0' : borderRadius
                }}
              >
                Accent Button
              </button>
            </div>
            {logo && (
              <div className="pt-4 border-t" style={{ borderColor: textColor + '20' }}>
                <p className="text-xs opacity-60 mb-2">Logo:</p>
                <div className="w-32 h-12 bg-center bg-no-repeat bg-contain" style={{ backgroundImage: `url('${logo}')` }} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="text-sm text-muted-foreground p-4">
          Organization: <span className="font-medium">{name || "Your Company"}</span>
        </CardContent>
      </Card>
    </div>
  )
}
