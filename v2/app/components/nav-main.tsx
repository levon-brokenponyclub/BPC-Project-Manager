import * as React from "react"
import { Link, useSearchParams } from "react-router"
import { ChevronRight, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "~/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
    isActive?: boolean
    badge?: number
    items?: {
      title: string
      url: string
      badge?: number
    }[]
  }[]
}) {
  const [searchParams] = useSearchParams()
  const ws = searchParams.get("ws")
  const [openStates, setOpenStates] = React.useState<Record<string, boolean>>(
    {}
  )

  function withWs(url: string) {
    if (!ws) return url
    return url.includes("?") ? `${url}&ws=${ws}` : `${url}?ws=${ws}`
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            open={openStates[item.title] ?? false}
            onOpenChange={(open) => {
              setOpenStates((prev) => ({
                ...prev,
                [item.title]: open,
              }))
            }}
          >
            <SidebarMenuItem>
              {item.items?.length ? (
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    <item.icon />
                    <span>{item.title}</span>
                    {item.badge != null && item.badge > 0 && (
                      <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-semibold text-primary-foreground group-data-[collapsible=icon]:hidden">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </SidebarMenuButton>
                </CollapsibleTrigger>
              ) : (
                <SidebarMenuButton asChild tooltip={item.title}>
                  <Link to={withWs(item.url)}>
                    <item.icon />
                    <span>{item.title}</span>
                    {item.badge != null && item.badge > 0 && (
                      <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-semibold text-primary-foreground group-data-[collapsible=icon]:hidden">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              )}
              {item.items?.length ? (
                <>
                  <SidebarMenuAction
                    aria-hidden="true"
                    className={`transition-transform ${openStates[item.title] ? "rotate-90" : ""}`}
                  >
                    <ChevronRight />
                    <span className="sr-only">Toggle</span>
                  </SidebarMenuAction>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <Link
                              to={withWs(subItem.url)}
                              className="flex w-full items-center justify-between"
                            >
                              <span>{subItem.title}</span>
                              {subItem.badge != null && subItem.badge > 0 && (
                                <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-semibold text-primary-foreground">
                                  {subItem.badge > 99 ? "99+" : subItem.badge}
                                </span>
                              )}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : null}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
