/**
 * Procedural Assets - Textures, Geometries, Materials
 * All generated at runtime, no external assets needed
 */

import * as THREE from 'three';
import { installV6Environment } from './v6Environment.js';
import { CONFIG } from '../core/config.js';
import { gameState } from '../core/gameState.js';

// Texture cache
const textureCache = new Map();

// Create a procedural canvas texture
function createCanvasTexture(name, width, height, drawFn) {
    // Support calling with (name, width, drawFn) where height defaults to width
    if (typeof height === 'function') {
        drawFn = height;
        height = width;
    }
    if (textureCache.has(name)) return textureCache.get(name);
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    drawFn(ctx, width, height);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    textureCache.set(name, texture);
    return texture;
}

// Grayscale helper
const gy = (v) => `rgb(${v},${v},${v})`;
const ri = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const rnd = (a, b) => a + Math.random() * (b - a);

// Speckle noise
function speckle(ctx, w, count, minVal, maxVal) {
    for (let i = 0; i < count; i++) {
        ctx.fillStyle = gy(ri(minVal, maxVal));
        ctx.fillRect(ri(0, w - 1), ri(0, w - 1), ri(1, 3), ri(1, 3));
    }
}

// Lines
function lines(ctx, w, count, color, horizontal) {
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
        if (horizontal) ctx.fillRect(0, ri(0, w - 1), w, 1);
        else ctx.fillRect(ri(0, w - 1), 0, 1, w);
    }
}

