/** HINÁRIA V6 — handcrafted modular village architecture. */
import * as THREE from 'three';
import {addSurface} from '../assets/hinariaTextures.js';
import { batchCharacterMeshes } from '../player/v6MeshBatching.js';

const materials = new Map();
function mat(color, metalness = 0) {
    const key = `${color}:${metalness}`;
    if (!materials.has(key)) {
        const m=new THREE.MeshLambertMaterial({color,flatShading:true});
        // Preserve old V6 batching in gameplay: added maps only where material remains unmerged.
        const surface=({0xc3ad8d:'plaster',0xaed8cb:'mirror'})[color];
        if(surface && typeof addSurface==='function')addSurface(m,surface);
        materials.set(key,m);
    }
    return materials.get(key);
}
const wood = mat(0x64462e), woodLight = mat(0xa47a4f), stone=mat(0x8a8a81),
    gold=mat(0xd5ac65), glass=mat(0xaed8cb), dark=mat(0x3b302a);
function add(root, geometry, material, x=0,y=0,z=0, rx=0,ry=0,rz=0) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x,y,z);
    mesh.rotation.set(rx,ry,rz);
    root.add(mesh);
    return mesh;
}
function cube(root, w,h,d, material, x,y,z) {
    return add(root,new THREE.BoxGeometry(w,h,d),material,x,y,z);
}
/**
 * V7.6: closed, robust gable roof.  The V7.5 façade struts were mounted with
 * their pitch reversed, leaving long orange "antennae" sticking out of houses.
 * Every ridge/batten now follows the same geometric plane and stays inside
 * the eaves; there are no detached cross-braces.
 */
