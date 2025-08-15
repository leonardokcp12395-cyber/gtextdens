import { CONFIG, WAVE_CONFIGS } from './config.js';
import { Quadtree, Rectangle, removeDeadEntities, formatTime } from './systems/utils.js';
import { loadPermanentData, saveScore, savePermanentData } from './systems/save.js';
import SoundManager from './systems/sound.js';
import { createPool, getFromPool, releaseToPool } from './systems/pooling.js';
import { ui, initUI, setupEventListeners, showTemporaryMessage, populateLevelUpOptions, updateHUD } from './systems/ui.js';
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

let gameState = 'loading';
let lastFrameTime = 0;
let gameTime = 0;
let frameCount = 0;
let isMobile, canvas, ctx;
let player, demoPlayer;
let platforms = [], enemies = [], activeVortexes = [], powerUps = [], activeStaticFields = [];
let particlePool, projectilePool, enemyProjectilePool, xpOrbPool, damageNumberPool;
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
let gameContainer;

const camera = {
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
    
    if (['menu', 'paused', 'levelUp', 'gameOver', 'guide', 'rank', 'upgrades', 'characterSelect'].includes(newState)) {
        SoundManager.play('uiClick', 'C6');
    }

    if (newState === 'playing' && (oldState === 'paused' || oldState === 'levelUp')) {
        lastFrameTime = performance.now();
    }

    ui.layer.classList.toggle('active-menu', isMenuState || newState === 'paused');
    ui.hud.classList.toggle('hidden', newState !== 'playing' && newState !== 'paused');
    ui.dashButtonMobile.classList.toggle('hidden', !isMobile || newState !== 'playing');

    Object.values(ui).forEach(element => {
        if (element && element.classList && element.classList.contains('ui-panel')) {
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
        case 'characterSelect': ui.characterSelectScreen.classList.remove('hidden'); break;
        case 'achievements': ui.achievementsScreen.classList.remove('hidden'); break;
    }
}

function initGame(characterId = 'SERAPH') {
    platforms = [];
    const groundLevel = canvas.height * (1 - CONFIG.GROUND_HEIGHT_PERCENT);
    platforms.push(new Platform(-CONFIG.WORLD_BOUNDS.width, groundLevel, CONFIG.WORLD_BOUNDS.width * 2, CONFIG.WORLD_BOUNDS.height));
    const platformCount = 35;
    for (let i = 0; i < platformCount; i++) {
        const pWidth = Math.random() * 150 + 100;
        const pHeight = 20;
        const pX = (Math.random() - 0.5) * (CONFIG.WORLD_BOUNDS.width - pWidth);
        const pY = groundLevel - (Math.random() * 400 + 80);
        platforms.push(new Platform(pX, pY, pWidth, pHeight));
    }

    player = new Player(characterId, gameContext.playerUpgrades);
    player.x = canvas.width / 2;
    player.y = groundLevel - player.radius;

    enemies = [];
    activeVortexes = [];
    powerUps = [];
    activeStaticFields = [];

    gameTime = 0;
    frameCount = 0;
    score = { kills: 0, time: 0 };
    screenShake = { intensity: 0, duration: 0 };
    waveNumber = 0;
    waveEnemiesRemaining = 0;
    waveCooldownTimer = 0;

    startNextWave();
    setGameState('playing');
}

function startNextWave() {
    // ... (logic from Gnomo)
}

function spawnEnemies() {
    // ... (logic from Gnomo)
}

function handleCollisions() {
    // ... (logic from Gnomo)
}

function updateGame(deltaTime) {
    if (!player) return;
    gameTime += deltaTime;
    frameCount++;
    score.time = gameTime;

    const worldBounds = new Rectangle(-CONFIG.WORLD_BOUNDS.width / 2, -CONFIG.WORLD_BOUNDS.height / 2, CONFIG.WORLD_BOUNDS.width, CONFIG.WORLD_BOUNDS.height);
    qtree = new Quadtree(worldBounds, 4);
    enemies.forEach(e => { if (!e.isDead) qtree.insert(e); });

    gameContext.qtree = qtree; // Update qtree in context

    player.update(gameContext);

    [...enemies, ...powerUps, ...activeVortexes, ...activeStaticFields, ...projectilePool, ...enemyProjectilePool, ...damageNumberPool, ...xpOrbPool].forEach(e => e.active && e.update(gameContext));

    camera.update();
    spawnEnemies();
    handleCollisions();

    removeDeadEntities(enemies);
    removeDeadEntities(powerUps);
    removeDeadEntities(activeVortexes);
    removeDeadEntities(activeStaticFields);

    if (screenShake.duration > 0 && --screenShake.duration <= 0) screenShake.intensity = 0;
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    if (screenShake.intensity > 0) ctx.translate((Math.random() - 0.5) * screenShake.intensity, (Math.random() - 0.5) * screenShake.intensity);

    platforms.forEach(p => p.draw(ctx, camera));
    xpOrbPool.forEach(o => { if(o.active) o.draw(ctx, camera); });
    powerUps.forEach(p => p.draw(ctx, camera));
    activeVortexes.forEach(v => v.draw(ctx, camera));
    activeStaticFields.forEach(sf => sf.draw(ctx, camera));
    enemies.forEach(e => e.draw(ctx, camera, player));
    projectilePool.forEach(p => { if(p.active) p.draw(ctx, camera); });
    enemyProjectilePool.forEach(p => { if(p.active) p.draw(ctx, camera); });
    damageNumberPool.forEach(dn => { if(dn.active) dn.draw(ctx, camera); });

    if (player) player.draw(ctx, camera);

    ctx.restore();
    updateHUD(player, gameTime, frameCount);
}

function gameLoop(currentTime) {
    requestAnimationFrame(gameLoop);
    if (!lastFrameTime) lastFrameTime = currentTime;
    const deltaTime = (currentTime - lastFrameTime) / 1000.0;
    lastFrameTime = currentTime;

    if (gameState === 'playing') {
        updateGame(deltaTime);
        drawGame();
    } else if (gameState === 'menu' && demoPlayer) {
        demoPlayer.update();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        demoPlayer.draw(ctx);
    }
}

window.onload = () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    gameContainer = document.getElementById('game-container');
    isMobile = /Mobi|Android/i.test(navigator.userAgent);
    
    initUI();
    const resizeCanvas = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    demoPlayer = new DemoPlayer(canvas.width / 2, canvas.height / 2);

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
        isMobile, keys, movementVector, ui, initGame, get gameState() { return gameState; },
        soundManager: SoundManager,
        canvas,
        camera
    };

    loadPermanentData();
    SoundManager.init();
    setupEventListeners(gameContext);

    setGameState('menu');
    requestAnimationFrame(gameLoop);
    document.getElementById('debug-status').style.display = 'none';
};
