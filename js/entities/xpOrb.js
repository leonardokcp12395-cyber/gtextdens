// js/entities/xpOrb.js
import { Entity } from './entity.js';
import { releaseToPool } from '../systems/pooling.js';

export class XPOrb extends Entity {
    constructor() {
        super();
    }

    init(x, y, value) {
        super.init();
        this.x = x;
        this.y = y;
        this.radius = 5;
        this.value = value;
    }

    update(gameContext) {
        const { player } = gameContext;
        if (!this.active || !player) return;

        const dist = Math.hypot(player.x - this.x, player.y - this.y);

        if (dist < player.collectRadius) {
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            this.x += Math.cos(angle) * 8;
            this.y += Math.sin(angle) * 8;
        }

        if (dist < player.radius + this.radius) {
            // CORREÇÃO: Passando o gameContext para a função addXp
            player.addXp(this.value, gameContext);
            this.isDead = true;
            releaseToPool(this);
        }
    }

    draw(ctx, camera) {
        const screenLeft = camera.x;
        const screenRight = camera.x + ctx.canvas.width;
        if (this.x + this.radius < screenLeft || this.x - this.radius > screenRight) {
            return;
        }

        ctx.save();
        ctx.translate(-camera.x, -camera.y);
        ctx.fillStyle = 'cyan';
        ctx.beginPath();
        ctx.arc(this.x | 0, this.y | 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    reset() {
        super.reset();
        this.value = 0;
    }
}