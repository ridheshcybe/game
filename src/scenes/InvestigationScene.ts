import { GameObjects, Scene } from 'phaser';
import { playSound } from '../audio';
import { content } from '../content';
import { markTutorialSeen } from '../core/campaign';
import {
    discoverClue,
    findClue,
    isDestroyed,
    isDiscovered,
    isSiteOver,
    startInspecting,
    stopInspecting,
    tick,
    upcomingWave
} from '../core/state';
import { formatText } from '../core/text';
import type { Clue, GameState } from '../core/types';
import { loadProgress, saveProgress } from '../save';
import { announceSuspicion, endSite } from './flow';
import {
    COLORS,
    FONT,
    GAME_HEIGHT,
    GAME_WIDTH,
    TEXT,
    TOP_BAR_HEIGHT,
    Toast,
    TopBar,
    makeBlocker,
    makeButton
} from './ui';

const HOTSPOT = {
    fill: 0x4a5568,
    hover: 0x6b7a90,
    stroke: 0x9aa5b1,
    logged: 0x2f5d4a,
    loggedStroke: 0x6fcf97,
    burned: 0x1a1a1a,
    burnedStroke: 0x5a3a2a,
    flame: 0xff7a1a
};
const BURNED_TEXT = '#6b5a50';

interface Hotspot {
    clue: Clue;
    rect: GameObjects.Rectangle;
    label: GameObjects.Text;
}

export interface InvestigationData {
    state: GameState;
}

export class InvestigationScene extends Scene {
    private state: GameState;
    private hotspots: Hotspot[];
    private hoveredId: string | null;
    private panel: GameObjects.Container | null;
    private panelLogButton: GameObjects.Text | null;
    private paused: boolean;
    private ending: boolean;
    private warnedWaveAt: number | null;

    private topBar: TopBar;
    private toast: Toast;
    private warningText: GameObjects.Text;
    private loggedText: GameObjects.Text;

    constructor() {
        super('Investigation');
    }

    /** Runs on every start, so a restart never sees old fields. */
    init(data: InvestigationData) {
        this.state = data.state;
        this.hotspots = [];
        this.hoveredId = null;
        this.panel = null;
        this.panelLogButton = null;
        this.paused = false;
        this.ending = false;
        this.warnedWaveAt = null;
    }

    create() {
        const t = content.ui.investigation;
        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.background).setOrigin(0);
        this.add
            .text(GAME_WIDTH - 20, TOP_BAR_HEIGHT + 22, this.state.site.title, {
                fontFamily: FONT,
                fontSize: '15px',
                color: TEXT.dim
            })
            .setOrigin(1, 0.5);

        for (const clue of this.state.site.clues) this.hotspots.push(this.makeHotspot(clue));

        this.topBar = new TopBar(this);
        this.warningText = this.add
            .text(GAME_WIDTH / 2, TOP_BAR_HEIGHT + 22, '', { fontFamily: FONT, fontSize: '18px', color: TEXT.warning })
            .setOrigin(0.5);
        this.loggedText = this.add
            .text(24, GAME_HEIGHT - 40, '', { fontFamily: FONT, fontSize: '16px', color: TEXT.dim })
            .setOrigin(0, 0.5);
        makeButton(this, GAME_WIDTH - 150, GAME_HEIGHT - 40, 260, 48, t.openTimeline, () => this.openTimeline());
        this.toast = new Toast(this);

