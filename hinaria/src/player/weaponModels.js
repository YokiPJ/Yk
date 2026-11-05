/**
 * Improved Weapon Models - Stylized Fantasy Weapons
 */

import * as THREE from 'three';
import {markEquipment} from './equipmentSockets.js';
import { makeReplayAxe } from './replayAxeModel.js';

/**
 * Create stylized Knight sword
 */
export function createKnightSword() {
    const group = new THREE.Group();
    group.position.y = -0.52;
    
    // Blade (tapered, metallic)
    const bladeGeo = new THREE.BoxGeometry(0.06, 0.05, 0.65);
    bladeGeo.translate(0, 0, 0.325);
    const bladeMesh = new THREE.Mesh(bladeGeo, new THREE.MeshLambertMaterial({ 
        color: 0xe8e8e8,
        emissive: 0x333333
    }));
    bladeMesh.position.set(0, 0, 0.1);
    group.add(bladeMesh);
    
    // Blade tip (pointed)
    const tipGeo = new THREE.ConeGeometry(0.04, 0.12, 4);
    tipGeo.rotateX(Math.PI / 2);
    const tipMesh = new THREE.Mesh(tipGeo, new THREE.MeshLambertMaterial({ 
        color: 0xe8e8e8,
        emissive: 0x333333
    }));
    tipMesh.position.set(0, 0, 0.78);
    group.add(tipMesh);
    
    // Cross guard (wider, more ornate)
    const guardGeo = new THREE.BoxGeometry(0.28, 0.05, 0.06);
    const guardMesh = new THREE.Mesh(guardGeo, new THREE.MeshLambertMaterial({ color: 0xc9a227 }));
    guardMesh.position.set(0, 0, 0.1);
    group.add(guardMesh);
    
    // Guard spheres (decorative ends)
    const guardSphere1 = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6), new THREE.MeshLambertMaterial({ color: 0xc9a227 }));
    guardSphere1.position.set(0.14, 0, 0.1);
    group.add(guardSphere1);
    
    const guardSphere2 = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6), new THREE.MeshLambertMaterial({ color: 0xc9a227 }));
    guardSphere2.position.set(-0.14, 0, 0.1);
    group.add(guardSphere2);
    
    // Handle (wrapped leather look)
    const handleGeo = new THREE.CylinderGeometry(0.025, 0.028, 0.16, 8);
    handleGeo.rotateX(Math.PI / 2);
    const handleMesh = new THREE.Mesh(handleGeo, new THREE.MeshLambertMaterial({ color: 0x5a3b22 }));
    handleMesh.position.set(0, 0, 0.02);
    group.add(handleMesh);
    
    // Pommel (rounded)
    const pommelGeo = new THREE.SphereGeometry(0.04, 8);
    const pommelMesh = new THREE.Mesh(pommelGeo, new THREE.MeshLambertMaterial({ color: 0xc9a227 }));
    pommelMesh.position.set(0, 0, -0.07);
    group.add(pommelMesh);
    
    return markEquipment(group,'sword',[0, 0, 0.02],'forwardZ');
}

/**
 * Create stylized shield
 */
export function createKnightShield() {
    const group = new THREE.Group();
    
    // Main shield body (rounded)
    const shieldGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.06, 16);
    shieldGeo.rotateX(Math.PI / 2);
    const shieldMesh = new THREE.Mesh(shieldGeo, new THREE.MeshLambertMaterial({ color: 0x9b2d2d }));
    shieldMesh.position.set(0, 0, 0);
    group.add(shieldMesh);
    
    // Shield rim (metallic edge)
    const rimGeo = new THREE.TorusGeometry(0.28, 0.025, 8, 16);

    const rimMesh = new THREE.Mesh(rimGeo, new THREE.MeshLambertMaterial({ color: 0x6a6a6a }));
    rimMesh.position.set(0, 0, 0);
    group.add(rimMesh);
    
    // Shield boss (center decoration)
    const bossGeo = new THREE.SphereGeometry(0.07, 8);
    const bossMesh = new THREE.Mesh(bossGeo, new THREE.MeshLambertMaterial({ 
        color: 0xc9a227,
        emissive: 0x332200
    }));
    bossMesh.position.set(0, 0, .06);
    group.add(bossMesh);
    
    // Decorative cross on shield
    const cross1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.02), new THREE.MeshLambertMaterial({ color: 0xc9a227 }));
    cross1.position.set(0, 0, .045);
    group.add(cross1);
    
    const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.02), new THREE.MeshLambertMaterial({ color: 0xc9a227 }));
    cross2.position.set(0, 0, .045);
    group.add(cross2);
    
    return markEquipment(group,'shield',[0, 0, 0],'shield');
}

