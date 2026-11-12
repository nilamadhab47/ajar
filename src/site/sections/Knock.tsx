"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { OfficeCrop, PixelLantern, Sprite, at } from "../components/Pixel";
import { Reveal } from "../components/Reveal";
import { pose, px, useScene } from "../lib/scene";
import { playSound } from "../lib/sound";

const STEPS = [
  { title: "You see someone", body: "Maya's lantern is lit. Her door is ajar." },
  { title: "You knock", body: "One click. No microphone, no camera, nothing connects." },
  { title: "They decide", body: "Accept, not right now, or reply later. Any answer is fine." },
  { title: "Then you talk", body: "Only after a yes. Walk away and it ends by itself." },
];

const DOORS = [
  { door: "open", name: "Open", body: "Happy to be approached. A knock is accepted straight away." },
  { door: "ask", name: "Ask first", body: "Send a knock. They decide when, or whether." },
  { door: "closed", name: "Closed", body: "Deep in something. Leave a note; it will be waiting." },
] as const;

/** 04 — Knock, don't ambush. A scripted loop of the consent flow, plus the three door states. */
export function Knock() {
  const [step, setStep] = useState(0);
  // Sounds accompany the first run only; a loop that knocks forever would be the opposite of quiet.
  const heard = useRef(false);
  const { ref, still } = useScene((tl, q) => {
    const visitor = q(".k-visitor")[0];
    const host = q(".k-host")[0];
    tl.call(() => { setStep(0); pose(visitor, "walk_right"); pose(host, "idle_down"); })
      .set(visitor, { left: px(338) })
      .set(q(".scene-chip, .k-ring"), { autoAlpha: 0 })
      .to(visitor, { left: px(388), duration: 1.5, ease: "none" })
      .call(() => pose(visitor, "idle_right"))
      .to(q(".k-prompt"), { autoAlpha: 1, y: 0, duration: 0.35 }, "+=0.2")
      .call(() => setStep(1), [], "+=1.3")
      .to(q(".k-prompt b"), { scale: 0.92, duration: 0.12, yoyo: true, repeat: 1 })
      .call(() => { if (!heard.current) playSound("knock"); })
      .fromTo(q(".k-ring"), { autoAlpha: 1, scale: 0.3 }, { autoAlpha: 0, scale: 2.4, duration: 0.6, stagger: 0.2 })
      .to(q(".k-prompt"), { autoAlpha: 0, duration: 0.25 }, "<")
      .call(() => { setStep(2); pose(host, "idle_left"); })
      .to(q(".k-wait"), { autoAlpha: 1, duration: 0.25 })
      .to(q(".k-wait"), { autoAlpha: 0, duration: 0.25 }, "+=1.2")
      .call(() => { setStep(3); if (!heard.current) playSound("welcome-chime"); heard.current = true; })
      .to(q(".k-yes"), { autoAlpha: 1, duration: 0.3 })
      .to(q(".k-line-1"), { autoAlpha: 1, duration: 0.3 }, "+=1")
      .to(q(".k-yes"), { autoAlpha: 0, duration: 0.3 }, "<")
      .to(q(".k-line-2"), { autoAlpha: 1, duration: 0.3 }, "+=1.2")
      .to(q(".scene-chip"), { autoAlpha: 0, duration: 0.4 }, "+=2.2");
  });
  const active = still ? 3 : step;

  return (
    <section id="knock" className="bg-mist py-[clamp(4.5rem,10vw,9rem)] text-night" aria-labelledby="knock-title">
      <div className="mx-auto grid w-full max-w-[1320px] items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_1.08fr] lg:gap-20">
        <div>
          <Reveal>
            <p className="eyebrow text-[#6c63c7]">Knock, don&apos;t ambush</p>
            <h2 id="knock-title" className="display on-light h-section mt-4">
              A conversation starts <em>with a knock.</em>
            </h2>
            <p className="lede mt-6 max-w-[34rem] text-night/75">
              In most virtual offices, walking near someone <i>is</i> the conversation. In Ajar it is only an opening.
              You knock. They decide. Nothing connects until they say yes.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <dl className="mt-9 grid gap-x-8 gap-y-2 border-y border-night/15 py-5 text-[0.98rem] sm:grid-cols-[auto_1fr]">
              <dt className="font-semibold text-evening">Elsewhere</dt>
              <dd>See someone nearby <span aria-hidden="true">→</span> you&apos;re talking.</dd>
              <dt className="font-semibold text-[#6c63c7]">In Ajar</dt>
              <dd>See someone nearby <span aria-hidden="true">→</span> knock <span aria-hidden="true">→</span> they decide.</dd>
            </dl>
          </Reveal>

          <Reveal delay={200}>
            <h3 className="eyebrow mt-10 text-evening">Three ways to leave your door</h3>
            <ul className="mt-4 space-y-3.5">
              {DOORS.map((d) => (
                <li key={d.door} className="flex items-start gap-3.5">
                  <span className="mini-lantern mt-0.5" data-door={d.door} aria-hidden="true"><span /></span>
                  <p className="text-[1rem] leading-snug">
                    <strong className="font-semibold">{d.name}.</strong> <span className="text-night/70">{d.body}</span>
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-5 max-w-[34rem] text-[0.92rem] text-evening">
              Your door is separate from your status. You can be available and still not want to be interrupted.
            </p>
          </Reveal>
        </div>

        <Reveal delay={100}>
          <div ref={ref} className="scene" data-static={still ? "" : undefined}>
            <OfficeCrop x={318} y={158} w={300} h={210} label="A character walks up to a colleague whose lantern is lit, knocks, and is invited in.">
              <Sprite who="office_lady" row="idle_down" x={428} y={262} className="k-host"><PixelLantern door="open" /><span className="px-tag">Maya</span></Sprite>
              <Sprite who="developer" row="idle_right" x={388} y={300} className="k-visitor"><span className="px-tag">You</span></Sprite>
              <span className="k-ring scene-ring" style={at(428, 240)} />
              <span className="k-ring scene-ring" style={at(428, 240)} />
              <span className="scene-chip k-prompt" style={at(396, 352)}>Maya&apos;s door is ajar <b>Knock</b></span>
              <span className="scene-chip k-wait" style={at(428, 214)}>…</span>
              <span className="scene-chip k-yes scene-chip-lamp" style={at(428, 214)}>Come on in.</span>
              <span className="scene-chip k-line-1 scene-chip-you" style={at(392, 352)}>Two minutes on the launch list?</span>
              <span className="scene-chip k-line-2" style={at(440, 214)}>Sure. Pull up a chair.</span>
            </OfficeCrop>
          </div>
          <ol className="mt-5 grid gap-x-5 gap-y-4 sm:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className={cn("border-t-2 pt-3 transition-colors duration-500", i <= active ? "border-[#6c63c7]" : "border-night/15")}>
                <p className={cn("text-[0.95rem] font-semibold transition-colors duration-500", i === active ? "text-night" : "text-night/55")}>
                  <span className="mr-1.5 tabular-nums text-[#6c63c7]">{i + 1}</span>{s.title}
                </p>
                <p className={cn("mt-1 text-[0.86rem] leading-snug transition-colors duration-500", i === active ? "text-night/75" : "text-night/45")}>{s.body}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
