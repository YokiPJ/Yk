/**
 * Game State Management
 * Centralized state container for all game systems
 */

import { CONFIG } from './config.js';

export class GameState {
    constructor() {
        // Core Three.js objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.ground = null;
        this.waterMesh = null;
        
        // World data
        this.W = CONFIG.WORLD_SIZE;
        this.G = []; // Ground type per tile
        this.ZN = []; // Zone per tile
        this.B = []; // Collision grid
        this.RC = null; // Reachable cells
        this.HG = null; // Height map
        this.HS = []; // Height modifiers (hills)
        this.BRG = []; // Bridges
        this.CLR = []; // Clearings
        this.LM = []; // Landmarks
        this.CH = []; // Chests
        this.HO = []; // Houses
        this.OB = []; // Objects
        this.byT = {}; // Objects by type
        this.flick = []; // Flickering lights
        
        // Entities
        this.ents = [];
        this.dead = [];
        this.pr = []; // Projectiles
        this.fl = []; // Floating text
        this.trees = [];
        this.mfx = []; // Forge effects
        this.smoke = [];
        this.forge = null;
        this.fire = null;
        
        // Player
        this.P = null;
        this.tgt = null;
        this.yaw = 0;
        this.zoom = 1;
        this.Z = 1; // Camera zoom interpolation
        this.L = null; // Camera look-at target
        
        // Input
        this.keys = {};
        this.jx = 0;
        this.jz = 0;
        this.jid = null;
        this.ptr = {};
        this.pd = null;
        this.pdist = 0;
        
        // UI
        this.ccOpen = true;
        this.arsenalOpen = false;
        this.dialogueOpen = false;
        this.insideHouse = false;
        this.offer = false; // Bram trade offer
        this.hist = []; // Replay history
        this.hT = 0;
        this.lc = -1; // Last player tile X
        this.lz = -1; // Last player tile Z
        this.zc = -1; // Last zone
        this.exT = 0; // Exploration timer
        this.mmT = 0; // Minimap timer
        this.mmBig = false;
        this.mmOff = false;
        this.mmDrawNeeded = true;
        this.flow = 'BOOT';
        this.pauseRequested = false;
        this.sessionStarted = false;
        this.enemyRespawns = [];
        this.defeatedBosses = new Set();
        this.suspendLegacyPersistence = false;
        
        // Time
        this.t = 0;
        this.lastTime = performance.now();
        
        // DOM elements (cached)
        this.dom = {};
        
        // Minimap
        this.mmB = null; // Base minimap canvas
        this.fogC = null; // Fog canvas
        this.mmc = null; // Minimap canvas element
        this.mmx = null; // Minimap 2d context
        this.mmw = null; // Minimap wrapper
        
        // Textures
        this.TXM = {}; // Material cache
        this.FT = []; // Face textures
        this.gtex = null; // Ground texture
        this.WTX = null; // Water texture
        
        // Animation
        this.animationMixers = [];
        
        // Audio
        this.audioContext = null;
        this.sounds = {};
        this.music = null;
        
        // Save
        this.saveVersion = 2;
        this.worldChunks = new Map();
        this.activeChunkCount = 0;
        this.loreMarkers = [];
    }
    
    // Helper to get tile height at world position
    getHeightAt(x, z) {
        // Cinematic cameras can probe outside the 96x96 terrain. Never let a
        // missing grid, invalid coordinate or partially loaded world yield NaN.
        if (!this.HG || !Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(this.W) || this.W < 1) return 0;
        const c = this.G[Math.round(x)];
        if (c && c[Math.round(z)] === 4) return 0.14;
        let u = x + 0.5, v = z + 0.5;
        u = u < 0 ? 0 : u > this.W ? this.W : u;
        v = v < 0 ? 0 : v > this.W ? this.W : v;
        const i = Math.min(this.W - 1, u | 0), j = Math.min(this.W - 1, v | 0);
        const fu = u - i, fv = v - j, s = this.W + 1;
        const a = this.HG[j * s + i], b = this.HG[j * s + i + 1];
        const c2 = this.HG[(j + 1) * s + i], d = this.HG[(j + 1) * s + i + 1];
        if (![a,b,c2,d].every(Number.isFinite)) return 0;
        return (a * (1 - fu) + b * fu) * (1 - fv) + (c2 * (1 - fu) + d * fu) * fv;
    }
    
    // Check if position is in safe zone
    inSafeZone(x, z) {
        return this.ZN[x] && this.ZN[x][z] === 0;
    }
    
    // Reset for new game
    reset() {
        this.ents = [];
        this.dead = [];
        this.pr = [];
        this.fl = [];
        this.hist = [];
        this.t = 0;
        this.yaw = 0;
        this.zoom = 1;
        this.Z = 1;
        this.tgt = null;
        this.ccOpen = true;
        this.arsenalOpen = false;
        this.offer = false;
        this.dialogueOpen = false;
        this.insideHouse = false;
        this.keys = {};
        this.jx = this.jz = 0;
        this.jid = null;
        this.ptr = {};
        this.pd = null;
        this.pdist = 0;
        this.lc = this.lz = this.zc = -1;
        this.exT = this.mmT = 0;
        this.hT = 0;
        this.animationMixers = [];
    }
}

// Singleton instance
export const gameState = new GameState();
