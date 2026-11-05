/**
 * World Generation & Management
 * Handles terrain, biomes, objects, collision, pathfinding grid
 */

import * as THREE from 'three';
import { CONFIG } from '../core/config.js';
import { gameState } from '../core/gameState.js';
import { initAssets, OBJECT_GEOMETRIES, MATERIALS, TYPE_MATERIALS, WOOD } from '../assets/procedural.js';
import { buildVillageHouseV6, buildForgeV6 } from './v6Architecture.js';
import {createEnvironmentV2, getV2EnvironmentTexture} from '../assets/environmentV2.js';
import { buildVillageDressingV3, updateVillageModelsV3 } from '../assets/villageModelsV3.js';
import {addSurface, decorateTerrainCanvas} from '../assets/hinariaTextures.js';
import { registerChunkVisual } from './chunkVisibility.js';

// Seeded random for reproducible world
let seed = 11;
const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export const rnd = (a, b) => a + R() * (b - a);
export const ri = (a, b) => Math.floor(rnd(a, b + 1));

// World constants
const W = CONFIG.WORLD_SIZE;
const BLK = new Set(['pine','oak','dead','rock','fence','barrel','crate','pillar','wall','well','stall','tent','altar']);

// Height modifiers (hills)
const HS = [[29, 28, 1.4, 10], [58, 30, 1.8, 14]];

// River X position function
const xr = (z) => 33 + 2.2 * Math.sin(z * 0.14);
const ev = (x, z) => ((x - 13) / 11.5) ** 2 + ((z - 12.5) / 10.5) ** 2;
const inV = (x, z) => ev(x, z) < 1;
const isW = (x, z) => Math.abs(x - xr(z)) < 1.5 || ((x - 36) / 6) ** 2 + ((z - 31) / 4.6) ** 2 < 1 || Math.hypot(x - 10, z - 50) < 2.4;
const LEGACY_MAP_SIZE = 64;
// Old map coordinates, quests, bridges and boss caves retain their exact zones.
// Only newly added land gets a separate classification using existing zone IDs.
const zoneOf = (x, z) => {
    if (x < LEGACY_MAP_SIZE && z < LEGACY_MAP_SIZE)
        return inV(x, z) ? 0 : x >= 52 && z >= 52 ? 6 : x >= 37 ? (z < 24 ? 4 : 5) : z >= 37 ? 2 : 1;
    if (z >= 64 && x < 35) return 2;   // Southern woodland
    if (x >= 64 && z < 28) return 4;   // Eastern ruin plateau
    if (x >= 64 && z >= 54 && x < 76) return 2; // Forest-to-eastern-ridge transition
    return 5;                           // Dangerous frontier
};

// Block a tile
function blk(x, z) {
    if (x >= 0 && z >= 0 && x < W && z < W) gameState.B[x][z] = 1;
}

// Add object
function ob(t, x, z, o = {}) {
    gameState.OB.push(Object.assign({ t, x, z, r: 0, s: 1 }, o));
    if (BLK.has(t) && !(o && o.nb)) blk(Math.round(x), Math.round(z));
}

// Add clearing
function clr(x, z, r) { gameState.CLR.push([x, z, r]); }

// Add landmark
function lm(n, x, z, r = 3) { gameState.LM.push({ n, x, z, r, f: 0 }); }

// Add chest
function chs(x, z, g, n) { gameState.CH.push({ x, z, g, n, o: 0 }); blk(x, z); clr(x, z, 2); }

// Add house
function house(x, z, w, d, o = {}) {
    gameState.HO.push(Object.assign({ x, z, w, d }, o));
    for (let i = Math.ceil(x - w / 2 + 0.01); i <= Math.floor(x + w / 2 - 0.01); i++)
        for (let j = Math.ceil(z - d / 2 + 0.01); j <= Math.floor(z + d / 2 - 0.01); j++) blk(i, j);
    clr(x, z + d / 2 + 1, 1.5);
}

// Road drawing
function road(pts, r, ty) {
    for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
        const n = Math.ceil(Math.hypot(bx - ax, bz - az) * 2);
        for (let k = 0; k <= n; k++) {
            const px = ax + (bx - ax) * k / n, pz = az + (bz - az) * k / n;
            for (let x = Math.floor(px - r - 1); x <= px + r + 1; x++)
                for (let z = Math.floor(pz - r - 1); z <= pz + r + 1; z++) {
                    if (x < 1 || z < 1 || x >= W - 1 || z >= W - 1 || gameState.G[x][z] === 3) continue;
                    if (Math.hypot(x - px, z - pz) <= r && gameState.G[x][z] !== 2) gameState.G[x][z] = ty;
                }
        }
    }
}

// Vegetation scatter helper
const tint = (a, b) => ri(a, b) * 65793;
const nearClr = (x, z) => gameState.CLR.some(c => Math.hypot(x - c[0], z - c[1]) < c[2]);
const sc = (t, x, z, o) => ob(t, x + rnd(-0.28, 0.28), z + rnd(-0.28, 0.28), Object.assign({ r: R() * 6.28, c: tint(180, 255) }, o));
const FC = [0xff7aa8, 0xfff070, 0xc9a0ff, 0xffffff, 0x8ab4f8];

/**
 * Generate the complete world
 */
