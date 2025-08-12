// js/entities/projectile.js
import { Entity } from './entity.js';
import { releaseToPool } from '../systems/pooling.js';
import { CONFIG } from '../config.js';

export class Projectile extends Entity {
    constructor() {
        super();
        this.piercedEnemies = new Set();
        this.trailParticles = [];
        this.type = 'normal';
    }

    init(x, y, angle, levelData, type = 'normal') {
        super.init();
        this.x = x;
        this.y = y;
        this.type = type;

        if (this.type === 'celestial_ray') {
            this.radius = levelData.width / 2;
            this.length = levelData.length;
            this.velocity = { x: Math.cos(angle) * levelData.speed, y: Math.sin(angle) * levelData.speed };
            this.damage = levelData.damage;
            this.pierce = levelData.pierce;
            this.angle = angle;
        } else { // Divine Lance
            this.radius = 5;
            this.velocity = { x: Math.cos(angle) * levelData.speed, y: Math.sin(angle) * levelData.speed };
            this.damage = levelData.damage;
            this.pierce = levelData.pierce;
        }
        this.piercedEnemies.clear();
        this.trailParticles = [];
    }

    update({ frameCount }) {
        if (!this.active) return;
        
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        if (frameCount % 4 === 0) {
            this.trailParticles.push({
                x: this.x,
                y: this.y,
                radius: this.radius * (Math.random() * 0.3 + 0.2),
                color: `rgba(255, 255, ${Math.floor(Math.random() * 255)}, 0.5)`,
                alpha: 1
            });
        }
        
        for (let i = this.trailParticles.length - 1; i >= 0; i--) {
            const p = this.trailParticles[i];
            p.alpha -= 0.1;
            p.radius *= 0.9;
            if (p.alpha <= 0.05) {
                this.trailParticles.splice(i, 1);
            }
        }

        const worldEdge = CONFIG.WORLD_BOUNDS.width / 2 + 200;
        if (this.x < -worldEdge || this.x > worldEdge || this.y < -worldEdge || this.y > worldEdge) {
            this.isDead = true;
            releaseToPool(this);
        }
    }

    draw(ctx, camera) {
        const screenLeft = camera.x;
        const screenRight = camera.x + ctx.canvas.width;
        const screenTop = camera.y;
        const screenBottom = camera.y + ctx.canvas.height;
        const largerDimension = this.type === 'celestial_ray' ? this.length : this.radius;
        if (this.x + largerDimension < screenLeft || this.x - largerDimension > screenRight ||
            this.y + largerDimension < screenTop || this.y - largerDimension > screenBottom) {
            return;
        }

        ctx.save();
        ctx.translate((this.x - camera.x) | 0, (this.y - camera.y) | 0); 

        this.trailParticles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc((p.x - this.x) | 0, (p.y - this.y) | 0, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            ctx.restore();
        });

        if (this.type === 'celestial_ray') {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
            ctx.rotate(this.angle); 
            ctx.fillRect(-this.length / 2, -this.radius, this.length, this.radius * 2);
            ctx.restore();
        } else {
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    reset() {
        super.reset();
        this.velocity = { x: 0, y: 0 };
        this.damage = 0;
        this.pierce = 0;
        this.piercedEnemies.clear();
        this.trailParticles = [];
        this.type = 'normal';
        this.length = 0; 
        this.angle = 0; 
    }
}

// Classe separada para projéteis de inimigos
export class EnemyProjectile extends Entity {
    constructor() {
        super();
        this.color = 'red';
        this.trailParticles = [];
    }

    init(x, y, angle, speed, damage) {
        super.init();
        this.x = x; 
        this.y = y;
        this.radius = 7;
        this.velocity = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
        this.damage = damage;
        this.color = 'red';
        this.trailParticles = [];
    }

    update({ frameCount }) {
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        if (frameCount % 4 === 0) {
            this.trailParticles.push({
                x: this.x,
                y: this.y,
                radius: this.radius * (Math.random() * 0.3 + 0.2),
                color: `rgba(255, 0, 0, 0.5)`,
                alpha: 1
            });
        }
        
        for (let i = this.trailParticles.length - 1; i >= 0; i--) {
            const p = this.trailParticles[i];
            p.alpha -= 0.1;
            p.radius *= 0.9;
            if (p.alpha <= 0.05) {
                this.trailParticles.splice(i, 1);
            }
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

        this.trailParticles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x | 0, p.y | 0, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            ctx.restore();
        });

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x | 0, this.y | 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    reset() {
        super.reset();
        this.velocity = { x: 0, y: 0 };
        this.damage = 0;
        this.color = 'red';
        this.trailParticles = [];
    }
}