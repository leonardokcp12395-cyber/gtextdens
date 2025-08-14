// js/entities/player.js

import { Entity } from './entity.js';
import { CONFIG, SKILL_DATABASE, PERMANENT_UPGRADES } from '../config.js';
import { playerUpgrades } from '../systems/save.js';
import SoundManager from '../systems/sound.js';
import { getFromPool } from '../systems/pooling.js';
import { Vortex } from './vortex.js';
import { Rectangle } from '../systems/utils.js';
import { StaticField } from './staticfield.js';
import { createSkillHudIcon } from '../systems/ui.js'; // Importa a função

function createLightningBolt(startPos, endPos, particlePool) {
    const dx = endPos.x - startPos.x;
    const dy = endPos.y - startPos.y;
    const dist = Math.hypot(dx, dy);
    const segments = Math.floor(dist / 15);
    for (let i = 0; i < segments; i++) {
        const t = i / segments;
        const x = startPos.x + dx * t + (Math.random() - 0.5) * 15;
        const y = startPos.y + dy * t + (Math.random() - 0.5) * 15;
        getFromPool(particlePool, x, y, '#ADD8E6', 1.5);
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
    }

    update(gameContext) {
        if(this.isDead) return;
        this.handleMovement(gameContext);
        this.applyGravity(gameContext);
        this.updateSkills(gameContext);
        this.animationFrame++;
    }
    
    handleMovement({ keys, movementVector, isMobile }) {
        if (this.isDashing) {
            this.x += this.dashDirection.x * CONFIG.PLAYER_DASH_FORCE;
            this.y += this.dashDirection.y * CONFIG.PLAYER_DASH_FORCE;
            this.dashTimer--;
            if (this.dashTimer <= 0) this.isDashing = false;
            return;
        }

        let dx = 0;
        if (isMobile) {
            dx = movementVector.x;
        } else {
            dx = (keys['d'] || keys['arrowright']) ? 1 : ((keys['a'] || keys['arrowleft']) ? -1 : 0);
        }

        if (dx !== 0) {
            this.lastMoveDirection = { x: dx, y: 0 };
            this.facingRight = dx > 0;
        }
        
        this.x += dx * this.speed;

        const jumpPressed = isMobile ? (movementVector.y < -0.8) : (keys['w'] || keys['arrowup'] || keys[' ']);
        if (jumpPressed && this.jumpsAvailable > 0) {
            this.velocityY = this.onGround ? CONFIG.PLAYER_JUMP_FORCE : CONFIG.PLAYER_DOUBLE_JUMP_FORCE;
            this.jumpsAvailable--;
            this.onGround = false;
            if (!isMobile) keys['w'] = keys['arrowup'] = keys[' '] = false; // Consome o input
        }

        if (!isMobile && keys.shift) { this.dash(); keys.shift = false; }

        if (this.dashCooldown > 0) {
            this.dashCooldown--;
        }
        document.getElementById('dash-button-mobile').classList.toggle('on-cooldown', this.dashCooldown > 0);
    }

    dash() {
        if (this.dashCooldown > 0 || this.isDashing) return;
        this.isDashing = true;
        this.dashTimer = CONFIG.PLAYER_DASH_DURATION;
        this.dashCooldown = CONFIG.PLAYER_DASH_COOLDOWN;
        this.dashDirection = { ...this.lastMoveDirection };
        SoundManager.play('uiClick', 'F5');
    }

    applyGravity({ platforms }) {
        this.velocityY += CONFIG.GRAVITY;
        this.y += this.velocityY;
        this.onGround = false;

        for (const p of platforms) {
            if (this.x + this.radius > p.x && this.x - this.radius < p.x + p.width && 
                this.y + this.radius >= p.y && this.y + this.radius - this.velocityY <= p.y) {
                this.y = p.y - this.radius;
                this.velocityY = 0;
                if (!this.onGround) {
                    this.onGround = true;
                    this.jumpsAvailable = this.skills['double_jump'] ? 2 : 1;
                    this.squashStretchTimer = CONFIG.PLAYER_LANDING_SQUASH_DURATION;
                    SoundManager.play('land', '16n');
                }
                break;
            }
        }
    }

    takeDamage(amount, gameContext) {
        if (this.isDead) return;
        const { screenShake, setGameState, particlePool } = gameContext;

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

    addXp(amount, gameContext) {
        const { setGameState, particlePool } = gameContext;
        this.xp += amount * this.xpModifier;
        SoundManager.play('xp', 'C5');
        if (particlePool) for (let i = 0; i < 2; i++) getFromPool(particlePool, this.x, this.y, 'cyan', 2);
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
        
        if (skillData.instant) {
            if (skillId === 'heal') this.health = Math.min(this.maxHealth, this.health + this.maxHealth * 0.25);
            if (skillId === 'black_hole') {
                SoundManager.play('nuke', '8n');
                screenShake.intensity = 15; screenShake.duration = 30;
                enemies.forEach(e => e.takeDamage(99999, gameContext));
                showTemporaryMessage("BURACO NEGRO!", "gold");
            }
            return;
        }

        if (!this.skills[skillId]) {
            this.skills[skillId] = { level: 1, timer: 0, orbs: [] };
        } else {
            this.skills[skillId].level++;
        }
        
        // CORREÇÃO: Chama a função para criar ou atualizar o ícone no HUD
        createSkillHudIcon(skillId, this.skills[skillId].level);
    }
    
    findNearestEnemy(qtree) {
        let nearest = null;
        let nearestDistSq = Infinity;
        const searchRadius = 1000;
        const searchArea = new Rectangle(this.x - searchRadius, this.y - searchRadius, searchRadius * 2, searchRadius * 2);
        const candidates = qtree.query(searchArea);
        for (const enemy of candidates) {
            if(enemy.isDead) continue;
            const distSq = (this.x - enemy.x)**2 + (this.y - enemy.y)**2;
            if (distSq < nearestDistSq) {
                nearestDistSq = distSq;
                nearest = enemy;
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

            if (skillData.cooldown > 0 && skillState.timer > 0) {
                skillState.timer--;
            }

            if (skillState.timer <= 0) {
                if (skillData.type === 'projectile') {
                    const target = this.findNearestEnemy(qtree);
                    if (target) {
                        if (skillId === 'divine_lance') {
                            const angle = Math.atan2(target.y - this.y, target.x - this.x);
                            for (let i = 0; i < levelData.count; i++) {
                                const spread = (i - (levelData.count - 1) / 2) * 0.1;
                                getFromPool(playerProjectiles, this.x, this.y, angle + spread, { ...levelData, damage: levelData.damage * this.damageModifier });
                            }
                        } else if (skillId === 'chain_lightning') {
                            let currentTarget = target;
                            let lastPos = {x: this.x, y: this.y};
                            let targetsHit = new Set([currentTarget]);
                            for(let i=0; i <= levelData.chains; i++) {
                                if (!currentTarget) break;
                                currentTarget.takeDamage(levelData.damage * this.damageModifier, gameContext);
                                createLightningBolt(lastPos, currentTarget, particlePool);
                                lastPos = {x: currentTarget.x, y: currentTarget.y};
                                currentTarget = enemies.filter(e => !e.isDead && !targetsHit.has(e) && Math.hypot(lastPos.x - e.x, lastPos.y - e.y) < levelData.chainRadius)
                                                      .sort((a,b) => Math.hypot(lastPos.x - a.x, lastPos.y - a.y) - Math.hypot(lastPos.x - b.x, lastPos.y - b.y))[0];
                                if(currentTarget) targetsHit.add(currentTarget);
                            }
                        }
                        skillState.timer = skillData.cooldown;
                    }
                } else if (skillData.type === 'aura') {
                    if(skillId === 'vortex') activeVortexes.push(new Vortex(this.x, this.y, { ...levelData, damage: levelData.damage * this.damageModifier }));
                    if(skillId === 'static_field') staticFields.push(new StaticField(this.x, this.y, levelData));
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
                    if (enemy.isDead) return;
                    if (frameCount - orb.lastHitFrame > CONFIG.ORB_HIT_COOLDOWN_FRAMES && enemy.orbHitCooldown <= 0) {
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
    }
}