// Shared placeholder-art widgets for scenes: colored rectangles, text, small tweens.
import { GameObjects, Scene } from 'phaser';
import { playSound, type SoundName } from '../audio';
import { content } from '../content';
import { formatText, formatTime } from '../core/text';
import type { GameState } from '../core/types';

export const FONT = 'monospace';
export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 768;
export const TOP_BAR_HEIGHT = 56;

export const COLORS = {
    background: 0x23262b,
    topBar: 0x111316,
    panel: 0x15181c,
    panelStroke: 0x9aa5b1,
    button: 0x2f6f4f,
    buttonHover: 0x3f8f66,
    buttonMuted: 0x4a4f57,
    buttonMutedHover: 0x666c75,
    meterBack: 0x333333,
    meterLow: 0xc9a227,
    meterHigh: 0xc0392b,
    gold: 0xe0b84a,
    blocker: 0x000000
};

export const TEXT = {
    normal: '#e8e6e3',
    dim: '#8a8f98',
    warning: '#ff6b5b',
    gold: '#e0b84a',
    good: '#6fcf97'
};

export interface Button {
    rect: GameObjects.Rectangle;
    label: GameObjects.Text;
    setText(text: string): void;
}

export interface ButtonOptions {
    color?: number;
    hoverColor?: number;
    sound?: SoundName | null;
    fontSize?: number;
}

/** A clickable rectangle with centered text. (x, y) is the center. Works with mouse and touch. */
export function makeButton(
    scene: Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    onClick: () => void,
    opts: ButtonOptions = {}
): Button {
    const color = opts.color ?? COLORS.button;
    const hoverColor = opts.hoverColor ?? COLORS.buttonHover;
    const rect = scene.add.rectangle(x, y, w, h, color).setInteractive({ useHandCursor: true });
    const label = scene.add
        .text(x, y, text, { fontFamily: FONT, fontSize: `${opts.fontSize ?? 18}px`, color: '#ffffff' })
        .setOrigin(0.5);
    const scaleTo = (scale: number) =>
        scene.tweens.add({ targets: [rect, label], scale, duration: 90, ease: 'Quad.Out' });
    rect.on('pointerover', () => {
        rect.setFillStyle(hoverColor);
        scaleTo(1.04);
    });
    rect.on('pointerout', () => {
        rect.setFillStyle(color);
        scaleTo(1);
    });
    rect.on('pointerdown', () => scaleTo(0.96));
    rect.on('pointerup', () => {
        scaleTo(1);
        if (opts.sound !== null) playSound(opts.sound ?? 'click');
        onClick();
    });
    return { rect, label, setText: (t) => label.setText(t) };
}

/** Countdown, suspicion meter and preservation slots. */
export class TopBar {
    private timer: GameObjects.Text;
    private meter: GameObjects.Rectangle;
    private slots: GameObjects.Text;
    private readonly meterWidth = 200;

    constructor(private scene: Scene) {
        const t = content.ui.hud;
        const mid = TOP_BAR_HEIGHT / 2;
        const style = { fontFamily: FONT, fontSize: '20px', color: TEXT.normal };
        scene.add.rectangle(0, 0, GAME_WIDTH, TOP_BAR_HEIGHT, COLORS.topBar).setOrigin(0);
        this.timer = scene.add.text(20, mid, '', style).setOrigin(0, 0.5);
        scene.add.text(330, mid, t.suspicionLabel, style).setOrigin(0, 0.5);
        scene.add.rectangle(460, mid, this.meterWidth, 18, COLORS.meterBack).setOrigin(0, 0.5);
        this.meter = scene.add.rectangle(460, mid, 0, 18, COLORS.meterLow).setOrigin(0, 0.5);
        this.slots = scene.add.text(GAME_WIDTH - 20, mid, '', style).setOrigin(1, 0.5);
    }

    update(state: GameState) {
        const t = content.ui.hud;
        this.timer.setText(formatText(t.timeLabel, { time: formatTime(state.timeRemaining) }));
        this.timer.setColor(state.timeRemaining <= 20 ? TEXT.warning : TEXT.normal);
        this.meter.width = this.meterWidth * (state.suspicion / 100);
        this.meter.fillColor = state.suspicion >= 60 ? COLORS.meterHigh : COLORS.meterLow;
        this.slots.setText(
            formatText(t.slotsLabel, { used: state.preservedClueIds.length, total: state.site.preservationSlots })
        );
    }

    /** Short shake of the meter when suspicion rises. */
    pulseMeter() {
        this.scene.tweens.add({ targets: this.meter, scaleY: 1.6, duration: 120, yoyo: true });
    }
}

/** A message that fades in near the top of the screen and fades out after a few seconds. */
export class Toast {
    private box: GameObjects.Rectangle;
    private text: GameObjects.Text;

    constructor(private scene: Scene, y = 120) {
        this.box = scene.add.rectangle(GAME_WIDTH / 2, y, 760, 56, 0x3a1612, 0.95).setStrokeStyle(2, 0xff6b5b);
        this.text = scene.add
            .text(GAME_WIDTH / 2, y, '', {
                fontFamily: FONT,
                fontSize: '17px',
                color: TEXT.normal,
                align: 'center',
                wordWrap: { width: 720 }
            })
            .setOrigin(0.5);
        for (const o of [this.box, this.text]) o.setDepth(50).setAlpha(0);
    }

    show(message: string) {
        this.text.setText(message);
        this.box.height = Math.max(56, this.text.height + 20);
        const targets = [this.box, this.text];
        this.scene.tweens.killTweensOf(targets);
        this.scene.tweens.chain({
            targets,
            tweens: [
                { alpha: 1, duration: 150 },
                { alpha: 1, duration: 3200 },
                { alpha: 0, duration: 400 }
            ]
        });
    }
}

/** A dimmed full-screen layer that swallows input to everything underneath. */
export function makeBlocker(scene: Scene, alpha = 0.6): GameObjects.Rectangle {
    return scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.blocker, alpha).setOrigin(0).setInteractive();
}
