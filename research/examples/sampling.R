# R >= 4.4；只使用 base/stats；全部为合成数据。
set.seed(20261126)
x <- c(0, 1, 2); p <- c(.5, .3, .2); q <- c(.2, .3, .5)
h <- x^2
stopifnot(abs(sum(p)-1)<1e-12, abs(sum(q)-1)<1e-12, all(q>0))
# 逆变换：落入累计概率的哪一个区间，就输出对应状态。
inverse_sample <- function(u, prob) {
  vapply(u, function(z) which(z <= cumsum(prob))[1], integer(1))
}
stopifnot(identical(x[inverse_sample(c(.1,.65,.92),p)], c(0,1,2)))
ix <- c(1L,3L,3L,2L)  # 手算样本 0,2,2,1，对应 R 下标。
w <- p[ix]/q[ix]
ordinary <- mean(w*h[ix]); normalized <- sum(w*h[ix])/sum(w)
ess <- sum(w)^2/sum(w^2)
stopifnot(abs(ordinary-1.05)<1e-12, abs(normalized-4.2/4.3)<1e-12)
print(data.frame(state=x[ix], weight=w, weighted_value=w*h[ix]))
print(c(exact=sum(p*h), ordinary=ordinary, normalized=normalized, ESS=ess))
# 大样本 IS 检查。它检验本例实现，不证明所有目标下有限方差。
n <- 30000L
ix <- inverse_sample(runif(n), q)
is_estimate <- mean(p[ix]/q[ix]*h[ix])
stopifnot(abs(is_estimate-sum(p*h)) < .05)
# 独立均匀提议的 MH，接受率含目标比；拒绝时重复当前状态。
chain <- integer(n); chain[1] <- 1L
for (t in 2:n) {
  candidate <- sample.int(3L,1L)
  old <- chain[t-1]
  accept <- min(1,p[candidate]/p[old])  # 对称提议概率抵消。
  chain[t] <- if (runif(1)<accept) candidate else old
}
freq <- tabulate(chain[1001:n],nbins=3)/(n-1000)
stopifnot(max(abs(freq-p)) < .025)
# 检查转移矩阵的详细平衡与概率归一化。
P <- matrix(0,3,3)
for (i in 1:3) for (j in 1:3) if (i!=j) P[i,j] <- min(1,p[j]/p[i])/3
diag(P) <- 1-rowSums(P)
flow <- diag(p) %*% P
stopifnot(max(abs(flow-t(flow)))<1e-12, max(abs(rowSums(P)-1))<1e-12)
print(list(IS=is_estimate, MH_frequency=freq, target=p, transition=P))
