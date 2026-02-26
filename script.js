import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

const nameInput = document.querySelector('#avatarName');
const archetypeSelect = document.querySelector('#archetypeSelect');
const armorSelect = document.querySelector('#armorSelect');
const helmetSelect = document.querySelector('#helmetSelect');
const weaponSelect = document.querySelector('#weaponSelect');
const droneSelect = document.querySelector('#droneSelect');
const colorPicker = document.querySelector('#colorPicker');
const poseRange = document.querySelector('#poseRange');
const poseLabel = document.querySelector('#poseLabel');
const abilityInput = document.querySelector('#abilityInput');
const previewName = document.querySelector('#previewName');
const previewBuild = document.querySelector('#previewBuild');
const previewLoadout = document.querySelector('#previewLoadout');
const promptOutput = document.querySelector('#promptOutput');
const powerBar = document.querySelector('#powerBar');
const agilityBar = document.querySelector('#agilityBar');
const defenseBar = document.querySelector('#defenseBar');

const poseMap = { 1: { label: 'Defensive', tilt: -0.2 }, 2: { label: 'Ready', tilt: -0.1 }, 3: { label: 'Neutral', tilt: 0 }, 4: { label: 'Aggressive', tilt: 0.1 }, 5: { label: 'Heroic', tilt: 0.18 } };
const archetypeStats = {
  'Cyber Ranger': { power: 68, agility: 84, defense: 60 }, 'Arcane Tank': { power: 78, agility: 38, defense: 92 },
  'Stealth Assassin': { power: 73, agility: 94, defense: 44 }, 'Solar Paladin': { power: 82, agility: 58, defense: 80 }, 'Mech Summoner': { power: 88, agility: 52, defense: 70 }
};
const weaponScale = { 'Photon Blade': 1.0, 'Rail Pulse Rifle': 1.2, 'Arc Staff': 1.35, 'Twin Plasma Daggers': 0.72 };

const stage = document.querySelector('#stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 1.6, 5.2);

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(3, 5, 4);
scene.add(keyLight);
const rim = new THREE.PointLight(0x6a5dff, 1.5, 18);
rim.position.set(-2, 2, -2);
scene.add(rim);

const floor = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 0.25, 48), new THREE.MeshStandardMaterial({ color: 0x0d1538, metalness: 0.55, roughness: 0.3 }));
floor.position.y = -1.6;
scene.add(floor);

const avatar = new THREE.Group();
scene.add(avatar);

const armorMat = new THREE.MeshStandardMaterial({ color: 0x6a5dff, metalness: 0.75, roughness: 0.35, emissive: 0x16153a, emissiveIntensity: 0.55 });
const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.35, 0.65), armorMat);
body.position.y = 0.2;
const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 32), armorMat);
head.position.y = 1.28;
const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.72, 6, 14), armorMat);
armL.position.set(-0.75, 0.27, 0);
const armR = armL.clone(); armR.position.x = 0.75;
const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.8, 6, 14), armorMat);
legL.position.set(-0.32, -1.0, 0);
const legR = legL.clone(); legR.position.x = 0.32;
const weapon = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.12), new THREE.MeshStandardMaterial({ color: 0xbec7ff, emissive: 0x3946aa, emissiveIntensity: 1.1 }));
weapon.position.set(1.0, 0.2, 0);
const drone = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 24), new THREE.MeshStandardMaterial({ color: 0x9bb2ff, emissive: 0x5a76ff, emissiveIntensity: 1.3 }));
drone.position.set(1.2, 1.35, 0.55);

avatar.add(body, head, armL, armR, legL, legR, weapon, drone);

function randomFrom(items) { return items[Math.floor(Math.random() * items.length)]; }
function applyStats(a) { const s = archetypeStats[a]; powerBar.style.width = `${s.power}%`; agilityBar.style.width = `${s.agility}%`; defenseBar.style.width = `${s.defense}%`; }
function hexToThree(hex) { return new THREE.Color(hex); }

