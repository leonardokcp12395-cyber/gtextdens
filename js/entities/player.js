// js/entities/player.js

import { Entity } from './entity.js';
import { CONFIG, SKILL_DATABASE, PERMANENT_UPGRADES } from '../config.js';
import { playerUpgrades } from '../systems/save.js';
import SoundManager from '../systems/sound.js';
import { getFromPool } from '../systems/pooling.js';
import { Vortex } from './vortex.js';
import { Rectangle } from '../systems/utils.js';
import { StaticField } from './staticfield.js';
import { createSkillHudIcon } from '../systems/ui.js';

// =======================================================================
// CORREÇÃO 1: Habilidade "Relâmpago em Cadeia" Implementada
// A função createLightningBolt foi criada para dar vida à habilidade.
// =======================================================================
function createLightningBolt(gameContext, source, initialTarget, levelData) {
    const { enemies, particlePool } = gameContext;
    let currentTarget = initialTarget;
    let targetsHit = new Set([currentTarget]);
    let lastPosition = { x: source.x, y: source.y };

    // Função para criar o efeito visual do raio
    const createBoltEffect = (start, end) => {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const dist = Math.hypot(dx, dy);
        const segments = Math.floor(dist / 10);
        for (let i = 0; i < segments; i++) {
            const t = i / segments;
            const x = start.x + dx * t + (Math.random() - 0.5) * 15;
            const y = start.y + dy * t + (Math.random() - 0.5) * 15;
            getFromPool(particlePool, x, y, '#ADD8E6', 1.8);
        }
    };

    for (let i = 0; i <= levelData.chains; i++) {
        if (!currentTarget) break;

        // Aplica dano e cria o efeito visual
        currentTarget.takeDamage(levelData.damage * source.damageModifier, gameContext);
        createBoltEffect(lastPosition, currentTarget);

        lastPosition = { x: currentTarget.x, y: currentTarget.y };
        let nextTarget = null;
        let nearestDistSq = Infinity;

        // Encontra o próximo alvo mais próximo que ainda não foi atingido
        for (const enemy of enemies) {
            if (!targetsHit.has(enemy) && !enemy.isDead) {
                const distSq = (currentTarget.x - enemy.x)**2 + (currentTarget.y - enemy.y)**2;
                if (distSq < levelData.chainRadius * levelData.chainRadius && distSq < nearestDistSq) {
                    nearestDistSq = distSq;
                    nextTarget = enemy;
                }
            }
        }
        
        currentTarget = nextTarget;
        if (currentTarget) targetsHit.add(currentTarget);
    }
}


export class Player extends Entity {
    constructor(x, y, canvas) {
        super(x, y, 15);
        const healthUpgradeLevel = playerUpgrades.max_health || 0;
        const damageUpgradeLevel = playerUpgrades.damage_boost || 0;
        const xpUpgradeLevel = playerUpgrades.xp_gain || 0;

        this.baseHealth = CONFIG.PLAYER_HEALTH + (healthUpgradeLevel > 0 ? PERMANENT_UPGRADES.max_health.levels[healthUpgradeLevel - 1].effect : 0);
        this.damageModifier = 1 + (damageUpgradeLevel > 0 ? PERMANENT_UPGRADES.damage_boost.levels[damageUpgradeLevel - 1].effect : 0);
        this.xpModifier = 1 + (xpUpgradeLevel > 0 ? PERMANENT_UPGRADES.xp_gain.levels[xpUpgradeLevel - 1].effect : 0);
        
        this.maxHealth = this.baseHealth;
        this.health = this.maxHealth;
        this.speed = CONFIG.PLAYER_SPEED;
        this.xp = 0;
        this.level = 1;
        this.xpToNextLevel = CONFIG.XP_TO_NEXT_LEVEL_BASE;
        this.skills = {};
        this.collectRadius = CONFIG.XP_ORB_ATTRACTION_RADIUS;
        this.facingRight = true;
        this.hitTimer = 0;
        this.animationFrame = 0;
        this.velocityY = 0;
        this.onGround = true;
        this.jumpsAvailable = 1;
        this.isDashing = false;
        this.dashTimer = 0;
        this.dashCooldown = 0;
        this.lastMoveDirection = { x: 1, y: 0 };
        this.squashStretchTimer = 0;
        this.shielded = false;
        this.shieldTimer = 0;
        this.x = x;
        this.y = y;
    }

