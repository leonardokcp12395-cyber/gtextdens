// js/systems/utils.js

export function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function removeDeadEntities(array) {
    let writeIndex = 0;
    for (let readIndex = 0; readIndex < array.length; readIndex++) {
        if (!array[readIndex].isDead) {
            if (writeIndex !== readIndex) {
                 array[writeIndex] = array[readIndex];
            }
            writeIndex++;
        }
    }
    array.length = writeIndex;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

export class Rectangle {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
    }

    contains(point) {
        return (point.x >= this.x &&
                point.x < this.x + this.width &&
                point.y >= this.y &&
                point.y < this.y + this.height);
    }

    intersects(range) {
        return !(range.x > this.x + this.width ||
                 range.x + range.width < this.x ||
                 range.y > this.y + this.height ||
                 range.y + range.height < this.y);
    }
    
    intersectsCircle(cx, cy, cr) {
        const closestX = clamp(cx, this.x, this.x + this.width);
        const closestY = clamp(cy, this.y, this.y + this.height);
        const distanceX = cx - closestX;
        const distanceY = cy - closestY;
        const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
        return distanceSquared < (cr * cr);
    }
}

export class Quadtree {
    constructor(bounds, capacity = 4) {
        this.bounds = bounds;
        this.capacity = capacity;
        this.points = [];
        this.divided = false;
    }
    
    clear() {
        this.points = [];
        if (this.divided) {
            this.northeast.clear();
            this.northwest.clear();
            this.southeast.clear();
            this.southwest.clear();
        }
        this.divided = false;
    }

    subdivide() {
        let { x, y, width, height } = this.bounds;
        let w2 = width / 2;
        let h2 = height / 2;

        this.northeast = new Quadtree(new Rectangle(x + w2, y, w2, h2), this.capacity);
        this.northwest = new Quadtree(new Rectangle(x, y, w2, h2), this.capacity);
        this.southeast = new Quadtree(new Rectangle(x + w2, y + h2, w2, h2), this.capacity);
        this.southwest = new Quadtree(new Rectangle(x, y + h2, w2, h2), this.capacity);

        this.divided = true;
    }

    insert(point) {
        if (!this.bounds.contains(point)) {
            return false;
        }

        if (this.points.length < this.capacity) {
            this.points.push(point);
            return true;
        }
        
        if (!this.divided) {
            this.subdivide();
        }
        
        if (this.northeast.insert(point) || this.northwest.insert(point) || this.southeast.insert(point) || this.southwest.insert(point)) {
            return true;
        }
        
        return false;
    }

    query(range, found = []) {
        if (!this.bounds.intersects(range)) {
            return found;
        }
        
        for (let p of this.points) {
            if (range.contains(p) || range.intersectsCircle(p.x, p.y, p.radius || 0)) {
                found.push(p);
            }
        }
        
        if (this.divided) {
            this.northwest.query(range, found);
            this.northeast.query(range, found);
            this.southwest.query(range, found);
            this.southeast.query(range, found);
        }
        
        return found;
    }
}