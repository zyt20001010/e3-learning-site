// Application integration against a small DOM/storage test double, not a browser/layout test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {emptyProgress,emptyRecord,exportBackup,parseBackup,STORAGE_KEY} from '../js/progress.js';

test('direct point entry, reading depths, edits and navigation preserve existing course records',async()=>{
  const initial=emptyProgress();initial.depth='B';initial.records.jepa=emptyRecord();initial.records.jepa.note='旧课程笔记';initial.records.jepa.checks.B={read:true,compute:true,explain:true};
  const map=new Map([[STORAGE_KEY,exportBackup(initial)],['yanting-execution-e3-v1','original E3 sentinel']]);
  const listeners={},windowListeners={},elements=new Map();
  const fakeElement=()=>({innerHTML:'',textContent:'',hidden:false,value:'',dataset:{},style:{},classList:{toggle(){},add(){},contains(){return false;}},setAttribute(){},removeAttribute(){},querySelectorAll(){return [];},querySelector(){return null;},addEventListener(){},focus(){},scrollIntoView(){}});
  for(const key of ['#main','#sidebar-curriculum','.depth-switch','#storage-alert','#notice','#priority','#search','#note-status','.skip'])elements.set(key,fakeElement());
  const depthButtons=['A','B','C'].map(depth=>({...fakeElement(),dataset:{depth}}));
  let hash='#concept/stop-gradient';
  const location={get hash(){return hash;},set hash(v){hash=v.startsWith('#')?v:'#'+v;},href:'http://example.invalid/research/'};
  const saved={};
  const globals={
    document:{querySelector(selector){if(selector==='#main h1'){const m=elements.get('#main').innerHTML.match(/<h1>(.*?)<\/h1>/s);return m?{textContent:m[1]}:null;}return elements.get(selector)||null;},querySelectorAll(selector){return selector==='[data-depth]'?depthButtons:[];},addEventListener(event,fn){(listeners[event]??=[]).push(fn);},getElementById(){return null;},title:''},
    window:{localStorage:{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},addEventListener(event,fn){(windowListeners[event]??=[]).push(fn);},scrollTo(){}},
    location,
    history:{replaceState(a,b,url){location.hash=url;}},
    fetch:async path=>({ok:true,json:async()=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'))}),
    setTimeout:()=>0,clearTimeout:()=>{}
  };
  for(const [key,value] of Object.entries(globals)){saved[key]=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});}
  const fire=async(event,target)=>{for(const fn of listeners[event]||[])await fn({target,preventDefault(){}});};
  const click=dataset=>fire('click',{dataset,hasAttribute(){return false;},closest(){return this;}});
  const state=()=>parseBackup(map.get(STORAGE_KEY));
  const html=()=>elements.get('#main').innerHTML;
  const navigate=async path=>{location.hash=path;for(const fn of windowListeners.hashchange||[])await fn();};
  try{
    await import('../js/app.js?integration=atomic');
    assert(html().includes('<h1>停止梯度</h1>'),'direct entry renders without prerequisites');
    assert(html().includes('data-check-depth="A"'),'a new point opens at quick depth even if old courses used B');
    assert(!html().includes('source-extract'));assert.equal(state().depth,'B');
    await fire('change',{dataset:{check:'compute',node:'atom-stop-gradient',checkDepth:'A'},checked:true});
    await fire('input',{dataset:{note:'atom-stop-gradient'},value:'独立知识点笔记 <script>示例</script>'});
    await click({star:'atom-stop-gradient'});await click({review:'atom-stop-gradient'});
    assert(state().records['atom-stop-gradient'].checks.A.compute);assert(!state().records['atom-stop-gradient'].checks.B.compute);
    assert(state().records['atom-stop-gradient'].star);assert(state().records['atom-stop-gradient'].review);
    assert.deepEqual(state().records.jepa,initial.records.jepa);
    await click({depth:'B'});assert(location.hash.includes('depth=B'));assert(html().includes('source-extract'));
    await click({depth:'C'});assert(html().includes('data-check-depth="C" disabled'));
    await navigate('#lesson/jepa');assert(html().includes('旧课程笔记'));assert(html().includes('这些知识点可独立学习'));
    elements.get('#search').value='detach';
    await fire('submit',{id:'search-form'});assert(location.hash.includes('knowledge?q=detach'));assert(html().includes('href="#concept/stop-gradient"'));
    await fire('change',{id:'priority',value:'P0'});assert(location.hash.includes('priority=P0'));
    await navigate('#review');assert(html().includes('独立知识点笔记 &lt;script&gt;示例&lt;/script&gt;'));assert(html().includes('旧课程笔记'));
    for(const [path,text] of [['#mechanisms/aggregation','加权聚合'],['#problems/train-model','不清楚梯度和参数怎样更新'],['#papers/i-jepa','已核对范围的相关知识点'],['#compare','横向技术对比'],['#quality','独立知识点']]){
      await navigate(path);assert(html().includes(text),path);assert(!html().includes('内容暂时无法加载'),path);
    }
    await navigate('#home');assert(html().includes('遇到一个技术点'));assert(!html().includes('已写成的基础课程'));
    assert.equal(map.get('yanting-execution-e3-v1'),'original E3 sentinel');
    assert.equal(state().depth,'B','atom depth selection leaves the legacy course preference intact');
  }finally{for(const [key,descriptor] of Object.entries(saved)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});
