import { describe, expect, it } from 'vitest';
import {
    addSuspicion,
    crewMessagesCrossed,
    discoverClue,
    isCaught,
    isSiteOver,
    openPreservePanel,
    placeOnTimeline,
    preserveClue,
    removeFromTimeline,
    slotsLeft,
    startInspecting,
    stopInspecting,
    tick,
    unpreserveClue,
    upcomingWave
} from './state';
import { makeTestRules, makeTestState } from './testSite';
import type { ActionResult, GameState } from './types';

const fresh = () => makeTestState();

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
        expect(s.timeline).toEqual({});
    });

    it('starts with carried-over suspicion, clamped', () => {
        expect(makeTestState(25).suspicion).toBe(25);
        expect(makeTestState(25).startingSuspicion).toBe(25);
        expect(makeTestState(250).suspicion).toBe(100);
        expect(makeTestState(Number.NaN).suspicion).toBe(0);
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
        expect(discoverClue(tick(fresh(), 30), 'a')).toMatchObject({ ok: false, reason: 'destroyed' });
    });

    it('fails once cleanup is over', () => {
        expect(discoverClue(tick(fresh(), 100), 'd')).toMatchObject({ ok: false, reason: 'cleanup-over' });
    });
});

describe('placeOnTimeline / removeFromTimeline', () => {
    const base = () => discoverAll(fresh(), ['a', 'b', 'c']);

    it('puts clues into slots, several per slot allowed', () => {
        let s = ok(placeOnTimeline(base(), 'a', 0));
        s = ok(placeOnTimeline(s, 'b', 0));
        s = ok(placeOnTimeline(s, 'c', 3));
        expect(s.timeline).toEqual({ a: 0, b: 0, c: 3 });
    });

    it('moves a clue that is already placed', () => {
        let s = ok(placeOnTimeline(base(), 'a', 0));
        s = ok(placeOnTimeline(s, 'a', 2));
        expect(s.timeline).toEqual({ a: 2 });
    });

    it('rejects slots outside the truth events', () => {
        for (const slot of [-1, 4, 1.5, Number.NaN]) {
            expect(placeOnTimeline(base(), 'a', slot)).toMatchObject({ ok: false, reason: 'invalid-slot' });
        }
    });

    it('fails for undiscovered or unknown clues', () => {
        expect(placeOnTimeline(base(), 'd', 0)).toMatchObject({ ok: false, reason: 'not-discovered' });
        expect(placeOnTimeline(base(), 'zz', 0)).toMatchObject({ ok: false, reason: 'unknown-clue' });
    });

    it('still allows placing a discovered clue after it is destroyed', () => {
        expect(ok(placeOnTimeline(tick(base(), 30), 'a', 0)).timeline).toEqual({ a: 0 });
    });

    it('removes a clue, and removing an unplaced clue is a no-op', () => {
        const s = ok(placeOnTimeline(base(), 'a', 1));
        expect(removeFromTimeline(s, 'a').timeline).toEqual({});
        expect(removeFromTimeline(s, 'b')).toBe(s);
    });
});

describe('preserveClue', () => {
    it('preserves a discovered clue once', () => {
        let s = discoverAll(fresh(), ['b']);
        s = ok(preserveClue(s, 'b'));
        s = ok(preserveClue(s, 'b'));
        expect(s.preservedClueIds).toEqual(['b']);
        expect(slotsLeft(s)).toBe(1);
    });

    it('fails when all slots are full', () => {
        let s = discoverAll(fresh(), ['a', 'c', 'd']);
        s = ok(preserveClue(s, 'a'));
        s = ok(preserveClue(s, 'c'));
        expect(preserveClue(s, 'd')).toMatchObject({ ok: false, reason: 'slots-full' });
    });

    it('fails for destroyed, undiscovered and unknown clues', () => {
        expect(preserveClue(tick(discoverAll(fresh(), ['a']), 30), 'a')).toMatchObject({ reason: 'destroyed' });
        expect(preserveClue(fresh(), 'b')).toMatchObject({ ok: false, reason: 'not-discovered' });
        expect(preserveClue(fresh(), 'zz')).toMatchObject({ ok: false, reason: 'unknown-clue' });
    });

    it('fails once cleanup is over', () => {
        const s = tick(discoverAll(fresh(), ['d']), 100);
        expect(preserveClue(s, 'd')).toMatchObject({ ok: false, reason: 'cleanup-over' });
    });

    it('raises suspicion for a second essential clue preserved early', () => {
        let s = discoverAll(fresh(), ['b', 'd']);
        s = ok(preserveClue(s, 'b'));
        expect(s.suspicion).toBe(0);
        s = ok(preserveClue(s, 'd'));
        expect(s.suspicion).toBe(15);
        expect(s.suspicionLog[s.suspicionLog.length - 1].reason).toBe('early-essential');
    });

    it('does not raise suspicion for the same thing done late', () => {
        let s = tick(discoverAll(fresh(), ['d']), 50); // halfway = no longer early
        s = { ...s, preservedClueIds: ['b'] };
        expect(ok(preserveClue(s, 'd')).suspicion).toBe(0);
    });
});

