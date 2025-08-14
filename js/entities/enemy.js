// js/entities/enemy.js

import { Entity } from './entity.js';
import { getFromPool } from '../systems/pooling.js';
import { CONFIG, POWERUP_TYPES } from '../config.js';
import { PowerUp } from './powerup.js';
import { Vortex } from './vortex.js';
import { addGems } from '../systems/save.js';
import SoundManager from '../systems/sound.js';

export class Enemy extends Entity {
    constructor(x, y, type, isElite, gameTime, waveNumber) {
        super(x, y);
        this.init(x, y, type, isElite, gameTime, waveNumber);
    }

    init(x, y, type, isElite, gameTime, waveNumber) {
        super.init();
        this.x = x; this.y = y; this.type = type; this.isElite = isElite;
        this.hitTimer = 0; this.hitBy = new Set(); this.animationFrame = 0;
        this.attackTimer = 0; this.knockbackVelocity = { x: 0, y: 0 };
        this.orbHitCooldown = 0; this.explodesOnDeath = false;

        switch(type) {
            case 'reaper': 
                this.radius = 10; this.speed = 2.5 + (gameTime / 180) + (waveNumber * 0.02);
                this.health = 15 + Math.floor(gameTime / 20) * 2 + waveNumber; this.color = '#7DF9FF';
                this.shape = 'diamond'; this.damage = 30; this.xpValue = 15; this.explodesOnDeath = true; 
                break;
            case 'tank':
                this.radius = 18; this.speed = 0.7 + (gameTime / 200) + (waveNumber * 0.005);
                this.health = 70 + Math.floor(gameTime / 10) * 7 + (waveNumber * 3); this.color = '#FFA500';
                this.shape = 'square'; this.damage = 12; this.xpValue = 40;
                break;
            case 'speeder':
                this.radius = 8; this.speed = 2.2 + (gameTime / 100) + (waveNumber * 0.015);
                this.health = 12 + Math.floor(gameTime / 15) * 2 + waveNumber; this.color = '#FFFF00';
                this.shape = 'triangle'; this.damage = 7; this.xpValue = 12;
                break;
            case 'bomber':
                this.radius = 12; this.speed = 0.9 + (gameTime / 220) + (waveNumber * 0.008);
                this.health = 45 + Math.floor(gameTime / 10) * 4 + (waveNumber * 2); this.color = '#9400D3';
                this.shape = 'pentagon'; this.damage = 9; this.xpValue = 25;
                this.explodesOnDeath = true;
                break;
            case 'shooter': 
                this.radius = 15; this.speed = 0.4 + (gameTime / 280) + (waveNumber * 0.004);
                this.health = 35 + Math.floor(gameTime / 10) * 4 + (waveNumber * 2); this.color = '#FF00FF';
                this.shape = 'star'; this.damage = 4; this.xpValue = 35;
                this.attackCooldown = 150; this.attackTimer = this.attackCooldown;
                this.projectileSpeed = 3.5; this.projectileDamage = 8;
                break;
            case 'healer': 
                this.radius = 14; this.speed = 0.3 + (gameTime / 300) + (waveNumber * 0.003);
                this.health = 60 + Math.floor(gameTime / 10) * 6 + (waveNumber * 3); this.color = '#00FF00';
                this.shape = 'cross'; this.damage = 0; this.xpValue = 50;
                this.healCooldown = 180; this.healTimer = this.healCooldown;
                this.healAmount = 5 + Math.floor(gameTime / 20); this.healRadius = 100;
                break;
            case 'summoner':
                this.radius = 20; this.speed = 0.2 + (gameTime / 350) + (waveNumber * 0.002);
                this.health = 80 + Math.floor(gameTime / 10) * 8 + (waveNumber * 4); this.color = '#8B4513';
                this.shape = 'pyramid'; this.damage = 0; this.xpValue = 70;
                this.summonCooldown = 240; this.summonTimer = this.summonCooldown;
                break;
            case 'mimic':
                this.radius = 5;
                this.speed = 0; // Começa parado
                this.health = 30 + Math.floor(gameTime / 15) * 3 + (waveNumber * 1.5);
                this.dormantColor = '#00E0E0'; // Ciano para disfarce
                this.activeColor = '#FF69B4'; // Rosa choque quando ativo
                this.color = this.dormantColor;
                this.shape = 'circle';
                this.damage = 15;
                this.xpValue = 30;
                this.isDormant = true;
                this.activationRadius = 100;
                this.realSpeed = 1.5 + (gameTime / 120) + (waveNumber * 0.01);
                break;
            default: // chaser
                this.radius = 12; this.speed = 1.3 + (gameTime / 150) + (waveNumber * 0.01);
                this.health = 25 + Math.floor(gameTime / 10) * 3 + (waveNumber * 1.5); this.color = '#FF4D4D';
                this.shape = 'circle'; this.damage = 8; this.xpValue = 20;
                break;
        }

        if (this.isElite) {
            this.radius *= 1.5; this.health *= 2.5; this.damage *= 1.5;
            this.xpValue *= 2; this.color = 'gold';
        }
        this.maxHealth = this.health;
    }