/**
 * Create stylized Ranger bow
 */
export function createRangerBow() {
    const group = new THREE.Group();
    group.position.y = -0.52;
    group.rotation.y = -Math.PI / 2;
    
    // Bow limbs (curved wood)
    const bowGeo = new THREE.TorusGeometry(0.32, 0.018, 6, 16, Math.PI);
    bowGeo.rotateZ(-Math.PI / 2);
    const bowMesh = new THREE.Mesh(bowGeo, new THREE.MeshLambertMaterial({ color: 0x6b4423 }));
    group.add(bowMesh);
    
    // Bow grip (center)
    const gripGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.12, 8);
    const gripMesh = new THREE.Mesh(gripGeo, new THREE.MeshLambertMaterial({ color: 0x5a3b22 }));
    gripMesh.position.set(.32, 0, 0);
    group.add(gripMesh);
    
    // Bowstring
    const stringGeo = new THREE.BoxGeometry(0.008, 0.64, 0.008);
    const stringMesh = new THREE.Mesh(stringGeo, new THREE.MeshLambertMaterial({ color: 0xeeeeee }));
    stringMesh.position.set(0, 0, 0);
    group.add(stringMesh);
    
    // String nock points (decorative)
    const nock1 = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4), new THREE.MeshLambertMaterial({ color: 0x8a6a3a }));
    nock1.position.set(0, 0.32, 0);
    group.add(nock1);
    
    const nock2 = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4), new THREE.MeshLambertMaterial({ color: 0x8a6a3a }));
    nock2.position.set(0, -0.32, 0);
    group.add(nock2);
    
    return markEquipment(group,'bow',[0.32, 0, 0],'bow');
}

/**
 * Create stylized Mage staff
 */
export function createMageStaff() {
    const group = new THREE.Group();
    group.position.y = -0.52;
    
    // Staff shaft (tapered wood)
    const shaftGeo = new THREE.CylinderGeometry(0.022, 0.028, 0.9, 8);
    shaftGeo.rotateX(Math.PI / 2);
    const shaftMesh = new THREE.Mesh(shaftGeo, new THREE.MeshLambertMaterial({ color: 0x5a3b22 }));
    shaftMesh.position.set(0, 0, 0.4);
    group.add(shaftMesh);
    
    // Bottom cap
    const bottomCap = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6), new THREE.MeshLambertMaterial({ color: 0x4a2b12 }));
    bottomCap.position.set(0, 0, -0.05);
    group.add(bottomCap);
    
    // Top ornament base (metal)
    const ornamentBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.035, 0.08, 8),
        new THREE.MeshLambertMaterial({ color: 0x9a8a6a })
    );
    ornamentBase.rotation.x = Math.PI / 2;
    ornamentBase.position.set(0, 0, 0.82);
    group.add(ornamentBase);
    
    // Crystal holder (prongs)
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const prongGeo = new THREE.BoxGeometry(0.015, 0.015, 0.15);
        prongGeo.translate(0, 0, 0.075);
        const prongMesh = new THREE.Mesh(prongGeo, new THREE.MeshLambertMaterial({ color: 0x9a8a6a }));
        prongMesh.position.set(Math.cos(angle) * 0.06, Math.sin(angle) * 0.06, 0.86);
        prongMesh.rotation.set(Math.cos(angle) * 0.3, Math.sin(angle) * 0.3, angle);
        group.add(prongMesh);
    }
    
    // Magical crystal (glowing)
    const crystalGeo = new THREE.OctahedronGeometry(0.08, 0);
    const crystalMesh = new THREE.Mesh(crystalGeo, new THREE.MeshLambertMaterial({ 
        color: 0x6b9fff,
        emissive: 0x2244aa,
        transparent: true,
        opacity: 0.9
    }));
    crystalMesh.position.set(0, 0, 0.94);
    crystalMesh.userData.rotate = true; // Mark for rotation animation
    group.add(crystalMesh);
    group.userData.crystal = crystalMesh;
    
    return markEquipment(group,'staff',[0, 0, 0.02],'forwardZ');
}

