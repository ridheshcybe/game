// Plain TypeScript: no Phaser imports allowed in src/core/.
import type { Ending, GameState, Site } from './types';

export interface EndingRules {
    /** Suspicion at or above this gets the player caught. */
    caughtAtSuspicion: number;
    /** Timeline score (0-100) needed, with all essential clues preserved, to expose the truth. */
    exposedMinScore: number;
}

export const ENDING_RULES: EndingRules = {
    caughtAtSuspicion: 80,
    exposedMinScore: 70
};

/**
 * Percent (0-100, rounded) of the site's clue pairs that the timeline orders correctly.
 * Only pairs from different truth events count. A pair is correct when both clues are on
 * the timeline in the true relative order, so missing clues lower the score.
 * Clue ids on the timeline that are not in the site are ignored.
 */
export function scoreTimeline(state: GameState, site: Site): number {
    const position = new Map(state.timeline.map((id, i) => [id, i]));
    let total = 0;
    let correct = 0;
    for (let i = 0; i < site.clues.length; i++) {
        for (let j = i + 1; j < site.clues.length; j++) {
            const a = site.clues[i];
            const b = site.clues[j];
            if (a.timeIndex === b.timeIndex) continue;
            total++;
            const pa = position.get(a.id);
            const pb = position.get(b.id);
            if (pa === undefined || pb === undefined) continue;
            if (pa < pb === a.timeIndex < b.timeIndex) correct++;
        }
    }
    return total === 0 ? 100 : Math.round((100 * correct) / total);
}

/**
 * - caught:  suspicion reached the limit (checked first).
 * - exposed: every essential clue preserved and the timeline is accurate enough.
 * - leaked:  at least one essential clue preserved, but not enough for exposed.
 * - buried:  no essential evidence survived.
 */
export function evaluateEnding(state: GameState, site: Site, rules: EndingRules = ENDING_RULES): Ending {
    if (state.suspicion >= rules.caughtAtSuspicion) return 'caught';
    const essential = site.clues.filter((c) => c.isEssential).map((c) => c.id);
    const kept = essential.filter((id) => state.preservedClueIds.includes(id)).length;
    if (kept === essential.length && scoreTimeline(state, site) >= rules.exposedMinScore) return 'exposed';
    if (kept > 0) return 'leaked';
    return 'buried';
}
