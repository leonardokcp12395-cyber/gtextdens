export class Entity {
    constructor(x = 0, y = 0, radius = 0) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.isDead = false;
        this.active = true;
        this.velocityY = 0;
        this.onGround = false;
    }

    draw(ctx) {}
    update() {}

    reset() {
        this.x = 0;
        this.y = 0;
        this.radius = 0;
        this.isDead = false;
    }

    moveAndCollide(dx, dy, platforms) {
        const wasOnGround = this.onGround;
        const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)));
        if (steps === 0) return;

        const stepX = dx / steps;
        const stepY = dy / steps;

        for (let i = 0; i < steps; i++) {
            this.x += stepX;
            // Horizontal collision logic would go here

            this.y += stepY;
            let collided = false;
            for (const p of platforms) {
                if (this.x + this.radius > p.x && this.x - this.radius < p.x + p.width && this.y + this.radius > p.y && this.y - this.radius < p.y + p.height) {
                    if (stepY >= 0 && (this.y - stepY) + this.radius <= p.y) {
                        this.y = p.y - this.radius;
                        this.velocityY = 0;
                        collided = true;
                        this.onGround = true;
                        if (!wasOnGround && typeof this.onLanding === 'function') {
                            this.onLanding();
                        }
                    }
                }
            }
            if (!collided) this.onGround = false;
        }
    }
}
