# Python >= 3.9；标准库，三 Token 合成例。
import math, random
random.seed(20261126)
X=[[1.,0.],[0.,1.],[1.,1.]]
WQ=WK=[[1.,0.],[0.,1.]]
WV=[[1.],[2.]]
def matmul(a,b):
    assert len(a[0])==len(b)
    return [[sum(a[i][k]*b[k][j] for k in range(len(b)))
             for j in range(len(b[0]))] for i in range(len(a))]
Q,K,V=matmul(X,WQ),matmul(X,WK),matmul(X,WV)
def attend(causal=False):
    scores=[[sum(q*k for q,k in zip(Q[i],K[j]))/math.sqrt(2)
             for j in range(3)] for i in range(3)]
    weights=[]
    for i,row in enumerate(scores):
        allowed=[j for j in range(3) if not causal or j<=i]
        largest=max(row[j] for j in allowed)
        raw=[math.exp(v-largest) if j in allowed else 0. for j,v in enumerate(row)]
        weights.append([v/sum(raw) for v in raw])
    return scores,weights,matmul(weights,V)
scores,weights,Y=attend()
assert all(abs(sum(row)-1)<1e-12 for row in weights)
assert abs(Y[0][0]-2)<1e-12
_,masked,MY=attend(True)
assert MY[0][0]==1
assert all(masked[i][j]==0 for i in range(3) for j in range(i+1,3))
# Softmax 加同一常数不改变概率权重。
row=scores[0]
def softmax(a):
    b=[math.exp(v-max(a)) for v in a];return [v/sum(b) for v in b]
assert all(abs(a-b)<1e-12 for a,b in zip(softmax(row),softmax([v+1000 for v in row])))
print({'Q':Q,'K':K,'V':V,'scaled_scores':scores})
print({'weights':weights,'output':Y,'causal_weights':masked,'causal_output':MY})
