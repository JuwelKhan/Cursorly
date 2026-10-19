// Type definitions for Cursorly

export type BuiltInEffect =
  | 'dot'
  | 'ring'
  | 'blob'
  | 'trail'
  | 'particles'
  | 'ripple'
  | 'spotlight'
  | 'glow'
  | 'snake'
  | 'orbit'
  | 'crosshair'
  | 'image';

export type BuiltInPreset =
  | 'classic'
  | 'minimal'
  | 'blend'
  | 'ripple'
  | 'neon'
  | 'rainbow'
  | 'sparkle'
  | 'confetti'
  | 'bubbles'
  | 'emoji'
  | 'spotlight'
  | 'glow'
  | 'snake'
  | 'orbit'
  | 'crosshair'
  | 'comet';

/** Built-in states plus any name used in data-cursor="…" or setState(). */
export type CursorState = 'pointer' | 'text' | (string & {});

/** Per-state overrides used by most effects (`states: { pointer: { scale: 2 } }`). */
export interface StateStyle {
  scale?: number;
  opacity?: number;
  color?: string;
  fill?: number;
  [key: string]: unknown;
}

interface CommonEffectOptions {
  /** CSS mix-blend-mode of the effect's layer, e.g. 'difference'. */
  blend?: string | null;
  states?: Record<string, StateStyle>;
}

export interface ShapeOptions extends CommonEffectOptions {
  size?: number;
  color?: string | null;
  ease?: number;
  sizeEase?: number;
  border?: number;
  fill?: number;
  opacity?: number;
  stretch?: number;
  downScale?: number;
  label?: boolean;
  labelSize?: number;
  labelColor?: string;
  labelScale?: number;
  stuckScale?: number;
  stick?: boolean;
  stickPadding?: number;
  stickFill?: number;
}

export interface TrailOptions extends CommonEffectOptions {
  color?: string | string[] | 'rainbow' | null;
  width?: number;
  life?: number;
  maxPoints?: number;
  taper?: boolean;
  glow?: number;
  opacity?: number;
  composite?: GlobalCompositeOperation | null;
}

type Range = number | [number, number];

export interface ParticlesOptions extends CommonEffectOptions {
  shape?: string | string[];
  colors?: string[] | null;
  size?: Range;
  rate?: number;
  life?: Range;
  speed?: Range;
  inherit?: number;
  gravity?: number;
  drag?: number;
  spin?: number;
  fade?: boolean;
  shrink?: boolean;
  burst?: number;
  burstSpeed?: Range;
  max?: number;
  composite?: GlobalCompositeOperation | null;
}

export interface RippleOptions extends CommonEffectOptions {
  color?: string | null;
  size?: number;
  duration?: number;
  width?: number;
  fill?: number;
  rings?: number;
  delay?: number;
}

export interface SpotlightOptions extends CommonEffectOptions {
  radius?: number;
  softness?: number;
  color?: string;
  ease?: number;
  downScale?: number;
}

export interface GlowOptions extends CommonEffectOptions {
  size?: number;
  color?: string | null;
  opacity?: number;
  ease?: number;
}

export interface SnakeOptions extends CommonEffectOptions {
  count?: number;
  size?: number;
  colors?: string[] | null;
  ease?: number;
  tail?: number;
  opacity?: number;
  downScale?: number;
}

export interface OrbitOptions extends CommonEffectOptions {
  text?: string;
  radius?: number;
  fontSize?: number;
  fontWeight?: number | string;
  color?: string | null;
  speed?: number;
  ease?: number;
  useLabel?: boolean;
  opacity?: number;
  downScale?: number;
}

export interface CrosshairOptions extends CommonEffectOptions {
  color?: string | null;
  width?: number;
  gap?: number;
  opacity?: number;
  ease?: number;
  coords?: boolean;
}

