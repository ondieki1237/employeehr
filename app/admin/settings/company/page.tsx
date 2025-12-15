"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { Loader2, Image as ImageIcon, Palette, RefreshCw, Type, Layout, Eye } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function CompanySettingsPage() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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

  useEffect(() => {
    loadBranding()
  }, [])

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
      }
    } catch (e: any) {
      toast({ description: e.message || "Failed to load branding", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const onLogoFile = async (file: File) => {
    if (!file) return
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
    root.style.setProperty("--brand-radius", borderRadius)
    root.style.setProperty("--radius", borderRadius)
    root.style.setProperty("--brand-font", fontFamily)
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
        logo 
      })
      if (res?.success) {
        applyCssVars()
        toast({ description: "Branding updated for your organization" })
      }
    } catch (e: any) {
      toast({ description: e.message || "Failed to save branding", variant: "destructive" })
    } finally {
      setSaving(false)
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
              <div className="w-20 h-20 border rounded bg-center bg-no-repeat bg-contain" style={{ backgroundImage: logo ? `url('${logo}')` : 'var(--company-logo-url)' }} />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">PNG or SVG, up to ~300 KB recommended</p>
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
