// Pure numerical operations shared by the lessons, interactive labs and tests.
// Every experiment in this module uses synthetic data.
/** @typedef {number[][]} Matrix */
/** @param {number} x @param {string} [name] */
function finite(x, name = '数值') {
  if (!Number.isFinite(x)) throw new Error(name + '必须是有限数');
  return x;
}
/** @param {number[]} x */
function vector(x) {
  if (!x.length) throw new Error('向量不能为空');
  x.forEach(v => finite(v));
  return x;
}
/** @param {Matrix} a */
function matrix(a) {
  if (!a.length || !a[0].length || a.some(r => r.length !== a[0].length)) throw new Error('矩阵维度不一致');
  a.forEach(vector);
  return a;
}
/** @param {number[]} a @param {number[]} b */
export function dot(a, b) {
  vector(a); vector(b);
  if (a.length !== b.length) throw new Error('内积维度不一致');
  return a.reduce((s, x, i) => s + x * b[i], 0);
}
/** @param {Matrix} a */
export function transpose(a) { matrix(a); return a[0].map((_, j) => a.map(r => r[j])); }
/** @param {Matrix} a @param {Matrix} b */
export function matmul(a, b) {
  matrix(a); matrix(b);
  if (a[0].length !== b.length) throw new Error('矩阵乘法维度不一致');
  const bt = transpose(b);
  return a.map(row => bt.map(col => dot(row, col)));
}
/** @param {number[]} x */
export function softmax(x) {
  if (!x.length || x.some(v => Number.isNaN(v) || v === Infinity) || x.every(v => v === -Infinity)) throw new Error('Softmax 必须有至少一个有限分数');
  const max = Math.max(...x), e = x.map(v => Math.exp(v - max)), sum = e.reduce((a, b) => a + b, 0);
  return e.map(v => v / sum);
}
/** @param {Matrix} q @param {Matrix} k @param {Matrix} v @param {boolean} [causal] */
export function attention(q, k, v, causal = false) {
  matrix(q); matrix(k); matrix(v);
  if (q[0].length !== k[0].length || k.length !== v.length) throw new Error('Q、K、V 的维度不兼容');
  const raw = matmul(q, transpose(k)).map(row => row.map(x => x / Math.sqrt(q[0].length)));
  const scores = raw.map((row, i) => row.map((x, j) => causal && j > i ? -Infinity : x));
  const weights = scores.map(softmax);
  return { scores, weights, output: matmul(weights, v) };
}
/** @param {number} x @param {number} w @param {number} b @param {number} target @param {'tanh'|'relu'|'linear'} [activation] */
export function neuron(x, w, b, target, activation = 'tanh') {
  [x,w,b,target].forEach(v => finite(v));
  const z = w * x + b;
  const y = activation === 'tanh' ? Math.tanh(z) : activation === 'relu' ? Math.max(0,z) : z;
  const derivative = activation === 'tanh' ? 1 - y * y : activation === 'relu' ? Number(z > 0) : 1;
  const loss = .5 * (y - target) ** 2, dy = y - target, dz = dy * derivative;
  return { z, y, loss, dy, dz, dw: dz * x, db: dz, dx: dz * w };
}
/** Cross-correlation as used in most CNN libraries, not flipped convolution.
 * @param {Matrix} x @param {Matrix} k @param {number} [stride] */
