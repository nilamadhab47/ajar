"use client";

import { Bell, Building2, Check, ChevronDown, CircleHelp, Hash, MapPin, Menu as MenuIcon, Settings, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AvatarImage } from "@/components/common/AvatarImage";
import { SearchInput } from "@/components/common/SearchInput";
import { StatusDot } from "@/components/common/StatusIndicator";
import { IconButton } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { useChatStore } from "@/features/chat/chat-store";
import { useLocalUser, usePeopleStore } from "@/features/people/people-store";
import { StatusMenuItems } from "@/features/presence/components/StatusMenu";
import { sendWorldCommand } from "@/features/world/world-bridge";
import { useWorldStore } from "@/features/world/world-store";
import { walkToMyDesk } from "@/hooks/useOfficeBootstrap";
import { useAccessToken } from "@/features/auth/session";
import { BRAND } from "@/lib/config";
import { env } from "@/lib/env";
import { apiRequest } from "@/services/api/api-client";
import { useAppStore } from "@/stores/app-store";
import { useUiStore } from "@/stores/ui-store";
import { NAV_ITEMS } from "./NavigationRail";

export function Logo() {
  return (
    <span className="relative inline-flex size-7 items-center justify-center rounded-md bg-accent" aria-hidden>
      <span className="absolute bottom-0 h-4 w-3 rounded-t-full bg-white" />
      <span className="absolute bottom-0 h-2 w-1.5 bg-coral" />
    </span>
  );
}

interface Result {
  key: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
  run: () => void;
}

