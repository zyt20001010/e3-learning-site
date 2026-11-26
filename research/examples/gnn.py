# Python >= 3.9；标准库，三节点合成图。
import math, random
random.seed(20261126)
A = [[0.,1.,0.],[1.,0.,1.],[0.,1.,0.]]
h = [1.,2.,4.]
def mean_layer(a,x):
    n=len(x)
    return [sum((a[i][j]+(i==j))*x[j] for j in range(n)) /
            sum(a[i][j]+(i==j) for j in range(n)) for i in range(n)]
first=mean_layer(A,h); second=mean_layer(A,first)
assert all(abs(a-b)<1e-12 for a,b in zip(first,[1.5,7/3,3]))
assert all(abs(a-b)<1e-12 for a,b in zip(second,[23/12,41/18,8/3]))
degrees=[sum(row)+1 for row in A]
S=[[(A[i][j]+(i==j))/math.sqrt(degrees[i]*degrees[j])
    for j in range(3)] for i in range(3)]
gcn=[sum(S[i][j]*h[j] for j in range(3)) for i in range(3)]
assert abs(sum(S[0])-1)>0.01 # 对称归一化并非逐行均值。
# 把节点重新编号，特征与两条邻接轴必须同时重排。
p=[2,0,1]
Ap=[[A[i][j] for j in p] for i in p]
hp=[h[i] for i in p]
assert all(abs(a-b)<1e-12 for a,b in zip(mean_layer(Ap,hp),[first[i] for i in p]))
steady=h[:]
for _ in range(100): steady=mean_layer(A,steady)
assert max(abs(v-16/7) for v in steady)<1e-10
# 一条包含三个节点的超边：先聚合到边，再广播回各节点。
edge_value=sum(h)/3
hypergraph=[edge_value]*3
print({'one_layer':first,'two_layers':second,'GCN_symmetric':gcn})
print({'repeated_mean_limit':steady,'single_hyperedge':hypergraph})
