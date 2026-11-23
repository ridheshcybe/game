import { AUTO, Game, Scale, Types } from 'phaser';
import { Boot } from './scenes/Boot';
import { InvestigationScene } from './scenes/InvestigationScene';
import { TimelineBoardScene } from './scenes/TimelineBoardScene';

const config: Types.Core.GameConfig = {
    type: AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#0f1115',
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH
    },
    scene: [Boot, InvestigationScene, TimelineBoardScene]
};

const StartGame = (parent: string): Game => {
    return new Game({ ...config, parent });
};

export default StartGame;
