import { describe, expect, it } from 'vitest';
import { evaluateEnding, scoreTimeline } from './scoring';
import { addSuspicion, createGameState } from './state';
import { makeTestSite } from './testSite';
import type { Clue, GameState } from './types';

const site = makeTestSite();
const withState = (patch: Partial<GameState>): GameState => ({ ...createGameState(site), ...patch });

describe('scoreTimeline', () => {
    it('is 100 for the true order', () => {
        expect(scoreTimeline(withState({ timeline: ['a', 'b', 'c', 'd'] }), site)).toBe(100);
    });

    it('is 0 for the reversed order or an empty timeline', () => {
        expect(scoreTimeline(withState({ timeline: ['d', 'c', 'b', 'a'] }), site)).toBe(0);
        expect(scoreTimeline(withState({ timeline: [] }), site)).toBe(0);
    });

    it('scores partly correct orders by pairs', () => {
        // 6 pairs; swapping a and b breaks exactly one.
        expect(scoreTimeline(withState({ timeline: ['b', 'a', 'c', 'd'] }), site)).toBe(83);
    });

    it('counts missing clues against the score', () => {
        // Only a<b placed: 1 of 6 pairs correct.
        expect(scoreTimeline(withState({ timeline: ['a', 'b'] }), site)).toBe(17);
    });

    it('ignores pairs from the same truth event and unknown ids', () => {
        const twin: Clue = { ...site.clues[0], id: 'a2' };
        const s2 = makeTestSite({ clues: [...site.clues, twin] });
        const state = { ...createGameState(s2), timeline: ['a2', 'a', 'x', 'b', 'c', 'd'] };
        expect(scoreTimeline(state, s2)).toBe(100);
    });
});

describe('evaluateEnding', () => {
    const goodTimeline = ['a', 'b', 'c', 'd'];

    it('exposed: all essential clues preserved and a good timeline', () => {
        expect(evaluateEnding(withState({ timeline: goodTimeline, preservedClueIds: ['b', 'd'] }), site)).toBe('exposed');
    });

    it('leaked: all essential preserved but a poor timeline', () => {
        expect(evaluateEnding(withState({ timeline: ['d', 'c', 'b', 'a'], preservedClueIds: ['b', 'd'] }), site)).toBe('leaked');
    });

    it('leaked: only some essential evidence preserved', () => {
        expect(evaluateEnding(withState({ timeline: goodTimeline, preservedClueIds: ['b', 'c'] }), site)).toBe('leaked');
    });

    it('buried: no essential evidence preserved, even with a perfect timeline', () => {
        expect(evaluateEnding(withState({ timeline: goodTimeline, preservedClueIds: ['a', 'c'] }), site)).toBe('buried');
    });

    it('caught: high suspicion beats everything else', () => {
        const s = addSuspicion(withState({ timeline: goodTimeline, preservedClueIds: ['b', 'd'] }), 80, 'x');
        expect(evaluateEnding(s, site)).toBe('caught');
        expect(evaluateEnding(addSuspicion(s, -1, 'y'), site)).toBe('exposed');
    });

    it('accepts custom thresholds', () => {
        const s = withState({ timeline: ['b', 'a', 'c', 'd'], preservedClueIds: ['b', 'd'], suspicion: 50 });
        expect(evaluateEnding(s, site, { caughtAtSuspicion: 50, exposedMinScore: 0 })).toBe('caught');
        expect(evaluateEnding(s, site, { caughtAtSuspicion: 100, exposedMinScore: 90 })).toBe('leaked');
    });
});
