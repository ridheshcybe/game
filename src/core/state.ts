// Plain TypeScript: no Phaser imports allowed in src/core/.
import type { ActionResult, CleanupWave, Clue, FailReason, GameState, Rules, Site } from './types';

export const MAX_SUSPICION = 100;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function createGameState(site: Site, rules: Rules, startingSuspicion = 0): GameState {
    const suspicion = clamp(Number.isFinite(startingSuspicion) ? startingSuspicion : 0, 0, MAX_SUSPICION);
    return {
        site,
        rules,
        discoveredClueIds: [],
        timeline: {},
        preservedClueIds: [],
        destroyedClueIds: [],
        suspicion,
        startingSuspicion: suspicion,
        suspicionLog: [],
        timeRemaining: site.cleanupDurationSeconds,
        inspecting: null,
        preservePanelOpens: 0
    };
}

export function findClue(site: Site, clueId: string): Clue | undefined {
    return site.clues.find((c) => c.id === clueId);
}

export const isDiscovered = (state: GameState, clueId: string): boolean =>
    state.discoveredClueIds.includes(clueId);
export const isDestroyed = (state: GameState, clueId: string): boolean =>
    state.destroyedClueIds.includes(clueId);
export const isPreserved = (state: GameState, clueId: string): boolean =>
    state.preservedClueIds.includes(clueId);
export const isCleanupOver = (state: GameState): boolean => state.timeRemaining <= 0;
export const isCaught = (state: GameState): boolean =>
    state.suspicion >= state.rules.endings.caughtAtSuspicion;
/** The site ends when the player is caught or the cleanup timer runs out. */
export const isSiteOver = (state: GameState): boolean => isCaught(state) || isCleanupOver(state);
export const elapsedSeconds = (state: GameState): number =>
    state.site.cleanupDurationSeconds - state.timeRemaining;
export const slotsLeft = (state: GameState): number =>
    state.site.preservationSlots - state.preservedClueIds.length;
/** Timeline slot of a clue, or undefined if it is not placed. */
export const slotOf = (state: GameState, clueId: string): number | undefined =>
    Object.prototype.hasOwnProperty.call(state.timeline, clueId) ? state.timeline[clueId] : undefined;

const fail = (state: GameState, reason: FailReason): ActionResult => ({ ok: false, state, reason });

/** Logs a clue as discovered. Discovering an already-discovered clue is a no-op success. */
export function discoverClue(state: GameState, clueId: string): ActionResult {
    if (!findClue(state.site, clueId)) return fail(state, 'unknown-clue');
    if (isDestroyed(state, clueId)) return fail(state, 'destroyed');
    if (isCleanupOver(state)) return fail(state, 'cleanup-over');
    if (isDiscovered(state, clueId)) return { ok: true, state };
    return { ok: true, state: { ...state, discoveredClueIds: [...state.discoveredClueIds, clueId] } };
}

/**
 * Puts a discovered clue into timeline slot `slot` (0 = first truth event), moving it if it is
 * already placed. A slot can hold several clues. Destroyed clues can still be placed: the
 * player remembers what they logged.
 */
export function placeOnTimeline(state: GameState, clueId: string, slot: number): ActionResult {
    if (!findClue(state.site, clueId)) return fail(state, 'unknown-clue');
    if (!isDiscovered(state, clueId)) return fail(state, 'not-discovered');
    if (!Number.isInteger(slot) || slot < 0 || slot >= state.site.truthEvents.length) {
        return fail(state, 'invalid-slot');
    }
    return { ok: true, state: { ...state, timeline: { ...state.timeline, [clueId]: slot } } };
}

/** Takes a clue off the timeline. No-op if it was not placed. */
export function removeFromTimeline(state: GameState, clueId: string): GameState {
    if (slotOf(state, clueId) === undefined) return state;
    const timeline = Object.fromEntries(Object.entries(state.timeline).filter(([id]) => id !== clueId));
    return { ...state, timeline };
}

/**
 * Secretly keeps a discovered clue. Preserved clues survive cleanup waves.
 * Preserving an essential clue early while already holding another one raises suspicion.
 */
export function preserveClue(state: GameState, clueId: string): ActionResult {
    const clue = findClue(state.site, clueId);
    if (!clue) return fail(state, 'unknown-clue');
    if (isDestroyed(state, clueId)) return fail(state, 'destroyed');
    if (isCleanupOver(state)) return fail(state, 'cleanup-over');
    if (!isDiscovered(state, clueId)) return fail(state, 'not-discovered');
    if (isPreserved(state, clueId)) return { ok: true, state };
    if (slotsLeft(state) <= 0) return fail(state, 'slots-full');

    const rules = state.rules.suspicion;
    const early = elapsedSeconds(state) < state.site.cleanupDurationSeconds * rules.earlyPreserveFraction;
    const essentialHeld = state.preservedClueIds.filter((id) => findClue(state.site, id)?.isEssential).length;

    let next: GameState = { ...state, preservedClueIds: [...state.preservedClueIds, clueId] };
    if (clue.isEssential && early && essentialHeld >= 1) {
        next = addSuspicion(next, rules.earlyEssentialAmount, 'early-essential');
    }
    return { ok: true, state: next };
}

