import { describe, expect, it } from 'vitest';
import uiData from '../data/ui.json';
import { formatText, formatTime } from './text';
import { parseUiText } from './ui';

describe('formatText', () => {
    it('fills placeholders and leaves unknown ones', () => {
        expect(formatText('{a} of {b} {c}', { a: 1, b: 'two' })).toBe('1 of two {c}');
    });
});

describe('formatTime', () => {
    it('formats as m:ss, rounding up', () => {
        expect(formatTime(180)).toBe('3:00');
        expect(formatTime(59.2)).toBe('1:00');
        expect(formatTime(9)).toBe('0:09');
        expect(formatTime(-3)).toBe('0:00');
    });
});

describe('parseUiText', () => {
    it('accepts the shipped ui.json', () => {
        expect(parseUiText(uiData).investigation.logClue).toBe('Log clue');
    });

    it('rejects a missing string', () => {
        const bad = { ...uiData, investigation: { ...uiData.investigation, close: '' } };
        expect(() => parseUiText(bad)).toThrow(/close/);
    });
});
