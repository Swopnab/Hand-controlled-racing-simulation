// Hand Tracking & Gesture Steering Module using MediaPipe Hands
let handLibrariesPromise;
function loadHandLibraries() {
    if (typeof Hands !== 'undefined' && typeof Camera !== 'undefined') return Promise.resolve();
    if (!handLibrariesPromise) {
        handLibrariesPromise = Promise.all(['camera_utils/camera_utils.js', 'hands/hands.js'].map(path =>
            new Promise((resolve, reject) => {
                const script = document.createElement('script');
                const timeout = setTimeout(() => {
                    script.remove();
                    reject(new Error('Hand tracking download timed out'));
                }, 10000);
                script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/' + path;
                script.crossOrigin = 'anonymous';
                script.onload = () => { clearTimeout(timeout); resolve(); };
                script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new Error('Hand tracking download failed')); };
                document.head.appendChild(script);
            })
        )).catch(error => { handLibrariesPromise = null; throw error; });
    }
    return handLibrariesPromise;
}

const handControl = {
    isActive: false,
    handDetected: false,
    currentZone: 'CENTER', // 'LEFT', 'CENTER', 'RIGHT'
    rawX: 0.5, // Normalized X position (0 to 1, mirrored for player perspective)
    rawY: 0.5,
    
    // Elements
    videoElement: null,
    canvasElement: null,
    canvasCtx: null,
    hands: null,
    camera: null,
    onFrame: null,

    // Thresholds with hysteresis
    thresholds: {
        leftBound: 0.38,
        rightBound: 0.62,
        hysteresis: 0.03
    },

    // Initialize webcam and MediaPipe Hands
    async init(videoEl, overlayCanvasEl) {
        this.stop();
        this.videoElement = videoEl;
        this.canvasElement = overlayCanvasEl;
        this.canvasCtx = overlayCanvasEl.getContext('2d');

        try {
            await loadHandLibraries();
            this.hands = new Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });

            this.hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.6,
                minTrackingConfidence: 0.6
            });

            this.hands.onResults((results) => this.onResults(results));

            this.camera = new Camera(this.videoElement, {
                onFrame: async () => {
                    if (this.isActive) {
                        await this.hands.send({ image: this.videoElement });
                    }
                },
                width: 320,
                height: 240
            });

            return true;
        } catch (err) {
            console.error('Error starting MediaPipe Hands:', err);
            return false;
        }
    },

    async start() {
        if (!this.camera) throw new Error('Camera is not initialized');
        this.isActive = true;
        try {
            await this.camera.start();
        } catch (error) {
            this.stop();
            throw error;
        }
    },

    stop() {
        this.isActive = false;
        this.handDetected = false;
        this.currentZone = 'CENTER';
        if (this.camera) {
            this.camera.stop();
        }
    },

    // Process Hand Landmarks
    onResults(results) {
        const ctx = this.canvasCtx;
        const w = this.canvasElement.width;
        const h = this.canvasElement.height;

        ctx.clearRect(0, 0, w, h);

        // Draw camera image mirrored
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(results.image, 0, 0, w, h);
        ctx.restore();

        // Draw visual zone guides (Left, Center, Right)
        this.drawZoneGuides(ctx, w, h);

        const landmarks = results.multiHandLandmarks?.[0];
        const palmCenter = CyberSteering.mirroredPalm(landmarks);
        if (palmCenter) {
            this.handDetected = true;

            // In mirrored space: x_mirrored = 1 - x_raw
            // Landmark 9 is the Middle MCP (palm center), landmark 0 is wrist
            this.rawX = palmCenter.x;
            this.rawY = palmCenter.y;

            // Determine zone
            this.currentZone = this.calculateZone(this.rawX, this.currentZone);

            // Draw glowing hand skeleton in mirrored orientation
            this.drawHandSkeleton(ctx, landmarks, w, h);
        } else {
            this.handDetected = false;
            // Retain last zone or default to CENTER when hand removed
            this.currentZone = 'CENTER';
        }

        if (this.onFrame) {
            this.onFrame();
        }
    },

    // Calculate zone with hysteresis to prevent twitching near borders
    calculateZone(x, prevZone) {
        return CyberSteering.calculateZone(x, prevZone, this.thresholds);
    },

    // Draw Left/Center/Right zone overlays on the camera preview
    drawZoneGuides(ctx, w, h) {
        const leftX = w * this.thresholds.leftBound;
        const rightX = w * this.thresholds.rightBound;

        // Highlight active zone
        ctx.fillStyle = 'rgba(0, 242, 254, 0.15)';
        if (this.currentZone === 'LEFT' && this.handDetected) {
            ctx.fillRect(0, 0, leftX, h);
        } else if (this.currentZone === 'CENTER' && this.handDetected) {
            ctx.fillRect(leftX, 0, rightX - leftX, h);
        } else if (this.currentZone === 'RIGHT' && this.handDetected) {
            ctx.fillRect(rightX, 0, w - rightX, h);
        }

        // Zone dividing lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);

        ctx.beginPath();
        ctx.moveTo(leftX, 0);
        ctx.lineTo(leftX, h);
        ctx.moveTo(rightX, 0);
        ctx.lineTo(rightX, h);
        ctx.stroke();
        ctx.setLineDash([]);

        // Zone Text Labels
        ctx.font = "bold 10px 'Segoe UI', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillStyle = this.currentZone === 'LEFT' && this.handDetected ? '#00f2fe' : 'rgba(255, 255, 255, 0.5)';
        ctx.fillText('LEFT', leftX / 2, 20);

        ctx.fillStyle = this.currentZone === 'CENTER' && this.handDetected ? '#00f2fe' : 'rgba(255, 255, 255, 0.5)';
        ctx.fillText('CENTER', (leftX + rightX) / 2, 20);

        ctx.fillStyle = this.currentZone === 'RIGHT' && this.handDetected ? '#00f2fe' : 'rgba(255, 255, 255, 0.5)';
        ctx.fillText('RIGHT', (rightX + w) / 2, 20);
    },

    // Draw futuristic neon cyber hand skeleton
    drawHandSkeleton(ctx, landmarks, w, h) {
        // Mirrored coordinate helper
        const getPt = (idx) => ({
            x: (1 - landmarks[idx].x) * w,
            y: landmarks[idx].y * h
        });

        // Skeleton connections
        const connections = [
            // Palm
            [0, 1], [0, 5], [5, 9], [9, 13], [13, 17], [0, 17],
            // Thumb
            [1, 2], [2, 3], [3, 4],
            // Index
            [5, 6], [6, 7], [7, 8],
            // Middle
            [9, 10], [10, 11], [11, 12],
            // Ring
            [13, 14], [14, 15], [15, 16],
            // Pinky
            [17, 18], [18, 19], [19, 20]
        ];

        // Draw glowing lines
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00f2fe';
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.8)';
        ctx.lineWidth = 2.5;

        connections.forEach(([i, j]) => {
            const p1 = getPt(i);
            const p2 = getPt(j);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        });

        // Draw joint nodes
        ctx.fillStyle = '#ffffff';
        landmarks.forEach((_, idx) => {
            const p = getPt(idx);
            const isFingertip = [4, 8, 12, 16, 20].includes(idx);
            ctx.beginPath();
            ctx.arc(p.x, p.y, isFingertip ? 4.5 : 2.5, 0, Math.PI * 2);
            ctx.fillStyle = isFingertip ? '#00f2fe' : '#ffffff';
            ctx.fill();
        });

        // Palm centroid reticle
        const centerPt = getPt(9);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerPt.x, centerPt.y, 8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }
};

window.handControl = handControl;
