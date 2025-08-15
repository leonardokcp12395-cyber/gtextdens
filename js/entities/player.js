import { Entity } from './entity.js';
import { CONFIG, SKILL_DATABASE, CHARACTER_DATABASE, PERMANENT_UPGRADES, EVOLUTION_DATABASE } from '../config.js';
import { Vortex } from './vortex.js';
import { StaticField } from './staticfield.js';
import { getFromPool } from '../systems/pooling.js';
// import SoundManager from '../systems/sound.js'; // Will be passed in gameContext
// import particleManager from '../systems/particleManager.js'; // Will be passed in gameContext

export class Player extends Entity {
    constructor(characterId = 'SERAPH', playerUpgrades = {}) {
        super(0, 0, 15);
        const characterData = CHARACTER_DATABASE[characterId];

        const healthUpgradeLevel = playerUpgrades.max_health || 0;
        const damageUpgradeLevel = playerUpgrades.damage_boost || 0;
        const xpUpgradeLevel = playerUpgrades.xp_gain || 0;

        this.baseHealth = characterData.baseHealth + (healthUpgradeLevel > 0 ? PERMANENT_UPGRADES.max_health.levels[healthUpgradeLevel - 1].effect : 0);
        this.damageModifier = 1 + (damageUpgradeLevel > 0 ? PERMANENT_UPGRADES.damage_boost.levels[damageUpgradeLevel - 1].effect : 0);
        this.xpModifier = 1 + (xpUpgradeLevel > 0 ? PERMANENT_UPGRADES.xp_gain.levels[xpUpgradeLevel - 1].effect : 0);

        this.maxHealth = this.baseHealth;
        this.health = this.maxHealth;
        this.speed = characterData.speed;
        this.xp = 0;
        this.level = 1;
        this.xpToNextLevel = CONFIG.XP_TO_NEXT_LEVEL_BASE;
        this.skills = {};
        this.collectRadius = CONFIG.XP_ORB_ATTRACTION_RADIUS;
        this.facingRight = true;
        this.hitTimer = 0;
        this.animationFrame = 0;
        this.velocityY = 0;
        this.onGround = false;
        this.jumpsAvailable = 1;
        this.isDashing = false;
        this.dashTimer = 0;
        this.dashCooldown = 0;
        this.lastMoveDirection = { x: 1, y: 0 };
        this.squashStretchTimer = 0;
        this.shielded = false;
        this.shieldTimer = 0;
        this.invincibilityTimer = 0;
        this.knockbackVelocity = { x: 0, y: 0 };
    }

    draw(ctx, camera) {
        if (this.invincibilityTimer > 0 && this.animationFrame % 8 < 4) {
            this.animationFrame++;
            return;
        }

        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);

        let scaleX = 1;
        let scaleY = 1;
        if (this.squashStretchTimer > 0) {
            const progress = this.squashStretchTimer / CONFIG.PLAYER_LANDING_SQUASH_DURATION;
            scaleY = 1 - (0.3 * Math.sin(Math.PI * progress));
            scaleX = 1 + (0.3 * Math.sin(Math.PI * progress));
            this.squashStretchTimer--;
        }
        ctx.scale(this.facingRight ? scaleX : -scaleX, scaleY);

        ctx.fillStyle = this.hitTimer > 0 ? 'red' : 'white';
        if (this.hitTimer > 0) this.hitTimer--;

