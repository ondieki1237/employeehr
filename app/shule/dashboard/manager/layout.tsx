"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getSession, logout } from "@/components/shule/auth-utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
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
    primaryColor: "#1e293b",
    textColor: "#ffffff",
  })

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <div className="hidden lg:block">
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
                  {link.label}
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
                      {link.label}
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
            borderBottomColor: branding.primaryColor + "20",
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

          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <Link href="/shule">School Enterprise</Link>
          </Button>
        </header>
        <main className="min-w-0 flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
