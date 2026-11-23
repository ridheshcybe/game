// Plain TypeScript: no Phaser imports allowed in src/core/.
import { slotOf } from './state';
import type { Confidence, Ending, GameState, Rules, Site, SiteResult } from './types';

/**
 * Timeline accuracy, 0-100 (rounded). Every pair of site clues counts. A pair is correct when
 * both clues are placed and their slots are in the same relative order as their true events
 * (same event -> same slot, earlier event -> earlier slot). Unplaced clues make their pairs
 * wrong, so finding and placing everything matters.
 */
export function scoreTimeline(state: GameState, site: Site): number {
    const clues = site.clues;
    if (clues.length < 2) {
        return clues.every((c) => slotOf(state, c.id) === c.timeIndex) ? 100 : 0;
    }
    let total = 0;
    let correct = 0;
    for (let i = 0; i < clues.length; i++) {
        for (let j = i + 1; j < clues.length; j++) {
            total++;
            const a = clues[i];
            const b = clues[j];
            const sa = slotOf(state, a.id);
            const sb = slotOf(state, b.id);
            if (sa === undefined || sb === undefined) continue;
            if (Math.sign(sa - sb) === Math.sign(a.timeIndex - b.timeIndex)) correct++;
        }
    }
    return Math.round((100 * correct) / total);
}

/** A deliberately vague reading of the timeline score for the player. */
export function confidenceLevel(state: GameState): Confidence {
    const score = scoreTimeline(state, state.site);
    const { mediumFrom, highFrom } = state.rules.confidence;
    if (score >= highFrom) return 'high';
    if (score >= mediumFrom) return 'medium';
    return 'low';
}

/**
 * - caught:  suspicion reached the limit (checked first).
 * - exposed: every essential clue preserved and the timeline is accurate enough.
 * - leaked:  at least one essential clue preserved, but not enough for exposed.
 * - buried:  no essential evidence survived.
 */
export function evaluateEnding(
    state: GameState,
    site: Site,
    rules: Rules['endings'] = state.rules.endings
): Ending {
    if (state.suspicion >= rules.caughtAtSuspicion) return 'caught';
    const essential = site.clues.filter((c) => c.isEssential).map((c) => c.id);
    const kept = essential.filter((id) => state.preservedClueIds.includes(id)).length;
    if (kept === essential.length && scoreTimeline(state, site) >= rules.exposedMinScore) return 'exposed';
    if (kept > 0) return 'leaked';
    return 'buried';
}

/** Everything the results screen and the campaign need from a finished site. */
export function buildSiteResult(state: GameState): SiteResult {
    const site = state.site;
    const ending = evaluateEnding(state, site);
    const accuracy = scoreTimeline(state, site);
    const essential = site.clues.filter((c) => c.isEssential).map((c) => c.id);
    const rep = state.rules.reputation;
    const bonus = ending === 'caught' ? 0 : Math.floor(accuracy / rep.accuracyBonusPer);
    return {
        siteId: site.id,
        ending,
        accuracy,
        savedEssentialIds: essential.filter((id) => state.preservedClueIds.includes(id)),
        lostEssentialIds: essential.filter((id) => !state.preservedClueIds.includes(id)),
        finalSuspicion: state.suspicion,
        suspicionGained: Math.max(0, state.suspicion - state.startingSuspicion),
        reputationGained: rep.byEnding[ending] + bonus
    };
}
