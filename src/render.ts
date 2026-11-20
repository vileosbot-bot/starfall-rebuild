// @ts-ignore Three.js is kept as the only runtime dependency; no extra type package is added.
import * as THREE from 'three';
import { HERO_SKILLS } from './sim.ts';
import type { Position, Simulation } from './sim.ts';

export interface ScreenPoint {
  x: number;
  y: number;
}

interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

const CAMERA_POSITION: Vector3Like = { x: 13, y: 15, z: 19 };
const CAMERA_TARGET: Vector3Like = { x: 0, y: 0, z: 0 };
const CAMERA_FOV_DEGREES = 52;
const WORLD_UP: Vector3Like = { x: 0, y: 1, z: 0 };

function dot3(a: Vector3Like, b: Vector3Like): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross3(a: Vector3Like, b: Vector3Like): Vector3Like {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize3(vector: Vector3Like): Vector3Like | null {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  if (!Number.isFinite(length) || length === 0) return null;
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}

function getCameraBasis(): { forward: Vector3Like; right: Vector3Like; up: Vector3Like } | null {
  const forward = normalize3({
    x: CAMERA_TARGET.x - CAMERA_POSITION.x,
    y: CAMERA_TARGET.y - CAMERA_POSITION.y,
    z: CAMERA_TARGET.z - CAMERA_POSITION.z,
  });
  if (!forward) return null;
  const right = normalize3(cross3(forward, WORLD_UP));
  if (!right) return null;
  const up = normalize3(cross3(right, forward));
  if (!up) return null;
  return { forward, right, up };
}

/** Pure screen-to-ground conversion. The caller supplies CSS-pixel coordinates and canvas dimensions. */
export function screenToGroundPoint(
  screenX: number,
  screenY: number,
  width: number,
  height: number,
): { x: number; y: number } | null {
  if (![screenX, screenY, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
  const basis = getCameraBasis();
  if (!basis) return null;
  const aspect = width / height;
  const tangent = Math.tan((CAMERA_FOV_DEGREES * Math.PI) / 360);
  const ndcX = (screenX / width) * 2 - 1;
  const ndcY = 1 - (screenY / height) * 2;
  const direction = normalize3({
    x: basis.forward.x + basis.right.x * ndcX * tangent * aspect + basis.up.x * ndcY * tangent,
    y: basis.forward.y + basis.right.y * ndcX * tangent * aspect + basis.up.y * ndcY * tangent,
    z: basis.forward.z + basis.right.z * ndcX * tangent * aspect + basis.up.z * ndcY * tangent,
  });
  if (!direction || direction.y >= -1e-8) return null;
  const distance = -CAMERA_POSITION.y / direction.y;
  if (!Number.isFinite(distance) || distance <= 0) return null;
  return {
    x: CAMERA_POSITION.x + direction.x * distance,
    y: CAMERA_POSITION.z + direction.z * distance,
  };
}

/** Pure projection of a simulation (x,y) point onto the canvas, where simulation y maps to world z. */
export function projectSimPointToScreen(
  position: { x: number; y: number },
  width: number,
  height: number,
  worldHeight = 0.75,
): ScreenPoint | null {
  if (![position.x, position.y, width, height, worldHeight].every(Number.isFinite) || width <= 0 || height <= 0) return null;
  const basis = getCameraBasis();
  if (!basis) return null;
  const relative = {
    x: position.x - CAMERA_POSITION.x,
    y: worldHeight - CAMERA_POSITION.y,
    z: position.y - CAMERA_POSITION.z,
  };
  const depth = dot3(relative, basis.forward);
  if (depth <= 0) return null;
  const aspect = width / height;
  const tangent = Math.tan((CAMERA_FOV_DEGREES * Math.PI) / 360);
  const ndcX = dot3(relative, basis.right) / (depth * tangent * aspect);
  const ndcY = dot3(relative, basis.up) / (depth * tangent);
  if (ndcX < -1 || ndcX > 1 || ndcY < -1 || ndcY > 1) return null;
  return { x: ((ndcX + 1) * width) / 2, y: ((1 - ndcY) * height) / 2 };
}


export interface SkillAimPreviewData {
  origin: Position;
  aimPosition: Position | null;
  range: number;
  radius: number | null;
}

export function getSkillAimPreviewData(
  world: Simulation,
  skillKey: 'Q' | 'E' | 'R' | null,
  aimPosition: Position | null,
): SkillAimPreviewData | null {
  if (!skillKey || (aimPosition && (!Number.isFinite(aimPosition.x) || !Number.isFinite(aimPosition.y)))) return null;
  const hero = world.playerHeroId
    ? world.entities.find((entity) => entity.id === world.playerHeroId && entity.kind === 'hero' && entity.alive)
    : undefined;
  if (!hero?.role) return null;
  const definition = HERO_SKILLS[hero.role][skillKey];
  if (definition.effect === 'heal') return null;
  return {
    origin: { ...hero.position },
    aimPosition: aimPosition ? { ...aimPosition } : null,
    range: definition.range,
    radius: definition.effect === 'area-damage' ? definition.radius ?? 0 : null,
  };
}

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

  const aimPreview = new THREE.Group();
  aimPreview.name = 'skill-aim-preview';
  aimPreview.visible = false;
  scene.add(aimPreview);

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

  let previewSignature: string | null = null;
  let previewRange: THREE.LineLoop | null = null;
  let previewDirection: THREE.Line | null = null;
  let previewArea: THREE.LineLoop | null = null;

  function createPreviewCircle(radius: number, color: number): THREE.LineLoop {
    const points = Array.from({ length: 65 }, (_, index) => {
      const angle = (index / 64) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    });
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.82 });
    return new THREE.LineLoop(geometry, material);
  }

  function disposePreviewLine(line: THREE.Line | THREE.LineLoop): void {
    line.geometry.dispose();
    const material = line.material;
    if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
    else material.dispose();
  }

  function clearSkillAimPreview(): void {
    for (const child of [...aimPreview.children]) {
      aimPreview.remove(child);
      if (child instanceof THREE.Line || child instanceof THREE.LineLoop) disposePreviewLine(child);
    }
    previewSignature = null;
    previewRange = null;
    previewDirection = null;
    previewArea = null;
    aimPreview.visible = false;
  }

  function setSkillAimPreview(
    world: Simulation,
    skillKey: 'Q' | 'E' | 'R' | null,
    aimPosition: Position | null,
  ): void {
    const data = getSkillAimPreviewData(world, skillKey, aimPosition);
    if (!data) {
      if (previewSignature !== null || aimPreview.visible) clearSkillAimPreview();
      return;
    }
    const signature = [
      world.playerHeroId,
      skillKey,
      data.range,
      data.radius ?? 'single',
      data.aimPosition ? 'aimed' : 'range-only',
    ].join(':');
    if (previewSignature !== signature) {
      clearSkillAimPreview();
      previewRange = createPreviewCircle(data.range, 0x76c9ff);
      aimPreview.add(previewRange);
      if (data.aimPosition) {
        const directionGeometry = new THREE.BufferGeometry();
        const directionMaterial = new THREE.LineBasicMaterial({ color: 0xf4e7a4, transparent: true, opacity: 0.95 });
        previewDirection = new THREE.Line(directionGeometry, directionMaterial);
        aimPreview.add(previewDirection);
        if (data.radius !== null && data.radius > 0) {
          previewArea = createPreviewCircle(data.radius, 0xffc77a);
          aimPreview.add(previewArea);
        }
      }
      previewSignature = signature;
    }
    if (previewRange) previewRange.position.set(data.origin.x, 0.045, data.origin.y);
    if (previewDirection && data.aimPosition) {
      previewDirection.geometry.setFromPoints([
        new THREE.Vector3(data.origin.x, 0.075, data.origin.y),
        new THREE.Vector3(data.aimPosition.x, 0.075, data.aimPosition.y),
      ]);
    }
    if (previewArea && data.aimPosition) previewArea.position.set(data.aimPosition.x, 0.055, data.aimPosition.y);
    aimPreview.visible = true;
  }


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
    canvas: renderer.domElement,
    start() {
      if (running) return;
      running = true;
      renderFrame();
    },
    syncSimulation,
    setSkillAimPreview,
    dispose() {
      running = false;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      clearSkillAimPreview();
      scene.remove(aimPreview);
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
