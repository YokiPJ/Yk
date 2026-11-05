/**
 * Improved Character Models - Stylized Low-Poly Fantasy Characters
 * Using rounded geometry: spheres, capsules, tapered cylinders
 */

import * as THREE from 'three';
import {fitHeldWeapon,fitShield,groundRig} from './equipmentSockets.js';
import {addSurface} from '../assets/hinariaTextures.js';
import { MATERIALS } from '../assets/procedural.js';
import { gameState } from '../core/gameState.js';
import { batchCharacterMeshes } from './v6MeshBatching.js';

// Helper: Create tapered cylinder (capsule-like shape)
function createTaperedCylinder(radiusTop, radiusBottom, height, segments = 8) {
    return new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments);
}

// Helper: Create rounded head with face
function createStylizedHead(skinColor, hairColor, armor, faceTextureIndex) {
    const head = new THREE.Group();
    
    // Main head sphere (slightly egg-shaped)
    const headGeo = new THREE.SphereGeometry(0.19, 9, 7);
    headGeo.scale(1, 1.1, 1); // Slightly taller
    const headMesh = new THREE.Mesh(headGeo, new THREE.MeshLambertMaterial({ color: skinColor }));
    head.add(headMesh);
    
    // Eyes (simple spheres)
    const eyeGeo = new THREE.SphereGeometry(0.023, 5, 4);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    
    const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
    eye1.position.set(-0.06, 0.03, 0.16);
    head.add(eye1);
    
    const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
    eye2.position.set(0.06, 0.03, 0.16);
    head.add(eye2);
    
    // Nose (tiny sphere)
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 4), new THREE.MeshLambertMaterial({ color: skinColor }));
    nose.position.set(0, -0.02, 0.18);
    head.add(nose);
    
    // Hair or helmet
    if (armor && armor > 0) {
        // Helmet (rounded cap)
        const helmGeo = new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6);
        const helmMesh = new THREE.Mesh(helmGeo, new THREE.MeshLambertMaterial({ color: 0x8b8b8b }));
        helmMesh.position.y = 0.02;
        head.add(helmMesh);
        
        // Helmet rim
        const rimGeo = new THREE.TorusGeometry(0.19, 0.02, 6, 12, Math.PI * 2);
        const rimMesh = new THREE.Mesh(rimGeo, new THREE.MeshLambertMaterial({ color: 0x7a7a7a }));
        rimMesh.rotation.x = Math.PI / 2;
        rimMesh.position.y = -0.03;
        head.add(rimMesh);
        
        if (armor >= 3) {
            // Decorative plume
            const plumeGeo = new THREE.BoxGeometry(0.06, 0.25, 0.08);
            const plumeMesh = new THREE.Mesh(plumeGeo, new THREE.MeshLambertMaterial({ color: 0xc03030 }));
            plumeMesh.position.set(0, 0.24, 0);
            head.add(plumeMesh);
        }
    } else if (hairColor != null) {
        // Stylized hair (layered spheres)
        const hair1Geo = new THREE.SphereGeometry(0.19, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.65);
        const hair1Mesh = new THREE.Mesh(hair1Geo, new THREE.MeshLambertMaterial({ color: hairColor }));
        hair1Mesh.position.set(0, 0.03, -0.01);
        head.add(hair1Mesh);
        
        // Back hair volume
        const hair2Geo = new THREE.SphereGeometry(0.14, 8, 8);
        hair2Geo.scale(1.2, 1, 1.5);
        const hair2Mesh = new THREE.Mesh(hair2Geo, new THREE.MeshLambertMaterial({ color: hairColor }));
        hair2Mesh.position.set(0, 0, -0.12);
        head.add(hair2Mesh);
    }
    
    // Face texture overlay if provided
    if (faceTextureIndex != null && gameState.FT && gameState.FT[faceTextureIndex]) {
        const facePlane = new THREE.Mesh(
            new THREE.CircleGeometry(0.18, 20),
            new THREE.MeshBasicMaterial({ 
                map: gameState.FT[faceTextureIndex], 
                transparent: true,
                depthWrite: false
            })
        );
        facePlane.position.set(0, 0, 0.181);
        head.add(facePlane);
    }
    
    return head;
}

