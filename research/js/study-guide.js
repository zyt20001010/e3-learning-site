import {renderDayOneLab} from './day-one.js?v=20261126-guides';

const guideHref = (day, section = '') => '#route/'+day+(section?'?section='+section:'');
const anchorId = (day, section) => (day===1?'day-one-':'day-'+day+'-')+section;

export function createStudyGuides(guides, route, {
  esc, p, link, external, table, hero, pointName, labName, readCode
}) {
  const byDay = new Map(guides.map(guide=>[guide.day,guide]));
  const sectionsByPoint = new Map();
  for (const guide of guides) {
    for (const section of guide.groups.flatMap(group=>group.sections)) {
      for (const point of section.points) {
        if (!sectionsByPoint.has(point)) sectionsByPoint.set(point,[]);
        sectionsByPoint.get(point).push({day:guide.day,section});
      }
    }
  }

  const renderBlocks = (blocks, scope) => blocks.map(([kind, value]) => {
    if (kind==='p') return p(value);
    if (kind==='eq') return '<div class="equation"><div data-tex="'+esc(value[0])+'"></div>'+p(value[1])+'</div>';
    if (kind==='table') return table(...value);
    if (kind==='lab') return renderDayOneLab(value,scope);
    if (kind==='source') return '<p class="small">'+external(...value)+'</p>';
    throw new Error('未知的专题内容类型 '+kind);
  }).join('');

  function overview() {
    const entries = route.map(({day,title})=>{
      const guide=byDay.get(day);
      return '<li><span class="study-guide-number">Day '+day+'</span><div><h2>'
        +link(guideHref(day),guide?.title||title)+'</h2>'
        +(guide?p(guide.introduction):'')+'</div></li>';
    }).join('');
    return hero('14 天科研专题','按正在写的研究问题选一天。每一篇都有核心算例、适用条件和一题复算，还可以继续查相关知识点。')
      +'<ol class="study-guide-index" aria-label="研究专题">'+entries+'</ol>'
      +'<p>'+link('#route?view=plan','查看 14 天课程安排')+'</p>';
  }

  function navigation(day) {
    const previous=byDay.get(day-1),next=byDay.get(day+1);
    return '<nav class="study-guide-nav" aria-label="切换专题">'
      +(previous?link(guideHref(previous.day),'上一节 · Day '+previous.day):link('#route','全部专题'))
      +'<label>当前专题<select id="study-guide-select">'+route.map(item=>'<option value="'+item.day+'"'
        +(item.day===day?' selected':'')+'>Day '+item.day+' · '+esc(byDay.get(item.day)?.title||item.title)+'</option>').join('')+'</select></label>'
      +(next?link(guideHref(next.day),'下一节 · Day '+next.day):link('#route','全部专题'))+'</nav>';
  }

  function sectionMarkup(day,section,heading='h3') {
    return '<section id="'+anchorId(day,section.id)+'" class="lesson-section study-guide-section">'
      +'<'+heading+'>'+esc(section.title)+'</'+heading+'>'+renderBlocks(section.blocks,section.id)
      +(section.points.length?'<div class="dependency-links" aria-label="相关知识点">'
        +section.points.map(id=>link('#concept/'+id,pointName(id))).join('')+'</div>':'')
      +'</section>';
  }

  function groupMarkup(day, groups, include) {
    return groups.map(({title,sections})=>{
      const selected=sections.filter(include);
      if (!selected.length) return '';
      if (selected.length===1) return sectionMarkup(day,selected[0]);
      return '<section class="study-guide-group"><h3>'+esc(title)+'</h3>'
        +selected.map(section=>sectionMarkup(day,section,'h4')).join('')+'</section>';
    }).join('');
  }

  const exercise = ([title,prompt,answer])=>'<div class="study-guide-exercise"><h3>'+esc(title)+'</h3>'+p(prompt)
    +'<details><summary>核对答案</summary>'+p(answer)+'</details></div>';

  async function codeMarkup(guide) {
    if (!guide.code) return '';
    const {file,blocks,environment}=guide.code;
    const source=await readCode(file);
    return '<section class="lesson-section study-guide-section" id="'+anchorId(guide.day,'code')+'"><h3>从手算到代码</h3>'
      +renderBlocks(blocks,'code')
      +(source?'<div class="code-block"><div class="code-head"><span>'+esc(environment)
        +'</span><button data-copy="study-guide">复制代码</button></div><pre><code>'+esc(source)+'</code></pre></div>':'')
      +'<p>'+link('examples/'+file,'下载复现脚本')+'</p></section>';
  }

  async function page(day, target) {
    const guide=byDay.get(day);
    if (!guide) {
      const plan=route.find(item=>item.day===day);
      return hero(plan?'专题暂未载入':'未找到专题',plan?'可以重新载入页面，或先查看这一天的课程安排。':'请选择 Day 1 到 Day 14。')
        +'<p>'+link('#route','查看全部专题')+(plan?' · '+link(guideHref(day)+'?view=plan','课程安排'):'')+'</p>';
    }
    const core=section=>!guide.core||guide.core.includes(section.id);
    const sections=guide.groups.flatMap(group=>group.sections);
    const mainSections=sections.filter(core);
    const supplemental=sections.filter(section=>!core(section));
    const applyId=anchorId(day,'application'),practiceId=anchorId(day,'practice');
    const coreExercises=guide.focusExercise===undefined?guide.exercises:[guide.exercises[guide.focusExercise]];
    const extraExercises=guide.focusExercise===undefined?[]:guide.exercises.filter((_,index)=>index!==guide.focusExercise);
    const jumpLinks=[...mainSections.map(section=>[anchorId(day,section.id),section.title]),[applyId,'放到研究中'],[practiceId,'独立复算']];
    const extrasOpen=supplemental.some(section=>anchorId(day,section.id)===target)||target===anchorId(day,'code');
    const optional=supplemental.length||guide.code
      ? '<details class="study-guide-extra"'+(extrasOpen?' open':'')+'><summary>展开补充讲解与代码</summary>'
        +groupMarkup(day,guide.groups,section=>!core(section))+await codeMarkup(guide)+'</details>'
      : '';
    const labs=(guide.labs||[]).map(id=>link('#labs/'+id,labName(id)));
    return '<div class="breadcrumb">'+link('#route','科研专题')+' / Day '+day+'</div>'
      +hero(guide.title,guide.introduction,'E3 RESEARCH · DAY '+day)
      +'<div class="study-guide-content" data-study-day="'+day+'">'+navigation(day)
      +'<nav class="study-guide-toc" aria-label="本节步骤">'+jumpLinks.map(([id,title])=>link(guideHref(day,id),title)).join('')+'</nav>'
      +'<section class="study-guide-core"><h2>核心算例</h2>'+groupMarkup(day,guide.groups,core)+'</section>'
      +'<section class="lesson-section study-guide-section" id="'+applyId+'"><h2>放到研究中</h2>'
      +renderBlocks(guide.application,'application')+'</section>'
      +'<section class="lesson-section study-guide-section" id="'+practiceId+'"><h2>独立复算</h2>'
      +coreExercises.map(exercise).join('')
      +(extraExercises.length?'<details><summary>更多练习</summary>'+extraExercises.map(exercise).join('')+'</details>':'')+'</section>'
      +optional
      +'<div class="study-guide-resources"><h2>继续深入</h2><div class="dependency-links">'
      +link(guideHref(day)+'?view=plan','配套课程与自测')+labs.join('')+'</div></div></div>';
  }

  function related(point, detailed) {
    const matches=sectionsByPoint.get(point);
    if (!matches?.length) return '';
    const links=matches.map(({day,section})=>link(guideHref(day,anchorId(day,section.id)),'Day '+day+' · '+section.title));
    const fromGuide=matches.filter(({day})=>day===matches[0].day);
    if (!detailed) {
      return '<div class="study-guide-related"><strong>在专题算例中查看</strong><div class="dependency-links">'
        +links.join('')+'</div></div>';
    }
    return '<section class="lesson-section"><h2>在专题算例中展开</h2>'
      +fromGuide.map(({day,section},index)=>'<details'+(index===0?' open':'')+'><summary>'+esc(section.title)+'</summary>'
        +(section.standaloneSetup?p(section.standaloneSetup):'')+renderBlocks(section.blocks,'point-'+section.id)
        +'<p class="small">'+link(guideHref(day,anchorId(day,section.id)),'到 Day '+day+' 查看前后步骤')+'</p></details>').join('')
      +(fromGuide.length<links.length?'<div class="dependency-links">'+links.slice(fromGuide.length).join('')+'</div>':'')
      +'</section>';
  }

  function forLessons(lessonIds) {
    const days=route.filter(item=>byDay.has(item.day)&&item.units.some(unit=>lessonIds.includes(unit.nodeId)));
    if (!days.length) return '';
    return '<div class="study-guide-related"><strong>相关专题算例</strong><div class="dependency-links">'
      +days.map(({day})=>link(guideHref(day),'Day '+day+' · '+byDay.get(day).title)).join('')+'</div></div>';
  }

  return {overview,page,related,forLessons,hasDay:day=>byDay.has(day)};
}
