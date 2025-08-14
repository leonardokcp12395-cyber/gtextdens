// js/entities/powerup.js
import { Entity } from './entity.js';
import SoundManager from '../systems/sound.js';
import { CONFIG } from '../config.js';

export class PowerUp extends Entity {
    constructor(x, y, type) {
        super(x, y, 10);
        this.type = type;
        this.animationFrame = 0;
    }

    update(gameContext) {
        const { player } = gameContext;
        this.animationFrame++;
        if (player && !this.isDead && Math.hypot(player.x - this.x, player.y - this.y) < player.radius + this.radius) {
            this.applyEffect(gameContext);
            this.isDead = true;
        }
    }

    draw(ctx, camera) {
        ctx.save();
        ctx.translate((this.x - camera.x) | 0, (this.y - camera.y) | 0);
        ctx.rotate(this.animationFrame * 0.05);
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = i * (Math.PI * 2 / 5) - Math.PI / 2;
            ctx.lineTo(Math.cos(angle) * this.radius, Math.sin(angle) * this.radius);
            const innerAngle = angle + Math.PI / 5;
            ctx.lineTo(Math.cos(innerAngle) * (this.radius / 2), Math.sin(innerAngle) * (this.radius / 2));
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // =======================================================================
    // CORREÇÃO 1: Lógica para aplicar diferentes efeitos de power-up
    // =======================================================================
    applyEffect(gameContext) {
        const { enemies, screenShake, player } = gameContext;
        
        switch (this.type) {
            case 'nuke':
                enemies.forEach(e => {
                    e.takeDamage(10000, gameContext);
                    e.applyKnockback(this.x, this.y, CONFIG.ENEMY_KNOCKBACK_FORCE * 5);
                });
                SoundManager.play('nuke', '8n');
                screenShake.intensity = 15;
                screenShake.duration = 30;
                break;
            
            case 'heal_orb':
                if (player) {
                    player.health = Math.min(player.maxHealth, player.health + player.maxHealth * 0.25); // Cura 25% da vida máxima
                    SoundManager.play('levelUp', 'C5');
                }
                break;

            case 'invincibility':
                 if (player) {
                    player.shielded = true;
                    player.shieldTimer = 300; // 5 segundos de invencibilidade
                    SoundManager.play('levelUp', 'G5');
                }
                break;
        }
    }
}