// Helper: Create stylized arm with rounded hand
function createStylizedArm(clothColor, skinColor, xPos) {
    const armGroup = new THREE.Group();
    armGroup.position.set(xPos, 1.17, 0);
    
    // Upper arm (tapered)
    const upperArmGeo = createTaperedCylinder(0.096, 0.072, 0.45, 7);
    const upperArmMesh = new THREE.Mesh(upperArmGeo, new THREE.MeshLambertMaterial({ color: clothColor }));
    upperArmMesh.position.set(0, -0.225, 0);
    armGroup.add(upperArmMesh);
    
    // Elbow (small sphere for joint)
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6), new THREE.MeshLambertMaterial({ color: clothColor }));
    elbow.position.set(0, -0.45, 0);
    armGroup.add(elbow);
    
    // Forearm (tapered to wrist)
    const forearmGeo = createTaperedCylinder(0.077, 0.057, 0.38, 7);
    const forearmMesh = new THREE.Mesh(forearmGeo, new THREE.MeshLambertMaterial({ color: skinColor }));
    forearmMesh.position.set(0, -0.64, 0);
    armGroup.add(forearmMesh);
    
    // Hand (rounded)
    const handGeo = new THREE.SphereGeometry(0.08, 8, 8);
    handGeo.scale(0.9, 1, 1.1);
    const handMesh = new THREE.Mesh(handGeo, new THREE.MeshLambertMaterial({ color: skinColor }));
    handMesh.position.set(0, -0.85, 0);
    armGroup.add(handMesh);
    
    return armGroup;
}

// Helper: Create stylized leg with boot
function createStylizedLeg(pantsColor, xPos, phase) {
    const legGroup = new THREE.Group();
    legGroup.position.set(xPos, 0.68, 0);
    legGroup.userData.p = phase;
    
    // Upper leg (tapered thigh)
    const thighGeo = createTaperedCylinder(0.11, 0.09, 0.42, 7);
    const thighMesh = new THREE.Mesh(thighGeo, new THREE.MeshLambertMaterial({ color: pantsColor }));
    thighMesh.position.set(0, -0.21, 0);
    legGroup.add(thighMesh);
    
    // Knee (small sphere)
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6), new THREE.MeshLambertMaterial({ color: pantsColor }));
    knee.position.set(0, -0.42, 0);
    legGroup.add(knee);
    
    // Lower leg (shin)
    const shinGeo = createTaperedCylinder(0.075, 0.08, 0.38, 8);
    const shinMesh = new THREE.Mesh(shinGeo, new THREE.MeshLambertMaterial({ color: pantsColor }));
    shinMesh.position.set(0, -0.61, 0);
    legGroup.add(shinMesh);
    
    // Boot (rounded, wider at toe)
    const bootGeo = new THREE.SphereGeometry(1, 8, 6);
    bootGeo.scale(0.11, 0.09, 0.19);
    bootGeo.translate(0, 0, 0.045);
    const bootMesh = new THREE.Mesh(bootGeo, new THREE.MeshLambertMaterial({ color: 0x3a2a1c }));
    bootMesh.position.set(0, -0.86, 0);
    legGroup.add(bootMesh);
    
    // Boot toe cap (rounded)
    const toeCap = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), new THREE.MeshLambertMaterial({ color: 0x2a1a0c }));
    toeCap.position.set(0, -0.86, 0.14);
    toeCap.scale.set(1.1, 0.8, 1.2);
    legGroup.add(toeCap);
    
    return legGroup;
}

// Helper: Create rounded torso
function createStylizedTorso(clothColor, beltColor) {
    const torsoGroup = new THREE.Group();
    
    // Faceted ellipsoid with a real rounded silhouette (no cube chest).
    const torsoGeo = new THREE.SphereGeometry(1, 9, 6);
    torsoGeo.scale(0.285, 0.37, 0.205);
    const torsoMesh = new THREE.Mesh(torsoGeo, new THREE.MeshLambertMaterial({ color: clothColor }));
    torsoMesh.position.set(0, 0.98, 0);
    torsoGroup.add(torsoMesh);
    
    // Chest plate detail (for armored characters - optional)
    const chestGeo = new THREE.SphereGeometry(1, 8, 5);
    chestGeo.scale(0.235, 0.19, 0.06);
    const chestMesh = new THREE.Mesh(chestGeo, new THREE.MeshLambertMaterial({ color: clothColor }));
    chestMesh.position.set(0, 1.05, 0.165);
    torsoGroup.add(chestMesh);
    
    // Belt (wider, more defined)
    const beltGeo = createTaperedCylinder(0.27, 0.26, 0.14, 12);
    const beltMesh = new THREE.Mesh(beltGeo, new THREE.MeshLambertMaterial({ color: beltColor }));
    beltMesh.position.set(0, 0.69, 0);
    torsoGroup.add(beltMesh);
    
    // Belt buckle
    const buckleGeo = new THREE.BoxGeometry(0.08, 0.1, 0.04);
    const buckleMesh = new THREE.Mesh(buckleGeo, new THREE.MeshLambertMaterial({ color: 0xc9a227 }));
    buckleMesh.position.set(0, 0.69, 0.16);
    torsoGroup.add(buckleMesh);
    
    return torsoGroup;
}

