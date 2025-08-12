// js/systems/utils.js
export function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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