export function correlate2d(x, k, stride = 1) {
  matrix(x); matrix(k);
  if (!Number.isInteger(stride) || stride < 1 || x.length < k.length || x[0].length < k[0].length) throw new Error('卷积核或步幅不合法');
  const h = Math.floor((x.length - k.length) / stride) + 1, w = Math.floor((x[0].length - k[0].length) / stride) + 1;
  return Array.from({length: h}, (_, i) => Array.from({length: w}, (_, j) => k.reduce((sum, row, u) => sum + row.reduce((s, val, z) => s + val * x[i * stride + u][j * stride + z], 0), 0)));
}
/** @param {Matrix[]} channels @param {Matrix[][]} kernels */
export function multiChannel(channels, kernels) {
  if (!channels.length || !kernels.length || kernels.some(k => k.length !== channels.length)) throw new Error('每个输出通道需要覆盖全部输入通道的卷积核');
  return kernels.map(perOutput => {
    const maps = channels.map((x, c) => correlate2d(x, perOutput[c]));
    return maps[0].map((row, i) => row.map((_, j) => maps.reduce((s, m) => s + m[i][j], 0)));
  });
}
/** @param {number[]} xs @param {number} sigma */
export function rbfGram(xs, sigma) {
  vector(xs);
  if (!(sigma > 0) || !Number.isFinite(sigma)) throw new Error('带宽必须为正');
  return xs.map(x => xs.map(y => Math.exp(-((x-y)**2) / (2*sigma**2))));
}
/** @param {number[]} xs @param {number[]} ys @param {number} query @param {number} sigma */
export function kernelRegression(xs, ys, query, sigma) {
  vector(xs); vector(ys); finite(query);
  if (xs.length !== ys.length || !(sigma > 0) || !Number.isFinite(sigma)) throw new Error('核回归参数不合法');
  const weights = softmax(xs.map(x => -((query-x)**2)/(2*sigma**2)));
  return { weights, prediction: dot(weights, ys) };
}
/** @param {Matrix} adjacency @param {number[]} features @param {boolean} [symmetric] */
export function graphStep(adjacency, features, symmetric = false) {
  matrix(adjacency); vector(features);
  const n = features.length;
  if (adjacency.length !== n || adjacency.some(r => r.length !== n || r.some(v => v < 0))) throw new Error('图邻接矩阵不合法');
  const a = adjacency.map((r, i) => r.map((v, j) => v + Number(i === j)));
  const degrees = a.map(row => row.reduce((x,y) => x+y,0));
  const normalized = a.map((r,i) => r.map((x,j) => x/(symmetric ? Math.sqrt(degrees[i]*degrees[j]) : degrees[i])));
  return { degrees, normalized, output: normalized.map(row => dot(row,features)) };
}
/** DFT sign convention exp(-2*pi*i*k*n/N); inverse carries 1/N.
 * @param {number[]} x */
export function dft(x) {
  vector(x); const n=x.length;
  return x.map((_,k) => {
    const re=x.reduce((s,v,j)=>s+v*Math.cos(2*Math.PI*k*j/n),0);
    const im=-x.reduce((s,v,j)=>s+v*Math.sin(2*Math.PI*k*j/n),0);
    return { re, im, magnitude:Math.hypot(re,im), phase:Math.hypot(re,im)<1e-10 ? 0 : Math.atan2(im,re) };
  });
}
/** @param {{re:number,im:number}[]} coefficients */
export function idft(coefficients) {
  const n=coefficients.length;
  if (!n) throw new Error('频谱不能为空');
  return coefficients.map((_,j)=>coefficients.reduce((s,z,k)=>s+z.re*Math.cos(2*Math.PI*k*j/n)-z.im*Math.sin(2*Math.PI*k*j/n),0)/n);
}
/** @param {number[]} a @param {number[]} b */
export function linearConvolution(a,b) {
  vector(a); vector(b); const out=Array(a.length+b.length-1).fill(0);
  a.forEach((v,i)=>b.forEach((w,j)=>{out[i+j]+=v*w;})); return /** @type {number[]} */(out);
}
/** @param {number} seed */
export function seededRandom(seed) {
  let t=finite(seed)>>>0;
  return () => {t+=0x6D2B79F5;let x=t;x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);return ((x^(x>>>14))>>>0)/4294967296;};
}
/** @param {()=>number} rng */
export function normal(rng) { return Math.sqrt(-2*Math.log(Math.max(rng(),Number.MIN_VALUE)))*Math.cos(2*Math.PI*rng()); }
/** @param {number[]} p */
function distribution(p) {
  vector(p);
  if (p.some(v=>v<0) || Math.abs(p.reduce((s,x)=>s+x,0)-1)>1e-10) throw new Error('概率必须非负并且总和为 1');
}
/** @param {number[]} p @param {()=>number} rng */
export function categorical(p,rng) {
  distribution(p); const u=rng();let sum=0;
  for(let i=0;i<p.length;i++){sum+=p[i];if(u<sum)return i;}return p.length-1;
}
/** @param {number[]} p @param {number[]} q @param {number} n @param {number} seed */
export function importanceSampling(p,q,n,seed) {
  distribution(p);distribution(q);
  if(p.length!==q.length||q.some((x,i)=>x===0&&p[i]>0)||!Number.isInteger(n)||n<1) throw new Error('提议分布必须覆盖目标分布的支持集');
  const rng=seededRandom(seed), counts=p.map(()=>0), weights=[];let sum=0,squares=0,weighted=0;
  for(let i=0;i<n;i++){const x=categorical(q,rng),w=p[x]/q[x];counts[x]++;weights.push(w);sum+=w;squares+=w*w;weighted+=w*x;}
  return {counts,weights,ess:squares?sum*sum/squares:0,estimate:sum?weighted/sum:NaN,truth:p.reduce((s,v,i)=>s+v*i,0)};
}
/** Symmetric independent uniform proposal on the finite state space.
 * @param {number[]} p @param {number} n @param {number} seed */
