// Pure steering rules shared by the browser and deterministic fixture tests.
(function (root) {
    const DEFAULT_THRESHOLDS = Object.freeze({leftBound:0.38,rightBound:0.62,hysteresis:0.03});
    function calculateZone(x, previousZone='CENTER', thresholds=DEFAULT_THRESHOLDS) {
        if (!Number.isFinite(x)) return 'CENTER';
        const {leftBound,rightBound,hysteresis}=thresholds;
        if (previousZone==='LEFT') return x>leftBound+hysteresis ? (x>rightBound?'RIGHT':'CENTER') : 'LEFT';
        if (previousZone==='RIGHT') return x<rightBound-hysteresis ? (x<leftBound?'LEFT':'CENTER') : 'RIGHT';
        return x<leftBound-hysteresis?'LEFT':x>rightBound+hysteresis?'RIGHT':'CENTER';
    }
    function mirroredPalm(landmarks) {
        if (!Array.isArray(landmarks)||landmarks.length<21||landmarks.some(point=>!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))) return null;
        const palm=landmarks[9];
        return {x:1-Math.min(1,Math.max(0,palm.x)),y:Math.min(1,Math.max(0,palm.y))};
    }
    const api={DEFAULT_THRESHOLDS,calculateZone,mirroredPalm};
    if(typeof module==='object'&&module.exports) module.exports=api;
    else root.CyberSteering=api;
})(typeof globalThis==='object'?globalThis:this);