    update(gameContext) {
        const { player, staticFields, enemies, enemyProjectilePool, particlePool, waveEnemiesRemaining, gameTime, waveNumber, showTemporaryMessage } = gameContext;

        if (this.type === 'mimic' && this.isDormant) {
            if (player && Math.hypot(player.x - this.x, player.y - this.y) < this.activationRadius) {
                this.isDormant = false;
                this.speed = this.realSpeed;
                this.color = this.activeColor;
                if (showTemporaryMessage) showTemporaryMessage("MÍMICO!", "hotpink");
                SoundManager.play('levelUp', ['C4', 'E4', 'G4']);
            } else {
                // Fica parado e não faz nada se estiver dormente
                return;
            }
        }
        
        if (this.type === 'reaper' && player && Math.hypot(player.x - this.x, player.y - this.y) < this.radius + 40) {
            this.takeDamage(this.health, gameContext);
            return;
        }
        
        this.x += this.knockbackVelocity.x; this.y += this.knockbackVelocity.y;
        this.knockbackVelocity.x *= 0.9; this.knockbackVelocity.y *= 0.9;

        if (this.orbHitCooldown > 0) this.orbHitCooldown--;

        if (Math.hypot(this.knockbackVelocity.x, this.knockbackVelocity.y) < 5 && player) {
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            let currentSpeed = this.speed;
            for (const field of staticFields) {
                if (Math.hypot(field.x - this.x, field.y - this.y) < field.radius) {
                    currentSpeed *= (1 - field.slowFactor); break;
                }
            }
            this.x += Math.cos(angle) * currentSpeed;
            this.y += Math.sin(angle) * currentSpeed;
        }

        if (this.type === 'shooter' && --this.attackTimer <= 0) {
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            getFromPool(enemyProjectilePool, this.x, this.y, angle, this.projectileSpeed, this.projectileDamage);
            SoundManager.play('enemyShot', 'D4');
            this.attackTimer = this.attackCooldown;
        }
    }

    takeDamage(amount, gameContext) {
        if(this.isDead) return;
        const { score, xpOrbPool, particlePool, activeVortexes, powerUps, showTemporaryMessage, waveEnemiesRemaining, damageNumberPool } = gameContext;
        this.health -= amount; this.hitTimer = 5;
        getFromPool(damageNumberPool, this.x, this.y, amount);
        
        if (this.health <= 0) {
            this.isDead = true;
            getFromPool(xpOrbPool, this.x, this.y, this.xpValue); 
            score.kills++;
            waveEnemiesRemaining.value--;
            
            if(this.explodesOnDeath) {
                const explosionRadius = this.type === 'reaper' ? 70 : 90;
                activeVortexes.push(new Vortex(this.x, this.y, {radius: explosionRadius, duration: 30, damage: this.damage, isExplosion:true, force: 0}));
            }
            
            if (Math.random() < CONFIG.POWERUP_DROP_CHANCE) {
                const powerUpKeys = Object.keys(POWERUP_TYPES);
                const randomType = powerUpKeys[Math.floor(Math.random() * powerUpKeys.length)];
                powerUps.push(new PowerUp(this.x, this.y, randomType));
                showTemporaryMessage(POWERUP_TYPES[randomType].message, POWERUP_TYPES[randomType].color);
            }

            if (this.isElite) {
                addGems(Math.floor(Math.random() * 3) + 1);
                showTemporaryMessage(`+Gemas!`, 'violet');
            }
        }
    }

    applyKnockback(sourceX, sourceY, force) {
        const angle = Math.atan2(this.y - sourceY, this.x - sourceX);
        this.knockbackVelocity.x = Math.cos(angle) * force;
        this.knockbackVelocity.y = Math.sin(angle) * force;
    }

    draw(ctx, camera, player) {
        ctx.save();
        ctx.translate((this.x - camera.x) | 0, (this.y - camera.y) | 0);
        const color = this.hitTimer > 0 ? 'white' : this.color;
        ctx.fillStyle = color;
        if(this.hitTimer > 0) this.hitTimer--;

        // ... (lógica de desenhar formas)
        
        if (this.health < this.maxHealth) {
            const barWidth = this.radius * 2;
            const healthPercent = this.health / this.maxHealth;
            const yOffset = this.radius + 5;
            ctx.fillStyle = '#333';
            ctx.fillRect(-barWidth / 2, yOffset, barWidth, 5);
            ctx.fillStyle = 'red';
            ctx.fillRect(-barWidth / 2, yOffset, barWidth * healthPercent, 5);
        }

        if (this.isElite) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 1.2, 0, Math.PI * 2);
            ctx.strokeStyle = 'gold';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        ctx.restore();
    }
}

export class BossEnemy extends Enemy {
    constructor(x, y, gameTime, waveNumber) {
        super(x, y, 'boss', true, gameTime, waveNumber);
        this.phase = 1;
        this.attackPatternTimer = 0;
        this.currentAttack = 'chase';
    }

    // ... (lógica do Boss)
}