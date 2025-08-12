// js/main.js

// =================================================================================
// IMPORTS
// =================================================================================
import { DEBUG_MODE, CONFIG, WAVE_CONFIGS } from './config.js';
import { Quadtree, Rectangle, removeDeadEntities, formatTime } from './systems/utils.js';
import { loadPermanentData, savePermanentData } from './systems/save.js';
import SoundManager from './systems/sound.js';
import { createPool, getFromPool, releaseToPool } from './systems/pooling.js';
import { ui, setupEventListeners, showTemporaryMessage, populateLevelUpOptions, updateHUD } from './systems/ui.js';
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

// =================================================================================
// ESTADO GLOBAL DO JOGO
// =================================================================================
let gameState = 'loading';
let lastFrameTime = 0;
let gameTime = 0;
let frameCount = 0;

let canvas, ctx, gameContainer;
let player, demoPlayer;
let platforms = [], enemies = [], activeVortexes = [], powerUps = [], activeStaticFields = [];
let particlePool, projectilePool, enemyProjectilePool, xpOrbPool, damageNumberPool;
let qtree;

let score = { kills: 0, time: 0 };
let screenShake = { intensity: 0, duration: 0 };
const isMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
let keys = {};
let movementVector = { x: 0, y: 0 };

let waveNumber = 0;
let waveEnemiesRemaining = { value: 0 };
let waveCooldownTimer = 0;
let currentWaveConfig = {};
let enemySpawnTimer = 0;

let camera = {
    x: 0, y: 0, targetX: 0, targetY: 0,
    update() {
        if (!player) return;
        this.targetX = player.x - canvas.width / 2;
        this.targetY = player.y - canvas.height / 2;
        this.x += (this.targetX - this.x) * CONFIG.CAMERA_LERP_FACTOR;
        this.y += (this.targetY - this.y) * CONFIG.CAMERA_LERP_FACTOR;
    }
};

const gameContext = {
    setGameState,
    showTemporaryMessage,
    score,
    xpOrbPool: () => xpOrbPool,
    particlePool: () => particlePool,
    enemyProjectilePool: () => enemyProjectilePool,
    activeVortexes: () => activeVortexes,
    powerUps: () => powerUps,
    damageNumberPool: () => damageNumberPool,
    waveEnemiesRemaining,
    screenShake,
    enemies: () => enemies,
    player: () => player,
    isMobile,
    keys,
    movementVector,
    platforms: () => platforms,
    qtree: () => qtree,
    frameCount: () => frameCount,
    gameTime: () => gameTime,
    waveNumber: () => waveNumber,
    playerProjectiles: () => projectilePool,
    staticFields: () => activeStaticFields
};

