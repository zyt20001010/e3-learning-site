import {readFile,writeFile,readdir,mkdir,cp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import katex from 'katex';
import {LABS} from '../js/labs.js';
const root=fileURLToPath(new URL('..',import.meta.url));
const content=path.join(root,'content');
const read=async name=>JSON.parse(await readFile(path.join(content,name+'.json'),'utf8'));
const write=async(name,data)=>writeFile(path.join(content,name+'.json'),JSON.stringify(data,null,2)+'\n');
const catalog=await read('catalog'),sources=await read('sources'),route=await read('route');
const comparisons=await read('comparisons'),topics=await read('topics'),papers=await read('papers');
const runs=(await read('code-run-report')).results;
const ids=new Set(catalog.nodes.map(n=>n.id)),sourceIds=new Set(sources.map(s=>s.id)),labIds=new Set(LABS.map(l=>l.id));
assert.equal(ids.size,catalog.nodes.length,'课程 ID 不可重复');
assert.equal(sourceIds.size,sources.length,'来源 ID 不可重复');
const lessons=[],questions=[],search=[];
let equations=0;
for(const file of (await readdir(path.join(content,'lessons'))).filter(f=>f.endsWith('.json')).sort()){
  const n=JSON.parse(await readFile(path.join(content,'lessons',file),'utf8'));
  assert(ids.has(n.id),'正文应有对应目录 '+n.id);
  assert(n.name&&n.nameEn&&n.summary&&n.module&&n.priority);
  assert.deepEqual(n.sections.map(s=>s.id),['L0','L1','L2','L3','L4','L5','L6','L7','L8']);
  for(const s of n.sections){
    assert(s.title&&s.paragraphs.length>0,n.id+' '+s.id+' 内容为空');
    assert(['A','B','C'].includes(s.depth));
    for(const eq of s.equations||[]){assert(eq.explanation,n.id+' 缺公式符号解释');katex.renderToString(eq.tex,{throwOnError:true,strict:'error',trust:false});equations++;}
    if(s.code){
      const hash=createHash('sha256').update(s.code.source).digest('hex');
      assert(runs.some(r=>r.id===n.id&&r.section===s.id&&r.ok&&r.sha256===hash),n.id+' 代码尚未按当前版本运行');
    }
  }
  for(const id of [...n.prerequisites,...n.related])assert(ids.has(id),n.id+' 引用未知节点 '+id);
  for(const id of n.references)assert(sourceIds.has(id),n.id+' 引用未知来源 '+id);
  assert(n.questions.length>=2,n.id+' 缺自测');
  for(const q of n.questions){
    assert(q.prompt&&q.explanation&&q.options.length>=2);
    assert(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length,n.id+' 题目索引不合法');
    questions.push({...q,nodeId:n.id});
  }
  n.lab=labIds.has(n.id)?n.id:null;
  n.status.interactive=Boolean(n.lab);
  n.status.literature=n.references.length>0&&n.references.every(id=>sources.find(s=>s.id===id).status==='verified');
  // Editorial review is explicit and independent of successful parsing or code execution.
  const audit=await read('editorial-review');
  n.status.audit=audit.reviewedIds.includes(n.id);
  await writeFile(path.join(content,'lessons',file),JSON.stringify(n,null,2)+'\n');
  const index=catalog.nodes.findIndex(x=>x.id===n.id),prior=catalog.nodes[index];
  catalog.nodes[index]={...prior,...n,sections:[],questions:[]};
  const text=[n.name,n.nameEn,n.summary,...n.sections.flatMap(s=>[s.title,...s.paragraphs,...(s.steps||[]),...(s.equations||[]).map(e=>e.explanation),...(s.table?.rows||[]).flat()])].join(' ');
  search.push({id:n.id,title:n.name,kind:'lesson',text});
  lessons.push(n);
}
for(const n of catalog.nodes.filter(n=>!lessons.some(l=>l.id===n.id))){
  assert(n.status.eli5===false&&n.status.audit===false,'目录不能冒充完成课程');
  search.push({id:n.id,title:n.name,kind:'lesson',text:[n.name,n.nameEn,n.summary,...(n.catalogTopics||[])].join(' ')});
}
assert.equal(new Set(questions.map(q=>q.id)).size,questions.length,'题目 ID 重复');
assert.equal(route.length,14);
for(const day of route){
  assert(day.units.length>=3&&day.units.length<=5);
  assert(day.minutes>=180&&day.minutes<=240);
  assert.equal(day.units.reduce((s,u)=>s+u.minutes,0)+day.practiceMinutes,day.minutes);
  assert.equal(day.schedule.reduce((s,u)=>s+u.minutes,0),day.minutes);
  for(const u of day.units)assert(ids.has(u.nodeId),'路线未知引用 '+u.nodeId);
}
for(const item of [...comparisons,...topics,...papers])for(const id of item.nodes)assert(ids.has(id),'未知交叉引用 '+id);
for(const paper of papers){assert(['reviewed','bibliography','pending'].includes(paper.status));search.push({id:paper.id,title:paper.title,kind:'paper',text:[paper.title,paper.summary,...Object.values(paper.fields||{})].join(' ')});}
for(const source of sources){const url=new URL(source.url);assert(['https:','http:'].includes(url.protocol));}
// Prerequisites must form a DAG. Related links can form cycles.
const seen=new Set(),visiting=new Set(),map=new Map(catalog.nodes.map(n=>[n.id,n]));
function visit(id){if(seen.has(id))return;assert(!visiting.has(id),'先修知识存在环 '+id);visiting.add(id);for(const p of map.get(id).prerequisites)visit(p);visiting.delete(id);seen.add(id);}
for(const id of ids)visit(id);
const target=path.join(root,'vendor','katex');await mkdir(target,{recursive:true});
for(const file of ['katex.min.js','katex.min.css'])await cp(path.join(root,'node_modules','katex','dist',file),path.join(target,file));
await cp(path.join(root,'node_modules','katex','dist','contrib','auto-render.min.js'),path.join(target,'auto-render.min.js'));
await cp(path.join(root,'node_modules','katex','dist','fonts'),path.join(target,'fonts'),{recursive:true});
await cp(path.join(root,'node_modules','katex','LICENSE'),path.join(target,'LICENSE'));
await write('catalog',catalog);await write('questions',questions);await write('search',search);
const report={builtOn:'2026-11-26',formatVersion:1,modules:catalog.modules.length,groups:catalog.groups.length,nodes:catalog.nodes.length,lessons:lessons.length,coverageEntries:catalog.concepts.length,coverageOccurrences:catalog.groups.reduce((s,g)=>s+g.coverage.length,0),routeDays:route.length,questions:questions.length,equations,interactiveLabs:LABS.length,verifiedExamples:runs.filter(r=>r.ok).length,sources:sources.length,comparisonsWritten:comparisons.filter(c=>c.status==='ready').length,comparisonsPlanned:comparisons.filter(c=>c.status!=='ready').length,prerequisiteDAG:true,editoriallyReviewed:lessons.filter(n=>n.status.audit).length,sourceFiles:await Promise.all(lessons.map(async n=>({id:n.id,sha256:createHash('sha256').update(await readFile(path.join(content,'lessons',n.id+'.json'))).digest('hex')})))};
await write('build-report',report);
console.log(JSON.stringify({...report,sourceFiles:report.sourceFiles.length},null,2));