function gableRoof(root,w,d,roofColor,church=false) {
    const rise=church?1.29:1.02;
    const eaveY=1.83, halfW=w/2+.25, halfD=d/2+.30;
    const pitch=Math.atan2(rise,halfW);
    const slopeLength=Math.hypot(halfW,rise);
    const roof=mat(roofColor);
    const weathered=mat(shade(roofColor,.86));
    const ridgeMat=mat(shade(roofColor,1.13));
    const beam=mat(0x55402f);
    const warmPlaster=mat(0xc3ad8d);

    // Triangular solid gables close the holes below both roof faces.
    for (const face of [-1,1]) {
        const z=face*(halfD-.08);
        const geo=new THREE.BufferGeometry();
        geo.setAttribute('position',new THREE.Float32BufferAttribute([
            -halfW,eaveY,z, halfW,eaveY,z, 0,eaveY+rise,z
        ],3));
        geo.computeVertexNormals();
        const front=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({
            color:0xbfa98b,flatShading:true,side:THREE.DoubleSide
        }));
        root.add(front);
        // Horizontal lower board covers the end of the plaster gable.
        cube(root,halfW*2,.13,.14,beam,0,eaveY-.02,z+face*.025);
        // Small centered attic opening, not another protruding roof beam.
        cube(root,.42,.31,.055,wood,0,eaveY+.25,z+face*.055);
        cube(root,.30,.20,.06,dark,0,eaveY+.25,z+face*.09);
    }

    for(const side of [-1,1]) {
        const angle=-side*pitch;
        const centerX=side*halfW*.5, centerY=eaveY+rise*.5;
        const slab=add(root,new THREE.BoxGeometry(slopeLength+.08,.20,halfD*2+.08),
            roof,centerX,centerY,0);
        slab.rotation.z=angle;
        // Shingle bands lie ON the roof, rather than crossing the slope.
        for(let i=1;i<=5;i++) {
            const f=i/6;
            const board=add(root,new THREE.BoxGeometry(.075,.035,halfD*2+.06),
                (i%2?weathered:ridgeMat),side*halfW*f,
                eaveY+rise*(1-f)+.125,0);
            board.rotation.z=angle;
        }
        // Eaves: a short horizontal board, flush with the roof outline.
        cube(root,.19,.19,halfD*2+.17,beam,side*halfW,eaveY-.015,0);
        // End fascia follows the exact roof pitch (was reversed in V7.5).
        for(const face of [-1,1]) {
            const trim=add(root,new THREE.BoxGeometry(slopeLength+.10,.15,.12),
                wood,centerX,centerY,face*halfD);
            trim.rotation.z=angle;
        }
    }
    // Short solid ridge and capped tips; no giant diagonal poles.
    cube(root,.23,.17,halfD*2+.22,woodLight,0,eaveY+rise+.025,0);
    for(const z of [-halfD,halfD])
        cube(root,.31,.16,.22,wood,0,eaveY+rise+.03,z);
}
/** Fixed palette helper: keep shaded roofs muted and coherent. */
function shade(hex,mul){
    const c=n=>Math.min(255,Math.max(0,Math.round(n*mul)));
    return c((hex>>16)&255)<<16 | c((hex>>8)&255)<<8 | c(hex&255);
}
function window(root,x,y,z) {
    cube(root,.48,.48,.095,dark,x,y,z);
    cube(root,.37,.37,.11,glass,x,y,z+.009);
    cube(root,.055,.41,.13,wood,x,y,z+.035);
    cube(root,.44,.06,.13,wood,x,y,z+.035);
    cube(root,.61,.11,.2,stone,x,y-.28,z+.03);
}
function hangingLantern(root,x,y,z){
    cube(root,.06,.22,.06,wood,x,y+.16,z-.01);
    cube(root,.23,.06,.23,dark,x,y+.04,z);
    cube(root,.18,.28,.18,gold,x,y-.10,z+.01);
    cube(root,.13,.22,.13,glass,x,y-.10,z+.04);
    cube(root,.07,.05,.07,dark,x,y-.28,z);
}
function planter(root,x,y,z,w=.58){
    cube(root,w,.14,.27,wood,x,y,z);
    cube(root,w-.08,.09,.18,mat(0x4d5f35),x,y+.08,z+.01);
    for(let i=-1;i<=1;i++) add(root,new THREE.IcosahedronGeometry(.075,0),mat(i===0?0xe0c06f:0xc56f7b),x+i*w*.19,y+.18,z+.04);
}
function awning(root,x,y,z,w,d,color){
    cube(root,w,.08,d,mat(color),x,y,z);
    cube(root,.09,.62,.09,wood,x-w/2+.11,y-.33,z-d/2+.03);
    cube(root,.09,.62,.09,wood,x+w/2-.11,y-.33,z-d/2+.03);
    cube(root,w+.06,.07,.10,wood,x,y+.07,z-d/2+.02);
}
function roofDormer(root,x,y,z,roofColor){
    cube(root,.88,.42,.72,mat(0xc0aa87),x,y,z);
    cube(root,.91,.10,.14,wood,x,y+.24,z+.29);
    cube(root,.20,.32,.08,wood,x,y+.02,z+.37);
    cube(root,.16,.22,.09,glass,x,y+.02,z+.39);
    const shadeColor=shade(roofColor,.92);
    add(root,new THREE.BoxGeometry(.64,.13,.92),mat(shadeColor),x-.24,y+.42,z+.03,0,0,.55);
    add(root,new THREE.BoxGeometry(.64,.13,.92),mat(shadeColor),x+.24,y+.42,z+.03,0,0,-.55);
    cube(root,.11,.08,.96,woodLight,x,y+.60,z+.03);
}
export function buildVillageHouseV6(h,height=0) {
    const {w,d}=h;
    const root=new THREE.Group();
    root.name=h.church?'V6_Chapel':'V6_VillageHouse';
    // Muted plaster and wood are independent from character hit-flash paint.
    const wall=mat(h.b||0xb59d78);
    cube(root,w,.24,d,stone,0,.12,0);
    cube(root,w-.06,1.58,d-.06,wall,0,1.00,0);
    // Timber-framed walls: exposed vertical studs and floor band.
    for(const sx of [-1,1]) for(const sz of [-1,1])
        cube(root,.16,1.67,.16,wood,sx*w/2,.94,sz*d/2);
    cube(root,w+.06,.16,d+.06,wood,0,1.71,0);
    for(const x of [-w/2+.67,w/2-.67]) {
        cube(root,.10,1.55,.09,wood,x,.97,d/2+.02);
        cube(root,.10,1.55,.09,wood,x,.97,-d/2-.02);
    }
    cube(root,w+.09,.13,.12,wood,0,.42,d/2+.04);
    const face=d/2+.075;
    cube(root,.66,1.25,.10,dark,0,.72,face);
    cube(root,.51,1.14,.12,woodLight,0,.69,face+.025);
    cube(root,.13,.18,.08,gold,.18,.75,face+.11);
    cube(root,.82,.14,.18,stone,0,.09,face+.13);
    const wx=Math.min(w/2-.55,1.0);
    if (w>=2.95) {
        window(root,-wx,1.08,face);
        window(root,wx,1.08,face);
    }
    // V7: each village building gets recognizable architectural identity.
    // All ornaments are façade-mounted and do not create phantom collision.
    const district=h.district||'';
    if(district==='south tavern') {
        // Tavern: little restaurant silhouette inspired by miniature dioramas.
        awning(root,0,1.57,face+.57,2.28,.76,0xd2a15c);
        cube(root,1.48,.10,.83,mat(0x9c5b36),0,1.67,face+.41);
        cube(root,.92,.045,.9,mat(0xd2a15c),0,1.73,face+.43);
        cube(root,.08,.62,.08,wood,-w/2+.38,1.43,face+.24);
        cube(root,.57,.43,.07,mat(0xc59c5a),-w/2+.38,1.31,face+.34);
        cube(root,.41,.08,.08,dark,-w/2+.38,1.48,face+.39);
        cube(root,.55,.42,.35,woodLight,-w/2+.80,.34,face+.26);
        cube(root,.65,.14,.12,wood,0,.94,face+.27);
        roofDormer(root,0,2.43,face-.21,h.r||0x98533f);
    } else if (district==='eastern workshop') {
        // Workshop identity: tool rack + lean-to service canopy.
        for (let i=0;i<3;i++) {
            cube(root,.065,.45,.10,mat(0x656973),-w/2+.28+i*.18,1.19,face+.10);
            cube(root,.16,.07,.14,woodLight,-w/2+.28+i*.18,1.35,face+.1);
        }
        cube(root,.74,.12,.18,wood,.65,1.54,face+.1);
        awning(root,w/2-.52,1.53,.22,1.02,1.18,0x7f8e61);
        cube(root,.42,.72,.42,woodLight,w/2-.55,.45,-.18);
        cube(root,.58,.12,.18,mat(0x5c6770),w/2-.55,.83,-.18);
    } else if(district==='western farm') {
        // Farmhouse: herb planter and broad timber lintel.
        cube(root,1.04,.10,.20,wood,0,1.44,face+.13);
        cube(root,.33,.26,.065,mat(0xa7b56e),w/2-.36,1.34,face+.12);
        planter(root,w/2-.32,.54,face+.20,.46);
        cube(root,.34,.20,.08,mat(0xd1bc7a),-w/2+.34,.28,face+.15);
    } else if(district==='smith quarter') {
        cube(root,.7,.35,.06,mat(0x515761),w/2-.46,1.37,face+.12);
        cube(root,.36,.10,.08,mat(0xd5b56f),w/2-.46,1.48,face+.16);
        awning(root,.74,1.55,face+.54,1.12,.72,0x77534b);
        cube(root,.38,.58,.32,stone,.98,.42,face+.17);
        cube(root,.60,.10,.18,mat(0x6a7278),.98,.73,face+.22);
    } else if(district==='chapel') {
        cube(root,.12,.67,.08,mat(0xc9b47f),0,1.32,face+.14);
        cube(root,.44,.12,.08,mat(0xc9b47f),0,1.45,face+.14);
        cube(root,.26,.92,.07,mat(0x7aa8bb),0,1.01,face+.11);
        cube(root,.08,.88,.09,wood,0,1.01,face+.13);
        cube(root,.23,.08,.09,wood,0,1.01,face+.13);
    } else {
        // Coordinated window shutters and a planter for ordinary homes.
        if(w>2.9) for(const sx of [-1,1])
            cube(root,.14,.45,.09,woodLight,sx*(Math.min(w/2-.55,1.0)+.27),1.06,face+.12);
        planter(root,w/2-.38,.54,face+.20,.42);
    }
    // V7.6 façade details remain flush with walls and never obstruct the lane.
    const ornament=mat(h.church?0xb0a18a:0x927454);
    for (const side of [-1,1]) {
        // Stone corner pilasters and footings ground each building.
        cube(root,.27,.64,.29,stone,side*(w/2-.14),.41,d/2-.015);
        cube(root,.30,.22,.34,stone,side*(w/2-.14),.16,d/2+.008);
        // Stout timber brackets below the eaves; narrow enough not to block a door.
        cube(root,.17,.38,.24,wood,side*(w/2-.28),1.6,d/2+.11);
        // Window flowerboxes and shutters are wall-mounted, not tile obstacles.
        if(w>=2.95) {
            const px=side*Math.min(w/2-.55,1.0);
            cube(root,.64,.15,.30,wood,px,.68,face+.18);
            cube(root,.52,.11,.17,mat(0x548050),px,.79,face+.19);
            for(let i=-1;i<=1;i++) {
                add(root,new THREE.IcosahedronGeometry(.075,0),
                    mat(i===0?0xe5bf69:0xc16b78),px+i*.15,.87,face+.22);
            }
        }
    }
    // Timber half-frame in the side walls, clearly visible from overhead view.
    for(const side of [-1,1]) {
        cube(root,.14,1.38,.13,wood,side*w/2,.97,-d*.25);
        cube(root,.14,1.38,.13,wood,side*w/2,.97,d*.25);
        cube(root,.14,.12,d+.04,wood,side*w/2,1.32,0);
        cube(root,.14,.14,d+.04,wood,side*w/2,.60,0);
    }
    // Supported lintel and lantern brackets keep the door visually grounded.
    cube(root,.94,.18,.17,wood,0,1.37,face+.12);
    cube(root,.14,.18,.17,stone,-.33,.81,face+.12);
    cube(root,.14,.18,.17,stone,.33,.81,face+.12);
    hangingLantern(root,-.58,1.43,face+.19);
    hangingLantern(root,.58,1.43,face+.19);
    cube(root,.58,.10,.06,ornament,0,1.57,face+.15);

    // Doors remain visibly clear but physical walls use independent footprints.
    gableRoof(root,w,d,h.r||0x98533f,Boolean(h.church));
    const chimneyX=w/2-.52;
    cube(root,.47,1.02,.47,stone,chimneyX,2.65,-d/3);
    cube(root,.61,.14,.6,dark,chimneyX,3.17,-d/3);
    if(!h.church && w>=3.7) roofDormer(root,.12,2.48,face-.22,h.r||0x98533f);
    if(h.church) {
        const tx=w/2-.48, tz=-d/2+.48;
        cube(root,1.05,2.45,1.05,stone,tx,2.18,tz);
        add(root,new THREE.ConeGeometry(.78,1.55,4),mat(0x607d98),tx,4.15,tz,0,Math.PI/4,0);
        cube(root,.10,.62,.12,gold,tx,5.10,tz);
        cube(root,.42,.09,.12,gold,tx,5.18,tz);
        for(const side of [-1,1]) cube(root,.24,.92,.32,stone,side*(w/2-.18),.58,face-.04);
    }
    // Roof chimney cap detailing and district-colour crest (all batched).
    cube(root,.69,.08,.67,stone,chimneyX,3.26,-d/3);
    cube(root,.46,.06,.46,dark,chimneyX,3.315,-d/3);
    root.position.set(h.x,height,h.z);
    batchCharacterMeshes(root);
    root.userData.collider={shape:'box',halfWidth:w/2,halfDepth:d/2};
    return root;
}

