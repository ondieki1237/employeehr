"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getSession, logout } from "@/components/shule/auth-utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BarChart3, BookOpen, Calculator, ChevronRight, GraduationCap, Library, Menu, ShieldCheck, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"

const MANAGER_SECTIONS = [
  { label: "Dashboard", href: "/shule/dashboard/manager" },
  { label: "Students", href: "/shule/dashboard/manager/students" },
  { label: "Facilitators", href: "/shule/dashboard/manager/facilitators" },
  { label: "Resources", href: "/shule/dashboard/manager/resources" },
  { label: "Examinations", href: "/shule/dashboard/manager/examinations" },
  { label: "Library", href: "/shule/dashboard/manager/library" },
  { label: "Fee Management", href: "/shule/dashboard/manager/fees" },
  { label: "Supervision", href: "/shule/dashboard/manager/supervision" },
]

interface BrandingData {
  logo?: string
  primaryColor?: string
  secondaryColor?: string
  name?: string
  textColor?: string
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "")
  if (normalized.length !== 6) return `rgba(37, 99, 235, ${alpha})`
  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [branding, setBranding] = useState<BrandingData>({
    primaryColor: "#2563eb",
    secondaryColor: "#059669",
    textColor: "#0f172a",
  })

  const navItems = useMemo(() => ([
    { label: "Dashboard", href: "/shule/dashboard/manager", icon: BarChart3 },
    { label: "Students", href: "/shule/dashboard/manager/students", icon: Users },
    { label: "Facilitators", href: "/shule/dashboard/manager/facilitators", icon: GraduationCap },
    { label: "Resources", href: "/shule/dashboard/manager/resources", icon: BookOpen },
    { label: "Examinations", href: "/shule/dashboard/manager/examinations", icon: Calculator },
    { label: "Library", href: "/shule/dashboard/manager/library", icon: Library },
    { label: "Fee Management", href: "/shule/dashboard/manager/fees", icon: Calculator },
    { label: "Supervision", href: "/shule/dashboard/manager/supervision", icon: ShieldCheck },
  ]), [])

  useEffect(() => {
    const session = getSession()

    if (!session) {
      router.push("/shule/login")
      return
    }

    if (session.role !== "manager") {
      router.push("/shule/dashboard")
      return
    }

    // Fetch branding
    const fetchBranding = async () => {
      try {
        const res = await api.company.getBranding()
        if (res?.success && res.data) {
          setBranding({
            logo: res.data.logo,
            primaryColor: res.data.primaryColor || "#1e293b",
            secondaryColor: res.data.secondaryColor,
            textColor: res.data.textColor || "#ffffff",
            name: res.data.name,
          })
          // Apply brand colors to CSS variables globally
          const root = document.documentElement
          if (res.data.primaryColor) {
            root.style.setProperty("--brand-primary", res.data.primaryColor)
            root.style.setProperty("--primary", res.data.primaryColor)
          }
          if (res.data.textColor) {
            root.style.setProperty("--brand-text", res.data.textColor)
          }
          if (res.data.accentColor) {
            root.style.setProperty("--brand-accent", res.data.accentColor)
            root.style.setProperty("--accent", res.data.accentColor)
          }
        }
      } catch (error) {
        console.error("Failed to load branding:", error)
      }
    }

    fetchBranding()
    setLoading(false)
  }, [router])

  const getTitle = () => {
    const section = MANAGER_SECTIONS.find((s) => s.href === pathname)
    return section?.label || "Manager Workspace"
  }

  const primaryColor = branding.primaryColor || "#2563eb"
  const secondaryColor = branding.secondaryColor || "#059669"
  const textColor = branding.textColor || "#0f172a"

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2" style={{ borderColor: primaryColor }} />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50" style={{ color: textColor }}>
      <div className="hidden lg:block">
        <aside
          className="flex h-full w-72 flex-col border-r bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.03)]"
          style={{ borderRightColor: hexToRgba(primaryColor, 0.12) }}
        >
          <div
            className="border-b px-6 py-5"
            style={{
              background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 1)} 0%, ${hexToRgba(primaryColor, 0.88)} 100%)`,
              color: "white",
              borderBottomColor: hexToRgba(primaryColor, 0.95),
            }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              {branding.logo ? (
                <div className="h-10 w-auto rounded-lg bg-white/10 px-2 py-1">
                  <img
                    src={branding.logo}
                    alt="Logo"
                    className="h-full max-h-8 object-contain"
                    style={{ filter: "brightness(0) invert(1)" }}
                  />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-sm font-semibold text-white">
                  ME
                </div>
              )}
              <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-white/90">
                Manager
              </div>
            </div>
            <div className="text-xs font-medium uppercase tracking-[0.2em] opacity-90">
              School Enterprise
            </div>
            <h2 className="mt-1 text-lg font-semibold">{branding.name || "Manager Portal"}</h2>
            <p className="mt-1 text-sm opacity-80">Operational control for school leadership</p>
            <div className="mt-4 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/70">Workspace mode</p>
              <p className="mt-1 text-sm font-medium text-white/95">Modern branded leadership dashboard</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((link) => {
              const active = pathname === link.href
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition",
                    active
                      ? "text-white"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900",
                  )}
                  style={
                    active
                      ? {
                          background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                          color: "white",
                          boxShadow: `0 12px 24px ${hexToRgba(primaryColor, 0.22)}`,
                        }
                      : {}
                  }
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={active ? { backgroundColor: "rgba(255,255,255,0.16)" } : { backgroundColor: hexToRgba(primaryColor, 0.08), color: primaryColor }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1">{link.label}</span>
                  {active && <ChevronRight className="h-4 w-4 opacity-90" />}
                </Link>
              )
            })}
          </nav>

          <div className="border-t p-4" style={{ borderTopColor: hexToRgba(primaryColor, 0.12) }}>
            <Button
              variant="outline"
              className="w-full justify-start"
              style={{ borderColor: hexToRgba(primaryColor, 0.18), color: primaryColor }}
              onClick={() => {
                logout()
                router.push("/shule")
              }}
            >
              Log out
            </Button>
          </div>
        </aside>
      </div>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72">
            <aside
              className="flex h-full w-72 flex-col border-r bg-white"
              style={{
                borderRightColor: branding.primaryColor + "20",
              }}
            >
              <div
                className="border-b px-6 py-5"
                style={{
                  backgroundColor: branding.primaryColor,
                  color: branding.textColor || "white",
                  borderBottomColor: branding.primaryColor + "dd",
                }}
              >
                {branding.logo && (
                  <div className="mb-3 h-8 w-auto">
                    <img
                      src={branding.logo}
                      alt="Logo"
                      className="h-full object-contain"
                      style={{ filter: "brightness(0) invert(1)" }}
                    />
                  </div>
                )}
                <div className="text-xs font-medium uppercase tracking-[0.2em] opacity-90">
                  School Enterprise
                </div>
                <h2 className="mt-1 text-lg font-semibold">{branding.name || "Manager Portal"}</h2>
                <p className="mt-1 text-sm opacity-80">Operational control for school leadership</p>
              </div>

              <nav className="flex-1 space-y-1 px-4 py-5">
                {MANAGER_SECTIONS.map((link) => {
                  const active = pathname === link.href
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "block rounded-lg px-4 py-3 text-sm font-medium transition",
                        active
                          ? "text-white"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                      )}
                      style={
                        active
                          ? {
                              backgroundColor: branding.primaryColor,
                              color: branding.textColor || "white",
                            }
                          : {}
                      }
                    >
                      <span className="flex-1">{link.label}</span>
                    </Link>
                  )
                })}
              </nav>

              <div className="border-t p-4">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    logout()
                    setSidebarOpen(false)
                    router.push("/shule")
                  }}
                >
                  Log out
                </Button>
              </div>
            </aside>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex h-16 items-center justify-between border-b bg-white px-4 sm:px-6"
          style={{
            borderBottomColor: hexToRgba(primaryColor, 0.12),
            boxShadow: `0 1px 0 ${hexToRgba(primaryColor, 0.04)}`,
          }}
        >
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Manager Workspace</p>
              <h1 className="text-base font-semibold text-slate-900">{getTitle()}</h1>
            </div>
          </div>

          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex" style={{ borderColor: hexToRgba(primaryColor, 0.18), color: primaryColor }}>
            <Link href="/shule">School Enterprise</Link>
          </Button>
        </header>
        <main className="min-w-0 flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  )
}
