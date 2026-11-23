import { describe, expect, it } from 'vitest';
import {
    addSuspicion,
    createGameState,
    discoverClue,
    placeOnTimeline,
    preserveClue,
    tick,
    upcomingWave
} from './state';
import { makeTestSite } from './testSite';
import type { ActionResult, GameState } from './types';

const fresh = () => createGameState(makeTestSite());

/** Unwraps a result that must succeed. */
function ok(result: ActionResult): GameState {
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`);
    return result.state;
}

function discoverAll(state: GameState, ids: string[]): GameState {
    return ids.reduce((s, id) => ok(discoverClue(s, id)), state);
}

describe('createGameState', () => {
    it('starts empty with the full timer', () => {
        const s = fresh();
        expect(s.timeRemaining).toBe(100);
        expect(s.suspicion).toBe(0);
        expect(s.discoveredClueIds).toEqual([]);
        expect(s.timeline).toEqual([]);
    });
});

describe('discoverClue', () => {
    it('adds the clue once and does not mutate the input', () => {
        const s0 = fresh();
        const s1 = ok(discoverClue(s0, 'a'));
        const s2 = ok(discoverClue(s1, 'a'));
        expect(s1.discoveredClueIds).toEqual(['a']);
        expect(s2.discoveredClueIds).toEqual(['a']);
        expect(s0.discoveredClueIds).toEqual([]);
    });

    it('fails for unknown clues', () => {
        expect(discoverClue(fresh(), 'nope')).toMatchObject({ ok: false, reason: 'unknown-clue' });
    });

    it('fails for destroyed clues', () => {
        const s = tick(fresh(), 30);
        expect(discoverClue(s, 'a')).toMatchObject({ ok: false, reason: 'destroyed' });
    });

    it('fails once cleanup is over', () => {
        const s = tick(fresh(), 100);
        expect(discoverClue(s, 'd')).toMatchObject({ ok: false, reason: 'cleanup-over' });
    });
});

describe('placeOnTimeline', () => {
    const base = () => discoverAll(fresh(), ['a', 'b', 'c']);

    it('inserts at the given position', () => {
        let s = ok(placeOnTimeline(base(), 'a', 0));
        s = ok(placeOnTimeline(s, 'c', 1));
        s = ok(placeOnTimeline(s, 'b', 1));
        expect(s.timeline).toEqual(['a', 'b', 'c']);
    });

    it('moves a clue that is already placed', () => {
        let s = base();
        for (const id of ['a', 'b', 'c']) s = ok(placeOnTimeline(s, id, 99));
        s = ok(placeOnTimeline(s, 'c', 0));
        expect(s.timeline).toEqual(['c', 'a', 'b']);
    });

    it('clamps out-of-range positions', () => {
        let s = ok(placeOnTimeline(base(), 'a', -5));
        s = ok(placeOnTimeline(s, 'b', 50));
        s = ok(placeOnTimeline(s, 'c', Number.NaN));
        expect(s.timeline).toEqual(['a', 'b', 'c']);
    });

    it('fails for undiscovered or unknown clues', () => {
        expect(placeOnTimeline(base(), 'd', 0)).toMatchObject({ ok: false, reason: 'not-discovered' });
        expect(placeOnTimeline(base(), 'zz', 0)).toMatchObject({ ok: false, reason: 'unknown-clue' });
    });

    it('still allows placing a discovered clue after it is destroyed', () => {
        const s = tick(base(), 30);
        expect(ok(placeOnTimeline(s, 'a', 0)).timeline).toEqual(['a']);
    });
});

describe('preserveClue', () => {
    it('preserves a discovered clue once', () => {
        let s = discoverAll(fresh(), ['b']);
        s = ok(preserveClue(s, 'b'));
        s = ok(preserveClue(s, 'b'));
        expect(s.preservedClueIds).toEqual(['b']);
    });

    it('fails when all slots are full', () => {
        let s = discoverAll(fresh(), ['b', 'c', 'd']);
        s = ok(preserveClue(s, 'b'));
        s = ok(preserveClue(s, 'c'));
        expect(preserveClue(s, 'd')).toMatchObject({ ok: false, reason: 'slots-full' });
    });

    it('fails for destroyed clues', () => {
        const s = tick(discoverAll(fresh(), ['a']), 30);
        expect(preserveClue(s, 'a')).toMatchObject({ ok: false, reason: 'destroyed' });
    });

    it('fails for undiscovered and unknown clues', () => {
        expect(preserveClue(fresh(), 'b')).toMatchObject({ ok: false, reason: 'not-discovered' });
        expect(preserveClue(fresh(), 'zz')).toMatchObject({ ok: false, reason: 'unknown-clue' });
    });

    it('fails once cleanup is over', () => {
        const s = tick(discoverAll(fresh(), ['d']), 100);
        expect(preserveClue(s, 'd')).toMatchObject({ ok: false, reason: 'cleanup-over' });
    });
});

describe('tick', () => {
    it('counts down and stops at zero', () => {
        expect(tick(fresh(), 10).timeRemaining).toBe(90);
        expect(tick(fresh(), 500).timeRemaining).toBe(0);
    });

    it('ignores zero, negative and NaN dt', () => {
        const s = fresh();
        expect(tick(s, 0)).toBe(s);
        expect(tick(s, -5)).toBe(s);
        expect(tick(s, Number.NaN)).toBe(s);
    });

    it('destroys clues when their wave time is reached', () => {
        let s = tick(fresh(), 29);
        expect(s.destroyedClueIds).toEqual([]);
        s = tick(s, 1);
        expect(s.destroyedClueIds).toEqual(['a']);
        s = tick(s, 30);
        expect(s.destroyedClueIds).toEqual(['a', 'b', 'c']);
    });

    it('fires every wave passed in one big step', () => {
        expect(tick(fresh(), 75).destroyedClueIds).toEqual(['a', 'b', 'c']);
    });

    it('spares preserved clues', () => {
        let s = discoverAll(fresh(), ['b']);
        s = ok(preserveClue(s, 'b'));
        s = tick(s, 60);
        expect(s.destroyedClueIds).toEqual(['a', 'c']);
    });

    it('removes destroyed clues from what can be discovered but keeps logged ones', () => {
        let s = discoverAll(fresh(), ['a']);
        s = tick(s, 30);
        expect(s.discoveredClueIds).toEqual(['a']);
        expect(s.destroyedClueIds).toEqual(['a']);
    });
});

describe('upcomingWave', () => {
    it('reports the next wave and the clues it will burn', () => {
        const w = upcomingWave(tick(fresh(), 25));
        expect(w?.wave.atSecond).toBe(30);
        expect(w?.secondsUntil).toBe(5);
        expect(w?.threatenedClueIds).toEqual(['a']);
    });

    it('respects the warning window', () => {
        expect(upcomingWave(fresh(), 10)).toBeNull();
        expect(upcomingWave(tick(fresh(), 20), 10)?.secondsUntil).toBe(10);
    });

    it('excludes preserved clues and returns null after the last wave', () => {
        let s = discoverAll(fresh(), ['b']);
        s = ok(preserveClue(s, 'b'));
        s = tick(s, 40);
        expect(upcomingWave(s)?.threatenedClueIds).toEqual(['c']);
        expect(upcomingWave(tick(s, 30))).toBeNull();
    });
});

describe('addSuspicion', () => {
    it('adds and logs the reason', () => {
        const s = addSuspicion(fresh(), 15, 'seen pocketing evidence');
        expect(s.suspicion).toBe(15);
        expect(s.suspicionLog).toEqual([{ amount: 15, reason: 'seen pocketing evidence' }]);
    });

    it('clamps to 0-100 and logs the applied amount', () => {
        let s = addSuspicion(fresh(), 90, 'x');
        s = addSuspicion(s, 30, 'y');
        expect(s.suspicion).toBe(100);
        expect(s.suspicionLog[1].amount).toBe(10);
        s = addSuspicion(s, -150, 'z');
        expect(s.suspicion).toBe(0);
    });

    it('ignores zero and non-finite amounts', () => {
        const s = fresh();
        expect(addSuspicion(s, 0, 'x')).toBe(s);
        expect(addSuspicion(s, Number.NaN, 'x')).toBe(s);
    });
});
