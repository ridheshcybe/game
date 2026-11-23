// Plain TypeScript: no Phaser imports allowed in src/core/.
import { ENDINGS, type Ending, type Rules } from './types';
import { arr, num, obj, str } from './validate';

const nonNeg = (raw: Record<string, unknown>, key: string, path: string): number => {
    const v = num(raw, key, path);
    if (v < 0) throw new Error(`${path}.${key} must be >= 0`);
    return v;
};

/** Validates src/data/rules.json. */
export function parseRules(value: unknown): Rules {
    const raw = obj(value, 'rules');

    const e = obj(raw.endings, 'rules.endings');
    const c = obj(raw.confidence, 'rules.confidence');
    const s = obj(raw.suspicion, 'rules.suspicion');
    const r = obj(raw.reputation, 'rules.reputation');
    const byEndingRaw = obj(r.byEnding, 'rules.reputation.byEnding');

    const confidence = {
        mediumFrom: nonNeg(c, 'mediumFrom', 'rules.confidence'),
        highFrom: nonNeg(c, 'highFrom', 'rules.confidence')
    };
    if (confidence.highFrom <= confidence.mediumFrom) {
        throw new Error('rules.confidence.highFrom must be above mediumFrom');
    }

    const lingerSeconds = num(s, 'lingerSeconds', 'rules.suspicion');
    if (lingerSeconds <= 0) throw new Error('rules.suspicion.lingerSeconds must be > 0');
    const accuracyBonusPer = num(r, 'accuracyBonusPer', 'rules.reputation');
    if (accuracyBonusPer <= 0) throw new Error('rules.reputation.accuracyBonusPer must be > 0');

    const byEnding = {} as Record<Ending, number>;
    for (const ending of ENDINGS) byEnding[ending] = num(byEndingRaw, ending, 'rules.reputation.byEnding');

    return {
        waveWarningSeconds: nonNeg(raw, 'waveWarningSeconds', 'rules'),
        endings: {
            caughtAtSuspicion: nonNeg(e, 'caughtAtSuspicion', 'rules.endings'),
            exposedMinScore: nonNeg(e, 'exposedMinScore', 'rules.endings')
        },
        confidence,
        suspicion: {
            lingerSeconds,
            lingerAmount: nonNeg(s, 'lingerAmount', 'rules.suspicion'),
            earlyPreserveFraction: nonNeg(s, 'earlyPreserveFraction', 'rules.suspicion'),
            earlyEssentialAmount: nonNeg(s, 'earlyEssentialAmount', 'rules.suspicion'),
            freePreservePanelOpens: nonNeg(s, 'freePreservePanelOpens', 'rules.suspicion'),
            preservePanelAmount: nonNeg(s, 'preservePanelAmount', 'rules.suspicion'),
            crewMessages: arr(s.crewMessages, 'rules.suspicion.crewMessages').map((m, i) => {
                const path = `rules.suspicion.crewMessages[${i}]`;
                const mr = obj(m, path);
                return { at: nonNeg(mr, 'at', path), text: str(mr, 'text', path) };
            }),
            carryOverFactor: nonNeg(s, 'carryOverFactor', 'rules.suspicion'),
            maxCarriedSuspicion: nonNeg(s, 'maxCarriedSuspicion', 'rules.suspicion')
        },
        reputation: { byEnding, accuracyBonusPer }
    };
}