function buildAvatarSpec() {
  const name = nameInput.value.trim() || 'Unnamed Unit';
  const archetype = archetypeSelect.value;
  const armor = armorSelect.value;
  const helmet = helmetSelect.value;
  const weaponName = weaponSelect.value;
  const droneName = droneSelect.value;
  const color = colorPicker.value;
  const pose = poseMap[poseRange.value];
  const ability = abilityInput.value.trim() || 'Adaptive combat protocols.';

  document.documentElement.style.setProperty('--accent', color);
  poseLabel.textContent = pose.label;
  previewName.textContent = name;
  previewBuild.textContent = `${archetype} • ${armor} • ${helmet}`;
  previewLoadout.textContent = `${weaponName} • ${droneName === 'None' ? 'No drone' : droneName}`;

  const accent = hexToThree(color);
  armorMat.color.copy(accent);
  armorMat.emissive.copy(accent).multiplyScalar(0.22);
  rim.color.copy(accent);
  weapon.scale.y = weaponScale[weaponName];
  drone.visible = droneName !== 'None';
  avatar.rotation.z = pose.tilt;

  applyStats(archetype);

  promptOutput.textContent = `Create a stylized 3D game avatar named ${name}. Archetype: ${archetype}. Armor: ${armor}. Helmet: ${helmet}. Weapon: ${weaponName}. Drone: ${droneName}. Pose: ${pose.label.toLowerCase()}. Emissive accent color: ${color}. Signature skill: ${ability}. Output as full-body rigged mesh with animation-ready skeleton, PBR textures, and game-engine-ready topology.`;
}

document.querySelector('#randomizeBtn').addEventListener('click', () => {
  const names = ['Nova Sentinel', 'Rift Striker', 'Helix Warden', 'Vanta Pulse', 'Sable Prism'];
  const colors = ['#6a5dff', '#00d5ff', '#ff4da6', '#f97316', '#38bdf8'];
  nameInput.value = randomFrom(names);
  archetypeSelect.value = randomFrom([...archetypeSelect.options].map((o) => o.value));
  armorSelect.value = randomFrom([...armorSelect.options].map((o) => o.value));
  helmetSelect.value = randomFrom([...helmetSelect.options].map((o) => o.value));
  weaponSelect.value = randomFrom([...weaponSelect.options].map((o) => o.value));
  droneSelect.value = randomFrom([...droneSelect.options].map((o) => o.value));
  colorPicker.value = randomFrom(colors);
  poseRange.value = String(Math.floor(Math.random() * 5) + 1);
  buildAvatarSpec();
});

document.querySelector('#exportBtn').addEventListener('click', () => {
  const payload = {
    avatarName: previewName.textContent,
    archetype: archetypeSelect.value,
    armorMaterial: armorSelect.value,
    helmetRig: helmetSelect.value,
    weaponLoadout: weaponSelect.value,
    companionDrone: droneSelect.value,
    coreEnergyColor: colorPicker.value,
    pose: poseLabel.textContent,
    signatureSkill: abilityInput.value.trim(),
    stats: { power: powerBar.style.width, agility: agilityBar.style.width, defense: defenseBar.style.width },
    outputFormat: '3D game avatar (three.js preview)',
    prompt: promptOutput.textContent
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${payload.avatarName.toLowerCase().replace(/\s+/g, '-') || 'avatar'}-3d-spec.json`;
  a.click();
  URL.revokeObjectURL(url);
});

[nameInput, archetypeSelect, armorSelect, helmetSelect, weaponSelect, droneSelect, colorPicker, poseRange, abilityInput].forEach((el) => el.addEventListener('input', buildAvatarSpec));

function resize() {
  const rect = stage.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();
buildAvatarSpec();

renderer.setAnimationLoop(() => {
  avatar.rotation.y += 0.006;
  floor.rotation.y += 0.002;
  renderer.render(scene, camera);
});