// Initialize all procedural textures
export function initTextures() {
    const W = 64;
    
    // Grass/ground base
    gameState.TXM[0x8b6b4a] = createCanvasTexture('wood', 64, (ctx, w) => {
        for (let j = 0; j < 8; j++) {
            ctx.fillStyle = gy(ri(205, 250));
            ctx.fillRect(0, j * 8, w, 8);
            ctx.fillStyle = 'rgba(0,0,0,.5)';
            ctx.fillRect(0, j * 8 + 7, w, 1);
            ctx.fillRect(ri(0, w), j * 8, 1, 7);
        }
        speckle(ctx, w, 300, 150, 230);
    });
    
    // Roof tiles
    gameState.TXM[0x7a2e24] = createCanvasTexture('roof', 64, (ctx, w) => {
        for (let j = 0; j < 8; j++) for (let i = -1; i < 8; i++) {
            const o = j % 2 * 4;
            ctx.fillStyle = gy(ri(175, 255));
            ctx.fillRect(i * 8 + o, j * 8, 7, 7);
            ctx.fillStyle = 'rgba(0,0,0,.4)';
            ctx.fillRect(i * 8 + o, j * 8 + 7, 8, 1);
        }
    });
    
    // Stone bricks
    gameState.TXM[0x5a3b22] = createCanvasTexture('stone', 64, (ctx, w) => {
        lines(ctx, w, 40, 'rgba(0,0,0,.28)');
        lines(ctx, w, 25, 'rgba(255,255,255,.3)');
        speckle(ctx, w, 200, 150, 230);
    });
    
    // Leaves
    gameState.TXM[0x2f6a2f] = gameState.TXM[0x3a7d36] = gameState.TXM[0x4a9444] = gameState.TXM[0x3f7a35] = 
        createCanvasTexture('leaves', 64, (ctx, w) => {
            for (let i = 0; i < 110; i++) {
                ctx.fillStyle = gy(ri(140, 255));
                ctx.beginPath();
                ctx.arc(ri(0, w), ri(0, w), ri(2, 5), 0, 7);
                ctx.fill();
            }
        });
    
    // Stone wall
    gameState.TXM[0x77736a] = gameState.TXM[0x6b625a] = gameState.TXM[0x7d7a72] = 
        createCanvasTexture('stonewall', 64, (ctx, w) => {
            for (let j = 0; j < 4; j++) {
                let i = -ri(0, 10);
                while (i < w) {
                    const b = ri(12, 24);
                    ctx.fillStyle = gy(ri(175, 245));
                    ctx.fillRect(i, j * 16, b, 16);
                    ctx.strokeStyle = 'rgba(0,0,0,.5)';
                    ctx.strokeRect(i + 0.5, j * 16 + 0.5, b, 16);
                    i += b;
                }
            }
            speckle(ctx, w, 200, 120, 220);
        });
    
    // Light stone
    gameState.TXM[0x7a5230] = createCanvasTexture('lightstone', 64, (ctx, w) => {
        speckle(ctx, w, 900, 150, 235);
        lines(ctx, w, 10, 'rgba(0,0,0,.2)', true);
        lines(ctx, w, 10, 'rgba(0,0,0,.2)', false);
    });
    
    // Metal
    gameState.TXM[0x9aa3ad] = createCanvasTexture('metal', 64, (ctx, w) => {
        ctx.strokeStyle = 'rgba(0,0,0,.55)';
        for (let j = 0; j < 11; j++) for (let i = 0; i < 11; i++) {
            ctx.beginPath();
            ctx.arc(i * 6 + j % 2 * 3, j * 6 + 3, 2.4, 0, 7);
            ctx.stroke();
        }
    });
    
    // Planks
    gameState.TXM[0xd2d7de] = createCanvasTexture('planks', 64, (ctx, w) => {
        lines(ctx, w, 30, 'rgba(255,255,255,.35)', true);
        lines(ctx, w, 20, 'rgba(0,0,0,.18)', true);
        ctx.fillStyle = 'rgba(0,0,0,.4)';
        for (let j = 0; j < 4; j++) ctx.fillRect(0, j * 16, w, 1);
        ctx.fillRect(0, 0, 1, w);
    });
    
    // Cloth
    gameState.TXM[0x8a2f2f] = gameState.TXM[0x6b7a3a] = gameState.TXM[0x6a2fa8] = gameState.TXM[0x2f7a52] = 
        createCanvasTexture('cloth', 64, (ctx, w) => {
            ctx.fillStyle = 'rgba(0,0,0,.14)';
            for (let i = 0; i < w; i += 2) {
                ctx.fillRect(i, 0, 1, w);
                ctx.fillRect(0, i, w, 1);
            }
            speckle(ctx, w, 200, 200, 255);
        });
    
    // Fern/grass
    gameState.TXM[0x6d625a] = gameState.TXM[0x7a6e65] = 
        createCanvasTexture('fern', 64, (ctx, w) => {
            for (let i = 0; i < 260; i++) {
                ctx.strokeStyle = gy(ri(120, 255));
                const a = ri(0, w), b = ri(0, w);
                ctx.beginPath();
                ctx.moveTo(a, b);
                ctx.lineTo(a + ri(-1, 1), b + ri(3, 6));
                ctx.stroke();
            }
        });
    
    // Default grass
    gameState.GR = createCanvasTexture('grass', 64, (ctx, w) => speckle(ctx, w, 500, 170, 255));
    
    // Water texture
    gameState.WTX = createCanvasTexture('water', 64, (ctx, w) => {
        for (let i = 0; i < 40; i++) {
            ctx.strokeStyle = gy(ri(150, 255));
            ctx.beginPath();
            ctx.arc(ri(0, w), ri(0, w), ri(3, 9), 0, 3);
            ctx.stroke();
        }
    });
    gameState.WTX.repeat.set(1, 1);
    
    // Face textures for character portraits
    const PH = [
        '/assets/ui/portrait_01.jpg',
        '/assets/ui/portrait_02.jpg',
        '/assets/ui/portrait_03.jpg',
        '/assets/ui/portrait_04.jpg',
        '/assets/ui/portrait_05.jpg',
        '/assets/ui/portrait_06.jpg',
        '/assets/ui/portrait_07.jpg',
        '/assets/ui/portrait_08.jpg'
    ];
    
    const PN = ['Retrato 1','Retrato 2','Retrato 3','Retrato 4','Retrato 5','Retrato 6','Retrato 7','Retrato 8'];
    
    PH.forEach((u, i) => {
        document.documentElement.style.setProperty('--p' + i, 'url(' + u + ')');
    });
    
    gameState.FT = PH.map(u => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 128;
        const texture = new THREE.CanvasTexture(canvas);
        const img = new Image();
        img.onload = () => {
            const ctx = canvas.getContext('2d');
            ctx.save();
            ctx.beginPath();
            ctx.arc(64, 64, 62, 0, 7);
            ctx.clip();
            ctx.drawImage(img, 0, 0, 128, 128);
            ctx.restore();
            ctx.lineWidth = 5;
            ctx.strokeStyle = '#e8dcc0';
            ctx.beginPath();
            ctx.arc(64, 64, 61, 0, 7);
            ctx.stroke();
            texture.needsUpdate = true;
        };
        img.src = u;
        return texture;
    });
    
    // Skin tone options
    gameState.SK = [
        { n: 'Claro', s: 0xf0c8a0, h: 0x5a3b22 },
        { n: 'Moreno', s: 0xc58c5a, h: 0x1d1410 },
        { n: 'Escuro', s: 0x7a4a2e, h: 0x111111 },
        { n: 'Ruivo', s: 0xf3d2b8, h: 0xb5471f },
        { n: 'Orc', s: 0x6f9a55, h: null, sc: 1.08 },
    ].concat(PH.map((u, i) => ({ n: PN[i], s: 0xe0b890, h: 0x2b2019, f: i })));
    
    // Armor options
    gameState.AR = [
        { n: 'Túnica', k: '', c: 0, def: 0, cost: 0 },
        { n: 'Couro', k: 'couro', c: 0x7a5230, def: 1, cost: 60 },
        { n: 'Cota de malha', k: 'malha', c: 0x9aa3ad, def: 3, cost: 160 },
        { n: 'Placas', k: 'placas', c: 0xd2d7de, def: 5, cost: 320 },
    ];
}

