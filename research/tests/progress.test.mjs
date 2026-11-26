import test from 'node:test';
import assert from 'node:assert/strict';
import {STORAGE_KEY,IMPORT_BACKUP_KEY,emptyProgress,emptyRecord,loadProgress,saveProgress,parseBackup,exportBackup,importProgress,selfChecked} from '../js/progress.js';
function memory(initial={}){
  const map=new Map(Object.entries(initial));return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),map};
}
test('Research never reads or overwrites original E3 state',()=>{
  const original='{"note":"original sentinel"}',s=memory({'yanting-execution-e3-v1':original});
  const loaded=loadProgress(s);assert.equal(loaded.state.format,'e3-research-progress');
  const state=loaded.state;state.records.attention=emptyRecord();state.records.attention.note='Research note';
  saveProgress(s,state);assert.equal(s.getItem('yanting-execution-e3-v1'),original);assert(s.getItem(STORAGE_KEY));
});
test('depth checks are independent and a read click is not completion',()=>{
  const r=emptyRecord();r.checks.A.read=true;assert(!selfChecked(r,'A'));r.checks.A.compute=true;r.checks.A.explain=true;
  assert(selfChecked(r,'A'));assert(!selfChecked(r,'B'));
});
test('round trip preserves Unicode notes and rejects another product backup',()=>{
  const s=emptyProgress();s.records.attention=emptyRecord();s.records.attention.note='注意力不等于因果效应 <script>☀</script>';
  assert.deepEqual(parseBackup(exportBackup(s)),s);
  assert.throws(()=>parseBackup('{"version":"E3","records":{}}'));
  assert.throws(()=>parseBackup('{invalid'));
});
test('malformed current storage is preserved and automatic saving is disabled',()=>{
  const s=memory({[STORAGE_KEY]:'broken'}),load=loadProgress(s);
  assert.equal(load.writable,false);assert.equal(s.getItem(STORAGE_KEY),'broken');
});
test('import merges newest records and saves original raw backup before writing',()=>{
  const s=memory(),old=emptyProgress(),incoming=emptyProgress();
  old.records.attention=emptyRecord();old.records.attention.note='newer note';old.records.attention.updatedAt=20;
  incoming.records.attention=emptyRecord();incoming.records.attention.note='old note';incoming.records.attention.updatedAt=10;
  incoming.records.sampling=emptyRecord();incoming.records.sampling.star=true;
  saveProgress(s,old);const before=s.getItem(STORAGE_KEY),merged=importProgress(s,exportBackup(incoming));
  assert.equal(merged.records.attention.note,'newer note');assert(merged.records.sampling.star);
  assert.equal(s.getItem(IMPORT_BACKUP_KEY),before);
});
test('invalid and oversized imports leave current records unchanged',()=>{
  const s=memory(),state=emptyProgress();saveProgress(s,state);const before=s.getItem(STORAGE_KEY);
  assert.throws(()=>importProgress(s,'{"format":"e3-research-progress","version":2}'));
  assert.equal(s.getItem(STORAGE_KEY),before);
  assert.throws(()=>parseBackup('x'.repeat(2*1024*1024+1)));
});
test('prototype-like keys are rejected and quota failure aborts before replacement',()=>{
  const raw='{"format":"e3-research-progress","version":1,"records":{"__proto__":{}},"answers":{}}';
  assert.throws(()=>parseBackup(raw));
  const previous=exportBackup(emptyProgress());
  const s={getItem:()=>previous,setItem:(key)=>{if(key===IMPORT_BACKUP_KEY)throw new Error('quota');assert.fail('must not replace state');}};
  assert.throws(()=>importProgress(s,previous));
});
test('explicit replacement can recover a corrupted value while preserving it',()=>{
  const s=memory({[STORAGE_KEY]:'damaged'});importProgress(s,exportBackup(emptyProgress()),false);
  assert.equal(s.getItem(IMPORT_BACKUP_KEY),'damaged');assert.equal(loadProgress(s).writable,true);
});
