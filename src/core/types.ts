// Plain TypeScript: no Phaser imports allowed in src/core/.

export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface Clue {
    id: string;
    name: string;
    description: string;
    location: string;
    /** Index into Site.truthEvents: when this clue's moment really happened. */
    timeIndex: number;
    personId: string;
    /** True if this clue exposes the truth. */
    isEssential: boolean;
    hotspot: Rect;
}

export interface TruthEvent {
    id: string;
    text: string;
}

export interface CleanupWave {
    /** Seconds after cleanup starts when this wave hits. */
    atSecond: number;
    clueIds: string[];
}

export interface Site {
    id: string;
    title: string;
    briefing: string;
    cleanupDurationSeconds: number;
    preservationSlots: number;
    clues: Clue[];
    /** What really happened, in order. */
    truthEvents: TruthEvent[];
    /** Sorted by atSecond, ascending. */
    cleanupWaves: CleanupWave[];
}

export interface SuspicionEntry {
    /** The change actually applied after clamping to 0-100. */
    amount: number;
    reason: string;
}

/** Immutable: every action returns a new state. */
export interface GameState {
    readonly site: Site;
    readonly discoveredClueIds: readonly string[];
    /** Clue ids in the order the player arranged them. */
    readonly timeline: readonly string[];
    readonly preservedClueIds: readonly string[];
    readonly destroyedClueIds: readonly string[];
    /** 0-100. */
    readonly suspicion: number;
    readonly suspicionLog: readonly SuspicionEntry[];
    /** Seconds left before cleanup finishes. */
    readonly timeRemaining: number;
}

export type FailReason =
    | 'unknown-clue'
    | 'destroyed'
    | 'not-discovered'
    | 'slots-full'
    | 'cleanup-over';

export type ActionResult =
    | { ok: true; state: GameState }
    | { ok: false; state: GameState; reason: FailReason };

export type Ending = 'exposed' | 'buried' | 'leaked' | 'caught';