export function generateWorld() {
    // Initialize arrays
    for (let x = 0; x < W; x++) {
        gameState.G.push(new Uint8Array(W));
        gameState.ZN.push(new Uint8Array(W));
        gameState.B.push(Array(W).fill(0));
    }
    
    // Base terrain types
    for (let x = 0; x < W; x++) for (let z = 0; z < W; z++) {
        gameState.ZN[x][z] = zoneOf(x, z);
        if (isW(x, z)) { gameState.G[x][z] = 3; gameState.B[x][z] = 1; }
        if (x === 0 || z === 0 || x === W - 1 || z === W - 1) gameState.B[x][z] = 1;
    }
    
    // Roads
    road([[17, 9], [17, 24]], 0.5, 2);
    road([[17, 24], [18, 30], [20, 36], [22, 42], [22, 45]], 1.1, 1);
    road([[17, 15], [24, 15], [31, 15], [36, 15], [42, 13], [46, 12]], 1.1, 1);
    road([[40, 15], [43, 22], [46, 30], [49, 38], [51, 45], [55, 52], [57, 55]], 1.1, 1);
    road([[24, 15], [26, 20], [24, 26], [27, 31], [22, 34], [21, 36]], 0.9, 1);
    road([[22, 45], [27, 49], [34, 49], [42, 49], [50, 51], [57, 55]], 1.1, 1);
    // Small paths
    road([[10, 14], [7, 13], [6, 10], [7, 8], [6, 7]], 0.6, 1);
    road([[12, 13], [12, 8], [11.5, 7]], 0.6, 1);
    road([[16, 16], [9, 19], [5, 19]], 0.6, 1);
    road([[17, 17], [21, 19]], 0.6, 1);
    road([[21, 15], [21, 13]], 0.6, 1);
    road([[9, 13], [9, 14]], 0.6, 1);
    road([[22, 44], [17, 42], [11, 41]], 0.6, 1);
    road([[11, 43], [14, 47], [14, 52], [9, 56], [6, 60]], 0.6, 1);
    road([[22, 49], [24, 53], [27, 58], [28, 61]], 0.6, 1);
    road([[56, 12], [58, 8], [60, 4.5]], 0.6, 1);
    
    // V3: connect Vilarrubra's square, blacksmith and Yoki with legible walking lanes.
    // Visual terrain paint only: never change collision, NPC/quest coordinates or zones.
    road([[13, 15], [17, 15], [17, 11], [17, 9]], 0.9, 2);
    road([[13, 15], [10, 14], [7, 11], [6, 8], [6, 6]], 0.85, 1);
    road([[13, 16], [12, 19], [12, 21]], 0.65, 1);

    // EXPANSÃO 96x96: novos caminhos APENAS fora da área histórica.
    // Preserve every quest coordinate, historical town road, boss encounter and old bridge.
    road([[22, 59], [24, 63], [22, 69], [16, 76], [10, 82], [12, 89]], 1.05, 1);
    road([[35, 61], [35, 67], [35, 73], [40, 78], [46, 84], [49, 91]], 1.10, 1);
    road([[57, 19], [63, 20], [69, 19], [76, 15], [84, 13], [91, 10]], 1.12, 1);
    road([[58, 43], [63, 44], [70, 44], [79, 47], [87, 53], [92, 60]], 1.03, 1);
    road([[64, 70], [72, 70], [80, 76], [87, 82], [91, 89]], 1.10, 1);
    road([[35, 73], [44, 73], [54, 70], [64, 70]], 1.08, 1);

    // Bridge areas (water -> land)
    for (const [z0, z1] of [[14, 16], [48, 50], [72, 74], [87, 89]]) {
        let a = 99, b = 0;
        for (let z = z0; z <= z1; z++)
            for (let x = Math.floor(xr(z)) - 3; x <= Math.floor(xr(z)) + 3; x++)
                if (gameState.G[x][z] === 3) { gameState.G[x][z] = 4; gameState.B[x][z] = 0; a = Math.min(a, x); b = Math.max(b, x); }
        gameState.BRG.push({ x0: a, x1: b, z0, z1 });
        // The detailed bridge has guardrails near its +/-Z edges. Keep the
        // center lane crossable but do not allow entities to walk through
        // those rails or stand on the river surface beside the deck.
        if (a <= b) {
            const mid = Math.round((z0 + z1) / 2);
            for (let x = a; x <= b; x++) for (let z = z0; z <= z1; z++) {
                if (gameState.G[x]?.[z] !== 4) continue;
                gameState.B[x][z] = z === mid ? 0 : 1;
            }
        }
    }
    
    // Biome fill
    for (let x = 0; x < W; x++) for (let z = 0; z < W; z++)
        if (gameState.G[x][z] === 0) {
            const q = gameState.ZN[x][z];
            gameState.G[x][z] = q === 2 ? 5 : q === 5 ? 6 : q === 6 ? 8 : 0;
        }
    
    // V4: Village composed as distinct neighborhoods, not a few unrelated houses.
    // The central piazza remains centered on the original player spawn (13,15).
    // Streets remain purely visual; obstacles are defined by structures/props below.
    for (let x = 9; x <= 18; x++) for (let z = 12; z <= 19; z++) {
        const corner = (x <= 10 || x >= 17) && (z <= 13 || z >= 18);
        if (!corner && gameState.G[x][z] !== 3 && gameState.G[x][z] !== 4)
            gameState.G[x][z] = 2;
    }
    // Blacksmith's lane, chapel approach, Yoki's lane and the east/south gates.
    for (let x = 15; x <= 19; x++) for (let z = 8; z <= 11; z++)
        if (gameState.G[x][z] !== 3) gameState.G[x][z] = 2;
    road([[13, 14], [12, 11], [11, 8], [11, 7]], 0.9, 2);
    road([[15, 15], [18, 15], [21, 15], [24, 15]], 0.9, 2);
    road([[16, 17], [17, 20], [17, 23], [17, 25]], 0.9, 2);
    road([[11, 14], [8, 12], [7, 10], [6, 7]], 0.8, 1);
    
    // Ruins area
    for (let x = 46; x <= 54; x++) for (let z = 8; z <= 16; z++) if (gameState.G[x][z] !== 1) gameState.G[x][z] = 7;
    for (let x = 59; x <= 61; x++) for (let z = 3; z <= 5; z++) gameState.G[x][z] = 7;
    
    // Cave area
    for (let x = 52; x <= 62; x++) for (let z = 52; z <= 62; z++) {
        if (z < 56) { if (gameState.G[x][z] !== 1) gameState.G[x][z] = 8; continue; }
        const ch = x >= 56 && x <= 60 && z >= 58 && z <= 61;
        const co = x >= 57 && x <= 58 && z <= 57;
        gameState.G[x][z] = 8;
        if (!ch && !co) { gameState.B[x][z] = 1; ob('cliff', x + rnd(-0.2, 0.2), z + rnd(-0.2, 0.2), { s: rnd(1.5, 2.2), sy: rnd(1.3, 2.3), r: R() * 6 }); }
    }
    
    // Shore transition
    for (let x = 1; x < W - 1; x++) for (let z = 1; z < W - 1; z++) {
        const g = gameState.G[x][z];
        if (g !== 0 && g !== 5 && g !== 6) continue;
        let s = 0;
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) if (gameState.G[x + i][z + j] === 3) s = 1;
        if (s) gameState.G[x][z] = 9;
    }
    
    // --- V7 VILARRUBRA: designed neighborhoods, not scattered props. ---
    // Every visual asset and its collision footprint is placed in this pass.
    // Logical NPC coordinates/quest IDs remain exactly where they were.
    const houses = [
        // WEST: warm cottages and smallholdings
        [8.5,11,3,3,{b:0xb99b78,r:0x805747,district:'western cottages'}],
        [5,17.5,3,3,{b:0x9e8665,r:0x6b5146,district:'western farm'}],
        // EAST: artisanal quarter, clear of the eastbound road
        [22,17.5,3,3,{b:0xc0ad8a,r:0x76564b,district:'artisan quarter'}],
        [22,11,3,3,{b:0xa48d6d,r:0x637b63,district:'eastern workshop'}],
        // SOUTH: tavern facing the civic plaza
        [11,21,4,3,{b:0xb7a07c,r:0x7a5648,district:'south tavern'}],
        // NORTH: chapel, smithing quarter and existing forge
        [11.5,5,4,3,{church:1,b:0xcab99a,r:0x667f9b,district:'chapel'}],
        [21,6.4,2.8,2.6,{b:0xa78e70,r:0x77534b,district:'smith quarter'}],
    ];
    for(const [x,z,w,d,style] of houses) house(x,z,w,d,style);

    // A central paved square, unobstructed for the player and quest gatherings.
    // Each entrance points towards the open road, not a fence or a market crate.
    // Farm fencing uses a real gap facing the road.
    function fieldFence(x0,z0,x1,z1,gx,gz) {
        for(let x=x0;x<=x1;x++) for(let z=z0;z<=z1;z++) {
            if((x===x0||x===x1||z===z0||z===z1) && !(x===gx && z===gz))
                ob('fence',x,z,{r:(z===z0||z===z1)?0:Math.PI/2,district:'garden'});
        }
    }
    fieldFence(19,23,23,25,21,23);
    for(let x=20;x<=22;x++) ob('crop',x,24,{district:'east allotment'});
    fieldFence(3,12,7,14,5,14);
    for(let x=4;x<=6;x++) ob('crop',x,13,{district:'west allotment'});

    // Place blocking decoration only on clear cells. Store the district on each
    // object so future iterations can re-layout by zone without touching combat.
    const protectedPoints = [[13,15,2.9],[17,9,1.75],[6,6,1.8],
        [17,12,1.0],[17,15,1.05],[17,18,1.0],[17,23,1.0],
        [21,15,1.0],[24,15,1.0],[7,9,1.0],[10,14,1.0]];
    function villageProp(t,x,z,district,o={}) {
        const blocked = ['barrel','crate','well','stall','fence'].includes(t);
        const cx=Math.round(x),cz=Math.round(z);
        if(blocked && (gameState.B[cx]?.[cz] || protectedPoints.some(([a,b,r]) => Math.hypot(x-a,z-b)<r))) return false;
        if(blocked && t==='stall') {
            // A market stall is 2 tiles wide. Both tiles form its physical base.
            const lx=Math.floor(x),rx=Math.ceil(x), iz=Math.round(z);
            if(gameState.B[lx]?.[iz]||gameState.B[rx]?.[iz]) return false;
            ob(t,x,z,{...o,district,nb:1});blk(lx,iz);blk(rx,iz);return true;
        }
        ob(t,x,z,{...o,district,nb:!blocked||o.nb?1:undefined});
        return true;
    }
    // WATER / COMMERCE: market awnings and well around (not inside) the square.
    // Well is on the WEST edge of the plaza, not pressed against the cottage.
    villageProp('well',9.4,16.9,'plaza');
    villageProp('stall',15.5,12.1,'north market');
    villageProp('stall',10.5,18.4,'south market',{r:Math.PI});

    // V7.7: low-profile goods along the OUTER edges of the market stalls.
    // Deliberately nonblocking, placed away from the main 13,15 spawn and
    // NPC approaches; never lay out props in the central walking circle.
    for (const [x,z,r] of [[14.2,10.7,.2],[16.8,10.7,-.3],
                           [9.2,19.6,.15],[11.9,19.6,-.2]])
        villageProp('basket',x,z,'market goods',{r,nb:1});
    for (const [x,z] of [[14.5,10.25],[11.8,19.9]])
        villageProp('sack',x,z,'market goods',{nb:1});
    // Planters frame the plaza without introducing invisible blocking tiles.
    for (const [x,z] of [[8.9,17.5],[19.5,12.0],[19.4,19.4],[12.4,19.8]])
        villageProp('planter',x,z,'plaza greens',{nb:1});

    // STORAGE: crates and barrels now live in compact building-side depots.
    for(const [x,z] of [[7,14],[8,14],[20,8],[20,9],[6,20],[23,20]])
        villageProp('barrel',x,z,'storage',{r:R()*6});
    for(const [x,z] of [[8,19],[9,19],[15,7],[15,6],[23,21]])
        villageProp('crate',x,z,'storage',{r:R()*6,s:rnd(.85,1.1)});

    // LIGHTING: fully remove the old village 'torch' objects. Low-profile
    // crafted lanterns give each district a consistent medieval visual language.
    const lights = [
        [9,15,'west entry'],[19,12,'east square'],[19,18,'south east'],
        [9,19,'tavern'],[16,21,'south gate'],[23,13,'workshop'],
        [24,18,'east homes'],[15,9,'smith quarter'],[13,9,'chapel lane'],
        [7,8,'yoki garden'],[17,11,'forge approach']
    ];
    for(const [x,z,district] of lights) villageProp('lantern',x,z,district,{nb:1});
    for(const [x,z,r] of [[23,13,-.5],[16,23,.3]])
        villageProp('sign',x,z,'wayfinding',{r,nb:1});

    // Planting beds and orchards sit OUTSIDE travel lanes and the 13,15 spawn.
    for(const [x,z] of [[12,11],[13,11],[14,11],[12,20],[13,20],[14,20],
                         [7.7,15],[7.7,17],[19,10],[20,12],[20,20],[7,9]])
        villageProp('flowerbed',x+.12,z+.08,'landscaping',{nb:1});
    for(const [x,z] of [[3,8],[3,10],[4,4],[9,3],[17,3],[24,7],
                         [25,10],[25,21],[20,25],[8,24]]) {
        if(!nearClr(x,z) && !gameState.B[x][z])
            villageProp('oak',x,z,'village orchard',{s:.78+R()*.15,c:tint(165,215)});
    }
    for(const [x,z] of [[19.5,14],[19.8,16.2],[6.8,8.1],[7.8,8.4]])
        villageProp('flower',x,z,'garden',{nb:1,c:FC[ri(0,4)],s:1.2});

    // Transition path clearings: ensure the visual paths are not swallowed by
    // the subsequent forest scatter, especially on the southbound quest route.
    for (const [x, z, r] of [[17, 26, 1.6], [17, 29, 1.4], [18, 32, 1.4],
                             [19.5, 35, 1.65], [21, 39, 1.4], [22, 42, 1.5],
                             [22, 45, 2.0], [25, 47, 1.4], [28, 49, 1.5],
                             [30, 15, 1.45], [33, 15, 1.3]]) clr(x, z, r);

    // Narrow visibility corridors lead from the main road into the deep forest.
    // Clearings affect ONLY future procedural vegetation, not placed props.
    for (const [x, z, r] of [
        [20, 36, 1.4], [21, 40, 1.35], [19, 43, 1.25],
        [16, 42, 1.2], [14, 47, 1.2], [13, 51, 1.25],
        [24, 51, 1.1], [26, 55, 1.15]
    ]) clr(x, z, r);

    // --- Ruins ---
    for (let x = 45; x <= 55; x++) for (let z = 7; z <= 17; z++)
        if (x === 45 || x === 55 || z === 7 || z === 17) {
            if ((x === 45 && z >= 11 && z <= 13) || (z === 17 && x >= 49 && x <= 51) || (x === 55 && z >= 11 && z <= 12) || R() < 0.22) continue;
            ob('wall', x, z, { r: (z === 7 || z === 17) ? 0 : Math.PI / 2, sy: rnd(0.35, 1.15) });
        }
    for (const [x, z] of [[47, 9], [53, 9], [47, 15], [53, 15], [50, 15]]) ob('pillar', x, z, { sy: R() < 0.5 ? 1 : rnd(0.35, 0.7) });
    ob('altar', 50, 9, {});
    chs(50, 10, 90, 'Santuário das Ruínas');
    for (const [x, z] of [[44, 10], [44, 14], [48, 18], [52, 18]]) ob('torch', x, z, {});
    for (const [x, z] of [[59, 3], [61, 3], [61, 5]]) ob('pillar', x, z, { sy: rnd(0.5, 1) });
    chs(60, 4, 70, 'Cripta Escondida');
    clr(50, 12, 4); clr(46, 12, 2.5); clr(60, 5, 2.5); clr(57, 8, 0.8);
    
    // --- Dangerous lands ---
    ob('tent', 50, 33, { c: 0xb09a80 });
    ob('tent', 54, 33, { c: 0xb09a80, r: 1 });
    ob('fire', 52, 35, {});
    ob('crate', 50, 36, {});
    ob('crate', 54, 37, { r: 0.4 });
    chs(53, 37, 50, 'Saque dos Trolls');
    clr(52, 35, 3.5);
    
    for (let x = 42; x <= 46; x++) for (let z = 38; z <= 42; z++)
        if ((x === 42 || x === 46 || z === 38 || z === 42) && !(x === 44 && z === 42) && !(x === 42 && z === 40) && R() > 0.15)
            ob('wall', x, z, { r: (z === 38 || z === 42) ? 0 : Math.PI / 2, sy: rnd(0.5, 1.3) });
    ob('pillar', 44, 40, { sy: 1 });
    clr(44, 40, 2.2);
    ob('torch', 43, 43, {});
    ob('torch', 45, 43, {});
    
    ob('altar', 58, 30, {});
    ob('torch', 57, 29, {});
    ob('torch', 59, 31, {});
    ob('sign', 29, 29, { r: 0.4 });
    ob('lamp', 30, 28, {});
    clr(58, 30, 2);
    clr(29, 28, 2);
    
    // --- Forest ---
    clr(22, 47, 3.6);
    ob('tent', 20, 45, { c: 0x9a8a6a });
    ob('tent', 24, 45, { c: 0x9a8a6a, r: 2 });
    ob('fire', 22, 47, {});
    ob('log', 20, 48, { r: 0.3 });
    ob('log', 24, 48, { r: -0.4 });
    ob('crate', 24, 44, {});
    ob('barrel', 20, 49, {});
    
    clr(10, 41, 2.8);
    for (let i = 0; i < 46; i++) {
        const a = R() * 6.28, d = Math.sqrt(R()) * 2.6;
        ob('flower', 10 + Math.cos(a) * d, 41 + Math.sin(a) * d, { c: FC[ri(0, 4)], s: 1.3 });
    }
    
    ob('altar', 7, 59, {});
    ob('pillar', 5, 59, { sy: 0.8 });
    ob('pillar', 5, 61, { sy: 0.5 });
    chs(6, 60, 60, 'Altar Esquecido');
    clr(6, 60, 2.4);
    
    house(28, 58, 3, 3, { b: 0x6b625a, r: 0x5a3b22, district: 'abandoned cabin' });
    // The old chest at (28,61) stood directly in front of this remote door.
    // Keep the reward, but move it beside the porch instead of blocking entry.
    chs(30, 61, 40, 'Baú da Cabana');
    clr(28, 60, 3.2);
    for (const z of [60,61]) gameState.B[28][z] = 0;
    gameState.G[28][60] = 1; gameState.G[28][61] = 1;
    ob('barrel', 26, 60, {});
    
    // --- Cave ---
    for (const [x, z] of [[56, 55], [59, 55]]) ob('torch', x, z, {});
    ob('fire', 58, 59, {});
    chs(58, 61, 150, 'Tesouro da Caverna');
    clr(57, 55, 2);
    clr(58, 59, 2);
    
    // --- Landmarks ---
    lm('Vila de Vilarrubra', 13, 15, 5);
    lm('Ferraria de Bram', 17, 8, 3);
    lm('Casa do Yoki', 6, 7, 3);
    lm('Mirante do Vale', 28, 28, 3);
    lm('Ponte Velha', 35, 15, 3);
    lm('Clareira das Fadas', 10, 41, 3);
    lm('Acampamento Abandonado', 22, 46, 3.5);
    lm('Lagoa Escondida', 13, 50, 3.5);
    lm('Altar Esquecido', 7, 61, 3);
    lm('Cabana Abandonada', 28, 60, 3);
    lm('Ponte do Sul', 34, 49, 3);
    lm('Ruínas de Ardu', 50, 12, 5);
    lm('Cripta Escondida', 60, 5, 3);
    lm('Acampamento dos Trolls', 52, 34, 4);
    lm('Colina Cinzenta', 58, 31, 3);
    lm('Torre Caída', 44, 44, 3);
    lm('Caverna Sombria', 57, 55, 3.5);
    
    // --- Fronteira expandida: camps, ruins, forest clearings and lookout posts. ---
    // No new quest IDs or boss IDs. Existing actors keep their positions.
    const newPlaces = [
        ['Bosque das Memórias', 16, 78, 4.2],
        ['Refúgio da Trilha Sul', 12, 89, 3.5],
        ['Vigília do Leste', 77, 15, 3.5],
        ['Pedras do Horizonte', 89, 10, 4],
        ['Acampamento da Fronteira', 82, 49, 4],
        ['Alto das Cinzas', 88, 81, 4],
    ];
    for (const [name,x,z,r] of newPlaces) { lm(name,x,z,r); clr(x,z,r+1.2); }
    // Three fragments of the Garra Cinzenta battle. These are walk-up lore clues,
    // not blockers; existing roads/quests and the old rat model remain unchanged.
    const replayMarks=[
      ['Marca do Escudo Partido',85.5,80],
      ['Marca do Passo no Gelo',88.5,78],
      ['Marca do Machado Silencioso',90,83.5]
    ];
    for(const [name,x,z] of replayMarks){lm(name,x,z,1.65);clr(x,z,2.1);}
    // These decorations use original registered object types and their collision rules.
    // Leave their centers clear to ensure their landmarks are reachable.
    for (const [x,z] of [[13,87],[80,49],[88,82]]) {
        ob('fire', x+2, z+1, {});
        ob('log', x+3.5, z+2.2, {r:.3});
        ob('barrel', x+3.5, z-1.5, {});
        ob('crate', x+4, z-2.5, {});
    }
    for (const [x,z] of [[76,13],[88,8],[86,79]]) {
        ob('pillar',x-2,z-2,{sy:.7}); ob('pillar',x+2,z-2,{sy:.9});
        ob('torch',x-1.5,z+2,{}); ob('altar',x+3,z+2,{});
    }
    for (const [x,z] of [[17,80],[10,90],[81,51],[90,80]]) {
        ob('tent', x+3,z,{r:1.1}); ob('fire',x+4,z+2,{});
    }

    // --- Procedural vegetation ---
    for (let x = 0; x < W; x++) for (let z = 0; z < W; z++) {
        const q = gameState.ZN[x][z], g = gameState.G[x][z];
        const bd = x === 0 || z === 0 || x === W - 1 || z === W - 1;
        const bd2 = x === 1 || z === 1 || x === W - 2 || z === W - 2;
        
        if (bd) {
            if (g !== 3) gameState.OB.push({ t: q >= 4 ? 'rock' : 'pine', x, z, r: R() * 6, s: rnd(1, 1.4), c: tint(150, 230) });
            continue;
        }
        if (bd2 && R() < 0.5 && !gameState.B[x][z] && (g === 0 || g === 5 || g === 6 || g === 8) && !nearClr(x, z)) {
            ob(q >= 4 ? 'rock' : 'pine', x, z, { s: rnd(0.9, 1.3), r: R() * 6, c: tint(150, 230) });
            continue;
        }
        if (gameState.B[x][z] || g === 1 || g === 2 || g === 3 || g === 4 || g === 7 || nearClr(x, z)) continue;
        
        // Frontier is deliberately less dense to keep its footpaths legible on mobile.
        const r = R();
        if ((x >= LEGACY_MAP_SIZE || z >= LEGACY_MAP_SIZE) && r < .10) continue;
        if (g === 9) { if (r < 0.05) sc('srock', x, z, {}); continue; }
        if (q === 0) {
            if (ev(x, z) > 0.72 && r < 0.3) sc('oak', x, z, { s: rnd(0.9, 1.2) });
            else if (r < 0.1) sc('flower', x, z, { c: FC[ri(0, 4)] });
            else if (r < 0.2) sc('tuft', x, z, {});
        } else if (q === 1) {
            if (r < 0.04) sc(R() < 0.6 ? 'pine' : 'oak', x, z, { s: rnd(0.85, 1.3) });
            else if (r < 0.075) sc('bush', x, z, {});
            else if (r < 0.095) sc('rock', x, z, { s: rnd(0.9, 1.4) });
            else if (r < 0.13) sc('srock', x, z, {});
            else if (r < 0.24) sc('flower', x, z, { c: FC[ri(0, 4)] });
            else if (r < 0.36) sc('tuft', x, z, {});
        } else if (q === 2) {
            // V4 groves instead of uniformly noisy tree scatter. Density varies
            // spatially; the quest trail has a walkable shoulder on each side.
            let trailEdge = false;
            for (let dx = -1; dx <= 1 && !trailEdge; dx++)
                for (let dz = -1; dz <= 1; dz++) {
                    const xx = x + dx, zz = z + dz;
                    if (xx >= 0 && zz >= 0 && xx < W && zz < W && gameState.G[xx][zz] === 1) {
                        trailEdge = true; break;
                    }
                }
            if (trailEdge) {
                if (r < 0.13) sc('flower', x, z, { c: FC[ri(0, 4)], s: 0.8 });
                else if (r < 0.32) sc('tuft', x, z, { s: 0.7 });
                continue;
            }
            const grove = (Math.sin(x * 0.37) + Math.cos(z * 0.43) + Math.sin((x + z) * 0.18)) / 3;
            const trees = Math.max(0.09, Math.min(0.38, 0.22 + grove * 0.2));
            if (r < trees * 0.77) sc('pine', x, z, { s: rnd(0.85, 1.45), c: tint(120, 210) });
            else if (r < trees) sc('oak', x, z, { s: rnd(0.9, 1.4), c: tint(130, 210) });
            else if (r < trees + 0.06) sc('bush', x, z, { c: tint(120, 200) });
            else if (r < trees + 0.077) sc('log', x, z, {});
            else if (r < trees + 0.095) sc('rock', x, z, {});
            else if (r < trees + 0.13) sc('flower', x, z, { c: FC[ri(0, 4)] });
            else if (r < trees + 0.26) sc('tuft', x, z, { c: tint(110, 190) });
        } else if (q === 4) {
            if (x >= 56 && r < 0.4) sc(R() < 0.5 ? 'oak' : 'bush', x, z, { c: tint(130, 210) });
            else if (r < 0.03) sc('oak', x, z, {});
            else if (r < 0.06) sc('rock', x, z, {});
            else if (r < 0.1) sc('srock', x, z, {});
            else if (r < 0.18) sc('tuft', x, z, {});
        } else if (q === 5) {
            if (r < 0.075) sc('dead', x, z, { s: rnd(0.8, 1.3), c: tint(140, 220) });
            else if (r < 0.145) sc('rock', x, z, { s: rnd(1, 1.7), c: tint(120, 200) });
            else if (r < 0.2) sc('srock', x, z, {});
            else if (r < 0.22) sc('tuft', x, z, { c: tint(110, 170) });
        } else if (q === 6) {
            if (r < 0.05) sc('rock', x, z, { s: rnd(1, 1.6), c: tint(100, 170) });
            else if (r < 0.11) sc('srock', x, z, {});
        }
    }
    
    // Frontier gates: terrain paint and collision must agree at the old 64-tile boundary.
    // Only clear the narrow seams x=62..65 or z=62..65, never the village or bosses.
    for (const [axis,coord] of [['z',22],['z',35],['x',20],['x',44]]) {
        for (let delta=-1; delta<=1; delta++) for (let seam=62; seam<=65; seam++) {
            const x = axis === 'z' ? coord+delta : seam;
            const z = axis === 'z' ? seam : coord+delta;
            if (!gameState.G[x] || gameState.G[x][z] === 3 || gameState.G[x][z] === 4) continue;
            gameState.B[x][z] = 0;
            if (gameState.G[x][z] !== 7 && gameState.G[x][z] !== 8) gameState.G[x][z] = 1;
        }
    }

    // Never let decorative vegetation close the middle of a bridge.
    // Newly extended river meanders can leave a shore tile between the two
    // water edges of a deck; all deck-center cells must remain traversable.
    const bridgeCenter = (x, z) => gameState.BRG.some(b =>
        x >= b.x0 && x <= b.x1 && z === Math.round((b.z0 + b.z1) / 2));
    for (const b of gameState.BRG) {
        const z = Math.round((b.z0 + b.z1) / 2);
        for (let x = b.x0; x <= b.x1; x++) gameState.B[x][z] = 0;
    }
    gameState.OB = gameState.OB.filter(o => !(
        BLK.has(o.t) && bridgeCenter(Math.round(o.x), Math.round(o.z))));

    // V6: forge footprint must be present BEFORE flood-fill/pathfinding.
    // A 3x3 physical building; its door stands outside the blocked tiles.
    for (let fx=16; fx<=18; fx++) for (let fz=5; fz<=7; fz++) blk(fx, fz);

    // --- Reachability check (flood fill 8-dir, no corner cutting) ---
    const RC = new Uint8Array(W * W);
    { const q = [13 * W + 15]; RC[13 * W + 15] = 1;
        for (let h = 0; h < q.length; h++) {
            const c = q[h], x = (c / W) | 0, z = c % W;
            for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
                const nx = x + dx, nz = z + dz;
                if ((!dx && !dz) || nx < 0 || nz < 0 || nx >= W || nz >= W || RC[nx * W + nz] || gameState.B[nx][nz]) continue;
                if (dx && dz && (gameState.B[x + dx][z] || gameState.B[x][z + dz])) continue;
                RC[nx * W + nz] = 1; q.push(nx * W + nz);
            }
        }
    }
    gameState.RC = RC;
    
    // Block unreachable areas
    for (let x = 1; x < W - 1; x++) for (let z = 1; z < W - 1; z++)
        if (!RC[x * W + z] && !gameState.B[x][z] && gameState.G[x][z] !== 3 && gameState.G[x][z] !== 4) {
            gameState.B[x][z] = 1;
            ob(gameState.ZN[x][z] >= 4 ? 'rock' : 'bush', x, z, { nb: 1, s: gameState.ZN[x][z] >= 4 ? 1.1 : 1, c: tint(150, 220) });
        }
    
    // --- Height map ---
    gameState.HG = new Float32Array((W + 1) * (W + 1));
    for (let iy = 0; iy <= W; iy++) for (let ix = 0; ix <= W; ix++) {
        const wx = ix - 0.5, wz = iy - 0.5;
        let h = (Math.sin(wx * 0.31 + 1.3) * Math.sin(wz * 0.27) + 0.8 * Math.sin(wx * 0.13 + wz * 0.17) + 0.5 * Math.sin(wx * 0.07 - wz * 0.11)) * 0.2;
        h *= Math.min(1, Math.max(0, (ev(wx, wz) - 0.7) / 0.6));
        let wc = 0, fc = 0;
        for (let i = ix - 1; i <= ix; i++) for (let j = iy - 1; j <= iy; j++) {
            if (i < 0 || j < 0 || i >= W || j >= W) continue;
            const g = gameState.G[i][j];
            if (g === 3 || g === 4) wc++; else if (g === 2 || g === 7 || g === 8) fc++;
        }
        h = h * (1 - wc / 4) + (-0.35) * wc / 4;
        if (fc) h *= 0.25;
        for (const [hx, hz, ha, hs] of HS) h += ha * Math.exp(-((wx - hx) ** 2 + (wz - hz) ** 2) / hs);
        gameState.HG[iy * (W + 1) + ix] = h;
    }
    
    console.log('[World] World generated successfully');
}

