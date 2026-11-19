// @ts-ignore Three.js is kept as the only runtime dependency; no extra type package is added.
import * as THREE from 'three';
import type { Simulation } from './sim.ts';

export function createRenderScene(container: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x101820, 1);
  renderer.domElement.setAttribute('aria-label', 'Starfall 3D scene');
  container.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101820);

  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 1200);
  camera.position.set(13, 15, 19);
  camera.lookAt(0, 0, 0);

  const terrain = new THREE.Group();
  terrain.name = 'terrain';
  scene.add(terrain);

  const units = new THREE.Group();
  units.name = 'units';
  scene.add(units);

  const effects = new THREE.Group();
  effects.name = 'fx';
  scene.add(effects);

  const hemisphereLight = new THREE.HemisphereLight(0xd7e8ff, 0x25372d, 1.1);
  scene.add(hemisphereLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.position.set(-8, 14, 10);
  scene.add(directionalLight);

  const groundGrid = new THREE.GridHelper(40, 40, 0x91ad9a, 0x496451);
  terrain.add(groundGrid);

  const unitGeometry = new THREE.BoxGeometry(1.4, 1.4, 1.4);
  const unitMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x4d9be8 }),
    new THREE.MeshStandardMaterial({ color: 0xe58b54 }),
  ];
  const unitMeshes = new Map<string, THREE.Mesh>();

  const resize = () => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };

  resize();
  window.addEventListener('resize', resize);

  let animationFrame = 0;
  let running = false;

  const renderFrame = () => {
    if (!running) return;
    renderer.render(scene, camera);
    animationFrame = window.requestAnimationFrame(renderFrame);
  };

  function syncSimulation(world: Simulation): void {
    const visibleIds = new Set<string>();
    for (const entity of world.entities) {
      if (!entity.alive || entity.team === 'neutral') continue;
      if (entity.kind !== 'hero' && entity.kind !== 'minion' && entity.kind !== 'tower' && entity.kind !== 'crystal') continue;
      visibleIds.add(entity.id);

      let mesh = unitMeshes.get(entity.id);
      if (!mesh) {
        const material = entity.team === 'blue' ? unitMaterials[0] : unitMaterials[1];
        mesh = new THREE.Mesh(unitGeometry, material);
        mesh.name = entity.id;
        const scale = entity.kind === 'hero' ? 0.9 : entity.kind === 'minion' ? 0.38 : entity.kind === 'tower' ? 1.25 : 1.55;
        mesh.scale.setScalar(scale);
        units.add(mesh);
        unitMeshes.set(entity.id, mesh);
      }
      const scale = entity.kind === 'hero' ? 0.9 : entity.kind === 'minion' ? 0.38 : entity.kind === 'tower' ? 1.25 : 1.55;
      mesh.position.set(entity.position.x, 0.7 * scale, entity.position.y);
    }

    for (const [id, mesh] of unitMeshes) {
      if (visibleIds.has(id)) continue;
      units.remove(mesh);
      unitMeshes.delete(id);
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      renderFrame();
    },
    syncSimulation,
    dispose() {
      running = false;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      unitGeometry.dispose();
      unitMaterials.forEach((material: { dispose: () => void }) => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