/**
 * Create simple axe (for NPCs/enemies)
 */
export function createAxe() {
    const group = new THREE.Group();
    group.position.y = -0.52;
    
    // Handle
    const handleGeo = new THREE.CylinderGeometry(0.025, 0.03, 0.72, 8);
    handleGeo.rotateX(Math.PI / 2);
    const handleMesh = new THREE.Mesh(handleGeo, new THREE.MeshLambertMaterial({ color: 0x5a3b22 }));
    handleMesh.position.set(0, 0, 0.32);
    group.add(handleMesh);
    
    // Axe head (single blade)
    const bladeGeo = new THREE.BoxGeometry(0.04, 0.32, 0.22);
    const bladeMesh = new THREE.Mesh(bladeGeo, new THREE.MeshLambertMaterial({ color: 0x8a8a8a }));
    bladeMesh.position.set(0, 0, 0.65);
    group.add(bladeMesh);
    
    // Blade edge highlight
    const edgeGeo = new THREE.BoxGeometry(0.02, 0.32, 0.02);
    const edgeMesh = new THREE.Mesh(edgeGeo, new THREE.MeshLambertMaterial({ color: 0xcccccc }));
    edgeMesh.position.set(0, 0, 0.76);
    group.add(edgeMesh);
    
    return markEquipment(group,'axe',[0, 0, 0.02],'forwardZ');
}

/**
 * Create club (for trolls/orcs)
 */
export function createClub() {
    const group = new THREE.Group();
    group.position.y = -0.52;
    
    // Club body (tapered heavily)
    const clubGeo = new THREE.CylinderGeometry(0.05, 0.12, 0.85, 8);
    clubGeo.rotateX(-Math.PI / 2);
    const clubMesh = new THREE.Mesh(clubGeo, new THREE.MeshLambertMaterial({ color: 0x6b4a2a }));
    clubMesh.position.set(0, 0, 0.42);
    group.add(clubMesh);
    
    // Spikes (decorative)
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const spikeGeo = new THREE.ConeGeometry(0.03, 0.08, 4);
        spikeGeo.rotateX(-Math.PI / 2);
        const spikeMesh = new THREE.Mesh(spikeGeo, new THREE.MeshLambertMaterial({ color: 0x4a3a2a }));
        spikeMesh.position.set(
            Math.cos(angle) * 0.1,
            Math.sin(angle) * 0.1,
            0.75
        );
        group.add(spikeMesh);
    }
    
    return markEquipment(group,'club',[0, 0, 0.02],'forwardZ');
}

/**
 * Create hammer (for blacksmith NPC)
 */
export function createHammer() {
    const group = new THREE.Group();
    group.position.y = -0.52;
    
    // Handle
    const handleGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.55, 8);
    handleGeo.rotateX(Math.PI / 2);
    const handleMesh = new THREE.Mesh(handleGeo, new THREE.MeshLambertMaterial({ color: 0x5a3b22 }));
    handleMesh.position.set(0, 0, 0.25);
    group.add(handleMesh);
    
    // Hammer head (rectangular with rounded edges)
    const headGeo = new THREE.BoxGeometry(0.18, 0.14, 0.14);
    const headMesh = new THREE.Mesh(headGeo, new THREE.MeshLambertMaterial({ color: 0x777b80 }));
    headMesh.position.set(0, 0, 0.54);
    group.add(headMesh);
    
    // Metal bands on head
    const band1 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.02, 8),
        new THREE.MeshLambertMaterial({ color: 0x5a5a5a })
    );
    band1.rotation.z = Math.PI / 2;
    band1.position.set(0, 0, 0.54);
    group.add(band1);
    
    return markEquipment(group,'hammer',[0, 0, 0.02],'forwardZ');
}