/**
 * Build Three.js meshes for the world
 */
export function buildWorldMeshes() {
    initAssets();
    // Visual-only switches: collision, pathfinding, quest/spawn coordinates unchanged.
    const envV2 = (typeof window === 'undefined' || (window.HINARIA_CENARIOS_V2 !== false && new URLSearchParams(window.location.search).get('visual')!=='classico'));
    const texturedMats = new Map();
    function environmentMaterial(type, fallback) {
        if (!envV2 || ['firef','torchf','lamph'].includes(type)) return fallback;
        if (texturedMats.has(type)) return texturedMats.get(type);
        let surface = ['rock','srock','cliff','wall','pillar','altar'].includes(type) ? 'stone' :
            ['pine','oak','dead','bush','crop','flower','tuft'].includes(type) ? 'leaf' : 'wood';
        const material = new THREE.MeshLambertMaterial({vertexColors:true,map:getV2EnvironmentTexture(surface)});
        // Keep vertex-color tinting and chunk instancing. Shared textures are a single
        // extra sampler, not a new mesh for each tree/rock/prop.
        const maps={pine:'foliage',oak:'foliage',bush:'foliage',dead:'bark',
          rock:'rock',srock:'rock',cliff:'cave_rock',wall:'rock',pillar:'rock',
          fence:'wood_planks',barrel:'crate_wood',crate:'crate_wood',log:'bark',
          stall:'canopy_stripes',tent:'cloth_linen',well:'cobblestone',altar:'rune_stone'};
        if(maps[type])addSurface(material,maps[type]);
        texturedMats.set(type,material);
        return material;
    }
    const detailedPropTypes = {well:'poco', stall:'mercado', lantern:'lanterna', sign:'placas', altar:'runa'};
    function addDetailedPrefab(id, x, z, yaw=0, sx=1, sz=sx) {
        const prefab = createEnvironmentV2(id); if (!prefab) return false;
        // Bridge prefab sits on original river elevation; getHeightAt() above
        // now returns the top of its deck for walkers, not its placement base.
        prefab.position.set(x,id==='ponte'?.14:gameState.getHeightAt(x,z),z);
        prefab.rotation.y=yaw;prefab.scale.set(sx,sx,sz);
        registerChunkVisual(prefab,x,z);return true;
    }
    
    // Ground mesh
    const GS = 16;
    const cvG = document.createElement('canvas');
    cvG.width = cvG.height = W * GS;
    const ctx = cvG.getContext('2d');
    const lo = document.createElement('canvas');
    lo.width = lo.height = W;
    const lx = lo.getContext('2d');
    const BC = CONFIG.BIOME_GROUND_COLORS;
    
    for (let x = 0; x < W; x++) for (let z = 0; z < W; z++) {
        let c = BC[gameState.G[x][z]];
        if (gameState.G[x][z] === 0 && gameState.ZN[x][z] === 4) c = [88, 106, 66];
        const j = ri(-7, 7);
        lx.fillStyle = `rgb(${c[0] + j},${c[1] + j},${c[2] + j})`;
        lx.fillRect(x, z, 1, 1);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(lo, 0, 0, W * GS, W * GS);
    const N = W * GS;
    for (let n = 0; n < 110; n++) {
        const px = rnd(0, N), py = rnd(0, N), r = rnd(18, 56);
        const g = ctx.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, R() < 0.5 ? 'rgba(10,30,10,.26)' : 'rgba(130,160,60,.18)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(px - r, py - r, r * 2, r * 2);
    }
    for (let x = 0; x < W; x++) for (let z = 0; z < W; z++) {
        const g = gameState.G[x][z], X = x * GS - GS / 2, Z = z * GS - GS / 2;
        if (g === 0 || g === 5 || g === 6) {
            const hs = g === 5 ? [85, 125] : g === 6 ? [30, 50] : [80, 115];
            const k = navigator.maxTouchPoints ? 3 : 5;
            for (let i = 0; i < k; i++) {
                ctx.strokeStyle = `hsl(${rnd(hs[0], hs[1])},${g === 6 ? 18 : rnd(35, 55)}%,${rnd(20, 40)}%)`;
                const a = X + rnd(0, GS), b = Z + rnd(0, GS);
                ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(a + rnd(-2, 2), b - rnd(2, 6)); ctx.stroke();
            }
            if (g === 0 && R() < 0.05) {
                ctx.fillStyle = ['#e8d94a', '#f2f2f2', '#d96a8a', '#8ab4f8'][ri(0, 3)];
                ctx.fillRect(X + rnd(0, GS), Z + rnd(0, GS), 2, 2);
            }
        } else if (g === 2) {
            // V4: warmer, irregularly sized cobblestones instead of a checker grid.
            ctx.fillStyle = '#70695d';
            ctx.fillRect(X, Z, GS, GS);
            for (let row = 0; row < 3; row++) for (let col = -1; col < 3; col++) {
                const xx = X + col * 6.0 + (row % 2) * 2.8;
                const zz = Z + row * 5.3;
                const shade = ri(126, 166);
                ctx.fillStyle = `rgb(${shade},${shade - 7},${shade - 17})`;
                ctx.fillRect(xx + 0.6, zz + 0.6, 5.2, 4.45);
                ctx.fillStyle = 'rgba(255,246,218,.12)';
                ctx.fillRect(xx + 0.8, zz + 0.6, 4.4, 0.6);
            }
        } else if (g === 1 || g === 9) {
            ctx.fillStyle = g === 1 ? 'rgba(70,50,30,.35)' : 'rgba(255,240,200,.3)';
            for (let i = 0; i < 3; i++) ctx.fillRect(X + rnd(0, GS), Z + rnd(0, GS), 2, 1.5);
        } else if (g === 7) {
            ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.strokeRect(X + 0.5, Z + 0.5, GS - 1, GS - 1);
            if (R() < 0.3) { ctx.beginPath(); ctx.moveTo(X + rnd(0, GS), Z); ctx.lineTo(X + rnd(0, GS), Z + GS); ctx.stroke(); }
        } else if (g === 8) {
            ctx.fillStyle = 'rgba(0,0,0,.25)';
            for (let i = 0; i < 3; i++) ctx.fillRect(X + rnd(0, GS), Z + rnd(0, GS), 3, 2);
        }
    }
    // The center of Vilarrubra is now a recognizable circular civic piazza.
    // The marking is painted directly into the single existing ground texture:
    // no extra terrain meshes and no collision changes.
    ctx.save();
    for (const [radius, width, color] of [[3.8, 2.4, 'rgba(217,181,114,.65)'],
                                          [2.8, 1.0, 'rgba(66,61,53,.52)'],
                                          [1.35, 1.8, 'rgba(227,192,118,.8)']]) {
        ctx.beginPath(); ctx.arc(13 * GS, 15 * GS, radius * GS, 0, Math.PI * 2);
        ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        const xx = 13 * GS + Math.cos(a) * 1.35 * GS;
        const zz = 15 * GS + Math.sin(a) * 1.35 * GS;
        ctx.fillStyle = 'rgba(218,179,105,.8)';
        ctx.beginPath(); ctx.arc(xx, zz, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    gameState.gtex = new THREE.CanvasTexture(cvG);
    gameState.gtex.anisotropy = 4;
    // Layer genuine tileable textures *over* the terrain paint, keeping biome
    // borders, roads and the civic plaza composition unchanged.
    if(typeof decorateTerrainCanvas==='function')
        decorateTerrainCanvas(cvG,gameState.G,W,()=>{gameState.gtex.needsUpdate=true;});
    
    const gGeo = new THREE.PlaneGeometry(W, W, W, W);
    const pos = gGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, gameState.HG[i]);
    gGeo.computeVertexNormals();
    
    gameState.ground = new THREE.Mesh(gGeo, new THREE.MeshLambertMaterial({ map: gameState.gtex }));
    gameState.ground.rotation.x = -Math.PI / 2;
    gameState.ground.position.set(W / 2 - 0.5, 0, W / 2 - 0.5);
    gameState.scene.add(gameState.ground);
    // Three compact memorial stones for Yoki's optional side quest.
    const memoryStone=new THREE.DodecahedronGeometry(.26,0);
    const memoryBase=new THREE.CylinderGeometry(.36,.40,.16,6);
    const memoryStoneMat=new THREE.MeshLambertMaterial({color:0x616f77,flatShading:true});
    const memoryRuneMat=new THREE.MeshBasicMaterial({color:0x69d9ee});
    gameState.loreMarkers=[];
    for(const landmark of gameState.LM.filter(l=>l.n.startsWith('Marca do '))){
        const g=new THREE.Group();
        const b=new THREE.Mesh(memoryBase,memoryStoneMat);b.position.y=.07;g.add(b);
        const crystal=new THREE.Mesh(memoryStone,memoryRuneMat);crystal.position.y=.39;g.add(crystal);
        g.position.set(landmark.x,gameState.getHeightAt(landmark.x,landmark.z),landmark.z);
        registerChunkVisual(g,landmark.x,landmark.z);
        gameState.loreMarkers.push({group:g,crystal,landmark});
    }
    
    // Water mesh
    const P = [], U = [], I = []; let n = 0;
    for (let x = 0; x < W; x++) for (let z = 0; z < W; z++)
        if (gameState.G[x][z] === 3 || gameState.G[x][z] === 4) {
            P.push(x - 0.5, 0, z - 0.5, x + 0.5, 0, z - 0.5, x + 0.5, 0, z + 0.5, x - 0.5, 0, z + 0.5);
            U.push(x / 3, z / 3, (x + 1) / 3, z / 3, (x + 1) / 3, (z + 1) / 3, x / 3, (z + 1) / 3);
            I.push(n, n + 2, n + 1, n, n + 3, n + 2); n += 4;
        }
    const wGeo = new THREE.BufferGeometry();
    wGeo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    wGeo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    wGeo.setIndex(I);
    wGeo.computeVertexNormals();
    const waterMaterial=new THREE.MeshLambertMaterial({color:0x5c9dbb,map:gameState.WTX,transparent:true,opacity:.8});
    if(typeof addSurface==='function')addSurface(waterMaterial,'water');
    gameState.waterMesh = new THREE.Mesh(wGeo,waterMaterial);
    gameState.waterMesh.position.y = -0.06;
    gameState.scene.add(gameState.waterMesh);
    
    // Instanced objects by chunk
    const CHK = 16;
    const UPV = new THREE.Vector3(0, 1, 0);
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
    
    // Group objects by type
    gameState.byT = {};
    for (const o of gameState.OB) {
        (gameState.byT[o.t] = gameState.byT[o.t] || []).push(o);
        if (o.t === 'lamp') (gameState.byT.lamph = gameState.byT.lamph || []).push(o);
        if (o.t === 'torch') (gameState.byT.torchf = gameState.byT.torchf || []).push(o);
        if (o.t === 'fire') (gameState.byT.firef = gameState.byT.firef || []).push(o);
    }
    
    gameState.flick = [];
    for (const t in gameState.byT) {
        if (envV2 && detailedPropTypes[t]) {
            // Unique village landmarks get detailed prefabs instead of their old instanced sprite.
            // Existing collision bitfield is NOT touched. Keep any extra objects on fallback.
            const objects=gameState.byT[t];
            let placed=0;
            const remaining=[];
            for (const o of objects) {
                if (placed<8 && addDetailedPrefab(detailedPropTypes[t],o.x,o.z,o.r||0,
                    t==='stall'?.69:t==='well'?.48:t==='altar'?.5:t==='lantern'?.48:.43)) placed++;
                else remaining.push(o);
            }
            gameState.byT[t]=remaining;
            if (!remaining.length) continue;
        }
        const geo = OBJECT_GEOMETRIES[t];
        if (!geo) continue;
        const bk = {};
        for (const o of gameState.byT[t]) {
            const k = ((o.x / CHK) | 0) * 8 + ((o.z / CHK) | 0);
            (bk[k] = bk[k] || []).push(o);
        }
        for (const k in bk) {
            const arr = bk[k];
            const cx = ((k >> 3) + 0.5) * CHK - 0.5, cz = ((k & 7) + 0.5) * CHK - 0.5;
            const mat = environmentMaterial(t, TYPE_MATERIALS[t] || MATERIALS.vertexColor);
            const im = new THREE.InstancedMesh(geo, mat, arr.length);
            im.position.set(cx, 0, cz);
            arr.forEach((o, i) => {
                _p.set(o.x - cx, gameState.getHeightAt(o.x, o.z), o.z - cz);
                _q.setFromAxisAngle(UPV, o.r || 0);
                _s.set(o.s || 1, o.sy || o.s || 1, o.s || 1);
                _m.compose(_p, _q, _s);
                im.setMatrixAt(i, _m);
                im.setColorAt(i, _c.set(o.c == null ? 0xffffff : o.c));
            });
            im.instanceMatrix.needsUpdate = true;
            if (im.instanceColor) im.instanceColor.needsUpdate = true;
            if (t === 'torchf' || t === 'firef' || t === 'lamph') gameState.flick.push(im);
            registerChunkVisual(im,cx,cz);
        }
    }
    
    // V2 houses: consistent timber, stone and roof materials. Original V6 fallback preserved.
    for (const h of gameState.HO) {
        if (envV2 && !h.church) {
            const id = h.district?.includes('tavern') ? 'taverna' : h.w >= 3.65 ? 'casarao' : 'casa';
            const baseW=id==='casa'?3:3.75, baseD=id==='casa'?2.3:2.8;
            const factor=Math.min((h.w-.16)/baseW,(h.d-.16)/baseD);
            if (addDetailedPrefab(id,h.x,h.z,0,Math.max(.5,factor))) continue;
        }
        registerChunkVisual(buildVillageHouseV6(h,gameState.getHeightAt(h.x,h.z)),h.x,h.z);
    }

    // V7.6: road-edge waymarkers replace V7.5's oversized timber arches.
    // Old lintels and tall pillars looked like unattached giant sticks in the
    // isometric camera.  These discreet markers stay outside the road and add
    // NO collision tiles, so quests and the pathfinding grid remain identical.
    function villageWaymarkers(x,z,alongX) {
        const stone=new THREE.MeshLambertMaterial({color:0x8c8c81,flatShading:true});
        const timber=new THREE.MeshLambertMaterial({color:0x684b35,flatShading:true});
        const copper=new THREE.MeshLambertMaterial({color:0x9b865c,flatShading:true});
        const plaque=new THREE.MeshLambertMaterial({color:0xbfa77b,flatShading:true});
        const top=new THREE.MeshLambertMaterial({color:0x405e54,flatShading:true});
        for (const side of [-1,1]) {
            const rx=x+(alongX?0:side*2.02);
            const rz=z+(alongX?side*2.02:0);
            const base=new THREE.Group();
            base.name='V7_6_Waymarker';
            const ground=new THREE.Mesh(new THREE.BoxGeometry(.51,.22,.51),stone);
            ground.position.y=.11;base.add(ground);
            const post=new THREE.Mesh(new THREE.BoxGeometry(.23,1.12,.23),timber);
            post.position.y=.76;base.add(post);
            const cap=new THREE.Mesh(new THREE.ConeGeometry(.32,.35,4),top);
            cap.position.y=1.49;cap.rotation.y=Math.PI/4;base.add(cap);
            const collar=new THREE.Mesh(new THREE.BoxGeometry(.36,.11,.36),copper);
            collar.position.y=1.33;base.add(collar);
            const sign=new THREE.Mesh(new THREE.BoxGeometry(.56,.31,.075),plaque);
            sign.position.set(0,1.06,.14);
            sign.rotation.y=alongX?Math.PI/2:0;
            base.add(sign);
            base.position.set(rx,gameState.getHeightAt(rx,rz),rz);
            gameState.scene.add(base);
        }
    }
    villageWaymarkers(17,25,false);
    villageWaymarkers(25,15,true);

    // V3 village models: windmill, barn, stable, fountain, hay, benches, clothesline, woodpile, notice board.
    // Placed only on free terrain; solid ones add their footprint to the collision grid. Failure never blocks the game.
    if (envV2) {
        try {
            const placedV3 = buildVillageDressingV3(gameState, (root, x, z, yaw, s) => {
                root.position.set(x, gameState.getHeightAt(x, z), z);
                root.rotation.y = yaw; root.scale.setScalar(s);
                registerChunkVisual(root, x, z);
            });
            console.info('[Hinária] Modelos da vila V3:', placedV3.join(' | '));
        } catch (err) { console.warn('[Hinária] Modelos da vila V3 ignorados:', err); }
    }

    // Bridges
    for (const b of gameState.BRG) {
        const L = b.x1 - b.x0 + 3, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
        if (envV2 && addDetailedPrefab('ponte',cx,cz,0,L/4.5,(b.z1-b.z0+1)/2.6)) continue;
        const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(L, 0.12, b.z1 - b.z0 + 1), new THREE.MeshLambertMaterial({ color: 0x8b6b4a }));
        bridgeDeck.position.set(cx, 0.1, cz);
        gameState.scene.add(bridgeDeck);
        for (const dz of [-0.5, 0.5]) {
            const bridgeRail = new THREE.Mesh(new THREE.BoxGeometry(L, 0.3, 0.08), new THREE.MeshLambertMaterial({ color: 0x5a3b22 }));
            bridgeRail.position.set(cx, 0.35, cz + dz * (b.z1 - b.z0 + 1));
            gameState.scene.add(bridgeRail);
        }
        for (let x = b.x0 - 1; x <= b.x1 + 1; x += 2) for (const dz of [-0.5, 0.5]) {
            const bridgePost = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.14), new THREE.MeshLambertMaterial({ color: 0x5a3b22 }));
            bridgePost.position.set(x, 0.3, cz + dz * (b.z1 - b.z0 + 1));
            gameState.scene.add(bridgePost);
        }
    }
    
    // Cave entrance
    const caveLeft = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.3, 0.6), new THREE.MeshLambertMaterial({ color: 0x4a4038 }));
    caveLeft.position.set(56.6, 1.15, 56);
    gameState.scene.add(caveLeft);
    const caveRight = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.3, 0.6), new THREE.MeshLambertMaterial({ color: 0x4a4038 }));
    caveRight.position.set(58.4, 1.15, 56);
    gameState.scene.add(caveRight);
    const caveTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.7), new THREE.MeshLambertMaterial({ color: 0x3a322a }));
    caveTop.position.set(57.5, 2.4, 56);
    gameState.scene.add(caveTop);
    
    // Chests
    for (const c of gameState.CH) {
        const g = new THREE.Group(), lid = new THREE.Group();
        lid.position.set(0, 0.4, -0.22);
        const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.14, 0.47), new THREE.MeshLambertMaterial({ color: 0x5a3b22 }));
        lidMesh.position.set(0, 0.07, 0.22);
        lid.add(lidMesh);
        const chestBase = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.45), new THREE.MeshLambertMaterial({ color: 0x7a5230 }));
        chestBase.position.set(0, 0.2, 0);
        g.add(chestBase);
        const chestLock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.5), new THREE.MeshLambertMaterial({ color: 0xd8b040 }));
        chestLock.position.set(0, 0.22, 0);
        g.add(chestLock);
        g.add(lid);
        g.position.set(c.x, gameState.getHeightAt(c.x, c.z), c.z);
        gameState.scene.add(g);
        c.lid = lid;
    }
    
    // V6: forge model shares the village's new timber-and-stone silhouette.
    if (!envV2 || !addDetailedPrefab('ferraria',17,6,0,.60)) {
        const forgeModel = buildForgeV6(gameState.getHeightAt(17, 6));
        gameState.scene.add(forgeModel);
    }
    const forgeAnvil = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.25, 0.46, 8),
        new THREE.MeshLambertMaterial({color:0x434a53}));
    forgeAnvil.position.set(18.3, 0.28, 9);
    gameState.scene.add(forgeAnvil);

    // Forge smoke
    gameState.smoke = [0, 1, 2].map(i => {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6), new THREE.MeshLambertMaterial({ color: 0xbdb8b0 }));
        s.position.set(18.1, 3, 5.4);
        s.material.transparent = true;
        s.userData.o = i / 3;
        gameState.scene.add(s);
        return s;
    });
    
    gameState.forge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.5), new THREE.MeshLambertMaterial({ color: 0xff7a1a, emissive: 0xff7a1a }));
    gameState.forge.position.set(18.4, 0.2, 9.6);
    gameState.scene.add(gameState.forge);
    
    gameState.fire = new THREE.PointLight(0xff8a3a, 1.2, 5);
    gameState.fire.position.set(18.3, 0.8, 9.4);
    gameState.scene.add(gameState.fire);
    
    // No buildings in the tree sway list; only real animated trees belong here.
    gameState.trees = [];
    
    console.log('[World] World meshes built');
}

