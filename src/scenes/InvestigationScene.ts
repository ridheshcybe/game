import { GameObjects, Scene } from 'phaser';
import siteData from '../data/site1.json';
import uiData from '../data/ui.json';
import { parseSite } from '../core/site';
import {
    WAVE_WARNING_SECONDS,
    createGameState,
    discoverClue,
    findClue,
    isDestroyed,
    isDiscovered,
    tick,
    upcomingWave
} from '../core/state';
import { formatText, formatTime } from '../core/text';
import type { Clue, GameState } from '../core/types';
import { parseUiText } from '../core/ui';
import { FONT, makeButton } from './ui';

const COLORS = {
    floor: 0x23262b,
    topBar: 0x111316,
    hotspot: 0x4a5568,
    hotspotHover: 0x6b7a90,
    hotspotStroke: 0x9aa5b1,
    logged: 0x2f5d4a,
    loggedStroke: 0x6fcf97,
    burned: 0x1a1a1a,
    burnedStroke: 0x5a3a2a,
    meterBack: 0x333333,
    meterFill: 0xc0392b,
    panel: 0x15181c,
    panelStroke: 0x9aa5b1,
    blocker: 0x000000
};

const TEXT_COLORS = {
    normal: '#e8e6e3',
    dim: '#8a8f98',
    burned: '#6b5a50',
    warning: '#ff6b5b'
};

const TOP_BAR_HEIGHT = 56;

interface Hotspot {
    clue: Clue;
    rect: GameObjects.Rectangle;
    label: GameObjects.Text;
}

export interface InvestigationData {
    /** Passed back from the timeline board so progress is kept. */
    state?: GameState;
}

export class InvestigationScene extends Scene {
    private state: GameState;
    private text = parseUiText(uiData).investigation;
    private hotspots: Hotspot[];
    private hoveredId: string | null;
    private panel: GameObjects.Container | null;
    private panelClueId: string | null;
    private panelLogButton: GameObjects.Text | null;

    private timerText: GameObjects.Text;
    private slotsText: GameObjects.Text;
    private meterFill: GameObjects.Rectangle;
    private warningText: GameObjects.Text;
    private loggedText: GameObjects.Text;

    constructor() {
        super('Investigation');
    }

    init(data: InvestigationData) {
        this.state = data.state ?? createGameState(parseSite(siteData));
        this.hotspots = [];
        this.hoveredId = null;
        this.panel = null;
        this.panelClueId = null;
        this.panelLogButton = null;
    }

    create() {
        const { width, height } = this.scale;
        this.add.rectangle(0, 0, width, height, COLORS.floor).setOrigin(0);

        for (const clue of this.state.site.clues) this.hotspots.push(this.makeHotspot(clue));

        this.makeTopBar(width);

        this.warningText = this.add
            .text(width / 2, TOP_BAR_HEIGHT + 22, '', { fontFamily: FONT, fontSize: '18px', color: TEXT_COLORS.warning })
            .setOrigin(0.5);

        this.loggedText = this.add
            .text(24, height - 40, '', { fontFamily: FONT, fontSize: '16px', color: TEXT_COLORS.dim })
            .setOrigin(0, 0.5);
        makeButton(this, width - 150, height - 40, 260, 44, this.text.openTimeline, () =>
            this.scene.start('TimelineBoard', { state: this.state })
        );

        this.refresh();
    }

    update(_time: number, delta: number) {
        this.state = tick(this.state, delta / 1000);
        if (this.panelClueId && isDestroyed(this.state, this.panelClueId)) this.closePanel();
        this.refresh();
    }

    private makeTopBar(width: number) {
        this.add.rectangle(0, 0, width, TOP_BAR_HEIGHT, COLORS.topBar).setOrigin(0);
        const style = { fontFamily: FONT, fontSize: '20px', color: TEXT_COLORS.normal };
        const mid = TOP_BAR_HEIGHT / 2;

        this.timerText = this.add.text(20, mid, '', style).setOrigin(0, 0.5);

        this.add.text(330, mid, this.text.suspicionLabel, style).setOrigin(0, 0.5);
        const meterX = 460;
        this.add.rectangle(meterX, mid, 200, 18, COLORS.meterBack).setOrigin(0, 0.5);
        this.meterFill = this.add.rectangle(meterX, mid, 200, 18, COLORS.meterFill).setOrigin(0, 0.5);

        this.slotsText = this.add.text(width - 20, mid, '', style).setOrigin(1, 0.5);
    }