/**
 * Weapon factory - returns weapon mesh by type
 */
export const IMPROVED_WEAPON_FACTORIES = {
    sword: createKnightSword,
    shield: createKnightShield,
    bow: createRangerBow,
    staff: createMageStaff,
    axe: createAxe,
    replay_axe: () => makeReplayAxe('kn'),
    club: createClub,
    hammer: createHammer,
    sword_steel: () => createRelicSword(0xcad9e8,0xb8a271),
    sword_rune: () => createRelicSword(0x77d8ff,0x5077b6),
    sword_sun: () => createRelicSword(0xffe5a1,0xd4a246),
    bow_hunter: () => createRelicBow(0x8d5732,0xd8cd9e),
    bow_wind: () => createRelicBow(0x4a9b7a,0x93f5ce),
    bow_moon: () => createRelicBow(0x6577ac,0xa6bfff),
    staff_ember: () => createRelicStaff(0xff724c,0x9e3a22),
    staff_storm: () => createRelicStaff(0x9f96ff,0x454f9f),
    staff_star: () => createRelicStaff(0xffd986,0x9674b6),
    staff_vine: () => createRelicStaff(0x87ed92,0x326f43),
    staff_frost: () => createRelicStaff(0x91e8ff,0x4d85bc),
    staff_nature: () => createRelicStaff(0xc0ffb1,0x81aa49),
};

/** Additional distinct weapon silhouettes, all local procedural meshes. */
function createRelicSword(blade, gold){
  const w=createKnightSword();
  w.children.forEach(m=>{if(m.isMesh && m.material?.color){
    if(m.position.z>.17 && m.geometry.type!=='SphereGeometry')m.material=new THREE.MeshLambertMaterial({color:blade,emissive:blade,emissiveIntensity:0.1});
  }});
  const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.075,0),new THREE.MeshLambertMaterial({color:gold,emissive:gold,emissiveIntensity:.28}));
  gem.position.set(0,.017,.13);w.add(gem);
  const line=new THREE.Mesh(new THREE.BoxGeometry(.022,.014,.3),new THREE.MeshBasicMaterial({color:gold}));
  line.position.set(0,.028,.52);w.add(line);
  return w;
}
function createRelicBow(wood,glow){
  const w=createRangerBow();
  const arc=new THREE.Mesh(new THREE.TorusGeometry(.345,.027,7,21,Math.PI),new THREE.MeshLambertMaterial({color:wood}));
  arc.rotation.z=-Math.PI/2;w.add(arc);
  // A readable nocked arrow: shaft, tip and fletching.
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.009,.009,.67,6),new THREE.MeshLambertMaterial({color:0xe5d6a9}));
  shaft.rotation.x=Math.PI/2;shaft.position.set(0,0,.08);w.add(shaft);
  const tip=new THREE.Mesh(new THREE.ConeGeometry(.032,.11,5),new THREE.MeshLambertMaterial({color:glow,emissive:glow,emissiveIntensity:.12}));
  tip.rotation.x=Math.PI/2;tip.position.set(0,0,.45);w.add(tip);
  for(const s of [-1,1]){
    const feather=new THREE.Mesh(new THREE.BoxGeometry(.065,.008,.11),new THREE.MeshLambertMaterial({color:glow,side:THREE.DoubleSide}));
    feather.position.set(s*.042,0,-.20);w.add(feather);
  }
  return w;
}
function createRelicStaff(glow,wood){
  const w=createMageStaff();
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.034,.045,.88,9),new THREE.MeshLambertMaterial({color:wood}));
  shaft.rotation.x=Math.PI/2;shaft.position.set(0,0,.39);w.add(shaft);
  const halo=new THREE.Mesh(new THREE.TorusGeometry(.16,.017,6,20),new THREE.MeshLambertMaterial({color:glow,emissive:glow,emissiveIntensity:.22}));
  halo.position.set(0,0,.94);w.add(halo);
  const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.125,0),new THREE.MeshLambertMaterial({color:glow,emissive:glow,emissiveIntensity:.45}));
  crystal.position.set(0,0,.94);w.add(crystal);
  return w;
}
