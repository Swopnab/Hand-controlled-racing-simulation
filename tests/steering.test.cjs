const test=require('node:test');
const assert=require('node:assert/strict');
const {calculateZone,mirroredPalm}=require('../steering.js');
const fixture=require('./fixtures/steering.json');
for(const item of fixture.cases) test(item.name,()=>{
    let previous=item.start;
    const actual=item.x.map(x=>previous=calculateZone(x,previous));assert.deepEqual(actual,item.zones);
});
test('landmarks mirror the palm and reject missing/nonfinite coordinates',()=>{
    const landmarks=Array.from({length:21},()=>({x:0.2,y:0.4}));
    assert.deepEqual(mirroredPalm(landmarks),{x:0.8,y:0.4});
    assert.equal(mirroredPalm([]),null);assert.equal(mirroredPalm(undefined),null);
    landmarks[9].x=NaN;assert.equal(mirroredPalm(landmarks),null);
});
test('off-frame finite positions are clamped and tracking can reacquire',()=>{
    const landmarks=Array.from({length:21},()=>({x:1.2,y:-0.2}));
    assert.deepEqual(mirroredPalm(landmarks),{x:0,y:0});
    assert.equal(calculateZone(NaN,'LEFT'),'CENTER');
    assert.equal(calculateZone(mirroredPalm(landmarks).x),'LEFT');
});
