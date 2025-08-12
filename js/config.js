// js/config.js
export const DEBUG_MODE = false;

export const CONFIG = {
    PLAYER_HEALTH: 120,
    PLAYER_SPEED: 3,
    PLAYER_JUMP_FORCE: -10,
    PLAYER_DASH_FORCE: 15,
    PLAYER_DASH_DURATION: 10,
    PLAYER_DASH_COOLDOWN: 60,
    PLAYER_DOUBLE_JUMP_FORCE: -8,
    GRAVITY: 0.5,
    GROUND_HEIGHT_PERCENT: 0.2,
    XP_TO_NEXT_LEVEL_BASE: 80,
    XP_TO_NEXT_LEVEL_MULTIPLIER: 1.15,
    XP_ORB_ATTRACTION_RADIUS: 120,
    POWERUP_DROP_CHANCE: 0.02,
    JOYSTICK_RADIUS: 60,
    JOYSTICK_DEAD_ZONE: 10,
    CAMERA_LERP_FACTOR: 0.05,
    ENEMY_KNOCKBACK_FORCE: 20,
    PLAYER_LANDING_SQUASH_DURATION: 10,
    ORB_HIT_COOLDOWN_FRAMES: 12,
    TEMPORARY_MESSAGE_DURATION: 120,
    WORLD_BOUNDS: { width: 8000, height: 2000 }
};

export const PERMANENT_UPGRADES = {
    'max_health': { name: "Vitalidade", icon: "❤️", levels: [
        { cost: 10, effect: 10 }, { cost: 25, effect: 20 }, { cost: 50, effect: 30 }
    ], desc: (val) => `+${val} Vida Máxima`},
    'damage_boost': { name: "Poder", icon: "💥", levels: [
        { cost: 20, effect: 0.05 }, { cost: 50, effect: 0.10 }, { cost: 100, effect: 0.15 }
    ], desc: (val) => `+${Math.round(val*100)}% Dano`},
    'xp_gain': { name: "Sabedoria", icon: "⭐", levels: [
        { cost: 15, effect: 0.1 }, { cost: 40, effect: 0.2 }, { cost: 80, effect: 0.3 }
    ], desc: (val) => `+${Math.round(val*100)}% Ganho de XP`}
};

