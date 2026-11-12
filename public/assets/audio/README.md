# Site audio (placeholders)

Every file here is a **silent placeholder**. Replace each one with the generated sound, keeping the exact
file name and the `.mp3` format. No code change is needed. Sound is off until the visitor switches it on.

| File | What it is | Length | Loops | Where it plays |
|---|---|---|---|---|
| `door-open.mp3` | Soft wooden door easing open, gentle creak | ~2 s | no | Hero, as the door starts to open |
| `door-close.mp3` | The same door closing softly | ~1.5 s | no | Hero, when scrolling back up |
| `knock.mp3` | Two soft knuckle knocks on wood | ~0.6 s | no | Playable office and the knock scene |
| `welcome-chime.mp3` | Warm two-note chime ("come on in") | ~1 s | no | A knock is accepted; a note is read |
| `note-place.mp3` | Paper sticky note pressed onto a desk | ~0.4 s | no | A note is left |
| `footsteps.mp3` | Four soft steps on wood | ~1.5 s | no | Hana arrives in the morning |
| `office-ambience.mp3` | Quiet room tone, faint typing, distant murmur, no clear speech | 30–45 s | **yes, seamless** | While the playable office is on screen |
| `night-ambience.mp3` | Calm evening tone, soft crickets | 20–30 s | **yes, seamless** | During the night part of the time-lapse |

Guidance: trim silence at both ends, no clipping, quiet and close rather than cinematic. Volumes are balanced
in `src/site/lib/sound.ts` (`SOUNDS`), which is also where a new sound is registered.
