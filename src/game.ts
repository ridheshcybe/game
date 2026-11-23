import { AUTO, Game, Scale, Types } from 'phaser';
import { Boot } from './scenes/Boot';
import { InvestigationScene } from './scenes/InvestigationScene';
import { MissionSelectScene } from './scenes/MissionSelectScene';
import { ResultsScene } from './scenes/ResultsScene';
import { TimelineScene } from './scenes/TimelineScene';
import { GAME_HEIGHT, GAME_WIDTH } from './scenes/ui';

const config: Types.Core.GameConfig = {
    type: AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-container',
    backgroundColor: '#0f1115',
    scale: {
        // Fixed 1024x768 design, scaled to fit any window and re-fit on resize/rotation.
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH
    },
    input: {
        // Keep touch drags working even if a second finger lands.
        activePointers: 2
    },
    scene: [Boot, MissionSelectScene, InvestigationScene, TimelineScene, ResultsScene]
};

const StartGame = (parent: string): Game => {
    return new Game({ ...config, parent });
};

export default StartGame;
