import { describe, expect, it } from 'vitest';
import gameData from '../data/game.json';
import { parseGameInfo } from './gameInfo';

describe('parseGameInfo', () => {
    it('accepts the shipped game.json', () => {
        expect(parseGameInfo(gameData).title).toBe('AFTER-ACTION');
    });

    it('rejects non-objects', () => {
        expect(() => parseGameInfo(null)).toThrow();
        expect(() => parseGameInfo('AFTER-ACTION')).toThrow();
    });

    it('rejects missing or empty fields', () => {
        expect(() => parseGameInfo({ ...gameData, title: '' })).toThrow(/title/);
        expect(() => parseGameInfo({ ...gameData, startLabel: undefined })).toThrow(/startLabel/);
    });
});