export function buildForgeV6(height=0) {
    const root=new THREE.Group();root.name='V6_Forge';
    cube(root,3.35,.25,3.30,stone,0,.13,0);
    cube(root,3.03,1.63,3.02,mat(0x987756),0,.98,0);
    for(const x of [-1.43,1.43]) for(const z of [-1.43,1.43])
        cube(root,.19,1.6,.19,wood,x,.95,z);
    gableRoof(root,3.2,3.2,0x77443b);
    cube(root,.80,1.14,.12,dark,0,.72,1.57);
    cube(root,.60,1.06,.14,woodLight,0,.72,1.64);
    cube(root,.50,.50,.14,glass,-.96,1.16,1.57);
    cube(root,.50,.50,.14,glass,.96,1.16,1.57);
    cube(root,.66,1.32,.6,stone,1.02,2.9,-.85);
    cube(root,.78,.12,.72,dark,1.02,3.57,-.85);
    // Smith's workshop receives the same chunky architecture treatment.
    for(const side of [-1,1]) {
        cube(root,.30,.77,.29,stone,side*1.42,.42,1.47);
        cube(root,.27,.22,.33,wood,side*1.42,1.53,1.5);
        cube(root,.24,.40,.30,wood,side*1.33,1.72,1.32);
    }
    cube(root,1.08,.18,.26,wood,0,1.46,1.62);
    cube(root,.76,.22,.18,mat(0xb18b4a),0,1.70,1.67);
    awning(root,-.92,1.63,1.76,1.34,.82,0x94643c);
    cube(root,.92,.18,.44,woodLight,-.92,.47,1.46);
    cube(root,.18,.52,.18,stone,-1.22,.82,1.48);
    cube(root,.32,.18,.44,mat(0x6f777d),-.60,.82,1.48);
    cube(root,.56,.12,.22,mat(0xb0bac1),-.60,1.02,1.48);
    cube(root,.38,.78,.38,woodLight,-1.38,.52,-.85);
    cube(root,.52,.11,.16,mat(0x5a6168),-1.38,.94,-.85);
    hangingLantern(root,.96,1.58,1.69);
    hangingLantern(root,-.96,1.58,1.69);
    // Two horizontal steel bands around the chimney add industrial mass.
    cube(root,.84,.11,.78,mat(0x57585b),1.02,3.18,-.85);
    cube(root,.78,.10,.75,stone,1.02,3.56,-.85);
    root.position.set(17,height,6);
    batchCharacterMeshes(root);
    root.userData.collider={shape:'box',halfWidth:1.55,halfDepth:1.55};
    return root;
}