    private makeHotspot(clue: Clue): Hotspot {
        const { x, y, w, h } = clue.hotspot;
        const rect = this.add
            .rectangle(x, y, w, h, COLORS.hotspot)
            .setOrigin(0)
            .setStrokeStyle(2, COLORS.hotspotStroke)
            .setInteractive({ useHandCursor: true });
        const label = this.add
            .text(x + w / 2, y + h / 2, '', {
                fontFamily: FONT,
                fontSize: '14px',
                color: TEXT_COLORS.normal,
                align: 'center',
                wordWrap: { width: w - 8 }
            })
            .setOrigin(0.5);

        rect.on('pointerover', () => (this.hoveredId = clue.id));
        rect.on('pointerout', () => {
            if (this.hoveredId === clue.id) this.hoveredId = null;
        });
        rect.on('pointerup', () => this.openPanel(clue.id));
        return { clue, rect, label };
    }

    /** Redraws everything that depends on game state. Cheap enough to run every frame. */
    private refresh() {
        const s = this.state;
        const t = this.text;

        for (const { clue, rect, label } of this.hotspots) {
            if (isDestroyed(s, clue.id)) {
                if (rect.input?.enabled) rect.disableInteractive();
                if (this.hoveredId === clue.id) this.hoveredId = null;
                rect.setFillStyle(COLORS.burned).setStrokeStyle(2, COLORS.burnedStroke);
                label.setText(`${clue.name}\n${t.burnedTag}`).setColor(TEXT_COLORS.burned);
                continue;
            }
            const logged = isDiscovered(s, clue.id);
            const hovered = this.hoveredId === clue.id;
            rect.setFillStyle(hovered ? COLORS.hotspotHover : logged ? COLORS.logged : COLORS.hotspot);
            rect.setStrokeStyle(hovered ? 3 : 2, logged ? COLORS.loggedStroke : COLORS.hotspotStroke);
            label.setText(logged ? `${clue.name}\n${t.loggedTag}` : clue.name).setColor(TEXT_COLORS.normal);
        }

        this.timerText.setText(formatText(t.timeLabel, { time: formatTime(s.timeRemaining) }));
        this.meterFill.width = 200 * (s.suspicion / 100);
        this.slotsText.setText(
            formatText(t.slotsLabel, { used: s.preservedClueIds.length, total: s.site.preservationSlots })
        );
        this.loggedText.setText(
            formatText(t.loggedCount, { count: s.discoveredClueIds.length, total: s.site.clues.length })
        );

        const wave = upcomingWave(s, WAVE_WARNING_SECONDS);
        if (s.timeRemaining <= 0) {
            this.warningText.setText(t.cleanupComplete);
        } else if (wave && wave.threatenedClueIds.length > 0) {
            this.warningText.setText(
                formatText(t.waveWarning, {
                    seconds: Math.ceil(wave.secondsUntil),
                    count: wave.threatenedClueIds.length
                })
            );
        } else {
            this.warningText.setText('');
        }

        if (this.panelClueId && this.panelLogButton) {
            this.panelLogButton.setText(isDiscovered(s, this.panelClueId) ? t.logged : t.logClue);
        }
    }

    private openPanel(clueId: string) {
        const clue = findClue(this.state.site, clueId);
        if (!clue || isDestroyed(this.state, clueId)) return;
        this.closePanel();

        const { width, height } = this.scale;
        const t = this.text;
        const pw = 560;
        const ph = 300;
        const left = (width - pw) / 2;
        const top = (height - ph) / 2;

        // Full-screen blocker so hotspots underneath cannot be hovered or clicked.
        const blocker = this.add.rectangle(0, 0, width, height, COLORS.blocker, 0.55).setOrigin(0).setInteractive();
        const box = this.add.rectangle(left, top, pw, ph, COLORS.panel).setOrigin(0).setStrokeStyle(2, COLORS.panelStroke);
        const name = this.add.text(left + 24, top + 20, clue.name, {
            fontFamily: FONT,
            fontSize: '26px',
            color: TEXT_COLORS.normal
        });
        const location = this.add.text(left + 24, top + 60, formatText(t.locationLabel, { location: clue.location }), {
            fontFamily: FONT,
            fontSize: '16px',
            color: TEXT_COLORS.dim
        });
        const description = this.add.text(left + 24, top + 96, clue.description, {
            fontFamily: FONT,
            fontSize: '18px',
            color: TEXT_COLORS.normal,
            wordWrap: { width: pw - 48 }
        });

        const by = top + ph - 40;
        const log = makeButton(this, left + pw / 2 - 110, by, 190, 44, t.logClue, () => {
            const result = discoverClue(this.state, clueId);
            this.state = result.state;
            this.refresh();
        });
        const close = makeButton(this, left + pw / 2 + 110, by, 190, 44, t.close, () => this.closePanel(), 0x4a4f57, 0x666c75);

        this.panel = this.add.container(0, 0, [
            blocker, box, name, location, description, log.rect, log.label, close.rect, close.label
        ]);
        this.panel.setDepth(10);
        this.panelClueId = clueId;
        this.panelLogButton = log.label;
        this.hoveredId = null;
        this.refresh();
    }

    private closePanel() {
        this.panel?.destroy();
        this.panel = null;
        this.panelClueId = null;
        this.panelLogButton = null;
    }
}
