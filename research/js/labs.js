import * as M from './math.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f=(x,n=4)=>Number.isFinite(x)?Number(x.toFixed(n)).toString():x===-Infinity?'−∞':'未定义';
const table=(heads,rows)=>'<div class="table-wrap"><table class="compact"><thead><tr>'+heads.map(x=>'<th scope="col">'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
const matrix=(title,a)=>'<h4>'+esc(title)+'</h4>'+table(a[0].map((_,j)=>'列 '+(j+1)),a.map(r=>r.map(x=>f(x))));
const para=s=>'<p>'+s+'</p>';
const small=s=>'<p class="small">'+s+'</p>';
const range=(id,title,min,max,step,value)=>'<label>'+esc(title)+' <output data-value="'+id+'">'+value+'</output><input type="range" data-control="'+id+'" aria-label="'+esc(title)+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+value+'"></label>';
const number=(id,title,value,step=1,min=-100,max=100)=>'<label>'+esc(title)+'<input type="number" data-control="'+id+'" aria-label="'+esc(title)+'" value="'+value+'" step="'+step+'" min="'+min+'" max="'+max+'"></label>';
const select=(id,title,items)=>'<label>'+esc(title)+'<select data-control="'+id+'" aria-label="'+esc(title)+'">'+items.map(([v,t])=>'<option value="'+v+'">'+esc(t)+'</option>').join('')+'</select></label>';
const inputMatrix=(id,title,a)=>'<div class="matrix-block"><h4>'+esc(title)+'</h4><div class="matrix-input" style="grid-template-columns:repeat('+a[0].length+',1fr)">'+a.flatMap((r,i)=>r.map((x,j)=>'<input type="number" data-matrix="'+id+'" data-row="'+i+'" data-col="'+j+'" aria-label="'+esc(title)+' 第'+(i+1)+'行第'+(j+1)+'列" value="'+x+'" min="-20" max="20" step="0.25">')).join('')+'</div></div>';
function plot(series,opts={}){
  const {xLabel='步数',yLabel='数值',minimum,maximum}=opts;
  const w=620,h=245,left=57,right=18,top=25,bottom=43;
  const all=series.flatMap(s=>s.y);let lo=minimum??Math.min(...all),hi=maximum??Math.max(...all);
  if(lo===hi){lo-=.5;hi+=.5;}const span=hi-lo;lo-=.08*span;hi+=.08*span;
  const longest=Math.max(...series.map(s=>s.y.length)),xMax=opts.xMax??longest-1;
  const px=i=>left+(w-left-right)*i/(longest-1||1),py=y=>h-bottom-(h-top-bottom)*(y-lo)/(hi-lo);
  const colors=['#087e8b','#c2692f','#665ca0'];
  let svg='<svg class="plot" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+esc(yLabel)+' 随 '+esc(xLabel)+' 变化">';
  for(const v of [0,.5,1]){const y=lo+v*(hi-lo);svg+='<path d="M '+left+' '+py(y)+' H '+(w-right)+'" stroke="#dce6e8"/><text x="'+(left-8)+'" y="'+(py(y)+4)+'" text-anchor="end">'+f(y,2)+'</text>';}
  svg+='<path d="M '+left+' '+top+' V '+(h-bottom)+' H '+(w-right)+'" fill="none" stroke="#7b939b"/>';
  series.forEach((s,k)=>{svg+='<polyline fill="none" stroke="'+colors[k%3]+'" stroke-width="2" points="'+s.y.map((y,i)=>px(i)+','+py(y)).join(' ')+'"/><text x="'+(left+k*170)+'" y="15" style="fill:'+colors[k%3]+'">'+esc(s.name)+'</text>';});
  return svg+'<text x="'+left+'" y="'+(h-bottom+20)+'">0</text><text x="'+(w-right)+'" y="'+(h-bottom+20)+'" text-anchor="end">'+f(xMax,2)+'</text><text x="'+w/2+'" y="'+(h-4)+'" text-anchor="middle">'+esc(xLabel)+'</text><text x="'+left+'" y="'+(top+15)+'">'+esc(yLabel)+'</text></svg>';
}
export const LABS=[
  {id:'backprop',title:'一个神经元的前向与反向计算',nodeId:'backprop'},
  {id:'convolution',title:'移动卷积核，检查每次乘加',nodeId:'convolution'},
  {id:'kernels',title:'带宽、Gram 矩阵与核回归',nodeId:'kernels'},
  {id:'gnn',title:'逐层执行图消息传递',nodeId:'gnn'},
  {id:'attention',title:'编辑 Q、K、V 并计算权重',nodeId:'attention'},
  {id:'fourier',title:'改变相位，观察时域与频域',nodeId:'fourier'},
  {id:'sampling',title:'重要性权重与 MCMC 频率',nodeId:'sampling'},
  {id:'diffusion',title:'Gaussian 加噪与条件去噪',nodeId:'diffusion'},
  {id:'flow-matching',title:'概率路径与速度场的数值积分',nodeId:'flow-matching'},
  {id:'ode-sde',title:'ODE、随机路径与滤波更新',nodeId:'ode-sde'},
  {id:'noncommutativity',title:'交换输入顺序，比较终点',nodeId:'noncommutativity'},
  {id:'counterfactual',title:'相同边缘分布，不同反事实耦合',nodeId:'counterfactual'},
  {id:'branching',title:'净增长相同，二阶矩不同',nodeId:'branching'},
  {id:'bandit',title:'三臂老虎机的选择与累计遗憾',nodeId:'bandit'},
  {id:'mcts',title:'逐阶段执行 MCTS 搜索与回传',nodeId:'mcts'},
  {id:'experimental-design',title:'改变实验，计算期望信息增益',nodeId:'experimental-design'},
  {id:'pkpd',title:'浓度—时间与浓度—效应',nodeId:'pkpd'}
];
const controls={
  backprop:()=>number('x','输入 x',2,.1)+number('w','权重 w',.5,.1)+number('b','偏置 b',.1,.1)+number('target','目标 y',1,.1)+select('activation','激活函数',[['tanh','Tanh'],['relu','ReLU'],['linear','恒等']]),
  convolution:()=>range('position','滑动位置',0,3,1,0)+select('channels','输入/输出通道',[['1','1 个输入、1 个输出'],['2','2 个输入、2 个输出']]),
  kernels:()=>range('sigma','带宽 σ',.15,3,.05,1)+range('query','查询位置',-2,2,.1,.5),
  gnn:()=>range('layers','消息传递层数',1,12,1,1)+select('normalization','归一化',[['mean','带自环的行均值'],['gcn','GCN 对称归一化']])+select('edge','边 (1,3)',[['0','不连接'],['1','连接']]),
  attention:()=>select('causal','注意力掩码',[['0','无掩码'],['1','仅可见当前与之前位置']]),
  fourier:()=>range('amplitude','振幅',.25,2,.25,1)+range('frequency','每 8 点的周期数',1,3,1,1)+range('phase','相位（弧度）',0,6.28,.05,0),
  sampling:()=>range('proposal','提议分布集中程度',0,.95,.05,.75)+range('samples','样本数',100,3000,100,1000)+number('seed','随机种子',20261126,1,0,4294967295),
  diffusion:()=>range('alpha','保留信号方差比例 α',0,1,.05,.5)+range('xt','带噪观测值 xₜ',-3,4,.1,1),
  'flow-matching':()=>range('steps','Euler 步数',2,200,2,40)+range('mean','目标均值',-2,3,.25,2)+range('sigma','目标标准差',.25,2,.25,.5),
  'ode-sde':()=>range('rate','衰减率 k',.1,2,.1,1)+range('sigma','扩散系数 σ',0,1,.1,.3)+range('dt','时间步长 Δt',.01,.1,.01,.05)+number('observation','滤波观测值',2,.1)+number('seed','随机种子',20261126,1,0,4294967295),
  noncommutativity:()=>range('a','A 的作用时长 s',0,2,.1,1)+range('b','B 的作用时长 t',0,2,.1,1),
  counterfactual:()=>range('joint','联合概率 P(Y⁰=1,Y¹=1)',0,.5,.025,.25),
  branching:()=>range('birth','分裂率 b',.2,1.5,.1,.6)+range('time','时刻 t',0,4,.25,2),
  bandit:()=>range('mean3','第 3 臂成功概率',.1,.9,.05,.7)+range('horizon','轮数',30,600,30,300)+number('seed','随机种子',20261126,1,0,4294967295),
  mcts:()=>range('round','搜索轮次',1,80,1,6)+select('phase','查看阶段',[['0','1 选择'],['1','2 扩展'],['2','3 模拟'],['3','4 回传']])+range('exploration','探索系数 c',0,3,.25,1)+number('seed','随机种子',20261126,1,0,4294967295),
  'experimental-design':()=>range('prior','先验 P(ϑ=1)',0,1,.05,.5)+range('accuracy','实验正确率 a',.5,1,.05,.9)+select('outcome','假设观测结果',[['1','Y=1'],['0','Y=0']]),
  pkpd:()=>range('clearance','清除率 CL（L/h）',1,10,.5,5)+range('ec50','EC50（mg/L）',.2,5,.2,2)
};
const extras={
  convolution:()=>'<div class="matrix-row">'+inputMatrix('x','输入 X',[[1,2,3],[4,5,6],[7,8,9]])+inputMatrix('k','卷积核 K',[[1,0],[0,-1]])+'</div>',
  attention:()=>'<div class="matrix-row">'+inputMatrix('q','Q',[[1,0],[0,1],[1,1]])+inputMatrix('k','K',[[1,0],[0,1],[1,1]])+inputMatrix('v','V',[[1,0],[0,2],[1,1]])+'</div>'
};
export function renderLab(id){
  const lab=LABS.find(x=>x.id===id);if(!lab)return '';
  return '<section class="lab" id="experiment" data-lab="'+id+'"><h2>'+lab.title+'</h2><p class="synthetic">合成数据教学实验。数值来自下列明确公式与参数；不代表临床或药理实验结果。</p>'+(extras[id]?.()||'')+'<div class="lab-controls">'+controls[id]()+'</div><div class="lab-output" aria-live="polite"></div></section>';
}
export function activateLabs(container){
  container.querySelectorAll('[data-lab]').forEach(el=>{
    const id=el.dataset.lab,out=el.querySelector('.lab-output');
    const value=id=>Number(el.querySelector('[data-control="'+id+'"]').value);
    const text=id=>el.querySelector('[data-control="'+id+'"]').value;
    const readMatrix=id=>{
      const inputs=[...el.querySelectorAll('[data-matrix="'+id+'"]')],a=[];
      for(const input of inputs){const i=Number(input.dataset.row),j=Number(input.dataset.col);a[i]??=[];a[i][j]=Number(input.value);}
      return a;
    };
    const update=()=>{
      for(const output of el.querySelectorAll('output[data-value]'))output.textContent=text(output.dataset.value);
      try{
        let html='';
        if(id==='backprop'){
          const x=value('x'),w=value('w'),b=value('b'),target=value('target'),act=text('activation'),r=M.neuron(x,w,b,target,act),epsilon=1e-5;
          const plus=M.neuron(x,w+epsilon,b,target,act).loss,minus=M.neuron(x,w-epsilon,b,target,act).loss;
          html=table(['中间量','数值','运算'],[['z',f(r.z),'w × x + b'],['ŷ',f(r.y),'activation(z)'],['L',f(r.loss),'(ŷ − y)² / 2'],['∂L/∂ŷ',f(r.dy),'ŷ − y'],['∂L/∂z',f(r.dz),'∂L/∂ŷ × activation′(z)'],['∂L/∂w',f(r.dw),'∂L/∂z × x'],['中心有限差分',f((plus-minus)/(2*epsilon)),'[L(w+ε)−L(w−ε)] / (2ε)']])+small('此处计算梯度，尚未更新参数。ReLU 在 z=0 不可微，程序采用导数 0 的约定；该点的中心差分不必与约定相同。');
        }else if(id==='convolution'){
          const x=readMatrix('x'),k=readMatrix('k'),pos=value('position'),row=Math.floor(pos/2),col=pos%2,y=M.correlate2d(x,k);
          const terms=k.flatMap((r,i)=>r.map((v,j)=>f(x[row+i][col+j])+' × '+f(v)));
          html='<div class="calculation">输出位置 ('+(row+1)+','+(col+1)+')：'+terms.join(' + ')+' = '+f(y[row][col])+'</div>'+matrix('有效互相关的输出',y);
          if(value('channels')===2){const x2=x.map(r=>r.map(v=>v*.5)),k2=k.map(r=>r.map(v=>-v));const maps=M.multiChannel([x,x2],[[k,k],[k,k2]]);html+=para('第2输入通道 = X/2。输出通道1使用 [K,K]；输出通道2使用 [K,−K]。先逐输入通道计算，再求和。')+maps.map((m,i)=>matrix('输出通道 '+(i+1),m)).join('');}
          html+=small('无填充、步幅 1。深度学习常把这个未翻核运算称为卷积；严格离散卷积需先翻转核。');
        }else if(id==='kernels'){
          const xs=[-1,0,1],ys=[1,0,2],sigma=value('sigma'),r=M.kernelRegression(xs,ys,value('query'),sigma);
          html=matrix('RBF Gram 矩阵 K',M.rbfGram(xs,sigma))+table(['训练 x','训练 y','查询的归一化权重'],xs.map((x,i)=>[x,ys[i],f(r.weights[i])]))+para('预测 = Σ wᵢyᵢ = <strong>'+f(r.prediction)+'</strong>；权重和 = '+f(r.weights.reduce((a,b)=>a+b,0))+'。这里是 Nadaraya–Watson 平滑，并非核岭回归的系数解。');
        }else if(id==='gnn'){
          const edge=value('edge'),a=[[0,1,edge],[1,0,1],[edge,1,0]],history=[[1,2,4]];let r;
          for(let i=0;i<value('layers');i++){r=M.graphStep(a,history.at(-1),text('normalization')==='gcn');history.push(r.output);}
          html=matrix('加自环后的传播矩阵',r.normalized)+table(['层','节点1','节点2','节点3'],history.map((row,i)=>[i,...row.map(v=>f(v))]))+small('参数权重固定为 1，激活取恒等，专门观察聚合。GCN 对称归一化不保证每行和为 1；不要把它一概解释为概率平均。');
        }else if(id==='attention'){
          const r=M.attention(readMatrix('q'),readMatrix('k'),readMatrix('v'),value('causal')===1);
          html=matrix('QKᵀ / √2（含掩码）',r.scores)+matrix('逐行 Softmax 权重 A',r.weights)+matrix('输出 AV',r.output)+small('直接编辑投影后的 Q、K、V；模型中通常由 XWQ、XWK、XWV 产生。掩码改变可见位置，不建立真实世界的因果识别。');
        }else if(id==='fourier'){
          const x=Array.from({length:8},(_,n)=>value('amplitude')*Math.cos(2*Math.PI*value('frequency')*n/8+value('phase'))),s=M.dft(x),lost=M.idft(s.map(z=>({re:z.magnitude,im:0})));
          html=plot([{name:'原信号',y:x},{name:'只保留幅度的重建',y:lost}],{xLabel:'采样点 n',yLabel:'信号值'})+table(['频率格 k','Re X[k]','Im X[k]','幅度','相位（rad）'],s.map((z,k)=>[k,f(z.re),f(z.im),f(z.magnitude),z.magnitude<1e-10?'无定义（零幅度）':f(z.phase)]))+small('零幅度处不解释相位。这里的频率恰好落在 DFT 格点；非整数周期还会发生频谱泄漏。连线仅连接离散样点。');
        }else if(id==='sampling'){
          const p=[.4,.1,.05,.1,.35],c=value('proposal'),q=p.map((_,i)=>(1-c)/5+(i===0?c:0)),n=value('samples'),seed=value('seed'),r=M.importanceSampling(p,q,n,seed),mh=M.metropolis(p,n,seed);
          html=table(['状态','目标 p','提议 q','权重 p/q','提议频率','MH 频率'],p.map((x,i)=>[i,x,f(q[i]),f(x/q[i]),f(r.counts[i]/n),f(mh.counts[i]/n)]))+para('自归一化 IS 均值 = '+f(r.estimate)+'；目标均值 = '+f(r.truth)+'；ESS = '+f(r.ess,1)+' / '+n+'。')+small('MH 使用均匀独立提议，按 min(1,p新/p旧) 接受；展示含初始暂态的全部迭代。IS 自归一化估计有限样本有偏；ESS 是权重诊断，不是精确独立样本数。');
        }else if(id==='diffusion'){
          const a=value('alpha'),r=M.gaussianDenoising(a,2,.25,value('xt'));
          html=table(['对象','均值','方差'],[['原始 X₀',2,.25],['带噪 Xₜ',f(r.marginalMean),f(r.marginalVariance)],['X₀ | Xₜ',f(r.posteriorMean),f(r.posteriorVariance)]])+'<div class="calculation">Xₜ = √α X₀ + √(1−α) ε；ε ~ N(0,1)，独立于 X₀。</div>'+para('解析 score ∂ log pₜ(x)/∂x = '+f(r.score)+'。条件均值只给一个点；生成条件样本还需要条件方差。')+small('这是已知 Gaussian 分布的一步解析实验，没有训练神经网络，不等同于通用 DDPM。');
        }else if(id==='flow-matching'){
          const initial=[-2,-1,0,1,2],mean=value('mean'),sigma=value('sigma'),steps=value('steps'),out=M.gaussianFlow(initial,mean,sigma,steps);
          html=table(['初始粒子','Euler 终点','解析终点 μ+σx₀','绝对误差'],initial.map((x,i)=>[x,f(out[i]),f(mean+sigma*x),f(Math.abs(out[i]-mean-sigma*x),6)]))+'<div class="calculation">pₜ = N(tμ, (1−t)²+t²σ²)<br>uₜ(x)=μ+[tσ²−(1−t)]/[ (1−t)²+t²σ² ] × (x−tμ)</div>'+small('速度是独立 Gaussian 端点线性插值的条件期望。实验使用解析速度场，展示离散化误差；未训练向量场。独立端点耦合不自动是最优传输耦合。');
        }else if(id==='ode-sde'){
          const dt=value('dt'),steps=Math.round(4/dt),path=M.ouPath(value('rate'),value('sigma'),dt,steps,value('seed')),ode=path.map((_,i)=>Math.exp(-value('rate')*i*dt)),kf=M.kalmanUpdate(0,1,value('observation'),1);
          html=plot([{name:'随机离散轨迹',y:path},{name:'ODE解 / SDE均值',y:ode}],{xLabel:'时间 t',yLabel:'状态 X',xMax:steps*dt})+para('独立的一维滤波示例：先验 N(0,1)，观测误差方差 1。Kalman 增益 = '+f(kf.gain)+'，后验均值 = '+f(kf.mean)+'，后验方差 = '+f(kf.variance)+'。')+small('Euler–Maruyama 随机增量为 σ√Δt·Z。滤波更新不声称从该路径估计了未知机制参数。');
        }else if(id==='noncommutativity'){
          const r=M.doseOrder(value('a'),value('b'));
          html=para('列向量状态 x₀=(1,0)ᵀ。A=[[0,1],[0,0]]，B=Aᵀ；A²=B²=0。')+matrix('exp(sA) = I+sA',r.expA)+matrix('exp(tB) = I+tB',r.expB)+table(['输入顺序','终点第1分量','终点第2分量'],[['先 A 后 B',...r.AB.map(x=>f(x))],['先 B 后 A',...r.BA.map(x=>f(x))]])+para('矩阵从右向左作用。第1分量差 = '+f(r.BA[0]-r.AB[0])+'。转置对偶系统交换这两个顺序的响应；恒定输入下 cᵀexp(Mt)b 在 b=c=e₁ 时却保持相同。')+small('这是线性代数反例，未校准为具体药物，也不自动满足生理状态约束。');
        }else if(id==='counterfactual'){
          const r=M.binaryCoupling(value('joint'));
          html=table(['','Y¹=0','Y¹=1'],[['Y⁰=0',...r.joint[0].map(x=>f(x))],['Y⁰=1',...r.joint[1].map(x=>f(x))]])+para('两个边缘始终是 Bernoulli(0.5)，ATE 始终为 0。受益概率 P(Y¹&gt;Y⁰) = '+f(r.benefit)+'；P(Y¹=1 | Y⁰=0) = '+f(r.individualBenefitGivenZero)+'。')+para('滑块改变两个潜在结果的配对；两个干预边缘不能选择这个联合分布。');
        }else if(id==='branching'){
          const birth=value('birth'),death=birth-.2,t=value('time'),r=M.birthDeathMoments(birth,death,t),baseline=M.birthDeathMoments(.2,0,t);
          html=table(['模型','分裂 b','死亡 d','E Nₜ','E[Nₜ(Nₜ−1)]','Var Nₜ'],[['当前',f(birth),f(death),f(r.mean),f(r.factorialSecond),f(r.variance)],['相同净增长',.2,0,f(baseline.mean),f(baseline.factorialSecond),f(baseline.variance)]])+'<div class="calculation">m₁′=(b−d)m₁；f₂′=2(b−d)f₂+2b m₁；N₀=1。</div>'+small('固定净增长率 b−d=0.2。这里只比较常率、完整计数的生灭模型；抽样、空间扩散或未知检测率会改变识别条件。');
        }else if(id==='bandit'){
          const means=[.3,.5,value('mean3')],n=value('horizon'),seed=value('seed'),names=['ε-greedy','UCB1','Thompson'],strategies=['epsilon','ucb','thompson'],runs=strategies.map(s=>M.bandit(means,n,s,seed)),repeats=20,benchmark=strategies.map(strategy=>{let hits=0,regret=0;for(let i=0;i<repeats;i++){const r=M.bandit(means,n,strategy,seed+i*7919);hits+=Number(means[r.recommendation]===Math.max(...means));regret+=r.regret;}return {rate:hits/repeats,regret:regret/repeats};});
          html=plot(runs.map((r,i)=>({name:names[i],y:r.history.map(v=>v.regret)})),{xLabel:'轮次 t',yLabel:'累计伪遗憾',xMax:n,minimum:0})+table(['策略','各臂选择次数','累计伪遗憾','最终推荐'],runs.map((r,i)=>[names[i],r.counts.join(' / '),f(r.regret),'臂 '+(r.recommendation+1)]))+table(['固定 20 个种子','最终最佳臂识别率','平均累计伪遗憾'],benchmark.map((r,i)=>[names[i],f(100*r.rate,1)+'%',f(r.regret)]))+table(['UCB 前12轮','选择臂','奖励','累计伪遗憾'],runs[1].history.slice(0,12).map(r=>[r.t,r.arm+1,r.reward,f(r.regret)]))+small('真实成功率 = '+means.map(x=>f(x)).join(' / ')+'。按已知均值计算伪遗憾；各策略共享每臂的潜在奖励序列，单次轨迹与20次重复汇总分开显示；种子为输入值+7919×i，i=0,…,19。并列最优均计成功；有限重复不能证明普遍策略排名。ε=0.1；Thompson 使用 Beta(1,1) 先验。');
        }else if(id==='mcts'){
          const r=M.mctsTrace(value('round'),value('exploration'),value('seed')),step=r.history.at(-1),phase=value('phase'),snapshot=phase===0?step.before:phase===3?step.after:step.expanded;
          html=para('固定合成树：根→A→{A1:0.2，A2:0.9}；根→B→{B1:0.6，B2:0.7}。叶回报是环境定义，选择阶段只能使用已累计的记录。')+para('当前第 '+step.round+' 轮 · '+['选择','扩展','模拟','回传'][phase]+'。选择停在 '+esc(step.selected||'根')+'。')+table(['父节点','候选节点','UCT 指数','选中'],step.selections.flatMap(s=>s.scores.map(z=>[s.parent||'根',z.path,f(z.score),z.path===s.chosen?'是':'否'])))+(phase>=1?para(step.added?'扩展节点：'+esc(step.added)+'；新增节点初始 N=W=0。':'已到达终点，本轮无须新增节点。'):'')+(phase>=2?para('模拟终点 '+esc(step.terminal)+'，本轮回报 G='+f(step.reward)+'。'):'')+(phase===3?para('沿 '+step.path.map(x=>esc(x||'根')).join(' → ')+' 回传：每个访问节点 N 加1、W 加 G。最终按根动作平均值推荐 '+esc(r.recommendation)+'。'):'')+table(['已展开节点','访问 N','累计回报 W','均值 Q'],snapshot.map(x=>[x.path||'根',x.n,f(x.total),x.mean===null?'尚未访问':f(x.mean)]))+small('UCT=Q+c√(log N父/N子)。未尝试动作先扩展；终点前随机补完。滑块重放固定种子的完整搜索记录，不训练网络。回传只更新访问路径，不更新未访问分支。');
        }else if(id==='experimental-design'){
          const a=value('accuracy'),prior=[1-value('prior'),value('prior')],r=M.informationGain(prior,[[a,1-a],[1-a,a]]),y=value('outcome'),post=r.posteriors[y];
          html=table(['机制','先验','P(Y=0|ϑ)','P(Y=1|ϑ)'],[[0,f(prior[0]),f(a),f(1-a)],[1,f(prior[1]),f(1-a),f(a)]])+table(['结果','预测概率','后验 P(ϑ=1|Y)','该结果的 KL（bit）'],r.predictive.map((p,i)=>[i,f(p),r.posteriors[i]?f(r.posteriors[i][1]):'不可能结果',p?f(r.kl[i]):'不参与平均']))+para('期望信息增益 Σᵧp(y) KL(后验∥先验) = <strong>'+f(r.gain,6)+' bit</strong>；先验熵减去期望后验熵 = '+f(r.entropyReduction,6)+' bit。')+para(post?'假设观测 Y='+y+'，更新后 P(ϑ=1|Y)='+f(post[1])+'。':'所选结果的预测概率为零，不能进行贝叶斯更新。')+small('a=0.5 时观测与机制无关，信息增益为0；a=1 时一次观测区分两种机制。当前假设两实验成本相同、似然正确、只有两种候选机制。');
        }else if(id==='pkpd'){
          const times=Array.from({length:61},(_,i)=>i/5),rows=times.map(t=>M.pkpd(100,20,value('clearance'),value('ec50'),t)),r=rows[0];
          html=plot([{name:'浓度',y:rows.map(r=>r.concentration)}],{xLabel:'时间（h）',yLabel:'mg/L',xMax:12,minimum:0})+plot([{name:'归一化效应',y:rows.map(r=>r.effect)}],{xLabel:'时间（h）',yLabel:'E/Emax',xMax:12,minimum:0,maximum:1})+para('教学参数：一次静脉输入 100 mg，V=20 L；AUC=D/CL='+f(r.auc)+' mg·h/L；半衰期='+f(r.halfLife)+' h。效应 C/(EC50+C) 不含延迟与反馈。')+small('仅演示单房室与 Emax 模型；参数全部为合成值，不用于给药建议。');
        }
        out.innerHTML=html;
      }catch(error){out.innerHTML='<p role="alert">'+esc(error.message)+'</p>';}
    };
    el.addEventListener('input',update);el.addEventListener('change',update);update();
  });
}
