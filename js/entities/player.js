// js/entities/player.js

import { Entity } from './entity.js';
import { CONFIG, SKILL_DATABASE, PERMANENT_UPGRADES } from '../config.js';
import { playerUpgrades } from '../systems/save.js';
import SoundManager from '../systems/sound.js';
import { getFromPool } from '../systems/pooling.js';
import { Vortex } from './vortex.js';
import { Rectangle } from '../systems/utils.js';
import { StaticField } from './staticfield.js';

function createLightningBolt(startPos, endPos, particlePool) {
    const dx = endPos.x - startPos.x;
    const dy = endPos.y - startPos.y;
    const dist = Math.hypot(dx, dy);
    const segments = Math.floor(dist / 10);
    for (let i = 0; i < segments; i++) {
        const t = i / segments;
        const x = startPos.x + dx * t + (Math.random() - 0.5) * 10;
        const y = startPos.y + dy * t + (Math.random() - 0.5) * 10;
        getFromPool(particlePool, x, y, '#ADD8E6', 1.5);
    }
}

export class Player extends Entity {
    constructor(x, y, canvas) {
        super(x, y, 15);

        const healthUpgradeLevel = playerUpgrades.max_health;
        const damageUpgradeLevel = playerUpgrades.damage_boost;
        const xpUpgradeLevel = playerUpgrades.xp_gain;

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
        
        this.x = canvas.width / 2;
        this.y = canvas.height * (1 - CONFIG.GROUND_HEIGHT_PERCENT) - this.radius;
    }

    update({ keys, movementVector, isMobile, platforms, qtree, frameCount, ...gameContext }) {
        this.handleMovement(keys, movementVector, isMobile, gameContext.ui);
        this.applyGravity(platforms, gameContext); // CORREÇÃO: Passando o gameContext
        this.updateSkills({ qtree, frameCount, ...gameContext });
    }
    
    handleMovement(keys, movementVector, isMobile, ui) {
        if (this.isDashing) {
            this.x += this.dashDirection.x * CONFIG.PLAYER_DASH_FORCE;
            this.y += this.dashDirection.y * CONFIG.PLAYER_DASH_FORCE;
            this.dashTimer--;
            if (this.dashTimer <= 0) this.isDashing = false;
            return;
        }

        let dx = 0; let dy_input = 0;
        
        if (isMobile) {
            dx = movementVector.x;
            dy_input = movementVector.y;
        } else {
            dx = (keys['d'] || keys['ArrowRight']) ? 1 : ((keys['a'] || keys['ArrowLeft']) ? -1 : 0);
            dy_input = (keys['s'] || keys['ArrowDown']) ? 1 : ((keys['w'] || keys['ArrowUp']) ? -1 : 0);
        }

        if (dx !== 0 || dy_input !== 0) {
            const magnitude = Math.hypot(dx, dy_input);
            this.lastMoveDirection = { x: dx / magnitude, y: dy_input / magnitude };
        }
        if (dx !== 0) this.facingRight = dx > 0;
        
        this.x += dx * this.speed;

        const jumpPressed = isMobile ? (movementVector.y < -0.5) : (keys['w'] || keys['ArrowUp'] || keys[' ']);
        if (jumpPressed && this.jumpsAvailable > 0) {
            const isFirstJump = this.onGround || this.jumpsAvailable === (this.skills['double_jump'] ? 2 : 1);
            this.velocityY = isFirstJump ? CONFIG.PLAYER_JUMP_FORCE : CONFIG.PLAYER_DOUBLE_JUMP_FORCE;
            this.jumpsAvailable--;
            this.onGround = false;
            if (!isMobile) keys['w'] = keys['ArrowUp'] = keys[' '] = false;
        }

        if (!isMobile && keys['shift']) { this.dash(); keys['shift'] = false; }

        if (this.dashCooldown > 0) {
            this.dashCooldown--;
            if (isMobile) ui.dashButtonMobile.classList.add('on-cooldown');
        } else {
            if (isMobile) ui.dashButtonMobile.classList.remove('on-cooldown');
        }
    }