    update(gameContext) {
        if(this.isDead) return;
        this.handleMovement(gameContext);
        this.applyGravity(gameContext);
        this.updateSkills(gameContext);

        if (this.skills['health_regen']) {
            const regenLevel = this.skills['health_regen'].level -1;
            const regenData = SKILL_DATABASE['health_regen'].levels[regenLevel];
            this.health = Math.min(this.maxHealth, this.health + regenData.regenPerSecond / 60);
        }

        if (this.shieldTimer > 0) {
            this.shieldTimer--;
        } else {
            this.shielded = false;
        }
    }
    
    handleMovement({ keys, movementVector, isMobile, ui }) {
        if (this.isDashing) {
            this.x += this.dashDirection.x * CONFIG.PLAYER_DASH_FORCE;
            this.y += this.dashDirection.y * CONFIG.PLAYER_DASH_FORCE;
            if (--this.dashTimer <= 0) this.isDashing = false;
            return;
        }
        let dx = 0, dy_input = 0;
        if (isMobile) { dx = movementVector.x; dy_input = movementVector.y; }
        else {
            dx = (keys['d'] || keys['arrowright']) ? 1 : ((keys['a'] || keys['arrowleft']) ? -1 : 0);
            dy_input = (keys['s'] || keys['arrowdown']) ? 1 : ((keys['w'] || keys['arrowup']) ? -1 : 0);
        }

        if (dx !== 0 || dy_input !== 0) {
            const mag = Math.hypot(dx, dy_input);
            this.lastMoveDirection = { x: dx / mag, y: dy_input / mag };
        }
        if (dx !== 0) this.facingRight = dx > 0;
        
        this.x += dx * this.speed;

        const jumpPressed = isMobile ? (movementVector.y < -0.7) : (keys['w'] || keys['arrowup'] || keys[' ']);
        if (jumpPressed && this.jumpsAvailable > 0) {
            const isFirstJump = this.onGround || this.jumpsAvailable === (this.skills['double_jump'] ? 2 : 1);
            this.velocityY = isFirstJump ? CONFIG.PLAYER_JUMP_FORCE : CONFIG.PLAYER_DOUBLE_JUMP_FORCE;
            this.jumpsAvailable--;
            this.onGround = false;
            if (!isMobile) keys['w'] = keys['arrowup'] = keys[' '] = false;
        }

        if (!isMobile && (keys.shift || keys.shiftleft)) { this.dash(); keys.shift = keys.shiftleft = false; }
        if (this.dashCooldown > 0) this.dashCooldown--;
        if (isMobile) ui.dashButtonMobile.classList.toggle('on-cooldown', this.dashCooldown > 0);
    }

    dash() {
        if (this.dashCooldown > 0 || this.isDashing) return;
        this.isDashing = true;
        this.dashTimer = CONFIG.PLAYER_DASH_DURATION;
        this.dashCooldown = CONFIG.PLAYER_DASH_COOLDOWN;
        this.dashDirection = { ...this.lastMoveDirection };
        if (this.dashDirection.x === 0 && this.dashDirection.y === 0) this.dashDirection.x = this.facingRight ? 1 : -1;
        SoundManager.play('uiClick', 'F5');
    }

    applyGravity({ platforms, setGameState }) {
        const wasOnGround = this.onGround;
        this.velocityY += CONFIG.GRAVITY;
        this.y += this.velocityY;
        this.onGround = false;

        for (const p of platforms) {
            if (this.x + this.radius > p.x && this.x - this.radius < p.x + p.width && (this.y - this.velocityY) <= p.y - this.radius && this.y >= p.y - this.radius) {
                this.y = p.y - this.radius; this.velocityY = 0; this.onGround = true;
                if (!wasOnGround) {
                    // =======================================================================
                    // CORREÇÃO 4: Lógica do "Salto Duplo" corrigida e movida para aqui
                    // Isto garante que os saltos são sempre resetados corretamente ao aterrar.
                    // =======================================================================
                    this.jumpsAvailable = this.skills['double_jump'] ? 2 : 1;
                    this.squashStretchTimer = CONFIG.PLAYER_LANDING_SQUASH_DURATION;
                    SoundManager.play('land', '16n');
                }
                return;
            }
        }
        if (this.y > platforms[0].y + 200) this.takeDamage(9999, { setGameState });
    }

