// scene-lighting.js — wires the baked lightmaps for desk_scene.glb (three.js r155+)
//
//   import { loadDeskScene, lighting, setTimeOfDay } from './scene-lighting.js';
//   const { scene: room, camera } = await loadDeskScene('/models/desk_scene_draco.glb', '/models/textures/');
//   scene.add(room);
//   setTimeOfDay(0.3);                 // 0 = noon, 0.5 = midnight, 1 = noon again
//   lighting.uLight.value = 1;         // shelf light on (tween this for the fade)
//
// Renderer setup that matches the previews:
//   renderer.outputColorSpace = THREE.SRGBColorSpace;
//   renderer.toneMapping = THREE.AgXToneMapping;   // r160+; use ACESFilmicToneMapping on older builds

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// Decode multipliers written at bake time (export/textures/lightmap_scales.json).
// The PNGs are normalised; multiply by these to get back the true baked intensity.
// [local change] Read from the JSON at load time instead of hard-coded, so they can't drift from the bake.
export function parseDecodeMultipliers(json) {
  const m = json?.decode_multipliers;
  const pick = (pass) => {
    const v = m?.[pass];
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) {
      throw new Error(`lightmap_scales.json: decode_multipliers.${pass} must be a positive number, got ${JSON.stringify(v)}`);
    }
    return v;
  };
  return { sun: pick('Sun'), night: pick('Night'), shelf: pick('Shelf') };
}

// Shared uniforms: change .value anywhere and every baked material updates.
export const lighting = {
  uDay:       { value: 1 },   // 0..1 sunlight pass
  uNight:     { value: 0 },   // 0..1 night window pass
  uLight:     { value: 0 },   // 0..1 shelf light (pull cord)
  kSun:       { value: 1.0 }, // artistic multipliers — starting values used in the previews
  kNight:     { value: 0.3 },
  kShelf:     { value: 0.7 },
  aoStrength: { value: 0.5 }, // Cycles lightmaps already contain occlusion; AO only adds contact depth
};

const outsideTint = new THREE.Color(1, 1, 1);
const DAY_TINT = new THREE.Color(1, 1, 1);
const NIGHT_TINT = new THREE.Color(0.22, 0.22, 0.38);
const SKY_DAY = new THREE.Color('#7FA4A6');
const SKY_NIGHT = new THREE.Color('#232647');

const vert = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;   // TEXCOORD_0 and TEXCOORD_1 are identical: base colour and lightmaps share one atlas layout
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const makeFrag = (DECODE) => /* glsl */`
  uniform sampler2D tBase, tAO, tSun, tNight, tShelf;
  uniform float uDay, uNight, uLight, kSun, kNight, kShelf, aoStrength;
  uniform vec3 uEmissive;
  varying vec2 vUv;
  void main() {
    vec3 base = texture2D(tBase, vUv).rgb;
    float ao  = mix(1.0, texture2D(tAO, vUv).r, aoStrength);
    vec3 light =
        texture2D(tSun,   vUv).rgb * ${DECODE.sun.toFixed(4)}   * kSun   * uDay
      + texture2D(tNight, vUv).rgb * ${DECODE.night.toFixed(4)} * kNight * uNight
      + texture2D(tShelf, vUv).rgb * ${DECODE.shelf.toFixed(4)} * kShelf * uLight;
    gl_FragColor = vec4(base * ao * light + uEmissive * uLight, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

function loadTex(loader, url, srgb) {
  const t = loader.load(url);
  t.flipY = false;                                   // same convention as glTF textures
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return t;
}

function bakedMaterial(set, baseMap, texDir, texLoader, decode, emissive = null) {
  const lm = (pass, srgb = true) => loadTex(texLoader, `${texDir}LM_${pass}_${set}.png`, srgb);
  return new THREE.ShaderMaterial({
    uniforms: {
      ...lighting,
      tBase: { value: baseMap },
      tAO: { value: lm('AO', false) },
      tSun: { value: lm('Sun') },
      tNight: { value: lm('Night') },
      tShelf: { value: lm('Shelf') },
      uEmissive: { value: emissive ?? new THREE.Color(0, 0, 0) },
    },
    vertexShader: vert,
    fragmentShader: makeFrag(decode),
  });
}

export async function loadDeskScene(glbUrl, texDir, dracoPath = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/') {
  const draco = new DRACOLoader().setDecoderPath(dracoPath);
  const [gltf, decode] = await Promise.all([
    new GLTFLoader().setDRACOLoader(draco).loadAsync(glbUrl),
    new THREE.FileLoader().setResponseType('json').loadAsync(`${texDir}lightmap_scales.json`).then(parseDecodeMultipliers),
  ]);
  const texLoader = new THREE.TextureLoader();
  const cache = {};

  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    if (m.name === 'M_Env_Baked' || m.name === 'M_Env_ShelfBulb') {
      const key = m.name;
      cache[key] ??= bakedMaterial('Env', m.map, texDir, texLoader, decode,
        m.name === 'M_Env_ShelfBulb' ? new THREE.Color(3.0, 1.6, 0.6) : null);   // bulb glow fades with uLight
      o.material = cache[key];
    } else if (m.name === 'M_Click_Baked') {
      cache.click ??= bakedMaterial('Click', m.map, texDir, texLoader, decode);
      o.material = cache.click;
    } else if (m.name === 'M_Out_CityLights') {
      // Skyline window grid: additive, so black = invisible. Fades in with uNight.
      const lights = new THREE.MeshBasicMaterial({
        map: m.emissiveMap, color: new THREE.Color(0, 0, 0),
        blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,   // panels sit 3 m in front of towers 400–900 m away
      });
      lights.userData.kind = 'citylights';
      o.material = lights;
    } else if (m.name.startsWith('M_Out_') || m.name === 'M_Sky') {
      // Outside layer: unlit flat colour, tinted by time of day. Street lamps fade in at night.
      const basic = new THREE.MeshBasicMaterial({ color: m.color.clone(), side: THREE.FrontSide });
      basic.userData.baseColor = m.color.clone();
      basic.userData.kind = m.name === 'M_Out_LitWindow' ? 'lit' : m.name === 'M_Sky' ? 'sky' : 'outside';
      o.material = basic;
    }
    // M_Screen (laptop) and M_Glass (window) are left as exported: swap the screen map for your content.
    // Env_WindowSky is a curved backdrop (r = 1200 m): UV u = azimuth, v = elevation — drive its colour or swap in a gradient texture.
  });

  const camera = gltf.cameras.find((c) => c.name === 'Cam_Main') ?? gltf.cameras[0];
  return { scene: gltf.scene, camera, gltf };
}

// t: 0..1 cycle. Smooth day/night factors; the outside layer and sky follow the same curve.
export function setTimeOfDay(t, root) {
  const day = THREE.MathUtils.smoothstep(Math.cos(t * Math.PI * 2) * 0.5 + 0.5, 0.25, 0.75);
  lighting.uDay.value = day;
  lighting.uNight.value = 1 - day;
  outsideTint.copy(NIGHT_TINT).lerp(DAY_TINT, day);
  root?.traverse((o) => {
    const m = o.material;
    if (!m?.userData?.kind) return;
    if (m.userData.kind === 'outside') m.color.copy(m.userData.baseColor).multiply(outsideTint);
    if (m.userData.kind === 'sky') m.color.copy(SKY_NIGHT).lerp(SKY_DAY, day);
    if (m.userData.kind === 'lit') m.color.copy(m.userData.baseColor).multiplyScalar(0.15 + 2.5 * (1 - day));
    if (m.userData.kind === 'citylights') m.color.setScalar(2.0 * (1 - day));
  });
}