export function metropolis(p,n,seed) {
  distribution(p);const rng=seededRandom(seed);let state=p.findIndex(v=>v>0),accepted=0;
  const counts=p.map(()=>0),trajectory=[];
  for(let i=0;i<n;i++){const proposal=Math.floor(rng()*p.length);if(rng()<Math.min(1,p[proposal]/p[state])){state=proposal;accepted++;}counts[state]++;trajectory.push(state);}
  return {counts,trajectory,acceptance:accepted/n};
}
/** @param {number} alpha @param {number} mean @param {number} variance @param {number} xt */
export function gaussianDenoising(alpha,mean,variance,xt) {
  [alpha,mean,variance,xt].forEach(v=>finite(v));
  if(alpha<0||alpha>1||variance<=0)throw new Error('alpha 应在 [0,1]，方差应为正');
  const marginalVariance=alpha*variance+1-alpha, gain=Math.sqrt(alpha)*variance/marginalVariance;
  return {marginalMean:Math.sqrt(alpha)*mean,marginalVariance,posteriorMean:mean+gain*(xt-Math.sqrt(alpha)*mean),posteriorVariance:variance*(1-alpha)/marginalVariance,score:-(xt-Math.sqrt(alpha)*mean)/marginalVariance};
}
/** Gaussian independent-endpoint interpolation; its marginal velocity.
 * @param {number} x @param {number} t @param {number} mean @param {number} sigma */
export function gaussianFlowVelocity(x,t,mean,sigma) {
  if(sigma<=0||t<0||t>1)throw new Error('流参数不合法');
  const variance=(1-t)**2+(t*sigma)**2;
  return mean+(t*sigma**2-(1-t))/variance*(x-t*mean);
}
/** @param {number[]} initial @param {number} mean @param {number} sigma @param {number} steps */
export function gaussianFlow(initial,mean,sigma,steps) {
  vector(initial);if(!Number.isInteger(steps)||steps<1)throw new Error('步数应为正整数');
  return initial.map(x0=>{let x=x0;for(let i=0;i<steps;i++)x+=gaussianFlowVelocity(x,i/steps,mean,sigma)/steps;return x;});
}
/** Euler-Maruyama for dX = -rate*X dt + sigma dW; sigma=0 gives Euler.
 * @param {number} rate @param {number} sigma @param {number} dt @param {number} steps @param {number} seed */
export function ouPath(rate,sigma,dt,steps,seed) {
  if(rate<0||sigma<0||dt<=0||!Number.isInteger(steps)||steps<1)throw new Error('动力学参数不合法');
  const rng=seededRandom(seed);const path=[1];
  for(let i=0;i<steps;i++)path.push(path[i]-rate*path[i]*dt+sigma*Math.sqrt(dt)*normal(rng));
  return path;
}
/** Nilpotent matrices A=[[0,1],[0,0]], B=[[0,0],[1,0]].
 * @param {number} a @param {number} b @param {number[]} [initial] */