        ctx.beginPath();
        ctx.moveTo(0, -this.radius * 1.5);
        ctx.lineTo(this.radius * 1.2, this.radius * 0.8);
        ctx.lineTo(-this.radius * 1.2, this.radius * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'cyan';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#00FFFF';
        ctx.beginPath();
        ctx.moveTo(0, -this.radius * 0.5);
        ctx.lineTo(this.radius * 0.4, this.radius * 0.2);
        ctx.lineTo(-this.radius * 0.4, this.radius * 0.2);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(this.radius * 0.8, -this.radius * 0.5);
        ctx.quadraticCurveTo(this.radius * 2, -this.radius * 1.5, this.radius * 1.5, this.radius * 0.5);
        ctx.lineTo(this.radius * 0.8, this.radius * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-this.radius * 0.8, -this.radius * 0.5);
        ctx.quadraticCurveTo(-this.radius * 2, -this.radius * 1.5, -this.radius * 1.5, this.radius * 0.5);
        ctx.lineTo(-this.radius * 0.8, this.radius * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

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

    update(gameContext) {
        if (this.invincibilityTimer > 0) {
            this.invincibilityTimer--;
        }

        this.handleMovement(gameContext);
        this.applyGravity(gameContext);
        this.updateSkills(gameContext);

        if (gameContext.platforms.length > 0 && this.y > gameContext.platforms[0].y + 400) {
            this.takeDamage(9999, null, gameContext);
        }

        if (this.skills['health_regen']) {
            const regenLevelData = SKILL_DATABASE['health_regen'].levels[this.skills['health_regen'].level - 1];
            this.health = Math.min(this.maxHealth, this.health + regenLevelData.regenPerSecond / 60);
        }

        gameContext.camera.targetX = this.x - gameContext.canvas.width / 2;
        gameContext.camera.targetY = this.y - gameContext.canvas.height / 2;
    }

    handleMovement(gameContext) {
        const { keys, isMobile, movementVector } = gameContext;
        this.moveAndCollide(this.knockbackVelocity.x, this.knockbackVelocity.y, gameContext.platforms);
        this.knockbackVelocity.x *= 0.9;
        this.knockbackVelocity.y *= 0.9;

        if (this.isDashing) {
            this.moveAndCollide(this.dashDirection.x * CONFIG.PLAYER_DASH_FORCE, this.dashDirection.y * CONFIG.PLAYER_DASH_FORCE, gameContext.platforms);
            this.dashTimer--;
            if (this.dashTimer <= 0) this.isDashing = false;
            return;
        }

        let dx = 0;
        let dy_input = 0;
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

        this.moveAndCollide(dx * this.speed, 0, gameContext.platforms);

        const jumpPressed = isMobile ? (movementVector.y < -0.5) : (keys['w'] || keys['ArrowUp'] || keys[' ']);
        if (jumpPressed && this.jumpsAvailable > 0) {
            this.velocityY = (this.onGround || this.jumpsAvailable === (this.skills['double_jump'] ? 2 : 1)) ? CONFIG.PLAYER_JUMP_FORCE : CONFIG.PLAYER_DOUBLE_JUMP_FORCE;
            this.jumpsAvailable--;
            this.onGround = false;
            if (!isMobile) keys['w'] = keys['ArrowUp'] = keys[' '] = false;
        }

        if (!isMobile && keys['shift']) {
            this.dash(gameContext);
            keys['shift'] = false;
        }

        if (this.dashCooldown > 0) {
            this.dashCooldown--;
        }
    }

    applyGravity(gameContext) {
        const { platforms } = gameContext;
        this.velocityY += CONFIG.GRAVITY;
        this.moveAndCollide(0, this.velocityY, platforms);
    }

    dash(gameContext) {
        if (this.dashCooldown > 0 || this.isDashing) return;

        this.isDashing = true;
        this.dashTimer = CONFIG.PLAYER_DASH_DURATION;
        this.dashCooldown = CONFIG.PLAYER_DASH_COOLDOWN;
        this.dashDirection = { ...this.lastMoveDirection };

        if (this.onGround && this.dashDirection.y > 0) {
            this.dashDirection.y = 0;
        }

        if (this.dashDirection.x === 0 && this.dashDirection.y === 0) {
            this.dashDirection.x = this.facingRight ? 1 : -1;
        }

        gameContext.soundManager.play('uiClick', 'F5');

        if (this.skills['scorched_earth']) {
            const damage = SKILL_DATABASE['scorched_earth'].levels[0].damagePerFrame;
            gameContext.activeVortexes.push(new Vortex(this.x, this.y, { radius: 20, duration: 60, damage: damage, isExplosion: true, force: 0 }));
            for (let i = 0; i < 5; i++) {
                gameContext.particleManager.createParticle(this.x, this.y, 'orange', 2.5);
            }
        }
    }

    takeDamage(amount, source = null, gameContext) {
        const { particleManager, setGameState } = gameContext;
        if (this.isDashing || this.invincibilityTimer > 0) {
            return;
        }

        if (this.shielded) {
            this.shielded = false;
            for(let i=0; i<20; i++) particleManager.createParticle(this.x, this.y, 'cyan', 3);
            return;
        }

        this.health -= amount;
        this.hitTimer = 30;
        gameContext.soundManager.play('damage', '8n');
        gameContext.screenShake.intensity = 5;
        gameContext.screenShake.duration = 15;
        this.invincibilityTimer = 36;

        if (source) {
            const knockbackForce = 8;
            const angle = Math.atan2(this.y - source.y, this.x - source.x);
            this.knockbackVelocity.x = Math.cos(angle) * knockbackForce;
            this.knockbackVelocity.y = Math.sin(angle) * knockbackForce;
        }

        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
            setGameState('gameOver');
        }
    }
    addXp(amount, gameContext) {
        const { particleManager, setGameState, soundManager } = gameContext;
        this.xp += amount * this.xpModifier;
        soundManager.play('xp', 'C5');
        for (let i = 0; i < 4; i++) {
            particleManager.createParticle(this.x, this.y, 'cyan', 2);
        }

        while (this.xp >= this.xpToNextLevel) {
            this.level++;
            this.xp -= this.xpToNextLevel;
            this.xpToNextLevel = Math.floor(this.xpToNextLevel * CONFIG.XP_TO_NEXT_LEVEL_MULTIPLIER);
            soundManager.play('levelUp', ['C6', 'E6', 'G6']);
            setGameState('levelUp');
        }
    }

    addSkill(skillId, gameContext) {
        const { showTemporaryMessage, soundManager, enemies, screenShake, ui } = gameContext;
        const skillData = SKILL_DATABASE[skillId];
        if (skillData.type === 'utility' && skillData.instant) {
            if (skillId === 'heal') this.health = Math.min(this.maxHealth, this.health + this.maxHealth * 0.25);
            if (skillId === 'black_hole') {
                soundManager.play('nuke', '8n');
                screenShake.intensity = 15;
                screenShake.duration = 30;
                enemies.forEach(e => {
                    e.takeDamage(SKILL_DATABASE['black_hole'].levels[0].damage * this.damageModifier);
                    e.applyKnockback(this.x, this.y, CONFIG.ENEMY_KNOCKBACK_FORCE * 5);
                });
                showTemporaryMessage("BURACO NEGRO!", "gold");
            }
            return;
        }

        if (!this.skills[skillId]) {
            this.skills[skillId] = { level: 1, timer: 0, hudElement: null };
            if (skillData.type === 'orbital') {
                this.skills[skillId].orbs = Array.from({ length: skillData.levels[0].count }, (_, i) => ({ angle: (Math.PI * 2 / skillData.levels[0].count) * i, lastHitFrame: 0 }));
            }

            if (skillData.type !== 'passive') {
                const container = document.getElementById('skills-hud');
                const div = document.createElement('div');
                div.className = 'skill-hud-icon';
                div.id = `hud-skill-${skillId}`;
                div.innerHTML = `${skillData.icon}<sub>1</sub>`;
                container.appendChild(div);
                this.skills[skillId].hudElement = div;
            }

        } else {
            this.skills[skillId].level++;
            if (this.skills[skillId].hudElement) {
                this.skills[skillId].hudElement.querySelector('sub').textContent = this.skills[skillId].level;
            }
        }

        if (skillData.type === 'passive') {
            if(skillId === 'magnet') {
                const levelData = skillData.levels[this.skills[skillId].level - 1];
                this.collectRadius = CONFIG.XP_ORB_ATTRACTION_RADIUS * (1 + levelData.collectRadiusBonus);
            }
            if(skillId === 'double_jump') {
                this.jumpsAvailable = SKILL_DATABASE['double_jump'].levels[0].jumps;
            }
        }
    }

    updateSkills(gameContext) {
        const { enemies, activeVortexes, activeStaticFields, particleManager, soundManager, projectilePool, qtree } = gameContext;
        for (const skillId in this.skills) {
            const skillState = this.skills[skillId];
            const skillData = SKILL_DATABASE[skillId];
            const levelData = skillData.levels[skillState.level - 1];

            if (skillData.type !== 'passive' && skillData.type !== 'orbital') {
                skillState.timer--;
                if(skillState.timer > 0) continue;
            }

            if (skillData.type === 'projectile') {
                // ... (logic to be filled in)
            } else if (skillData.type === 'aura') {
                // ... (logic to be filled in)
            } else if (skillId === 'aegis_shield') {
                if (skillState.timer <= 0 && !this.shielded) {
                    this.shielded = true;
                    skillState.timer = skillData.cooldown;
                }
            }
        }
        if (this.skills['orbital_shield']) {
            // ... (logic to be filled in)
        }
    }

    findNearestEnemy(gameContext) {
        let nearest = null;
        let nearestDistSq = Infinity;
        const searchRadius = 2000;
        const searchArea = new Rectangle( this.x - searchRadius, this.y - searchRadius, searchRadius * 2, searchRadius * 2 );
        const candidates = gameContext.qtree.query(searchArea);

        for (const enemy of candidates) {
            const dx = this.x - enemy.x;
            const dy = this.y - enemy.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < nearestDistSq) {
                nearestDistSq = distSq;
                nearest = enemy;
            }
        }
        return nearest;
    }
}