describe('unpreserveClue', () => {
    it('frees the slot', () => {
        let s = ok(preserveClue(discoverAll(fresh(), ['c']), 'c'));
        s = ok(unpreserveClue(s, 'c'));
        expect(s.preservedClueIds).toEqual([]);
        expect(s.destroyedClueIds).toEqual([]);
    });

    it('burns the clue at once if its wave has already passed', () => {
        let s = ok(preserveClue(discoverAll(fresh(), ['c']), 'c'));
        s = tick(s, 60);
        expect(s.destroyedClueIds).toEqual(['a', 'b']);
        s = ok(unpreserveClue(s, 'c'));
        expect(s.destroyedClueIds).toEqual(['a', 'b', 'c']);
    });

    it('is a no-op for clues that are not preserved, and fails after cleanup', () => {
        const s = discoverAll(fresh(), ['c']);
        expect(ok(unpreserveClue(s, 'c'))).toBe(s);
        expect(unpreserveClue(tick(s, 100), 'c')).toMatchObject({ ok: false, reason: 'cleanup-over' });
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

    it('spares preserved clues and keeps logged ones logged', () => {
        let s = discoverAll(fresh(), ['a', 'b']);
        s = ok(preserveClue(s, 'b'));
        s = tick(s, 60);
        expect(s.destroyedClueIds).toEqual(['a', 'c']);
        expect(s.discoveredClueIds).toEqual(['a', 'b']);
    });
});

describe('lingering on a clue', () => {
    it('adds suspicion for each full 10 seconds of one open inspection', () => {
        let s = startInspecting(fresh(), 'd');
        s = tick(s, 9.5);
        expect(s.suspicion).toBe(0);
        s = tick(s, 0.5);
        expect(s.suspicion).toBe(8);
        s = tick(s, 25);
        expect(s.suspicion).toBe(24);
        expect(s.suspicionLog.every((e) => e.reason === 'linger')).toBe(true);
    });

    it('resets when closed or when a different clue is opened', () => {
        let s = tick(startInspecting(fresh(), 'd'), 9);
        s = tick(startInspecting(stopInspecting(s), 'd'), 9);
        expect(s.suspicion).toBe(0);
        s = tick(startInspecting(s, 'c'), 9);
        expect(s.suspicion).toBe(0);
    });

    it('does not restart when the same clue is opened again', () => {
        let s = tick(startInspecting(fresh(), 'd'), 9);
        s = tick(startInspecting(s, 'd'), 1);
        expect(s.suspicion).toBe(8);
    });
});

describe('openPreservePanel', () => {
    it('is free for the first opens, then costs suspicion each time', () => {
        let s = openPreservePanel(openPreservePanel(fresh()));
        expect(s.suspicion).toBe(0);
        s = openPreservePanel(s);
        expect(s.suspicion).toBe(5);
        s = openPreservePanel(s);
        expect(s.suspicion).toBe(10);
        expect(s.preservePanelOpens).toBe(4);
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
        const s = addSuspicion(fresh(), 15, 'test');
        expect(s.suspicion).toBe(15);
        expect(s.suspicionLog).toEqual([{ amount: 15, reason: 'test' }]);
    });

    it('clamps to 0-100 and logs the applied amount', () => {
        let s = addSuspicion(fresh(), 90, 'x');
        s = addSuspicion(s, 30, 'y');
        expect(s.suspicion).toBe(100);
        expect(s.suspicionLog[1].amount).toBe(10);
        expect(addSuspicion(s, -150, 'z').suspicion).toBe(0);
    });

    it('ignores zero and non-finite amounts', () => {
        const s = fresh();
        expect(addSuspicion(s, 0, 'x')).toBe(s);
        expect(addSuspicion(s, Number.NaN, 'x')).toBe(s);
    });

    it('reaching 100 means caught, which ends the site', () => {
        expect(isCaught(addSuspicion(fresh(), 99, 'x'))).toBe(false);
        expect(isCaught(addSuspicion(fresh(), 100, 'x'))).toBe(true);
        expect(isSiteOver(addSuspicion(fresh(), 100, 'x'))).toBe(true);
    });

    it('the site is also over when the timer runs out', () => {
        expect(isSiteOver(tick(fresh(), 99))).toBe(false);
        expect(isSiteOver(tick(fresh(), 100))).toBe(true);
    });
});

describe('crewMessagesCrossed', () => {
    const rules = makeTestRules();
    it('returns each threshold crossed, once', () => {
        expect(crewMessagesCrossed(0, 29, rules)).toEqual([]);
        expect(crewMessagesCrossed(29, 30, rules)).toEqual(['m30']);
        expect(crewMessagesCrossed(30, 45, rules)).toEqual([]);
        expect(crewMessagesCrossed(10, 95, rules)).toEqual(['m30', 'm60', 'm90']);
    });
});
