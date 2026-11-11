"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useConversationStore } from "@/features/conversation/conversation-store";
import { getMediaAdapter } from "@/features/media/media-controller";
import { useMeetingStore } from "@/features/meetings/meeting-store";
import { useWorldStore } from "@/features/world/world-store";
import { WORLD_CONFIG } from "@/lib/config";
import { clearAppStorage } from "@/lib/storage";
import { env } from "@/lib/env";
import { DEFAULT_BINDINGS, SHORTCUT_LABELS, keyLabel, type ShortcutAction } from "@/lib/shortcuts";
import { cn } from "@/lib/utils";
import { MockRealtimeAdapter } from "@/services/realtime/mock-realtime-adapter";
import { getRealtime } from "@/services/realtime/realtime-client";
import { useUiStore } from "@/stores/ui-store";

const ACTIONS = Object.keys(DEFAULT_BINDINGS) as ShortcutAction[];
const close = () => useUiStore.getState().closeDialog();

function Keys({ codes }: { codes: string[] }) {
  return (
    <span className="flex gap-1">
      {Array.from(new Set(codes.map(keyLabel))).map((k) => (
        <kbd key={k} className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-b-2 border-ink/20 bg-app px-1.5 font-sans text-[11px] font-semibold">{k}</kbd>
      ))}
    </span>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-1.5 hover:bg-hover">
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className={cn("relative h-5 w-9 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2", checked ? "bg-accent" : "bg-ink/20")}>
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </span>
    </label>
  );
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => <h3 className="mb-1 mt-4 text-[11px] font-medium uppercase tracking-wide text-muted first:mt-0">{children}</h3>;

export function SettingsDialog() {
  const overrides = useUiStore((s) => s.keyOverrides);
  const showMinimap = useUiStore((s) => s.showMinimap);
  const editMode = useWorldStore((s) => s.editMode);
  const [capturing, setCapturing] = useState<ShortcutAction | null>(null);
  const ui = useUiStore.getState;
  const bindings = { ...DEFAULT_BINDINGS, ...(overrides as Partial<Record<ShortcutAction, string[]>>) };

  const rebind = (action: ShortcutAction, code: string) => {
    const next: Record<string, string[]> = { ...overrides };
    // A key can only drive one action: remove it from wherever it was.
    for (const other of ACTIONS) {
      if (other !== action && bindings[other].includes(code)) next[other] = bindings[other].filter((c) => c !== code);
    }
    next[action] = [code];
    ui().set({ keyOverrides: next });
  };

  return (
    <Dialog open onClose={close} title="Settings" description="Preferences are saved in this browser.">
      <div className="p-5">
        <SectionTitle>Interface</SectionTitle>
        <Toggle label="Mini-map" hint="Show the floor overview in the corner of the map." checked={showMinimap} onChange={(v) => ui().set({ showMinimap: v })} />
        <Toggle label="Map edit mode" hint="Developer tool: select, move, remove and add objects." checked={editMode} onChange={(v) => { useWorldStore.getState().set({ editMode: v, selectedObject: null }); if (v) close(); }} />

        <SectionTitle>Keyboard shortcuts</SectionTitle>
        <ul>
          {ACTIONS.map((action) => (
            <li key={action} className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-hover">
              <span className="min-w-0 flex-1 text-[13px]">{SHORTCUT_LABELS[action]}</span>
              {capturing === action ? (
                <button
                  type="button" autoFocus onBlur={() => setCapturing(null)}
                  onKeyDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.code !== "Escape") rebind(action, e.code);
                    setCapturing(null);
                  }}
                  className="h-6 rounded border border-accent bg-accent-soft px-2 text-[11px] font-medium text-accent"
                >
                  Press a key… (Esc cancels)
                </button>
              ) : (
                <button type="button" aria-label={`Change shortcut for ${SHORTCUT_LABELS[action]}`} disabled={action === "escape"} onClick={() => setCapturing(action)} className="rounded p-0.5 hover:bg-line disabled:hover:bg-transparent">
                  {bindings[action].length ? <Keys codes={bindings[action]} /> : <span className="px-1 text-[11px] text-muted">Unassigned</span>}
                </button>
              )}
            </li>
          ))}
        </ul>
        <Button size="sm" className="mt-2" disabled={!Object.keys(overrides).length} onClick={() => ui().set({ keyOverrides: {} })}>Restore default shortcuts</Button>

        <SectionTitle>Integration</SectionTitle>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md bg-app p-3 text-xs">
          <dt className="text-muted">Realtime mode</dt><dd className="font-mono">{env.realtimeMode}</dd>
          <dt className="text-muted">API base URL</dt><dd className="truncate font-mono">{env.apiBaseUrl || "not set"}</dd>
          <dt className="text-muted">WebSocket URL</dt><dd className="truncate font-mono">{env.wsUrl || "not set"}</dd>
          <dt className="text-muted">Proximity</dt><dd>discover at {WORLD_CONFIG.proximity.discoveryTiles} tiles · close at {WORLD_CONFIG.proximity.closeTiles}</dd>
        </dl>

        {getRealtime() instanceof MockRealtimeAdapter && (
          <Button size="sm" className="mt-2" onClick={() => { (getRealtime() as MockRealtimeAdapter).simulateDrop(); close(); }}>Simulate a network drop</Button>
        )}

        <SectionTitle>Demo data</SectionTitle>
        <p className="mb-2 text-xs text-muted">Clears your saved avatar, profile, desk and preferences, then reloads.</p>
        <Button variant="danger" size="sm" onClick={() => {
          clearAppStorage();
          window.location.reload();
        }}>Reset demo data</Button>
      </div>
    </Dialog>
  );
}