    dash() {
        if (this.dashCooldown > 0 || this.isDashing) return;
        this.isDashing = true;
        this.dashTimer = CONFIG.PLAYER_DASH_DURATION;
        this.dashCooldown = CONFIG.PLAYER_DASH_COOLDOWN;
        this.dashDirection = { ...this.lastMoveDirection };
        if (this.dashDirection.x === 0 && this.dashDirection.y === 0) {
            this.dashDirection.x = this.facingRight ? 1 : -1;
        }
        SoundManager.play('uiClick', 'F5');
    }

    applyGravity(platforms, gameContext) { // CORREÇÃO: Recebendo o gameContext
        const wasOnGround = this.onGround;
        this.velocityY += CONFIG.GRAVITY;
        this.y += this.velocityY;
        this.onGround = false;

        for (const p of platforms) {
            if (this.x > p.x && this.x < p.x + p.width &&
                (this.y - this.velocityY) <= p.y - this.radius &&
                this.y >= p.y - this.radius) {
                this.y = p.y - this.radius;
                this.velocityY = 0;
                this.onGround = true;
                if (!wasOnGround) {
                    this.jumpsAvailable = (this.skills['double_jump'] ? 2 : 1);
                    this.squashStretchTimer = CONFIG.PLAYER_LANDING_SQUASH_DURATION;
                    SoundManager.play('land', '16n');
                }
                break;
            }
        }
        
        if (platforms.length > 0) {
            const groundPlatform = platforms[0];
            const groundTopY = groundPlatform.y;
            if (this.y > groundTopY - this.radius) {
                this.y = groundTopY - this.radius;
                if (this.velocityY > 0) this.velocityY = 0;
                if (!this.onGround) {
                   this.onGround = true;
                   this.jumpsAvailable = (this.skills['double_jump'] ? 2 : 1);
                }
            }
            if (this.y > groundTopY + 200) { 
                this.takeDamage(9999, gameContext); // CORREÇÃO: Passando o gameContext
            }
        }
    }

