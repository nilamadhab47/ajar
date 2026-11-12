"use client";

import { useEffect, useState } from "react";
import type { CharacterName } from "../config";
import { OfficeCrop, PixelLantern, Sprite, at } from "../components/Pixel";
import { Reveal } from "../components/Reveal";

type Door = "open" | "ask" | "closed";
const TEAM: { name: string; city: string; zone: string; who: CharacterName }[] = [
  { name: "Dev", city: "San Francisco", zone: "America/Los_Angeles", who: "developer" },
  { name: "Lena", city: "Berlin", zone: "Europe/Berlin", who: "office_lady" },
  { name: "Arjun", city: "Bengaluru", zone: "Asia/Kolkata", who: "office_worker" },
  { name: "Yui", city: "Tokyo", zone: "Asia/Tokyo", who: "receptionist" },
];

interface Local { time: string; hour: number; door: Door; here: boolean; note: string; sky: string; lamp: boolean }

/** What a desk looks like at a given local hour. Illustrative office hours: 9 to 6. */
function localState(zone: string, now: Date): Local {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  const time = `${String(hour).padStart(2, "0")}:${minute}`;
  const here = hour >= 9 && hour < 18;
  const door: Door = !here ? "closed" : hour < 13 ? "open" : "ask";
  const note = here ? (door === "open" ? "Door ajar" : "Ask first") : hour >= 18 && hour < 23 ? "Signed off · leave a note" : hour < 7 ? "Asleep · leave a note" : "Starting soon";
  // Sky tint laid over the desk: night indigo, dawn peach, clear day, dusk amber.
  const sky =
    hour < 5 || hour >= 22 ? "rgb(12 8 48 / 0.72)"
    : hour < 8 ? "rgb(255 170 120 / 0.22)"
    : hour < 17 ? "rgb(255 244 214 / 0.14)"
    : hour < 20 ? "rgb(240 130 70 / 0.26)"
    : "rgb(24 14 70 / 0.55)";
  return { time, hour, door, here, note, sky, lamp: hour < 7 || hour >= 18 };
}

/** 06 — Different clocks, one room. Four desks in the same office, each lit by its own real local time. */
export function Clocks() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 20_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  const states = now ? TEAM.map((t) => localState(t.zone, now)) : null;
  const present = states?.filter((s) => s.here).length ?? 0;

  return (
    <section id="clocks" className="bg-aubergine py-[clamp(4.5rem,10vw,9rem)] text-ivory" aria-labelledby="clocks-title">
      <div className="mx-auto w-full max-w-[1320px] px-5 sm:px-8">
        <div className="grid items-end gap-6 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <Reveal>
            <p className="eyebrow text-lamp">Across time zones</p>
            <h2 id="clocks-title" className="display h-section mt-4">
              Different clocks. <em>One shared space.</em>
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="lede text-ivory/75">
              Four desks in the same room, each lit by the hour its owner is living in. The clocks below are real. A
              lantern tells you who you can knock on now, and who will find your note in the morning.
            </p>
          </Reveal>
        </div>

        <Reveal className="mt-12" delay={120}>
          <ul className="clock-room grid grid-cols-2 overflow-hidden rounded-[28px] ring-1 ring-ivory/10 lg:grid-cols-4">
            {TEAM.map((t, i) => {
              const s = states?.[i];
              return (
                <li key={t.city} className="relative">
                  <div className="scene !rounded-none">
                    <OfficeCrop x={416} y={170} w={128} h={156}>
                      {s?.here && <Sprite who={t.who} row="idle_up" x={471} y={287}><PixelLantern door={s.door} /></Sprite>}
                      {s?.lamp && <span className="scene-glow !opacity-100" style={at(480, 238)} />}
                    </OfficeCrop>
                    <div className="scene-sky !opacity-100 transition-colors duration-1000" style={{ background: s?.sky ?? "transparent" }} />
                  </div>
                  <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-aubergine/90 to-transparent p-3 pb-8 sm:p-4 sm:pb-10">
                    <p className="pixel-label text-[10px] text-ivory sm:text-[13px]" suppressHydrationWarning>{s?.time ?? "--:--"}</p>
                    <p className="mt-1.5 text-[0.8rem] font-semibold text-ivory/90 sm:text-[0.9rem]">{t.city}</p>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-aubergine/95 to-transparent p-3 pt-8 sm:p-4 sm:pt-10">
                    <p className="text-[0.92rem] font-semibold">{t.name}</p>
                    <p className="text-[0.78rem] text-ivory/70 sm:text-[0.84rem]">{s?.note ?? " "}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Reveal>

        <Reveal className="mt-6 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2" delay={160}>
          <p className="font-display text-[1.35rem] leading-snug tracking-[-0.01em] sm:text-[1.6rem]" aria-live="polite">
            {states
              ? present === 0
                ? "Nobody is at their desk right now. Every note left tonight is read by morning."
                : `Right now, ${present} of ${TEAM.length} ${present === 1 ? "is" : "are"} at their desk${present === 1 ? "" : "s"}. ${present === TEAM.length ? "A rare full house." : "The rest will find your note when they arrive."}`
              : " "}
          </p>
          <p className="text-[0.84rem] text-ivory/55">An illustrative team. Real clocks, read from your browser.</p>
        </Reveal>
      </div>
    </section>
  );
}
