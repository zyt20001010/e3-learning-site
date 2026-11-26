# R >= 4.4；合成的一维 Gaussian 数据，不是图像模型复现。
set.seed(20261126)
mu0 <- 2; var0 <- .25; T <- 30L; beta <- rep(.1,T)
alpha <- 1-beta; abar <- cumprod(alpha)
mt <- c(mu0,sqrt(abar)*mu0)
vt <- c(var0,abar*var0+1-abar)
Ntrain <- 40000L
coef <- matrix(NA_real_,T,2)
for (t in 1:T) {
  x0 <- rnorm(Ntrain,mu0,sqrt(var0)); eps <- rnorm(Ntrain)
  xt <- sqrt(abar[t])*x0 + sqrt(1-abar[t])*eps
  # 以线性回归学 epsilon(x_t,t)，本 Gaussian 情形的最优函数恰为仿射。
  coef[t,] <- unname(lm.fit(cbind(1,xt),eps)$coefficients)
}
# 任意一步的最优 epsilon 和 score 是解析可算的，检查学到的斜率。
optimal_slope <- sqrt(1-abar)/vt[-1]
stopifnot(max(abs(coef[,2]-optimal_slope)) < .06)
N <- 30000L
# 从真实 p_T 开始以隔离反向计算误差；标准 DDPM 常用 N(0,1) 近似 p_T。
xt <- rnorm(N,mt[T+1],sqrt(vt[T+1]))
for (t in T:1) {
  eps_hat <- coef[t,1] + coef[t,2]*xt
  mean_reverse <- (xt-beta[t]/sqrt(1-abar[t])*eps_hat)/sqrt(alpha[t])
  # Gaussian 教学例的精确条件方差。一般数据不具有这个闭式式子。
  variance_reverse <- beta[t]*vt[t]/vt[t+1]
  xt <- mean_reverse + sqrt(variance_reverse)*rnorm(N)
}
stopifnot(abs(mean(xt)-mu0)<.08, abs(var(xt)-var0)<.06)
one_xt <- .8*2+.6*1
score <- -(one_xt-1.6)/.52
epsilon_conditional_mean <- -.6*score
stopifnot(abs(one_xt-2.2)<1e-12, abs(epsilon_conditional_mean-9/13)<1e-12)
print(c(hand_xt=one_xt, optimal_epsilon=epsilon_conditional_mean,
        generated_mean=mean(xt), generated_variance=var(xt)))