    takeDamage(amount, { screenShake, setGameState, particlePool }) {
        if (this.shielded) {
            this.shielded = false;
            if (particlePool) for(let i=0; i<15; i++) getFromPool(particlePool, this.x, this.y, 'cyan', 3);
            return;
        }
        this.health -= amount;
        this.hitTimer = 30;
        SoundManager.play('damage', '8n');
        screenShake.intensity = 5;
        screenShake.duration = 15;
        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
            setGameState('gameOver');
        }
    }

    addXp(amount, { setGameState, particlePool }) {
        this.xp += amount * this.xpModifier;
        SoundManager.play('xp', 'C5');
        if (particlePool) for (let i = 0; i < 2; i++) {
            getFromPool(particlePool, this.x, this.y, 'cyan', 2);
        }

        while (this.xp >= this.xpToNextLevel) {
            this.level++;
            this.xp -= this.xpToNextLevel;
            this.xpToNextLevel = Math.floor(this.xpToNextLevel * CONFIG.XP_TO_NEXT_LEVEL_MULTIPLIER);
            SoundManager.play('levelUp', ['C6', 'E6', 'G6']);
            setGameState('levelUp');
        }
    }
    
    addSkill(skillId, gameContext) {
        const { showTemporaryMessage, enemies, screenShake } = gameContext;
        const skillData = SKILL_DATABASE[skillId];

        if (skillData.type === 'utility' && skillData.instant) {
            if (skillId === 'heal') this.health = Math.min(this.maxHealth, this.health + this.maxHealth * 0.25);
            if (skillId === 'black_hole') {
                SoundManager.play('nuke', '8n');
                screenShake.intensity = 15;
                screenShake.duration = 30;
                enemies.forEach(e => e.takeDamage(99999, gameContext));
                showTemporaryMessage("BURACO NEGRO!", "gold");
            }
            return;
        }
        
        if (!this.skills[skillId]) {
            this.skills[skillId] = { level: 1, timer: 0, hudElement: null };
            if (skillData.type === 'orbital') {
                this.skills[skillId].orbs = Array.from({ length: skillData.levels[0].count }, (_, i) => ({ angle: (Math.PI * 2 / skillData.levels[0].count) * i, lastHitFrame: 0 }));
            }
        } else {
            this.skills[skillId].level++;
        }
    }
    
    findNearestEnemy(qtree) {
        let nearest = null;
        let nearestDistSq = Infinity;
        const searchRadius = 2000;
        const searchArea = new Rectangle(this.x - searchRadius, this.y - searchRadius, searchRadius * 2, searchRadius * 2);
        const candidates = qtree.query(searchArea);
        for (const enemy of candidates) {
            const distSq = (this.x - enemy.x)**2 + (this.y - enemy.y)**2;
            if (distSq < nearestDistSq) {
                nearestDistSq = distSq;
                nearest = enemy;
            }
        }
        return nearest;
    }

    updateSkills({ qtree, frameCount, projectilePool, activeVortexes, activeStaticFields, particlePool, enemies, gameContext }) {
        for (const skillId in this.skills) {
            const skillState = this.skills[skillId];
            const skillData = SKILL_DATABASE[skillId];
            if (skillState.level > skillData.levels.length) continue;
            const levelData = skillData.levels[skillState.level - 1];

            if (skillData.cooldown > 0) {
                if (skillState.timer > 0) skillState.timer--;
                if (skillState.timer > 0) continue;
            }

            if (skillData.type === 'projectile') {
                if (skillId === 'divine_lance') {
                    const target = this.findNearestEnemy(qtree);
                    if (target) {
                        const angle = Math.atan2(target.y - this.y, target.x - this.x);
                        for (let i = 0; i < levelData.count; i++) {
                            const spread = (i - (levelData.count - 1) / 2) * 0.1;
                            getFromPool(projectilePool, this.x, this.y, angle + spread, { ...levelData, damage: levelData.damage * this.damageModifier });
                        }
                        SoundManager.play('lance', 'C4');
                        skillState.timer = skillData.cooldown;
                    }
                } else if (skillId === 'chain_lightning') {
                    const target = this.findNearestEnemy(qtree);
                    if (target) {
                        SoundManager.play('lance', 'A5');
                        // Lógica de dano e efeito visual
                        let currentTarget = target;
                        let targetsHit = new Set([currentTarget]);
                        for(let i = 0; i < levelData.chains; i++) {
                            if (!currentTarget) break;
                            currentTarget.takeDamage(levelData.damage * this.damageModifier, gameContext);
                            // ... (lógica de encontrar próximo alvo)
                        }
                        createLightningBolt({x: this.x, y: this.y}, target, particlePool);
                        skillState.timer = skillData.cooldown;
                    }
                }
            } else if (skillData.type === 'aura') {
                if (skillId === 'vortex') {
                    activeVortexes.push(new Vortex(this.x, this.y, { ...levelData, damage: levelData.damage * this.damageModifier }));
                } else if (skillId === 'static_field') {
                    activeStaticFields.push(new StaticField(this.x, this.y, levelData));
                }
                skillState.timer = skillData.cooldown;
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
                    if (enemy.isDead) return;
                    if (frameCount - orb.lastHitFrame > CONFIG.ORB_HIT_COOLDOWN_FRAMES && enemy.orbHitCooldown <= 0) {
                         if (Math.hypot(orbX - enemy.x, orbY - enemy.y) < 10 + enemy.radius) {
                            // CORREÇÃO: Passando o gameContext completo
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
            const progress = this.squashStretchTimer / CONFIG.PLAYER_LANDING_SQUASH_DURATION;
            scaleY = 1 - (0.3 * Math.sin(Math.PI * progress));
            scaleX = 1 + (0.3 * Math.sin(Math.PI * progress));
            this.squashStretchTimer--;
        }
        ctx.scale(this.facingRight ? scaleX : -scaleX, scaleY);

        ctx.fillStyle = this.hitTimer > 0 ? 'red' : 'white';
        if(this.hitTimer > 0) this.hitTimer--;

        ctx.strokeStyle = 'cyan';
        ctx.lineWidth = 2;

        // Corpo
        ctx.beginPath();
        ctx.moveTo(0, -this.radius * 1.5); ctx.lineTo(this.radius * 1.2, this.radius * 0.8); ctx.lineTo(-this.radius * 1.2, this.radius * 0.8);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Asas
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