/**
 * Update world dynamic elements (called each frame)
 */
export function updateWorld(dt) {
    updateVillageModelsV3(dt);
    // A subtle rune pulse only on the three lore stones. No new physics loop.
    for(const marker of gameState.loreMarkers||[]){
        marker.crystal.rotation.y += Math.min(.035,dt*.8);
        marker.crystal.visible=!marker.landmark.f;
    }
    // Water animation
    if (gameState.waterMesh) {
        gameState.WTX.offset.set(gameState.t * 0.02, gameState.t * 0.013);
    }
    
    // Flame flicker
    if (gameState.flick.length) {
        const flameColor = MATERIALS.flame.color;
        flameColor.setHSL(0.07 + Math.sin(gameState.t * 17) * 0.015, 1, 0.55 + Math.sin(gameState.t * 23) * 0.08);
    }
    
    // Forge smoke
    for (const s of gameState.smoke) {
        const k = (gameState.t * 0.25 + s.userData.o) % 1;
        s.position.set(18.1 + k * 0.6, 3 + k * 1.3, 5.4);
        s.scale.setScalar(0.5 + k);
        s.material.opacity = 0.45 * (1 - k);
    }
    
    // Forge fire intensity
    gameState.fire.intensity = 1.1 + Math.sin(gameState.t * 17) * 0.25;
    gameState.forge.scale.y = 1 + Math.sin(gameState.t * 20) * 0.25;
    
    // Tree wind
    for (const g of gameState.trees) {
        g.rotation.z = Math.sin(gameState.t * 1.2 + g.position.x * 0.7) * 0.03;
    }
}

