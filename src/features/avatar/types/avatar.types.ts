export type Direction = "down" | "up" | "left" | "right";
export type AnimationState = "idle" | "walk" | "sit" | "wave" | "dance" | "clap" | "celebrate";
/** Actions a user can trigger from the avatar-actions menu. */
export type AvatarAction = Extract<AnimationState, "wave" | "dance" | "clap" | "celebrate">;

export interface AvatarClothing {
  top: string;
  topColor: string;
  bottom: string;
  bottomColor: string;
  shoes: string;
  shoeColor: string;
}

export interface AvatarAccessories {
  glasses: string;
  hat: string;
  headphones: boolean;
  bag: string;
  extra: string;
  /** Colour shared by hat, bag and small accessories. */
  accentColor: string;
}

/** Everything that affects how the sprite sheet is drawn. */
export interface AvatarAppearance {
  characterId: string;
  skinTone: string;
  hairstyle: string;
  hairColor: string;
  face: string;
  clothing: AvatarClothing;
  accessories: AvatarAccessories;
}

export interface Avatar extends AvatarAppearance {
  id: string;
  animationState: AnimationState;
  direction: Direction;
}
