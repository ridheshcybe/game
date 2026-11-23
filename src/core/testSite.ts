// Small, hand-checkable fixtures used by unit tests. Not game content.
import { createGameState } from './state';
import type { Clue, GameState, Rules, Site } from './types';

const clue = (id: string, timeIndex: number, isEssential = false): Clue => ({
    id,
    name: id,
    description: `${id} description`,
    location: 'room',
    timeIndex,
    personId: 'p',
    isEssential,
    hotspot: { x: 0, y: 0, w: 10, h: 10 }
});

/** Clues a, b, c, d at times 0, 1, 2, 3. b and d are essential. Waves at 30s (a) and 60s (b, c). */
export function makeTestSite(overrides: Partial<Site> = {}): Site {
    return {
        id: 'test',
        title: 'Test site',
        briefing: 'Test briefing',
        cleanupDurationSeconds: 100,
        preservationSlots: 2,
        truthEvents: [0, 1, 2, 3].map((i) => ({ id: `e${i}`, text: `event ${i}` })),
        clues: [clue('a', 0), clue('b', 1, true), clue('c', 2), clue('d', 3, true)],
        cleanupWaves: [
            { atSecond: 30, clueIds: ['a'] },
            { atSecond: 60, clueIds: ['b', 'c'] }
        ],
        ...overrides
    };
}

export function makeTestRules(): Rules {
    return {
        waveWarningSeconds: 10,
        endings: { caughtAtSuspicion: 100, exposedMinScore: 70 },
        confidence: { mediumFrom: 40, highFrom: 75 },
        suspicion: {
            lingerSeconds: 10,
            lingerAmount: 8,
            earlyPreserveFraction: 0.5,
            earlyEssentialAmount: 15,
            freePreservePanelOpens: 2,
            preservePanelAmount: 5,
            crewMessages: [
                { at: 30, text: 'm30' },
                { at: 60, text: 'm60' },
                { at: 90, text: 'm90' }
            ],
            carryOverFactor: 0.5,
            maxCarriedSuspicion: 40
        },
        reputation: { byEnding: { exposed: 4, leaked: 2, buried: -1, caught: -4 }, accuracyBonusPer: 25 }
    };
}

export function makeTestState(startingSuspicion = 0): GameState {
    return createGameState(makeTestSite(), makeTestRules(), startingSuspicion);
}