// =================================================================================
// LÓGICA PRINCIPAL DO JOGO
// =================================================================================
function setGameState(newState) {
    const oldState = gameState;
    gameState = newState;
    
    if (['menu', 'paused', 'levelUp', 'gameOver', 'guide', 'rank', 'upgrades'].includes(newState) && oldState !== newState) {
        SoundManager.play('uiClick', 'C6');
    }

    if(newState === 'playing' && oldState === 'paused') {
        lastFrameTime = performance.now();
    }

    const isMenuState = ['menu', 'levelUp', 'gameOver', 'guide', 'rank', 'upgrades'].includes(newState);
    ui.layer.classList.toggle('active-menu', isMenuState || newState === 'paused');
    ui.hud.classList.toggle('hidden', newState !== 'playing');
    ui.dashButtonMobile.classList.toggle('hidden', !isMobile || newState !== 'playing');

    Object.values(ui).forEach(element => {
        if (element && element.classList && element.classList.contains('ui-panel')) {
            element.classList.add('hidden');
        }
    });

    switch (newState) {
        case 'menu': ui.mainMenu.classList.remove('hidden'); break;
        case 'paused': ui.pauseMenu.classList.remove('hidden'); ui.hud.classList.remove('hidden'); break;
        case 'gameOver':
            document.getElementById('final-time').innerText = formatTime(Math.floor(score.time));
            document.getElementById('final-kills').innerText = score.kills;
            ui.gameOverScreen.classList.remove('hidden');
            saveScore();
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

function saveScore() {
    const currentTimeInSeconds = Math.floor(score.time);
    const bestTime = parseInt(localStorage.getItem('bestTime') || '0');
    const totalKills = parseInt(localStorage.getItem('totalKills') || '0');
    if (currentTimeInSeconds > bestTime) localStorage.setItem('bestTime', currentTimeInSeconds);
    localStorage.setItem('totalKills', totalKills + score.kills);
}

function startNextWave() {
    waveNumber++;
    if (waveNumber > 0 && waveNumber % 5 === 0) {
        showTemporaryMessage(`BOSS - ONDA ${waveNumber}`, "red");
        enemies.push(new BossEnemy(player.x + canvas.width / 2, player.y - 100, gameTime, waveNumber));
        waveEnemiesRemaining.value = 1;
        currentWaveConfig = { enemies: [], eliteChance: 0 };
        return;
    }
    if (waveNumber <= WAVE_CONFIGS.length) {
        currentWaveConfig = JSON.parse(JSON.stringify(WAVE_CONFIGS[waveNumber - 1]));
    } else {
        showTemporaryMessage(`ONDA ${waveNumber}! (Infinita)`, "cyan");
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
            showTemporaryMessage("PAUSA ENTRE ONDAS", "white");
        } else {
            waveCooldownTimer--;
            if (waveCooldownTimer <= 0) startNextWave();
        }
        return;
    }
    enemySpawnTimer--;
    if (enemySpawnTimer <= 0 && waveEnemiesRemaining.value > 0) {
        let x, y;
        const side = Math.floor(Math.random() * 4), margin = 50;
        if (side === 0) { x = camera.x - margin; y = camera.y + Math.random() * canvas.height; }
        else if (side === 1) { x = camera.x + canvas.width + margin; y = camera.y + Math.random() * canvas.height; }
        else if (side === 2) { x = camera.x + Math.random() * canvas.width; y = camera.y - margin; }
        else { x = camera.x + Math.random() * canvas.width; y = camera.y + canvas.height + margin; }
        const availableTypes = currentWaveConfig.enemies.filter(e => e.count > 0);
        if (availableTypes.length === 0) return;
        const config = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        const isElite = Math.random() < currentWaveConfig.eliteChance;
        enemies.push(new Enemy(x, y, config.type, isElite, gameTime, waveNumber));
        config.count--;
        enemySpawnTimer = config.spawnInterval;
    }
}

function handleCollisions() {
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
                if (proj.piercedEnemies.size >= proj.pierce) {
                    proj.isDead = true;
                    releaseToPool(proj);
                    break;
                }
            }
        }
    }
    for (const eProj of enemyProjectilePool) {
        if (!eProj.active || player.isDead) continue;
        if (Math.hypot(player.x - eProj.x, player.y - eProj.y) < player.radius + eProj.radius) {
            player.takeDamage(eProj.damage, gameContext);
            eProj.isDead = true;
            releaseToPool(eProj);
        }
    }
    const playerRange = new Rectangle(player.x - player.radius, player.y - player.radius, player.radius * 2, player.radius * 2);
    const nearbyToPlayer = qtree.query(playerRange);
    for (const enemy of nearbyToPlayer) {
        if (enemy.isDead || player.isDead) continue;
        if (Math.hypot(player.x - enemy.x, player.y - enemy.y) < player.radius + enemy.radius) {
            player.takeDamage(enemy.damage, gameContext);
            enemy.applyKnockback(player.x, player.y, -15);
        }
    }
}

// =================================================================================
// INICIALIZAÇÃO E LOOP
// =================================================================================
function initGame() {
    gameTime = 0; frameCount = 0;
    score.kills = 0; score.time = 0;
    screenShake.intensity = 0; screenShake.duration = 0;
    platforms = []; enemies = []; activeVortexes = []; powerUps = []; activeStaticFields = [];
    
    [particlePool, projectilePool, enemyProjectilePool, xpOrbPool, damageNumberPool].forEach(pool => {
        pool.forEach(item => releaseToPool(item));
    });
    
    player = new Player(canvas.width / 2, canvas.height, canvas);
    const groundLevel = canvas.height * (1 - CONFIG.GROUND_HEIGHT_PERCENT);
    platforms.push(new Platform(-CONFIG.WORLD_BOUNDS.width, groundLevel, CONFIG.WORLD_BOUNDS.width * 2, CONFIG.WORLD_BOUNDS.height));
    
    waveNumber = 0;
    waveEnemiesRemaining.value = 0;
    waveCooldownTimer = 0;
    startNextWave();
    setGameState('playing');
}