export function doseOrder(a,b,initial=[1,0]) {
  finite(a);finite(b);vector(initial);
  if(initial.length!==2)throw new Error('状态应有两个分量');
  const expA=[[1,a],[0,1]],expB=[[1,0],[b,1]],x=initial.map(v=>[v]);
  return {expA,expB,AB:matmul(matmul(expB,expA),x).flat(),BA:matmul(matmul(expA,expB),x).flat(),commutator:[[a*b,0],[0,-a*b]]};
}
/** @param {number} joint11 */
export function binaryCoupling(joint11) {
  if(joint11<0||joint11>.5)throw new Error('联合概率应在 [0,0.5]');
  return {joint:[[joint11,.5-joint11],[.5-joint11,joint11]],ate:0,benefit:.5-joint11,harm:.5-joint11,individualBenefitGivenZero:1-2*joint11};
}
/** Starting from one particle; binary division adds one, death removes one.
 * @param {number} birth @param {number} death @param {number} t */
export function birthDeathMoments(birth,death,t) {
  if(birth<0||death<0||t<0)throw new Error('生灭参数必须非负');
  const r=birth-death,m1=Math.exp(r*t),f2=Math.abs(r)<1e-10?2*birth*t:2*birth*m1*Math.expm1(r*t)/r;
  return {mean:m1,factorialSecond:f2,variance:f2+m1-m1*m1};
}
/** @param {()=>number} rng @param {number} shape */
function gammaInteger(rng,shape) {let x=0;for(let i=0;i<shape;i++)x-=Math.log(Math.max(rng(),Number.MIN_VALUE));return x;}
/** @param {number[]} means @param {number} horizon @param {'epsilon'|'ucb'|'thompson'} strategy @param {number} seed */
export function bandit(means,horizon,strategy,seed) {
  vector(means);if(means.some(x=>x<0||x>1)||horizon<means.length||!Number.isInteger(horizon))throw new Error('老虎机参数不合法');
  // Separate outcome and policy streams; each arm has a reproducible potential reward stream.
  const policy=seededRandom(seed+777),streams=means.map((_,i)=>seededRandom(seed+1009*(i+1)));
  const counts=means.map(()=>0),wins=means.map(()=>0),history=[];let regret=0,total=0;
  const best=Math.max(...means);
  for(let t=1;t<=horizon;t++){
    let arm=counts.findIndex(n=>n===0);
    if(arm<0){
      if(strategy==='epsilon'&&policy()<.1)arm=Math.floor(policy()*means.length);
      else{
        const scores=means.map((_,i)=>{
          if(strategy==='ucb')return wins[i]/counts[i]+Math.sqrt(2*Math.log(t)/counts[i]);
          if(strategy==='thompson'){const a=gammaInteger(policy,wins[i]+1),b=gammaInteger(policy,counts[i]-wins[i]+1);return a/(a+b);}
          return wins[i]/counts[i];
        });
        arm=scores.indexOf(Math.max(...scores));
      }
    }
    const reward=Number(streams[arm]()<means[arm]);counts[arm]++;wins[arm]+=reward;total+=reward;regret+=best-means[arm];
    history.push({t,arm,reward,regret,total});
  }
  const estimates=wins.map((w,i)=>w/counts[i]),recommendation=estimates.indexOf(Math.max(...estimates));
  return {counts,wins,estimates,history,regret,recommendation};
}
/** One-dimensional Kalman update, known variances.
 * @param {number} mean @param {number} variance @param {number} observation @param {number} noise */
export function kalmanUpdate(mean,variance,observation,noise) {
  if(variance<=0||noise<=0)throw new Error('方差必须为正');
  const gain=variance/(variance+noise);
  return {gain,mean:mean+gain*(observation-mean),variance:(1-gain)*variance};
}
/** One-compartment IV bolus and Emax model. Synthetic, no dosing recommendation.
 * @param {number} dose @param {number} volume @param {number} clearance @param {number} ec50 @param {number} t */
