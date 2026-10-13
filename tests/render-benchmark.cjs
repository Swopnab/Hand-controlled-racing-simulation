const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path');
const {serve}=require('./server.cjs');
(async()=>{const site=await serve(path.resolve(__dirname,'..'));const browser=await chromium.launch({headless:true});const runs=[];try{
 for(const [width,height] of [[390,844],[768,1024],[1366,900]]){const p=await browser.newPage({viewport:{width,height}});await p.goto(site.url);runs.push(await p.evaluate(({width,height})=>{
  gameState=STATES.PAUSED;enemies=[];for(let i=0;i<10;i++){spawnEnemy();enemies[i].y=40+i*50;}
  for(let i=0;i<30;i++)draw();const samples=[];for(let i=0;i<300;i++){const start=performance.now();draw();samples.push(performance.now()-start);}samples.sort((a,b)=>a-b);
  return {viewport:[width,height],vehicles:10,samples:300,draw_submission_p50_ms:samples[150],draw_submission_p95_ms:samples[284]};
 },{width,height}));await p.close();}
 const report={fixture:'Paused synthetic scene, ten vehicles. Canvas JS command submission only; excludes GPU completion, physics and camera inference. Headless Chromium on local Mac.',runs};
 if(process.env.CYBERSTEER_BENCHMARK_OUTPUT)await fs.writeFile(process.env.CYBERSTEER_BENCHMARK_OUTPUT,JSON.stringify(report,null,2)+'\n');else console.log(JSON.stringify(report,null,2));
}finally{await browser.close();site.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
