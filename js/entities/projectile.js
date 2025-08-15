import { Entity } from './entity.js';
import { CONFIG, SKILL_DATABASE } from '../config.js';
import { releaseToPool } from '../systems/pooling.js';

export class Projectile extends Entity {
    constructor() {
        super();
        this.piercedEnemies = new Set();
        this.skillId = null;
    }

    init(x, y, angle, levelData, skillId = null) {
        super.reset();
        this.x = x;
        this.y = y;
        this.skillId = skillId;
        this.velocity = { x: Math.cos(angle) * levelData.speed, y: Math.sin(angle) * levelData.speed };
        this.damage = levelData.damage;
        this.pierce = levelData.pierce;
        this.radius = 5;
        this.piercedEnemies.clear();
        this.active = true;
        this.isDead = false;
    }

    draw(ctx, camera) {
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    update(gameContext) {
        if (!this.active) return;
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        if (this.x < gameContext.camera.x - 100 || this.x > gameContext.camera.x + gameContext.canvas.width + 100 ||
            this.y < gameContext.camera.y - 100 || this.y > gameContext.camera.y + gameContext.canvas.height + 100) {
            this.isDead = true;
            releaseToPool(this);
        }
    }

    reset() {
        super.reset();
        this.velocity = { x: 0, y: 0 };
        this.damage = 0;
        this.pierce = 0;
        this.piercedEnemies.clear();
        this.skillId = null;
    }
}

export class EnemyProjectile extends Entity {
    constructor() {
        super();
        this.color = 'red';
    }

    init(x, y, angle, speed, damage) {
        super.reset();
        this.x = x;
        this.y = y;
        this.radius = 7;
        this.velocity = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
        this.damage = damage;
    }

    draw(ctx, camera) {
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    update(gameContext) {
        if (!this.active) return;
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        if (this.x < gameContext.camera.x - 100 || this.x > gameContext.camera.x + gameContext.canvas.width + 100 ||
            this.y < gameContext.camera.y - 100 || this.y > gameContext.camera.y + gameContext.canvas.height + 100) {
            this.isDead = true;
            releaseToPool(this);
        }
    }

    reset() {
        super.reset();
        this.velocity = { x: 0, y: 0 };
        this.damage = 0;
    }
}
