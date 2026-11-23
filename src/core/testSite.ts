// Small, hand-checkable site used by unit tests. Not game content.
import type { Clue, Site } from './types';

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
