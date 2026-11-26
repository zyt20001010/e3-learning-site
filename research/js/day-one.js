const doseSamples = [1, 2, 3, 4].map(x => [x, 2 * x]);
const training = {x:2, y:4, theta:[0.5, 0, 2, 0]};
const maximumRate = 0.12;

function forward(theta) {
  const [w1, b1, w2, b2] = theta;
  const z = w1 * training.x + b1;
  const h = Math.max(0, z);
  const prediction = w2 * h + b2;
  const residual = prediction - training.y;
  return {z, h, prediction, residual, loss:residual ** 2 / 2};
}

export function trainingStep(rate) {
  const initial = forward(training.theta);
  const dZ = initial.residual * training.theta[2] * Number(initial.z > 0);
  const gradient = [dZ * training.x, dZ, initial.residual * initial.h, initial.residual];
  const updated = training.theta.map((value, index) => value - rate * gradient[index]);
  return {initial, gradient, updated, after:forward(updated)};
}

export function fitLine(weight, bias) {
  const rows = doseSamples.map(([x, y]) => {
    const prediction = weight * x + bias;
    return {x, y, prediction, residual:prediction - y};
  });
  const mse = rows.reduce((sum, row) => sum + row.residual ** 2, 0) / rows.length;
  return {rows, mse};
}

const labTitles = {line:'手调权重和偏置', rate:'同一初始梯度，不同步长'};
const colors = {ink:'#14333d', axes:'#69828b', grid:'#dbe7e9', observed:'#a34625', prediction:'#087e8b'};

function slider(id, label, min, max, step, value) {
  return '<label for="'+id+'">'+label+' <output for="'+id+'" data-slider-value="'+id+'">'+value+'</output>'
    +'<input id="'+id+'" type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+value+'"></label>';
}

function labMarkup(kind, scope) {
  const id = 'day-one-'+scope+'-'+kind;
  const isLine = kind === 'line';
  const controls = isLine
    ? slider(id+'-w','权重 w',0,3,0.1,0.5)+slider(id+'-b','偏置 b',-3,3,0.1,0)
    : slider(id+'-eta','学习率 η',0,maximumRate,0.001,0.05);
  const description = isLine
    ? '橙点是观测，蓝线是当前预测。试着把四个样本的均方误差降到零。'
    : '每次从初始参数出发，只改这一步的学习率。曲线是更新后的损失，虚线是初始损失 2。';
  const start = isLine
    ? '当前均方误差 16.875。输入 2 时，预测 1。'
    : '学习率 0.050。更新后预测 4.3，损失 0.045。';
  return '<section class="lab day-one-lab" data-day-one-lab="'+kind+'" aria-label="'+labTitles[kind]+'">'
    +'<h4>'+labTitles[kind]+'</h4><p>'+description+'</p><div class="lab-controls">'+controls+'</div>'
    +'<output class="day-one-result" aria-live="polite">'+start+'</output>'
    +'<canvas width="620" height="240" role="img" aria-label="'+description+'"></canvas>'
    +'<p class="small muted day-one-axis">'+(isLine?'横轴为输入 x，纵轴为观测和预测。':'横轴为学习率 η，纵轴为一次更新后的损失。')+'</p>'
    +'<div class="day-one-values"></div></section>';
}

function number(value, decimals = 6) {
  return String(Number(value.toFixed(decimals)));
}

function drawPlot(canvas, {xMax, yMin=0, yMax, xTicks, yTicks, curves, dots}) {
  const bounds = canvas.getBoundingClientRect();
  if (bounds.width < 80 || bounds.height < 80) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(bounds.width * ratio);
  canvas.height = Math.round(bounds.height * ratio);
  context.scale(ratio, ratio);
  const width = bounds.width, height = bounds.height;
  const left = 40, right = width - 15, top = 14, bottom = height - 29;
  const px = x => left + x / xMax * (right - left);
  const py = y => bottom - (y - yMin) / (yMax - yMin) * (bottom - top);

  context.font = '12px system-ui, sans-serif';
  context.strokeStyle = colors.grid;
  context.fillStyle = colors.ink;
  context.textAlign = 'right';
  for (const value of yTicks) {
    const y = py(value);
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(right, y);
    context.stroke();
    context.fillText(number(value), left - 6, y + 4);
  }
  context.textAlign = 'center';
  for (const value of xTicks) context.fillText(number(value), px(value), height - 8);
  context.strokeStyle = colors.axes;
  context.beginPath();
  context.moveTo(left, top);
  context.lineTo(left, bottom);
  context.lineTo(right, bottom);
  context.stroke();

  context.save();
  context.beginPath();
  context.rect(left - 5, top - 5, right - left + 10, bottom - top + 10);
  context.clip();
  for (const curve of curves) {
    context.strokeStyle = curve.color;
    context.lineWidth = 2.2;
    context.setLineDash(curve.dashed ? [5, 5] : []);
    context.beginPath();
    curve.values.forEach(([x, y], index) => {
      if (index === 0) context.moveTo(px(x), py(y));
      else context.lineTo(px(x), py(y));
    });
    context.stroke();
  }
  context.setLineDash([]);
  for (const point of dots) {
    context.fillStyle = point.color;
    context.beginPath();
    context.arc(px(point.x), py(point.y), 4.5, 0, 2 * Math.PI);
    context.fill();
  }
  context.restore();
}

