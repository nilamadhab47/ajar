import { Reveal } from "../components/Reveal";
import { MiniOffice } from "../game/MiniOffice";

/** 03 — The living world: a real, playable scene, with the knock and the desk note in it. */
export function LivingWorld() {
  return (
    <section id="world" className="relative bg-aubergine py-[clamp(4.5rem,10vw,9rem)] text-ivory" aria-labelledby="world-title">
      <div className="mx-auto w-full max-w-[1320px] px-5 sm:px-8">
        <div className="grid items-end gap-6 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
          <Reveal>
            <p className="eyebrow text-lamp">The living world</p>
            <h2 id="world-title" className="display h-section mt-4">
              Don&apos;t take our word for it. <em>Walk around.</em>
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="lede text-ivory/75">
              This is a small Ajar office, running in your browser right now. The people in it are simulated and
              labelled Demo. Walk up to someone and knock. Find the empty desk and leave a note for the morning.
            </p>
          </Reveal>
        </div>
        <Reveal className="mt-10" delay={160}>
          <MiniOffice />
        </Reveal>
      </div>
    </section>
  );
}
