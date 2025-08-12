// js/entities/platform.js
import { Entity } from './entity.js';

export class Platform extends Entity {
    constructor(x, y, width, height, color = '#2E8B57') {
        super(x, y, 0);
        this.width = width;
        this.height = height;
        this.color = color;
    }

    draw(ctx, camera) {
        const screenLeft = camera.x;
        const screenRight = camera.x + ctx.canvas.width;
        if (this.x + this.width < screenLeft || this.x > screenRight) {
            return;
        }

        ctx.save();
        ctx.translate(-camera.x, -camera.y);

        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        gradient.addColorStop(0, '#3CB371');
        gradient.addColorStop(0.5, this.color);
        gradient.addColorStop(1, '#1E593F');
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.width, this.y);
        ctx.stroke();
        
        ctx.restore();
    }
}