    takeDamage(amount, { screenShake, setGameState, particlePool }) {
        if (this.isDead) return;
        if (this.shielded) {
            this.shielded = false;
            // =======================================================================
            // MELHORIA 4: Feedback visual do escudo a quebrar-se
            // =======================================================================
            for (let i = 0; i < 20; i++) {
                getFromPool(particlePool, this.x, this.y, 'cyan', 3);
            }
            SoundManager.play('lance', 'C3'); // Som de quebra
            return;
        }
        this.health -= amount; this.hitTimer = 30;
        SoundManager.play('damage', '8n');
        screenShake.intensity = 5; screenShake.duration = 15;
        if (this.health <= 0) {
            this.health = 0; this.isDead = true;
            setGameState('gameOver');
        }
    }

    addXp(amount, { setGameState }) {
        this.xp += amount * this.xpModifier;
        SoundManager.play('xp', 'C5');
        while (this.xp >= this.xpToNextLevel) {
            this.level++;
            this.xp -= this.xpToNextLevel;
            this.xpToNextLevel = Math.floor(this.xpToNextLevel * CONFIG.XP_TO_NEXT_LEVEL_MULTIPLIER);
            SoundManager.play('levelUp', ['C6', 'E6', 'G6']);
            setGameState('levelUp');
        }
    }
    
    addSkill(skillId, gameContext) {
        const skillData = SKILL_DATABASE[skillId];
        if (skillData.instant) {
            if (skillId === 'heal') this.health = Math.min(this.maxHealth, this.health + this.maxHealth * 0.25);
            else if (skillId === 'black_hole') {
                SoundManager.play('nuke', '8n');
                gameContext.screenShake.intensity = 15; gameContext.screenShake.duration = 30;
                gameContext.enemies.forEach(e => e.takeDamage(99999, gameContext));
                gameContext.showTemporaryMessage("BURACO NEGRO!", "gold");
            }
            return;
        }

        if (!this.skills[skillId]) {
            this.skills[skillId] = { level: 1, timer: 0, orbs: [] };
        } else {
            this.skills[skillId].level++;
        }

        createSkillHudIcon(skillId, this.skills[skillId].level);

        if (skillId === 'magnet') {
            const levelData = skillData.levels[this.skills[skillId].level - 1];
            this.collectRadius = CONFIG.XP_ORB_ATTRACTION_RADIUS * (1 + levelData.collectRadiusBonus);
        }
    }
    
    findNearestEnemy({ qtree }) {
        if (!qtree) return null;
        let nearest = null; let nearestDistSq = Infinity;
        const searchRadius = 2000;
        const searchArea = new Rectangle(this.x - searchRadius, this.y - searchRadius, searchRadius * 2, searchRadius * 2);
        const candidates = qtree.query(searchArea);
        for (const enemy of candidates) {
            if (enemy.isDead) continue;
            const distSq = (this.x - enemy.x)**2 + (this.y - enemy.y)**2;
            if (distSq < nearestDistSq) {
                nearestDistSq = distSq; nearest = enemy;
            }
        }
        return nearest;
    }

