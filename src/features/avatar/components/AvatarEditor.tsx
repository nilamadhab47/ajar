"use client";

import { Check, Dices, RotateCcw, RotateCw } from "lucide-react";
import { useState } from "react";
import { AvatarPreview } from "@/components/common/AvatarImage";
import { Button, IconButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ANIMATION_STATES, DIRECTIONS } from "../data/animations";
import {
  BAGS, BOTTOMS, CLOTHING_COLORS, DEFAULT_APPEARANCE, EXTRAS, FACES, GLASSES, HAIRSTYLES, HAIR_COLORS, HATS, SHOES, SKIN_TONES, TOPS, randomAppearance, type Option,
} from "../data/avatar-options";
import type { AnimationState, AvatarAppearance, Direction } from "../types/avatar.types";

type Tab = "appearance" | "clothing" | "accessories" | "actions";
const TABS: { id: Tab; label: string }[] = [
  { id: "appearance", label: "Appearance" }, { id: "clothing", label: "Clothing" }, { id: "accessories", label: "Accessories" }, { id: "actions", label: "Actions" },
];
const ACTION_LABEL: Record<AnimationState, string> = { idle: "Idle", walk: "Walk", sit: "Sit", wave: "Wave", dance: "Dance", clap: "Clap", celebrate: "Celebrate" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="mb-3.5">
      <legend className="mb-1.5 text-xs font-medium text-muted">{label}</legend>
      {children}
    </fieldset>
  );
}

