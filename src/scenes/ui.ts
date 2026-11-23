// Shared placeholder-art helpers for scenes: colored rectangles and text only.
import { GameObjects, Scene } from 'phaser';

export const FONT = 'monospace';

export interface Button {
    rect: GameObjects.Rectangle;
    label: GameObjects.Text;
}

/** A clickable rectangle with centered text. (x, y) is the center. */
export function makeButton(
    scene: Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    onClick: () => void,
    color = 0x2f6f4f,
    hoverColor = 0x3f8f66
): Button {
    const rect = scene.add.rectangle(x, y, w, h, color).setInteractive({ useHandCursor: true });
    const label = scene.add
        .text(x, y, text, { fontFamily: FONT, fontSize: '18px', color: '#ffffff' })
        .setOrigin(0.5);
    rect.on('pointerover', () => rect.setFillStyle(hoverColor));
    rect.on('pointerout', () => rect.setFillStyle(color));
    rect.on('pointerup', onClick);
    return { rect, label };
}
