// js/main.js

import { CONFIG, WAVE_CONFIGS } from './config.js';
import { Quadtree, Rectangle, removeDeadEntities, formatTime } from './systems/utils.js';
import { loadPermanentData, saveScore } from './systems/save.js';
import SoundManager from './systems/sound.js';
import { createPool, getFromPool, releaseToPool } from './systems/pooling.js';
import { ui, setupEventListeners, showTemporaryMessage, populateLevelUpOptions, updateHUD } from './systems.ui.js';
import { Player } from './entities/player.js';
import { Enemy, BossEnemy } from './entities/enemy.js';
import { Platform } from './entities/platform.js';
import { Particle } from './entities/particle.js';
import { XPOrb } from './entities/xpOrb.js';
import { DamageNumber } from './entities/damagenumber.js';
import { DemoPlayer } from './entities/demoplayer.js';
import { Projectile, EnemyProjectile } from './entities/projectile.js';
import { PowerUp } from './entities/powerup.js';
import { Vortex } from './entities/vortex.js';
import { StaticField } from './entities/staticfield.js';

// Variáveis de estado globais
let gameState = 'loading';
let lastFrameTime = 0;
let gameTime = 0;
let frameCount = 0;
let isMobile, canvas, ctx;
let player, demoPlayer;

// Arrays de entidades
let platforms = [], enemies = [], activeVortexes = [], powerUps = [], activeStaticFields = [];

// Pools de Objetos
let particlePool, projectilePool, enemyProjectilePool, xpOrbPool, damageNumberPool;

// Estado do Jogo
let qtree;
let score = { kills: 0, time: 0 };
let screenShake = { intensity: 0, duration: 0 };
let keys = {};
let movementVector = { x: 0, y: 0 };
let waveNumber = 0;
let waveEnemiesRemaining = { value: 0 };
let waveCooldownTimer = 0;
let currentWaveConfig = {};
let enemySpawnTimer = 0;

// Câmera
let camera = {
    x: 0, y: 0, targetX: 0, targetY: 0,
    update() {
        if (!player || player.isDead) return;
        this.targetX = player.x - canvas.width / 2;
        this.targetY = player.y - canvas.height / 2;
        this.x += (this.targetX - this.x) * CONFIG.CAMERA_LERP_FACTOR;
        this.y += (this.targetY - this.y) * CONFIG.CAMERA_LERP_FACTOR;
    }
};

let gameContext;

function setGameState(newState) {
    const oldState = gameState;
    if (oldState === newState) return;
    gameState = newState;
    
    if (['menu', 'paused', 'levelUp', 'gameOver', 'guide', 'rank', 'upgrades'].includes(newState)) {
        SoundManager.play('uiClick', 'C6');
    }

    if (newState === 'playing' && (oldState === 'paused' || oldState === 'levelUp')) {
        lastFrameTime = performance.now();
    }

    const isMenuState = ['menu', 'levelUp', 'gameOver', 'guide', 'rank', 'upgrades'].includes(newState);
    ui.layer.classList.toggle('active-menu', isMenuState || newState === 'paused');
    ui.hud.classList.toggle('hidden', newState !== 'playing' && newState !== 'paused');
    ui.dashButtonMobile.classList.toggle('hidden', !isMobile || newState !== 'playing');

    Object.values(ui).forEach(element => {
        if (element?.classList?.contains('ui-panel')) {
            element.classList.add('hidden');
        }
    });

    switch (newState) {
        case 'menu': ui.mainMenu.classList.remove('hidden'); break;
        case 'paused': ui.pauseMenu.classList.remove('hidden'); break;
        case 'gameOver':
            document.getElementById('final-time').innerText = formatTime(score.time);
            document.getElementById('final-kills').innerText = score.kills;
            ui.gameOverScreen.classList.remove('hidden');
            saveScore(score);
            break;
        case 'levelUp':
            populateLevelUpOptions(player, gameContext);
            ui.levelUpScreen.classList.remove('hidden');
            break;
        case 'guide': ui.guideScreen.classList.remove('hidden'); break;
        case 'rank': ui.rankScreen.classList.remove('hidden'); break;
        case 'upgrades': ui.upgradesMenu.classList.remove('hidden'); break;
    }
}

