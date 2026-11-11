"use client";

import { Building2, CalendarDays, MessageSquare, Settings, Sparkles, Users, type LucideIcon } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { totalUnread, useChatStore } from "@/features/chat/chat-store";
import { sendWorldCommand } from "@/features/world/world-bridge";
import { useUiStore, type SidebarTab } from "@/stores/ui-store";

interface NavItem {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  tab?: SidebarTab;
  run: () => void;
}
const ui = () => useUiStore.getState();

/** Panels open beside the world; nothing here navigates away from it. */
export const NAV_ITEMS: NavItem[] = [
  { id: "office", label: "Office", hint: "L", icon: Building2, run: () => { ui().closeSidebar(); sendWorldCommand({ type: "recenter" }); } },
  { id: "chat", label: "Chat", hint: "C", icon: MessageSquare, tab: "chat", run: () => ui().toggleSidebar("chat") },
  { id: "people", label: "People", hint: "P", icon: Users, tab: "people", run: () => ui().toggleSidebar("people") },
  { id: "calendar", label: "Calendar", icon: CalendarDays, tab: "meetings", run: () => ui().toggleSidebar("meetings") },
  { id: "activities", label: "Activities", icon: Sparkles, tab: "activity", run: () => ui().toggleSidebar("activity") },
  { id: "settings", label: "Settings", icon: Settings, run: () => ui().openDialog({ type: "settings" }) },
];

export function NavigationRail() {
  const sidebar = useUiStore((s) => s.sidebar);
  const unread = useChatStore((s) => totalUnread(s.unread));
  return (
    <nav aria-label="Primary" className="z-30 hidden w-13 shrink-0 flex-col items-center gap-1 border-r border-line bg-panel py-2 sm:flex">
      {NAV_ITEMS.map((item, i) => (
        <div key={item.id} className={i === NAV_ITEMS.length - 1 ? "mt-auto" : undefined}>
          <IconButton label={item.label} hint={item.hint} side="right" active={item.tab ? sidebar === item.tab : sidebar === null && item.id === "office"} onClick={item.run}>
            <item.icon className="size-[18px]" />
            {item.id === "chat" && unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-coral px-1 text-center text-[10px] font-semibold leading-4 text-white">{unread}</span>
            )}
          </IconButton>
        </div>
      ))}
    </nav>
  );
}
