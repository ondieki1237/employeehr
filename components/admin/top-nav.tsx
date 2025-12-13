"use client"

import { Menu, Bell, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getUser } from "@/lib/auth"

interface TopNavProps {
  onMenuClick: () => void
}

export default function AdminTopNav({ onMenuClick }: TopNavProps) {
  const user = getUser()

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu size={20} />
        </Button>
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Admin Panel</span> / Organization Management
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="relative">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
        </Button>

        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role.replace("_", " ")}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-semibold">
              {user?.first_name?.charAt(0)}
              {user?.last_name?.charAt(0)}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
