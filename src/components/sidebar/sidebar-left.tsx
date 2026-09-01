import React from "react"
import { Link } from "react-router"
import { NavMain } from "./nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
  SidebarGroup,
  SidebarGroupContent,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  Home,
  Wallet,
  TrendingUp,
  Target,
  User,
  Activity,
  Repeat,
} from "lucide-react"


export function SidebarLeft({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const mainNavigation = [
    { title: "Home", url: "/home", icon: <Home className="size-4" /> },
    { title: "Finances", url: "/money", icon: <Wallet className="size-4" /> },
    { title: "Subscriptions", url: "/subscriptions", icon: <Repeat className="size-4" /> },
    { title: "Goals", url: "/goals", icon: <Target className="size-4" /> },
    { title: "Insights", url: "/insights", icon: <TrendingUp className="size-4" /> },
  ]



  const settingsNavigation = [
    { title: "Profile", url: "/settings", icon: <User className="size-4" /> },
  ]


  return (
    <Sidebar className="border-r border-border bg-sidebar" {...props}>
      {/* Centered Branded Logo Header */}
      <SidebarHeader className="h-16 flex items-center justify-center px-4 border-b border-border">
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-1.5 group">
            <Activity className="h-5 w-5 text-primary transform transition-transform group-hover:scale-110 duration-200" />
            <span className="text-primary font-extrabold text-base tracking-tight">
              Personal OS
            </span>
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4 flex flex-col justify-between h-full">
        {/* Main Routes */}
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <NavMain items={mainNavigation} />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Separator and Settings at the bottom */}
        <div className="space-y-4 mt-auto">
          <SidebarSeparator className="mx-1" />
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <NavMain items={settingsNavigation} />
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
