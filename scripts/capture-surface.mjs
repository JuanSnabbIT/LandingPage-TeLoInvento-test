import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const b=await chromium.launch({headless:true}); const results=[];
await fs.mkdir('docs/qa/surface',{recursive:true});
for(const [device,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]) {
 const p=await b.newPage({viewport});const errors=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await p.goto('http://localhost:5199/?debug&force3d');await p.waitForFunction(()=>!!window.__scene);
 await p.addStyleTag({content:'[class*="gsap-marker"]{visibility:hidden!important}'});await p.waitForTimeout(1500);
 const selectors=['.hero__anchor','.problema .visual','.solucion .photo-ph','.capacidades__stage','.valor .visual','.proceso .visual'];
 for(let i=0;i<selectors.length;i++){
  const y=await p.locator(selectors[i]).evaluate(el=>el.getBoundingClientRect().top+scrollY-(innerHeight-el.getBoundingClientRect().height)/2);
  await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(1000);await p.screenshot({path:`docs/qa/surface/${device}-${i}.png`});
  results.push({device,i,y,scene:await p.evaluate(()=>window.__scene.resolve())});
 }
 results.push({device,errors});await p.close();
}
await fs.writeFile('docs/qa/surface/states.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));await b.close();