// Helper: Create rounded shoulder armor
function createShoulderArmor(color, xPos) {
    const shoulderGroup = new THREE.Group();
    shoulderGroup.position.set(xPos, 1.22, 0);
    
    // Main pauldron (rounded)
    const pauldronGeo = new THREE.SphereGeometry(0.13, 8, 8);
    pauldronGeo.scale(1.2, 0.9, 1.1);
    const pauldronMesh = new THREE.Mesh(pauldronGeo, new THREE.MeshLambertMaterial({ color: color }));
    shoulderGroup.add(pauldronMesh);
    
    // Layered plate detail
    const plateGeo = new THREE.SphereGeometry(0.11, 8, 6);
    plateGeo.scale(1.15, 0.7, 1);
    const plateMesh = new THREE.Mesh(plateGeo, new THREE.MeshLambertMaterial({ color: color }));
    plateMesh.position.y = -0.06;
    shoulderGroup.add(plateMesh);
    
    return shoulderGroup;
}

/**
 * Build improved character rig
 */
export function buildImprovedRig(opts) {
    const { 
        skin = 0xd9a97f, 
        hair = 0x5a3b22, 
        cloth = 0x8a5a35, 
        pants = 0x3d3328,
        belt = 0x2a1a0c,
        cape = null, 
        armor = 0, 
        weapon = null, 
        shield = null,
        scale = 1,
        face = null,
        role = 'adventurer'
    } = opts;
    
    const group = new THREE.Group();
    const unit = new THREE.Group();
    const rig = { 
        role, unit, 
        legs: [], 
        amp: 0.7, 
        sw: weapon === 'sword' ? 2.1 : 1,
        aim: weapon === 'bow',
        sit: false,
        head: null,
        armR: null,
        armL: null,
        cape: null
    };
    
    group.add(unit);
    group.userData.r = rig;
    unit.scale.setScalar(scale);
    
    // Shadow blob
    const shadowGeo = new THREE.CircleGeometry(0.32 * scale, 16);
    const shadowMat = new THREE.MeshBasicMaterial({ 
        color: 0x000000, 
        transparent: true, 
        opacity: 0.35 
    });
    const shadowBlob = new THREE.Mesh(shadowGeo, shadowMat);
    shadowBlob.rotation.x = -Math.PI / 2;
    shadowBlob.position.y = 0.02;
    shadowBlob.material.userData.g = 1;
    group.add(shadowBlob);
    
    // Torso
    const torso = createStylizedTorso(cloth, belt);
    unit.add(torso);

    const mat = (color, metalness = 0) => new THREE.MeshLambertMaterial({ color });
    const piece = (parent, geometry, color, x, y, z, sx = 1, sy = 1, sz = 1) => {
        // Rigid bracers/pauldrons and greaves follow their existing limb pivots.
        if(parent===unit && rig.armR && Math.abs(x)>=.29 && Math.abs(x)<=.44 && y>.76 && y<1.46 && Math.abs(z)<.20){
            const joint=x>0?rig.armR:rig.armL;x-=joint.position.x;y-=joint.position.y;z-=joint.position.z;parent=joint;
        }else if(parent===unit && rig.legs.length===2 && Math.abs(x)>=.08 && Math.abs(x)<=.22 && y<.65){
            const joint=x>0?rig.legs[0]:rig.legs[1];x-=joint.position.x;y-=joint.position.y;z-=joint.position.z;parent=joint;
        }
        const mesh = new THREE.Mesh(geometry, mat(color));
        mesh.position.set(x, y, z);
        mesh.scale.set(sx, sy, sz);
        parent.add(mesh);
        return mesh;
    };
    const orb = (rx, ry, rz, sides = 8) => {
        const g = new THREE.SphereGeometry(1, sides, 6);
        g.scale(rx, ry, rz);
        return g;
    };
    
    // Head
    const head = createStylizedHead(skin, hair, armor || (role === 'knight' ? 2 : 0), face);
    head.position.y = 1.45;
    rig.head = head;
    unit.add(head);
    
    // Arms
    rig.armR = createStylizedArm(cloth, skin, 0.33);
    rig.armL = createStylizedArm(cloth, skin, -0.33);
    unit.add(rig.armR);
    unit.add(rig.armL);
    
    // Legs
    const legR = createStylizedLeg(pants, 0.12, 0);
    const legL = createStylizedLeg(pants, -0.12, Math.PI);
    rig.legs.push(legR, legL);
    unit.add(legR);
    unit.add(legL);
    
    // Shoulder armor (for armored classes)
    if (armor > 1 || role === 'knight' || role === 'orc' || role === 'troll') {
        const armorColor = role === 'knight' ? 0x8e9dad : role === 'orc' ? 0x665e51 : armor === 2 ? 0x6a6a6a : (armor === 3 ? 0x8b8b8b : 0x9a9a9a);
        const shoulderR = createShoulderArmor(armorColor, 0.3);
        const shoulderL = createShoulderArmor(armorColor, -0.3);
        shoulderR.position.set(-.03,.05,0);shoulderL.position.set(.03,.05,0);
        rig.armR.add(shoulderR);rig.armL.add(shoulderL);
    }
    
    // Distinct silhouettes; these are decorative only and never affect collision.
    if (role === 'knight') {
        // Rounded steel breastplate, gold sun insignia, helmet crest.
        piece(unit, orb(0.255, 0.285, 0.17), 0x8599aa, 0, 1.02, 0.055);
        piece(unit, new THREE.OctahedronGeometry(0.105, 0), 0xf0c564, 0, 1.065, 0.242, 0.95, 1.4, 0.55);
        piece(head, orb(0.205, 0.14, 0.2), 0x647889, 0, 0.115, -0.012);
        piece(head, new THREE.BoxGeometry(0.25, 0.055, 0.055), 0xcab572, 0, -0.04, 0.17);
        piece(head, orb(0.06, 0.13, 0.085), 0xb33c39, 0, 0.26, -0.02);
        for (const x of [-0.345, 0.345]) {
            piece(unit, orb(0.15, 0.13, 0.155), 0x758da4, x, 1.21, 0.01);
            piece(unit, new THREE.BoxGeometry(0.095, 0.045, 0.2), 0xd2b96c, x, 1.245, 0);
        }
    } else if (role === 'ranger') {
        // Hood + leather shoulder clasp + quiver with arrows.
        piece(head, orb(0.224, 0.17, 0.215), 0x405c3e, 0, 0.105, -0.05);
        piece(head, new THREE.BoxGeometry(0.3, 0.055, 0.12), 0x36462b, 0, 0.02, 0.145);
        piece(unit, new THREE.BoxGeometry(0.09, 0.38, 0.095), 0x644024, -0.17, 1.07, -0.23);
        for (let i = 0; i < 3; i++) {
            piece(unit, new THREE.CylinderGeometry(0.009, 0.009, 0.34, 4), 0xe5d4a8,
                -0.2 + i * 0.034, 1.27, -0.23);
        }
        piece(unit, orb(0.22, 0.16, 0.07), 0x7c613a, 0.01, 1.08, 0.183);
    } else if (role === 'mage' || role === 'druid') {
        const accent = role === 'mage' ? 0x9d75cf : 0x87b57b;
        // Flared robe skirt, high collar and forehead gem.
        piece(unit, new THREE.CylinderGeometry(0.21, 0.36, 0.52, 9), cloth, 0, 0.63, 0);
        piece(unit, new THREE.CylinderGeometry(0.22, 0.29, 0.17, 9), accent, 0, 1.28, 0);
        piece(head, new THREE.OctahedronGeometry(0.075, 0), accent, 0, 0.1, 0.187, 0.7, 1.15, 0.5);
        if (role === 'mage') {
            piece(head, new THREE.ConeGeometry(0.205, 0.33, 9), 0x51408c, 0, 0.34, -0.04);
            piece(head, new THREE.CylinderGeometry(0.24, 0.24, 0.045, 10), 0x7861ae, 0, 0.19, -0.015);
        } else {
            piece(head, orb(0.2, 0.11, 0.2), 0x47784d, 0, 0.145, -0.015);
            piece(head, new THREE.ConeGeometry(0.07, 0.22, 5), 0x8db965, 0.12, 0.26, 0.02);
        }
    } else if (role === 'skeleton') {
        // Visible bone ribs and skull face distinguish it from a human bandit.
        for (let i = 0; i < 3; i++) {
            piece(unit, new THREE.TorusGeometry(0.18 - i * 0.015, 0.016, 4, 9, Math.PI),
                0xdad3b9, 0, 1.14 - i * 0.105, 0.195);
        }
        piece(head, orb(0.043, 0.048, 0.02), 0x272520, -0.068, 0.03, 0.167);
        piece(head, orb(0.043, 0.048, 0.02), 0x272520, 0.068, 0.03, 0.167);
    } else if (role === 'orc' || role === 'troll') {
        piece(head, new THREE.ConeGeometry(0.057, 0.14, 5), 0xeee2ba, -0.09, -0.135, 0.14);
        piece(head, new THREE.ConeGeometry(0.057, 0.14, 5), 0xeee2ba, 0.09, -0.135, 0.14);
        piece(unit, orb(0.29, 0.23, 0.23), cloth, 0, 1.0, 0);
    } else if (role === 'blacksmith') {
        piece(unit, orb(0.25, 0.3, 0.06), 0x523529, 0, 0.99, 0.2);
        piece(head, orb(0.15, 0.085, 0.075), hair ?? 0x5a3b22, 0, -0.13, 0.08);
    } else if (role === 'sage') {
        piece(unit, new THREE.CylinderGeometry(0.17, 0.32, 0.65, 8), 0x405c52, 0, 0.56, 0);
        piece(head, orb(0.23, 0.135, 0.2), 0x4c6e5e, 0, 0.11, -0.03);
    } else if (role === 'bandit') {
        piece(head, orb(0.215, 0.1, 0.2), 0x48352d, 0, 0.135, -0.02);
        piece(unit, new THREE.BoxGeometry(0.46, 0.085, 0.28), 0x756149, 0, 0.75, 0);
    }

    // V6 identity pass. Class and monster detail lives on the displayed rig,
    // so the original health/combat/quest contracts are untouched.
    const metal = 0x8799a3, gold = 0xd4ae65, bone=0xe2dcc3;
    const stud = (parent, x,y,z,c=gold,r=.029) => piece(parent, new THREE.SphereGeometry(r,6,5), c,x,y,z);
    if (role === 'knight') {
        for (const s of [-1,1]) {
            const x=s*.35;
            piece(unit,orb(.135,.24,.14),metal,x,.97,.10);
            piece(unit,new THREE.BoxGeometry(.12,.09,.33),gold,x,1.32,.02);
            for(let j=0;j<3;j++) stud(unit,x,.92-j*.09,.23,0xb3bcc3,.026);
            piece(unit,orb(.126,.14,.13),0x5e7081,s*.12,.52,.03);
        }
        // Shaped visor with respirator, crest and rivets.
        piece(head,new THREE.BoxGeometry(.32,.085,.065),0x465766,0,-.022,.194);
        for(const x of [-.15,.15]) stud(head,x,.06,.177,gold,.026);
        piece(unit,orb(.13,.20,.036),gold,0,1.03,.221);
        stud(unit,0,1.03,.264,0xf9e1a9,.037);
    } else if (role === 'ranger') {
        // layered leather tunic, greaves, arrows and cloak clasp
        for(const s of [-1,1]) {
            piece(unit,orb(.10,.23,.09),0x665039,s*.19,.90,.12);
            piece(unit,new THREE.CylinderGeometry(.055,.09,.30,7),0x56472d,s*.14,.30,.095);
        }
        piece(unit,new THREE.BoxGeometry(.52,.075,.42),0x9a7d4b,0,.69,0);
        stud(unit,0,1.28,.16,0xe5c679,.052);
        for(let j=0;j<4;j++) piece(unit,new THREE.CylinderGeometry(.013,.013,.28,5),0xcdb58c,
            -.21+j*.035,1.29,-.27);
    } else if (role === 'mage') {
        piece(unit,orb(.21,.28,.068),0x6743a4,0,1.03,.19);
        piece(unit,orb(.13,.18,.08),0xb59df3,0,1.05,.245);
        for(const s of [-1,1]) {
            piece(unit,orb(.14,.11,.11),0x8c72bd,s*.33,1.23,0);
            stud(unit,s*.32,1.23,.112,0xadd8f2,.052);
        }
        piece(head, new THREE.ConeGeometry(.20,.32,8),0x7860b3,0,.53,-.045);
        stud(head,0,.09,.193,0x77e5fa,.061);
    } else if (role === 'druid') {
        piece(unit,orb(.19,.27,.085),0x315941,0,1.05,.17);
        for(const s of [-1,1]) {
            piece(unit,new THREE.ConeGeometry(.095,.37,6),0x789d5c,s*.30,1.30,.0,1,1,1);
            piece(head,new THREE.ConeGeometry(.055,.31,6),0xc2ab79,s*.16,.32,-.04);
            piece(unit,orb(.16,.11,.13),0x49724d,s*.32,1.22,0);
        }
        stud(unit,0,1.02,.263,0xa5eeae,.078);
    } else if (role === 'orc') {
        // Broad jaw, jutting brows, iron harness, asymmetrical spikes.
        piece(head,orb(.23,.10,.19),0x517047,0,-.135,.08);
        piece(head,orb(.25,.085,.10),0x4b663d,0,.13,.13);
        for(const s of [-1,1]) {
            piece(head,new THREE.ConeGeometry(.064,.22,6),bone,s*.135,-.14,.20,1,1,1);
            piece(head,orb(.047,.031,.025),0xe9a66d,s*.083,.05,.178);
            piece(unit,orb(.18,.15,.15),0x594c45,s*.37,1.19,0);
            piece(unit,new THREE.ConeGeometry(.105,.30,6),0xa8aba1,s*.39,1.40,.01);
            piece(unit,orb(.115,.16,.10),0x4e3f37,s*.34,.75,.07);
            stud(unit,s*.32,.83,.185,0xb2b9b4,.044);
        }
        piece(unit,orb(.34,.25,.19),0x623733,0,1.05,.10);
        piece(unit,new THREE.BoxGeometry(.62,.13,.32),0x4b4d4b,0,.76,.0);
        for(let i=-1;i<=1;i++) stud(unit,i*.13,.76,.19,gold,.043);
    } else if (role === 'troll') {
        // Heavy hunched silhouette with a massive brow, belly and stone armor.
        piece(unit,orb(.37,.32,.29),0x6d8a54,0,.95,.1);
        piece(unit,orb(.29,.24,.17),0x78925f,0,.91,.28);
        piece(head,orb(.29,.12,.20),0x617c4f,0,.115,.05);
        piece(head,orb(.29,.16,.18),0x66794b,0,-.15,.09);
        for(const s of [-1,1]) {
            piece(unit,orb(.21,.14,.21),0x696b59,s*.35,1.24,.03);
            piece(unit,new THREE.ConeGeometry(.13,.26,6),0x9a9880,s*.42,1.40,.0);
            piece(head,new THREE.ConeGeometry(.055,.15,6),bone,s*.18,-.15,.15);
            piece(unit,orb(.14,.22,.13),0x5c6548,s*.14,.45,.08);
        }
        piece(unit,orb(.22,.09,.1),0x7b6247,0,.68,.21);
    } else if (role === 'skeleton') {
        // Bone outline over dark gaps, exposed spine, forearms and kneecaps.
        piece(unit,orb(.14,.20,.12),0xdad6be,0,1.01,.15);
        piece(unit,new THREE.CylinderGeometry(.05,.055,.53,7),bone,0,.98,-.17);
        for(const s of [-1,1]) {
            piece(unit,orb(.085,.12,.07),bone,s*.13,.48,.11);
            for(let j=0;j<3;j++)
                piece(unit,new THREE.CylinderGeometry(.022,.028,.33,6),bone,s*.16,1.21-j*.11,.16,1,1,1);
        }
        piece(head,new THREE.BoxGeometry(.26,.095,.1),bone,0,-.13,.175);
        for(let i=-2;i<=2;i++) stud(head,i*.047,-.133,.232,0x4b413b,.012);
    } else if (role === 'bandit') {
        piece(unit,orb(.23,.29,.08),0x575045,0,1.0,.19);
        for(const s of [-1,1]) {
            piece(unit,new THREE.BoxGeometry(.11,.5,.11),0x785b41,s*.30,.9,.08);
            piece(head,orb(.075,.045,.02),0x30302c,s*.073,.05,.191);
        }
        piece(unit,new THREE.BoxGeometry(.15,.13,.06),gold,0,.74,.175);
    } else if (role === 'blacksmith') {
        piece(unit,new THREE.BoxGeometry(.42,.46,.11),0x684634,0,.91,.20);
        for(const s of [-1,1]) {
            piece(unit,orb(.125,.15,.11),0x956c4c,s*.32,.91,.04);
            stud(unit,s*.28,.85,.136,gold,.033);
        }
        piece(unit,orb(.11,.11,.05),0xba9965,0,.76,.27);
    } else if (role === 'sage') {
        for(const s of [-1,1]) {
            piece(unit,orb(.14,.19,.13),0x55735e,s*.3,1.2,0);
            piece(head,new THREE.ConeGeometry(.055,.25,5),0x9d9b77,s*.16,.31,0);
        }
        piece(unit,orb(.16,.14,.055),0x89b9a0,0,1.08,.2);
        stud(unit,0,1.08,.25,0x78e9d1,.05);
    }
    // V7.5: richly readable class silhouettes. The adornments are rigid costume
    // meshes attached to the existing rig, so animation joints, colliders and
    // weapon attachment sockets are entirely unchanged.
    if (role === 'knight') {
        // Thick layered armored skirt and a heraldic brass breastplate.
        for (const side of [-1, 1]) {
            piece(unit, orb(.18,.24,.15,8), 0x657e94, side*.22,.66,.015);
            piece(unit,new THREE.BoxGeometry(.22,.07,.17), 0xc4a65f,side*.22,.86,.16);
            piece(rig.armR && side===1 ? rig.armR : rig.armL,
                orb(.095,.105,.10,7),0xaebac2,0,-.59,.014);
        }
        piece(unit,orb(.21,.23,.062),0x46647f,0,1.025,.275);
        piece(unit,new THREE.OctahedronGeometry(.11,0),0xf4cf77,0,1.075,.347,1,.92,.35);
        piece(head,orb(.11,.055,.07),0x354453,0,-.095,.193);
    } else if (role === 'ranger') {
        // Leather vest, over-shoulder strap, deep woodland hood and feathers.
        piece(unit,orb(.265,.32,.098),0x48593d,0,.99,.175);
        const strap=piece(unit,new THREE.BoxGeometry(.067,.69,.067),0xc7a171,-.018,1.02,.268);
        strap.rotation.z=-.46;
        for(const side of [-1,1]) {
            piece(unit,orb(.16,.135,.15,8),0x374d32,side*.32,1.23,.005);
            piece(unit,orb(.10,.23,.115,8),0x76563e,side*.15,.58,.10);
            piece(unit,new THREE.CylinderGeometry(.066,.10,.33,7),0x4e3b2f,side*.14,.33,.09);
        }
        piece(head,orb(.24,.145,.23),0x304a34,0,.155,-.075);
        piece(head,orb(.17,.045,.08),0x23372c,0,.018,.208);
        // Quiver feathers tall enough to read from a distant top-down camera.
        for(let i=0;i<3;i++)
            piece(unit,new THREE.ConeGeometry(.048,.155,5),i===1?0xe2d2ae:0x86a67b,
                -.215+i*.05,1.52,-.25);
        piece(unit,orb(.11,.12,.042),0xc4a365,0,.74,.25);
    } else if (role === 'mage') {
        // Broad split mantle, layered flowing robe, and glowing arcane badge.
        piece(unit,new THREE.CylinderGeometry(.26,.39,.58,10),0x56318b,0,.59,.005);
        piece(unit,new THREE.CylinderGeometry(.245,.345,.13,9),0xb296d1,0,.33,.004);
        for (const side of [-1,1]) {
            piece(unit,orb(.19,.17,.16),0x503675,side*.335,1.255,0);
            piece(unit,orb(.105,.20,.11),0x8c66b4,side*.315,.97,.04);
            piece(unit,new THREE.ConeGeometry(.07,.22,6),0xa38be0,side*.29,1.44,0);
            piece(unit,orb(.045,.055,.035),0x80e8ff,side*.29,1.27,.145);
        }
        piece(unit,orb(.18,.22,.07),0x32265f,0,1.035,.24);
        piece(unit,new THREE.OctahedronGeometry(.12,0),0x7fe9f4,0,1.055,.305,1,.85,.45);
        piece(head,orb(.125,.06,.13),0x352352,0,.235,.01);
        piece(head,new THREE.ConeGeometry(.08,.19,7),0x87b3de,0,.64,-.06);
    } else if (role === 'druid') {
        // A sturdy forest robe, bark pauldrons, leafed mantle, and amber brooch.
        piece(unit,new THREE.CylinderGeometry(.24,.395,.56,9),0x315a3c,0,.57,0);
        piece(unit,new THREE.CylinderGeometry(.27,.35,.10,9),0x78965a,0,.32,0);
        for (const side of [-1,1]) {
            piece(unit,orb(.205,.135,.16),0x4f7543,side*.33,1.23,.015);
            piece(unit,new THREE.ConeGeometry(.11,.27,6),0x8ba765,
                side*.36,1.36,.005,1,1,1);
            piece(unit,orb(.085,.18,.11),0x70543d,side*.15,.58,.08);
            piece(unit,orb(.07,.13,.08),0x9a7950,side*.30,.93,.07);
            piece(head,orb(.09,.055,.07),0xb5c488,side*.14,.20,.02);
        }
        piece(unit,orb(.18,.2,.065),0x254b32,0,1.04,.24);
        piece(unit,new THREE.OctahedronGeometry(.115,0),0xb0d57c,0,1.065,.299,1,.85,.5);
        piece(head,new THREE.ConeGeometry(.08,.28,6),0xb9b09a,0,.36,-.05);
        piece(unit,orb(.11,.09,.08),0x9b7e45,0,.73,.23);
    } else if (role === 'blacksmith') {
        // Thick leather apron and steel rivets turn Bram into a proper smith.
        piece(unit,new THREE.BoxGeometry(.46,.69,.075),0x70432c,0,.82,.255);
        piece(unit,new THREE.BoxGeometry(.37,.095,.085),0xb08b5b,0,.65,.3);
        for(const side of [-1,1]) {
            piece(unit,orb(.115,.22,.12),0x5f4230,side*.29,.94,.08);
            piece(unit,orb(.037,.037,.025),0xb3ada0,side*.17,1.08,.30);
        }
        piece(unit,orb(.12,.07,.11),0x37312c,0,.7,.30);
    } else if (role === 'sage') {
        // Yoki: layered moss-green collar, broad sleeves and leaf ornaments.
        piece(unit,new THREE.CylinderGeometry(.24,.40,.47,9),0x34554d,0,.49,.0);
        for(const side of [-1,1]) {
            piece(unit,orb(.175,.19,.16),0x577e59,side*.335,1.24,.0);
            piece(unit,new THREE.ConeGeometry(.1,.25,6),0x81a46c,side*.36,1.42,.01);
        }
        piece(unit,new THREE.OctahedronGeometry(.115,0),0x9be5bc,0,1.035,.287,.95,1.18,.53);
        piece(head,orb(.22,.09,.20),0x315d46,0,.21,-.01);
    }

    // Cape (if specified)
    if (cape) {
        const capeGroup = new THREE.Group();
        capeGroup.position.set(0, 1.25, -0.17);
        
        // Main cape mesh (slightly tapered)
        const capeGeo = new THREE.CylinderGeometry(0.25, 0.43, 0.8, 8, 1, true, Math.PI * 0.14, Math.PI * 0.72);
        const capeMesh = new THREE.Mesh(capeGeo, new THREE.MeshLambertMaterial({ color: cape }));
        capeMesh.position.set(0, -0.4, -0.02);
        capeGroup.add(capeMesh);
        
        // Cape collar
        const collarGeo = new THREE.BoxGeometry(0.48, 0.08, 0.06);
        const collarMesh = new THREE.Mesh(collarGeo, new THREE.MeshLambertMaterial({ color: cape }));
        collarMesh.position.set(0, 0, 0);
        capeGroup.add(collarMesh);
        
        rig.cape = capeGroup;
        unit.add(capeGroup);
    }
    
    // Merge static costume pieces locally, never across animated joints.
    // typeof guard also allows the legacy standalone test's model stub.
    // Textured clothing/skin accents: minimal unmerged materials, preserves rig animation.
    if(typeof addSurface==='function'){
      const unique=new Set();let applied=0;
      group.traverse(node=>{
        if(!node.isMesh||!node.material||Array.isArray(node.material)||node.material.map||
           node.material.transparent||node.material.vertexColors||applied>=9)return;
        const hex=node.material.color?.getHex?.();
        const id=hex===skin?(role==='orc'?'skin_orc':role==='troll'?'skin_troll':'skin_human'):
          hex===cloth?(role==='druid'?'leaf_pattern':'cloth_linen'):
          hex===cape?'cloth_crimson':null;
        if(!id||unique.has(node.material))return;
        // Cap the number of material instances protected from batching.
        unique.add(node.material);addSurface(node.material,id);applied++;
      });
    }
    rig.visualKind='classic';rig.handOffset=[0,-.85,0];
    if(typeof groundRig==='function')groundRig(rig);
    if (typeof batchCharacterMeshes === 'function') batchCharacterMeshes(group);
    return group;
}

/**
 * Attach weapon to character (imported from original system)
 */
export function attachWeaponToRig(rig, weaponMesh) {
    if (rig.armR && weaponMesh) {
        fitHeldWeapon(rig,weaponMesh);
    }
}

/**
 * Attach shield to character
 */
export function attachShieldToRig(rig, shieldMesh) {
    if (rig.armL && shieldMesh) {
        fitShield(rig,shieldMesh);
    }
}
