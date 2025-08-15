import { Entity } from './entity.js';
import { releaseToPool } from '../systems/pooling.js';

export class XPOrb extends Entity {
    constructor() {
        super();
    }

    init(x, y, value) {
        super.reset();
        this.x = x;
        this.y = y;
        this.radius = 5;
        this.value = value;
    }

    draw(ctx, camera) {
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);
        ctx.fillStyle = 'cyan';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    update(gameContext) {
        if (!this.active) return;
        const { player } = gameContext;

        const dist = Math.hypot(player.x - this.x, player.y - this.y);

        if (dist < player.collectRadius) {
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            this.x += Math.cos(angle) * 8;
            this.y += Math.sin(angle) * 8;
        }
        if (dist < player.radius + this.radius) {
            player.addXp(this.value, gameContext);
            this.isDead = true;
            releaseToPool(this);
        }
    }

    reset() {
        super.reset();
        this.value = 0;
    }
}