/**
 * Pathfinding - BFS with 8-directional movement
 * Returns array of [x, z] tiles from start to goal (excluding start, including goal)
 */
export function findPath(sx, sz, gx, gz, me) {
    const W = gameState.W;
    const lim = me && me.kind === 'm' ? 18 : 999;
    const s0 = sx * W + sz;
    const g = gx * W + gz;
    if (gx < 0 || gz < 0 || gx >= W || gz >= W) return null;
    
    const vst = gameState._vst || (gameState._vst = { stamp: 0, VS: new Uint32Array(W * W), PVN: new Int32Array(W * W), QU: new Int32Array(W * W) });
    vst.stamp++;
    const { VS, PVN, QU } = vst;
    let h = 0, t = 0;
    VS[s0] = vst.stamp;
    PVN[s0] = -1;
    QU[t++] = s0;
    
    const DIRECTIONS_8 = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [1, -1], [-1, 1], [-1, -1]
    ];
    
    while (h < t) {
        const c = QU[h++];
        if (c === g) break;
        const x = (c / W) | 0;
        const z = c - x * W;
        for (let i = 0; i < 8; i++) {
            const dx = DIRECTIONS_8[i][0];
            const dz = DIRECTIONS_8[i][1];
            const nx = x + dx;
            const nz = z + dz;
            if (nx < 0 || nz < 0 || nx >= W || nz >= W) continue;
            const n = nx * W + nz;
            if (VS[n] === vst.stamp || Math.abs(nx - sx) > lim || Math.abs(nz - sz) > lim) continue;
            if (n !== g && occ(nx, nz, me)) continue;
            if (dx && dz && (occ(x + dx, z, me) || occ(x, z + dz, me))) continue;
            VS[n] = vst.stamp;
            PVN[n] = c;
            QU[t++] = n;
        }
    }
    if (VS[g] !== vst.stamp) return null;
    const p = [];
    let c = g;
    while (c !== s0) {
        p.unshift([(c / W) | 0, c % W]);
        c = PVN[c];
    }
    return p;
}