    updateSkills(gameContext) {
        const { qtree, frameCount, playerProjectiles, activeVortexes, staticFields, particlePool, enemies } = gameContext;
        for (const skillId in this.skills) {
            const skillState = this.skills[skillId];
            const skillData = SKILL_DATABASE[skillId];
            if (skillState.level > skillData.levels.length) continue;
            const levelData = skillData.levels[skillState.level - 1];

            if (skillData.cooldown > 0 && skillState.timer > 0) skillState.timer--;
            
            if (skillState.timer <= 0) {
                 if (skillData.type === 'projectile') {
                    const target = this.findNearestEnemy(gameContext);
                    if (target) {
                        if (skillId === 'divine_lance') {
                            const angle = Math.atan2(target.y - this.y, target.x - this.x);
                            for (let i = 0; i < levelData.count; i++) {
                                const spread = (i - (levelData.count - 1) / 2) * 0.1;
                                getFromPool(playerProjectiles, this.x, this.y, angle + spread, { ...levelData, damage: levelData.damage * this.damageModifier });
                            }
                        } else if (skillId === 'chain_lightning') {
                            createLightningBolt(gameContext, this, target, levelData);
                        }
                        skillState.timer = skillData.cooldown;
                    }
                } else if (skillData.type === 'aura') {
                    if(skillId === 'vortex') activeVortexes.push(new Vortex(this.x, this.y, { ...levelData, damage: levelData.damage * this.damageModifier }));
                    if(skillId === 'static_field') staticFields.push(new StaticField(this.x, this.y, levelData));
                    // =======================================================================
                    // CORREÇÃO 2: Habilidade "Explosão de Partículas" Implementada
                    // =======================================================================
                    else if (skillId === 'particle_burst') {
                        SoundManager.play('particleBurst', '8n');
                        for (let i = 0; i < levelData.particleCount; i++) {
                            getFromPool(particlePool, this.x, this.y, 'magenta', 3);
                        }
                        enemies.forEach(enemy => {
                            if (Math.hypot(this.x - enemy.x, this.y - enemy.y) < levelData.radius) {
                                enemy.takeDamage(levelData.damage * this.damageModifier, gameContext);
                                enemy.applyKnockback(this.x, this.y, CONFIG.ENEMY_KNOCKBACK_FORCE * 1.5);
                            }
                        });
                    }
                    skillState.timer = skillData.cooldown;
                } else if (skillId === 'aegis_shield') {
                    this.shielded = true;
                    this.shieldTimer = levelData.duration;
                    skillState.timer = skillData.cooldown;
                }
            }
        }
        
        if (this.skills['orbital_shield']) {
            const skillState = this.skills['orbital_shield'];
            const levelData = SKILL_DATABASE['orbital_shield'].levels[skillState.level - 1];
            if (skillState.orbs.length !== levelData.count) {
                skillState.orbs = Array.from({ length: levelData.count }, (_, i) => ({ angle: (Math.PI * 2 / levelData.count) * i, lastHitFrame: 0 }));
            }
            const searchRadius = levelData.radius + 50;
            const searchArea = new Rectangle(this.x - searchRadius, this.y - searchRadius, searchRadius * 2, searchRadius * 2);
            const nearbyEnemies = qtree.query(searchArea);
            skillState.orbs.forEach(orb => {
                orb.angle += levelData.speed;
                const orbX = this.x + Math.cos(orb.angle) * levelData.radius;
                const orbY = this.y + Math.sin(orb.angle) * levelData.radius;
                nearbyEnemies.forEach(enemy => {
                    if (!enemy.isDead && frameCount - orb.lastHitFrame > CONFIG.ORB_HIT_COOLDOWN_FRAMES && enemy.orbHitCooldown <= 0) {
                         if (Math.hypot(orbX - enemy.x, orbY - enemy.y) < 10 + enemy.radius) {
                            enemy.takeDamage(levelData.damage * this.damageModifier, gameContext);
                            enemy.applyKnockback(orbX, orbY, CONFIG.ENEMY_KNOCKBACK_FORCE * 0.5);
                            orb.lastHitFrame = frameCount;
                            enemy.orbHitCooldown = CONFIG.ORB_HIT_COOLDOWN_FRAMES;
                        }
                    }
                });
            });
        }
    }

    draw(ctx, camera) {
        ctx.save();
        ctx.translate((this.x - camera.x) | 0, (this.y - camera.y) | 0);
        let scaleX = 1, scaleY = 1;
        if (this.squashStretchTimer > 0) {
            const p = this.squashStretchTimer / CONFIG.PLAYER_LANDING_SQUASH_DURATION;
            scaleY = 1 - (0.3 * Math.sin(Math.PI * p));
            scaleX = 1 + (0.3 * Math.sin(Math.PI * p));
            this.squashStretchTimer--;
        }
        ctx.scale(this.facingRight ? scaleX : -scaleX, scaleY);
        ctx.fillStyle = this.hitTimer > 0 ? 'red' : 'white';
        if(this.hitTimer > 0) this.hitTimer--;
        ctx.strokeStyle = 'cyan';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -this.radius * 1.5); ctx.lineTo(this.radius * 1.2, this.radius * 0.8); ctx.lineTo(-this.radius * 1.2, this.radius * 0.8);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(this.radius * 0.8, -this.radius * 0.5); ctx.quadraticCurveTo(this.radius * 2, -this.radius * 1.5, this.radius * 1.5, this.radius * 0.5); ctx.lineTo(this.radius * 0.8, this.radius * 0.8);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-this.radius * 0.8, -this.radius * 0.5); ctx.quadraticCurveTo(-this.radius * 2, -this.radius * 1.5, -this.radius * 1.5, this.radius * 0.5); ctx.lineTo(-this.radius * 0.8, this.radius * 0.8);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        if (this.shielded) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 255, 255, ${0.5 + 0.5 * Math.sin(this.animationFrame * 0.1)})`;
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        ctx.restore();
        this.animationFrame++;
    }
}