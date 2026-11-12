"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { OfficeCrop, PixelLantern, Sprite, at } from "../components/Pixel";
import { Reveal } from "../components/Reveal";
import { pose, px, py, useScene } from "../lib/scene";
import { playSound } from "../lib/sound";

const BEATS = [
  { time: "18:40 in Bengaluru", title: "You leave it on their desk", body: "A sticky note, a link, a question. Not another ping in a channel." },
  { time: "02:10 in Berlin", title: "The clocks turn", body: "They're asleep. You've logged off. The note waits where they'll look." },
  { time: "09:02 in Berlin", title: "They find it in the morning", body: "And answer in their own time. Nobody had to be online together." },
];

/** 05 — Desk drops. A scripted evening → night → morning loop around one desk. */
export function DeskDrops() {
  const [beat, setBeat] = useState(0);
  const heard = useRef(false);
  const { ref, still } = useScene((tl, q) => {
    const sender = q(".d-sender")[0];
    const reader = q(".d-reader")[0];
    tl.call(() => { setBeat(0); pose(sender, "walk_up"); pose(reader, "walk_right"); })
      .set(sender, { left: px(428), top: py(600), autoAlpha: 1 })
      .set(reader, { left: px(372), top: py(540), autoAlpha: 0 })
      .set(q(".d-note"), { autoAlpha: 0, y: -14, scale: 1 })
      .set(q(".scene-chip, .d-card, .d-lamp"), { autoAlpha: 0 })
      .set(q(".d-night"), { opacity: 0 })
      .set(q(".d-morning"), { opacity: 0 })
      // evening: walk up, leave the note, walk off
      .to(sender, { top: py(524), duration: 1.5, ease: "none" })
      .call(() => pose(sender, "idle_right"))
      .to(q(".d-typed"), { autoAlpha: 1, duration: 0.3 }, "+=0.2")
      .call(() => { if (!heard.current) playSound("note-place"); }, [], "+=1.5")
      .to(q(".d-note"), { autoAlpha: 1, y: 0, duration: 0.35, ease: "back.out(2.5)" })
      .to(q(".d-typed"), { autoAlpha: 0, duration: 0.3 }, "+=0.3")
      .call(() => pose(sender, "walk_down"))
      .to(sender, { top: py(610), duration: 1.4, ease: "none" })
      .set(sender, { autoAlpha: 0 })
      // night
      .call(() => setBeat(1))
      .to(q(".d-night"), { opacity: 0.7, duration: 1.3, ease: "sine.inOut" })
      .to(q(".d-lamp"), { autoAlpha: 1, duration: 0.6 }, "<0.4")
      .to(q(".d-note"), { scale: 1.25, duration: 0.5, yoyo: true, repeat: 3, ease: "sine.inOut" }, "<")
      // morning
      .call(() => setBeat(2))
      .to(q(".d-night"), { opacity: 0, duration: 1.3, ease: "sine.inOut" })
      .to(q(".d-lamp"), { autoAlpha: 0, duration: 0.6 }, "<")
      .to(q(".d-morning"), { opacity: 1, duration: 1.3 }, "<")
      .set(reader, { autoAlpha: 1 })
      .to(reader, { left: px(428), top: py(524), duration: 1.5, ease: "none" })
      .call(() => { pose(reader, "idle_right"); if (!heard.current) playSound("welcome-chime"); heard.current = true; })
      .to(q(".d-note"), { autoAlpha: 0, y: -10, duration: 0.3 })
      .to(q(".d-card"), { autoAlpha: 1, duration: 0.4 }, "<")
      .to(q(".d-reply"), { autoAlpha: 1, duration: 0.3 }, "+=1.6")
      .to(q(".d-card, .d-reply"), { autoAlpha: 0, duration: 0.4 }, "+=3")
      .to(q(".d-morning"), { opacity: 0, duration: 0.8 }, "<");
  });
  const active = still ? 2 : beat;

  return (
    <section id="desk-drops" className="bg-ivory py-[clamp(4.5rem,10vw,9rem)] text-night" aria-labelledby="drops-title">
      <div className="mx-auto w-full max-w-[1320px] px-5 sm:px-8">
        <Reveal className="max-w-[52rem]">
          <p className="eyebrow text-[#6c63c7]">Desk drops</p>
          <h2 id="drops-title" className="display on-light h-section mt-4">
            Good conversations don&apos;t always happen <em>at the same time.</em>
          </h2>
        </Reveal>

        <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
          <Reveal>
            <div ref={ref} className="scene" data-static={still ? "" : undefined}>
              <OfficeCrop x={346} y={410} w={300} h={205} label="Someone leaves a sticky note on an empty desk in the evening. Night passes. In the morning a colleague arrives and reads it.">
                <span className="d-lamp scene-glow" style={at(520, 452)} />
                <span className="d-note scene-note" style={at(466, 492)} />
                <Sprite who="developer" row="idle_right" x={428} y={524} className="d-sender"><span className="px-tag">You</span></Sprite>
                <Sprite who="receptionist" row="idle_right" x={428} y={524} className="d-reader"><PixelLantern door="open" /><span className="px-tag">Hana</span></Sprite>
                <span className="scene-chip scene-chip-note d-typed" style={at(452, 478)}>Auth flow is ready for review. No rush.</span>
                <span className="scene-chip scene-chip-note d-card" style={at(470, 484)}>“Auth flow is ready for review. No rush.”</span>
                <span className="scene-chip d-reply" style={at(446, 452)}>Reviewed. Two small comments. Thanks!</span>
              </OfficeCrop>
              <div className="d-night scene-sky" />
              <div className="d-morning scene-sky scene-sky-morning" />
              <p className="scene-clock pixel-label" aria-hidden="true">{BEATS[active].time.toUpperCase()}</p>
            </div>
            <p className="mt-3 text-[0.86rem] text-evening">
              A scripted illustration. You can leave a real note on Hana&apos;s desk in the office above.
            </p>
          </Reveal>

          <ol className="space-y-7">
            {BEATS.map((b, i) => (
              <Reveal as="li" key={b.title} delay={i * 110} className={cn("border-l-2 pl-5 transition-colors duration-700", i === active ? "border-[#f4c36b]" : "border-night/15")}>
                <p className="eyebrow text-evening">{b.time}</p>
                <p className={cn("mt-1.5 font-display text-[1.55rem] leading-tight tracking-[-0.01em] transition-colors duration-700", i === active ? "text-night" : "text-night/50")}>{b.title}</p>
                <p className={cn("mt-1.5 max-w-[30rem] text-[1rem] transition-colors duration-700", i === active ? "text-night/75" : "text-night/45")}>{b.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