export const SKILL_DATABASE = {
    'chain_lightning': { name: "Relâmpago em Cadeia", icon: "↯", type: 'projectile', cooldown: 120, levels: [
        { desc: "Lança um raio que salta para 2 inimigos.", damage: 25, chains: 2, chainRadius: 150 },
        { desc: "O raio salta para 3 inimigos.", damage: 30, chains: 3, chainRadius: 160 },
        { desc: "Aumenta o dano e o número de saltos.", damage: 35, chains: 4, chainRadius: 170 },
        { desc: "Aumenta ainda mais o dano e os saltos.", damage: 40, chains: 5, chainRadius: 180 },
        { desc: "O raio é devastador e salta massivamente.", damage: 50, chains: 6, chainRadius: 200 }
    ]},
    'divine_lance': { name: "Lança Divina", icon: "↑", type: 'projectile', cooldown: 50, levels: [
        { desc: "Dispara uma lança perfurante.", count: 1, damage: 10, pierce: 2, speed: 7 },
        { desc: "Dispara duas lanças.", count: 2, damage: 12, pierce: 2, speed: 7 },
        { desc: "Aumenta o dano e a perfuração.", count: 2, damage: 15, pierce: 3, speed: 8 },
        { desc: "Dispara três lanças.", count: 3, damage: 15, pierce: 3, speed: 8 },
        { desc: "Lanças mais rápidas e fortes.", count: 3, damage: 20, pierce: 4, speed: 9 }
    ]},
    'orbital_shield': { name: "Escudo Orbital", icon: "O", type: 'orbital', cooldown: 0, levels: [
        { desc: "Um orbe sagrado gira ao seu redor.", count: 1, damage: 5, radius: 70, speed: 0.05 },
        { desc: "Adiciona um segundo orbe.", count: 2, damage: 8, radius: 75, speed: 0.05 },
        { desc: "Aumenta o dano dos orbes.", count: 2, damage: 15, radius: 80, speed: 0.05 },
        { desc: "Adiciona um terceiro orbe.", count: 3, damage: 15, radius: 85, speed: 0.06 },
        { desc: "Orbes mais rápidos e fortes.", count: 3, damage: 20, radius: 90, speed: 0.07 }
    ]},
    'vortex': { name: "Vórtice Sagrado", icon: "V", type: 'aura', cooldown: 400, levels: [
        { desc: "Cria um vórtice que puxa inimigos.", radius: 150, duration: 120, force: 1.5, damage: 1 },
        { desc: "Aumenta a força de atração.", radius: 160, duration: 120, force: 2.0, damage: 1 },
        { desc: "Aumenta o raio do vórtice.", radius: 200, duration: 150, force: 2.0, damage: 2 },
        { desc: "Vórtice mais duradouro e forte.", radius: 220, duration: 180, force: 2.5, damage: 2 },
    ]},
    'magnet': { name: "Íman Divino", icon: "M", type: 'passive', levels: [
        { desc: "Aumenta o raio de recolha de XP em 25%.", collectRadiusBonus: 0.25 },
        { desc: "Aumenta o raio de recolha de XP em 50%.", collectRadiusBonus: 0.50 },
        { desc: "Aumenta o raio de recolha de XP em 75%.", collectRadiusBonus: 0.75 },
    ]},
    'heal': { name: "Cura Divina", icon: "+", type: 'utility', desc: "Restaura 25% da sua vida máxima.", instant: true },
    'health_regen': { name: "Regeneração Divina", icon: "♥", type: 'passive', levels: [
        { desc: "Regenera 0.5 de vida por segundo.", regenPerSecond: 0.5 },
        { desc: "Regenera 1 de vida por segundo.", regenPerSecond: 1 },
        { desc: "Regenera 1.5 de vida por segundo.", regenPerSecond: 1.5 },
        { desc: "Regenera 2 de vida por segundo.", regenPerSecond: 2 },
    ]},
    'particle_burst': { name: "Explosão de Partículas", icon: "✹", type: 'aura', cooldown: 240, levels: [
        { desc: "Liberta uma explosão de partículas que causa 10 de dano.", radius: 80, damage: 10, particleCount: 30 },
        { desc: "Aumenta o raio e o dano da explosão.", radius: 100, damage: 15, particleCount: 40 },
        { desc: "Aumenta ainda mais o dano e as partículas.", radius: 120, damage: 25, particleCount: 50 },
    ]},
    'dash': { name: "Carga Astral", icon: "»", type: 'utility', cooldown: CONFIG.PLAYER_DASH_COOLDOWN, levels: [
        { desc: `Realiza uma esquiva rápida na direção do movimento (cooldown: ${CONFIG.PLAYER_DASH_COOLDOWN/60}s).`, duration: CONFIG.PLAYER_DASH_DURATION, force: CONFIG.PLAYER_DASH_FORCE }
    ]},
    'double_jump': { name: "Salto Duplo", icon: "▲", type: 'passive', levels: [
        { desc: "Permite um segundo salto no ar.", jumps: 2 }
    ]},
    'celestial_ray': { name: "Raio Celestial", icon: "→", type: 'projectile', cooldown: 90, levels: [
        { desc: "Dispara um raio poderoso na última direção de movimento.", damage: 30, speed: 10, width: 10, length: 150, pierce: 5 }
    ]},
    'static_field': { name: "Campo Estático", icon: "⚡", type: 'aura', cooldown: 300, levels: [
        { desc: "Cria um campo que abranda inimigos em 50%.", radius: 100, duration: 180, slowFactor: 0.5 }
    ]},
    'black_hole': { name: "Buraco Negro", icon: "⚫", type: 'utility', cooldown: 900, levels: [ // 15 segundos de cooldown
        { desc: "Invoca um buraco negro que destrói todos os inimigos no ecrã.", damage: 99999 }
    ]},
    'aegis_shield': { name: "Égide Divina", icon: "🛡️", type: 'utility', cooldown: 600, levels: [ // 10s cooldown
        { desc: "Cria um escudo temporário que absorve um golpe.", duration: 300 } // 5 segundos de duração
    ]},
    'scorched_earth': { name: "Rastro Ardente", icon: "🔥", type: 'passive', levels: [
        { desc: "Deixa um rasto de chamas enquanto dá um dash, causando dano.", damagePerFrame: 0.5 }
    ]}
};

export const WAVE_CONFIGS = [
    { duration: 30, enemies: [{ type: 'chaser', count: 5, spawnInterval: 60 }], eliteChance: 0 },
    { duration: 45, enemies: [{ type: 'chaser', count: 8, spawnInterval: 50 }, { type: 'speeder', count: 4, spawnInterval: 70 }], eliteChance: 0.01 },
    { duration: 60, enemies: [{ type: 'chaser', count: 10, spawnInterval: 45 }, { type: 'speeder', count: 6, spawnInterval: 60 }, { type: 'tank', count: 3, spawnInterval: 100 }], eliteChance: 0.02 },
    { duration: 75, enemies: [{ type: 'chaser', count: 12, spawnInterval: 40 }, { type: 'speeder', count: 8, spawnInterval: 50 }, { type: 'tank', count: 4, spawnInterval: 90 }, { type: 'shooter', count: 2, spawnInterval: 120 }], eliteChance: 0.03 },
    { duration: 90, enemies: [{ type: 'chaser', count: 15, spawnInterval: 35 }, { type: 'speeder', count: 10, spawnInterval: 45 }, { type: 'tank', count: 5, spawnInterval: 80 }, { type: 'shooter', count: 3, spawnInterval: 100 }, { type: 'bomber', count: 2, spawnInterval: 150 }], eliteChance: 0.04 },
    { duration: 100, enemies: [{ type: 'chaser', count: 15, spawnInterval: 30 }, { type: 'healer', count: 1, spawnInterval: 200 }, { type: 'tank', count: 5, spawnInterval: 90 }], eliteChance: 0.05 },
    { duration: 110, enemies: [{ type: 'speeder', count: 15, spawnInterval: 30 }, { type: 'summoner', count: 1, spawnInterval: 250 }, { type: 'shooter', count: 4, spawnInterval: 100 }], eliteChance: 0.06 },
];