/** @typedef {import('./types.js').Progress} Progress */
/** @typedef {import('./types.js').LearningRecord} LearningRecord */
/** @typedef {import('./types.js').StorageLike} StorageLike */
/** @typedef {import('./types.js').Depth} Depth */
export const STORAGE_KEY = 'e3-research-progress-v1';
export const IMPORT_BACKUP_KEY = 'e3-research-before-import-v1';
const LIMIT = 2 * 1024 * 1024;
/** @param {unknown} value @returns {Record<string,unknown>} */
function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('进度格式错误：需要 JSON 对象');
  return /** @type {Record<string,unknown>} */(value);
}
/** @param {unknown} x */
function time(x) {return typeof x==='number' && Number.isFinite(x) && x>=0 ? x : 0;}
/** @param {string} id */
function validId(id) {return /^[a-z][a-z0-9-]{0,89}$/.test(id) && !['constructor','prototype','__proto__'].includes(id);}
/** @returns {LearningRecord} */
export function emptyRecord() {
  const checks=()=>({read:false,compute:false,explain:false});
  return {checks:{A:checks(),B:checks(),C:checks()},note:'',star:false,review:false,updatedAt:0};
}
/** @returns {Progress} */
export function emptyProgress() {
  return {format:'e3-research-progress',version:1,updatedAt:0,depth:'A',records:{},answers:{}};
}
/** @param {unknown} input @returns {Progress} */
export function normalizeProgress(input) {
  const o=object(input);
  if(o.format!=='e3-research-progress'||o.version!==1) throw new Error('这不是 E3 Research v1 进度文件；原 E3 的备份请在原站恢复。');
  const state=emptyProgress();state.updatedAt=time(o.updatedAt);
  if(o.depth==='A'||o.depth==='B'||o.depth==='C')state.depth=o.depth;
  const records=object(o.records),answers=object(o.answers);
  if(Object.keys(records).length>2000||Object.keys(answers).length>10000)throw new Error('备份条目过多');
  for(const [id,value] of Object.entries(records)){
    if(!validId(id))throw new Error('无效的课程编号');
    const r=object(value),out=emptyRecord();
    if(typeof r.note!=='string'||r.note.length>20000)throw new Error('笔记格式错误或超过 20,000 字符');
    out.note=r.note;out.star=r.star===true;out.review=r.review===true;out.updatedAt=time(r.updatedAt);
    const checks=object(r.checks);
    for(const depth of /** @type {Depth[]} */(['A','B','C'])){
      const c=object(checks[depth]);
      out.checks[depth]={read:c.read===true,compute:c.compute===true,explain:c.explain===true};
    }
    state.records[id]=out;
  }
  for(const [id,value] of Object.entries(answers)){
    if(!validId(id))throw new Error('无效的题目编号');
    const a=object(value);
    if(typeof a.selected!=='number'||!Number.isInteger(a.selected)||a.selected<0||a.selected>20)throw new Error('作答记录不合法');
    state.answers[id]={selected:a.selected,attempts:typeof a.attempts==='number'&&Number.isInteger(a.attempts)&&a.attempts>0?a.attempts:1,updatedAt:time(a.updatedAt)};
  }
  return state;
}
/** @param {string} text */
export function parseBackup(text) {
  if(typeof text!=='string'||new TextEncoder().encode(text).length>LIMIT)throw new Error('备份文件不能超过 2 MB');
  let parsed;try{parsed=JSON.parse(text);}catch{throw new Error('文件不是有效的 JSON；当前记录未改变。');}
  return normalizeProgress(parsed);
}
/** @param {Progress} state */
export function exportBackup(state) {return JSON.stringify(normalizeProgress(state),null,2);}
/** @param {StorageLike} storage */
export function loadProgress(storage) {
  try {
    const raw=storage.getItem(STORAGE_KEY);
    return {state:raw?parseBackup(raw):emptyProgress(),writable:true,error:''};
  }catch(error){
    return {state:emptyProgress(),writable:false,error:'浏览器中的 Research 记录无法读取，已停止自动覆盖。请先导出原始记录或恢复有效备份。'+String(error)};
  }
}
/** @param {StorageLike} storage @param {Progress} state */
export function saveProgress(storage,state) {
  const normalized=normalizeProgress(state);normalized.updatedAt=Date.now();
  storage.setItem(STORAGE_KEY,JSON.stringify(normalized));return normalized;
}
/** Preserve the raw current value first, including a damaged value, before replacement.
 * @param {StorageLike} storage @param {string} raw @param {boolean} [merge] */
export function importProgress(storage,raw,merge=true) {
  const incoming=parseBackup(raw),previous=storage.getItem(STORAGE_KEY);
  if(merge&&previous){
    const current=parseBackup(previous);
    for(const [id,r] of Object.entries(current.records)){
      const n=incoming.records[id];
      if(!n||r.updatedAt>n.updatedAt)incoming.records[id]=r;
    }
    for(const [id,a] of Object.entries(current.answers)){
      const n=incoming.answers[id];
      if(!n||a.updatedAt>n.updatedAt)incoming.answers[id]=a;
    }
  }
  // If creating the safeguard fails, abort before touching the actual state.
  if(previous!==null)storage.setItem(IMPORT_BACKUP_KEY,previous);
  return saveProgress(storage,incoming);
}
/** @param {LearningRecord|undefined} record @param {Depth} depth */
export function selfChecked(record,depth) {
  const c=record?.checks[depth];return Boolean(c?.read&&c?.compute&&c?.explain);
}
