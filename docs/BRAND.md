# Ajar — Brand, Positioning and Marketing

> Decisions made on 2026-11-11. Use this when writing UI copy, marketing, docs or naming anything new.
> Product facts live in [PRODUCT_CONTEXT.md](PRODUCT_CONTEXT.md); priorities in [ROADMAP.md](ROADMAP.md).

## 1. The idea in one paragraph

Ajar is **presence without pressure**. Gather-style tools recreate the office by making proximity mean
conversation, which suits extroverts in one time zone and exhausts everyone else. What remote teams actually
miss is the ambient feeling that people are around, and the low-stakes "got a minute?". Ajar gives that back
with a door left *slightly open*: you can see who's around, knock, drop a note, or leave them alone, and it
still works when nobody overlaps in time.

## 2. Name

**Ajar** (adjective): a door that is slightly open. Approachable, not wide open.

Why it works: it states the product philosophy in one word, is short, easy to spell, and works worldwide.

Weakness and how we handle it: a single short word is easy to forget and can be misheard as "a jar".
- **Never use the name alone in marketing.** Always pair it with the descriptor or the tagline (below).
- **Say it with its meaning:** "Ajar, as in a door left ajar."
- **The logo is a door** with warm light in the gap, so the meaning is visible even if the word isn't remembered.
- Spoken intro: "Ajar, the quiet office for remote teams."

### Lockups

| Use | Text |
|---|---|
| **Descriptor** (what it is; use next to the name everywhere, including the page `<title>`, app stores, search ads) | **A quiet office for remote teams** |
| **Tagline** (how it feels; use on hero sections, social headers, the end of videos) | **Be around, on your terms.** |
| Campaign message | **"Not every hello needs a meeting."** |
| Short alternates for A/B tests | "Leave the door ajar." · "Drop by. Or don't." · "Present, not pressured." |

Code: `BRAND` in `src/lib/config.ts` (`product`, `descriptor`, `tagline`).

### Still to check before launch
Trademark (software and SaaS classes, especially US, EU and India), domain, social handles, app store names,
npm and GitHub org. Candidate domains, all unchecked: `ajar.so`, `ajar.team`, `getajar.com`, `tryajar.com`.
"Ajar" is an everyday word, so expect the short domains to be taken; the descriptor does the SEO work.

## 3. Positioning

**For** distributed teams of 10–200 (engineering and design heavy, often across time zones)
**who** want hallway moments without constant meetings or being walked up to,
**Ajar is** a quiet virtual office
**that** shows who's around, lets people knock before audio opens, and works asynchronously.
**Unlike** Gather, which makes proximity mean talking, loud by default and optimised for one time zone.

### Three promises (the product has to back each one)