export interface ImageOptions extends CommonEffectOptions {
  src?: string | null;
  emoji?: string | null;
  /** Inserted as-is: only pass trusted HTML. */
  html?: string | null;
  size?: number;
  hotspot?: [number, number];
  ease?: number;
  rotate?: boolean;
  rotateOffset?: number;
  opacity?: number;
  downScale?: number;
}

export interface EffectOptionsMap {
  dot: ShapeOptions;
  ring: ShapeOptions;
  blob: ShapeOptions;
  trail: TrailOptions;
  particles: ParticlesOptions;
  ripple: RippleOptions;
  spotlight: SpotlightOptions;
  glow: GlowOptions;
  snake: SnakeOptions;
  orbit: OrbitOptions;
  crosshair: CrosshairOptions;
  image: ImageOptions;
}

export type EffectSpec =
  | BuiltInEffect
  | (string & {})
  | { [K in BuiltInEffect]: { type: K; id?: string } & EffectOptionsMap[K] }[BuiltInEffect]
  | ({ type: string; id?: string } & Record<string, unknown>);

export interface CursorlyOptions {
  preset?: BuiltInPreset | (string & {}) | null;
  effects?: EffectSpec[] | null;
  color?: string;
  accent?: string;
  hideNativeCursor?: boolean | 'all';
  touch?: boolean;
  reducedMotion?: 'reduce' | 'disable' | 'ignore';
  magnetic?: boolean;
  magneticStrength?: number;
  hoverSelector?: string;
  textSelector?: string;
  container?: HTMLElement | string | null;
  zIndex?: number;
  injectCSS?: boolean;
  nonce?: string | null;
  autoStart?: boolean;
}

export interface ResolvedEffect {
  id: string;
  type: string;
  options: Record<string, unknown>;
}

export interface ResolvedOptions extends Required<Omit<CursorlyOptions, 'effects' | 'preset' | 'container' | 'nonce'>> {
  preset: string | null;
  effects: ResolvedEffect[];
  container: HTMLElement | string | null;
  nonce: string | null;
}

/** What every effect receives once per animation frame. */
export interface CursorFrame {
  /** Pointer position in viewport pixels. */
  x: number;
  y: number;
  /** Smoothed velocity in px/s. */
  vx: number;
  vy: number;
  speed: number;
  /** Direction of travel in radians. */
  angle: number;
  down: boolean;
  /** false before the first move, outside the window, on touch and in data-cursor-hide areas. */
  visible: boolean;
  /** true when the pointer teleported (first move, re-entering the window): snap instead of animating. */
  jump: boolean;
  state: CursorState | null;
  text: string | null;
  color: string | null;
  target: Element | null;
  /** Rect of the hovered [data-cursor-stick] element. */
  rect: DOMRect | null;
  /** Its border radius in px. */
  radius: number;
  reducedMotion: boolean;
  /** Seconds (high-resolution). */
  time: number;
  /** Seconds since the previous frame. */
  dt: number;
}

export interface Surface {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
  clear(): void;
}

export interface EffectContext<O = Record<string, any>> {
  id: string;
  type: string;
  cursor: Cursorly;
  /** The effect's own fixed, click-through layer. */
  layer: HTMLDivElement;
  /** Effect defaults merged with the user's options (live: reflects setEffectOptions). */
  readonly options: O;
  readonly reducedMotion: boolean;
  readonly accent: string;
  /** data-cursor-color → state colour → effect colour → cursor colour. */
  color(frame?: CursorFrame, state?: StateStyle): string;
  /** Creates an element inside the layer. */
  element<K extends keyof HTMLElementTagNameMap = 'div'>(className?: string, tag?: K): HTMLElementTagNameMap[K];
  /** Creates a viewport-sized canvas inside the layer (resized for you). */
  canvas(): Surface;
  /** Asks for another frame (e.g. after starting an animation from down()). */
  request(): void;
}

