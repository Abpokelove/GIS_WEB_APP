/**
 * Interactive Touchable Water Ripple & Wave Physics Engine
 * Generates realistic 2D wave equation water ripples on touch/click
 */

class InteractiveWaterCanvas {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        
        // Low-res simulation grid for 60fps physics
        this.simScale = 4;
        this.width = Math.floor(window.innerWidth / this.simScale);
        this.height = Math.floor(window.innerHeight / this.simScale);
        
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        this.size = this.width * this.height;
        this.buffer1 = new Float32Array(this.size);
        this.buffer2 = new Float32Array(this.size);
        this.damping = 0.965; // Water viscosity / ripple decay
        this.active = true;
        
        this.imgData = this.ctx.createImageData(this.width, this.height);
        this.data32 = new Uint32Array(this.imgData.data.buffer);
        
        this.initEvents();
        this.animate();
        
        // Create initial ambient drops for immediate visual delight
        setTimeout(() => this.drop(this.width * 0.3, this.height * 0.4, 25, 400), 500);
        setTimeout(() => this.drop(this.width * 0.7, this.height * 0.6, 30, 450), 1200);
    }
    
    initEvents() {
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.width = Math.floor(window.innerWidth / this.simScale);
            this.height = Math.floor(window.innerHeight / this.simScale);
            this.size = this.width * this.height;
            this.buffer1 = new Float32Array(this.size);
            this.buffer2 = new Float32Array(this.size);
            this.imgData = this.ctx.createImageData(this.width, this.height);
            this.data32 = new Uint32Array(this.imgData.data.buffer);
        });
        
        const triggerRipple = (clientX, clientY, strength = 350) => {
            if (!this.active) return;
            const x = Math.floor(clientX / this.simScale);
            const y = Math.floor(clientY / this.simScale);
            this.drop(x, y, 16, strength);
            this.createDomDroplet(clientX, clientY);
        };
        
        // Touch events
        window.addEventListener('touchstart', (e) => {
            for (let i = 0; i < e.touches.length; i++) {
                triggerRipple(e.touches[i].clientX, e.touches[i].clientY, 400);
            }
        }, { passive: true });
        
        window.addEventListener('touchmove', (e) => {
            for (let i = 0; i < e.touches.length; i++) {
                triggerRipple(e.touches[i].clientX, e.touches[i].clientY, 150);
            }
        }, { passive: true });
        
        // Mouse click & drag
        let isMouseDown = false;
        window.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            triggerRipple(e.clientX, e.clientY, 400);
        });
        
        window.addEventListener('mouseup', () => { isMouseDown = false; });
        
        window.addEventListener('mousemove', (e) => {
            if (isMouseDown) {
                triggerRipple(e.clientX, e.clientY, 200);
            }
        });
    }
    
    drop(x, y, radius, strength) {
        for (let j = -radius; j <= radius; j++) {
            for (let i = -radius; i <= radius; i++) {
                if (i * i + j * j < radius * radius) {
                    const px = x + i;
                    const py = y + j;
                    if (px > 0 && px < this.width - 1 && py > 0 && py < this.height - 1) {
                        const index = px + py * this.width;
                        this.buffer1[index] += strength * (1.0 - Math.sqrt(i * i + j * j) / radius);
                    }
                }
            }
        }
    }
    
    createDomDroplet(x, y) {
        const drop = document.createElement('div');
        drop.className = 'water-ripple-touch';
        drop.style.left = `${x}px`;
        drop.style.top = `${y}px`;
        document.body.appendChild(drop);
        setTimeout(() => drop.remove(), 800);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        if (!this.active) return;
        
        const w = this.width;
        const h = this.height;
        const b1 = this.buffer1;
        const b2 = this.buffer2;
        const damp = this.damping;
        const d32 = this.data32;
        
        let hasEnergy = false;
        
        // 2D Wave Propagation Simulation
        for (let y = 1; y < h - 1; y++) {
            const rowOffset = y * w;
            for (let x = 1; x < w - 1; x++) {
                const idx = rowOffset + x;
                
                // Laplacian approximation
                let val = (b1[idx - 1] + b1[idx + 1] + b1[idx - w] + b1[idx + w]) * 0.5 - b2[idx];
                val *= damp;
                b2[idx] = val;
                
                if (Math.abs(val) > 0.5) hasEnergy = true;
                
                // Compute refraction shading (cyan water caustics)
                const dx = b1[idx + 1] - b1[idx - 1];
                const dy = b1[idx + w] - b1[idx - w];
                
                let light = Math.floor(dx * 1.5 + dy * 1.5);
                if (light > 255) light = 255;
                if (light < -255) light = -255;
                
                if (Math.abs(light) > 3) {
                    const r = Math.min(255, Math.max(0, 6 + Math.floor(light * 0.4)));
                    const g = Math.min(255, Math.max(0, 182 + Math.floor(light * 0.5)));
                    const b = Math.min(255, Math.max(0, 212 + Math.floor(light * 0.6)));
                    const a = Math.min(180, Math.max(0, Math.abs(light) * 2));
                    d32[idx] = (a << 24) | (b << 16) | (g << 8) | r;
                } else {
                    d32[idx] = 0; // Transparent
                }
            }
        }
        
        // Swap wave buffers
        this.buffer1 = b2;
        this.buffer2 = b1;
        
        // Render to canvas
        this.ctx.putImageData(this.imgData, 0, 0);
        this.ctx.drawImage(this.canvas, 0, 0, w, h, 0, 0, this.canvas.width, this.canvas.height);
    }
    
    toggle() {
        this.active = !this.active;
        if (!this.active) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        return this.active;
    }
}

// Attach to window
window.InteractiveWaterCanvas = InteractiveWaterCanvas;