function startNextWave() {
    waveNumber++;
    if (waveNumber > 0 && waveNumber % 5 === 0) {
        showTemporaryMessage(`BOSS - ONDA ${waveNumber}`, "red");
        enemies.push(new BossEnemy(player.x + canvas.width, player.y - 100, gameTime, waveNumber));
        waveEnemiesRemaining.value = 1;
        currentWaveConfig = { enemies: [], eliteChance: 0.1 };
        return;
    }

    const waveIndex = waveNumber - 1;
    if (waveIndex < WAVE_CONFIGS.length) {
        currentWaveConfig = JSON.parse(JSON.stringify(WAVE_CONFIGS[waveIndex]));
    } else {
        showTemporaryMessage(`ONDA ${waveNumber} (Infinita)`, "cyan");
        const enemyTypes = ['chaser', 'speeder', 'tank', 'shooter', 'bomber', 'healer', 'summoner', 'reaper'];
        const typesInWave = Math.min(2 + Math.floor(waveNumber / 7), 5);
        currentWaveConfig = { enemies: [], eliteChance: Math.min(0.05 + (waveNumber - WAVE_CONFIGS.length) * 0.01, 0.25) };
        let typesAdded = new Set();
        for(let i = 0; i < typesInWave; i++) {
            let type;
            do { type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)]; } while (typesAdded.has(type));
            typesAdded.add(type);
            currentWaveConfig.enemies.push({ type, count: 5 + Math.floor(waveNumber * 0.8), spawnInterval: Math.max(20, 100 - waveNumber * 2) });
        }
    }
    waveEnemiesRemaining.value = currentWaveConfig.enemies.reduce((sum, cfg) => sum + cfg.count, 0);
    enemySpawnTimer = 0;
    showTemporaryMessage(`ONDA ${waveNumber}!`, "gold");
}

function spawnEnemies() {
    if (waveEnemiesRemaining.value <= 0 && enemies.length === 0) {
        if (waveCooldownTimer <= 0) {
            waveCooldownTimer = 180;
            if (waveNumber > 0) showTemporaryMessage("PAUSA ENTRE ONDAS", "white");
        } else {
            waveCooldownTimer--;
            if (waveCooldownTimer <= 0) startNextWave();
        }
        return;
    }

    if (waveEnemiesRemaining.value > 0 && --enemySpawnTimer <= 0) {
        const availableTypes = currentWaveConfig.enemies.filter(e => e.count > 0);
        if (availableTypes.length === 0) return;
        
        const config = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        const isElite = Math.random() < (currentWaveConfig.eliteChance || 0);
        let x, y;
        const side = Math.floor(Math.random() * 4), margin = 50;
        const cam = camera;
        if (side === 0) { x = cam.x - margin; y = cam.y + Math.random() * canvas.height; }
        else if (side === 1) { x = cam.x + canvas.width + margin; y = cam.y + Math.random() * canvas.height; }
        else if (side === 2) { x = cam.x + Math.random() * canvas.width; y = cam.y - margin; }
        else { x = cam.x + Math.random() * canvas.width; y = cam.y + canvas.height + margin; }
        
        enemies.push(new Enemy(x, y, config.type, isElite, gameTime, waveNumber));
        config.count--;
        enemySpawnTimer = config.spawnInterval;
    }
}

function handleCollisions() {
    if (!qtree || !player || player.isDead) return;
    for (const proj of projectilePool) {
        if (!proj.active) continue;
        const range = new Rectangle(proj.x - proj.radius, proj.y - proj.radius, proj.radius * 2, proj.radius * 2);
        const nearbyEnemies = qtree.query(range);
        for (const enemy of nearbyEnemies) {
            if (proj.isDead || proj.piercedEnemies.has(enemy) || enemy.isDead) continue;
            if (Math.hypot(proj.x - enemy.x, proj.y - enemy.y) < proj.radius + enemy.radius) {
                enemy.takeDamage(proj.damage, gameContext);
                enemy.applyKnockback(proj.x, proj.y, CONFIG.ENEMY_KNOCKBACK_FORCE);
                proj.piercedEnemies.add(enemy);
                if (proj.piercedEnemies.size >= proj.pierce + 1) {
                    proj.isDead = true; releaseToPool(proj); break;
                }
            }
        }
    }
    for (const eProj of enemyProjectilePool) {
        if (!eProj.active) continue;
        if (Math.hypot(player.x - eProj.x, player.y - eProj.y) < player.radius + eProj.radius) {
            player.takeDamage(eProj.damage, gameContext);
            eProj.isDead = true; releaseToPool(eProj);
        }
    }
    const playerRange = new Rectangle(player.x - player.radius, player.y - player.radius, player.radius * 2, player.radius * 2);
    const nearbyToPlayer = qtree.query(playerRange);
    for (const enemy of nearbyToPlayer) {
        if (enemy.isDead) continue;
        if (Math.hypot(player.x - enemy.x, player.y - enemy.y) < player.radius + enemy.radius) {
            player.takeDamage(enemy.damage, gameContext);
            enemy.applyKnockback(player.x, player.y, 15);
        }
    }
}