// Geometry cache
const geometryCache = new Map();

// Safe toNonIndexed - only converts if indexed
function safeToNonIndexed(geometry) {
    return geometry.index ? geometry.toNonIndexed() : geometry;
}

// Create a material with vertex colors
function createVertexColorMaterial(map) {
    return new THREE.MeshLambertMaterial({ 
        vertexColors: true, 
        map: map 
    });
}

// Build a composite geometry from parts (with safe toNonIndexed)
function buildCompositeGeometry(parts) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const colors = [];
    const color = new THREE.Color();
    const matrix = new THREE.Matrix4();
    
    for (const [geo, hex, pos, rot] of parts) {
        // Safe conversion - only if indexed
        const g = safeToNonIndexed(geo);
        
        if (rot) {
            g.rotateX(rot[0] || 0);
            g.rotateY(rot[1] || 0);
            g.rotateZ(rot[2] || 0);
        }
        g.translate(pos[0], pos[1], pos[2]);
        
        color.set(hex);
        const posAttr = g.attributes.position;
        const normAttr = g.attributes.normal;
        const uvAttr = g.attributes.uv;
        
        for (let i = 0; i < posAttr.count; i++) {
            positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
            normals.push(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i));
            colors.push(color.r, color.g, color.b);
        }
        for (let i = 0; i < uvAttr.count; i++) {
            uvs.push(uvAttr.getX(i), uvAttr.getY(i));
        }
    }
    
    const combined = new THREE.BufferGeometry();
    combined.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    combined.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    combined.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    combined.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return combined;
}

// Primitive geometry creators
const IC = (r, d = 0) => new THREE.IcosahedronGeometry(r, d);
const CO = (r, h, s = 6) => new THREE.ConeGeometry(r, h, s);
export const WOOD = 0x8b6b4a;

