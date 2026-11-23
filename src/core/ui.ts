// Plain TypeScript: no Phaser imports allowed in src/core/.
import { obj, strings } from './validate';

const KEYS = {
    hud: ['timeLabel', 'suspicionLabel', 'slotsLabel'],
    investigation: [
        'loggedCount', 'locationLabel', 'logClue', 'logged', 'close', 'openTimeline', 'waveWarning',
        'burnedTag', 'loggedTag', 'tutorialTitle', 'tutorialBody', 'tutorialDismiss'
    ],
    timeline: [
        'tabTimeline', 'tabPreserve', 'trayLabel', 'slotLabel', 'confidenceLabel', 'confidenceLow',
        'confidenceMedium', 'confidenceHigh', 'back', 'submit', 'slotsLeft', 'preserveHint',
        'preserveAction', 'preservedTag', 'noSlots', 'emptyPreserve', 'cleanupOver'
    ],
    results: [
        'accuracy', 'savedLabel', 'lostLabel', 'none', 'suspicion', 'reputation', 'restart',
        'nextSite', 'campaignSummary'
    ],
    missionSelect: ['title', 'totals', 'notAttempted', 'completed', 'newCampaign', 'campaignComplete', 'back']
} as const;

type Keys = typeof KEYS;
export type UiText = { [S in keyof Keys]: Record<Keys[S][number], string> };

/** Validates src/data/ui.json. Throws if any expected string is missing. */
export function parseUiText(value: unknown): UiText {
    const raw = obj(value, 'ui');
    const out = {} as Record<string, unknown>;
    for (const [section, keys] of Object.entries(KEYS)) {
        out[section] = strings(raw[section], keys, `ui.${section}`);
    }
    return out as UiText;
}
