# Python >= 3.9；仅标准库。合成矩阵，固定种子。
import random
random.seed(20261126)
X = [[1.,2.,0.],[0.,1.,3.],[2.,1.,0.]]
K = [[1.,0.],[0.,-1.]]
def correlate(x, k):
    h,w,kh,kw = len(x),len(x[0]),len(k),len(k[0])
    return [[sum(x[i+a][j+b]*k[a][b]
                 for a in range(kh) for b in range(kw))
             for j in range(w-kw+1)] for i in range(h-kh+1)]
Y = correlate(X,K)
assert Y == [[0.,-1.],[-1.,1.]]
flipped = [list(reversed(row)) for row in reversed(K)]
assert correlate(X,flipped) == [[0.,1.],[1.,-1.]]
def total(k):
    return sum(map(sum, correlate(X,k)))
# 共享核的每个位置累加来自所有滑动窗口的贡献。
gradient = [[sum(X[i+a][j+b] for i in range(2) for j in range(2))
             for b in range(2)] for a in range(2)]
eps = 1e-6
for a in range(2):
    for b in range(2):
        kp,km = [row[:] for row in K],[row[:] for row in K]
        kp[a][b] += eps
        km[a][b] -= eps
        numeric = (total(kp)-total(km))/(2*eps)
        assert abs(numeric-gradient[a][b]) < 1e-8
assert gradient == [[4.,6.],[4.,5.]]
Y2 = correlate([[2*v for v in row] for row in X],K)
two_channels = [[Y[i][j]+Y2[i][j] for j in range(2)] for i in range(2)]
assert two_channels == [[3*v for v in row] for row in Y]
print({'input':X,'kernel':K,'feature_map':Y})
print({'gradient_of_sum':gradient,'two_input_channels':two_channels})
