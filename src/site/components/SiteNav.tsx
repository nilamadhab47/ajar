"use client";

import Link from "next/link";
import { Volume2, VolumeX } from "lucide-react";
import { NAV_LINKS, SITE } from "../config";
import { track } from "../lib/analytics";
import { useSound } from "../lib/sound";
import { Logo } from "./Logo";

export function SoundToggle({ className }: { className?: string }) {
  const enabled = useSound((s) => s.enabled);
  return (
    <button
      type="button"
      aria-pressed={enabled}
      aria-label={enabled ? "Turn sound off" : "Turn sound on"}
      title={enabled ? "Sound on" : "Sound off"}
      onClick={() => {
        useSound.getState().toggle();
        track("sound_toggle", { on: !enabled });
      }}
      className={className}
    >
      {enabled ? <Volume2 className="size-[18px]" aria-hidden="true" /> : <VolumeX className="size-[18px]" aria-hidden="true" />}
    </button>
  );
}

/** A floating pill, so it reads on both the dark and the ivory sections without changing colour. */
export function SiteNav() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:pt-4">
      <a href="#world" className="site-skip pointer-events-auto" onClick={() => track("hero_skip")}>
        Skip the intro and go to the office
      </a>
      <nav
        aria-label="Main"
        className="pointer-events-auto flex w-full max-w-[1120px] items-center gap-2 rounded-full bg-aubergine/80 py-2 pl-4 pr-2 text-ivory shadow-[0_8px_30px_-12px_rgb(0_0_0/0.6)] ring-1 ring-ivory/10 backdrop-blur-md"
      >
        <a href="#top" aria-label="Ajar, back to the top" className="mr-auto rounded-full pr-4">
          <Logo />
        </a>
        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="rounded-full px-3.5 py-2 text-[0.92rem] font-medium text-ivory/80 transition-colors hover:bg-ivory/10 hover:text-ivory">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <SoundToggle className="flex size-11 items-center justify-center rounded-full text-ivory/80 transition-colors hover:bg-ivory/10 hover:text-ivory" />
        <Link
          href={SITE.demoPath}
          className="btn btn-lamp !min-h-11 !px-5 !text-[0.92rem]"
          onClick={() => track("cta_click", { cta: "walk_into_ajar", place: "nav" })}
        >
          Walk into Ajar
        </Link>
      </nav>
    </header>
  );
}
