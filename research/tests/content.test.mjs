import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import katex from 'katex';
import {LABS} from '../js/labs.js';
const read=async name=>JSON.parse(await readFile(new URL('../content/'+name+'.json',import.meta.url),'utf8'));
test('all original E3 scripts and curriculum remain byte-for-byte unchanged',async()=>{
  const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');
  const expected=JSON.parse(await readFile(new URL('./fixtures/original-script-hashes.json',import.meta.url),'utf8'));
  const current={};
  for(const [,id,source] of html.matchAll(/<script id="([^"]+)">([\s\S]*?)<\/script>/g))current[id]=createHash('sha256').update(source).digest('hex');
  assert.deepEqual(current,expected);
  assert.equal((html.match(/id="research-entry"/g)||[]).length,1);
  assert(html.includes('href="./research/"'));
});
test('coverage inventory and planned/completed states are explicit',async()=>{
  const catalog=await read('catalog');
  assert.equal(catalog.modules.length,10);assert.equal(catalog.groups.length,39);
  assert.equal(catalog.groups.reduce((s,g)=>s+g.coverage.length,0),916);
  assert.equal(catalog.concepts.length,910);
  for(const n of catalog.nodes){
    assert(['P0','P1','P2'].includes(n.priority));
    assert(n.nameEn);assert(n.minutes.A>0);assert(n.prerequisites);
    if(n.id.endsWith('-extensions'))assert(Object.values(n.status).every(x=>x===false));
  }
});
test('every Day guide has usable examples, resolved links and valid formulas',async()=>{
  const [first,others,book]=await Promise.all([read('day-one'),read('route-guides'),read('knowledge')]);
  const guides=[{...first,day:1},...others];
  assert.deepEqual(guides.map(guide=>guide.day),Array.from({length:14},(_,i)=>i+1));
  const points=new Set(book.items.map(point=>point.id)),labs=new Set(LABS.map(lab=>lab.id));
  const renderMath=tex=>katex.renderToString(tex,{throwOnError:true,strict:'error'});
  const inline=text=>{
    for(const [,formula] of text.matchAll(/\\\((.*?)\\\)/gs))renderMath(formula);
  };
  function checkBlock([kind,value]){
    if(kind==='eq'){assert(value[1]);renderMath(value[0]);}
    else if(kind==='p')inline(value);
    else if(kind==='table'){
      const [headers,rows]=value;
      for(const row of rows)assert.equal(row.length,headers.length);
      [...headers,...rows.flat()].forEach(inline);
    }else if(kind==='lab')assert(['line','rate'].includes(value));
    else if(kind==='source')assert.equal(new URL(value[0]).protocol,'https:');
    else assert.fail('Unknown guide block '+kind);
  }
  for(const guide of guides){
    const sections=guide.groups.flatMap(group=>group.sections);
    assert(sections.length>=2&&guide.application.length&&guide.exercises.length,guide.title);
    assert.equal(new Set(sections.map(section=>section.id)).size,sections.length);
    if(guide.core)for(const id of guide.core)assert(sections.some(section=>section.id===id));
    if(guide.focusExercise!==undefined)assert(guide.exercises[guide.focusExercise]);
    for(const section of sections){
      assert.match(section.id,/^[a-z0-9-]+$/);
      assert(section.blocks.length);
      for(const point of section.points)assert(points.has(point),point);
      if(section.standaloneSetup)inline(section.standaloneSetup);
      section.blocks.forEach(checkBlock);
    }
    for(const lab of guide.labs||[])assert(labs.has(lab),lab);
    guide.application.forEach(checkBlock);
    guide.code?.blocks.forEach(checkBlock);
    for(const exercise of guide.exercises){
      assert.equal(exercise.length,3);
      exercise.forEach(inline);
    }
  }
});
test('all 14 days meet workload limits and reuse canonical nodes',async()=>{
  const days=await read('route'),catalog=await read('catalog'),ids=new Set(catalog.nodes.map(n=>n.id));
  assert.equal(days.length,14);
  for(const day of days){
    assert(day.units.length>=3&&day.units.length<=5);
    assert.equal(day.units.reduce((s,u)=>s+u.minutes,0)+day.practiceMinutes,day.minutes);
    for(const u of day.units){
      assert(ids.has(u.nodeId));
      const lesson=await read('lessons/'+u.nodeId),entry=lesson.sections.find(s=>s.id===u.startSection);
      assert(entry,'daily unit must open an existing teaching section');
      assert(u.depth!=='A'||entry.depth==='A','A-level route must not land on a hidden B section');
    }
  }
});
test('comparisons and mathematical connections distinguish finished text from plans',async()=>{
  const comparisons=await read('comparisons'),connections=await read('connections');
  assert.equal(comparisons.length,42);assert.equal(connections.length,13);
  for(const c of comparisons)if(c.status==='ready'){
    assert.equal(c.rows.length,10);
    for(const row of c.rows)assert.equal(row.length,c.alternatives.length+1);
  }else assert.equal(c.rows.length,0);
});
test('rendered lesson code has a corresponding successful execution hash',async()=>{
  const report=await read('code-run-report');
  const files=await readdir(new URL('../content/lessons/',import.meta.url));
  for(const file of files.filter(f=>f.endsWith('.json'))){
    const n=JSON.parse(await readFile(new URL('../content/lessons/'+file,import.meta.url),'utf8'));
    for(const s of n.sections)if(s.code){
      const sha=createHash('sha256').update(s.code.source).digest('hex');
      assert(report.results.some(r=>r.id===n.id&&r.section===s.id&&r.ok&&r.sha256===sha),n.id);
    }
  }
});
