const fireShaderVertex = `
    attribute vec2 position;
    varying vec2 vUv;

    void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
    }
`;

// Modified fragment shader for a more "HD" look
const fireShaderFragment = `
    precision highp float;
    uniform float time;
    uniform vec2 resolution;
    varying vec2 vUv;

    // Simplex noise implementation (simplified for fire effect)
    // https://gist.github.com/patriciogonzalezvivo/670c24e1692dfbced674
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);

        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);

        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;

        i = mod289(i);
        vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));

        float n_ = 0.142857142857;
        vec3  ns = n_ * D.wyz - D.xzx;

        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);

        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);

        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);

        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));

        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);

        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
        vec2 uv = vUv;
        uv.y = 1.0 - uv.y; // Flip Y for proper fire direction

        // Animate fire with movement
        float speed = 0.4; // Slightly slower speed
        float scale = 4.0; // Slightly larger scale
        float timeFactor = time * speed;

        // Create multiple noise patterns for added detail (Octaves)
        vec3 p = vec3(uv * scale, timeFactor);
        float noise1 = snoise(p);
        float noise2 = snoise(p * 2.0 + vec3(0.0, -timeFactor * 0.8, 0.0)) * 0.5; // Higher freq, faster scroll
        float noise3 = snoise(p * 4.0 + vec3(0.0, -timeFactor * 0.6, 0.0)) * 0.25; // Even higher freq
        float noise4 = snoise(p * 8.0 + vec3(0.0, -timeFactor * 0.4, 0.0)) * 0.125; // Highest freq

        // Combine noises (Weighted sum of octaves)
        float combinedNoise = noise1 + noise2 + noise3 + noise4;

        // Refine fire shape based on noise and Y position
        // Use a power function and smoothstep for better shape control
        float fire = pow(uv.y + combinedNoise * 0.4, 2.0); // Emphasize lower part, influence from noise
        fire = smoothstep(0.1, 1.0, fire); // Use a wider smoothstep range

        // More detailed color gradient with additional stops
        vec3 color = mix(
            vec3(0.05, 0.05, 0.05), // Near black base
            mix(
                vec3(0.8, 0.3, 0.0), // Dark Orange
                mix(
                    vec3(1.0, 0.7, 0.1), // Bright Orange/Yellow
                    vec3(1.0, 0.9, 0.5), // Pale Yellow
                    smoothstep(0.6, 1.0, fire) // Mix pale yellow at higher fire intensity
                ),
                smoothstep(0.3, 0.8, fire) // Mix bright orange/yellow earlier
            ),
            smoothstep(0.1, 0.5, fire) // Start mixing colors from the base
        );


        // Add more refined ember/sparkle highlights
        float ember = pow(snoise(p * 6.0 + vec3(0.0, -timeFactor * 3.0, 0.0)), 6.0) * smoothstep(0.1, 0.5, uv.y); // Higher power for sharper sparks, limit to lower Y
        ember += pow(snoise(p * 12.0 + vec3(0.0, -timeFactor * 5.0, 0.0)), 8.0) * smoothstep(0.0, 0.3, uv.y); // Even finer sparks

        color = mix(color, vec3(1.0, 1.0, 0.9), ember * 0.8); // Mix white-ish color for embers


        // Use the fire intensity and add fading towards the top for alpha
        // Use a curve for alpha for a softer falloff
        float alpha = fire * smoothstep(1.0, 0.5, uv.y); // Fade alpha as we go up
        alpha = clamp(alpha * 1.5, 0.0, 1.0); // Adjust overall alpha intensity and clamp


        // Output color with calculated alpha
        gl_FragColor = vec4(color, alpha);
    }
`;

class FireShader {
    constructor(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        // Make canvas fill container and prevent pointer events
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.display = 'block'; // Prevent extra space below canvas
        this.canvas.style.pointerEvents = 'none'; // Ensure clicks pass through to elements below
        this.container.appendChild(this.canvas);

        this.time = 0;
        this.initialized = false;
        this.animationFrameId = null; // To store requestAnimationFrame ID

        this.initWebGL();
        if (this.initialized) {
            // Bind event handlers once in the constructor
            this.onResize = this.onResize.bind(this);
            this.render = this.render.bind(this);

            window.addEventListener('resize', this.onResize);
            this.onResize(); // Initial size setup
            this.render();
        } else {
             // Clean up the canvas if WebGL init failed
             if (this.canvas.parentNode) {
                this.canvas.parentNode.removeChild(this.canvas);
             }
             console.error("FireShader failed to initialize, canvas removed.");
        }
    }

    initWebGL() {
        try {
            // Request WebGL context with alpha: true
            this.gl = this.canvas.getContext('webgl', { alpha: true }) || this.canvas.getContext('experimental-webgl', { alpha: true });
            if (!this.gl) {
                console.error("WebGL not supported");
                return;
            }

            const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, fireShaderVertex);
            const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fireShaderFragment);

            if (!vertexShader || !fragmentShader) {
                 console.error("Failed to compile shaders");
                 // Clean up potentially created shaders
                 if(vertexShader) this.gl.deleteShader(vertexShader);
                 if(fragmentShader) this.gl.deleteShader(fragmentShader);
                 return;
            }

            this.program = this.gl.createProgram();
            this.gl.attachShader(this.program, vertexShader);
            this.gl.attachShader(this.program, fragmentShader);
            this.gl.linkProgram(this.program);

            // Clean up shaders after linking
            this.gl.deleteShader(vertexShader);
            this.gl.deleteShader(fragmentShader);


