"use client";

import Link from "next/link";
import { OfficeCrop, PixelLantern, Sprite } from "../components/Pixel";
import { Logo } from "../components/Logo";
import { Reveal } from "../components/Reveal";
import { NAV_LINKS, SITE } from "../config";
import { track } from "../lib/analytics";

/** 09 — The final invitation: the same door, now fully open. 10 — a small editorial footer. */
export function Invitation() {
  return (
    <>
      <section id="invitation" className="invite relative overflow-hidden bg-aubergine pb-[clamp(4rem,9vw,8rem)] pt-[clamp(5rem,11vw,10rem)] text-ivory" aria-labelledby="invite-title">
        <div className="mx-auto grid w-full max-w-[1320px] items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <p className="eyebrow text-lamp">The door is open</p>
            <h2 id="invite-title" className="display h-hero mt-5">
              Your team&apos;s place <em>is waiting.</em>
            </h2>
            <p className="lede mt-6 max-w-[32rem] text-ivory/75">
              Walk in, look around, knock on a door. It takes less time than scheduling a call about it.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href={SITE.demoPath} className="invite-cta btn btn-lamp" onClick={() => track("cta_click", { cta: "walk_into_ajar", place: "invitation" })}>
                Walk into Ajar <span className="arrow" aria-hidden="true">→</span>
              </Link>
              {SITE.earlyAccessUrl && (
                <a href={SITE.earlyAccessUrl} className="btn btn-ghost" onClick={() => track("cta_click", { cta: "early_access", place: "invitation" })}>
                  Request early access
                </a>
              )}
            </div>
            <p className="mt-8 max-w-[34rem] text-[0.88rem] text-ivory/55">
              Ajar is in early development. Shared offices with real people and real audio are being built now.
            </p>
          </Reveal>

          <Reveal delay={140} className="flex justify-center lg:justify-end">
            <div className="invite-door" aria-hidden="true">
              <div className="invite-view">
                <OfficeCrop x={96} y={300} w={170} h={326}>
                  <Sprite who="receptionist" row="idle_down" x={172} y={350}><PixelLantern door="open" /></Sprite>
                  <Sprite who="developer" row="idle_up" x={196} y={470} />
                </OfficeCrop>
              </div>
              <div className="invite-leaf"><span className="door-knob" /></div>
              <div className="invite-spill" />
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="relative bg-aubergine text-ivory">
        <div className="footer-walk" aria-hidden="true">
          <div className="px-actor walker-foot" style={{ "--c": 8, "--row": 6 } as React.CSSProperties} data-walking="">
            <div className="px-sprite" />
          </div>
        </div>
        <div className="mx-auto grid w-full max-w-[1320px] gap-10 border-t border-ivory/15 px-5 pb-10 pt-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1.2fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-[22rem] font-display text-[1.35rem] leading-snug tracking-[-0.01em] text-ivory/90">
              A quiet office for remote teams. <em className="text-lamp">Be around, on your terms.</em>
            </p>
          </div>
          <nav aria-label="Footer">
            <h2 className="eyebrow text-ivory/50">Product</h2>
            <ul className="mt-4 space-y-2.5 text-[0.98rem]">
              {NAV_LINKS.map((l) => (
                <li key={l.href}><a href={l.href} className="text-ivory/80 underline-offset-4 hover:text-ivory hover:underline">{l.label}</a></li>
              ))}
              <li><Link href={SITE.demoPath} className="text-ivory/80 underline-offset-4 hover:text-ivory hover:underline">Sign in</Link></li>
              {SITE.social.map((s) => (
                <li key={s.href}><a href={s.href} rel="me noopener" className="text-ivory/80 underline-offset-4 hover:text-ivory hover:underline">{s.label}</a></li>
              ))}
            </ul>
          </nav>
          <div>
            <h2 className="eyebrow text-ivory/50">Credits</h2>
            <p className="mt-4 text-[0.92rem] leading-relaxed text-ivory/65">
              Office pixel art on this page: Office Pixel Art by Imersa Studios, colour-graded for Ajar. Type:
              Fraunces, DM Sans and Press Start 2P.
            </p>
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-[1320px] flex-wrap justify-between gap-x-8 gap-y-2 px-5 pb-8 text-[0.84rem] text-ivory/45 sm:px-8">
          <p>© 2026 Ajar</p>
          <p>Privacy policy and terms will be published before sign-ups open.</p>
        </div>
      </footer>
    </>
  );
}
