// js/entities/enemy.js

import { Entity } from './entity.js';
import { getFromPool } from '../systems/pooling.js';
import { CONFIG } from '../config.js';
import { PowerUp } from './powerup.js';
import { Vortex } from './vortex.js';
import { addGems, savePermanentData } from '../systems/save.js';
import SoundManager from '../systems/sound.js';

export class Enemy extends Entity {
    constructor(x, y, type, isElite, gameTime, waveNumber) {
        super(x, y);
        this.init(x, y, type, isElite, gameTime, waveNumber);
    }

    init(x, y, type, isElite, gameTime, waveNumber) {
        super.init();
        this.x = x;
        this.y = y;
        this.type = type;
        this.isElite = isElite;
        this.hitTimer = 0;
        this.hitBy = new Set();
        this.animationFrame = 0;
        this.attackTimer = 0;
        this.knockbackVelocity = { x: 0, y: 0 };
        this.orbHitCooldown = 0;
        this.explodesOnDeath = false;

        switch(type) {
            case 'reaper': 
                this.radius = 10; this.speed = 2.5 + (gameTime / 180) + (waveNumber * 0.02);
                this.health = 15 + Math.floor(gameTime / 20) * 2 + waveNumber; this.color = '#7DF9FF';
                this.shape = 'diamond'; this.damage = 30; this.xpValue = 15;
                this.explodesOnDeath = true; 
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
                this.attackCooldown = 150;
                this.attackTimer = this.attackCooldown;
                this.projectileSpeed = 3.5;
                this.projectileDamage = 8;
                break;
            case 'healer': 
                this.radius = 14; this.speed = 0.3 + (gameTime / 300) + (waveNumber * 0.003);
                this.health = 60 + Math.floor(gameTime / 10) * 6 + (waveNumber * 3); this.color = '#00FF00';
                this.shape = 'cross'; this.damage = 0; this.xpValue = 50;
                this.healCooldown = 180;
                this.healTimer = this.healCooldown;
                this.healAmount = 5 + Math.floor(gameTime / 20);
                this.healRadius = 100;
                break;
            case 'summoner':
                this.radius = 20; this.speed = 0.2 + (gameTime / 350) + (waveNumber * 0.002);
                this.health = 80 + Math.floor(gameTime / 10) * 8 + (waveNumber * 4); this.color = '#8B4513';
                this.shape = 'pyramid'; this.damage = 0; this.xpValue = 70;
                this.summonCooldown = 240;
                this.summonTimer = this.summonCooldown;
                break;
            default: // chaser
                this.radius = 12; this.speed = 1.3 + (gameTime / 150) + (waveNumber * 0.01);
                this.health = 25 + Math.floor(gameTime / 10) * 3 + (waveNumber * 1.5); this.color = '#FF4D4D';
                this.shape = 'circle'; this.damage = 8; this.xpValue = 20;
                break;
        }

        if (this.isElite) {
            this.radius *= 1.5;
            this.health *= 2.5;
            this.damage *= 1.5;
            this.xpValue *= 2;
            this.color = 'gold';
        }
        this.maxHealth = this.health;
    }

    update(gameContext) {
        const { player, staticFields, enemies, enemyProjectilePool, particlePool, waveEnemiesRemaining, gameTime, waveNumber } = gameContext;

        this.x += this.knockbackVelocity.x;
        this.y += this.knockbackVelocity.y;
        this.knockbackVelocity.x *= 0.9;
        this.knockbackVelocity.y *= 0.9;
        if (Math.hypot(this.knockbackVelocity.x, this.knockbackVelocity.y) < 0.1) {
            this.knockbackVelocity.x = 0;
            this.knockbackVelocity.y = 0;
        }

        if (this.orbHitCooldown > 0) this.orbHitCooldown--;

        if (this.type === 'reaper' && Math.hypot(player.x - this.x, player.y - this.y) < this.radius + 40) {
            this.isDead = true;
            this.takeDamage(this.health, gameContext); // Causa dano fatal para acionar a morte
            return;
        }

        if (Math.hypot(this.knockbackVelocity.x, this.knockbackVelocity.y) < 5) {
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            let currentSpeed = this.speed;
            for (const field of staticFields) {
                if (Math.hypot(field.x - this.x, field.y - this.y) < field.radius) {
                    currentSpeed *= (1 - field.slowFactor);
                    break;
                }
            }
            this.x += Math.cos(angle) * currentSpeed;
            this.y += Math.sin(angle) * currentSpeed;
        }

        if (this.type === 'shooter') {
            this.attackTimer--;
            if (this.attackTimer <= 0) {
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                getFromPool(enemyProjectilePool, this.x, this.y, angle, this.projectileSpeed, this.projectileDamage);
                SoundManager.play('enemyShot', 'D4');
                this.attackTimer = this.attackCooldown;
            }
        } else if (this.type === 'healer') {
            this.healTimer--;
            if (this.healTimer <= 0) {
                enemies.forEach(otherEnemy => {
                    if (!otherEnemy.isDead && otherEnemy !== this && Math.hypot(this.x - otherEnemy.x, this.y - otherEnemy.y) < this.healRadius) {
                        otherEnemy.health = Math.min(otherEnemy.maxHealth, otherEnemy.health + this.healAmount);
                        if(particlePool) for (let i = 0; i < 2; i++) getFromPool(particlePool, otherEnemy.x, otherEnemy.y, 'lime', 1);
                    }
                });
                this.healTimer = this.healCooldown;
            }
        } else if (this.type === 'summoner') {
            this.summonTimer--;
            if (this.summonTimer <= 0) {
                const summonedType = Math.random() < 0.5 ? 'chaser' : 'speeder';
                const newEnemy = new Enemy(this.x + (Math.random()-0.5)*50, this.y + (Math.random()-0.5)*50, summonedType, false, gameTime, waveNumber);
                enemies.push(newEnemy);
                waveEnemiesRemaining.value++;
                if(particlePool) for (let i = 0; i < 3; i++) getFromPool(particlePool, this.x, this.y, 'brown', 2);
                this.summonTimer = this.summonCooldown;
            }
        }

        const worldEdge = CONFIG.WORLD_BOUNDS.width / 2 + 200;
        if (this.x < -worldEdge || this.x > worldEdge) {
            this.isDead = true;
            waveEnemiesRemaining.value--;
        }
    }

