/**
 * Game Configuration Constants
 * Centralized configuration for easy tweaking
 */

export const GAME_IDENTITY = {
    NAME: 'HINÁRIA',
    SUBTITLE: 'Um Mundo Além dos Sonhos',
    STARTING_CITY: 'Vilarrubra',
    VERSION: '1.2.0-hinaria-upgrade' ,
};

export const CONFIG = {
    // World
    WORLD_SIZE: 96, // Expansão V1: 96×96, coordenadas 0–63 preservadas
    TILE_SIZE: 1,
    CHUNK_SIZE: 16,
    
    // Player
    PLAYER_RADIUS: 0.28,
    PLAYER_ACCELERATION: 30,
    PLAYER_DECELERATION: 34,
    PLAYER_MAX_SPEED: 4.6,
    PLAYER_REGEN_INTERVAL: 3,
    PLAYER_REGEN_AMOUNT: 1,
    
    // Camera
    CAMERA_FOV: 42,
    CAMERA_NEAR: 0.1,
    CAMERA_FAR: 80,
    CAMERA_BASE_HEIGHT: 10.5,
    CAMERA_BASE_DISTANCE: 8.5,
    CAMERA_ZOOM_MIN: 0.5,
    CAMERA_ZOOM_MAX: 1.7,
    CAMERA_LERP_FACTOR: 0.85,
    
    // Combat
    BASE_ATTACK_COOLDOWN: 1,
    CRIT_CHANCE: 0.1,
    CRIT_MULTIPLIER: 2,
    ENEMY_AGGRO_RANGE_MULTIPLIER: 1,
    
    // XP & Leveling
    XP_PER_LEVEL_BASE: 50,
    
    // Mana
    MANA_REGEN_RATE: 1, // per second, multiplied by class.mr
    
    // Replay
    REPLAY_MANA_COST: 20,
    REPLAY_COOLDOWN: 30,
    REPLAY_HISTORY_MAX: 16,
    REPLAY_HISTORY_INTERVAL: 0.25,
    
    // UI
    MINIMAP_UPDATE_INTERVAL: 0.1,
    FOG_REVEAL_RADIUS: 6.5,
    FOG_REVEAL_EXPLORE_RADIUS: 8,
    NPC_INTERACTION_RANGE: 3.25,
    
    // Rendering
    MOBILE_PIXEL_RATIO: 1.5,
    DESKTOP_PIXEL_RATIO_MAX: 2,
    ANTIALIAS_DESKTOP: true,
    ANTIALIAS_MOBILE: false,
    
    // Pathfinding
    PATHFIND_LIMIT_PLAYER: 999,
    PATHFIND_LIMIT_ENEMY: 18,
    PATHFIND_REPATH_INTERVAL_ENEMY: 0.45,
    PATHFIND_REPATH_INTERVAL_PLAYER: 0.4,
    
    // Enemy
    ENEMY_SPAWN_MIN_DIST_FROM_PLAYER: 8,
    ENEMY_SPAWN_MAX_ATTEMPTS: 400,
    ENEMY_WANDER_CHANCE: 0.5, // per second
    ENEMY_RESPAWN_MULTIPLIER: 1000, // ms
    
    // Visual Effects
    DAMAGE_FLASH_DURATION: 0.18,
    FLOATING_TEXT_DURATION: 1.1,
    FLOATING_TEXT_SPEED: 40,
    EFFECT_EXPAND_SPEED: 3,
    
    // Colors (hex)
    COLORS: {
        BACKGROUND: 0x15130f,
        FOG_DEFAULT: 0x15130f,
        SUN_COLOR: 0xfff0cc,
        SUN_INTENSITY: 0.75,
        HEMI_SKY: 0xdfeaff,
        HEMI_GROUND: 0x3d3322,
        HEMI_INTENSITY: 0.95,
        HP_BAR: 0x3f9a3a,
        HP_BAR_BG: 0x5a2a24,
        XP_BAR: 0xc9a227,
        MP_BAR: 0x3a7bd5,
        MP_BAR_BG: 0x1d2a4a,
        GOLD: 0xe0b93f,
        GOLD_DARK: 0x5a4410,
        DAMAGE_TEXT: 0xff7a6b,
        CRIT_TEXT: 0xffd24a,
        NORMAL_TEXT: 0xffe2a8,
        HEAL_TEXT: 0x7dff9a,
        BUFF_TEXT: 0xffe9a0,
        LEVELUP_FX: 0xffd24a,
        REPLAY_FX: 0x7aa8ff,
        TARGET_RING: 0xff5a4a,
        NPC_MINIMAP: 0x6ab0ff,
        ENEMY_MINIMAP: 0xff5a4a,
        PLAYER_MINIMAP: 0xffffff,
        LANDMARK_MINIMAP: 0xffd24a,
    },
    
    // Biome colors for minimap
    BIOME_MINIMAP_COLORS: {
        0: [74, 110, 48],    // Plains
        1: [176, 140, 88],   // Fields
        2: [150, 148, 140],  // Village
        3: [47, 110, 168],   // Water
        4: [150, 110, 60],   // Bridge/Shore
        5: [38, 72, 40],     // Forest
        6: [84, 70, 60],     // Ruins
        7: [128, 124, 112],  // Stone
        8: [44, 40, 50],     // Cave/Dark
        9: [196, 176, 126],  // Sand/Beach
    },
    
    // Biome ground colors
    BIOME_GROUND_COLORS: {
        0: [74, 110, 48],
        1: [132, 100, 64],
        2: [104, 100, 92],
        3: [40, 70, 80],
        4: [96, 72, 46],
        5: [40, 72, 38],
        6: [78, 68, 58],
        7: [116, 112, 102],
        8: [50, 46, 52],
        9: [170, 152, 106],
    },
    
    // Zone names
    ZONE_NAMES: [
        'Vila de Vilarrubra (zona segura)',
        'Campos de Vilarrubra',
        'Floresta Densa',
        '',
        'Ruínas de Ardu',
        'Terras Perigosas',
        'Caverna Sombria',
    ],
    
    // Atmosphere colors per zone
    ATMOSPHERE_COLORS: [
        0x15130f, // 0 - Village
        0x15130f, // 1 - Fields
        0x0d1a10, // 2 - Forest
        0x15130f, // 3 - Water
        0x13161e, // 4 - Ruins
        0x201210, // 5 - Dangerous
        0x06060a, // 6 - Cave
    ],
};

export const KEYS = {
    MOVEMENT: {
        'w': [0, -1], 'ArrowUp': [0, -1],
        's': [0, 1], 'ArrowDown': [0, 1],
        'a': [-1, 0], 'ArrowLeft': [-1, 0],
        'd': [1, 0], 'ArrowRight': [1, 0],
    },
    ACTIONS: {
        '1': 'skill0',
        '2': 'skill1',
        '3': 'skill2',
        '4': 'replay',
        'r': 'replay',
        'Enter': 'chat',
        'Escape': 'closeChat',
        'q': 'camLeft',
        'e': 'camRight',
    },
};

export const DIRECTIONS_8 = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
];

export const DIRECTIONS_4 = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
];