/**
 * Check if a tile is occupied (collision)
 */
export function occ(x, z, me) {
    if (x < 0 || z < 0 || x >= gameState.W || z >= gameState.W || gameState.B[x][z]) return true;
    for (let i = 0; i < gameState.ents.length; i++) {
        const e = gameState.ents[i];
        if (e !== me && e.tx === x && e.tz === z) return true;
    }
    return false;
}

/**
 * Chebyshev distance between two entities
 */
export function near(a, b) {
    return Math.max(Math.abs(a.tx - b.tx), Math.abs(a.tz - b.tz));
}

/**
 * Check if entity is stationary
 */
export function still(e) {
    return e === gameState.P ? gameState.P.spd < 0.3 : Math.hypot(e.tx - e.x, e.tz - e.z) < 0.05;
}

/**
 * Check if position is in safe zone (zone 0 = village)
 */
export function inSafeZone(x, z) {
    return gameState.ZN[x] && gameState.ZN[x][z] === 0;
}

/**
 * Move entity along its path
 */
export function stepEntity(e, dt, sp) {
    let rem = sp * dt;
    for (let n = 0; n < 3; n++) {
        const dx = e.tx - e.x;
        const dz = e.tz - e.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.001) {
            const s = Math.min(d, rem);
            const nextX = e.x + dx / d * s, nextZ = e.z + dz / d * s;
            // Prevent diagonal interpolation through blocked corners/railings.
            // For the player's analog movement, collision is handled by loop.js.
            if (e !== gameState.P) {
                const cx = Math.round(nextX), cz = Math.round(nextZ);
                if (cx < 0 || cz < 0 || cx >= gameState.W || cz >= gameState.W || gameState.B[cx][cz]) {
                    e.path.length = 0;
                    e.tx = Math.round(e.x); e.tz = Math.round(e.z);
                    break;
                }
            }
            rem -= s;
            e.x = nextX;
            e.z = nextZ;
            let da = Math.atan2(dx, dz) - e.mesh.rotation.y;
            da = Math.atan2(Math.sin(da), Math.cos(da));
            e.mesh.rotation.y += da * Math.min(1, dt * 16);
            if (rem < 1e-6) break;
        } else if (e.path && e.path.length) {
            const [nx, nz] = e.path[0];
            if (!occ(nx, nz, e)) {
                e.path.shift();
                e.tx = nx;
                e.tz = nz;
            } else {
                e.path.length = 0;
                break;
            }
        } else break;
    }
    e.mesh.position.set(e.x, getHeightAt(e.x, e.z), e.z);
}