function updateLine(lab, canvas, weight, bias) {
  const {rows, mse} = fitLine(weight, bias);
  lab.querySelector('.day-one-result').textContent =
    '当前均方误差 '+number(mse, 4)+'。输入 2 时，预测 '+number(rows[1].prediction)+ '。';
  lab.querySelector('.day-one-values').innerHTML = '<div class="table-wrap"><table><thead><tr>'
    +'<th scope="col">输入</th><th scope="col">观测</th><th scope="col">预测</th><th scope="col">残差</th>'
    +'</tr></thead><tbody>'+rows.map(row=>'<tr><td>'+row.x+'</td><td>'+row.y+'</td><td>'
      +number(row.prediction)+'</td><td>'+number(row.residual)+'</td></tr>').join('')+'</tbody></table></div>';
  const xMax = 4.25;
  const predictedEnd = weight * xMax + bias;
  const yMin = bias < 0 ? -4 : 0;
  const yMax = Math.max(8, Math.ceil(predictedEnd / 4) * 4);
  const yTicks = Array.from({length:(yMax-yMin)/4+1}, (_, i) => yMin+4*i);
  drawPlot(canvas, {xMax, yMin, yMax, xTicks:[0,1,2,3,4], yTicks,
    curves:[{color:colors.prediction,values:[[0,bias],[xMax,predictedEnd]]}],
    dots:rows.map(row=>({x:row.x,y:row.y,color:colors.observed}))});
}

const rateCurve = Array.from({length:61}, (_, index) => {
  const rate = maximumRate * index / 60;
  return [rate, trainingStep(rate).after.loss];
});

function updateRate(lab, canvas, rate) {
  const {initial, updated, after} = trainingStep(rate);
  lab.querySelector('.day-one-result').textContent = '学习率 '+rate.toFixed(3)
    +'。更新后预测 '+number(after.prediction)+'，损失 '+number(after.loss)+'。';
  lab.querySelector('.day-one-values').textContent = '更新后的参数 (w₁, b₁, w₂, b₂) = ('
    +updated.map(value=>number(value)).join(', ')+')。';
  drawPlot(canvas, {xMax:maximumRate, yMax:8, xTicks:[0,0.03,0.06,0.09,0.12], yTicks:[0,2,4,6,8],
    curves:[{color:colors.prediction,values:rateCurve},
      {color:colors.axes,dashed:true,values:[[0,initial.loss],[maximumRate,initial.loss]]}],
    dots:[{x:rate,y:after.loss,color:colors.observed}]});
}

export function activateDayOneLabs(parent) {
  const cleanups = [];
  for (const lab of parent.querySelectorAll('[data-day-one-lab]')) {
    const inputs = [...lab.querySelectorAll('input[type="range"]')];
    const values = [...lab.querySelectorAll('[data-slider-value]')];
    const canvas = lab.querySelector('canvas');
    const refresh = () => {
      inputs.forEach((input, index) => { values[index].textContent = input.value; });
      const [first, second] = inputs.map(input => input.valueAsNumber);
      if (lab.dataset.dayOneLab === 'line') updateLine(lab, canvas, first, second);
      else updateRate(lab, canvas, first);
    };
    lab.addEventListener('input', refresh);
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(refresh) : null;
    observer?.observe(canvas);
    refresh();
    cleanups.push(() => {
      lab.removeEventListener('input', refresh);
      observer?.disconnect();
    });
  }
  return () => cleanups.forEach(cleanup => cleanup());
}

const exerciseId = 'day-one-practice';
const codeId = 'day-one-code';
const sectionHref = id => '#route/1?section='+id;
const sectionId = section => 'day-one-'+section.id;

