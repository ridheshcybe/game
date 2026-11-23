// Campaign persistence in localStorage. Storage can be blocked (private mode, sandboxed
// iframes), so every access is guarded and an in-memory copy keeps the session working.
import { loadCampaign, serializeCampaign, type CampaignProgress } from './core/campaign';

const KEY = 'after-action.campaign';
let current: CampaignProgress | null = null;

export function loadProgress(): CampaignProgress {
    if (current) return current;
    let text: string | null = null;
    try {
        text = window.localStorage.getItem(KEY);
    } catch {
        text = null;
    }
    current = loadCampaign(text);
    return current;
}

export function saveProgress(progress: CampaignProgress): void {
    current = progress;
    try {
        window.localStorage.setItem(KEY, serializeCampaign(progress));
    } catch {
        // Keep playing with the in-memory copy.
    }
}