        this.refresh(0);
        if (!loadProgress().tutorialSeen) this.showTutorial();
    }

    update(time: number, delta: number) {
        if (this.paused || this.ending) return;
        const before = this.state;
        this.setState(tick(this.state, delta / 1000));
        if (this.ending) return;

        const burned = this.state.destroyedClueIds.filter((id) => !before.destroyedClueIds.includes(id));
        if (burned.length > 0) this.burn(burned);
        if (this.state.inspecting && isDestroyed(this.state, this.state.inspecting.clueId)) this.closePanel();
        this.refresh(time);
    }

    /** Every state change goes through here: crew messages, then the end-of-site check. */
    private setState(next: GameState) {
        const before = this.state;
        this.state = next;
        announceSuspicion(before, next, this.toast, this.topBar);
        if (isSiteOver(next) && !this.ending) {
            this.ending = true;
            endSite(this, stopInspecting(next));
        }
    }

    private openTimeline() {
        this.scene.start('Timeline', { state: stopInspecting(this.state) });
    }

    private makeHotspot(clue: Clue): Hotspot {
        const { x, y, w, h } = clue.hotspot;
        const cx = x + w / 2;
        const cy = y + h / 2;
        const rect = this.add
            .rectangle(cx, cy, w, h, HOTSPOT.fill)
            .setStrokeStyle(2, HOTSPOT.stroke)
            .setInteractive({ useHandCursor: true });
        const label = this.add
            .text(cx, cy, '', {
                fontFamily: FONT,
                fontSize: '14px',
                color: TEXT.normal,
                align: 'center',
                wordWrap: { width: w - 8 }
            })
            .setOrigin(0.5);

        const scaleTo = (scale: number) =>
            this.tweens.add({ targets: [rect, label], scale, duration: 120, ease: 'Quad.Out' });
        rect.on('pointerover', () => {
            this.hoveredId = clue.id;
            scaleTo(1.06);
        });
        rect.on('pointerout', () => {
            if (this.hoveredId === clue.id) this.hoveredId = null;
            scaleTo(1);
        });
        rect.on('pointerup', () => {
            playSound('click');
            this.openPanel(clue.id);
        });
        return { clue, rect, label };
    }

    /** Redraws everything that depends on game state. Cheap enough to run every frame. */
    private refresh(time: number) {
        const s = this.state;
        const t = content.ui.investigation;

        for (const { clue, rect, label } of this.hotspots) {
            if (isDestroyed(s, clue.id)) {
                if (rect.input?.enabled) rect.disableInteractive();
                if (this.hoveredId === clue.id) this.hoveredId = null;
                rect.setFillStyle(HOTSPOT.burned).setStrokeStyle(2, HOTSPOT.burnedStroke);
                label.setText(`${clue.name}\n${t.burnedTag}`).setColor(BURNED_TEXT);
                continue;
            }
            const logged = isDiscovered(s, clue.id);
            const hovered = this.hoveredId === clue.id;
            rect.setFillStyle(hovered ? HOTSPOT.hover : logged ? HOTSPOT.logged : HOTSPOT.fill);
            rect.setStrokeStyle(hovered ? 3 : 2, logged ? HOTSPOT.loggedStroke : HOTSPOT.stroke);
            label.setText(logged ? `${clue.name}\n${t.loggedTag}` : clue.name).setColor(TEXT.normal);
        }

        this.topBar.update(s);
        this.loggedText.setText(
            formatText(t.loggedCount, { count: s.discoveredClueIds.length, total: s.site.clues.length })
        );

        const wave = upcomingWave(s, s.rules.waveWarningSeconds);
        if (wave && wave.threatenedClueIds.length > 0) {
            this.warningText.setText(
                formatText(t.waveWarning, { seconds: Math.ceil(wave.secondsUntil), count: wave.threatenedClueIds.length })
            );
            this.warningText.setAlpha(0.55 + 0.45 * Math.abs(Math.sin(time / 250)));
            if (this.warnedWaveAt !== wave.wave.atSecond) {
                this.warnedWaveAt = wave.wave.atSecond;
                playSound('warning');
            }
        } else {
            this.warningText.setText('');
        }

        if (this.state.inspecting && this.panelLogButton) {
            this.panelLogButton.setText(isDiscovered(s, this.state.inspecting.clueId) ? t.logged : t.logClue);
        }
    }

    /** Flame flash, small shake and a burn sound for clues a wave just destroyed. */
    private burn(clueIds: string[]) {
        playSound('burn');
        this.cameras.main.shake(250, 0.005);
        for (const id of clueIds) {
            const spot = this.hotspots.find((h) => h.clue.id === id);
            if (!spot) continue;
            this.tweens.killTweensOf([spot.rect, spot.label]);
            spot.rect.setScale(1);
            spot.label.setScale(1);
            const { x, y, w, h } = spot.clue.hotspot;
            const flame = this.add.rectangle(x + w / 2, y + h / 2, w, h, HOTSPOT.flame, 0.9);
            this.tweens.add({
                targets: flame,
                alpha: 0,
                scaleX: 1.3,
                scaleY: 1.6,
                duration: 600,
                ease: 'Quad.Out',
                onComplete: () => flame.destroy()
            });
        }
    }

    private openPanel(clueId: string) {
        const clue = findClue(this.state.site, clueId);
        if (!clue || isDestroyed(this.state, clueId)) return;
        this.closePanel();
        this.setState(startInspecting(this.state, clueId));

        const t = content.ui.investigation;
        const pw = 560;
        const ph = 300;
        const left = (GAME_WIDTH - pw) / 2;
        const top = (GAME_HEIGHT - ph) / 2;

        const blocker = makeBlocker(this, 0.55);
        const box = this.add.rectangle(left, top, pw, ph, COLORS.panel).setOrigin(0).setStrokeStyle(2, COLORS.panelStroke);
        const name = this.add.text(left + 24, top + 20, clue.name, { fontFamily: FONT, fontSize: '26px', color: TEXT.normal });
        const location = this.add.text(left + 24, top + 60, formatText(t.locationLabel, { location: clue.location }), {
            fontFamily: FONT,
            fontSize: '16px',
            color: TEXT.dim
        });
        const description = this.add.text(left + 24, top + 96, clue.description, {
            fontFamily: FONT,
            fontSize: '18px',
            color: TEXT.normal,
            wordWrap: { width: pw - 48 }
        });

        const by = top + ph - 40;
        const log = makeButton(
            this,
            left + pw / 2 - 110,
            by,
            190,
            48,
            t.logClue,
            () => {
                const wasLogged = isDiscovered(this.state, clueId);
                const result = discoverClue(this.state, clueId);
                this.setState(result.state);
                if (result.ok && !wasLogged) playSound('success');
            },
            { sound: null }
        );
        const close = makeButton(this, left + pw / 2 + 110, by, 190, 48, t.close, () => this.closePanel(), {
            color: COLORS.buttonMuted,
            hoverColor: COLORS.buttonMutedHover
        });

        const panel = this.add.container(0, 0, [blocker, box, name, location, description, log.rect, log.label, close.rect, close.label]);
        panel.setDepth(10);
        this.tweens.add({ targets: [box, name, location, description], alpha: { from: 0, to: 1 }, duration: 150 });
        this.panel = panel;
        this.panelLogButton = log.label;
        this.hoveredId = null;
    }

    private closePanel() {
        this.panel?.destroy();
        this.panel = null;
        this.panelLogButton = null;
        this.state = stopInspecting(this.state);
    }

    /** First-launch help. The cleanup timer waits until it is dismissed. */
    private showTutorial() {
        const t = content.ui.investigation;
        this.paused = true;
        const pw = 760;
        const ph = 400;
        const left = (GAME_WIDTH - pw) / 2;
        const top = (GAME_HEIGHT - ph) / 2;
        const blocker = makeBlocker(this, 0.75);
        const box = this.add.rectangle(left, top, pw, ph, COLORS.panel).setOrigin(0).setStrokeStyle(2, COLORS.gold);
        const title = this.add.text(left + 28, top + 24, t.tutorialTitle, { fontFamily: FONT, fontSize: '26px', color: TEXT.gold });
        const body = this.add.text(left + 28, top + 76, t.tutorialBody, {
            fontFamily: FONT,
            fontSize: '17px',
            color: TEXT.normal,
            wordWrap: { width: pw - 56 },
            lineSpacing: 10
        });
        const overlay = this.add.container(0, 0, [blocker, box, title, body]).setDepth(30);
        const ok = makeButton(this, GAME_WIDTH / 2, top + ph - 44, 200, 48, t.tutorialDismiss, () => {
            saveProgress(markTutorialSeen(loadProgress()));
            overlay.destroy();
            this.paused = false;
        });
        overlay.add([ok.rect, ok.label]);
        this.tweens.add({ targets: [box, title, body], alpha: { from: 0, to: 1 }, duration: 250, ease: 'Quad.Out' });
    }
}
