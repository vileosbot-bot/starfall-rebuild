import { createRenderScene } from './render';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing #app mount element.');
}

const renderScene = createRenderScene(app);
renderScene.start();
