import {atomRecordId, atomAvailable, atomMastered, searchAtoms, selectSourceSection, normalizeTerm} from './knowledge-model.js';

export function createKnowledgeBase(ctx) {
  const {book, esc, p, link, badge, table, hero, references, renderLab, getLesson, getState, noteEditor, getPriority} = ctx;
  const items = book.items, byId = new Map(items.map(n => [n.id,n]));
  const mechanismMap = new Map(book.mechanisms.map(n => [n.id,n]));
  const problemMap = new Map(book.problems.map(n => [n.id,n]));
  const depthNames = {A:'快速认知',B:'技术掌握',C:'按需深入'};
  const atomLink = (id,label) => link('#concept/'+id,label || byId.get(id)?.name || id);
  const equation = e => '<div class="equation"><div data-tex="'+esc(e.tex)+'"></div>'+p(e.explanation)+'</div>';
  const chips = ids => '<div class="dependency-links">'+[...new Set(ids)].filter(id=>byId.has(id)).map(id=>atomLink(id)).join('')+'</div>';
  const localLink = term => {
    const q=normalizeTerm(term),n=searchAtoms(items,term).find(x=>[x.name,x.nameEn,...x.aliases].some(a=>normalizeTerm(a)===q));
    return n?atomLink(n.id,'打开「'+n.name+'」的独立入口'):'';
  };
  function status(n) {
    return badge(atomAvailable(n)?'快速层已写成':'仅索引 · 待撰写',atomAvailable(n)?'ready':'planned')+(atomAvailable(n,'B')?badge('含关键推导','ready'):'');
  }
  function row(n) {
    const state=getState(),r=state.records[atomRecordId(n)];
    return '<li class="course-row atom-row"><div><h3>'+atomLink(n.id)+'</h3>'+(n.nameEn?'<div class="english">'+esc(n.nameEn)+'</div>':'')+p(n.summary)+'<div class="course-meta">'+badge(n.priority,'priority')+(atomMastered(n,state)?badge('快速层自评通过','ready'):'')+(r?.star?badge('已收藏'):'')+(r?.review?badge('待复习'):'')+'</div></div><div class="course-tags">'+status(n)+'</div></li>';
  }
  const rows = ns => '<ul class="course-list">'+ns.map(row).join('')+'</ul>';
  function searchForm(query='') {
    return '<form class="knowledge-search" data-knowledge-search role="search"><label for="knowledge-query">直接查一个技术点</label><div class="search-row"><input id="knowledge-query" name="q" type="search" value="'+esc(query)+'" placeholder="Stop Gradient / detach / 卷积核 / ELBO" autocomplete="off"><button class="primary" type="submit">查找</button></div></form>';
  }
  function home() {
    const state=getState(),ready=items.filter(n=>atomAvailable(n)),p0=ready.filter(n=>n.priority==='P0'),done=ready.filter(n=>atomMastered(n,state));
    const featured=['stop-gradient','convolution-kernel','qkv','lora','elbo','data-score','importance-sampling','identifiability','information-gain','noncommutativity','gip-kernel','probability-coupling'].map(id=>byId.get(id)).filter(Boolean);
    const recent=ready.filter(n=>state.records[atomRecordId(n)]?.updatedAt).sort((a,b)=>state.records[atomRecordId(b)].updatedAt-state.records[atomRecordId(a)].updatedAt).slice(0,4);
    return hero('遇到一个技术点，就从这里开始','从一个具体操作进入：看清它为什么需要、怎样计算、依赖什么条件。基础名词可以就地展开，推导和代码按需深入。','E3 RESEARCH · 科研技术知识库')
      +searchForm()+'<div class="quick-links">'+link('#knowledge?content=ready&priority=P0','P0 核心技术点 · '+p0.length)+link('#knowledge','全部知识点')+link('#knowledge?learning=unmastered','尚未掌握 · '+(ready.length-done.length))+link('#review','我的复习')+'</div>'
      +'<p class="small muted">'+ready.length+' 个知识点已有快速阅读与关键推导；其余 '+(items.length-ready.length)+' 个条目仍在建设。阅读时间是建议预算，可以随时跳转。</p>'
      +(ctx.dayOne?'<p class="day-one-entry">'+link('#route/1','跟着算一遍 · Day 1 神经网络如何学习')+'</p>':'')
      +(recent.length?'<section><h2>继续最近的知识点</h2>'+chips(recent.map(n=>n.id))+'</section>':'')
      +'<section><div class="section-head"><h2>P0 · 直接开始</h2>'+link('#knowledge?content=ready&priority=P0','查看完整 P0 清单')+'</div><div class="atom-cards">'+featured.map(n=>'<article class="atom-card"><div class="eyebrow">'+esc(n.priority)+' · 3–5 MIN</div><h3>'+atomLink(n.id)+'</h3><p>'+esc(n.summary)+'</p><span class="small muted">快速认知 · 关键推导</span></article>').join('')+'</div></section>'
      +'<section><h2>也可以从问题或共同机制进入</h2><div class="entry-grid"><a href="#problems"><strong>从科研问题出发</strong><span>生成样本、解释梯度、识别机制、选择实验</span></a><a href="#mechanisms"><strong>寻找共同数学操作</strong><span>聚合、微分、测度变换、运输、状态推断</span></a><a href="#papers"><strong>拆解一篇论文</strong><span>已核对的方法映射，以及需要补充的阅读</span></a><a href="#compare"><strong>比较相近技术</strong><span>对象、目标、假设和失效条件逐项对照</span></a></div></section>'
      +'<details class="legacy-options"><summary>想按课程连贯学习</summary>'+p('原课程、实验和学习记录继续可用。14 天路线只是可选安排；任何知识点都可以直接打开。')+'<div class="dependency-links">'+link('#tree','31 门原课程及扩展目录')+link('#route','可选 14 天路线')+link('#labs','17 个数学实验')+link('#graph','课程依赖图')+link('#quality','内容范围与核验')+'</div></details>';
  }
  function browse(params = new URLSearchParams(), title='全部知识点') {
    const q=params.get('q')||'',priority=params.get('priority')||getPriority(),content=params.get('content')||'all',learning=params.get('learning')||'all',group=params.get('group')||'';
    const filtered=searchAtoms(items,q,{priority,content,learning,group,state:getState()});
    const page=Math.max(1,Math.min(Math.ceil(filtered.length/40)||1,Math.floor(Number(params.get('page')))||1)),start=(page-1)*40;
    const matchingPapers=q?ctx.papers.filter(paper=>normalizeTerm([paper.title,paper.summary,...Object.values(paper.fields||{})].join(' ')).includes(normalizeTerm(q))):[];
    const matchingCourses=q&&ctx.courseSearch?ctx.courseSearch(q):[];
    const options=(pairs,value)=>pairs.map(([k,v])=>'<option value="'+esc(k)+'"'+(k===value?' selected':'')+'>'+esc(v)+'</option>').join('');
    const pageLink=(num,label)=>{const next=new URLSearchParams(params);next.set('page',String(num));return link('#knowledge?'+next.toString(),label);};
    return hero(q?'搜索：'+q:title,'独立入口不要求完成先修课程。内容状态与个人学习状态分开记录。')+searchForm(q)
      +'<form class="atom-filters" data-atom-filters><input type="hidden" name="q" value="'+esc(q)+'"><label>内容状态<select name="content">'+options([['all','全部条目'],['ready','已有教学内容'],['planned','仅建立索引']],content)+'</select></label><label>优先级<select name="priority">'+options([['all','全部'],['P0','P0 · 科研核心'],['P1','P1 · 按任务使用'],['P2','P2 · 按需扩展']],priority)+'</select></label><label>我的状态<select name="learning">'+options([['all','全部'],['unmastered','快速层尚未自评通过'],['mastered','快速层已自评通过'],['star','已收藏'],['review','待复习']],learning)+'</select></label><label>原知识范围<select name="group">'+options([['','全部范围'],...book.groups.map(g=>[g.id,g.id+' · '+g.name])],group)+'</select></label><button type="submit">应用筛选</button></form>'
      +'<div class="section-head"><p class="small muted">找到 '+filtered.length+' 个知识点'+(filtered.length?' · 显示 '+(start+1)+'–'+Math.min(start+40,filtered.length):'')+'</p>'+((q||content!=='all'||learning!=='all'||group)?link('#knowledge','清除筛选'):'')+'</div>'
      +(filtered.length?rows(filtered.slice(start,start+40)):'<p class="empty">没有匹配项。可以试试中文名称、英文缩写，或清除筛选。</p>')
      +'<nav class="pagination" aria-label="知识点分页">'+(page>1?pageLink(page-1,'上一页'):'')+(filtered.length>40?'<span>第 '+page+' / '+Math.ceil(filtered.length/40)+' 页</span>':'')+(start+40<filtered.length?pageLink(page+1,'下一页'):'')+'</nav>'
      +(matchingPapers.length?'<section><h2>匹配的论文索引</h2>'+matchingPapers.map(paper=>'<p>'+link('#papers/'+paper.id,paper.title)+'</p>').join('')+'</section>':'')
      +(matchingCourses.length?'<details><summary>原课程全文中也有相关内容 · '+matchingCourses.length+'</summary>'+matchingCourses.map(course=>'<p>'+link('#lesson/'+course.id,course.title)+'</p>').join('')+'</details>':'');
  }
  function collection(kind,id) {
    const all=kind==='mechanisms'?book.mechanisms:book.problems,lookup=kind==='mechanisms'?mechanismMap:problemMap;
    if(!id)return hero(kind==='mechanisms'?'按共同数学机制查找':'按科研问题查找',kind==='mechanisms'?'相似的数学操作帮助迁移理解；每组都说明关系成立的范围，不把同类操作等同于同一种方法。':'先找到当前障碍，再选择能解决它的具体操作。')+'<div class="collection-grid">'+all.map(m=>'<section class="atom-card"><h2>'+link('#'+kind+'/'+m.id,m.name)+'</h2>'+p(m.description)+(m.relation?badge(m.relation):'')+'<p class="small muted">'+items.filter(n=>(n[kind]||[]).includes(m.id)).length+' 个已关联知识点</p></section>').join('')+'</div>';
    const m=lookup.get(id);if(!m)return hero('未找到分组','请从分组列表重新选择。');
    return hero(m.name,m.description)+(m.relation?'<div class="rule-box">'+p('关系性质：'+m.relation)+'</div>':'')+rows(searchAtoms(items,'',{[kind==='mechanisms'?'mechanism':'problem']:id,priority:getPriority()}))+'<p>'+link('#'+kind,'查看其他分组')+'</p>';
  }
  async function concept(id,depth='A') {
    const n=byId.get(id);if(!n)return hero('未找到知识点','这个编号不存在。请从全部知识点中重新选择。');
    const recordId=atomRecordId(n),r=getState().records[recordId],canCheck=atomAvailable(n,depth);
    const head='<div class="breadcrumb">'+link('#knowledge','全部知识点')+' / '+esc(n.module)+'</div><header class="lesson-header"><div class="course-meta">'+badge(n.priority,'priority')+status(n)+'</div><h1>'+esc(n.name)+'</h1>'+(n.nameEn?'<p class="english">'+esc(n.nameEn)+'</p>':'')+p(n.summary)+'<div class="button-row"><button data-star="'+recordId+'">'+(r?.star?'已收藏':'收藏知识点')+'</button><button data-review="'+recordId+'">'+(r?.review?'已加入复习':'加入复习')+'</button></div><p class="small muted">可直接学习；遇到陌生概念时展开本页的局部解释。别名：'+esc([...new Set(n.aliases)].filter(x=>x!==n.name).join(' / ')||'暂无')+'</p></header>';
    const levels='<nav class="atom-depths" aria-label="本知识点阅读深度">'+[['A','3–5 分钟'],['B','10–20 分钟'],['C','按需']].map(([d,time])=>'<a href="#concept/'+n.id+'?depth='+d+'"'+(d===depth?' class="selected" aria-current="page"':'')+'><strong>'+depthNames[d]+'</strong><span>'+time+(atomAvailable(n,d)?'':' · 待完成')+'</span></a>').join('')+'</nav>';
    const guided=ctx.dayOne?.related(n.id,depth!=='A'&&atomAvailable(n))||'';
    if(!atomAvailable(n)){
      const related=searchAtoms(items,n.name,{content:'ready'}).slice(0,6);
      return head+levels+'<div class="notice-box">'+p('本条目的专门教学内容尚未写成。可以收藏、记下问题或加入复习。')+'</div>'+guided+(related.length?'<section><h2>已有内容中的相关讲解</h2>'+rows(related)+'</section>':'')+courseAssociations(n)+'<section>'+noteEditor({id:recordId})+'</section>';
    }
    const quick='<section class="lesson-section"><h2>为什么需要它</h2>'+p(n.why)+'<h2>它是什么，处理什么对象</h2>'+p(n.what)+table(['输入','输出'],[[n.io.input,n.io.output]])+'</section>'
      +'<section class="lesson-section"><h2>跟着算一个最小例子</h2>'+p(n.example.setup)+'<ol class="calculation-steps">'+n.example.steps.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol><div class="rule-box">'+p(n.example.result)+'</div></section>'
      +'<section class="lesson-section"><h2>核心公式为什么这样写</h2>'+equation(n.formula)+'</section>'
      +'<section class="lesson-section"><h2>区别、边界与科研用途</h2><h3>和相近技术的区别</h3>'+p(n.distinction)+'<h3>什么时候会失效</h3>'+p(n.failure)+'<h3>读论文时检查什么</h3>'+p(n.research)+'</section>';
    const explainers=n.explainers?.length?'<section class="local-explainers"><h2>这里用到的基础 · 按需展开</h2>'+n.explainers.map(x=>'<details><summary>'+esc(x.term)+'</summary>'+p(x.text)+(byId.has(x.id)?atomLink(x.id,'继续了解这个概念'):localLink(x.term))+'</details>').join('')+'</section>':'';
    let technical='';
    if(depth!=='A'){
      technical='<section class="lesson-section"><h2>关键推导与计算条件</h2>'+(n.derivation?.paragraphs||[]).map(p).join('')+(n.derivation?.equations||[]).map(equation).join('')+'</section>';
      for(const ref of n.sourceRefs||[]){
        const source=await getLesson(ref.lessonId),s=selectSourceSection(source,ref);
        if(!s.paragraphs.length&&!s.equations.length&&!s.table?.rows.length)continue;
        technical+='<section class="source-extract"><h3>展开这一操作的原课推导</h3>'+s.paragraphs.map(p).join('')+s.equations.map(equation).join('')+(s.table?table(s.table.headers,s.table.rows):'')+'<p class="small muted">选自 '+link('#lesson/'+ref.lessonId+'?section='+ref.sectionId+'&depth=B',source.name+' · '+ref.sectionId)+'。这里只抽取与本知识点有关的段落。</p></section>';
      }
      if(n.labId)technical+='<section><h2>改变输入，检查这一步</h2>'+renderLab(n.labId)+'</section>';
    }
    let deep='';
    if(depth==='C'){
      deep='<section class="lesson-section"><h2>理论与复现</h2><div class="notice-box">'+p(n.status.theory?'此处提供限定条件下的理论内容。':'本知识点的严格定理、收敛或误差分析尚未写完。当前可以查看关键推导、原始来源和相关课例；理论层自评暂不开放。')+'</div>';
      if(n.theory)deep+=(n.theory.paragraphs||[]).map(p).join('')+(n.theory.equations||[]).map(equation).join('');
      for(const lessonId of n.codeLessons||[]){
        const source=await getLesson(lessonId),code=source.sections.find(s=>s.code)?.code;if(!code)continue;
        deep+='<details><summary>完整课例代码 · '+esc(source.name)+'</summary><p class="small muted">这是包含相关操作的完整课程脚本，覆盖范围可能大于当前知识点。'+esc(code.environment)+' · '+(code.verified?'原版本已实际运行':'尚未运行')+'</p><div class="code-block"><div class="code-head"><span>'+esc(source.name)+'</span><button data-copy="atom-code">复制代码</button></div><pre><code>'+esc(code.source)+'</code></pre></div>'+link('examples/'+code.file,'下载完整课例脚本')+'</details>';
      }
      deep+='</section>';
    }
    const progress='<section class="lesson-section"><h2>这一个知识点，我是否真正理解</h2><p class="small muted">当前记录：'+depthNames[depth]+'。这是个人自评；不会从旧课程完成记录自动推定。'+(!canCheck?'本层内容尚未完成，暂不开放勾选。':'')+'</p><div class="progress-controls">'+[['read','能说明它解决什么问题'],['compute','能独立复算最小例子'],['explain','能解释条件与失败']].map(([k,label])=>'<label><input type="checkbox" data-check="'+k+'" data-node="'+recordId+'" data-check-depth="'+depth+'"'+(r?.checks[depth][k]?' checked':'')+(!canCheck?' disabled':'')+'> '+label+'</label>').join('')+'</div>'+noteEditor({id:recordId})+'</section>';
    return head+levels+(depth==='A'?guided:'')+'<article class="atom-body">'+quick+explainers+(depth==='A'?'':guided)+technical+deep+progress+'<section class="lesson-section"><h2>关联技术与共同机制</h2>'+chips(n.related||[])+(n.searchTerms?.length?'<p class="small muted">相关检索词（不表示同义）：'+esc(n.searchTerms.join(' / '))+'</p>':'')+'<div class="dependency-links">'+(n.mechanisms||[]).map(i=>link('#mechanisms/'+i,mechanismMap.get(i)?.name||i)).join('')+(n.problems||[]).map(i=>link('#problems/'+i,problemMap.get(i)?.name||i)).join('')+'</div></section>'+paperAssociations(n)+courseAssociations(n)+'<section><h2>原始来源与核验范围</h2>'+references(n.references||[])+'</section></article>';
  }
  function courseAssociations(n) {
    const explicit=Object.entries(book.courseMap).filter(([,ids])=>ids.includes(n.id)).map(([id])=>id);
    if(!explicit.length)return '';
    return '<details class="legacy-options"><summary>查看相关完整课程</summary>'+p('知识点与课程各自保留学习记录。需要连贯背景时再打开完整课程。')+'<div class="dependency-links">'+explicit.map(id=>link('#lesson/'+id,ctx.courseName(id))).join('')+'</div></details>';
  }
  function coursePoints(id) {
    const ids=book.courseMap[id]||[];
    return ids.length?'<div class="rule-box"><strong>只需要其中一个技术点？</strong>'+chips(ids)+'<p class="small muted">这些知识点可独立学习和记录进度。</p></div>':'';
  }
  function paperPoints(paper) {
    const direct=(book.paperMap[paper.id]||[]).filter(id=>byId.has(id));
    const support=[...new Set(paper.nodes.flatMap(id=>book.courseMap[id]||[]))].filter(id=>!direct.includes(id));
    return (direct.length?'<h3>已核对范围的相关知识点</h3>'+chips(direct):'')+(support.length?'<details><summary>补充相关数学操作</summary>'+p('下列条目来自关联课程，可用于补充背景；不表示已逐一确认论文采用了这些技术。')+chips(support)+'</details>':'');
  }
  function paperAssociations(n) {
    const direct=ctx.papers.filter(p=>(book.paperMap[p.id]||[]).includes(n.id));
    return direct.length?'<section><h2>从这些论文继续理解</h2>'+direct.map(p=>'<p>'+link('#papers/'+p.id,p.title)+'</p>').join('')+'</section>':'';
  }
  function comparisonPoints(ids) {return chips(ids.flatMap(id=>book.courseMap[id]||[]));}
  function reviewSection() {
    const state=getState(),stars=items.filter(n=>state.records[atomRecordId(n)]?.star),review=items.filter(n=>state.records[atomRecordId(n)]?.review),notes=items.filter(n=>state.records[atomRecordId(n)]?.note);
    return '<section><h2>知识点学习与复习</h2><div class="quick-links">'+link('#knowledge?learning=unmastered','尚未自评通过')+link('#knowledge?learning=mastered','已自评通过')+link('#knowledge?learning=star','收藏 '+stars.length)+link('#knowledge?learning=review','待复习 '+review.length)+'</div>'+(review.length?'<h3>接下来重算这些点</h3>'+rows(review):p('可在任意知识点页添加收藏或复习标记。'))+(notes.length?'<h3>知识点笔记</h3>'+notes.map(n=>'<details><summary>'+esc(n.name)+'</summary><p style="white-space:pre-wrap">'+esc(state.records[atomRecordId(n)].note)+'</p>'+atomLink(n.id,'回到知识点编辑')+'</details>').join(''):'')+'</section>';
  }
  function sidebar(view,id) {
    if(view==='concept'&&byId.has(id)){
      const n=byId.get(id);
      return '<details open><summary>当前知识点</summary><ul><li>'+atomLink(id)+'</li>'+(n.related||[]).filter(x=>byId.has(x)).map(x=>'<li>'+atomLink(x)+'</li>').join('')+'</ul></details><div class="dependency-links">'+link('#knowledge','全部知识点')+link('#mechanisms','共同机制')+'</div>';
    }
    return '<details open><summary>按当前需要查找</summary><ul><li>'+link('#knowledge?content=ready&priority=P0','P0 科研核心技术点')+'</li><li>'+link('#knowledge','全部独立知识点')+'</li><li>'+link('#problems','科研问题')+'</li><li>'+link('#mechanisms','共同数学机制')+'</li><li>'+link('#review','收藏与复习')+'</li></ul></details><details><summary>可选的完整课程</summary><ul><li>'+link('#tree','课程与扩展目录')+'</li><li>'+link('#route','14 天推荐路线')+'</li><li>'+link('#graph','课程依赖关系')+'</li><li>'+link('#topics','科研专题')+'</li><li>'+link('#labs','数学实验')+'</li></ul></details><p class="small">'+link('#quality','内容状态与核验')+'</p>';
  }
  return {home,browse,collection,concept,coursePoints,paperPoints,comparisonPoints,reviewSection,sidebar,rows,byId};
}
