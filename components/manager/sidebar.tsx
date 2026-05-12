"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { logout } from "@/lib/auth"

const links = [
  { href: "/manager", label: "Dashboard" },
  { href: "/manager/students", label: "Students" },
  { href: "/manager/facilitators", label: "Facilitators" },
  { href: "/manager/resources", label: "Resources" },
  { href: "/manager/examinations", label: "Examinations" },
  { href: "/manager/library", label: "Library" },
  { href: "/manager/fees", label: "Fee Management" },
  { href: "/manager/supervision", label: "Supervision" },
]

export default function ManagerSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  const handleLogout = () => {
    logout()
  }

  return (
    <aside className="flex h-full w-72 flex-col border-r bg-white">
      <div className="border-b px-6 py-5">
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          School Enterprise
        </div>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">Manager Portal</h2>
        <p className="mt-1 text-sm text-slate-600">Operational control for school leadership</p>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-5">
        {links.map((link) => {
          const active = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "block rounded-lg px-4 py-3 text-sm font-medium transition",
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
              )}
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
          onClick={handleLogout}
        >
          Log out
        </Button>
      </div>
    </aside>
  )
}
