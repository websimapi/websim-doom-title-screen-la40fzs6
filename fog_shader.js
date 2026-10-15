const fogShaderVertex = `
    attribute vec2 position;
    varying vec2 vUv;

    void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
    }
`;

// Fragment shader for an animated fog effect
const fogShaderFragment = `
    precision highp float;
    uniform float time;
    uniform vec2 resolution;
    varying vec2 vUv;

    // Simplex noise implementation (similar to fire shader)
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
        uv.y = 1.0 - uv.y; // Flip Y so 0 is top, 1 is bottom (of the container, now full page)

        // Animate noise
        float speed = 0.1; // Slower speed for fog
        float scale = 2.5; // Increased scale for noise (stronger effect)
        float timeFactor = time * speed;

        // Combine multiple noise octaves for detail
        vec3 p = vec3(uv * scale, timeFactor);
        // Increased base noise influence and added more variation
        float noise = snoise(p) * 1.0; // Base noise influence increased
        noise += snoise(p * 2.0 + vec3(timeFactor * 0.5, timeFactor * 0.2, 0.0)) * 0.3; // Add some horizontal & vertical movement
        noise += snoise(p * 4.0 - vec3(timeFactor * 0.2, timeFactor * 0.1, 0.0)) * 0.15; // Add some horizontal & vertical movement
        noise += snoise(p * 0.5 + vec3(timeFactor * 0.1, timeFactor * 0.05, 0.0)) * 0.2; // Larger scale movement

        // Map noise from [-1, 1] to [0, 1]
        float noiseDensity = (noise + 1.0) * 0.5;

        // Shape the fog density based on vertical position within the *full page* (uv.y is 0 at top, 1 at bottom)
        // Make it densest at the top (uv.y=0) and fade out towards the bottom (uv.y=1)
        // Use a smoothstep to control the fade curve
        // Adjusted smoothstep range to make the fade happen more in the top portion
        float verticalFade = smoothstep(0.8, 0.2, uv.y); // Fade starts around 20% from the bottom (uv.y=0.2) and ends at 80% (uv.y=0.8)

        // Combine noise density with vertical fade
        float finalDensity = noiseDensity * verticalFade;

        // Apply a curve and multiplier to make it stronger and denser
        // Reduced exponent for a higher base density and more prominent clouds
        // Weakened the effect slightly by reducing the multiplier and adjusting the exponent slightly upwards
        finalDensity = pow(finalDensity, 0.9); // Adjusted from 0.8 towards 1.0 to weaken curve influence
        finalDensity = finalDensity * 1.3; // Reduced overall density multiplier from 1.8 to 1.3

        // Clamp density to ensure it stays between 0 and 1
        finalDensity = clamp(finalDensity, 0.0, 1.0);


        // Define fog colors based on the provided image gradient
        vec3 deepMaroon = vec3(0.2, 0.0, 0.0);       // Darkest base
        vec3 mediumRedOrange = vec3(0.8, 0.2, 0.0);  // Mid-range color
        vec3 brightOrangeRed = vec3(1.0, 0.5, 0.0);  // Brighter orange/red
        vec3 paleYellow = vec3(1.0, 0.9, 0.6);       // For highlights

        // Interpolate between colors based on density using smoothstep for transitions
        vec3 color = mix(deepMaroon, mediumRedOrange, smoothstep(0.0, 0.3, finalDensity));
        color = mix(color, brightOrangeRed, smoothstep(0.2, 0.7, finalDensity));
        color = mix(color, paleYellow, smoothstep(0.6, 1.0, finalDensity));


        // Output color and use finalDensity as alpha
        // This inherently makes areas with low density (closer to deepMaroon) more transparent.
        // Areas with high density (closer to paleYellow) will be more opaque.
        // This fulfills the requirement for transparency "where there is white" (meaning low density/darker areas).
        gl_FragColor = vec4(color, finalDensity);
    }
`;

class FogShader {
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
             console.error("FogShader failed to initialize, canvas removed.");
        }
    }

    initWebGL() {
        try {
            // Request WebGL context with alpha: true
            this.gl = this.canvas.getContext('webgl', { alpha: true }) || this.canvas.getContext('experimental-webgl', { alpha: true });
            if (!this.gl) {
                console.error("WebGL not supported for Fog");
                return;
            }

            const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, fogShaderVertex);
            const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fogShaderFragment);

            if (!vertexShader || !fragmentShader) {
                 console.error("Failed to compile fog shaders");
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
                console.error("Fog shader program failed to link:", this.gl.getProgramInfoLog(this.program));
                // Cleanup program
                this.gl.deleteProgram(this.program);
                this.program = null;
                return;
            }

            // Enable blending for transparency
            this.gl.enable(this.gl.BLEND);
            // Use standard alpha blending (Src Alpha, One Minus Src Alpha)
            this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);


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
            console.log("FogShader initialized successfully.");
        } catch (e) {
            console.error("FogShader initialization failed:", e);
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
            console.error("Fog Shader compilation error:", this.gl.getShaderInfoLog(shader));
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
                 this.gl.deleteProgram(this.program);
             }
             if (this.positionBuffer) {
                this.gl.deleteBuffer(this.positionBuffer);
             }
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
        console.log("FogShader destroyed.");
    }
}

// Keep track of the shader instance for potential cleanup/re-initialization
let fogShaderInstance = null;

// Initialize fog shader when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const fogContainer = document.querySelector('.fog-container');
    if (fogContainer) {
        // Clean up any existing instance before creating a new one
        if (fogShaderInstance) {
            fogShaderInstance.destroy();
            fogShaderInstance = null;
            console.log("Existing FogShader instance destroyed before re-initialization.");
        }

        // Remove any non-canvas children that might have been added by older code versions
         Array.from(fogContainer.children).forEach(child => {
             // Check if the child is *not* a canvas element before removing
             if (child.tagName !== 'CANVAS') {
                 fogContainer.removeChild(child);
                 console.log("Removed non-canvas child from fog container.");
             }
         });

        // Create WebGL-based fog effect
        // Ensure no canvas exists before creating a new one (redundant with destroy, but safe)
        if (!fogContainer.querySelector('canvas')) {
             console.log("Initializing new FogShader...");
             fogShaderInstance = new FogShader(fogContainer);
        } else {
            // This case should ideally not be hit if destroy works correctly,
            // but log a warning just in case a canvas persists unexpectedly.
            console.warn("Canvas already exists in fog container after cleanup attempt. Skipping FogShader re-initialization.");
        }

    } else {
        console.error("Fog container element not found!");
    }
});

// Optional: Add a cleanup listener for development environments (like live updates)
// window.addEventListener('beforeunload', () => {
//     if (fogShaderInstance) {
//         fogShaderInstance.destroy();
//         fogShaderInstance = null;
//         console.log("FogShader instance destroyed on page unload.");
//     }
// });