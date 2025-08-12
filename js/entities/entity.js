// js/entities/entity.js

export class Entity {
    constructor(x = 0, y = 0, radius = 0) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.isDead = false;
        this.active = true;
    }
    
    draw(ctx, camera) {
        // Implementado nas classes filhas
    }

    update(args) {
        // Implementado nas classes filhas
    }
    
    reset() {
        this.x = 0;
        this.y = 0;
        this.radius = 0;
        this.isDead = false;
        this.active = false;
    }

    init() {
        this.active = true;
        this.isDead = false;
    }
}