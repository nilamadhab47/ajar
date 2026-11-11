"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, MessageSquare, Sparkles, Users, X, type LucideIcon } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { ActivityPanel } from "@/features/activity/components/ActivityPanel";
import { ChatPanel } from "@/features/chat/components/ChatPanel";
import { totalUnread, useChatStore } from "@/features/chat/chat-store";
import { MeetingsPanel } from "@/features/meetings/components/MeetingsPanel";
import { PeoplePanel } from "@/features/people/components/PeoplePanel";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { useUiStore, type SidebarTab } from "@/stores/ui-store";

const TABS: { id: SidebarTab; label: string; icon: LucideIcon }[] = [
  { id: "people", label: "People", icon: Users },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "meetings", label: "Meetings", icon: CalendarDays },
  { id: "activity", label: "Activity", icon: Sparkles },
];
const WIDTH = 372;

/**
 * Toggleable drawer. Beside the world on wide screens, a slide-over on narrow
 * ones. The Phaser canvas simply resizes; world state is untouched.
 */
export function RightSidebar() {
  const tab = useUiStore((s) => s.sidebar);
  const unread = useChatStore((s) => totalUnread(s.unread));
  const overlay = !useMediaQuery("(min-width: 1100px)");
  const ui = useUiStore.getState;

  return (
    <AnimatePresence initial={false}>
      {tab && (
        <motion.aside
          key="sidebar"
          aria-label="Side panel"
          initial={overlay ? { x: WIDTH } : { width: 0 }}
          animate={overlay ? { x: 0 } : { width: WIDTH }}
          exit={overlay ? { x: WIDTH } : { width: 0 }}
          transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
          className={cn("z-30 shrink-0 overflow-hidden border-l border-line bg-panel", overlay && "absolute inset-y-0 right-0 shadow-float")}
          style={overlay ? { width: `min(${WIDTH}px, 100%)` } : undefined}
        >
          <div className="flex h-full flex-col" style={{ width: overlay ? "100%" : WIDTH }}>
            <div role="tablist" aria-label="Side panel sections" className="flex items-center gap-0.5 border-b border-line px-2 py-1.5">
              {TABS.map((t) => (
                <button
                  key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => ui().openSidebar(t.id)}
                  className={cn(
                    "relative flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium transition-colors",
                    tab === t.id ? "bg-accent-soft text-accent" : "text-muted hover:bg-hover hover:text-ink",
                  )}
                >
                  <t.icon className="size-3.5" aria-hidden />
                  {t.label}
                  {t.id === "chat" && unread > 0 && <span className="ml-0.5 rounded-full bg-coral px-1.5 text-[10px] font-semibold leading-4 text-white">{unread}</span>}
                </button>
              ))}
              <IconButton label="Close panel" hint="Esc" side="bottom" className="ml-auto size-8" onClick={() => ui().closeSidebar()}>
                <X className="size-4" />
              </IconButton>
            </div>
            <div role="tabpanel" className="min-h-0 flex-1">
              {tab === "people" && <PeoplePanel />}
              {tab === "chat" && <ChatPanel />}
              {tab === "meetings" && <MeetingsPanel />}
              {tab === "activity" && <ActivityPanel />}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