/**
 * Puts a preserved clue back. If a cleanup wave for it has already passed, it is destroyed
 * at once. No-op success if it was not preserved.
 */
export function unpreserveClue(state: GameState, clueId: string): ActionResult {
    if (!findClue(state.site, clueId)) return fail(state, 'unknown-clue');
    if (isCleanupOver(state)) return fail(state, 'cleanup-over');
    if (!isPreserved(state, clueId)) return { ok: true, state };
    const next = { ...state, preservedClueIds: state.preservedClueIds.filter((id) => id !== clueId) };
    return { ok: true, state: { ...next, destroyedClueIds: destroyedByWaves(next) } };
}

/** Changes suspicion by `amount` (may be negative), clamped to 0-100, and logs why. */
export function addSuspicion(state: GameState, amount: number, reason: string): GameState {
    if (!Number.isFinite(amount) || amount === 0) return state;
    const suspicion = clamp(state.suspicion + amount, 0, MAX_SUSPICION);
    const applied = suspicion - state.suspicion;
    return {
        ...state,
        suspicion,
        suspicionLog: [...state.suspicionLog, { amount: applied, reason }]
    };
}

/** Crew messages whose threshold was crossed going from `before` to `after` suspicion. */
export function crewMessagesCrossed(before: number, after: number, rules: Rules): string[] {
    return rules.suspicion.crewMessages.filter((m) => before < m.at && after >= m.at).map((m) => m.text);
}

/** The player opened a clue's inspection panel. Starts the linger clock. */
export function startInspecting(state: GameState, clueId: string): GameState {
    if (state.inspecting?.clueId === clueId) return state;
    return { ...state, inspecting: { clueId, seconds: 0, strikes: 0 } };
}

/** The player closed the inspection panel. */
export function stopInspecting(state: GameState): GameState {
    return state.inspecting ? { ...state, inspecting: null } : state;
}

/** Counts an opening of the preserve panel. Opening it too often raises suspicion. */
export function openPreservePanel(state: GameState): GameState {
    const preservePanelOpens = state.preservePanelOpens + 1;
    const next = { ...state, preservePanelOpens };
    const rules = state.rules.suspicion;
    return preservePanelOpens > rules.freePreservePanelOpens
        ? addSuspicion(next, rules.preservePanelAmount, 'preserve-panel')
        : next;
}

/** Clue ids destroyed by every wave that has hit by now, keeping the existing order. */
function destroyedByWaves(state: GameState): readonly string[] {
    const elapsed = elapsedSeconds(state);
    const destroyed = [...state.destroyedClueIds];
    for (const wave of state.site.cleanupWaves) {
        if (wave.atSecond > elapsed) continue;
        for (const id of wave.clueIds) {
            if (!destroyed.includes(id) && !isPreserved(state, id)) destroyed.push(id);
        }
    }
    return destroyed.length === state.destroyedClueIds.length ? state.destroyedClueIds : destroyed;
}

/**
 * Advances the cleanup timer by `dt` seconds. Every wave whose time has come destroys its
 * clues, except preserved ones. While a clue is being inspected, each full linger period
 * adds suspicion.
 */
export function tick(state: GameState, dt: number): GameState {
    if (!(dt > 0) || isCleanupOver(state)) return state;
    let next: GameState = { ...state, timeRemaining: Math.max(0, state.timeRemaining - dt) };
    next = { ...next, destroyedClueIds: destroyedByWaves(next) };

    const inspecting = next.inspecting;
    if (inspecting) {
        const rules = next.rules.suspicion;
        const seconds = inspecting.seconds + dt;
        const strikes = Math.floor(seconds / rules.lingerSeconds);
        next = { ...next, inspecting: { ...inspecting, seconds, strikes } };
        if (strikes > inspecting.strikes) {
            next = addSuspicion(next, (strikes - inspecting.strikes) * rules.lingerAmount, 'linger');
        }
    }
    return next;
}

export interface UpcomingWave {
    wave: CleanupWave;
    secondsUntil: number;
    /** Clues in the wave that will actually burn (not already destroyed or preserved). */
    threatenedClueIds: string[];
}

/** The next wave that has not hit yet, if it hits within `withinSeconds`. */
export function upcomingWave(state: GameState, withinSeconds = Infinity): UpcomingWave | null {
    const elapsed = elapsedSeconds(state);
    const wave = state.site.cleanupWaves.find((w) => w.atSecond > elapsed);
    if (!wave) return null;
    const secondsUntil = wave.atSecond - elapsed;
    if (secondsUntil > withinSeconds) return null;
    const threatenedClueIds = wave.clueIds.filter(
        (id) => !isDestroyed(state, id) && !isPreserved(state, id)
    );
    return { wave, secondsUntil, threatenedClueIds };
}
