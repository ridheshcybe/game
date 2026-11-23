// Plain TypeScript: no Phaser imports allowed in src/core/.
import { obj, strings } from './validate';

const INVESTIGATION_KEYS = [
    'timeLabel',
    'suspicionLabel',
    'slotsLabel',
    'loggedCount',
    'locationLabel',
    'logClue',
    'logged',
    'close',
    'openTimeline',
    'waveWarning',
    'cleanupComplete',
    'burnedTag',
    'loggedTag'
] as const;

const TIMELINE_BOARD_KEYS = ['title', 'notBuilt', 'loggedCount', 'back'] as const;

export interface UiText {
    investigation: Record<(typeof INVESTIGATION_KEYS)[number], string>;
    timelineBoard: Record<(typeof TIMELINE_BOARD_KEYS)[number], string>;
}

/** Validates src/data/ui.json. Throws if any expected string is missing. */
export function parseUiText(value: unknown): UiText {
    const raw = obj(value, 'ui');
    return {
        investigation: strings(raw.investigation, INVESTIGATION_KEYS, 'ui.investigation'),
        timelineBoard: strings(raw.timelineBoard, TIMELINE_BOARD_KEYS, 'ui.timelineBoard')
    };
}
