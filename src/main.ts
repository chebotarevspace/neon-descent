import { Game } from './engine/Game';

const app = document.getElementById('app');
if (!app) throw new Error('#app not found');

const game = new Game(app);

(window as unknown as { __game: Game }).__game = game;
