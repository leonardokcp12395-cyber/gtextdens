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

    update({ player, enemies, screenShake, gameContext }) {
        this.animationFrame++;
        if (Math.hypot(player.x - this.x, player.y - this.y) < player.radius + this.radius) {
            this.applyEffect({ enemies, screenShake, gameContext });
            this.isDead = true;
        }
    }

    draw(ctx, camera) {
        ctx.save();
        ctx.translate((this.x - camera.x) | 0, (this.y - camera.y) | 0);
        ctx.rotate(this.animationFrame * 0.05);
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        // Desenha uma estrela
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

    applyEffect({ enemies, screenShake, gameContext}) {
        if(this.type === 'nuke'){
            enemies.forEach(e => {
                // CORREÇÃO: Passando o gameContext para o takeDamage
                e.takeDamage(10000, gameContext);
                e.applyKnockback(this.x, this.y, CONFIG.ENEMY_KNOCKBACK_FORCE * 5);
            });
            SoundManager.play('nuke', '8n');
            screenShake.intensity = 15;
            screenShake.duration = 30;
        }
    }
}