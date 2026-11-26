import {STORAGE_KEY,IMPORT_BACKUP_KEY,emptyProgress,emptyRecord,loadProgress,saveProgress,parseBackup,exportBackup,importProgress,selfChecked} from './progress.js';
import {LABS,renderLab,activateLabs} from './labs.js';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const p=s=>'<p>'+esc(s)+'</p>';
const list=xs=>'<ul>'+xs.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
const badge=(s,c='')=>'<span class="badge '+c+'">'+esc(s)+'</span>';
const link=(href,label)=>'<a href="'+esc(href)+'">'+esc(label)+'</a>';
const table=(heads,rows)=>'<div class="table-wrap"><table><thead><tr>'+heads.map(x=>'<th scope="col">'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
const safeURL=url=>{try{const u=new URL(url,location.href);return ['https:','http:'].includes(u.protocol)?u.href:'#';}catch{return '#';}};
const external=(url,label)=>'<a href="'+esc(safeURL(url))+'" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a>';
const sectionTitle=s=>s.title.replace(/^L[0-8]\s*[·:：.-]\s*/,'');
const labels={eli5:'直觉',example:'手算',definition:'定义',derivation:'推导',code:'代码运行',interactive:'交互实验',literature:'来源核验',audit:'质量复核'};
let data,byId,sourceMap,questions,searchIndex,renderToken=0,noticeTimer,importText='',lessonCache=new Map(),priority='all';
let storage,writable=true,state=emptyProgress();
try{storage=window.localStorage;const result=loadProgress(storage);state=result.state;writable=result.writable;if(result.error)storageError(result.error);}
catch{storageError('当前浏览器不能保存记录，操作仅在本次页面中保留。请使用“导出备份”。');writable=false;}
function storageError(message){const el=$('#storage-alert');el.textContent=message;el.hidden=false;}
function toast(message){const el=$('#notice');el.textContent=message;el.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{el.hidden=true;},4500);}
function persist(){
  if(!writable)return;
  try{state=saveProgress(storage,state);}catch{writable=false;storageError('学习记录暂时无法保存（浏览器容量或权限）。请立即导出备份；现有记录未被清空。');}
}
function record(id){return state.records[id]??=emptyRecord();}
function ready(n){return Boolean(n?.status.eli5&&n.status.example&&n.status.definition);}
function availableAt(n,depth){return ready(n)&&(depth==='A'||depth==='B'&&n.status.derivation&&n.status.code||depth==='C'&&n.extension?.status==='ready');}
function courseLink(id,label){return link('#lesson/'+id,label||byId.get(id)?.name||id);}
function status(n){return ready(n)?badge('A/B 基础课程','ready'):badge('仅建立目录','planned');}
function matchesPriority(n){return priority==='all'||n.priority===priority;}
function courseRow(n){
  const done=selfChecked(state.records[n.id],state.depth)&&availableAt(n,state.depth);
  return '<li class="course-row"><div><h3>'+courseLink(n.id)+'</h3><p>'+esc(n.summary)+'</p><div class="course-meta">'+badge(n.priority,'priority')+'<span>'+esc(n.module)+' · '+esc(n.nameEn)+'</span>'+(done?badge(state.depth+' 层自评通过','ready'):'')+'</div></div><div class="course-tags">'+status(n)+(n.status.interactive?badge('可操作实验'):'')+'</div></li>';
}
function renderSidebar(){
  $('#sidebar-curriculum').innerHTML=data.catalog.modules.map(m=>{
    const ns=data.catalog.nodes.filter(n=>n.module.startsWith(m.id)&&matchesPriority(n)&&ready(n));
    return '<details'+(ns.some(n=>location.hash.includes('/'+n.id))?' open':'')+'><summary>'+m.id+' · '+esc(m.name)+'</summary><ul>'+ns.map(n=>'<li><a class="'+(location.hash.includes('/'+n.id)?'current':'')+'" href="#lesson/'+n.id+'">'+esc(n.name)+'</a></li>').join('')+'<li>'+link('#tree/'+m.id,'查看完整模块')+'</li></ul></details>';
  }).join('');
  document.querySelectorAll('[data-depth]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.depth===state.depth)));
}
function hero(title,subtitle,eyebrow='E3 RESEARCH'){
  return '<div class="hero"><div class="eyebrow">'+esc(eyebrow)+'</div><h1>'+esc(title)+'</h1><p class="lead">'+esc(subtitle)+'</p></div>';
}
function home(){
  const courses=data.catalog.nodes.filter(ready),done=courses.filter(n=>selfChecked(state.records[n.id],'A')).length;
  const next=data.route.find(d=>d.units.some(u=>!selfChecked(state.records[u.nodeId],'A')))||data.route[0];
  const suggestions=[...new Set(next.units.map(u=>u.nodeId))].map(id=>byId.get(id));
  return hero('把新方法拆成能复算的数学操作','从直觉、手算和公式进入论文：追踪输入如何变成输出，检查信息来自哪里，以及结论依赖哪些假设。')
    +'<div class="metrics"><div class="metric"><strong>'+courses.length+'</strong><span>已写成的基础课程</span></div><div class="metric"><strong>'+LABS.length+'</strong><span>可操作数学实验</span></div><div class="metric"><strong>'+done+' / '+courses.length+'</strong><span>A 层自评通过</span></div><div class="metric"><strong>14 天</strong><span>每日约 3 小时 20 分</span></div></div>'
    +'<div class="button-row"><a class="button primary" href="#route/'+next.day+'">继续 Day '+next.day+'</a><a class="button" href="#tree">浏览知识树</a><a class="button" href="#labs">打开数学实验</a></div>'
    +'<div class="split"><section><h2>当前学习单元</h2><p class="muted">Day '+next.day+' · '+esc(next.title)+'</p><ul class="course-list">'+suggestions.map(courseRow).join('')+'</ul></section><section><h2>选择合适的学习深度</h2>'
    +table(['深度','需要能做到'],[['A · 科研必知','解释需求、复算最小例子、读懂定义、辨认失败条件。'],['B · 科研可用','跟随关键推导、运行最小实现、修改参数并检查结果。'],['C · 理论研究','证明条件、识别边界、上下界与反例。当前以扩展目录为主。']])
    +'<p class="small muted">14 天路线主要覆盖 A 层，按需要进入 B 层。学习时长是规划估计，自评不等于独立能力认证。</p></section></div>'
    +'<section><h2>两套学习体系，各有分工</h2>'+p('原 E3 用于长期的数学、概率、统计和科研训练；Research 用于尽快理解论文中的关键技术。两者的进度分开保存，可以交替学习。')
    +'<div class="rule-box">'+p('课程、路线、专题和论文索引引用同一组知识节点。知识树收录的扩展条目会明确显示“仅建立目录”；正文、代码、实验与文献核验各有状态。')+'</div>'+link('#quality','查看内容范围、核验记录与剩余任务')+'</section>';
}
function tree(module){
  const modules=module?data.catalog.modules.filter(m=>m.id===module):data.catalog.modules;
  return hero('科研技术知识树','十个领域、39 个模块。先选择当前需要理解的操作，再按先修关系补齐基础。目录覆盖与课程完成度分别显示。')
    +'<div class="button-row"><label><input id="ready-only" type="checkbox"> 只显示已有正文的课程</label></div>'
    +modules.map(m=>'<section class="group"><h2>'+esc(m.id+' · '+m.name)+'</h2>'+data.catalog.groups.filter(g=>g.module===m.id).map(g=>{
      const ns=g.lessons.map(id=>byId.get(id)).filter(matchesPriority);if(!ns.length)return '';
      const showCoverage=priority==='all'||byId.get(g.id.toLowerCase()+'-extensions').priority===priority;
      return '<div class="knowledge-group" data-group="'+g.id+'"><h3>'+esc(g.id+' · '+g.name)+'</h3><ul class="course-list">'+ns.map(courseRow).join('')+'</ul>'+(showCoverage?'<details class="coverage-detail"><summary>完整覆盖清单 · '+g.coverage.length+' 项（待逐项扩展）</summary><ul class="coverage">'+g.coverage.map(c=>{
        const concept=data.catalog.concepts.find(x=>x.id===c.conceptId);
        return '<li>'+esc(c.label)+(concept.occurrences.length>1?' <span class="muted">共享于 '+esc([...new Set(concept.occurrences)].join('、'))+'</span>':'')+'</li>';
      }).join('')+'</ul></details>':'')+'</div>';
    }).join('')+'</section>').join('');
}
function renderQuiz(q,prefix='course'){
  const answer=state.answers[q.id],correct=answer?.selected===q.answer;
  return '<form class="quiz" data-question="'+q.id+'"><div class="quiz-type">'+esc(q.type)+' · '+q.depth+' 层</div><fieldset><legend>'+esc(q.prompt)+'</legend>'+q.options.map((option,i)=>{
    const id=prefix+'-'+q.id+'-'+i;
    return '<label for="'+id+'"><input type="radio" id="'+id+'" name="'+prefix+'-'+q.id+'" value="'+i+'"'+(answer?.selected===i?' checked':'')+'> '+esc(option)+'</label>';
  }).join('')+'</fieldset><button type="submit">检查答案</button><div class="feedback'+(answer&&!correct?' wrong':'')+'"'+(!answer?' hidden':'')+'>'+(answer?(correct?'回答正确。':'需要复习。')+' '+esc(q.explanation):'')+'</div></form>';
}
function route(day){
  const shown=day?data.route.filter(d=>d.day===Number(day)):data.route;
  const used=new Set();
  return hero('14 天科研核心路线','每天聚焦 3–4 个单元。把公式复算、失败反例和科研判断放在同一天完成；高级证明留在后续理论扩展中。')
    +'<div class="day-index">'+data.route.map(d=>link('#route/'+d.day,'Day '+d.day)).join('')+link('#route','全部天数')+'</div>'
    +table(['安排','分钟'],data.route[0].schedule.map(x=>[x.label,x.minutes]))
    +shown.map(d=>{
      let qs=[];for(const u of d.units){const candidates=questions.filter(q=>q.nodeId===u.nodeId&&!used.has(q.id));if(candidates[0]){qs.push(candidates[0]);used.add(candidates[0].id);}}
      return '<section class="day" id="day-'+d.day+'"><div class="eyebrow">DAY '+d.day+' · '+d.minutes+' 分钟</div><h2>'+esc(d.title)+'</h2><ul class="units">'+d.units.map((u,i)=>{
        const n=byId.get(u.nodeId);const section=u.startSection||'L0';
        return '<li class="unit"><div>'+link('#lesson/'+u.nodeId+'?section='+section+'&depth='+u.depth,u.title)+'<div class="small muted">'+esc(n.name)+' · '+u.depth+' 层为主</div></div><div>'+u.minutes+' 分钟 '+status(n)+'</div></li>';
      }).join('')+'</ul><details><summary>当日验收与自测 · '+d.practiceMinutes+' 分钟</summary>'+list(d.acceptance)+qs.map(q=>renderQuiz(q,'day'+d.day)).join('')+'</details><p class="small muted">'+esc(d.note)+'</p></section>';
    }).join('');
}
function sectionHTML(s){
  return '<section class="lesson-section" id="'+s.id+'"><h2>'+esc(sectionTitle(s))+'<span class="layer-label">'+s.id+' · '+s.depth+' 层</span></h2>'+s.paragraphs.map(p).join('')
    +(s.steps?'<ol>'+s.steps.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>':'')
    +(s.equations||[]).map(eq=>'<div class="equation"><div data-tex="'+esc(eq.tex)+'"></div><p>'+esc(eq.explanation)+'</p></div>').join('')
    +(s.table?table(s.table.headers,s.table.rows):'')
    +(s.code?'<div class="code-block"><div class="code-head"><span>'+esc(s.code.environment)+' · '+(s.code.verified?'已实际运行':'尚未运行')+'</span><button data-copy="'+s.id+'">复制代码</button></div><pre><code>'+esc(s.code.source)+'</code></pre>'+(s.code.file?'<p class="small">'+link('examples/'+s.code.file,'下载最小复现脚本')+'</p>':'')+'</div>':'')+'</section>';
}
function references(ids){
  return '<ol class="reference-list">'+ids.map(id=>{
    const s=sourceMap.get(id);return s?'<li>'+external(s.url,s.title)+'<small>'+esc(s.authors)+' · '+esc(s.year)+' · '+esc(s.status==='verified'?'已核验':'待核验')+'</small><small>核验范围：'+esc(s.scope)+' · '+esc(s.checkedOn)+'</small></li>':'<li>'+esc(id)+' · 来源记录待补</li>';
  }).join('')+'</ol>';
}
async function lesson(id){
  const meta=byId.get(id);if(!meta)return hero('未找到课程','这个链接中的课程编号不存在。请通过知识树重新选择。');
  let n=meta;
  if(ready(meta)){
    if(!lessonCache.has(id))lessonCache.set(id,await fetchJSON('content/lessons/'+id+'.json'));
    n=lessonCache.get(id);
  }
  const r=record(id),sections=n.sections.filter(s=>state.depth!=='A'||s.depth==='A'),canCheck=availableAt(n,state.depth);
  const prereq=n.prerequisites.length?n.prerequisites.map(x=>courseLink(x)).join(' · '):'本课可作为起点；需要时回到原 E3 补习基础。';
  const associatedPapers=data.papers.filter(p=>p.nodes.includes(id));
  const head='<div class="breadcrumb">'+link('#tree/'+n.module[0],'知识树')+' / '+esc(n.module)+'</div><header class="lesson-header"><div class="course-meta">'+badge(n.priority,'priority')+status(n)+'<span>当前阅读：Level '+state.depth+' · 预计 '+n.minutes[state.depth]+' 分钟</span></div><h1>'+esc(n.name)+'</h1><p class="english">'+esc(n.nameEn)+'</p>'+p(n.summary)
    +'<p class="small">先修：'+prereq+'</p><div class="button-row"><button data-star="'+id+'">'+(r.star?'已收藏':'收藏课程')+'</button><button data-review="'+id+'">'+(r.review?'已加入复习':'加入复习')+'</button>'+(n.status.interactive?link('#lesson/'+id+'?section=experiment','进入实验'):'')+'</div>'
    +'<div class="status-grid">'+Object.entries(labels).map(([k,label])=>badge(label+' '+(n.status[k]?'已完成':'待完成'),n.status[k]?'ready':'planned')).join('')+'</div></header>';
  if(!ready(n))return head+'<div class="notice-box">'+p('这个节点目前只有目录，没有可验收的课程正文。课程进度不会因打开此页而增加。')+'</div>'+list(n.catalogTopics?.length?n.catalogTopics:n.extension.topics)+
    (n.related.length?'<h2>本模块已有课程</h2><ul class="course-list">'+n.related.map(x=>byId.get(x)).filter(ready).map(courseRow).join('')+'</ul>':'')+noteEditor(n);
  const layerMessage=state.depth==='C'?'<div class="notice-box">'+p(n.extension.status==='ready'?'本课已提供限定条件下的理论扩展。':'C 层的完整理论内容尚未完成。以下保留已经写成的 A/B 内容，末尾列出需要继续证明和阅读的部分；C 层自评暂不开放。')+'</div>':state.depth==='A'?'<p class="small muted">当前显示科研必知内容。切换 B 层可展开关键推导与最小复现代码。</p>':'';
  const toc='<aside class="lesson-toc" aria-label="课程目录"><strong class="toc-title">本课目录</strong>'+sections.map(s=>link('#lesson/'+id+'?section='+s.id,s.id+' '+sectionTitle(s))).join('')+(n.status.interactive?link('#lesson/'+id+'?section=experiment','交互实验'):'')+link('#lesson/'+id+'?section=questions','自测与笔记')+link('#lesson/'+id+'?section=references','原始来源')+'</aside>';
  const extension=state.depth==='C'?'<section class="lesson-section" id="theory"><h2>C 层理论扩展</h2>'+badge(n.extension.status==='ready'?'已有内容':'待撰写与核验','planned')+list(n.extension.topics)+'</section>':'';
  const body=layerMessage+sections.map(sectionHTML).join('')+(n.status.interactive?renderLab(n.lab||id):'')+extension
    +'<section id="questions" class="lesson-section"><h2>自测与能力自评</h2>'+n.questions.filter(q=>state.depth!=='A'||q.depth==='A').map(q=>renderQuiz(q)).join('')
    +'<p class="small muted">三个检查项按深度独立保存。勾选表示本人完成复算与解释，不代表平台独立认证。</p><div class="progress-controls">'+[['read','已阅读并理解'],['compute','能独立复算'],['explain','能解释条件与失败']].map(([k,label])=>'<label><input type="checkbox" data-check="'+k+'" data-node="'+id+'"'+(r.checks[state.depth][k]?' checked':'')+(!canCheck?' disabled':'')+'> '+label+'</label>').join('')+'</div>'+noteEditor(n)+'</section>'
    +'<section class="lesson-section" id="references"><h2>参考来源与核验范围</h2>'+references(n.references)+'</section>'
    +(n.related.length?'<section><h2>继续连接</h2><div class="dependency-links">'+n.related.map(x=>courseLink(x)).join('')+'</div></section>':'')
    +(associatedPapers.length?'<section><h2>关联论文</h2>'+listLinks(associatedPapers.map(x=>['#papers/'+x.id,x.title]))+'</section>':'');
  return head+'<div class="lesson-layout"><article class="lesson-body">'+body+'</article>'+toc+'</div>';
}
function listLinks(pairs){return '<ul>'+pairs.map(([href,label])=>'<li>'+link(href,label)+'</li>').join('')+'</ul>';}
function noteEditor(n){
  return '<h3>学习笔记</h3><label class="small muted" for="note-'+n.id+'">记录手算、推导、失败条件或尚未理解的步骤（最多 20,000 字符）</label><textarea id="note-'+n.id+'" data-note="'+n.id+'" maxlength="20000">'+esc(state.records[n.id]?.note||'')+'</textarea><div class="note-state" id="note-status">'+(writable?'输入后自动保存在本浏览器':'当前只能保留在本次页面，请导出备份')+'</div>';
}
function comparisons(id){
  const items=id?data.comparisons.filter(c=>c.id===id):data.comparisons;
  return hero('横向技术对比','先比较数学对象、目标与信息来源，再比较模型名称。相似计算不代表相同的识别条件或科学贡献。')
    +items.map(c=>'<section class="paper"><h2>'+link('#compare/'+c.id,c.title)+'</h2>'+badge(c.status==='ready'?'对比已撰写':'对比框架待扩展',c.status==='ready'?'ready':'planned')+
      (c.intro?p(c.intro):'')+(c.rows?.length?table(['比较维度',...c.alternatives],c.rows):'<p class="muted">已建立索引；将按数学对象、需求、输入输出、计算、目标、假设、信息保留、成本、失败与适用范围逐项补写。</p>')+
      '<div class="dependency-links">'+c.nodes.map(x=>courseLink(x)).join('')+'</div></section>').join('');
}
function graph(focus){
  const selected=focus&&byId.has(focus)?byId.get(focus):byId.get('noncommutativity');
  const previous=selected.prerequisites.map(id=>byId.get(id)),next=data.catalog.nodes.filter(n=>n.prerequisites.includes(selected.id));
  const columns=[previous,[selected],next],width=900,height=Math.max(230,Math.max(...columns.map(c=>c.length))*75+65);
  const coords=new Map();columns.forEach((col,c)=>col.forEach((n,i)=>coords.set(n.id,{x:20+c*300,y:40+i*75})));
  let svg='<svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="先修知识指向当前课程，当前课程指向后续课程"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="#77a3ad"/></marker></defs>';
  for(const [a,b] of [...previous.map(n=>[n,selected]),...next.map(n=>[selected,n])]){const x=coords.get(a.id),y=coords.get(b.id);svg+='<path d="M '+(x.x+245)+' '+(x.y+24)+' C '+(x.x+275)+' '+(x.y+24)+', '+(y.x-25)+' '+(y.y+24)+', '+y.x+' '+(y.y+24)+'" fill="none" stroke="#77a3ad" stroke-width="1.5" marker-end="url(#arrow)"/>';}
  for(const col of columns)for(const n of col){const c=coords.get(n.id);svg+='<a href="#graph/'+n.id+'"><rect x="'+c.x+'" y="'+c.y+'" width="245" height="48" rx="5" fill="'+(n.id===selected.id?'#d9eef0':'#f3f7f8')+'" stroke="#8cb5bf"/><text x="'+(c.x+12)+'" y="'+(c.y+29)+'">'+esc(n.name.length>16?n.name.slice(0,16)+'…':n.name)+'</text></a>';}
  svg+='</svg>';
  return hero('知识依赖关系','连线表示学习先修关系，不表示因果关系或算法之间的数学等价。点击节点查看其局部关系。')
    +'<label for="graph-select">选择课程</label> <select id="graph-select">'+data.catalog.nodes.filter(ready).map(n=>'<option value="'+n.id+'"'+(n.id===selected.id?' selected':'')+'>'+esc(n.name)+'</option>').join('')+'</select>'
    +'<div class="graph-panel">'+svg+'</div><h2>'+esc(selected.name)+'</h2>'+courseLink(selected.id,'进入该课程')
    +'<div class="split"><section><h3>先修知识</h3>'+(previous.length?listLinks(previous.map(n=>['#lesson/'+n.id,n.name])):p('无额外先修节点。'))+'</section><section><h3>后续课程</h3>'+(next.length?listLinks(next.map(n=>['#lesson/'+n.id,n.name])):p('暂未设置后续课程。'))+'</section></div>'
    +'<h2>跨领域数学联系</h2>'+table(['联系','关系性质','成立范围'],data.connections.map(x=>[x.title,x.kind,x.boundary]));
}
function papers(id){
  const papers=id?data.papers.filter(x=>x.id===id):data.papers;
  return hero('论文—技术双向索引','用问题、数据、数学对象与验证设计读论文。名称不明确或未取得原文的项目保留核验状态。')
    +papers.map(paper=>'<article class="paper"><h2>'+link('#papers/'+paper.id,paper.title)+'</h2>'+badge(paper.status==='reviewed'?'已核对指定范围':paper.status==='bibliography'?'已核验书目':'待消歧与核验',paper.status==='pending'?'planned':'ready')
      +(paper.authors?'<p class="small muted">'+esc(paper.authors)+' · '+esc(paper.date||'')+'</p>':'')
      +(paper.url?external(paper.url,'原始来源'):'')
      +(paper.summary?p(paper.summary):'')
      +(paper.fields?'<dl>'+Object.entries(paper.fields).map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd>').join('')+'</dl>':'')
      +(paper.verification?p('核验边界：'+paper.verification):'')
      +'<div class="dependency-links">'+paper.nodes.map(x=>courseLink(x)).join('')+'</div></article>').join('');
}
function topics(id){
  const items=id?data.topics.filter(t=>t.id===id):data.topics;
  return hero('科研专题','从具体研究对象与观测条件出发，组织需要复用的课程。专题中的数学例子不替代真实药理、细胞或临床证据。')
    +items.map(t=>'<section class="paper"><h2>'+link('#topics/'+t.id,t.title)+'</h2>'+p(t.question)+'<div class="rule-box">'+p(t.boundary)+'</div>'+list(t.checks)+'<ul class="course-list">'+t.nodes.map(id=>byId.get(id)).map(courseRow).join('')+'</ul></section>').join('');
}
function experiments(id){
  return hero('交互式数学实验','每个面板都有可改变的输入、可检查的中间量与明确数学定义。模拟使用合成数据，代码另附于对应课程。')
    +(id?'<p>'+courseLink(LABS.find(x=>x.id===id)?.nodeId||id,'打开配套课程')+'</p>'+renderLab(id):
      '<ul class="course-list">'+LABS.map(l=>'<li class="course-row"><div><h3>'+link('#labs/'+l.id,l.title)+'</h3><p>'+courseLink(l.nodeId)+'</p></div>'+badge('可操作','ready')+'</li>').join('')+'</ul>');
}
function notebook(){
  const ns=data.catalog.nodes,stars=ns.filter(n=>state.records[n.id]?.star),notes=ns.filter(n=>state.records[n.id]?.note),review=ns.filter(n=>state.records[n.id]?.review);
  const wrong=questions.filter(q=>state.answers[q.id]&&state.answers[q.id].selected!==q.answer);
  return hero('学习记录与复习','收藏、笔记、自评与自测只保存在当前浏览器。更换设备前导出备份；导入只处理 E3 Research 格式。')
    +'<section><h2>进度备份与恢复</h2><div class="button-row"><button class="primary" data-export>导出进度与笔记</button><label class="file-label">选择备份文件<input id="import-file" type="file" accept=".json,application/json" hidden></label><button data-export-raw>导出当前原始存储</button><button data-export-previous>导出导入前备份</button></div><div id="import-preview"></div><p class="small muted">备份包含笔记中的个人内容，请自行妥善保存。原 E3 的进度和本地教材不在此备份中。</p></section>'
    +'<div class="split"><section><h2>收藏 · '+stars.length+'</h2>'+(stars.length?'<ul class="course-list">'+stars.map(courseRow).join('')+'</ul>':p('在课程页选择“收藏课程”。'))+'</section><section><h2>待复习 · '+review.length+'</h2>'+(review.length?'<ul class="course-list">'+review.map(courseRow).join('')+'</ul>':p('在课程页将需要重算的内容加入复习。'))+'</section></div>'
    +'<section><h2>笔记 · '+notes.length+'</h2>'+notes.map(n=>'<details><summary>'+esc(n.name)+'</summary><p style="white-space:pre-wrap">'+esc(state.records[n.id].note)+'</p>'+courseLink(n.id,'回到课程编辑')+'</details>').join('')+'</section>'
    +'<section><h2>错题与错误概念 · '+wrong.length+'</h2>'+(!wrong.length?p('当前没有记录中的错题。完成课程自测后，这里会保留答错题目及对应解释。'):wrong.map(q=>'<div><p>'+courseLink(q.nodeId)+'</p>'+renderQuiz(q,'review')+'</div>').join(''))+'</section>';
}
async function search(query){
  if(!query.trim())return hero('全局搜索','输入一个技术名称、数学对象或问题。搜索包含课程正文、扩展目录与论文名称。');
  searchIndex??=await fetchJSON('content/search.json');
  const terms=query.toLocaleLowerCase().trim().split(/\s+/),results=searchIndex.map(x=>({...x,score:terms.every(t=>x.text.toLocaleLowerCase().includes(t))?terms.reduce((s,t)=>s+(x.title.toLocaleLowerCase().includes(t)?10:1),0):0})).filter(x=>x.score>0&&(x.kind==='paper'||matchesPriority(byId.get(x.id)))).sort((a,b)=>b.score-a.score);
  return hero('搜索：'+query,'找到 '+results.length+' 项结果。可按优先级缩小课程范围；扩展目录不会标为完成课程。')
    +'<ul class="course-list search-results">'+results.map(x=>{
      const text=x.text.replace(/\s+/g,' '),i=text.toLocaleLowerCase().indexOf(terms[0]),excerpt=text.slice(Math.max(0,i-30),Math.max(0,i-30)+180);
      return '<li class="course-row"><div><h3>'+link(x.kind==='paper'?'#papers/'+x.id:'#lesson/'+x.id,x.title)+'</h3><p>'+esc(excerpt)+'…</p></div>'+(x.kind==='paper'?badge('论文索引'):status(byId.get(x.id)))+'</li>';
    }).join('')+'</ul>';
}
function quality(){
  const readyCount=data.catalog.nodes.filter(ready).length,remaining=data.catalog.nodes.filter(n=>!ready(n));
  return hero('内容范围与核验记录','明确哪些内容已经可学、哪些仍是覆盖清单。数学例子、最小实现和来源核验分开记录。')
    +table(['项目','本版状态'],[['课程正文',readyCount+' 门限定范围的 A/B 基础课程；不表示整个模块或全部相关技术已完成。'],['扩展目录',remaining.length+' 个节点；包括高级理论与专项技术。'],['交互实验',LABS.length+' 个已接通面板；所有数据为合成值。'],['代码',String(data.build?.verifiedExamples||0)+' 段最小实现已实际运行；运行环境见课程与核验记录。'],['数学公式','KaTeX 本地资源渲染；原始公式作为可读后备。'],['原站保护','原 E3 的课程数据、进度程序、教材程序保持原样；仅追加 Research 导航入口。'],['文献','核验范围逐条标注；题名消歧未完成时保留待核验。']])
    +'<h2>完成状态的含义</h2>'+p('“质量复核”表示本版检查了 L0–L8 完整性、维度与主要推导、最小反例、题目答案及代码输出，不代表同行评审或高级理论已经证明。学习自评由你自己勾选，课程建设状态由内容核验记录决定。')
    +'<h2>后续扩展</h2>'+list(['补齐39个模块覆盖清单中的专项课程和更长的算法实现。','将 Level C 的定理、反例、上界与下界逐项写成可审阅证明。','完成待消歧论文的原文阅读与十项研究记录。','扩展向量量化、多模态对齐、粒子滤波、Bellman 更新、RSI 与细胞谱系等交互面板。','为课程加入独立外部教学审阅和学习效果评价。'])
    +'<p>'+link('README.md','本版维护说明')+' · '+link('content/build-report.json','机器可读构建核验记录')+'</p>';
}
async function fetchJSON(path){const response=await fetch(path,{cache:'no-cache'});if(!response.ok)throw new Error('无法加载 '+path+'（HTTP '+response.status+'）');return response.json();}
function math(){
  document.querySelectorAll('[data-tex]').forEach(el=>{
    const tex=el.dataset.tex;
    if(window.katex){try{window.katex.render(tex,el,{displayMode:true,throwOnError:true,strict:'warn',trust:false});}catch{el.textContent=tex;el.classList.add('math-fallback');}}
    else el.textContent=tex;
  });
  if(window.renderMathInElement)window.renderMathInElement($('#main'),{delimiters:[{left:'\\(',right:'\\)',display:false},{left:'\\[',right:'\\]',display:true},{left:'$$',right:'$$',display:true}],throwOnError:false,trust:false,ignoredTags:['script','noscript','style','textarea','pre','code']});
}
async function render({keepScroll=false}={}){
  if(!data)return;
  const token=++renderToken,hash=location.hash.slice(1)||'home',parts=hash.split('?'),[view,id]=parts[0].split('/'),params=new URLSearchParams(parts[1]||'');
  if(view==='lesson'&&['A','B','C'].includes(params.get('depth'))){
    if(state.depth!==params.get('depth')){state.depth=params.get('depth');persist();}
    params.delete('depth');history.replaceState(null,'','#'+parts[0]+(params.size?'?'+params.toString():''));
  }
  document.querySelectorAll('[data-nav]').forEach(a=>{a.classList.toggle('active',a.dataset.nav===view||(view==='lesson'&&a.dataset.nav==='tree'));if(a.classList.contains('active'))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  renderSidebar();
  let html;
  try{
    if(view==='home')html=home();
    else if(view==='tree')html=tree(id);
    else if(view==='route')html=route(id);
    else if(view==='lesson')html=await lesson(id);
    else if(view==='compare')html=comparisons(id);
    else if(view==='graph')html=graph(id);
    else if(view==='papers')html=papers(id);
    else if(view==='topics')html=topics(id);
    else if(view==='labs')html=experiments(id);
    else if(view==='notebook')html=notebook();
    else if(view==='search')html=await search(params.get('q')||'');
    else if(view==='quality')html=quality();
    else html=hero('页面不存在','请使用上方导航选择页面。');
    if(token!==renderToken)return;
    $('#main').innerHTML=html;math();activateLabs($('#main'));
    const section=params.get('section');
    if(section&&/^(L[0-8]|experiment|questions|references|theory)$/.test(section)){
      const target=document.getElementById(section);
      if(target)target.scrollIntoView({block:'start'});else if(state.depth==='A'&&['L4','L7'].includes(section))toast('该段在 B 层。请切换阅读深度后查看。');
    }else if(!keepScroll)window.scrollTo({top:0,behavior:'instant'});
    document.title=($('#main h1')?.textContent||'科研技术学习')+' · E3 Research';
  }catch(error){if(token===renderToken)$('#main').innerHTML=hero('内容暂时无法加载',error.message)+'<button data-retry>重新加载</button>';}
}
function download(text,name){
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
document.addEventListener('click',async e=>{
  const el=e.target.closest('button');if(!el)return;
  if(el.dataset.depth){state.depth=el.dataset.depth;persist();await render({keepScroll:true});}
  else if(el.dataset.star||el.dataset.review){const id=el.dataset.star||el.dataset.review,r=record(id),field=el.dataset.star?'star':'review';r[field]=!r[field];r.updatedAt=Date.now();persist();el.textContent=field==='star'?(r.star?'已收藏':'收藏课程'):(r.review?'已加入复习':'加入复习');}
  else if(el.dataset.copy){const code=el.closest('.code-block').querySelector('code').textContent;try{await navigator.clipboard.writeText(code);toast('代码已复制');}catch{toast('浏览器未允许复制，请在代码框中选择并复制。');}}
  else if(el.hasAttribute('data-export'))download(exportBackup(state),'e3-research-'+new Date().toISOString().slice(0,10)+'.json');
  else if(el.hasAttribute('data-export-raw')||el.hasAttribute('data-export-previous')){try{const key=el.hasAttribute('data-export-raw')?STORAGE_KEY:IMPORT_BACKUP_KEY,raw=storage?.getItem(key);if(raw)download(raw,'e3-research-'+(key===STORAGE_KEY?'raw':'before-import')+'.json');else toast('没有可导出的对应存储记录。');}catch{toast('浏览器无法读取该记录。');}}
  else if(el.hasAttribute('data-import-confirm')){
    try{state=importProgress(storage,importText,$('#merge-import').checked);writable=true;$('#storage-alert').hidden=true;importText='';await render({keepScroll:true});toast('备份已恢复，导入前记录已另行保存。');}catch(error){toast('导入未完成：'+error.message);}
  }else if(el.hasAttribute('data-retry'))location.reload();
});
document.addEventListener('input',e=>{
  const el=e.target;
  if(el.dataset.note){const r=record(el.dataset.note);r.note=el.value;r.updatedAt=Date.now();persist();$('#note-status').textContent=writable?'已保存到本浏览器':'本次页面中已保留，请导出备份';}
});
document.addEventListener('change',async e=>{
  const el=e.target;
  if(el.id==='priority'){priority=el.value;await render({keepScroll:true});}
  else if(el.id==='graph-select')location.hash='graph/'+el.value;
  else if(el.dataset.check){const r=record(el.dataset.node);r.checks[state.depth][el.dataset.check]=el.checked;r.updatedAt=Date.now();persist();toast('学习自评已记录。');}
  else if(el.id==='ready-only'){
    document.querySelectorAll('.knowledge-group').forEach(group=>{
      let count=0;group.querySelectorAll('.course-row').forEach(row=>{const a=row.querySelector('h3 a'),id=a.hash.split('/')[1],show=!el.checked||ready(byId.get(id));row.hidden=!show;if(show)count++;});
      group.querySelectorAll('.coverage-detail').forEach(x=>x.hidden=el.checked);group.hidden=count===0;
    });
  }else if(el.id==='import-file'&&el.files[0]){
    try{
      if(el.files[0].size>2*1024*1024)throw new Error('备份不能超过 2 MB');
      importText=await el.files[0].text();const preview=parseBackup(importText);
      $('#import-preview').innerHTML='<div class="import-preview"><p>已检查：'+Object.keys(preview.records).length+' 门课程记录，'+Object.keys(preview.answers).length+' 条自测记录。</p><label><input id="merge-import" type="checkbox" checked> 与当前记录合并（同一条目保留较新的记录）</label><div class="button-row"><button class="primary" data-import-confirm>确认恢复此备份</button></div><p class="small">取消勾选将替换 Research 记录；原始记录会先保存在“导入前备份”。原 E3 记录不受影响。</p></div>';
    }catch(error){importText='';$('#import-preview').textContent=error.message;}
  }
});
document.addEventListener('submit',e=>{
  const form=e.target;
  if(form.id==='search-form'){e.preventDefault();location.hash='search?q='+encodeURIComponent($('#search').value);if(location.hash==='search?q=')render();}
  else if(form.dataset.question){
    e.preventDefault();const selected=form.querySelector('input:checked');if(!selected){toast('请先选择一个答案。');return;}
    const q=questions.find(q=>q.id===form.dataset.question);if(!q)return;
    const choice=Number(selected.value),old=state.answers[q.id];state.answers[q.id]={selected:choice,attempts:(old?.attempts||0)+1,updatedAt:Date.now()};persist();
    const feedback=form.querySelector('.feedback');feedback.hidden=false;feedback.classList.toggle('wrong',choice!==q.answer);feedback.textContent=(choice===q.answer?'回答正确。':'需要复习。')+' '+q.explanation;math();
  }
});
$('.skip').addEventListener('click',e=>{e.preventDefault();$('#main').focus();$('#main').scrollIntoView({block:'start'});});
window.addEventListener('hashchange',()=>render());
window.addEventListener('storage',e=>{
  if(e.key===STORAGE_KEY&&e.newValue){try{state=parseBackup(e.newValue);toast('另一个标签页更新了学习记录。');render({keepScroll:true});}catch{storageError('另一个标签页写入了无法读取的记录；请导出备份后检查。');writable=false;}}
});
try{
  const [catalog,route,comparisons,papers,topics,connections,sources,qs,build]=await Promise.all(['catalog','route','comparisons','papers','topics','connections','sources','questions','build-report'].map(x=>fetchJSON('content/'+x+'.json')));
  data={catalog,route,comparisons,papers,topics,connections,sources,build};questions=qs;byId=new Map(catalog.nodes.map(n=>[n.id,n]));sourceMap=new Map(sources.map(s=>[s.id,s]));await render();
}catch(error){$('#main').innerHTML=hero('课程资源暂时无法加载',error.message)+'<p>请通过网站地址或本地 HTTP 预览打开；直接双击 HTML 不支持模块加载。</p><button data-retry>重新加载</button>';}