function initGame() {
    gameTime = 0; frameCount = 0; score = { kills: 0, time: 0 };
    screenShake = { intensity: 0, duration: 0 };
    platforms = []; enemies = []; activeVortexes = []; powerUps = []; activeStaticFields = [];
    [projectilePool, xpOrbPool, damageNumberPool, particlePool].forEach(pool => pool && pool.forEach(releaseToPool));
    document.getElementById('skills-hud').innerHTML = '';

    const groundLevel = canvas.height * (1 - CONFIG.GROUND_HEIGHT_PERCENT);
    platforms.push(new Platform(-CONFIG.WORLD_BOUNDS.width * 2, groundLevel, CONFIG.WORLD_BOUNDS.width * 4, CONFIG.WORLD_BOUNDS.height));
    const platformCount = 40;
    for (let i = 0; i < platformCount; i++) {
        const pWidth = Math.random() * 200 + 150;
        const pHeight = 20;
        const pX = (Math.random() - 0.5) * (CONFIG.WORLD_BOUNDS.width - pWidth);
        const pY = groundLevel - (Math.random() * 500 + 80); 
        platforms.push(new Platform(pX, pY, pWidth, pHeight));
    }
    player = new Player(canvas.width / 2, groundLevel - 50, canvas);
    gameContext.player = player;
    waveNumber = 0; waveEnemiesRemaining.value = 0; waveCooldownTimer = 0;
    startNextWave();
    setGameState('playing');
}

function updateGame(deltaTime) {
    if (!player) return;
    gameTime += deltaTime; frameCount++; score.time = gameTime;
    const worldBounds = new Rectangle(-CONFIG.WORLD_BOUNDS.width / 2, -CONFIG.WORLD_BOUNDS.height / 2, CONFIG.WORLD_BOUNDS.width, CONFIG.WORLD_BOUNDS.height);
    qtree = new Quadtree(worldBounds, 4);
    enemies.forEach(e => { if (!e.isDead) qtree.insert(e); });
    gameContext.qtree = qtree;
    player.update(gameContext);
    [...enemies, ...powerUps, ...activeVortexes, ...activeStaticFields, ...projectilePool, ...enemyProjectilePool, ...damageNumberPool, ...xpOrbPool].forEach(e => e.active && e.update(gameContext));
    camera.update();
    spawnEnemies();
    handleCollisions();
    [enemies, powerUps, activeVortexes, activeStaticFields].forEach(removeDeadEntities);
    if (screenShake.duration > 0 && --screenShake.duration <= 0) screenShake.intensity = 0;
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    if (screenShake.intensity > 0) ctx.translate((Math.random() - 0.5) * screenShake.intensity, (Math.random() - 0.5) * screenShake.intensity);
    [...platforms, ...xpOrbPool, ...powerUps, ...activeVortexes, ...activeStaticFields, ...enemies, ...projectilePool, ...enemyProjectilePool].forEach(e => e.active && e.draw(ctx, camera, player));
    if (player) player.draw(ctx, camera);
    damageNumberPool.forEach(dn => dn.active && dn.draw(ctx, camera));
    ctx.restore();
    updateHUD(player, gameTime, frameCount);
}

function gameLoop(currentTime) {
    requestAnimationFrame(gameLoop);
    if (gameState === 'loading' || !lastFrameTime) { lastFrameTime = currentTime; return; }
    const deltaTime = (currentTime - lastFrameTime) / 1000.0;
    if (gameState === 'playing') updateGame(deltaTime);
    else if (gameState === 'menu') {
        if (!demoPlayer) demoPlayer = new DemoPlayer(canvas.width / 2, canvas.height / 2);
        demoPlayer.update();
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameState === 'menu' && demoPlayer) demoPlayer.draw(ctx);
    else if (gameState !== 'loading') drawGame();
    lastFrameTime = currentTime;
}

window.onload = () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const resizeCanvas = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    particlePool = createPool(Particle, 200);
    projectilePool = createPool(Projectile, 50);
    enemyProjectilePool = createPool(EnemyProjectile, 50);
    xpOrbPool = createPool(XPOrb, 100);
    damageNumberPool = createPool(DamageNumber, 50);

    gameContext = {
        setGameState, showTemporaryMessage, score, xpOrbPool, particlePool,
        enemyProjectilePool, activeVortexes, powerUps, damageNumberPool,
        waveEnemiesRemaining, screenShake,
        get enemies() { return enemies; }, get platforms() { return platforms; },
        get player() { return player; }, get qtree() { return qtree; },
        get frameCount() { return frameCount; }, get gameTime() { return gameTime; },
        get waveNumber() { return waveNumber; }, get playerProjectiles() { return projectilePool; },
        get staticFields() { return activeStaticFields; },
        isMobile, keys, movementVector, ui, initGame
    };

    loadPermanentData();
    SoundManager.init();
    setupEventListeners(gameContext);
    setGameState('menu');
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
    document.getElementById('debug-status').style.display = 'none';
};