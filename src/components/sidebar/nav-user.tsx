import { useNavigate } from "react-router"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ChevronsUpDown, Shield, Bell, Sliders, LogOut } from "lucide-react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { logout } from "@/store/authSlice"

export function NavUser({ user: defaultUser }: { user?: { name: string; email: string; avatar?: string } }) {
  const { isMobile } = useSidebar()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const authUser = useAppSelector((state) => state.auth.user)

  const activeUser = {
    name: authUser?.name || defaultUser?.name || "User",
    email: authUser?.email || defaultUser?.email || "user@personalos.app",
    avatar: authUser?.avatarUrl || defaultUser?.avatar || "",
  }

  const initials = activeUser.name.substring(0, 2).toUpperCase()

  const handleLogout = () => {
    dispatch(logout())
    navigate("/login", { replace: true })
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-primary text-primary-foreground font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-semibold">{activeUser.name}</span>
                <span className="truncate text-xs text-muted-foreground">{activeUser.email}</span>
              </div>
              <ChevronsUpDown className="ms-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg shadow-lg border border-border"
            side={isMobile ? "bottom" : "right"}
            align="start"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary text-primary-foreground font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-semibold">{activeUser.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{activeUser.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Sliders className="mr-2 size-4 text-muted-foreground" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Shield className="mr-2 size-4 text-muted-foreground" />
                Security
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Bell className="mr-2 size-4 text-muted-foreground" />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive hover:bg-destructive/10 cursor-pointer"
            >
              <LogOut className="mr-2 size-4 text-destructive" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

