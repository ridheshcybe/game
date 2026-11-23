import { describe, expect, it } from 'vitest';
import { buildSiteResult, confidenceLevel, evaluateEnding, scoreTimeline } from './scoring';
import { addSuspicion } from './state';
import { makeTestSite, makeTestState } from './testSite';
import type { GameState } from './types';

const site = makeTestSite();
const withState = (patch: Partial<GameState>): GameState => ({ ...makeTestState(), ...patch });
const perfect = { a: 0, b: 1, c: 2, d: 3 };

describe('scoreTimeline', () => {
    it('is 100 when every clue is in its true slot', () => {
        expect(scoreTimeline(withState({ timeline: perfect }), site)).toBe(100);
    });

    it('is 0 for the reversed order or an empty timeline', () => {
        expect(scoreTimeline(withState({ timeline: { a: 3, b: 2, c: 1, d: 0 } }), site)).toBe(0);
        expect(scoreTimeline(withState({ timeline: {} }), site)).toBe(0);
    });

    it('gives partial credit by pairs', () => {
        // 6 pairs; a and b swapped breaks one pair.
        expect(scoreTimeline(withState({ timeline: { a: 1, b: 0, c: 2, d: 3 } }), site)).toBe(83);
        // a and b in the same slot: their pair is wrong, the rest are right.
        expect(scoreTimeline(withState({ timeline: { a: 0, b: 0, c: 2, d: 3 } }), site)).toBe(83);
    });

    it('counts missing clues against the score', () => {
        expect(scoreTimeline(withState({ timeline: { a: 0, b: 1 } }), site)).toBe(17);
    });

    it('rewards clues from the same event sharing a slot', () => {
        const twin = { ...site.clues[0], id: 'a2' };
        const s2 = makeTestSite({ clues: [...site.clues, twin] });
        const state = { ...makeTestState(), site: s2 };
        expect(scoreTimeline({ ...state, timeline: { ...perfect, a2: 0 } }, s2)).toBe(100);
        expect(scoreTimeline({ ...state, timeline: { ...perfect, a2: 1 } }, s2)).toBeLessThan(100);
    });
});

describe('confidenceLevel', () => {
    it('maps the score to a vague level', () => {
        expect(confidenceLevel(withState({ timeline: {} }))).toBe('low');
        expect(confidenceLevel(withState({ timeline: { a: 0, b: 1, c: 2 } }))).toBe('medium'); // 50
        expect(confidenceLevel(withState({ timeline: perfect }))).toBe('high');
    });
});

describe('evaluateEnding', () => {
    it('exposed: all essential clues preserved and a good timeline', () => {
        expect(evaluateEnding(withState({ timeline: perfect, preservedClueIds: ['b', 'd'] }), site)).toBe('exposed');
    });

    it('leaked: all essential preserved but a poor timeline', () => {
        expect(evaluateEnding(withState({ timeline: {}, preservedClueIds: ['b', 'd'] }), site)).toBe('leaked');
    });

    it('leaked: only some essential evidence preserved', () => {
        expect(evaluateEnding(withState({ timeline: perfect, preservedClueIds: ['b', 'c'] }), site)).toBe('leaked');
    });

    it('buried: no essential evidence preserved, even with a perfect timeline', () => {
        expect(evaluateEnding(withState({ timeline: perfect, preservedClueIds: ['a', 'c'] }), site)).toBe('buried');
    });

    it('caught: suspicion at the limit beats everything else', () => {
        const s = withState({ timeline: perfect, preservedClueIds: ['b', 'd'] });
        expect(evaluateEnding(addSuspicion(s, 100, 'x'), site)).toBe('caught');
        expect(evaluateEnding(addSuspicion(s, 99, 'x'), site)).toBe('exposed');
    });

    it('accepts custom thresholds', () => {
        const s = withState({ timeline: { a: 1, b: 0, c: 2, d: 3 }, preservedClueIds: ['b', 'd'], suspicion: 50 });
        expect(evaluateEnding(s, site, { caughtAtSuspicion: 50, exposedMinScore: 0 })).toBe('caught');
        expect(evaluateEnding(s, site, { caughtAtSuspicion: 100, exposedMinScore: 90 })).toBe('leaked');
    });
});

describe('buildSiteResult', () => {
    it('summarises an exposed run', () => {
        const s = withState({ timeline: perfect, preservedClueIds: ['b', 'd'], suspicion: 30, startingSuspicion: 10 });
        expect(buildSiteResult(s)).toEqual({
            siteId: 'test',
            ending: 'exposed',
            accuracy: 100,
            savedEssentialIds: ['b', 'd'],
            lostEssentialIds: [],
            finalSuspicion: 30,
            suspicionGained: 20,
            reputationGained: 4 + 4
        });
    });

    it('gives no accuracy bonus when caught and lists lost evidence', () => {
        const r = buildSiteResult(withState({ timeline: perfect, preservedClueIds: ['b'], suspicion: 100 }));
        expect(r.ending).toBe('caught');
        expect(r.reputationGained).toBe(-4);
        expect(r.lostEssentialIds).toEqual(['d']);
    });
});
