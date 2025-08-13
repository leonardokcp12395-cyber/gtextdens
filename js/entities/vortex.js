// js/entities/vortex.js
import { Entity } from './entity.js';
import { CONFIG } from '../config.js';

export class Vortex extends Entity {
    constructor(x, y, levelData) {
        super(x, y, levelData.radius);
        this.duration = levelData.duration;
        this.initialDuration = levelData.duration;
        this.force = levelData.force;
        this.damage = levelData.damage;
        this.isExplosion = levelData.isExplosion || false;
        this.animationFrame = 0;
        this.enemiesHitByExplosion = new Set();
    }

    // CORREÇÃO: Adicionado 'gameContext' para passar para takeDamage
    update({ enemies, player, frameCount, gameContext }) {
        this.duration--;
        if (this.duration <= 0) {
            this.isDead = true;
            this.enemiesHitByExplosion.forEach(enemy => {
                 if(enemy.hitBy) enemy.hitBy.delete(this);
            });
            return;
        }

        enemies.forEach(enemy => {
            const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
            if(dist < this.radius){
                if(this.isExplosion){
                    if(!enemy.hitBy.has(this)){ 
                        // CORREÇÃO: Passando o gameContext
                        enemy.takeDamage(this.damage * player.damageModifier, gameContext);
                        enemy.applyKnockback(this.x, this.y, CONFIG.ENEMY_KNOCKBACK_FORCE * 2);
                        enemy.hitBy.add(this);
                        this.enemiesHitByExplosion.add(enemy);
                    }
                } else { 
                    const angle = Math.atan2(this.y - enemy.y, this.x - enemy.x);
                    enemy.x += Math.cos(angle) * this.force;
                    enemy.y += Math.sin(angle) * this.force;
                    if(frameCount % 60 === 0) {
                        // CORREÇÃO: Passando o gameContext
                        enemy.takeDamage(this.damage * player.damageModifier, gameContext);
                    }
                }
            }
        });
        this.animationFrame++;
    }

    draw(ctx, camera) {
        ctx.save();
        ctx.translate((this.x - camera.x) | 0, (this.y - camera.y) | 0);

        const lifeRatio = this.duration / this.initialDuration;
        const currentRadius = this.radius * (this.isExplosion ? (1 - lifeRatio) : 1);

        ctx.rotate(this.animationFrame * 0.05);

        ctx.fillStyle = `rgba(150, 0, 255, ${this.isExplosion ? lifeRatio * 0.8 : 0.2})`;
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(100, 0, 200, ${this.isExplosion ? lifeRatio * 0.6 : 0.1})`;
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius * 0.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
