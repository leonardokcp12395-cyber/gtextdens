// js/entities/particle.js
import { Entity } from './entity.js';
import { releaseToPool } from '../systems/pooling.js';

export class Particle extends Entity {
    constructor() {
        super();
    }

    init(x, y, color = 'white', scale = 1) {
        super.init();
        this.x = x;
        this.y = y;
        this.radius = (Math.random() * 2 + 1) * scale;
        this.velocity = { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 };
        this.alpha = 1;
        this.friction = 0.95;
        this.color = color;
    }

    update() {
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha -= 0.05;
        if (this.alpha <= 0) {
            this.isDead = true;
            releaseToPool(this);
        }
    }

    draw(ctx, camera) {
        ctx.save();
        ctx.translate(-camera.x, -camera.y);
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x | 0, this.y | 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }

    reset() {
        super.reset();
        this.velocity = { x: 0, y: 0 };
        this.alpha = 1;
        this.friction = 0.95;
        this.color = 'white';
    }
}