// Pre-built object geometries (instanced)
export const OBJECT_GEOMETRIES = {
    pine: buildCompositeGeometry([
        [CO(0.1, 0.14, 0.7, 6), 0x5a3b22, [0, 0.35, 0]],
        [CO(0.5, 1.3, 7), 0x2f6a2f, [0, 1.05, 0]],
        [CO(0.38, 1, 7), 0x3a7d36, [0, 1.65, 0]],
        [CO(0.26, 0.8, 7), 0x4a9444, [0, 2.15, 0]],
    ]),
    oak: buildCompositeGeometry([
        [CO(0.12, 0.16, 0.9, 6), 0x5a3b22, [0, 0.45, 0]],
        [IC(0.55, 7), 0x3f7a35, [0, 1.25, 0]],
        [IC(0.4, 6), 0x4a9444, [0.3, 1.5, 0.1]],
        [IC(0.38, 6), 0x2f6a2f, [-0.28, 1.45, -0.1]],
    ]),
    dead: buildCompositeGeometry([
        [CO(0.05, 0.14, 1.9, 5), 0x4a4038, [0, 0.95, 0]],
        [CO(0.02, 0.05, 0.8, 4), 0x4a4038, [0.25, 1.4, 0], [0, 0, -0.9]],
        [CO(0.02, 0.05, 0.7, 4), 0x4a4038, [-0.22, 1.6, 0], [0, 0, 1]],
    ]),
    bush: buildCompositeGeometry([
        [IC(0.4, 6), 0x3f7a35, [0, 0.3, 0]],
        [IC(0.3, 6), 0x4a9444, [0.25, 0.25, 0.1]],
    ]),
    rock: buildCompositeGeometry([
        [IC(0.5), 0x7d7a72, [0, 0.25, 0]],
        [IC(0.3), 0x6b625a, [0.35, 0.15, 0.1]],
    ]),
    srock: buildCompositeGeometry([
        [IC(0.18), 0x7d7a72, [0, 0.08, 0]],
    ]),
    cliff: buildCompositeGeometry([
        [IC(0.7), 0x6d625a, [0, 0.5, 0]],
        [IC(0.5), 0x5a524a, [0.4, 0.3, 0.2]],
        [IC(0.45), 0x7d7a72, [-0.35, 0.8, -0.1]],
    ]),
    flower: buildCompositeGeometry([
        [CO(0.01, 0.01, 0.2, 3), 0x3f7a35, [0, 0.1, 0]],
        [IC(0.07, 5), 0xffffff, [0, 0.22, 0]],
    ]),
    tuft: buildCompositeGeometry([
        [CO(0.05, 0.25, 4), 0x4a9444, [0, 0.12, 0]],
        [CO(0.04, 0.2, 4), 0x3f7a35, [0.08, 0.1, 0.03]],
        [CO(0.04, 0.22, 4), 0x5aa84a, [-0.07, 0.11, -0.04]],
    ]),
    fence: buildCompositeGeometry([
        [new THREE.BoxGeometry(0.12, 0.8, 0.12), 0x6b4a2a, [-0.45, 0.4, 0]],
        [new THREE.BoxGeometry(0.12, 0.8, 0.12), 0x6b4a2a, [0.45, 0.4, 0]],
        [new THREE.BoxGeometry(1, 0.1, 0.06), WOOD, [0, 0.62, 0]],
        [new THREE.BoxGeometry(1, 0.1, 0.06), WOOD, [0, 0.3, 0]],
    ]),
    crop: buildCompositeGeometry([
        [new THREE.BoxGeometry(0.85, 0.22, 0.14), 0x5a8a3a, [0, 0.11, -0.25]],
        [new THREE.BoxGeometry(0.85, 0.26, 0.14), 0x7ab04a, [0, 0.13, 0]],
        [new THREE.BoxGeometry(0.85, 0.2, 0.14), 0x5a8a3a, [0, 0.1, 0.25]],
    ]),
    barrel: buildCompositeGeometry([
        [CO(0.28, 0.28, 0.6, 8), 0x7a5230, [0, 0.3, 0]],
        [CO(0.29, 0.29, 0.05, 8), 0x3a3a3a, [0, 0.15, 0]],
        [CO(0.29, 0.29, 0.05, 8), 0x3a3a3a, [0, 0.45, 0]],
    ]),
    crate: buildCompositeGeometry([
        [new THREE.BoxGeometry(0.62, 0.55, 0.62), WOOD, [0, 0.28, 0]],
        [new THREE.BoxGeometry(0.66, 0.06, 0.66), 0x5a3b22, [0, 0.5, 0]],
        [new THREE.BoxGeometry(0.66, 0.06, 0.66), 0x5a3b22, [0, 0.06, 0]],
    ]),
    pillar: buildCompositeGeometry([
        [CO(0.28, 0.32, 2, 8), 0x9aa3ad, [0, 1, 0]],
        [new THREE.BoxGeometry(0.8, 0.16, 0.8), 0xb9c0c8, [0, 0.08, 0]],
    ]),
    wall: buildCompositeGeometry([
        [new THREE.BoxGeometry(0.98, 1.1, 0.45), 0x77736a, [0, 0.55, 0]],
        [new THREE.BoxGeometry(0.45, 0.35, 0.5), 0x6b625a, [0.25, 1.2, 0]],
    ]),
    log: buildCompositeGeometry([
        [CO(0.18, 0.2, 1.1, 7), 0x5a3b22, [0, 0.18, 0], [0, 0, 1.5708]],
    ]),
    lamp: buildCompositeGeometry([
        [CO(0.05, 0.06, 1.7, 6), 0x3b2614, [0, 0.85, 0]],
        [new THREE.BoxGeometry(0.28, 0.06, 0.28), 0x3b2614, [0, 1.72, 0]],
    ]),
    lamph: buildCompositeGeometry([
        [new THREE.BoxGeometry(0.2, 0.24, 0.2), 0xffffff, [0, 1.58, 0]],
    ]),
    torch: buildCompositeGeometry([
        [CO(0.03, 0.04, 1.2, 5), 0x5a3b22, [0, 0.6, 0]],
    ]),
    torchf: buildCompositeGeometry([
        [CO(0.1, 0.28, 5), 0xffffff, [0, 1.32, 0]],
    ]),
    fire: buildCompositeGeometry([
        [CO(0.07, 0.07, 0.8, 5), 0x4a3020, [0, 0.1, 0], [0, 0.6, 1.5708]],
        [CO(0.07, 0.07, 0.8, 5), 0x4a3020, [0, 0.1, 0], [0, -0.6, 1.5708]],
        [IC(0.14), 0x6b625a, [0.4, 0.08, 0]],
        [IC(0.14), 0x6b625a, [-0.4, 0.08, 0.1]],
        [IC(0.14), 0x6b625a, [0, 0.08, 0.4]],
        [IC(0.14), 0x6b625a, [0, 0.08, -0.4]],
    ]),
    firef: buildCompositeGeometry([
        [CO(0.2, 0.55, 6), 0xffffff, [0, 0.4, 0]],
    ]),
    sign: buildCompositeGeometry([
        [CO(0.04, 0.05, 1.2, 5), 0x5a3b22, [0, 0.6, 0]],
        [new THREE.BoxGeometry(0.7, 0.38, 0.06), 0xb08a5a, [0, 1.15, 0]],
    ]),
    altar: buildCompositeGeometry([
        [new THREE.BoxGeometry(1.1, 0.5, 0.7), 0x9aa3ad, [0, 0.25, 0]],
        [new THREE.BoxGeometry(0.8, 0.15, 0.5), 0xb9c0c8, [0, 0.58, 0]],
    ]),
    tent: buildCompositeGeometry([
        [CO(0.95, 1.3, 5), 0xffffff, [0, 0.65, 0]],
        [new THREE.BoxGeometry(0.3, 0.7, 0.05), 0x2a2118, [0, 0.35, 0.5]],
    ]),
    well: buildCompositeGeometry([
        [CO(0.7, 0.7, 0.6, 10), 0x77736a, [0, 0.3, 0]],
        [CO(0.5, 0.5, 0.02, 10), 0x2f6fa8, [0, 0.58, 0]],
        [new THREE.BoxGeometry(0.08, 1.4, 0.08), 0x5a3b22, [-0.6, 1.1, 0]],
        [new THREE.BoxGeometry(0.08, 1.4, 0.08), 0x5a3b22, [0.6, 1.1, 0]],
        [CO(0.95, 0.5, 4), 0x7a2e24, [0, 2.05, 0], [0, 0.785, 0]],
    ]),
    stall: buildCompositeGeometry([
        [new THREE.BoxGeometry(1.8, 0.5, 0.7), WOOD, [0, 0.5, 0]],
        [new THREE.BoxGeometry(0.08, 1.7, 0.08), 0x5a3b22, [-0.85, 0.85, -0.3]],
        [new THREE.BoxGeometry(0.08, 1.7, 0.08), 0x5a3b22, [0.85, 0.85, -0.3]],
        [new THREE.BoxGeometry(0.08, 1.7, 0.08), 0x5a3b22, [-0.85, 0.85, 0.3]],
        [new THREE.BoxGeometry(0.08, 1.7, 0.08), 0x5a3b22, [0.85, 0.85, 0.3]],
        [new THREE.BoxGeometry(2.1, 0.08, 1.1), 0xffffff, [0, 1.75, 0]],
        [IC(0.18, 6), 0xd25a3a, [-0.4, 0.8, 0]],
        [IC(0.18, 6), 0xe0b93f, [0.2, 0.8, 0.1]],
    ]),
};

