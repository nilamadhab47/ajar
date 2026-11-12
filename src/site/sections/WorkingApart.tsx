import { Reveal } from "../components/Reveal";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
/** [day, startRow, rows, tone] — a week with no room left in it. */
const BLOCKS: [number, number, number, 0 | 1 | 2][] = [
  [0, 0, 2, 0], [0, 3, 1, 1], [0, 5, 2, 0], [1, 1, 2, 2], [1, 4, 3, 0], [2, 0, 1, 1], [2, 2, 3, 0], [2, 6, 1, 2],
  [3, 0, 3, 0], [3, 4, 1, 1], [3, 5, 2, 2], [4, 1, 1, 0], [4, 3, 2, 1], [4, 6, 1, 0],
];
const TONES = ["#6c63c7", "#a9a2e3", "#292630"];

function Calendar() {
  return (
    <svg viewBox="0 0 420 230" className="apart-art" role="img" aria-label="A working week filled edge to edge with meetings.">
      {DAYS.map((d, i) => (
        <text key={d} x={28 + i * 80 + 34} y="18" textAnchor="middle" className="apart-tick">{d}</text>
      ))}
      {Array.from({ length: 8 }, (_, r) => <line key={r} x1="22" x2="418" y1={30 + r * 25} y2={30 + r * 25} stroke="#292630" strokeOpacity="0.1" />)}
      {BLOCKS.map(([day, row, rows, tone], i) => (
        <rect
          key={i} className="apart-pop" style={{ animationDelay: `${i * 70}ms` }}
          x={28 + day * 80} y={32 + row * 25} width="68" height={rows * 25 - 4} rx="6" fill={TONES[tone]}
        />
      ))}
      <g className="apart-pop" style={{ animationDelay: "1150ms" }}>
        <rect x="268" y="182" width="68" height="21" rx="6" fill="none" stroke="#f4c36b" strokeWidth="2" strokeDasharray="5 4" />
        <text x="302" y="197" textAnchor="middle" className="apart-tick" fill="#b9862f">quick q?</text>
      </g>
    </svg>
  );
}

function Dots() {
  const people = ["Priya", "Jonas", "Mei", "Tunde"];
  return (
    <svg viewBox="0 0 300 230" className="apart-art" role="img" aria-label="Four colleagues, each marked active with a green dot, and no way to tell who can be interrupted.">
      {people.map((name, i) => (
        <g key={name} transform={`translate(18 ${20 + i * 50})`}>
          <rect width="264" height="40" rx="12" fill="#fff" stroke="#292630" strokeOpacity="0.12" />
          <circle cx="24" cy="20" r="11" fill={["#e9e4f5", "#c7d8c0", "#f4d9a5", "#d8d2ee"][i]} />
          <text x="46" y="25" className="apart-name">{name}</text>
          <circle cx="216" cy="20" r="5" fill="#21c879" className="apart-blink" style={{ animationDelay: `${i * 400}ms` }} />
          <text x="226" y="24" className="apart-tick">Active</text>
        </g>
      ))}
    </svg>
  );
}

function TwoClocks() {
  const clock = (cx: number, hour: number, minute: number, label: string, dark: boolean) => {
    const h = ((hour % 12) + minute / 60) * 30;
    const m = minute * 6;
    return (
      <g transform={`translate(${cx} 96)`}>
        <circle r="60" fill={dark ? "#292630" : "#fff"} stroke="#292630" strokeWidth="2" />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} y1="-52" y2="-46" stroke={dark ? "#f7f3ec" : "#292630"} strokeOpacity="0.5" strokeWidth="2" transform={`rotate(${i * 30})`} />
        ))}
        <line y2="-30" stroke={dark ? "#f4c36b" : "#292630"} strokeWidth="4" strokeLinecap="round" transform={`rotate(${h})`} />
        <line y2="-44" stroke={dark ? "#f4c36b" : "#6c63c7"} strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${m})`} />
        <circle r="3.5" fill={dark ? "#f4c36b" : "#292630"} />
        <text y="88" textAnchor="middle" className="apart-name">{label}</text>
      </g>
    );
  };
  return (
    <svg viewBox="0 0 320 210" className="apart-art" role="img" aria-label="Two clocks nine and a half hours apart: mid-morning in Austin, nearly midnight in Bengaluru.">
      {clock(84, 10, 10, "Austin 10:10", false)}
      {clock(236, 23, 40, "Bengaluru 23:40", true)}
      <path d="M150 96 H170" stroke="#292630" strokeWidth="2" strokeDasharray="3 5" />
    </svg>
  );
}

function Unsent() {
  return (
    <div className="apart-art flex min-h-[150px] flex-col justify-center gap-3" role="img" aria-label="A message typed, then deleted, and never sent.">
      <div className="flex h-14 items-center rounded-2xl border border-night/15 bg-white px-5 text-[1.05rem]">
        <span className="apart-typed">hey, got a minute for a quick question</span>
        <span className="apart-caret" />
      </div>
      <p className="pl-1 text-[0.92rem] italic text-evening">…never mind, I&apos;ll figure it out.</p>
    </div>
  );
}

const ITEMS = [
  { title: "A meeting for everything", body: "Because there is no lighter way to ask.", art: <Calendar />, span: "lg:col-span-7" },
  { title: "Green dots that say nothing", body: "Online is not the same as approachable.", art: <Dots />, span: "lg:col-span-5" },
  { title: "Clocks that never line up", body: "By the time you're free, they've gone to bed.", art: <TwoClocks />, span: "lg:col-span-5" },
  { title: "The question you didn't ask", body: "The small ones are the first to disappear.", art: <Unsent />, span: "lg:col-span-7" },
];

/** 02 — Working apart. Flat and editorial on purpose: this is the world outside the door. */
export function WorkingApart() {
  return (
    <section id="apart" className="bg-ivory py-[clamp(4.5rem,10vw,9rem)] text-night" aria-labelledby="apart-title">
      <div className="mx-auto w-full max-w-[1320px] px-5 sm:px-8">
        <Reveal className="max-w-[58rem]">
          <p className="eyebrow text-[#6c63c7]">The problem</p>
          <h2 id="apart-title" className="display on-light h-section mt-4">
            Working apart shouldn&apos;t mean <em>feeling apart.</em>
          </h2>
          <p className="lede mt-6 max-w-[40rem] text-night/70">
            Remote work kept the meetings and lost the hallway. What went missing wasn&apos;t the office. It was the
            feeling that someone is around, and an easy way to say hello.
          </p>
        </Reveal>

        <ol className="mt-14 grid gap-x-10 gap-y-12 lg:grid-cols-12">
          {ITEMS.map((item, i) => (
            <Reveal as="li" key={item.title} delay={i * 90} className={item.span}>
              <figure className="border-t border-night/20 pt-5">
                {item.art}
                <figcaption className="mt-5 flex items-baseline gap-4">
                  <span className="eyebrow tabular-nums text-evening">0{i + 1}</span>
                  <span>
                    <span className="block font-display text-[1.5rem] leading-tight tracking-[-0.01em]">{item.title}</span>
                    <span className="mt-1 block text-[1rem] text-night/65">{item.body}</span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </ol>

        <Reveal className="mt-16 border-t border-night/20 pt-8">
          <p className="display on-light max-w-[46rem] text-[clamp(1.7rem,1.1rem+2vw,2.75rem)] leading-[1.08]">
            Ajar gives the hallway back, <em>without the ambush.</em>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