export function createDayOne(guide, {esc, p, link, external, table, hero, pointName, readCode}) {
  const sections = guide.groups.flatMap(group => group.sections);
  const renderBlocks = (blocks, scope) => blocks.map(([kind, value]) => {
    if (kind === 'p') return p(value);
    if (kind === 'eq') return '<div class="equation"><div data-tex="'+esc(value[0])+'"></div>'+p(value[1])+'</div>';
    if (kind === 'table') return table(...value);
    if (kind === 'lab') return labMarkup(value, scope);
    if (kind === 'source') return '<p class="small">'+external(...value)+'</p>';
    throw new Error('未知的 Day 1 内容类型 '+kind);
  }).join('');
  const pointLinks = section => {
    if (!section.points.length) return '';
    return '<div class="dependency-links" aria-label="相关知识点">'+section.points.map(id => link('#concept/'+id, pointName(id))).join('')+'</div>';
  };

  async function page() {
    const filename = 'day-one-training.py';
    const source = await readCode(filename);
    const toc = '<nav class="day-one-toc" aria-label="Day 1 讲义目录"><ol>'
      +guide.groups.map(({title, sections}) => '<li>'+link(sectionHref(sectionId(sections[0])), title)+'</li>').join('')
      +'<li>'+link(sectionHref(codeId),'代码复现')+'</li><li>'+link(sectionHref(exerciseId),'独立复算')+'</li></ol></nav>';
    const lesson = guide.groups.map(group => '<section class="day-one-group"><h2>'+esc(group.title)+'</h2>'
      +group.sections.map(section => '<section id="'+sectionId(section)+'" class="lesson-section day-one-section"><h3>'
        +esc(section.title)+'</h3>'+renderBlocks(section.blocks, section.id)+pointLinks(section)+'</section>').join('')
      +'</section>').join('');
    const code = '<section class="lesson-section day-one-section" id="'+codeId+'"><h2>从手算到代码</h2>'
      +p('Python 标准库脚本用同一个样本计算解析梯度，再逐参数用中心差分复核。差分点都在当前 ReLU 正半轴内。脚本还检查不同学习率以及第一层梯度为零的反例。')
      +(source?'<div class="code-block"><div class="code-head"><span>Python 标准库</span><button data-copy="day-one">复制代码</button></div><pre><code>'
        +esc(source)+'</code></pre></div>':'')
      +'<p>'+link('examples/'+filename,'下载复现脚本')+'</p>'
      +p('迁移到 PyTorch 时，一般先用 optimizer.zero_grad() 清理上一步的累积，再用 loss.backward() 计算梯度，最后调用 optimizer.step() 更新参数。需要累积多个小批的梯度时，清理和更新的位置随训练设计调整。')
      +'<p class="small">'+external('https://docs.pytorch.org/docs/2.15/generated/torch.Tensor.backward.html','PyTorch 关于 backward 与梯度累积的说明')+'</p></section>';
    const exercises = '<section class="lesson-section day-one-section" id="'+exerciseId+'"><h2>独立复算</h2>'
      +guide.exercises.map(([title, prompt, answer])=>'<div class="day-one-exercise"><h3>'+esc(title)+'</h3>'+p(prompt)
        +'<details><summary>核对答案</summary>'+p(answer)+'</details></div>').join('')+'</section>';
    return '<div class="breadcrumb">'+link('#route','可选学习路线')+' / Day 1</div>'
      +hero(guide.title, guide.introduction, 'E3 RESEARCH · DAY 1')
      +'<div class="day-one-content">'+toc+lesson+code+exercises+'<div class="button-row">'
      +link('#route/1?view=plan','查看 Day 1 课程安排')+link('#route/2','Day 2 · 卷积与统计核')+'</div></div>';
  }

  function related(pointId, showWorkedSections) {
    const matches = sections.filter(section => section.points.includes(pointId));
    if (!matches.length) return '';
    if (!showWorkedSections) {
      return '<div class="day-one-related"><strong>在同一个训练例中查看</strong><div class="dependency-links">'
        +matches.map(section => link(sectionHref(sectionId(section)), section.title)).join('')+'</div></div>';
    }
    return '<section class="lesson-section"><h2>在同一个训练例中展开</h2>'
      +matches.map((section,index) => '<details'+(index===0?' open':'')+'><summary>'+esc(section.title)+'</summary>'
        +(section.standaloneSetup?p(section.standaloneSetup):'')+renderBlocks(section.blocks, 'point-'+section.id)
        +'<p class="small">'+link(sectionHref(sectionId(section)),'到 Day 1 查看前后步骤')+'</p></details>').join('')+'</section>';
  }
  return {page, related};
}