| Promise | What it means in the product | Roadmap |
|---|---|---|
| **See who's around** | Calm presence, time-zone-aware desks, "open to chat" lantern | Core |
| **Knock, don't ambush** | Audio opens only after the other person accepts (open / ask / closed, per person); focus bubble | [ROADMAP §1.2](ROADMAP.md#1-signature-features-specification) |
| **Works when you don't overlap** | Desk drops (voice note or sticky on someone's desk), office hours, "while you were away" | [ROADMAP §1.3–1.7](ROADMAP.md#1-signature-features-specification) |

Supporting proof points: runs on a slow laptop and a 1 Mbps connection (lite mode), open map format
(Tiled), regional pricing including INR, privacy-first AI.

### The interaction model (the fundamental difference)

```
Traditional virtual office:  see someone nearby → start talking   (proximity = implicit invitation)
Ajar:                        see someone nearby → knock → they decide   (proximity = opportunity)
```

Two independent settings: **status** (what I'm doing: Available, Busy, Focus, …) and **door** (how I want
to be approached). Someone can be Available and still Closed to spontaneous conversation.

| Door | Meaning | Lantern |
|---|---|---|
| **Open** | Happy to be approached; a knock is accepted instantly | Warm glow |
| **Ask first** (default) | Send a request, I'll decide | Soft glow |
| **Closed** | Leave me undisturbed; leave a note instead | Unlit |

Full behaviour (knock flow, stop-bys, desk drops, office hours, focus, away digest) is specified in
[ROADMAP.md §1](ROADMAP.md#1-signature-features-specification). Five features define the product: **Knock,
Desk drops, Personal office hours, Focus bubble, While you were away.** Don't dilute them by chasing feature
parity with conventional virtual offices; compete on the quality of the experience.

## 4. Audience and buyer

- **First users:** engineers, designers and PMs on distributed teams, including quiet people who avoid
  always-on spatial tools.
- **First buyer:** a team lead, founder or engineering manager who tried Gather and found it noisy or
  expensive. Self-serve card payment.
- **Later buyer:** People Ops / IT (SSO, audit, data residency, self-host).
- **Strong early markets:** India, SEA, Europe and LatAm teams working with US colleagues (low overlap, tighter
  budgets, patchy connections).

## 5. Personality and voice

**Warm, quiet, considerate, a little handmade.** A thoughtful colleague who says hello and then lets you work.

| Do | Don't |
|---|---|
| Plain, short sentences | "Supercharge", "synergy", "revolutionise", "AI-powered" as a headline |
| "Knock", "drop by", "leave a note", "around", "lantern", "door" | "Engage", "activate", "leverage", "touchpoints" |
| Say what it does, then stop | Exclamation marks and urgency |
| Respect the reader's attention | Guilt, FOMO, "don't miss out" |

Examples
- Empty state: "Nobody's around right now. Leave a note on a desk and it'll be waiting."
- Knock: "Priya has her door ajar. Knock?"
- Declined: "Not right now. We've let them know you stopped by."
- Error: "We lost the connection. Reconnecting; your spot is saved."

## 6. Visual identity

- **Logo:** a rounded square in the product purple containing a door open a crack, warm light in the gap.
  Needs a proper vector version before launch. Today the React `Logo` and the mark on `sign_welcome`
  (`src/art/furniture.ts`) are still the old arch. The sign's word is AJAR. Draw the door before the knock clip.
- **Colours:** keep the existing UI accent purple (`#6C63C7`), add **lamp light** (`#F4C36B`) as the single
  warm accent for "open to chat", the lantern and the logo gap, over soft neutral evening tones. The warm light
  should always mean "someone is approachable". Don't use it decoratively.
- **Typography:** friendly humanist or rounded sans for UI and marketing; keep pixel type only inside the
  world (signs, labels).
- **Art:** the pixel-art world stays; commission an artist to replace the procedural starter art with a
  cohesive warm, slightly dusky style (see ASSETS.md). Marketing images should show the world with warm light in
  doorways and on desks.
- **Motion:** slow and soft (door opening, light fading in); no bouncing.
- **Sound (later):** a soft knock instead of a notification ping.
- **The lantern** is the recognisable brand element: a small glowing lamp on desks and nameplates. Its
  states are never colour-only (lit flame, half-lit with a knocker, unlit) and always have a text label.
- **Avoid:** heavy gradients, bouncing animation and arcade-style UI chrome.

## 7. Go-to-market

**Principle:** the demo is the funnel. It works with no signup and no backend, so the primary link is
"Walk into the office".

1. **Show the knock.** A 10-second clip: avatar walks to a desk, lantern lights up, "Knock?", accepted.
   This is the shareable unit. Cut it for X, LinkedIn, Product Hunt and the hero.
2. **Build in public** from the founder's account: "I built the office for people who hate being walked up
   to." Weekly clips and short posts about decisions (why audio opens only after a knock, how maps load).
3. **Designers and agencies via open maps.** Tiled import and export, "fork this office" templates, a gallery
   of community offices. Each shared office is an ad.
4. **Time-zone angle for content:** "How a team across Nagpur, Berlin and Austin shares an office with two
   hours of overlap." Real case studies once a pilot team exists.
5. **Pricing as positioning:** a generous free tier for small teams, per-seat pricing with regional rates
   (INR and others). Compare plainly with Gather's published pricing, not on competitor claims.
6. **Communities to seed:** indie hackers, remote-work newsletters, design-system and Tiled communities, India
   dev communities, engineering-manager forums. Offer free offices to a handful of remote-first teams in
   exchange for feedback and a quote.
7. **Don't compete on AI features.** Gather has notes and transcripts; say "privacy-first AI, off by default".

### 90-day launch sequence
| Weeks | Goal |
|---|---|
| 1–2 | Name checks, domain, vector logo, landing page with the live demo and the knock clip |
| 3–6 | Real multiplayer with two teams (see ROADMAP month 1–2), knock-before-audio working end to end |
| 7–10 | Free pilots with 5–10 remote teams; weekly build-in-public posts; collect quotes and clips |
| 11–13 | Product Hunt and Hacker News launch; open the template gallery |

### Success measures
Four north-star numbers, reviewed weekly: weekly active teams, accepted knocks per active user, desk drops
opened within 24 h, and week-4 team retention. Supporting measures are in
[ROADMAP.md §6](ROADMAP.md#6-success-metrics).

## 8. Consent and safety principles (part of the brand, not just the product)

1. **Proximity is awareness, never a connection.** Nothing connects because you walked past.
2. **Mic and camera are never switched on by a knock.** Permission is requested after acceptance.
3. **Declining is safe.** One-tap replies, no guilt, "we've let them know you stopped by", and blocks are
   silent.
4. **No pressure signals:** no read receipts by default, no "typing…" for drops, no streaks that shame.
5. **No surveillance:** behavioural metrics are per team, never per person; admins can't read desk drops.
6. **Knocks are limited** (rate limits and cool-offs) so a door can't be pestered.
7. **AI is optional and off by default.**
