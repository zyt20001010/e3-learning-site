import test from 'node:test';
import assert from 'node:assert/strict';
import * as m from '../js/math.js';
const near=(a,b,eps=1e-10)=>assert.ok(Math.abs(a-b)<=eps,'Expected '+a+' ≈ '+b+' within '+eps);
const closeMatrix=(a,b,eps=1e-10)=>{assert.equal(a.length,b.length);a.forEach((r,i)=>{assert.equal(r.length,b[i].length);r.forEach((v,j)=>near(v,b[i][j],eps));});};
test('matrix multiplication has correct orientation and validates shapes',()=>{
  assert.deepEqual(m.matmul([[1,2],[3,4]],[[2],[1]]),[[4],[10]]);
  assert.throws(()=>m.matmul([[1,2]],[[1,2]]));
  assert.throws(()=>m.dot([1,2],[1]));
  assert.throws(()=>m.matmul([[NaN]],[[1]]));
});
test('softmax is stable, normalized and handles masked entries',()=>{
  const a=m.softmax([1,2,3]),b=m.softmax([1001,1002,1003]);
  a.forEach((x,i)=>near(x,b[i]));near(a.reduce((s,x)=>s+x,0),1);
  assert.equal(m.softmax([0,-Infinity])[1],0);
  assert.throws(()=>m.softmax([-Infinity,-Infinity]));
});
test('attention equals independent scalar hand calculation and respects mask',()=>{
  const q=[[1,0],[0,1],[1,1]],v=[[1],[2],[3]],r=m.attention(q,q,v);
  const z=Math.exp(1/Math.sqrt(2));near(r.weights[0][0],z/(2*z+1));
  near(r.output[0][0],2);r.weights.forEach(row=>near(row.reduce((s,x)=>s+x,0),1));
  const masked=m.attention(q,q,v,true);
  near(masked.output[0][0],1);
  masked.weights.forEach((row,i)=>row.forEach((x,j)=>{if(j>i)assert.equal(x,0);}));
});
test('backprop gradients match central differences for parameters and data',()=>{
  for(const act of ['linear','tanh','relu']){
    const x=1.2,w=.7,b=.3,target=.9,r=m.neuron(x,w,b,target,act),h=1e-6;
    near(r.dw,(m.neuron(x,w+h,b,target,act).loss-m.neuron(x,w-h,b,target,act).loss)/(2*h),1e-6);
    near(r.db,(m.neuron(x,w,b+h,target,act).loss-m.neuron(x,w,b-h,target,act).loss)/(2*h),1e-6);
    near(r.dx,(m.neuron(x+h,w,b,target,act).loss-m.neuron(x-h,w,b,target,act).loss)/(2*h),1e-6);
  }
});
test('CNN cross-correlation, stride and channel summation use the stated convention',()=>{
  const x=[[1,2,3],[4,5,6],[7,8,9]],k=[[1,0],[0,-1]];
  assert.deepEqual(m.correlate2d(x,k),[[-4,-4],[-4,-4]]);
  assert.deepEqual(m.correlate2d(x,k,2),[[-4]]);
  const maps=m.multiChannel([x,x.map(r=>r.map(v=>v/2))],[[k,k],[k,k.map(r=>r.map(v=>-v))]]);
  assert.deepEqual(maps,[[[-6,-6],[-6,-6]],[[-2,-2],[-2,-2]]]);
});
test('RBF Gram and normalized kernel regression satisfy basic invariants',()=>{
  const xs=[-1,0,1],k=m.rbfGram(xs,1);
  k.forEach((row,i)=>{near(row[i],1);row.forEach((x,j)=>near(x,k[j][i]));});
  for(const v of [[1,-2,1],[1,1,1],[2,3,-4]])assert(m.dot(v,m.matmul(k,v.map(x=>[x])).flat())>=-1e-10);
  const r=m.kernelRegression(xs,[2,2,2],.3,.5);near(r.prediction,2);
  assert.throws(()=>m.rbfGram(xs,0));
});
test('GNN averaging is permutation equivariant and differs from symmetric GCN',()=>{
  const a=[[0,1,0],[1,0,1],[0,1,0]],h=[1,2,4],r=m.graphStep(a,h);
  r.output.forEach((v,i)=>near(v,[1.5,7/3,3][i]));
  const p=[2,0,1],pa=p.map(i=>p.map(j=>a[i][j])),ph=p.map(i=>h[i]);
  m.graphStep(pa,ph).output.forEach((v,i)=>near(v,r.output[p[i]]));
  assert.notDeepEqual(m.graphStep(a,h,true).output,r.output);
});
test('DFT inverse preserves data; phase deletion loses a shifted impulse',()=>{
  const x=[0,1,0,0,0,0,0,0],s=m.dft(x),back=m.idft(s),lost=m.idft(s.map(z=>({re:z.magnitude,im:0})));
  back.forEach((v,i)=>near(v,x[i]));s.forEach(z=>near(z.magnitude,1));
  near(lost[0],1);near(lost[1],0);
  const a=[1,2,3],b=[4,5],n=4,sa=m.dft([...a,0]),sb=m.dft([...b,0,0]);
  const product=sa.map((z,i)=>({re:z.re*sb[i].re-z.im*sb[i].im,im:z.re*sb[i].im+z.im*sb[i].re}));
  m.idft(product).forEach((v,i)=>near(v,m.linearConvolution(a,b)[i]));
  assert.equal(n,a.length+b.length-1);
});
test('importance sampling checks support and distinguishes ESS from sample size',()=>{
  const p=[.4,.1,.05,.1,.35],same=m.importanceSampling(p,p,1000,123);
  near(same.ess,1000);assert.throws(()=>m.importanceSampling([.5,.5],[1,0],100,1));
  const r=m.importanceSampling(p,[.8,.05,.05,.05,.05],20000,20261126);
  near(r.estimate,r.truth,.08);assert(r.ess<10000);
  assert.deepEqual(r,m.importanceSampling(p,[.8,.05,.05,.05,.05],20000,20261126));
});
test('MH transition matrix satisfies detailed balance and empirical frequencies',()=>{
  const p=[.5,.3,.2],n=p.length;
  const k=p.map((_,i)=>p.map((_,j)=>i===j?0:Math.min(1,p[j]/p[i])/n));
  k.forEach((row,i)=>{row[i]=1-row.reduce((s,v)=>s+v,0);row.forEach((v,j)=>near(p[i]*v,p[j]*k[j][i]));});
  const r=m.metropolis(p,30000,411);
  r.counts.forEach((x,i)=>near(x/30000,p[i],.02));
});
test('Gaussian denoising obeys conditioning boundaries and total variance',()=>{
  const mu=2,v=.25,a=.5,r=m.gaussianDenoising(a,mu,v,1);
  const gain=Math.sqrt(a)*v/(a*v+1-a);
  near(r.posteriorVariance+gain**2*r.marginalVariance,v);
  near(m.gaussianDenoising(0,mu,v,7).posteriorMean,mu);
  near(m.gaussianDenoising(1,mu,v,7).posteriorMean,7);
  near(m.gaussianDenoising(1,mu,v,7).posteriorVariance,0);
});
test('flow integration approaches the independent Gaussian path endpoint',()=>{
  const xs=[-2,0,2],coarse=m.gaussianFlow(xs,2,.5,20),fine=m.gaussianFlow(xs,2,.5,400);
  xs.forEach((x,i)=>{const target=2+.5*x;near(fine[i],target,.01);assert(Math.abs(fine[i]-target)<=Math.abs(coarse[i]-target)+1e-12);});
});
test('Euler-Maruyama uses sqrt(dt), with reproducible OU moments',()=>{
  const deterministic=m.ouPath(1,0,.1,10,1);near(deterministic[10],.9**10);
  const values=Array.from({length:4000},(_,i)=>m.ouPath(.7,.4,.05,20,i+17).at(-1));
  const mean=values.reduce((s,x)=>s+x,0)/values.length,variance=values.reduce((s,x)=>s+(x-mean)**2,0)/values.length;
  near(mean,(1-.7*.05)**20,.02);
  const exact=.4**2*.05*(1-(1-.7*.05)**40)/(1-(1-.7*.05)**2);
  near(variance,exact,.012);
});
test('nilpotent input order and target differences match exact products',()=>{
  const r=m.doseOrder(1,2);
  assert.deepEqual(r.AB,[1,2]);assert.deepEqual(r.BA,[3,2]);
  assert.deepEqual(m.doseOrder(0,2).AB,m.doseOrder(0,2).BA);
  // For any M and e1 readout, exp(M)_(1,1)=exp(M^T)_(1,1) term by term.
  const a=[[0,2],[3,0]],at=m.transpose(a);let power=[[1,0],[0,1]],powerT=[[1,0],[0,1]];
  for(let k=0;k<12;k++){near(power[0][0],powerT[0][0]);power=m.matmul(power,a);powerT=m.matmul(powerT,at);}
});
test('counterfactual coupling changes individual conditionals with fixed marginals',()=>{
  for(const p11 of [0,.1,.25,.5]){
    const r=m.binaryCoupling(p11);r.joint.forEach(row=>near(row.reduce((s,x)=>s+x,0),.5));
    near(r.joint[0][0]+r.joint[1][0],.5);near(r.ate,0);
  }
  near(m.binaryCoupling(0).individualBenefitGivenZero,1);
  near(m.binaryCoupling(.5).individualBenefitGivenZero,0);
});
test('birth-death factorial moments satisfy their ODE including critical limit',()=>{
  near(m.birthDeathMoments(.4,.4,2).factorialSecond,1.6);
  const b=.7,d=.2,t=1.5,h=1e-6,r=m.birthDeathMoments(b,d,t),a=m.birthDeathMoments(b,d,t-h),z=m.birthDeathMoments(b,d,t+h);
  near((z.mean-a.mean)/(2*h),(b-d)*r.mean,1e-6);
  near((z.factorialSecond-a.factorialSecond)/(2*h),2*(b-d)*r.factorialSecond+2*b*r.mean,1e-5);
  const low=m.birthDeathMoments(.2,0,2),high=m.birthDeathMoments(.8,.6,2);
  near(low.mean,high.mean);assert(high.factorialSecond>low.factorialSecond);
});
test('bandit accounting and seeded outcomes remain consistent',()=>{
  for(const strategy of ['epsilon','ucb','thompson']){
    const r=m.bandit([.3,.5,.7],300,strategy,20261126);
    assert.equal(r.counts.reduce((a,b)=>a+b,0),300);
    assert.equal(r.wins.reduce((a,b)=>a+b,0),r.history.at(-1).total);
    near(r.regret,r.history.reduce((s,v)=>s+.7-[.3,.5,.7][v.arm],0));
    assert.deepEqual(r,m.bandit([.3,.5,.7],300,strategy,20261126));
  }
});
test('Kalman Gaussian conditioning and PK/PD units have expected limits',()=>{
  const k=m.kalmanUpdate(0,1,2,1);near(k.gain,.5);near(k.mean,1);near(k.variance,.5);
  const p=m.pkpd(100,20,5,2,0);near(p.concentration,5);near(p.auc,20);near(p.effect,5/7);
  const half=m.pkpd(100,20,5,2,p.halfLife);near(half.concentration,2.5);
  assert.throws(()=>m.pkpd(1,0,1,1,0));
});
test('finite design information equals entropy reduction and handles zero-probability outcomes',()=>{
  const no=m.informationGain([.5,.5],[[.5,.5],[.5,.5]]);near(no.gain,0);
  const perfect=m.informationGain([.5,.5],[[1,0],[0,1]]);near(perfect.gain,1);
  const noisy=m.informationGain([.5,.5],[[.9,.1],[.1,.9]]);
  near(noisy.gain,1+.1*Math.log2(.1)+.9*Math.log2(.9));near(noisy.gain,noisy.entropyReduction);
  near(noisy.posteriors[1][1],.9);
  const certain=m.informationGain([1,0],[[1,0],[0,1]]);near(certain.gain,0);assert.equal(certain.posteriors[1],null);
});
test('MCTS stages conserve visits and back up only expanded search paths',()=>{
  const r=m.mctsTrace(80,1,123),first=r.history[0];
  assert.equal(first.before.length,1);assert.equal(first.before[0].n,0);
  assert.equal(first.added,'A');assert.equal(first.expanded.find(x=>x.path==='A').n,0);
  assert.equal(first.after.find(x=>x.path==='A').n,1);assert.equal(first.after.length,2);
  for(const h of r.history){
    const before=new Map(h.expanded.map(x=>[x.path,x]));
    for(const node of h.after){const old=before.get(node.path),visited=h.path.includes(node.path);assert.equal(node.n,old.n+Number(visited));near(node.total,old.total+(visited?h.reward:0));}
    near(h.reward,{A1:.2,A2:.9,B1:.6,B2:.7}[h.terminal]);
    assert.equal(h.after.find(x=>x.path==='').n,h.round);
  }
  const root=r.nodes.find(x=>x.path==='');assert.equal(root.n,r.nodes.filter(x=>x.path.length===1).reduce((s,x)=>s+x.n,0));
  assert.deepEqual(r,m.mctsTrace(80,1,123));
});