/**
 * Get terrain height at world position
 */
export function getHeightAt(x, z) {
    if (!gameState.HG) return 0;
    const c = gameState.G[Math.round(x)];
    const detailedBridge = typeof window === 'undefined' ||
        (window.HINARIA_CENARIOS_V2 !== false && new URLSearchParams(window.location.search).get('visual') !== 'classico');
    if (detailedBridge) {
        // The actual detailed bridge arches from its entrances to the center.
        // Support the approach ramp too (not just tiles with water type 4).
        for (const b of gameState.BRG) {
            const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
            const scaleX = (b.x1 - b.x0 + 3) / 4.5;
            const full = 2.05 * scaleX;
            if (Math.abs(z - cz) > .81 || Math.abs(x - cx) >= full) continue;
            const along = Math.abs(x - cx) / full;
            const deck = .14 + .33 + .48 * (1 - along * along) + .065;
            const blend = Math.max(0, Math.min(1, (full - Math.abs(x - cx)) / .7));
            return .14 + (deck - .14) * blend;
        }
    }
    if (c && c[Math.round(z)] === 4) return .14;
    let u = x + 0.5, v = z + 0.5;
    u = u < 0 ? 0 : u > gameState.W ? gameState.W : u;
    v = v < 0 ? 0 : v > gameState.W ? gameState.W : v;
    const i = Math.min(gameState.W - 1, u | 0), j = Math.min(gameState.W - 1, v | 0);
    const fu = u - i, fv = v - j, s = gameState.W + 1;
    const a = gameState.HG[j * s + i], b = gameState.HG[j * s + i + 1];
    const c2 = gameState.HG[(j + 1) * s + i], d = gameState.HG[(j + 1) * s + i + 1];
    return (a * (1 - fu) + b * fu) * (1 - fv) + (c2 * (1 - fu) + d * fu) * fv;
}

/**
 * 8-directional movement vectors
 */
export const DIRECTIONS_8 = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
];