export interface EffectInstance {
  /** Draw one frame. Return true while still animating; the loop sleeps once every effect returns false. */
  update?(frame: CursorFrame, dt: number): boolean | void;
  down?(frame: CursorFrame): void;
  up?(frame: CursorFrame): void;
  resize?(): void;
  setOptions?(options: Record<string, unknown>): void;
  destroy?(): void;
}

export interface EffectDefinition<O = Record<string, any>> {
  description?: string;
  defaults?: O;
  create(ctx: EffectContext<O>): EffectInstance | void;
}

export interface RegisteredEffect {
  readonly name: string;
  readonly description: string;
  readonly defaults: Readonly<Record<string, unknown>>;
  create(ctx: EffectContext): EffectInstance | void;
}

export interface Preset {
  description?: string;
  effects: EffectSpec[];
  options?: Omit<CursorlyOptions, 'preset' | 'effects'>;
}

export interface RegisteredPreset extends Required<Preset> {
  readonly name: string;
}

export interface EventMap {
  start: { cursor: Cursorly };
  stop: { cursor: Cursorly };
  destroy: { cursor: Cursorly };
  enter: { target: Element; state: CursorState | null; text: string | null };
  leave: { target: Element };
  statechange: { state: CursorState | null; previous: CursorState | null };
  down: { x: number; y: number; target: Element | null; event: PointerEvent };
  up: { x: number; y: number; target: Element | null; event: PointerEvent };
}

export declare class Cursorly {
  constructor(options?: CursorlyOptions);

  static readonly version: string;
  static readonly DEFAULTS: Readonly<Required<CursorlyOptions>>;
  static readonly effects: string[];
  static readonly presets: string[];
  static registerEffect<O>(name: string, definition: EffectDefinition<O> | ((ctx: EffectContext<O>) => EffectInstance | void)): RegisteredEffect;
  static getEffect(name: string): RegisteredEffect | null;
  static registerPreset(name: string, preset: Preset): RegisteredPreset;
  static getPreset(name: string): RegisteredPreset | null;

  readonly options: ResolvedOptions;
  readonly enabled: boolean;
  readonly running: boolean;
  readonly effects: string[];
  readonly position: { x: number; y: number };
  readonly state: CursorState | null;
  readonly target: Element | null;

  start(): this;
  stop(): this;
  toggle(force?: boolean): this;
  setOptions(options: CursorlyOptions): this;
  usePreset(name: BuiltInPreset | (string & {})): this;
  addEffect(spec: EffectSpec): string | null;
  removeEffect(id: string): this;
  getEffectOptions(id: string): Record<string, unknown> | null;
  setEffectOptions(id: string, options: Record<string, unknown>): this;
  setState(state: CursorState | null): this;
  setText(text: string | null): this;
  setColor(color: string | null): this;
  hide(): this;
  show(): this;
  refresh(): this;
  on<K extends keyof EventMap>(type: K, handler: (detail: EventMap[K]) => void): () => void;
  once<K extends keyof EventMap>(type: K, handler: (detail: EventMap[K]) => void): () => void;
  off<K extends keyof EventMap>(type: K, handler?: (detail: EventMap[K]) => void): this;
  destroy(): void;
}

export default Cursorly;

export declare const DEFAULTS: Readonly<Required<CursorlyOptions>>;
export declare function registerEffect<O>(
  name: string,
  definition: EffectDefinition<O> | ((ctx: EffectContext<O>) => EffectInstance | void),
): RegisteredEffect;
export declare function getEffect(name: string): RegisteredEffect | null;
export declare function listEffects(): string[];
export declare function registerPreset(name: string, preset: Preset): RegisteredPreset;
export declare function getPreset(name: string): RegisteredPreset | null;
export declare function listPresets(): string[];
/** Frame-rate independent smoothing: `ease` is the share of the distance covered per 60 fps frame. */
export declare function follow(current: number, target: number, ease: number, dt: number): number;
export declare function clamp(value: number, min: number, max: number): number;
