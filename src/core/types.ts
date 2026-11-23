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
    /** What really happened, in order. The timeline has one slot per event. */
    truthEvents: TruthEvent[];
    /** Sorted by atSecond, ascending. */
    cleanupWaves: CleanupWave[];
}

export type Ending = 'exposed' | 'buried' | 'leaked' | 'caught';
export const ENDINGS: readonly Ending[] = ['exposed', 'leaked', 'buried', 'caught'];

export type Confidence = 'low' | 'medium' | 'high';

export interface CrewMessage {
    /** Shown when suspicion rises to or past this value. */
    at: number;
    text: string;
}

/** Tuning numbers, loaded from src/data/rules.json. */
export interface Rules {
    waveWarningSeconds: number;
    endings: {
        /** Suspicion at or above this ends the site as "caught". */
        caughtAtSuspicion: number;
        /** Timeline accuracy (0-100) needed, with all essential clues preserved, for "exposed". */
        exposedMinScore: number;
    };
    confidence: { mediumFrom: number; highFrom: number };
    suspicion: {
        /** Each full stretch of this many seconds on one open clue adds lingerAmount. */
        lingerSeconds: number;
        lingerAmount: number;
        /** "Early" means before this fraction of the cleanup timer has passed. */
        earlyPreserveFraction: number;
        /** Added when preserving an essential clue early while already holding one. */
        earlyEssentialAmount: number;
        /** Preserve panel opens that are free; each later open adds preservePanelAmount. */
        freePreservePanelOpens: number;
        preservePanelAmount: number;
        crewMessages: CrewMessage[];
        /** Share of earlier sites' suspicion a new site starts with. */
        carryOverFactor: number;
        maxCarriedSuspicion: number;
    };
    reputation: {
        byEnding: Record<Ending, number>;
        /** +1 reputation per this many accuracy points (not for "caught"). */
        accuracyBonusPer: number;
    };
}

export type SuspicionReason = 'linger' | 'early-essential' | 'preserve-panel' | string;

export interface SuspicionEntry {
    /** The change actually applied after clamping to 0-100. */
    amount: number;
    reason: SuspicionReason;
}

export interface Inspection {
    clueId: string;
    seconds: number;
    /** How many linger penalties this inspection has already caused. */
    strikes: number;
}

/** Immutable: every action returns a new state. */
export interface GameState {
    readonly site: Site;
    readonly rules: Rules;
    readonly discoveredClueIds: readonly string[];
    /** Clue id -> timeline slot (0 = first truth event). Unplaced clues are absent. */
    readonly timeline: Readonly<Record<string, number>>;
    readonly preservedClueIds: readonly string[];
    readonly destroyedClueIds: readonly string[];
    /** 0-100. */
    readonly suspicion: number;
    /** Suspicion carried in from earlier sites. */
    readonly startingSuspicion: number;
    readonly suspicionLog: readonly SuspicionEntry[];
    /** Seconds left before cleanup finishes. */
    readonly timeRemaining: number;
    /** The clue whose inspection panel is open, if any. */
    readonly inspecting: Inspection | null;
    readonly preservePanelOpens: number;
}

export type FailReason =
    | 'unknown-clue'
    | 'destroyed'
    | 'not-discovered'
    | 'slots-full'
    | 'cleanup-over'
    | 'invalid-slot';

export type ActionResult =
    | { ok: true; state: GameState }
    | { ok: false; state: GameState; reason: FailReason };

export interface SiteResult {
    siteId: string;
    ending: Ending;
    /** Timeline accuracy, 0-100. */
    accuracy: number;
    savedEssentialIds: string[];
    lostEssentialIds: string[];
    finalSuspicion: number;
    suspicionGained: number;
    reputationGained: number;
}
