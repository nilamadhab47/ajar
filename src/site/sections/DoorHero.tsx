"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BRAND } from "@/lib/config";
import { OfficeLayer, PixelLantern, Sprite } from "../components/Pixel";
import { SITE } from "../config";
import { track } from "../lib/analytics";
import { playSound } from "../lib/sound";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** CSS variables the timeline owns. Cleared before every re-measure so the stylesheet's first-paint values apply. */
const VARS = ["--px", "--py", "--pw", "--ph", "--door", "--glow", "--spill", "--oz", "--ox", "--oy", "--decor", "--life"];
/** Office pixel that sits behind the doorway before you walk in: the lamp-lit desks. */
const FOCUS = { x: 512, y: 250 };
const OFFICE_ZOOM = 1.22;

/**
 * 01 — The open door. One sticky stage; scroll position drives a single 0→1 value, and everything
 * (door angle, the hole in the wall, lamp light, the office behind) is derived from it, so scrolling
 * back reverses it exactly. No video: these are live layers.
 */
export function DoorHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const insideRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const stage = stageRef.current!;
      const copy = copyRef.current!;
      const inside = insideRef.current!;
      const cue = cueRef.current!;
      const state = { p: 0 };
      let rect = { x: 0, y: 0, w: 1, h: 1 };
      let shift = { x: 0, y: 0 };
      let vw = 1;
      let vh = 1;
      let opened = false;
      let reported = false;

      const render = () => {
        const p = state.p;
        const swing = easeInOut(seg(p, 0, 0.4));
        const zoom = seg(p, 0.3, 0.86);
        const grow = Math.pow(zoom, 2.4);
        const settle = easeOut(zoom);
        // The hole in the wall grows around a centre that drifts to the middle of the screen.
        const cover = Math.max(vw / rect.w, vh / rect.h) * 1.14;
        const scale = 1 + (cover - 1) * grow;
        const cx = rect.x + rect.w / 2 + (vw / 2 - (rect.x + rect.w / 2)) * grow;
        const cy = rect.y + rect.h / 2 + (vh / 2 - (rect.y + rect.h / 2)) * grow;
        const w = rect.w * scale;
        const h = rect.h * scale;
        const s = stage.style;
        s.setProperty("--pw", `${w}px`);
        s.setProperty("--ph", `${h}px`);
        s.setProperty("--px", `${cx - w / 2}px`);
        s.setProperty("--py", `${cy - h / 2}px`);
        s.setProperty("--door", `${17 + 83 * swing}deg`);
        s.setProperty("--glow", `${1 - seg(p, 0.04, 0.46)}`);
        s.setProperty("--spill", `${(0.55 + 0.45 * seg(p, 0, 0.3)) * (1 - seg(p, 0.42, 0.66))}`);
        s.setProperty("--decor", `${1 - seg(p, 0.3, 0.5)}`);
        s.setProperty("--oz", `${OFFICE_ZOOM - (OFFICE_ZOOM - 1) * settle}`);
        s.setProperty("--ox", `${shift.x * (1 - settle)}px`);
        s.setProperty("--oy", `${shift.y * (1 - settle)}px`);
        s.setProperty("--life", `${seg(p, 0.45, 0.7)}`);

        const out = seg(p, 0.05, 0.24);
        copy.style.opacity = `${1 - out}`;
        copy.style.transform = `translate3d(0, ${-28 * out}px, 0)`;
        copy.style.visibility = out >= 1 ? "hidden" : "visible";
        cue.style.opacity = `${1 - seg(p, 0.02, 0.1)}`;
        const arrived = seg(p, 0.86, 0.96);
        inside.style.opacity = `${arrived}`;
        inside.style.transform = `translate3d(0, ${16 * (1 - arrived)}px, 0)`;
        inside.style.visibility = arrived > 0 ? "visible" : "hidden";

        if (p > 0.18 && !opened) {
          opened = true;
          playSound("door-open");
        } else if (p < 0.1 && opened) {
          opened = false;
          playSound("door-close");
        }
        if (p > 0.9 && !reported) {
          reported = true;
          track("hero_door_opened");
        }
      };

      const measure = () => {
        VARS.forEach((v) => stage.style.removeProperty(v));
        const bounds = stage.getBoundingClientRect();
        const portal = stage.querySelector(".portal")!.getBoundingClientRect();
        vw = bounds.width;
        vh = bounds.height;
        rect = { x: portal.left - bounds.left, y: portal.top - bounds.top, w: portal.width, h: portal.height };
        // Where FOCUS lands with the office centred and zoomed, then the nudge that puts it in the doorway.
        const layerW = Math.max(vw, vh * (1024 / 672));
        const k = layerW / 1024;
        const fx = vw / 2 + (FOCUS.x - 512) * k * OFFICE_ZOOM;
        const fy = vh / 2 + (FOCUS.y - 336) * k * OFFICE_ZOOM;
        shift = { x: rect.x + rect.w / 2 - fx, y: rect.y + rect.h / 2 - fy };
        render();
      };

      measure();
      ScrollTrigger.addEventListener("refreshInit", measure);
      const tween = gsap.to(state, {
        p: 1,
        ease: "none",
        onUpdate: render,
        scrollTrigger: { trigger: sectionRef.current, start: "top top", end: "bottom bottom", scrub: 0.5 },
      });

      return () => {
        ScrollTrigger.removeEventListener("refreshInit", measure);
        tween.scrollTrigger?.kill();
        tween.kill();
        VARS.forEach((v) => stage.style.removeProperty(v));
        for (const el of [copy, inside, cue]) el.removeAttribute("style");
      };
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={sectionRef} id="top" className="door-hero" aria-labelledby="hero-title">
      <div ref={stageRef} className="door-stage">
        <OfficeLayer className="door-office" eager hiRes>
          <Sprite who="office_lady" row="idle_right" x={418} y={258}><PixelLantern door="open" /></Sprite>
          <Sprite who="manager" row="idle_down" x={246} y={196}><PixelLantern door="closed" /></Sprite>
          <Sprite who="receptionist" row="idle_down" x={172} y={350}><PixelLantern door="open" /></Sprite>
          <Sprite who="office_worker" row="walk_down" x={610} y={316} className="walker-a"><PixelLantern door="ask" /></Sprite>
          <Sprite who="developer" row="walk_left" x={604} y={352} className="walker-b" />
        </OfficeLayer>

        <div className="wall wall-top" />
        <div className="wall wall-left" />
        <div className="wall wall-right" />
        <div className="wall wall-floor" />
        <div className="door-spill" />

        <svg className="door-sconce" viewBox="0 0 40 70" aria-hidden="true">
          <circle cx="20" cy="40" r="19" fill="#f4c36b" opacity="0.14" />
          <path d="M20 4 v12" stroke="#4a3b6b" strokeWidth="3" strokeLinecap="round" />
          <path d="M11 18 h18 l-2 6 h-14 z" fill="#4a3b6b" />
          <path d="M12 24 h16 l3 26 h-22 z" fill="#f4c36b" />
          <path d="M12 24 h16 l3 26 h-22 z" fill="none" stroke="#4a3b6b" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M20 24 v26" stroke="#4a3b6b" strokeWidth="2" />
          <path d="M8 50 h24 l-3 6 h-18 z" fill="#4a3b6b" />
        </svg>
        <svg className="door-plant" viewBox="0 0 60 80" aria-hidden="true">
          <path d="M30 52 C18 40 8 34 4 20 C16 22 26 32 30 46 Z" fill="#7fae86" />
          <path d="M30 52 C30 34 34 18 46 6 C52 20 44 38 32 50 Z" fill="#9cc4a0" />
          <path d="M30 54 C40 44 50 42 58 34 C56 46 44 54 32 56 Z" fill="#6a9a74" />
          <path d="M16 54 h28 l-4 24 h-20 z" fill="#c9785c" />
          <path d="M14 52 h32 v6 h-32 z" fill="#dd8c6e" />
        </svg>

        <div className="portal">
          <div className="portal-haze" />
          <div className="door-leaf"><span className="door-knob" /></div>
        </div>

        <div className="hero-copy">
         <div ref={copyRef}>
          <p className="eyebrow text-lamp">{BRAND.descriptor}</p>
          <h1 id="hero-title" className="display h-hero mt-5">
            Your team has a place <em>here.</em>
          </h1>
          <p className="lede mt-6 max-w-[34rem] text-ivory/80">
            Wherever they work. Whenever they connect.{" "}
            <span className="hero-more">
              See who&apos;s around, knock before you talk, and leave a note when your clocks don&apos;t match.
            </span>
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
            <Link href={SITE.demoPath} className="btn btn-lamp" onClick={() => track("cta_click", { cta: "walk_into_ajar", place: "hero" })}>
              Walk into Ajar <span className="arrow" aria-hidden="true">→</span>
            </Link>
            <a href="#apart" className="btn btn-ghost" onClick={() => track("cta_click", { cta: "see_how", place: "hero" })}>
              See how Ajar works
            </a>
          </div>
         </div>
        </div>

        <div ref={insideRef} className="hero-inside">
          <p className="eyebrow text-lamp">You&apos;re in</p>
          <p className="display mt-2 text-[1.9rem] leading-[1.05]">
            <em>{BRAND.tagline}</em>
          </p>
          <p className="mt-2 text-[0.95rem] text-ivory/75">
            This is the office. Keep scrolling, or walk around it yourself a little further down.
          </p>
        </div>

        <div ref={cueRef} className="scroll-cue" aria-hidden="true">
          <span className="eyebrow">Scroll to open the door</span>
          <i />
        </div>
      </div>
    </section>
  );
}
