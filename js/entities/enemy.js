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
            // ... (outros casos de inimigos permanecem iguais)
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
        const { player, staticFields, enemies, enemyProjectilePool, particlePool, waveEnemiesRemaining, gameTime, waveNumber } = gameContext;

        if (this.type === 'reaper' && Math.hypot(player.x - this.x, player.y - this.y) < this.radius + 40) {
            this.takeDamage(this.health, gameContext); // Aciona a lógica de morte completa
            return;
        }
        
        // O resto da lógica de update permanece a mesma...
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
            
            // =======================================================================
            // CORREÇÃO 1: Lógica de drop de Power-Up aleatório
            // =======================================================================
            if (Math.random() < CONFIG.POWERUP_DROP_CHANCE) {
                const powerUpKeys = Object.keys(POWERUP_TYPES);
                const randomType = powerUpKeys[Math.floor(Math.random() * powerUpKeys.length)];
                powerUps.push(new PowerUp(this.x, this.y, randomType));
                showTemporaryMessage(POWERUP_TYPES[randomType].message, POWERUP_TYPES[randomType].color);
            }

            if (this.isElite) {
                const gemsDropped = Math.floor(Math.random() * 3) + 1;
                addGems(gemsDropped);
                showTemporaryMessage(`+${gemsDropped} Gemas!`, 'violet');
                // =======================================================================
                // MELHORIA 1: Chamada a savePermanentData() removida daqui
                // =======================================================================
            }
        }
    }

    applyKnockback(sourceX, sourceY, force) {
        const angle = Math.atan2(this.y - sourceY, this.x - sourceX);
        this.knockbackVelocity.x = Math.cos(angle) * force;
        this.knockbackVelocity.y = Math.sin(angle) * force;
    }

    draw(ctx, camera, player) {
        // ... (lógica de desenho da forma do inimigo permanece a mesma)

        // =======================================================================
        // MELHORIA 2: Barra de vida para TODOS os inimigos (quando danificados)
        // =======================================================================
        if (this.health < this.maxHealth) {
            const healthBarWidth = this.radius * 2;
            const healthPercentage = this.health / this.maxHealth;
            const barYOffset = this.isElite ? this.radius + 10 : this.radius + 5;
            
            ctx.fillStyle = '#333';
            ctx.fillRect(-healthBarWidth / 2, barYOffset, healthBarWidth, 5);
            ctx.fillStyle = 'red';
            ctx.fillRect(-healthBarWidth / 2, barYOffset, healthBarWidth * healthPercentage, 5);
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

// A classe BossEnemy permanece a mesma
export class BossEnemy extends Enemy {
    // ...
}