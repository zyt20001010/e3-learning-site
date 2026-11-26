import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
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