            if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
                console.error("Shader program failed to link:", this.gl.getProgramInfoLog(this.program));
                // Cleanup program
                this.gl.deleteProgram(this.program);
                this.program = null;
                return;
            }

            // Enable blending for transparency
            this.gl.enable(this.gl.BLEND);
            // Use standard alpha blending (Src Alpha, One Minus Src Alpha)
            this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
            // Optional: Additive blending for brighter fire (can experiment)
            // this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);


            this.positionAttributeLocation = this.gl.getAttribLocation(this.program, "position");
            this.timeUniformLocation = this.gl.getUniformLocation(this.program, "time");
            this.resolutionUniformLocation = this.gl.getUniformLocation(this.program, "resolution");

            // Create a buffer for the square vertices
            const positionBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);

            // Vertices for a square that covers the whole canvas (-1 to +1 in clip space)
            const positions = [
                -1, -1,
                 1, -1,
                -1,  1,
                 1,  1
            ];
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

            // Store the buffer reference
            this.positionBuffer = positionBuffer;

            this.initialized = true;
            console.log("FireShader initialized successfully.");
        } catch (e) {
            console.error("FireShader initialization failed:", e);
            // Ensure program is null if initialization failed midway
            if(this.program) this.gl.deleteProgram(this.program);
            this.program = null;
            this.initialized = false; // Ensure initialized is false on error
        }
    }

    compileShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error("Shader compilation error:", this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    onResize() {
        // Ensure gl context and canvas exist before resizing
        if (!this.gl || !this.canvas) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        // Only resize if needed
        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
             // Update viewport and resolution uniform immediately on resize
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            if (this.program) { // Check if program exists before using it
                this.gl.useProgram(this.program);
                this.gl.uniform2f(this.resolutionUniformLocation, this.canvas.width, this.canvas.height);
            }
        }
    }

    render(timestamp = 0) {
        // Ensure WebGL is initialized before rendering
        if (!this.initialized || !this.gl || !this.program) {
             // Stop requesting frames if initialization failed
             if(this.animationFrameId) {
                 cancelAnimationFrame(this.animationFrameId);
                 this.animationFrameId = null;
             }
             // console.error("Cannot render: FireShader not initialized correctly."); // Avoid spamming console
             return;
        }

        this.time = timestamp / 1000;

        // Clear with a fully transparent color
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.useProgram(this.program);

        // Bind the position buffer and set up the attribute pointer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.enableVertexAttribArray(this.positionAttributeLocation);
        this.gl.vertexAttribPointer(this.positionAttributeLocation, 2, this.gl.FLOAT, false, 0, 0);


        // Update uniforms
        this.gl.uniform1f(this.timeUniformLocation, this.time);
        // Resolution uniform is updated in onResize, but updating here doesn't hurt
        this.gl.uniform2f(this.resolutionUniformLocation, this.canvas.width, this.canvas.height);


        // Draw the square (two triangles forming a strip)
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

        // Request the next frame
        this.animationFrameId = requestAnimationFrame(this.render);
    }

    // Add a cleanup method
    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        window.removeEventListener('resize', this.onResize);

        if (this.gl) {
             if (this.program) {
                 // Get attached shaders to detach/delete if necessary (optional, often linked program deletion is enough)
                 // const shaders = this.gl.getAttachedShaders(this.program);
                 // shaders.forEach(shader => this.gl.deleteShader(shader)); // Careful if shaders were already deleted
                 this.gl.deleteProgram(this.program);
             }
             if (this.positionBuffer) {
                this.gl.deleteBuffer(this.positionBuffer);
             }
             // More cleanup if textures, framebuffers, etc. were used
        }

        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        this.gl = null;
        this.program = null;
        this.canvas = null;
        this.container = null;
        this.initialized = false;
        this.positionBuffer = null;
        console.log("FireShader destroyed.");
    }
}

// Keep track of the shader instance for potential cleanup/re-initialization
let fireShaderInstance = null;

// Initialize fire shader when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const fireContainer = document.querySelector('.fire-container');
    if (fireContainer) {
        // Clean up any existing instance before creating a new one
        if (fireShaderInstance) {
            fireShaderInstance.destroy();
            fireShaderInstance = null;
            console.log("Existing FireShader instance destroyed before re-initialization.");
        }

        // Remove any non-canvas children that might have been added by older code versions
         Array.from(fireContainer.children).forEach(child => {
             // Check if the child is *not* a canvas element before removing
             if (child.tagName !== 'CANVAS') {
                 fireContainer.removeChild(child);
                 console.log("Removed non-canvas child from fire container.");
             }
         });


        // Create WebGL-based fire effect
        // Ensure no canvas exists before creating a new one (redundant with destroy, but safe)
        if (!fireContainer.querySelector('canvas')) {
             console.log("Initializing new FireShader...");
             fireShaderInstance = new FireShader(fireContainer);
        } else {
            // This case should ideally not be hit if destroy works correctly,
            // but log a warning just in case a canvas persists unexpectedly.
            console.warn("Canvas already exists in container after cleanup attempt. Skipping FireShader re-initialization.");
        }


    } else {
        console.error("Fire container element not found!");
    }
});

// Optional: Add a cleanup listener for development environments (like live updates)
// window.addEventListener('beforeunload', () => {
//     if (fireShaderInstance) {
//         fireShaderInstance.destroy();
//         fireShaderInstance = null;
//         console.log("FireShader instance destroyed on page unload.");
//     }
// });