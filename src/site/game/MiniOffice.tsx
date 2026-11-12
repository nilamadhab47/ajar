"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { SITE } from "../config";
import { track } from "../lib/analytics";
import { useInView } from "../lib/hooks";
import { playSound, setAmbience } from "../lib/sound";
import { ROOMS, type Door, type MiniConversation, type MiniEvent, type MiniOfficeApi, type MiniPrompt } from "./mini-types";

const KEY_DIR: Record<string, [number, number]> = {
  ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
};
const PHASE_LABEL = { dusk: "Dusk", night: "Night", morning: "Morning" } as const;

function LanternIcon({ door }: { door: Door }) {
  return (
    <span className="mini-lantern" data-door={door} aria-hidden="true">
      <span />
    </span>
  );
}

/**
 * React host for the playable office. React owns the HTML around the canvas (prompt, note form,
 * conversation, controls); Phaser owns the world. The game instance stays in a ref, never in state.
 * Keys only reach the office while it has focus, and Esc lets go, so the page never traps scrolling.
 */
export function MiniOffice() {
  const stageRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<MiniOfficeApi | null>(null);
  const keys = useRef(new Set<string>());
  const near = useInView(stageRef, { margin: "500px", once: true });
  const visible = useInView(stageRef);
  const coarse = useMediaQuery("(pointer: coarse)");

  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [prompt, setPrompt] = useState<MiniPrompt | null>(null);
  const [conversation, setConversation] = useState<MiniConversation | null>(null);
  const [shownLines, setShownLines] = useState(0);
  const [noteFor, setNoteFor] = useState<{ targetId: string; name: string; hint: string } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [placed, setPlaced] = useState<{ name: string; canFastForward: boolean } | null>(null);
  const [read, setRead] = useState<{ name: string; text: string; reply: string } | null>(null);
  const [phase, setPhase] = useState<keyof typeof PHASE_LABEL>("dusk");
  const [toast, setToast] = useState<{ title: string; body?: string } | null>(null);
  const [room, setRoom] = useState<(typeof ROOMS)[number] | null>(null);

  const onEvent = useCallback((event: MiniEvent) => {
    switch (event.type) {
      case "ready": setReady(true); break;
      case "moved": track("office_started"); break;
      case "prompt": setPrompt(event.prompt); break;
      case "conversation":
        setConversation(event.conversation);
        setShownLines(event.conversation ? 1 : 0);
        if (!event.conversation && event.reason === "walked") setToast({ title: "You walked away", body: "The conversation closed by itself. No goodbye needed." });
        break;
      case "note-request": setNoteText(""); setNoteFor(event); break;
      case "note-placed":
        setPlaced({ name: event.name, canFastForward: event.canFastForward });
        if (!event.canFastForward) setToast({ title: `Note left for ${event.name}`, body: "It will be waiting when she looks up." });
        track("office_note", { to: event.name });
        break;
      case "note-read": setPlaced(null); setRead(event); break;
      case "time": setPhase(event.phase); break;
      case "toast": setToast(event); break;
      case "sfx": playSound(event.name); break;
    }
  }, []);

  // Boot once the section is near the viewport. Phaser stays out of the first page load.
  useEffect(() => {
    if (!near || !hostRef.current) return;
    const host = hostRef.current;
    let cancelled = false;
    void (async () => {
      const style = getComputedStyle(host.closest(".site-root") ?? document.body);
      const uiFont = `${style.getPropertyValue("--font-dm-sans").trim() || "system-ui"}, system-ui, sans-serif`;
      const pixel = style.getPropertyValue("--font-press").trim();
      const pixelFont = `${pixel || "monospace"}, monospace`;
      await Promise.allSettled([document.fonts.load(`8px ${pixelFont}`), document.fonts.load(`600 11px ${uiFont}`)]);
      const { createMiniOffice } = await import("./mini-office");
      if (cancelled) return;
      apiRef.current = createMiniOffice(host, { uiFont, pixelFont, onEvent });
    })();
    return () => {
      cancelled = true;
      apiRef.current?.destroy();
      apiRef.current = null;
    };
  }, [near, onEvent]);

  useEffect(() => {
    apiRef.current?.setPaused(!visible);
    setAmbience(visible ? (phase === "night" ? "night-ambience" : "office-ambience") : null);
    return () => setAmbience(null);
  }, [visible, phase, ready]);

  useEffect(() => {
    if (!conversation || shownLines >= conversation.lines.length) return;
    const timer = setTimeout(() => setShownLines((n) => n + 1), 1700);
    return () => clearTimeout(timer);
  }, [conversation, shownLines]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(timer);
  }, [toast]);

  const pushInput = () => {
    let x = 0;
    let y = 0;
    keys.current.forEach((code) => {
      x += KEY_DIR[code][0];
      y += KEY_DIR[code][1];
    });
    apiRef.current?.setInput(Math.sign(x), Math.sign(y));
  };
  const releaseKeys = () => {
    keys.current.clear();
    apiRef.current?.setInput(0, 0);
  };

  const act = () => {
    if (!prompt || prompt.pending) return;
    if (prompt.kind === "knock") track("office_knock", { door: prompt.door });
    apiRef.current?.act();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") {
      if (e.key === "Escape") setNoteFor(null);
      return;
    }
    if (e.key === "Escape") {
      releaseKeys();
      stageRef.current?.blur();
      return;
    }
    if (e.code in KEY_DIR) {
      e.preventDefault();
      keys.current.add(e.code);
      pushInput();
      if (!started) setStarted(true);
      return;
    }
    if ((e.code === "KeyE" || (e.key === "Enter" && target === stageRef.current)) && !noteFor) {
      e.preventDefault();
      act();
    }
  };
  const onKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (keys.current.delete(e.code)) pushInput();
  };

  const begin = () => {
    setStarted(true);
    stageRef.current?.focus({ preventScroll: true });
  };

  const submitNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteFor || !noteText.trim()) return;
    apiRef.current?.leaveNote(noteFor.targetId, noteText);
    setNoteFor(null);
    stageRef.current?.focus({ preventScroll: true });
  };

  const reset = () => {
    apiRef.current?.reset();
    setConversation(null);
    setNoteFor(null);
    setPlaced(null);
    setRead(null);
    setRoom(null);
    track("office_reset");
  };

  const pad = (dx: number, dy: number, label: string, Icon: typeof ArrowUp, place: string) => (
    <button
      type="button" aria-label={label}
      className={cn("absolute flex size-11 items-center justify-center rounded-xl bg-aubergine/80 text-ivory ring-1 ring-ivory/15 active:bg-lamp active:text-aubergine", place)}
      onPointerDown={(e) => { e.preventDefault(); setStarted(true); apiRef.current?.setInput(dx, dy); }}
      onPointerUp={() => apiRef.current?.setInput(0, 0)}
      onPointerLeave={() => apiRef.current?.setInput(0, 0)}
      onPointerCancel={() => apiRef.current?.setInput(0, 0)}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );

  return (
    <div>
      <div
        ref={stageRef}
        tabIndex={0}
        role="application"
        aria-label="Playable Ajar office. Arrow keys or W A S D walk, E knocks or leaves a note, Escape releases the keyboard."
        aria-describedby="mini-office-help"
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) releaseKeys(); }}
        className="mini-stage group relative overflow-hidden rounded-[28px] bg-[#1a1226] outline-none ring-1 ring-ivory/10 focus-visible:ring-2 focus-visible:ring-lamp"
      >
        <div ref={hostRef} className="world-canvas absolute inset-0" onPointerDown={() => { if (!started) setStarted(true); }} />

        <p id="mini-office-help" className="sr-only">
          A small office seen from above: a reception, a block of desks, a meeting room called Atlas, a kitchen and a
          focus room with its door closed. Three simulated teammates are here. Maya&apos;s door is ajar, Tomás asks for a
          knock first, Zainab&apos;s door is closed. Hana&apos;s desk is empty because it is night where she lives. Every
          action is also available from the buttons in and below this area.
        </p>

        {/* status */}
        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2 sm:inset-x-4 sm:top-4">
          <span className="rounded-full bg-aubergine/85 px-3 py-1.5 text-[0.72rem] font-semibold text-ivory/85 ring-1 ring-ivory/10">
            Preview<span className="hidden sm:inline"> · simulated teammates · no audio or video</span><span className="sm:hidden"> · simulated</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="rounded-full bg-aubergine/85 px-3 py-1.5 text-[0.72rem] font-semibold text-lamp ring-1 ring-ivory/10" aria-live="polite">
              {PHASE_LABEL[phase]}
            </span>
            <button
              type="button" onClick={reset} disabled={!ready}
              className="pointer-events-auto flex h-8 items-center gap-1.5 rounded-full bg-aubergine/85 px-3 text-[0.72rem] font-semibold text-ivory ring-1 ring-ivory/10 hover:bg-aubergine disabled:opacity-50"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" /> <span className="max-sm:sr-only">Start over</span>
            </button>
          </span>
        </div>

        {/* loading */}
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-ivory/70">
            <span className="pixel-label">{near ? "OPENING THE OFFICE…" : ""}</span>
          </div>
        )}

        {/* first-run invitation */}
        {ready && !started && (
          <div className="absolute inset-0 flex items-center justify-center bg-aubergine/45 p-4 backdrop-blur-[2px]">
            <div className="max-w-sm rounded-3xl bg-ivory p-6 text-center text-night shadow-2xl">
              <p className="display on-light text-[1.9rem]">Come in. <em>Have a walk.</em></p>
              <p className="mt-3 text-[0.95rem] text-evening">
                {coarse ? "Tap a spot to walk there, or use the arrows." : "Arrow keys or WASD to walk. Click a spot to walk there."} Walk up to
                someone and their lantern tells you how to say hello.
              </p>
              <button type="button" className="btn btn-lamp mt-5" onClick={begin}>Step inside</button>
            </div>
          </div>
        )}

        {/* toast */}
        <div className="pointer-events-none absolute inset-x-0 top-16 flex justify-center px-4" role="status" aria-live="polite">
          {toast && (
            <div className="rounded-2xl bg-ivory px-4 py-2.5 text-center text-[0.9rem] text-night shadow-xl">
              <strong className="font-semibold">{toast.title}</strong>
              {toast.body && <span className="text-evening"> · {toast.body}</span>}
            </div>
          )}
        </div>

        {/* bottom cards: one at a time */}
        <div className="absolute inset-x-3 bottom-3 flex justify-center sm:inset-x-4 sm:bottom-4">
          {noteFor ? (
            <form onSubmit={submitNote} className="w-full max-w-md rounded-3xl bg-ivory p-4 text-night shadow-2xl">
              <label htmlFor="mini-note" className="block text-[0.95rem] font-semibold">A note for {noteFor.name}</label>
              <p className="text-[0.82rem] text-evening">{noteFor.hint}</p>
              <textarea
                id="mini-note" autoFocus maxLength={140} rows={2} value={noteText} onChange={(e) => setNoteText(e.target.value)}
                placeholder="Auth flow is ready for review. No rush."
                className="mt-2 w-full resize-none rounded-xl border border-night/15 bg-[#fff7df] px-3 py-2 text-[0.95rem] placeholder:text-evening/70 focus:border-purple-500 focus:outline-none"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[0.78rem] tabular-nums text-evening">{noteText.trim().length}/140</span>
                <span className="flex gap-2">
                  <button type="button" className="btn btn-ink !min-h-10 !px-4 !text-[0.88rem]" onClick={() => { setNoteFor(null); stageRef.current?.focus({ preventScroll: true }); }}>Cancel</button>
                  <button type="submit" className="btn btn-lamp !min-h-10 !px-4 !text-[0.88rem]" disabled={!noteText.trim()}>Leave note</button>
                </span>
              </div>
            </form>
          ) : conversation ? (
            <div className="w-full max-w-md rounded-3xl bg-ivory p-4 text-night shadow-2xl" role="log" aria-live="polite">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[0.95rem] font-semibold">With {conversation.name} <span className="font-normal text-evening">· Demo</span></p>
                <button type="button" className="btn btn-ink !min-h-9 !px-3.5 !text-[0.82rem]" onClick={() => apiRef.current?.leaveConversation()}>Leave</button>
              </div>
              <ul className="mt-2 space-y-1.5">
                {conversation.lines.slice(0, shownLines).map((line, i) => (
                  <li key={i} className={cn("w-fit max-w-[85%] rounded-2xl px-3 py-1.5 text-[0.9rem]", line.from === "you" ? "ml-auto bg-[#6c63c7] text-white" : "bg-mist")}>
                    {line.text}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[0.78rem] text-evening">
                Text only in this preview. In Ajar, a knock never switches on a microphone or a camera. Walk away and it ends.
              </p>
            </div>
          ) : read ? (
            <div className="w-full max-w-md rounded-3xl bg-ivory p-4 text-night shadow-2xl" role="status">
              <p className="text-[0.95rem] font-semibold">{read.name} read your note at 9:02, her time.</p>
              <p className="mt-2 w-fit rotate-[-1deg] rounded-md bg-[#f4c36b] px-3 py-2 text-[0.9rem] shadow">“{read.text}”</p>
              <p className="mt-2 w-fit rounded-2xl bg-mist px-3 py-1.5 text-[0.9rem]">{read.reply}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[0.78rem] text-evening">You were both asleep at different times. Nobody had to be online.</p>
                <button type="button" className="btn btn-ink !min-h-9 !px-3.5 !text-[0.82rem]" onClick={() => setRead(null)}>Close</button>
              </div>
            </div>
          ) : placed?.canFastForward ? (
            <div className="flex w-full max-w-md flex-wrap items-center justify-between gap-3 rounded-3xl bg-ivory p-4 text-night shadow-2xl" role="status">
              <p className="text-[0.95rem]"><strong className="font-semibold">Note left on {placed.name}&apos;s desk.</strong> <span className="text-evening">She&apos;s asleep for another seven hours.</span></p>
              <button type="button" className="btn btn-lamp !min-h-10 !px-4 !text-[0.88rem]" onClick={() => { apiRef.current?.fastForward(); setPlaced(null); track("office_fast_forward"); }}>
                Skip to her morning <span className="arrow" aria-hidden="true">→</span>
              </button>
            </div>
          ) : prompt ? (
            <div className="flex w-full max-w-md items-center gap-3 rounded-3xl bg-ivory p-3 pl-4 text-night shadow-2xl" role="status" aria-live="polite">
              <LanternIcon door={prompt.door} />
              <p className="min-w-0 flex-1 text-[0.92rem] leading-snug">
                <strong className="block font-semibold">{prompt.pending ? "You knocked. They're deciding…" : prompt.title}</strong>
                <span className="text-evening">{prompt.pending ? "Nothing connects until they say yes." : prompt.detail}</span>
              </p>
              <button type="button" className="btn btn-lamp !min-h-11 !px-4 !text-[0.9rem]" onClick={act} disabled={prompt.pending}>
                {prompt.action}
                {!coarse && <kbd className="rounded bg-aubergine/15 px-1.5 text-[0.72rem] font-bold">E</kbd>}
              </button>
            </div>
          ) : null}
        </div>

        {/* touch pad */}
        {coarse && ready && started && !noteFor && !conversation && !read && !placed?.canFastForward && (
          <div className="absolute bottom-24 left-3 size-[8.6rem]">
            {pad(0, -1, "Walk up", ArrowUp, "left-[2.95rem] top-0")}
            {pad(-1, 0, "Walk left", ArrowLeft, "left-0 top-[2.95rem]")}
            {pad(1, 0, "Walk right", ArrowRight, "right-0 top-[2.95rem]")}
            {pad(0, 1, "Walk down", ArrowDown, "bottom-0 left-[2.95rem]")}
          </div>
        )}
      </div>

      {/* rooms */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="eyebrow mr-1 text-ivory/55">Walk to</span>
        {ROOMS.map((r) => (
          <button
            key={r.id} type="button" disabled={!ready}
            onClick={() => { setStarted(true); setRoom(r); apiRef.current?.walkToRoom(r.id); track("office_room", { room: r.id }); }}
            className={cn("rounded-full px-4 py-2 text-[0.9rem] font-medium ring-1 transition-colors disabled:opacity-50", room?.id === r.id ? "bg-lamp text-aubergine ring-lamp" : "text-ivory/85 ring-ivory/20 hover:bg-ivory/10")}
          >
            {r.label}
          </button>
        ))}
        <Link href={SITE.demoPath} className="ml-auto text-[0.95rem] font-semibold text-lamp underline-offset-4 hover:underline" onClick={() => track("cta_click", { cta: "full_demo", place: "world" })}>
          Open the full demo <span aria-hidden="true">→</span>
        </Link>
      </div>
      <p className="mt-3 min-h-[1.6em] text-[0.95rem] text-ivory/65" aria-live="polite">
        {room ? room.blurb : coarse ? "Tap the floor to walk. Tap a room to go there." : "Click the office, then use the arrow keys or WASD. E knocks. Esc gives the keyboard back to the page."}
      </p>
    </div>
  );
}
