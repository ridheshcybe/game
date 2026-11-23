// Plain TypeScript: no Phaser imports allowed in src/core/.
import { ENDINGS, type Ending } from './types';
import { arr, obj, str } from './validate';

export interface EndingText {
    name: string;
    narrative: string;
}

/** A campaign ending. It applies when every condition it sets is met. */
export interface CampaignEnding extends EndingText {
    id: string;
    minReputation?: number;
    maxReputation?: number;
    minTotalSuspicion?: number;
    maxTotalSuspicion?: number;
}

export interface Endings {
    site: Record<Ending, EndingText>;
    /** Checked in order; the first match wins. The last one has no conditions. */
    campaign: CampaignEnding[];
}

const CONDITIONS = ['minReputation', 'maxReputation', 'minTotalSuspicion', 'maxTotalSuspicion'] as const;

/** Validates src/data/endings.json. */
export function parseEndings(value: unknown): Endings {
    const raw = obj(value, 'endings');
    const siteRaw = obj(raw.site, 'endings.site');
    const site = {} as Record<Ending, EndingText>;
    for (const ending of ENDINGS) {
        const path = `endings.site.${ending}`;
        const e = obj(siteRaw[ending], path);
        site[ending] = { name: str(e, 'name', path), narrative: str(e, 'narrative', path) };
    }

    const campaign = arr(raw.campaign, 'endings.campaign').map((c, i): CampaignEnding => {
        const path = `endings.campaign[${i}]`;
        const e = obj(c, path);
        const ending: CampaignEnding = { id: str(e, 'id', path), name: str(e, 'name', path), narrative: str(e, 'narrative', path) };
        for (const key of CONDITIONS) {
            const v = e[key];
            if (v === undefined) continue;
            if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`${path}.${key} must be a number`);
            ending[key] = v;
        }
        return ending;
    });
    const last = campaign[campaign.length - 1];
    if (!last || CONDITIONS.some((k) => last[k] !== undefined)) {
        throw new Error('endings.campaign must end with an ending that has no conditions (the fallback)');
    }
    return { site, campaign };
}

export function campaignEndingMatches(e: CampaignEnding, reputation: number, totalSuspicion: number): boolean {
    return (
        (e.minReputation === undefined || reputation >= e.minReputation) &&
        (e.maxReputation === undefined || reputation <= e.maxReputation) &&
        (e.minTotalSuspicion === undefined || totalSuspicion >= e.minTotalSuspicion) &&
        (e.maxTotalSuspicion === undefined || totalSuspicion <= e.maxTotalSuspicion)
    );
}