installV6Environment(THREE, OBJECT_GEOMETRIES, buildCompositeGeometry);

// Materials (lazy-initialized after textures)
let _MATERIALS = null;

export function getMaterials() {
    if (!_MATERIALS) {
        _MATERIALS = {
            // V7.7: the old global grayscale stone texture was multiplied on
            // every instanced object, including flowers, baskets, stall roofs,
            // rocks and lanterns.  It caused the black noisy scribble pattern.
            // Geometry already has per-part vertex colours; use those alone.
            vertexColor: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
            flame: new THREE.MeshBasicMaterial({ color: 0xff9a2a }),
            lamp: new THREE.MeshBasicMaterial({ color: 0xffd36a }),
        };
    }
    return _MATERIALS;
}

// Material map for object types (lazy)
let _TYPE_MATERIALS = null;

export function getTypeMaterials() {
    if (!_TYPE_MATERIALS) {
        const M = getMaterials();
        _TYPE_MATERIALS = {
            lamph: M.lamp,
            torchf: M.flame,
            firef: M.flame,
        };
    }
    return _TYPE_MATERIALS;
}

// Backwards compatibility - these will be initialized on first access
export const MATERIALS = new Proxy({}, {
    get(_, prop) { return getMaterials()[prop]; }
});

export const TYPE_MATERIALS = new Proxy({}, {
    get(_, prop) { return getTypeMaterials()[prop]; }
});

// Initialize all assets
export function initAssets() {
    initTextures();
    
    // Set bounding spheres for frustum culling
    const CHECK_DIST = 16;
    for (const key in OBJECT_GEOMETRIES) {
        OBJECT_GEOMETRIES[key].boundingSphere = new THREE.Sphere(
            new THREE.Vector3(0, 1, 0), 
            CHECK_DIST * 0.85
        );
    }
    
    console.log('[Assets] All procedural assets initialized');
}