export function HelpDialog() {
  const overrides = useUiStore((s) => s.keyOverrides);
  const bindings = { ...DEFAULT_BINDINGS, ...(overrides as Partial<Record<ShortcutAction, string[]>>) };
  const mouse: [string, string][] = [
    ["Double-click the floor", "Walk there (finds a path around furniture)"], ["Drag the map", "Pan the camera"], ["Scroll", "Zoom in and out"],
    ["Click a character", "Open their profile"], ["Click the mini-map", "Jump the camera to that spot"],
  ];
  return (
    <Dialog open onClose={close} title="Help and controls" description="Everything you can do in the office.">
      <div className="p-5">
        <SectionTitle>Keyboard</SectionTitle>
        <ul className="grid gap-x-6 sm:grid-cols-2">
          {ACTIONS.map((a) => (
            <li key={a} className="flex items-center justify-between gap-2 py-1 text-[13px]">
              <span>{SHORTCUT_LABELS[a]}</span>
              <Keys codes={bindings[a]} />
            </li>
          ))}
        </ul>
        <SectionTitle>Mouse and touch</SectionTitle>
        <ul>
          {mouse.map(([k, v]) => (
            <li key={k} className="flex justify-between gap-4 py-1 text-[13px]"><span className="font-medium">{k}</span><span className="text-right text-muted">{v}</span></li>
          ))}
        </ul>
        <SectionTitle>Knocking</SectionTitle>
        <p className="text-[13px] text-muted">
          Walk up to someone: they appear in the Nearby card within {WORLD_CONFIG.proximity.discoveryTiles} tiles. A gold lamp on their name means the door is ajar, a half lamp means ask first, and an unlit lamp means the door is closed.
          Knock when the door is ajar or ask first. A closed door only takes a note. Focus and Do not disturb close the door. A knock never turns the microphone on.
          In demo mode the other person is simulated, and no audio or video leaves your browser.
        </p>
      </div>
    </Dialog>
  );
}

export function LeaveDialog({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  return (
    <Dialog open onClose={close} title="Leave the office?" description="Your avatar disappears from the map. You can come back any time." className="w-[min(92vw,400px)]">
      <div className="flex justify-end gap-2 p-5">
        <Button onClick={close}>Stay</Button>
        <Button variant="danger" onClick={() => {
          useMeetingStore.getState().leave();
          useConversationStore.getState().leave();
          const media = getMediaAdapter();
          void media.setMicrophone(false);
          void media.setCamera(false);
          void media.setScreenShare(false);
          close();
          router.push(`/workspace/${encodeURIComponent(workspaceId)}`);
        }}>Leave office</Button>
      </div>
    </Dialog>
  );
}