    takeDamage(amount, gameContext) {
        if(this.isDead) return;

        const { score, xpOrbPool, particlePool, activeVortexes, powerUps, showTemporaryMessage, waveEnemiesRemaining, damageNumberPool } = gameContext;

        this.health -= amount;
        this.hitTimer = 5;

        getFromPool(damageNumberPool, this.x, this.y, amount);
        
        for (let i = 0; i < 3; i++) {
            getFromPool(particlePool, this.x, this.y, this.color, 1.8);
        }

        if (this.health <= 0) {
            this.isDead = true;
            getFromPool(xpOrbPool, this.x, this.y, this.xpValue); 
            score.kills++;
            waveEnemiesRemaining.value--;
            
            for (let i = 0; i < 6; i++) {
                getFromPool(particlePool, this.x, this.y, this.color, 3); 
            }
            
            if(this.explodesOnDeath) {
                const explosionRadius = this.type === 'reaper' ? 70 : 90;
                activeVortexes.push(new Vortex(this.x, this.y, {radius: explosionRadius, duration: 30, damage: this.damage, isExplosion:true, force: 0}));
                for (let i = 0; i < 15; i++) getFromPool(particlePool, this.x, this.y, this.color, 4);
            }
            
            if(Math.random() < CONFIG.POWERUP_DROP_CHANCE){
                powerUps.push(new PowerUp(this.x, this.y, 'nuke'));
                showTemporaryMessage("NUKE!", "yellow");
            }

            if (this.isElite) {
                const gemsDropped = Math.floor(Math.random() * 3) + 1;
                addGems(gemsDropped);
                showTemporaryMessage(`+${gemsDropped} Gemas!`, 'violet');
                savePermanentData();
            }
        }
    }

    applyKnockback(sourceX, sourceY, force) {
        const angle = Math.atan2(this.y - sourceY, this.x - sourceX);
        this.knockbackVelocity.x = Math.cos(angle) * force;
        this.knockbackVelocity.y = Math.sin(angle) * force;
    }