function updateGame(deltaTime) {
    gameTime += deltaTime;
    frameCount++;
    score.time = gameTime;

    const worldBounds = new Rectangle(-CONFIG.WORLD_BOUNDS.width / 2, -CONFIG.WORLD_BOUNDS.height / 2, CONFIG.WORLD_BOUNDS.width, CONFIG.WORLD_BOUNDS.height);
    qtree = new Quadtree(worldBounds, 4);
    enemies.forEach(e => { if (!e.isDead) qtree.insert(e); });

    player.update(gameContext);
    
    enemies.forEach(e => e.update(gameContext));
    powerUps.forEach(p => p.update(gameContext));
    activeVortexes.forEach(v => v.update(gameContext));
    xpOrbPool.forEach(o => { if(o.active) o.update(gameContext); });
    projectilePool.forEach(p => { if(p.active) p.update(gameContext); });
    enemyProjectilePool.forEach(p => { if(p.active) p.update(gameContext); });
    damageNumberPool.forEach(dn => { if(dn.active) dn.update(gameContext); });
    
    camera.update();
    spawnEnemies();
    handleCollisions();
    removeDeadEntities(enemies);
    removeDeadEntities(powerUps);
    removeDeadEntities(activeVortexes);
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    if (screenShake.intensity > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake.intensity, (Math.random() - 0.5) * screenShake.intensity);
        screenShake.duration--;
        if (screenShake.duration <= 0) screenShake.intensity = 0;
    }

    platforms.forEach(p => p.draw(ctx, camera));
    xpOrbPool.forEach(o => { if(o.active) o.draw(ctx, camera); });
    powerUps.forEach(p => p.draw(ctx, camera));
    activeVortexes.forEach(v => v.draw(ctx, camera));
    activeStaticFields.forEach(sf => sf.draw(ctx, camera));
    enemies.forEach(e => e.draw(ctx, camera, player));
    projectilePool.forEach(p => { if(p.active) p.draw(ctx, camera); });
    enemyProjectilePool.forEach(p => { if(p.active) p.draw(ctx, camera); });
    if (player) player.draw(ctx, camera);
    damageNumberPool.forEach(dn => { if(dn.active) dn.draw(ctx, camera); });
    
    ctx.restore();
    updateHUD(player, gameTime, frameCount);
}

function gameLoop(currentTime) {
    requestAnimationFrame(gameLoop);
    if (gameState === 'loading') return;

    if (!lastFrameTime) lastFrameTime = currentTime;
    const deltaTime = (currentTime - lastFrameTime) / 1000.0;
    
    if (gameState === 'playing') {
        updateGame(deltaTime);
        drawGame();
    } else if (gameState === 'menu') {
        if (!demoPlayer) demoPlayer = new DemoPlayer(canvas.width / 2, canvas.height / 2);
        demoPlayer.update();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (demoPlayer) demoPlayer.draw(ctx);
    } else {
        // Para estados pausados, apenas desenha o último quadro, não atualiza
        drawGame();
    }
    
    lastFrameTime = currentTime;
}

window.onload = () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    gameContainer = document.getElementById('game-container');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    particlePool = createPool(Particle, 200);
    projectilePool = createPool(Projectile, 50);
    enemyProjectilePool = createPool(EnemyProjectile, 50);
    xpOrbPool = createPool(XPOrb, 100);
    damageNumberPool = createPool(DamageNumber, 50);

    loadPermanentData();
    SoundManager.init();
    
    const gameController = { setGameState, initGame, getPlayer: () => player, keys, movementVector };
    setupEventListeners(gameController);
    
    setGameState('menu');
    requestAnimationFrame(gameLoop);
    
    const debugStatus = document.getElementById('debug-status');
    debugStatus.style.display = 'none';
};