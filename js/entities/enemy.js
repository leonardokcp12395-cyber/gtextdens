import { Entity } from './entity.js';
import { CONFIG } from '../config.js';
import { getFromPool } from '../systems/pooling.js';
import { Vortex } from './vortex.js';
import { addGems } from '../systems/save.js';
// import SoundManager from '../systems/sound.js';

export class Enemy extends Entity {
    constructor(x, y, type = 'chaser', isElite = false, gameTime = 0, waveNumber = 0) {
        super(x, y, 10);
        this.type = type;
        this.isElite = isElite;
        this.hitTimer = 0;
        this.hitBy = new Set();
        this.animationFrame = 0;
        this.attackTimer = 0;
        this.knockbackVelocity = { x: 0, y: 0 };
        this.orbHitCooldown = 0;
        this.slowedTimer = 0;
        this.explodesOnDeath = false;

        switch(type) {
            case 'reaper':
                this.radius = 10; this.speed = 4.5 + (gameTime / 100) + (waveNumber * 0.025);
                this.health = 15 + Math.floor(gameTime / 20) * 2 + waveNumber; this.color = '#7DF9FF';
                this.shape = 'diamond'; this.damage = 30;
                this.xpValue = 15;
                this.explodesOnDeath = true;
                break;
            case 'tank':
                this.radius = 18; this.speed = 1.5 + (gameTime / 120) + (waveNumber * 0.008);
                this.health = 70 + Math.floor(gameTime / 10) * 7 + (waveNumber * 3); this.color = '#FFA500';
                this.shape = 'square'; this.damage = 12; this.xpValue = 40;
                break;
            case 'speeder':
                this.radius = 8; this.speed = 4.0 + (gameTime / 50) + (waveNumber * 0.02);
                this.health = 12 + Math.floor(gameTime / 15) * 2 + waveNumber; this.color = '#FFFF00';
                this.shape = 'triangle'; this.damage = 7; this.xpValue = 12;
                break;
            case 'bomber':
                this.radius = 12; this.speed = 1.8 + (gameTime / 150) + (waveNumber * 0.01);
                this.health = 45 + Math.floor(gameTime / 10) * 4 + (waveNumber * 2); this.color = '#9400D3';
                this.shape = 'pentagon'; this.damage = 9; this.xpValue = 25;
                this.explodesOnDeath = true;
                break;
            case 'shooter':
                this.radius = 15; this.speed = 1.0 + (gameTime / 200) + (waveNumber * 0.005);
                this.health = 35 + Math.floor(gameTime / 10) * 4 + (waveNumber * 2); this.color = '#FF00FF';
                this.shape = 'star'; this.damage = 4; this.xpValue = 35;
                this.attackCooldown = 140;
                this.attackTimer = this.attackCooldown;
                this.projectileSpeed = 4.0;
                this.projectileDamage = 8;
                break;
            case 'healer':
                this.radius = 14; this.speed = 0.9 + (gameTime / 220) + (waveNumber * 0.004);
                this.health = 60 + Math.floor(gameTime / 10) * 6 + (waveNumber * 3); this.color = '#00FF00';
                this.shape = 'cross'; this.damage = 0; this.xpValue = 50;
                this.healCooldown = 180;
                this.healTimer = this.healCooldown;
                this.healAmount = 5 + Math.floor(gameTime / 20);
                this.healRadius = 100;
                break;
            case 'summoner':
                this.radius = 20; this.speed = 0.8 + (gameTime / 250) + (waveNumber * 0.003);
                this.health = 80 + Math.floor(gameTime / 10) * 8 + (waveNumber * 4); this.color = '#8B4513';
                this.shape = 'pyramid'; this.damage = 0; this.xpValue = 70;
                this.summonCooldown = 220;
                this.summonTimer = this.summonCooldown;
                break;
            case 'mimic':
                this.radius = 5; this.speed = 0;
                this.health = 30 + Math.floor(gameTime / 15) * 3 + (waveNumber * 1.5);
                this.color = '#00E0E0';
                this.shape = 'circle'; this.damage = 15; this.xpValue = 30;
                this.isDormant = true; this.activationRadius = 100;
                this.realSpeed = 1.5 + (gameTime / 120) + (waveNumber * 0.01);
                this.activeColor = '#FF69B4';
                break;
            default: // chaser
                this.radius = 12; this.speed = 2.8 + (gameTime / 80) + (waveNumber * 0.015);
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
        ctx.translate(this.x - camera.x, this.y - camera.y);

        const color = this.hitTimer > 0 ? 'white' : this.color;
        ctx.fillStyle = color;

        ctx.beginPath();
        if (this.shape === 'square') {
            ctx.rect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
        } else if (this.shape === 'diamond') {
            ctx.moveTo(0, -this.radius);
            ctx.lineTo(this.radius * 0.7, 0);
            ctx.lineTo(0, this.radius);
            ctx.lineTo(-this.radius * 0.7, 0);
            ctx.closePath();
        } else if (this.shape === 'triangle') {
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            ctx.moveTo(Math.cos(angle) * this.radius, Math.sin(angle) * this.radius);
            ctx.lineTo(Math.cos(angle + 2*Math.PI/3) * this.radius, Math.sin(angle + 2*Math.PI/3) * this.radius);
            ctx.lineTo(Math.cos(angle + 4*Math.PI/3) * this.radius, Math.sin(angle + 4*Math.PI/3) * this.radius);
        } else { // circle
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
        }

        ctx.restore();
    }

    update(gameContext) {
        const { player, activeStaticFields, enemies, enemyProjectilePool, particleManager, soundManager, waveEnemiesRemaining, showTemporaryMessage } = gameContext;

        if (this.type === 'mimic' && this.isDormant) {
            if (player && Math.hypot(player.x - this.x, player.y - this.y) < this.activationRadius) {
                this.isDormant = false;
                this.speed = this.realSpeed;
                this.color = this.activeColor;
                if (showTemporaryMessage) showTemporaryMessage("MÍMICO!", "hotpink");
                soundManager.play('levelUp', ['C4', 'E4', 'G4']);
            } else {
                return;
            }
        }

        if (this.slowedTimer > 0) this.slowedTimer--;

        this.moveAndCollide(this.knockbackVelocity.x, this.knockbackVelocity.y, gameContext.platforms);
        this.knockbackVelocity.x *= 0.9;
        this.knockbackVelocity.y *= 0.9;

        if (this.orbHitCooldown > 0) {
            this.orbHitCooldown--;
        }

        if (this.type === 'reaper' && Math.hypot(player.x - this.x, player.y - this.y) < this.radius + 40) {
            this.takeDamage(this.health, gameContext);
            return;
        }

        if (Math.hypot(this.knockbackVelocity.x, this.knockbackVelocity.y) < 5) {
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            let currentSpeed = this.speed;
            // ... slow logic
            this.x += Math.cos(angle) * currentSpeed;
            this.y += Math.sin(angle) * currentSpeed;
        }

        // ... attack logic
    }

    takeDamage(amount, gameContext) {
        const { score, xpOrbPool, particleManager, activeVortexes, showTemporaryMessage, waveEnemiesRemaining, damageNumberPool, soundManager } = gameContext;
        if(this.isDead) return;
        this.health -= amount;
        this.hitTimer = 5;

        getFromPool(damageNumberPool, this.x, this.y, amount);
        
        if (this.health <= 0) {
            this.isDead = true;
            getFromPool(xpOrbPool, this.x, this.y, this.xpValue); 
            score.kills++;
            waveEnemiesRemaining.value--;
            
            if(this.explodesOnDeath) {
                activeVortexes.push(new Vortex(this.x, this.y, {radius: 90, duration: 30, damage: this.damage, isExplosion:true, force: 0}));
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

    applySlow(duration) {
        this.slowedTimer = Math.max(this.slowedTimer, duration);
    }
}

export class BossEnemy extends Enemy {
    constructor(x, y, gameTime, waveNumber) {
        super(x, y, 'boss', true, gameTime, waveNumber);
        this.maxHealth = 1000 + (waveNumber * 150);
        this.health = this.maxHealth;
        this.speed = 0.5 + (waveNumber * 0.02);
        this.damage = 25;
        this.xpValue = 500;
        this.color = '#8A2BE2';
        this.phase = 1;
        this.attackPatternTimer = 0;
        this.currentAttack = 'chase';
    }

    // ... (boss methods to be filled in)
}