    draw(ctx, camera, player) {
        const screenLeft = camera.x;
        const screenRight = camera.x + ctx.canvas.width;
        const screenTop = camera.y;
        const screenBottom = camera.y + ctx.canvas.height;
        if (this.x + this.radius < screenLeft || this.x - this.radius > screenRight ||
            this.y + this.radius < screenTop || this.y - this.radius > screenBottom) {
            return;
        }

        ctx.save();
        ctx.translate((this.x - camera.x) | 0, (this.y - camera.y) | 0);

        const color = this.hitTimer > 0 ? 'white' : this.color;
        ctx.fillStyle = color;
        
        ctx.beginPath();
        if (this.shape === 'square') {
            ctx.rect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
        } else if (this.shape === 'diamond') { 
            ctx.moveTo(0, -this.radius); ctx.lineTo(this.radius * 0.7, 0); ctx.lineTo(0, this.radius); ctx.lineTo(-this.radius * 0.7, 0);
        } else if (this.shape === 'triangle') {
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            ctx.moveTo(Math.cos(angle) * this.radius, Math.sin(angle) * this.radius);
            ctx.lineTo(Math.cos(angle + 2*Math.PI/3) * this.radius, Math.sin(angle + 2*Math.PI/3) * this.radius);
            ctx.lineTo(Math.cos(angle + 4*Math.PI/3) * this.radius, Math.sin(angle + 4*Math.PI/3) * this.radius);
        } else if (this.shape === 'pentagon') {
            for(let i=0; i<5; i++) ctx.lineTo(Math.cos(i*2*Math.PI/5) * this.radius, Math.sin(i*2*Math.PI/5) * this.radius);
        } else if (this.shape === 'star') {
            const numPoints = 5; const outerRadius = this.radius; const innerRadius = this.radius / 2;
            ctx.rotate(this.animationFrame * 0.02);
            for (let i = 0; i < numPoints * 2; i++) {
                const r = i % 2 === 0 ? outerRadius : innerRadius;
                const a = Math.PI / numPoints * i - Math.PI/2;
                ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
        } else if (this.shape === 'cross') {
            ctx.rect(-this.radius / 3, -this.radius, this.radius * 2 / 3, this.radius * 2);
            ctx.rect(-this.radius, -this.radius / 3, this.radius * 2, this.radius * 2 / 3);
        } else if (this.shape === 'pyramid') {
            ctx.moveTo(0, -this.radius); ctx.lineTo(this.radius, this.radius); ctx.lineTo(-this.radius, this.radius);
        } else {
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        }
        ctx.closePath();
        ctx.fill();
        
        if (this.hitTimer > 0) this.hitTimer--;
        this.animationFrame++;

        if (this.isElite) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 1.2, 0, Math.PI * 2);
            ctx.strokeStyle = 'gold';
            ctx.lineWidth = 3;
            ctx.stroke();

            const healthBarWidth = this.radius * 2;
            const healthPercentage = this.health / this.maxHealth;
            ctx.fillStyle = '#333';
            ctx.fillRect(-healthBarWidth / 2, this.radius + 10, healthBarWidth, 5);
            ctx.fillStyle = 'red';
            ctx.fillRect(-healthBarWidth / 2, this.radius + 10, healthBarWidth * healthPercentage, 5);
        }

        ctx.restore();
    }
}

export class BossEnemy extends Enemy {
    constructor(x, y, gameTime, waveNumber) {
        super(x, y, 'boss', true, gameTime, waveNumber); // Boss é sempre elite
        this.phase = 1;
        this.attackPatternTimer = 0;
        this.currentAttack = 'chase';
    }

    update(gameContext) {
        const { player, enemies, enemyProjectilePool, showTemporaryMessage, frameCount, gameTime, waveNumber } = gameContext;
        this.animationFrame++;
        this.attackPatternTimer--;
        
        this.x += this.knockbackVelocity.x;
        this.y += this.knockbackVelocity.y;
        this.knockbackVelocity.x *= 0.95; 
        this.knockbackVelocity.y *= 0.95;

        if (this.health < this.maxHealth / 2 && this.phase === 1) {
            this.phase = 2;
            this.speed *= 1.5;
            this.currentAttack = 'barrage';
            this.attackPatternTimer = 0;
            showTemporaryMessage("FÚRIA DO BOSS!", "red");
        }
        
        if (this.attackPatternTimer <= 0) {
            this.chooseNextAttack();
        }
        this.executeAttack(player, enemies, enemyProjectilePool, frameCount, gameTime, waveNumber);
        if (this.orbHitCooldown > 0) this.orbHitCooldown--;
    }

    chooseNextAttack() {
        const attacks = (this.phase === 1) ? ['chase', 'shoot_ring'] : ['chase', 'barrage', 'summon'];
        this.currentAttack = attacks[Math.floor(Math.random() * attacks.length)];
        this.attackPatternTimer = 180;
    }

    executeAttack(player, enemies, enemyProjectilePool, frameCount, gameTime, waveNumber) {
        const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
        
        if (this.currentAttack === 'chase') {
            this.x += Math.cos(angleToPlayer) * this.speed;
            this.y += Math.sin(angleToPlayer) * this.speed;
        } else if (this.currentAttack === 'shoot_ring' && frameCount % 30 === 0) {
            for(let i=0; i<8; i++) {
                const angle = i * Math.PI / 4;
                getFromPool(enemyProjectilePool, this.x, this.y, angle, 3, 10);
            }
        } else if (this.currentAttack === 'barrage' && frameCount % 10 === 0) {
            getFromPool(enemyProjectilePool, this.x, this.y, angleToPlayer + (Math.random() - 0.5) * 0.5, 5, 15);
        } else if (this.currentAttack === 'summon' && this.attackPatternTimer === 100) {
            enemies.push(new Enemy(this.x, this.y, 'speeder', true, gameTime, waveNumber));
        }
    }
}