function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const users = usePeopleStore((s) => s.users);
  const rooms = useWorldStore((s) => s.rooms);
  const channels = useChatStore((s) => s.channels);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const ui = useUiStore.getState();
    return [
      ...Object.values(users).filter((u) => u.displayName.toLowerCase().includes(q)).slice(0, 5).map((u) => ({
        key: u.id, icon: <AvatarImage avatar={u.avatar} size={20} />, label: u.displayName, hint: "Locate",
        run: () => { sendWorldCommand({ type: "locate-user", userId: u.id }); ui.selectUser(u.id); },
      })),
      ...rooms.filter((r) => r.name.toLowerCase().includes(q)).slice(0, 4).map((r) => ({
        key: r.id, icon: <MapPin className="size-4 text-muted" />, label: r.name, hint: "Walk there",
        run: () => sendWorldCommand({ type: "walk-to-room", roomId: r.id }),
      })),
      ...channels.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 3).map((c) => ({
        key: c.id, icon: <Hash className="size-4 text-muted" />, label: c.kind === "channel" ? `#${c.name}` : c.name, hint: "Open chat",
        run: () => { useChatStore.getState().setActive(c.id); ui.openSidebar("chat"); },
      })),
    ];
  }, [query, users, rooms, channels]);

  const choose = (r: Result) => {
    r.run();
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative w-full max-w-sm" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <SearchInput
        label="Search people, rooms and channels" value={query} onChange={(v) => { setQuery(v); setOpen(true); }}
        onFocus={() => setOpen(true)} role="combobox" aria-expanded={open && results.length > 0} aria-controls="global-search-results"
        onKeyDown={(e) => { if (e.key === "Enter" && results[0]) choose(results[0]); }}
      />
      {open && query.trim() && (
        <ul id="global-search-results" role="listbox" className="absolute inset-x-0 top-10 z-50 max-h-80 overflow-y-auto rounded-lg border border-line bg-panel p-1 shadow-float">
          {results.length === 0 && <li className="px-2 py-3 text-center text-xs text-muted">Nothing matches “{query.trim()}”.</li>}
          {results.map((r) => (
            <li key={r.key} role="option" aria-selected={false}>
              <button type="button" onClick={() => choose(r)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-hover">
                {r.icon}
                <span className="min-w-0 flex-1 truncate">{r.label}</span>
                <span className="text-[11px] text-muted">{r.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type OfficeChoice = { id: string; officeName: string; organizationName: string };

export function TopNavigation() {
  const router = useRouter();
  const workspace = useAppStore((s) => s.workspace);
  const floorId = useWorldStore((s) => s.floorId);
  const me = useLocalUser();
  const signedIn = useAccessToken();
  const [offices, setOffices] = useState<OfficeChoice[]>([]);
  useEffect(() => {
    if (!env.apiBaseUrl || !signedIn) return;
    void apiRequest<{ offices: OfficeChoice[] }>("/workspaces")
      .then((result) => setOffices(result.offices))
      .catch(() => setOffices([]));
  }, [signedIn]);
  const unread = useUiStore((s) => s.activity.length);
  const ui = useUiStore.getState;
  const floor = workspace?.floors.find((f) => f.id === floorId);

  return (
    <header className="z-40 flex h-12 shrink-0 items-center gap-2 border-b border-line bg-panel px-2 sm:gap-3 sm:px-3">
      <div className="sm:hidden">
        <Menu>
          <MenuTrigger asChild>
            <IconButton label="Navigation" side="bottom"><MenuIcon className="size-4" /></IconButton>
          </MenuTrigger>
          <MenuContent>
            {NAV_ITEMS.map((item) => (
              <MenuItem key={item.id} onSelect={item.run}><item.icon className="size-4 text-muted" />{item.label}</MenuItem>
            ))}
          </MenuContent>
        </Menu>
      </div>
      <Logo />
      <Menu>
        <MenuTrigger asChild>
          <button className="flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-left hover:bg-hover" aria-label="Switch workspace">
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold leading-tight">{workspace?.name ?? BRAND.product}</span>
              <span className="hidden truncate text-[11px] leading-tight text-muted sm:block">
                {workspace?.officeName}{floor ? ` · ${floor.name}` : ""}
              </span>
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-muted" />
          </button>
        </MenuTrigger>
        <MenuContent>
          <MenuLabel>Offices</MenuLabel>
          {env.apiBaseUrl && signedIn ? offices.map((office) => (
            <MenuItem key={office.id} onSelect={() => router.push(`/workspace/${office.id}/office`)}>
              <Building2 className="size-4 text-muted" />
              <span className="min-w-0 flex-1 truncate">{office.officeName}</span>
              {office.id === workspace?.id && <Check className="ml-auto size-3.5 text-accent" />}
            </MenuItem>
          )) : (
            <MenuItem><Building2 className="size-4 text-muted" />{workspace?.name}<Check className="ml-auto size-3.5 text-accent" /></MenuItem>
          )}
          <MenuSeparator />
          {env.apiBaseUrl ? (
            <MenuItem onSelect={() => router.push(signedIn ? "/offices" : "/login")}>{signedIn ? "All offices" : "Sign in"}</MenuItem>
          ) : (
            <MenuItem disabled hint="Running on this computer">Add another office</MenuItem>
          )}
        </MenuContent>
      </Menu>

      <div className="hidden flex-1 justify-center md:flex"><GlobalSearch /></div>
      <div className="flex-1 md:hidden" />

      <IconButton label="Notifications" hint={unread ? `${unread} recent` : undefined} side="bottom" onClick={() => ui().toggleSidebar("activity")}>
        <Bell className="size-4" />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-coral" />}
      </IconButton>
      <IconButton label="Help and controls" side="bottom" className="hidden sm:inline-flex" onClick={() => ui().openDialog({ type: "help" })}>
        <CircleHelp className="size-4" />
      </IconButton>
      <IconButton label="Settings" side="bottom" className="hidden sm:inline-flex" onClick={() => ui().openDialog({ type: "settings" })}>
        <Settings className="size-4" />
      </IconButton>
      <Menu>
        <MenuTrigger asChild>
          <button className="relative rounded-md p-0.5 hover:bg-hover" aria-label={`Profile menu for ${me.displayName}`}>
            <AvatarImage avatar={me.avatar} size={30} />
            <StatusDot status={me.status} className="absolute -bottom-0.5 -right-0.5 ring-2 ring-panel" />
          </button>
        </MenuTrigger>
        <MenuContent align="end" className="w-64">
          <div className="px-2 py-1.5">
            <p className="truncate text-[13px] font-semibold">{me.displayName}</p>
            <p className="truncate text-xs text-muted">{me.title || "No title set"}</p>
          </div>
          <MenuSeparator />
          <MenuItem onSelect={() => ui().selectUser(me.id)}><UserRound className="size-4 text-muted" />View profile</MenuItem>
          <MenuItem onSelect={() => ui().openDialog({ type: "avatar" })}>Customise avatar</MenuItem>
          <MenuItem onSelect={walkToMyDesk} hint="G">Walk to my desk</MenuItem>
          <MenuSeparator />
          <StatusMenuItems />
        </MenuContent>
      </Menu>
    </header>
  );
}
