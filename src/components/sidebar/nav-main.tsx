import React from "react"
import { Link, useLocation } from "react-router"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface NavItem {
  title: string
  url: string
  icon: React.ReactNode
}

export function NavMain({ items }: { items: NavItem[] }) {
  const location = useLocation()

  return (
    <SidebarMenu>
      {items.map((item) => {
        const isActive = location.pathname === item.url
        return (
          <SidebarMenuItem key={item.title} className="mb-1">
            <SidebarMenuButton asChild isActive={isActive}>
              <Link to={item.url}>
                {item.icon}
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}
