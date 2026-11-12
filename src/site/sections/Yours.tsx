"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { OfficeCrop } from "../components/Pixel";
import { Reveal } from "../components/Reveal";
import { useInView } from "../lib/hooks";

const AvatarShuffle = dynamic(() => import("../components/AvatarShuffle"), {
  ssr: false,
  loading: () => <div className="avatar-badge" aria-hidden="true" />,
});

const PLACES = [
  { title: "A desk that's yours", body: "Claim it, decorate it, sit at it. People know where to find you, and where to leave a note.", crop: { x: 440, y: 400, w: 150, h: 130 } },
  { title: "Rooms with doors", body: "Step into a meeting room and you're together. Step out and the conversation stays behind.", crop: { x: 716, y: 96, w: 190, h: 165 } },
  { title: "Somewhere quiet", body: "A focus room, a closed door, a lantern switched off. Being around doesn't mean being available.", crop: { x: 110, y: 78, w: 180, h: 156 } },
];

const AUDIENCES = [
  { who: "Remote teams", line: "The hallway you never had." },
  { who: "Teams across time zones", line: "An office that still works while you sleep." },
  { who: "Hybrid teams", line: "Home days and office days, one place to be around." },
  { who: "Several offices", line: "One front door for all of them." },
];

/** 07 + 08 — Personal spaces, then who it's for (a short list, not four cards). */
export function Yours() {
  // The avatar compositor is app code; it loads only when this section is about to be seen.
  const badgeRef = useRef<HTMLDivElement>(null);
  const near = useInView(badgeRef, { margin: "600px", once: true });
  return (
    <section id="yours" className="bg-ivory pb-[clamp(4.5rem,10vw,9rem)] pt-[clamp(1rem,3vw,3rem)] text-night" aria-labelledby="yours-title">
      <div className="mx-auto w-full max-w-[1320px] px-5 sm:px-8">
        <div className="grid items-center gap-12 border-t border-night/20 pt-[clamp(3.5rem,8vw,7rem)] lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <Reveal>
            <p className="eyebrow text-[#6c63c7]">Personal spaces</p>
            <h2 id="yours-title" className="display on-light h-section mt-4">
              Make the space <em>feel like yours.</em>
            </h2>
            <p className="lede mt-6 max-w-[34rem] text-night/70">
              An office is the people in it and the corners they make their own. Build a character that looks like
              you on a good day, pick a desk, and choose how open your door is.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div ref={badgeRef} className="flex min-h-[420px] flex-col items-center">{near && <AvatarShuffle />}</div>
          </Reveal>
        </div>

        <ul className="mt-16 grid gap-x-8 gap-y-12 md:grid-cols-3">
          {PLACES.map((p, i) => (
            <Reveal as="li" key={p.title} delay={i * 100}>
              <OfficeCrop {...p.crop} className="rounded-[22px] ring-1 ring-night/10" />
              <p className="mt-5 font-display text-[1.5rem] leading-tight tracking-[-0.01em]">{p.title}</p>
              <p className="mt-1.5 text-[1rem] text-night/65">{p.body}</p>
            </Reveal>
          ))}
        </ul>

        <Reveal className="mt-[clamp(4rem,9vw,8rem)]">
          <h2 className="eyebrow text-evening">Who it&apos;s for</h2>
          <dl className="mt-5 border-t border-night/20">
            {AUDIENCES.map((a) => (
              <div key={a.who} className="grid gap-x-10 gap-y-1 border-b border-night/20 py-5 md:grid-cols-[minmax(0,22rem)_1fr] md:items-baseline">
                <dt className="font-display text-[clamp(1.5rem,1.1rem+1.4vw,2.25rem)] leading-tight tracking-[-0.015em]">{a.who}</dt>
                <dd className="text-[1.08rem] text-night/65">{a.line}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
