const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// --- Controls ---
const imageUrlInput = document.getElementById('image-url');
const pixelSizeInput = document.getElementById('pixel-size');
const animationSpeedInput = document.getElementById('animation-speed');
const restartButton = document.getElementById('restart-button');
const animButtons = document.querySelectorAll('.anim-btn');

// --- State ---
let particles = [];
let image = new Image();
image.crossOrigin = "Anonymous";
let currentAnimation = 'renderBlocks';
let animationFrameId;

// --- Particle Class ---
class Particle {
    constructor(x, y, color) {
        this.originX = x;
        this.originY = y;
        this.color = color;
        this.x = 0;
        this.y = 0;
        this.dx = 0;
        this.dy = 0;
        this.vx = 0;
        this.vy = 0;
        this.size = 1;
        this.isSettled = false;
        this.revealTime = 0; // for time-based animations
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

// --- Animation Handlers ---
const animationHandlers = {
    renderBlocks: (p, frame) => {
        if (frame > p.revealTime) {
            p.x = p.originX;
            p.y = p.originY;
            p.isSettled = true;
        }
    },
    waveReveal: (p, frame) => {
        if (frame > p.revealTime && !p.isSettled) {
            p.vx = (p.originX - p.x) * 0.1 * (animationSpeedInput.value / 2);
            p.vy = (p.originY - p.y) * 0.1 * (animationSpeedInput.value / 2);
            p.x += p.vx;
            p.y += p.vy;
            if (Math.abs(p.x - p.originX) < 0.5 && Math.abs(p.y - p.originY) < 0.5) {
                p.x = p.originX;
                p.y = p.originY;
                p.isSettled = true;
            }
        }
    },
    unfurl: (p, frame) => {
        if (!p.isSettled) {
            p.vx += (p.originX - p.x) * 0.005 * animationSpeedInput.value;
            p.vy += (p.originY - p.y) * 0.005 * animationSpeedInput.value;
            p.vx *= 0.95;
            p.vy *= 0.95;
            p.x += p.vx;
            p.y += p.vy;

            if (Math.abs(p.x - p.originX) < 0.5 && Math.abs(p.y - p.originY) < 0.5) {
                p.x = p.originX;
                p.y = p.originY;
                p.isSettled = true;
            }
        }
    }
};

// --- Core Functions ---
function init() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    image.src = imageUrlInput.value;
    image.onerror = () => alert("Could not load image. Check the URL and try again.");
    image.onload = () => {
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        particles = [];
        const pixelSize = parseInt(pixelSizeInput.value);

        for (let y = 0; y < canvas.height; y += pixelSize) {
            for (let x = 0; x < canvas.width; x += pixelSize) {
                const index = (y * canvas.width + x) * 4;
                if (imageData[index + 3] > 128) {
                    const color = `rgba(${imageData[index]},${imageData[index+1]},${imageData[index+2]},${imageData[index+3]})`;
                    particles.push(new Particle(x, y, color));
                }
            }
        }
        setupAnimation();
        animate(0);
    };
}

function setupAnimation() {
    const pixelSize = parseInt(pixelSizeInput.value);
    particles.forEach(p => {
        p.isSettled = false;
        p.size = pixelSize;

        if (currentAnimation === 'renderBlocks') {
            const row = Math.floor(p.originY / 50);
            const col = Math.floor(p.originX / 50);
            p.revealTime = (row + col) * 10 + Math.random() * 20;
        } else if (currentAnimation === 'waveReveal') {
            p.x = p.originX;
            p.y = p.originY + canvas.height;
            p.revealTime = (p.originX * 0.5 + p.originY * 0.2) / (animationSpeedInput.value * 2);
        } else if (currentAnimation === 'unfurl') {
            p.x = canvas.width / 2;
            p.y = canvas.height / 2;
            p.vx = (Math.random() - 0.5) * 50;
            p.vy = (Math.random() - 0.5) * 50;
        }
    });
}

let frameCount = 0;
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const updateFn = animationHandlers[currentAnimation];
    let allSettled = true;

    particles.forEach(p => {
        if (!p.isSettled) {
            allSettled = false;
            updateFn(p, frameCount);
        }
        p.draw();
    });

    frameCount++;

    if (!allSettled) {
        animationFrameId = requestAnimationFrame(animate);
    }
}

// --- Event Listeners ---
animButtons.forEach(button => {
    button.addEventListener('click', () => {
        currentAnimation = button.dataset.anim;
        animButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        frameCount = 0;
        init();
    });
});

restartButton.addEventListener('click', () => {
    frameCount = 0;
    init();
});

// --- Initial Load ---
document.querySelector(`.anim-btn[data-anim="${currentAnimation}"]`).classList.add('active');
init();