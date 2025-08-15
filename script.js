class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game settings
        this.gridSize = 20;
        this.tileCount = this.canvas.width / this.gridSize;
        
        // Game state
        this.snake = [
            {x: 10, y: 10}
        ];
        this.food = {};
        this.dx = 0;
        this.dy = 0;
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
        this.gameRunning = false;
        this.gamePaused = false;
        this.wallMode = false;
        this.gameSpeed = 150;
        
        // Touch handling
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        
        this.init();
    }
    
    init() {
        this.updateHighScoreDisplay();
        this.generateFood();
        this.setupEventListeners();
        this.drawGame();
    }
    
    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Button controls
        document.getElementById('playAgain').addEventListener('click', () => this.resetGame());
        document.getElementById('toggleWalls').addEventListener('click', () => this.toggleWalls());
        
        // Mobile controls
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const direction = e.target.getAttribute('data-direction');
                this.handleDirectionChange(direction);
            });
        });
        
        // Touch controls for swipe with scroll prevention
        ['touchstart', 'touchend', 'touchmove'].forEach(event => {
            this.canvas.addEventListener(event, (e) => {
                e.preventDefault();
                if (event === 'touchstart') this.handleTouchStart(e);
                if (event === 'touchend') this.handleTouchEnd(e);
            }, { passive: false });
        });
    }
    
    handleKeyPress(e) {
        if (e.code === 'Space') {
            if (!this.gameRunning) {
                // If game is over, reset and start new game
                this.resetGame();
                this.startGame();
            } else {
                // If game is running, toggle pause
                this.togglePause();
            }
            return;
        }
        
        if (!this.gameRunning || this.gamePaused) return;
        
        const keyMap = {
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            'KeyW': 'up',
            'KeyS': 'down',
            'KeyA': 'left',
            'KeyD': 'right'
        };
        
        const direction = keyMap[e.code];
        if (direction) {
            e.preventDefault();
            this.handleDirectionChange(direction);
        }
    }
    
    handleDirectionChange(direction) {
        if (!this.gameRunning || this.gamePaused) return;
        
        const opposites = {
            'up': 'down',
            'down': 'up',
            'left': 'right',
            'right': 'left'
        };
        
        const directions = {
            'up': { dx: 0, dy: -1 },
            'down': { dx: 0, dy: 1 },
            'left': { dx: -1, dy: 0 },
            'right': { dx: 1, dy: 0 }
        };
        
        const currentDirection = this.getCurrentDirection();
        
        // Prevent reverse direction
        if (direction !== opposites[currentDirection]) {
            this.dx = directions[direction].dx;
            this.dy = directions[direction].dy;
        }
    }
    
    getCurrentDirection() {
        if (this.dx === 0 && this.dy === -1) return 'up';
        if (this.dx === 0 && this.dy === 1) return 'down';
        if (this.dx === -1 && this.dy === 0) return 'left';
        if (this.dx === 1 && this.dy === 0) return 'right';
        return null;
    }
    
    handleTouchStart(e) {
        const firstTouch = e.touches[0];
        this.touchStartX = firstTouch.clientX;
        this.touchStartY = firstTouch.clientY;
    }
    
    handleTouchEnd(e) {
        if (!this.touchStartX || !this.touchStartY) return;
        
        const lastTouch = e.changedTouches[0];
        this.touchEndX = lastTouch.clientX;
        this.touchEndY = lastTouch.clientY;
        
        this.handleSwipe();
    }
    
    handleSwipe() {
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;
        const minSwipeDistance = 30;
        
        if (Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) return;
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            this.handleDirectionChange(deltaX > 0 ? 'right' : 'left');
        } else {
            // Vertical swipe
            this.handleDirectionChange(deltaY > 0 ? 'down' : 'up');
        }
    }
    
    startGame() {
        if (this.gameRunning) return;
        
        this.gameRunning = true;
        this.gamePaused = false;
        this.hideGameOver();
        this.hidePauseScreen();
        
        // Start with initial movement
        this.dx = 1;
        this.dy = 0;
        
        this.gameLoop();
    }
    
    gameLoop() {
        if (!this.gameRunning || this.gamePaused) return;
        
        setTimeout(() => {
            this.update();
            this.drawGame();
            
            if (this.gameRunning) {
                this.gameLoop();
            }
        }, this.gameSpeed);
    }
    
    update() {
        const head = {x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy};
        
        // Handle wall collision or wrapping
        if (this.wallMode) {
            if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
                this.gameOver();
                return;
            }
        } else {
            // Wrap around edges
            if (head.x < 0) head.x = this.tileCount - 1;
            if (head.x >= this.tileCount) head.x = 0;
            if (head.y < 0) head.y = this.tileCount - 1;
            if (head.y >= this.tileCount) head.y = 0;
        }
        
        // Check self collision
        if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            this.gameOver();
            return;
        }
        
        this.snake.unshift(head);
        
        // Check food collision
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score++;
            this.updateScore();
            this.generateFood();
            this.increaseSpeed();
            
            // Add pulse animation to canvas
            this.canvas.classList.add('pulse');
            setTimeout(() => this.canvas.classList.remove('pulse'), 300);
        } else {
            this.snake.pop();
        }
    }
    
    generateFood() {
        do {
            this.food = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount)
            };
        } while (this.snake.some(segment => segment.x === this.food.x && segment.y === this.food.y));
    }
    
    increaseSpeed() {
        if (this.score % 5 === 0 && this.gameSpeed > 80) {
            this.gameSpeed -= 10;
        }
    }
    
    drawGame() {
        // Clear canvas
        this.ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-color');
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw food with pulsing effect
        this.drawFood();
        
        // Draw snake
        this.drawSnake();
    }
    
    drawGrid() {
        this.ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--grid-color');
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i <= this.tileCount; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.gridSize, 0);
            this.ctx.lineTo(i * this.gridSize, this.canvas.height);
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.gridSize);
            this.ctx.lineTo(this.canvas.width, i * this.gridSize);
            this.ctx.stroke();
        }
    }
    
    drawSnake() {
        this.snake.forEach((segment, index) => {
            if (index === 0) {
                // Draw head (green)
                this.ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--palestinian-green');
            } else {
                // Draw body (red)
                this.ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--palestinian-red');
            }
            
            const x = segment.x * this.gridSize;
            const y = segment.y * this.gridSize;
            
            this.ctx.fillRect(x + 1, y + 1, this.gridSize - 2, this.gridSize - 2);
            
            // Add some visual distinction for the head
            if (index === 0) {
                this.ctx.fillStyle = 'white';
                this.ctx.fillRect(x + 6, y + 4, 3, 3);
                this.ctx.fillRect(x + 11, y + 4, 3, 3);
            }
        });
    }
    
    drawFood() {
        const time = Date.now() / 200;
        const pulse = Math.sin(time) * 0.1 + 0.9;
        
        const x = this.food.x * this.gridSize;
        const y = this.food.y * this.gridSize;
        
        // Draw watermelon emoji
        this.ctx.font = `${this.gridSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Apply pulsing effect to the emoji
        const scale = pulse;
        this.ctx.save();
        this.ctx.translate(x + this.gridSize/2, y + this.gridSize/2);
        this.ctx.scale(scale, scale);
        this.ctx.fillText('🍉', 0, 0);
        this.ctx.restore();
    }
    
    togglePause() {
        if (!this.gameRunning) return;
        
        this.gamePaused = !this.gamePaused;
        
        if (this.gamePaused) {
            this.showPauseScreen();
        } else {
            this.hidePauseScreen();
            this.gameLoop();
        }
    }

    showPauseScreen() {
        document.getElementById('pauseScreen').classList.remove('hidden');
    }

    hidePauseScreen() {
        document.getElementById('pauseScreen').classList.add('hidden');
    }
    
    toggleWalls() {
        this.wallMode = !this.wallMode;
        document.getElementById('toggleWalls').textContent = `الجدران: ${this.wallMode ? 'تشغيل' : 'إيقاف'}`;
    }
    
    updateScore() {
        document.getElementById('score').textContent = this.score;
    }
    
    updateHighScoreDisplay() {
        document.getElementById('highScore').textContent = this.highScore;
    }
    
    gameOver() {
        this.gameRunning = false;
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('snakeHighScore', this.highScore);
            this.updateHighScoreDisplay();
        }
        
        document.getElementById('finalScore').textContent = this.score;
        this.showGameOver();
    }
    
    resetGame() {
        this.snake = [{x: 10, y: 10}];
        this.dx = 0;
        this.dy = 0;
        this.score = 0;
        this.gameSpeed = 150;
        this.gameRunning = false;
        this.gamePaused = false;
        
        this.updateScore();
        this.generateFood();
        this.drawGame();
        this.hideGameOver();
        this.startGame(); // Start the game immediately after reset
    }
    
    showGameOver() {
        document.getElementById('gameOver').classList.remove('hidden');
    }
    
    hideGameOver() {
        document.getElementById('gameOver').classList.add('hidden');
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new SnakeGame();
});