export function pkpd(dose,volume,clearance,ec50,t) {
  if(dose<0||volume<=0||clearance<=0||ec50<=0||t<0)throw new Error('PK/PD 参数不合法');
  const concentration=dose/volume*Math.exp(-clearance/volume*t);
  return {concentration,effect:concentration/(ec50+concentration),auc:dose/clearance,halfLife:Math.log(2)*volume/clearance};
}

/** Expected posterior/prior KL, in bits, for a finite experiment.
 * @param {number[]} prior @param {Matrix} likelihood */
export function informationGain(prior,likelihood) {
  distribution(prior);matrix(likelihood);likelihood.forEach(distribution);
  if(prior.length!==likelihood.length)throw new Error('先验与机制数量不一致');
  const predictive=likelihood[0].map((_,y)=>prior.reduce((s,p,i)=>s+p*likelihood[i][y],0));
  const posteriors=predictive.map((p,y)=>p===0?null:prior.map((w,i)=>w*likelihood[i][y]/p));
  const entropy=(/** @type {number[]} */ ps)=>-ps.reduce((s,p)=>s+(p>0?p*Math.log2(p):0),0);
  const kl=posteriors.map(ps=>ps===null?0:ps.reduce((s,p,i)=>s+(p>0?p*Math.log2(p/prior[i]):0),0));
  const gain=predictive.reduce((s,p,y)=>s+p*kl[y],0);
  const entropyReduction=entropy(prior)-predictive.reduce((s,p,y)=>s+p*(posteriors[y]?entropy(/** @type {number[]} */(posteriors[y])):0),0);
  return {predictive,posteriors,kl,gain,entropyReduction};
}

/** @typedef {{n:number,total:number,children:string[],untried:string[]}} SearchNode */
/** Deterministic two-level synthetic tree; each stage exposes only known search statistics.
 * @param {number} rounds @param {number} exploration @param {number} seed */
export function mctsTrace(rounds,exploration,seed) {
  if(!Number.isInteger(rounds)||rounds<1||rounds>10000||!Number.isFinite(exploration)||exploration<0)throw new Error('搜索预算或探索系数不合法');
  const rng=seededRandom(seed);
  /** @type {Record<string,number>} */const leaves={A1:.2,A2:.9,B1:.6,B2:.7};
  /** @type {Record<string,SearchNode>} */const nodes={'':{n:0,total:0,children:[],untried:['A','B']}};
  const snapshot=()=>Object.entries(nodes).sort(([a],[b])=>a.localeCompare(b)).map(([path,n])=>({path,n:n.n,total:n.total,mean:n.n?n.total/n.n:null}));
  const history=[];
  for(let round=1;round<=rounds;round++){
    const before=snapshot(),path=[''];let current='';const selections=[];
    while(nodes[current].untried.length===0&&nodes[current].children.length){
      const parent=nodes[current],scores=parent.children.map(key=>({path:key,score:nodes[key].total/nodes[key].n+exploration*Math.sqrt(Math.log(parent.n)/nodes[key].n)}));
      const chosen=scores.reduce((a,b)=>b.score>a.score?b:a);selections.push({parent:current,scores,chosen:chosen.path});
      current=chosen.path;path.push(current);
    }
    const selected=current;let added=null;
    if(nodes[current].untried.length){
      const action=nodes[current].untried.shift();added=current+action;
      nodes[current].children.push(added);
      nodes[added]={n:0,total:0,children:[],untried:added.length===1?['1','2']:[]};
      current=added;path.push(current);
    }
    const expanded=snapshot();
    const terminal=current.length===1?current+(rng()<.5?'1':'2'):current,reward=leaves[terminal];
    for(const key of path){nodes[key].n++;nodes[key].total+=reward;}
    history.push({round,before,selected,selections,added,expanded,terminal,reward,path,after:snapshot()});
  }
  const children=nodes[''].children;
  const recommendation=children.reduce((a,b)=>nodes[b].total/nodes[b].n>nodes[a].total/nodes[a].n?b:a);
  return {history,nodes:snapshot(),recommendation};
}
