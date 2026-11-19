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

  const terrainGeometries: any[] = [];
  const terrainMaterials: any[] = [];
  const groundGeometry = new THREE.PlaneGeometry(40, 40);
  groundGeometry.rotateX(-Math.PI / 2);
  terrainGeometries.push(groundGeometry);
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x29443c, roughness: 1 });
  terrainMaterials.push(groundMaterial);
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.position.y = -0.22;
  terrain.add(ground);

  const laneGeometry = new THREE.PlaneGeometry(36, 2.6);
  laneGeometry.rotateX(-Math.PI / 2);
  terrainGeometries.push(laneGeometry);
  const laneMaterial = new THREE.MeshStandardMaterial({ color: 0x66745b, roughness: 1 });
  terrainMaterials.push(laneMaterial);
  for (const laneZ of [-8, 0, 8]) {
    const lane = new THREE.Mesh(laneGeometry, laneMaterial);
    lane.position.set(0, -0.16, laneZ);
    terrain.add(lane);
  }

  const riverGeometry = new THREE.PlaneGeometry(3.8, 36);
  riverGeometry.rotateX(-Math.PI / 2);
  terrainGeometries.push(riverGeometry);
  const riverMaterial = new THREE.MeshStandardMaterial({ color: 0x315c6c, roughness: 0.82, metalness: 0.05 });
  terrainMaterials.push(riverMaterial);
  const river = new THREE.Mesh(riverGeometry, riverMaterial);
  river.position.set(0, -0.13, 0);
  terrain.add(river);

  const grassGeometry = new THREE.CircleGeometry(1, 8);
  grassGeometry.rotateX(-Math.PI / 2);
  terrainGeometries.push(grassGeometry);
  const grassMaterial = new THREE.MeshStandardMaterial({ color: 0x3d694d, roughness: 1 });
  terrainMaterials.push(grassMaterial);
  for (const [x, z, sx, sz] of [
    [-6.5, -12, 2.4, 1.5], [6.5, -12, 2.1, 1.7],
    [-6.5, 12, 2.2, 1.6], [6.5, 12, 2.5, 1.4],
    [-13, -5.5, 1.7, 2.1], [13, 5.5, 1.8, 2.0],
  ]) {
    const patch = new THREE.Mesh(grassGeometry, grassMaterial);
    patch.position.set(x, -0.1, z);
    patch.scale.set(sx, sz, 1);
    terrain.add(patch);
  }

  const groundGrid = new THREE.GridHelper(40, 40, 0x718d7c, 0x49645a);
  groundGrid.position.y = -0.08;
  if (Array.isArray(groundGrid.material)) {
    for (const material of groundGrid.material) {
      material.transparent = true;
      material.opacity = 0.22;
      material.depthWrite = false;
    }
  } else {
    groundGrid.material.transparent = true;
    groundGrid.material.opacity = 0.22;
    groundGrid.material.depthWrite = false;
  }
  terrain.add(groundGrid);

  const unitGeometries = {
    heroBody: new THREE.CylinderGeometry(0.42, 0.56, 1.2, 8),
    heroHead: new THREE.SphereGeometry(0.34, 10, 8),
    heroCrest: new THREE.ConeGeometry(0.24, 0.42, 6),
    meleeBody: new THREE.BoxGeometry(0.78, 0.7, 0.72),
    minionHead: new THREE.SphereGeometry(0.22, 8, 6),
    rangedBody: new THREE.CylinderGeometry(0.24, 0.34, 0.88, 6),
    rangedCrest: new THREE.ConeGeometry(0.28, 0.34, 6),
    siegeBody: new THREE.BoxGeometry(1.05, 0.72, 0.9),
    siegeTurret: new THREE.CylinderGeometry(0.26, 0.34, 0.42, 8),
    siegeBarrel: new THREE.CylinderGeometry(0.07, 0.07, 0.82, 6),
    superBody: new THREE.OctahedronGeometry(0.62, 0),
    superRing: new THREE.TorusGeometry(0.78, 0.08, 6, 16),
    towerBase: new THREE.CylinderGeometry(0.52, 0.78, 2.2, 8),
    towerCrown: new THREE.CylinderGeometry(0.34, 0.5, 0.48, 8),
    towerPeak: new THREE.ConeGeometry(0.4, 0.72, 6),
    crystalBase: new THREE.CylinderGeometry(0.58, 0.82, 0.3, 6),
    crystalBody: new THREE.OctahedronGeometry(1, 0),
    crystalRing: new THREE.TorusGeometry(1.15, 0.08, 8, 18),
  };
  const teamMaterials = {
    blue: new THREE.MeshStandardMaterial({ color: 0x4d9be8, roughness: 0.58, metalness: 0.12 }),
    red: new THREE.MeshStandardMaterial({ color: 0xe58b54, roughness: 0.58, metalness: 0.12 }),
  };
  const accentMaterials = {
    blue: new THREE.MeshStandardMaterial({ color: 0xb8e3ff, roughness: 0.42, metalness: 0.24 }),
    red: new THREE.MeshStandardMaterial({ color: 0xffd0a9, roughness: 0.42, metalness: 0.24 }),
  };
  const unitMeshes = new Map<string, any>();

  function addPart(
    group: any,
    geometry: any,
    material: any,
    x: number,
    y: number,
    z: number,
    rotationX = 0,
    rotationY = 0,
    rotationZ = 0,
  ): void {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rotationX, rotationY, rotationZ);
    group.add(mesh);
  }

  function createUnitVisual(entity: Simulation['entities'][number]): any {
    const team = entity.team === 'blue' ? 'blue' : 'red';
    const body = teamMaterials[team];
    const accent = accentMaterials[team];
    const group = new THREE.Group();
    group.name = entity.id;

    if (entity.kind === 'hero') {
      addPart(group, unitGeometries.heroBody, body, 0, 0.68, 0);
      addPart(group, unitGeometries.heroHead, accent, 0, 1.48, 0);
      addPart(group, unitGeometries.heroCrest, body, 0, 1.88, 0);
    } else if (entity.kind === 'minion') {
      if (entity.minionType === 'ranged') {
        addPart(group, unitGeometries.rangedBody, body, 0, 0.46, 0);
        addPart(group, unitGeometries.rangedCrest, accent, 0, 1.02, 0);
      } else if (entity.minionType === 'siege') {
        addPart(group, unitGeometries.siegeBody, body, 0, 0.4, 0);
        addPart(group, unitGeometries.siegeTurret, accent, 0, 0.94, 0);
        addPart(group, unitGeometries.siegeBarrel, body, 0.43, 0.92, 0, 0, 0, Math.PI / 2);
      } else if (entity.minionType === 'super') {
        addPart(group, unitGeometries.superBody, body, 0, 0.78, 0);
        addPart(group, unitGeometries.superRing, accent, 0, 0.68, 0, Math.PI / 2);
      } else {
        addPart(group, unitGeometries.meleeBody, body, 0, 0.38, 0);
        addPart(group, unitGeometries.minionHead, accent, 0, 0.88, 0);
      }
    } else if (entity.kind === 'tower') {
      addPart(group, unitGeometries.towerBase, body, 0, 1.1, 0);
      addPart(group, unitGeometries.towerCrown, accent, 0, 2.42, 0);
      addPart(group, unitGeometries.towerPeak, body, 0, 3.0, 0);
    } else if (entity.kind === 'crystal') {
      addPart(group, unitGeometries.crystalBase, body, 0, 0.16, 0);
      addPart(group, unitGeometries.crystalBody, accent, 0, 1.35, 0);
      addPart(group, unitGeometries.crystalRing, body, 0, 1.1, 0, Math.PI / 2);
    }

    const scale = entity.kind === 'hero' ? 0.86 :
      entity.kind === 'minion' ? entity.minionType === 'super' ? 0.98 : entity.minionType === 'siege' ? 0.88 : 0.72 :
      entity.kind === 'tower' ? 0.9 : 0.96;
    group.scale.setScalar(scale);
    return group;
  }

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

      let group = unitMeshes.get(entity.id);
      if (!group) {
        group = createUnitVisual(entity);
        units.add(group);
        unitMeshes.set(entity.id, group);
      }
      group.position.set(entity.position.x, 0, entity.position.y);
    }

    for (const [id, group] of unitMeshes) {
      if (visibleIds.has(id)) continue;
      units.remove(group);
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
      Object.values(unitGeometries).forEach((geometry) => geometry.dispose());
      Object.values(teamMaterials).forEach((material) => material.dispose());
      Object.values(accentMaterials).forEach((material) => material.dispose());
      terrainGeometries.forEach((geometry) => geometry.dispose());
      terrainMaterials.forEach((material) => material.dispose());
      groundGrid.geometry.dispose();
      if (Array.isArray(groundGrid.material)) groundGrid.material.forEach((material: THREE.Material) => material.dispose());
      else groundGrid.material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
