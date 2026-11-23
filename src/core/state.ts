// Plain TypeScript: no Phaser imports allowed in src/core/.
import type { ActionResult, CleanupWave, Clue, FailReason, GameState, Site } from './types';

/** How many seconds before a cleanup wave the player is warned. */
export const WAVE_WARNING_SECONDS = 10;

export function createGameState(site: Site): GameState {
    return {
        site,
        discoveredClueIds: [],
        timeline: [],
        preservedClueIds: [],
        destroyedClueIds: [],
        suspicion: 0,
        suspicionLog: [],
        timeRemaining: site.cleanupDurationSeconds
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
export const elapsedSeconds = (state: GameState): number =>
    state.site.cleanupDurationSeconds - state.timeRemaining;

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
 * Puts a discovered clue at `position` in the timeline (0 = earliest), moving it if it is
 * already placed. Position is clamped to the valid range. Destroyed clues can still be placed:
 * the player remembers what they logged.
 */
export function placeOnTimeline(state: GameState, clueId: string, position: number): ActionResult {
    if (!findClue(state.site, clueId)) return fail(state, 'unknown-clue');
    if (!isDiscovered(state, clueId)) return fail(state, 'not-discovered');
    const rest = state.timeline.filter((id) => id !== clueId);
    const index = Number.isFinite(position)
        ? Math.min(Math.max(Math.floor(position), 0), rest.length)
        : rest.length;
    const timeline = [...rest.slice(0, index), clueId, ...rest.slice(index)];
    return { ok: true, state: { ...state, timeline } };
}

/** Secretly keeps a discovered clue. Preserved clues survive cleanup waves. */
export function preserveClue(state: GameState, clueId: string): ActionResult {
    if (!findClue(state.site, clueId)) return fail(state, 'unknown-clue');
    if (isDestroyed(state, clueId)) return fail(state, 'destroyed');
    if (isCleanupOver(state)) return fail(state, 'cleanup-over');
    if (!isDiscovered(state, clueId)) return fail(state, 'not-discovered');
    if (isPreserved(state, clueId)) return { ok: true, state };
    if (state.preservedClueIds.length >= state.site.preservationSlots) return fail(state, 'slots-full');
    return { ok: true, state: { ...state, preservedClueIds: [...state.preservedClueIds, clueId] } };
}

/** Changes suspicion by `amount` (may be negative), clamped to 0-100, and logs why. */
export function addSuspicion(state: GameState, amount: number, reason: string): GameState {
    if (!Number.isFinite(amount) || amount === 0) return state;
    const suspicion = Math.min(100, Math.max(0, state.suspicion + amount));
    const applied = suspicion - state.suspicion;
    return {
        ...state,
        suspicion,
        suspicionLog: [...state.suspicionLog, { amount: applied, reason }]
    };
}

/**
 * Advances the cleanup timer by `dt` seconds. Every wave whose time has come destroys its
 * clues, except clues the player has preserved.
 */
export function tick(state: GameState, dt: number): GameState {
    if (!(dt > 0) || isCleanupOver(state)) return state;
    const timeRemaining = Math.max(0, state.timeRemaining - dt);
    const elapsed = state.site.cleanupDurationSeconds - timeRemaining;

    const destroyed = [...state.destroyedClueIds];
    for (const wave of state.site.cleanupWaves) {
        if (wave.atSecond > elapsed) continue;
        for (const id of wave.clueIds) {
            if (!destroyed.includes(id) && !isPreserved(state, id)) destroyed.push(id);
        }
    }
    const changed = destroyed.length !== state.destroyedClueIds.length;
    return { ...state, timeRemaining, destroyedClueIds: changed ? destroyed : state.destroyedClueIds };
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
