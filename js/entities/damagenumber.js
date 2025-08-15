import { Entity } from './entity.js';
import { releaseToPool } from '../systems/pooling.js';

export class DamageNumber extends Entity {
    constructor() {
        super();
    }

    init(x, y, amount) {
        super.reset();
        this.x = x;
        this.y = y;
        this.amount = Math.round(amount);
        this.alpha = 1;
        this.velocityY = -2;
        this.life = 60;
    }

    update() {
        this.y += this.velocityY;
        this.alpha -= 0.015;
        this.life--;
        if (this.life <= 0) {
            this.isDead = true;
            releaseToPool(this);
        }
    }

    draw(ctx, camera) {
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 20px "Courier New", Courier, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.amount, 0, 0);
        ctx.restore();
    }

    reset() {
        super.reset();
        this.amount = 0;
    }
}
