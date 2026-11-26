import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import katex from 'katex';
import {atomRecordId,atomAvailable,atomMastered,searchAtoms,selectSourceSection} from '../js/knowledge-model.js';
import {createKnowledgeBase} from '../js/knowledge.js';
import {emptyProgress,emptyRecord,exportBackup,parseBackup,importProgress,saveProgress,STORAGE_KEY} from '../js/progress.js';
import {LABS,renderLab} from '../js/labs.js';
const read=async name=>JSON.parse(await readFile(new URL('../content/'+name+'.json',import.meta.url),'utf8'));
const book=await read('knowledge'),catalog=await read('catalog'),papers=await read('papers');
const byId=new Map(book.items.map(n=>[n.id,n]));
const getLesson=id=>read('lessons/'+id);

test('atomic restructuring preserves all existing courses, questions, labs and storage code',async()=>{
  const hashes=JSON.parse(await readFile(new URL('./fixtures/atomic-preservation.json',import.meta.url),'utf8'));
  for(const [path,hash] of Object.entries(hashes))assert.equal(createHash('sha256').update(await readFile(new URL('../'+path,import.meta.url))).digest('hex'),hash,path);
});
test('every original coverage entry retains an explicit nonempty mapping to stable atom IDs',()=>{
  assert.equal(book.coverageMap.length,catalog.concepts.length);
  assert.deepEqual(new Set(book.coverageMap.map(x=>x.originalId)),new Set(catalog.concepts.map(x=>x.id)));
  assert.equal(byId.size,book.items.length);
  assert(book.items.length+catalog.nodes.length<2000,'all potential records fit existing import limit');
  for(const n of book.items){assert.equal(n.recordId,'atom-'+n.id);assert(/^[a-z][a-z0-9-]{0,89}$/.test(n.recordId));}
  for(const entry of book.coverageMap){assert(entry.atomIds.length);for(const id of entry.atomIds)assert(byId.has(id),id);}
});
test('authored content has actual teaching, valid precise references and renderable mathematics',async()=>{
  const sourceIds=new Set(book.sources.map(s=>s.id)),labs=new Set(LABS.map(l=>l.id)),mechanisms=new Set(book.mechanisms.map(m=>m.id)),problems=new Set(book.problems.map(m=>m.id));
  for(const n of book.items){
    for(const id of n.related||[])assert(byId.has(id),n.id+' related '+id);
    for(const id of n.mechanisms)assert(mechanisms.has(id),n.id+' mechanism '+id);
    for(const id of n.problems)assert(problems.has(id),n.id+' problem '+id);
    if(!n.status.quick){assert(!n.status.technical);assert(!n.status.theory);continue;}
    for(const field of ['why','what','distinction','failure','research'])assert(n[field]?.length>12,n.id+' '+field);
    assert(n.io.input&&n.io.output,n.id+' io');assert(n.example.setup&&n.example.steps.length>=2&&n.example.result,n.id+' example');
    assert(n.formula.tex&&n.formula.explanation,n.id+' formula');assert(n.derivation.paragraphs.length>0,n.id+' derivation');
    assert(n.explainers.length>0,n.id+' local explainers');assert(n.check.verified,n.id+' independent numeric check');
    if(n.status.theory)assert(n.theory?.paragraphs?.length,n.id+' complete theory needs actual content');
    for(const eq of [n.formula,...n.derivation.equations,...(n.theory?.equations||[])])katex.renderToString(eq.tex,{throwOnError:true,strict:'error',trust:false});
    for(const id of n.references)assert(sourceIds.has(id),n.id+' source '+id);
    for(const ref of n.sourceRefs)selectSourceSection(await getLesson(ref.lessonId),ref);
    for(const id of n.codeLessons)assert((await getLesson(id)).sections.some(s=>s.code),n.id+' code '+id);
    if(n.labId)assert(labs.has(n.labId),n.id+' lab '+n.labId);
  }
});
test('local source extraction neither expands empty selectors nor tolerates invalid indices',()=>{
  const lesson={id:'example',sections:[{id:'L3',paragraphs:['keep','unrelated'],equations:[{tex:'x'}],table:{headers:['a'],rows:[[1],[2]]}}]};
  assert.deepEqual(selectSourceSection(lesson,{sectionId:'L3',paragraphs:[0],equations:[],tableRows:[]}),{paragraphs:['keep'],equations:[],table:null});
  assert.throws(()=>selectSourceSection(lesson,{sectionId:'L3',paragraphs:[2]}));
  assert.throws(()=>selectSourceSection(lesson,{sectionId:'missing'}));
});
test('related terms do not silently collapse distinct mathematical objects',()=>{
  const mapping=label=>book.coverageMap.find(x=>x.originalLabel===label)?.atomIds;
  const fourStages=mapping('Selection、Expansion、Simulation、Backpropagation');
  assert(fourStages.includes('mcts-backup'));assert(!fourStages.includes('backpropagation'));
  assert(!mapping('Score Function').includes('data-score'));
  assert(!mapping('Factorial Moment Measure').includes('factorial-moment'));
  assert.equal(new Set(mapping('DFT、FFT')).size,2);
  assert.equal(new Set(mapping('梯度消失、梯度爆炸')).size,2);
  assert(!byId.get('translation-equivariance').aliases.includes('translation invariance'));
  assert(searchAtoms(book.items,'translation invariance').some(n=>n.id==='translation-equivariance'),'related terms remain searchable');
});
test('Chinese, English, aliases and punctuation resolve to the same independent point',()=>{
  for(const q of ['Stop Gradient','stop_gradient','detach','停止梯度'])assert.equal(searchAtoms(book.items,q)[0]?.id,'stop-gradient',q);
  for(const q of ['LoRA','卷积核','ELBO','Gram Matrix'])assert(searchAtoms(book.items,q).some(n=>atomAvailable(n)),q);
  const filtered=searchAtoms(book.items,'',{content:'ready',priority:'P0'});
  assert(filtered.length>0);assert(filtered.every(n=>n.status.quick&&n.priority==='P0'));
});
test('old course completion never implies concept completion; both survive backup merge',()=>{
  const atom=byId.get('stop-gradient'),state=emptyProgress();
  state.records.jepa=emptyRecord();state.records.jepa.note='existing course';state.records.jepa.checks.A={read:true,compute:true,explain:true};
  assert(!atomMastered(atom,state));
  state.records[atomRecordId(atom)]=emptyRecord();state.records[atomRecordId(atom)].note='new atom';state.records[atomRecordId(atom)].checks.A={read:true,compute:true,explain:true};state.records[atomRecordId(atom)].star=true;
  assert(atomMastered(atom,state));assert(!atomMastered(atom,state,'B'));assert(!atomMastered(atom,state,'C'));
  assert.deepEqual(parseBackup(exportBackup(state)),state);
  const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};saveProgress(storage,state);
  const oldBackup=emptyProgress();oldBackup.records.backprop=emptyRecord();oldBackup.records.backprop.note='older device';
  const merged=importProgress(storage,exportBackup(oldBackup));
  assert.equal(merged.records.jepa.note,'existing course');assert.equal(merged.records[atomRecordId(atom)].note,'new atom');assert.equal(merged.records.backprop.note,'older device');assert(map.get(STORAGE_KEY));
  assert(!searchAtoms(book.items,'',{learning:'unmastered',state}).some(n=>n.id===atom.id));
  assert(searchAtoms(book.items,'',{learning:'star',state}).some(n=>n.id===atom.id));
});
test('paper method mappings exclude unreviewed papers and dangling concepts',()=>{
  for(const [id,ids] of Object.entries(book.paperMap)){
    const paper=papers.find(p=>p.id===id);assert(paper,id);if(ids.length)assert.equal(paper.status,'reviewed',id);
    for(const atom of ids)assert(byId.has(atom),id+' '+atom);
  }
  for(const [id,ids] of Object.entries(book.courseMap)){assert(catalog.nodes.some(n=>n.id===id));for(const atom of ids)assert(byId.has(atom));}
});
test('each authored point renders all depths from one node and keeps theoretical completion unavailable',async()=>{
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const p=s=>'<p>'+esc(s)+'</p>',link=(href,label)=>'<a href="'+esc(href)+'">'+esc(label)+'</a>';
  const ctx={book,esc,p,link,badge:p,table:(h,rs)=>'<table>'+rs.map(r=>'<tr>'+r.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</table>',hero:(t,s)=>'<h1>'+esc(t)+'</h1>'+p(s),references:ids=>ids.map(p).join(''),renderLab,getLesson,getState:()=>emptyProgress(),noteEditor:n=>'<textarea data-note="'+n.id+'"></textarea>',getPriority:()=> 'all',papers,courseName:id=>id};
  const kb=createKnowledgeBase(ctx);
  for(const n of book.items.filter(n=>n.status.quick)){
    const quick=await kb.concept(n.id,'A'),technical=await kb.concept(n.id,'B'),deep=await kb.concept(n.id,'C');
    assert(quick.includes(esc(n.example.result)),n.id);assert(quick.includes('data-node="'+atomRecordId(n)+'"'));
    assert(!quick.includes('source-extract'),n.id+' default is concise');assert(technical.includes('关键推导与计算条件'));
    assert(deep.includes('data-check-depth="C" disabled'),n.id+' theory disabled');
    assert(!quick.includes('undefined'),n.id+' undefined');
  }
  const pending=book.items.find(n=>!n.status.quick),html=await kb.concept(pending.id);
  assert(html.includes('专门教学内容尚未写成'));assert(!html.includes('data-check='));
});
