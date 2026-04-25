/**
 * SpatialHash.js
 * 격자 기반 공간 분할을 사용하여 거리 계산 연산을 최적화합니다.
 */
export class SpatialHash {
    constructor(width, height, cellSize) {
        this.cellSize = cellSize;
        this.cols = Math.ceil(width / cellSize);
        this.rows = Math.ceil(height / cellSize);
        this.grid = new Array(this.cols * this.rows).fill(0).map(() => []);
    }

    clear() {
        for (let i = 0; i < this.grid.length; i++) {
            this.grid[i].length = 0;
        }
    }

    insert(obj) {
        const col = Math.floor(obj.x / this.cellSize);
        const row = Math.floor(obj.y / this.cellSize);
        
        if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
            this.grid[row * this.cols + col].push(obj);
        }
    }

    /**
     * 특정 위치와 반경 내에 있는 객체들을 반환합니다.
     */
    getNearby(x, y, radius) {
        const results = [];
        const startCol = Math.floor((x - radius) / this.cellSize);
        const endCol = Math.floor((x + radius) / this.cellSize);
        const startRow = Math.floor((y - radius) / this.cellSize);
        const endRow = Math.floor((y + radius) / this.cellSize);

        for (let r = Math.max(0, startRow); r <= Math.min(this.rows - 1, endRow); r++) {
            for (let c = Math.max(0, startCol); c <= Math.min(this.cols - 1, endCol); c++) {
                const cell = this.grid[r * this.cols + c];
                for (let i = 0; i < cell.length; i++) {
                    results.push(cell[i]);
                }
            }
        }
        return results;
    }
}