function Swatches({ label, colors, value, onChange }: { label: string; colors: readonly string[]; value: string; onChange: (c: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-1.5">
        {colors.map((c) => (
          <button
            key={c} type="button" aria-label={`${label} ${c}`} aria-pressed={value === c} onClick={() => onChange(c)}
            className={cn("flex size-7 items-center justify-center rounded-md border border-ink/15", value === c && "ring-2 ring-accent ring-offset-1")} style={{ background: c }}
          >
            {value === c && <Check className="size-3.5 text-white mix-blend-difference" aria-hidden />}
          </button>
        ))}
      </div>
    </Field>
  );
}

function Choices({ label, options, value, onChange }: { label: string; options: Option[]; value: string; onChange: (id: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}
            className={cn("h-7 rounded-md border px-2.5 text-xs font-medium", value === o.id ? "border-accent bg-accent-soft text-accent" : "border-line hover:bg-hover")}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Field>
  );
}

interface Props {
  value: AvatarAppearance;
  onChange: (next: AvatarAppearance) => void;
  /** Hides the action tab and shrinks the preview (used inside onboarding). */
  compact?: boolean;
}

/**
 * Controlled avatar builder. Every control edits plain data; the preview and the
 * in-world sprite are both rendered from that data by the same compositor.
 */
export function AvatarEditor({ value, onChange, compact }: Props) {
  const [tab, setTab] = useState<Tab>("appearance");
  const [direction, setDirection] = useState<Direction>("down");
  const [state, setState] = useState<AnimationState>("idle");
  const rotate = (step: number) => setDirection((d) => DIRECTIONS[(DIRECTIONS.indexOf(d) + step + DIRECTIONS.length) % DIRECTIONS.length]);
  const clothing = (patch: Partial<AvatarAppearance["clothing"]>) => onChange({ ...value, clothing: { ...value.clothing, ...patch } });
  const accessories = (patch: Partial<AvatarAppearance["accessories"]>) => onChange({ ...value, accessories: { ...value.accessories, ...patch } });
  const tabs = compact ? TABS.filter((t) => t.id !== "actions") : TABS;

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="flex shrink-0 flex-col items-center gap-2 sm:w-44">
        <div className="flex w-full items-end justify-center rounded-lg bg-wood/45 pb-3 pt-4" style={{ backgroundImage: "linear-gradient(to top, rgb(40 42 48 / 0.06) 14px, transparent 14px)" }}>
          <AvatarPreview appearance={value} direction={direction} state={state} scale={compact ? 3 : 4} />
        </div>
        <div className="flex w-full items-center justify-between">
          <IconButton label="Rotate left" className="border border-line" onClick={() => rotate(-1)}><RotateCcw className="size-4" /></IconButton>
          <span className="text-xs capitalize text-muted" aria-live="polite">Facing {direction}</span>
          <IconButton label="Rotate right" className="border border-line" onClick={() => rotate(1)}><RotateCw className="size-4" /></IconButton>
        </div>
        <div className="grid w-full grid-cols-2 gap-1.5">
          <Button size="sm" onClick={() => onChange(randomAppearance())}><Dices className="size-3.5" aria-hidden />Randomise</Button>
          <Button size="sm" onClick={() => onChange(DEFAULT_APPEARANCE)}>Reset</Button>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div role="tablist" aria-label="Avatar options" className="mb-3 flex gap-1 border-b border-line pb-2">
          {tabs.map((t) => (
            <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={cn("h-7 rounded-md px-2.5 text-xs font-medium", tab === t.id ? "bg-accent-soft text-accent" : "text-muted hover:bg-hover")}>
              {t.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" className={cn("thin-scroll overflow-y-auto pr-1", compact ? "max-h-56" : "max-h-[340px]")}>
          {tab === "appearance" && (
            <>
              <Swatches label="Skin tone" colors={SKIN_TONES} value={value.skinTone} onChange={(skinTone) => onChange({ ...value, skinTone })} />
              <Choices label="Hairstyle" options={HAIRSTYLES} value={value.hairstyle} onChange={(hairstyle) => onChange({ ...value, hairstyle })} />
              <Swatches label="Hair colour" colors={HAIR_COLORS} value={value.hairColor} onChange={(hairColor) => onChange({ ...value, hairColor })} />
              <Choices label="Face" options={FACES} value={value.face} onChange={(face) => onChange({ ...value, face })} />
            </>
          )}
          {tab === "clothing" && (
            <>
              <Choices label="Top" options={TOPS} value={value.clothing.top} onChange={(top) => clothing({ top })} />
              <Swatches label="Top colour" colors={CLOTHING_COLORS} value={value.clothing.topColor} onChange={(topColor) => clothing({ topColor })} />
              <Choices label="Bottom" options={BOTTOMS} value={value.clothing.bottom} onChange={(bottom) => clothing({ bottom })} />
              <Swatches label="Bottom colour" colors={CLOTHING_COLORS} value={value.clothing.bottomColor} onChange={(bottomColor) => clothing({ bottomColor })} />
              <Choices label="Shoes" options={SHOES} value={value.clothing.shoes} onChange={(shoes) => clothing({ shoes })} />
              <Swatches label="Shoe colour" colors={CLOTHING_COLORS} value={value.clothing.shoeColor} onChange={(shoeColor) => clothing({ shoeColor })} />
            </>
          )}
          {tab === "accessories" && (
            <>
              <Choices label="Glasses" options={GLASSES} value={value.accessories.glasses} onChange={(glasses) => accessories({ glasses })} />
              <Choices label="Hat" options={HATS} value={value.accessories.hat} onChange={(hat) => accessories({ hat })} />
              <Choices label="Headphones" options={[{ id: "off", label: "None" }, { id: "on", label: "Headphones" }]} value={value.accessories.headphones ? "on" : "off"} onChange={(v) => accessories({ headphones: v === "on" })} />
              <Choices label="Bag" options={BAGS} value={value.accessories.bag} onChange={(bag) => accessories({ bag })} />
              <Choices label="Small accessory" options={EXTRAS} value={value.accessories.extra} onChange={(extra) => accessories({ extra })} />
              <Swatches label="Accessory colour" colors={CLOTHING_COLORS} value={value.accessories.accentColor} onChange={(accentColor) => accessories({ accentColor })} />
            </>
          )}
          {tab === "actions" && (
            <Field label="Preview an action">
              <div className="grid grid-cols-3 gap-1.5">
                {ANIMATION_STATES.map((s) => (
                  <button key={s} type="button" aria-pressed={state === s} onClick={() => setState(s)} className={cn("h-9 rounded-md border text-xs font-medium", state === s ? "border-accent bg-accent-soft text-accent" : "border-line hover:bg-hover")}>
                    {ACTION_LABEL[s]}
                  </button>
                ))}
              </div>
              <p className="mt-2.5 text-xs text-muted">In the office, trigger Wave, Dance, Clap and Celebrate from the avatar-actions button in the toolbar. Sit by pressing E next to any seat.</p>
            </Field>
          )}
        </div>
      </div>
    </div>
  );
}
