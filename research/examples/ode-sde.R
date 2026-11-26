# R >= 4.0；base R / stats。合成 OU 过程和独立高斯观测。
set.seed(20261126)
theta <- 1; sigma <- 0.5; h <- 0.25; x0 <- 1
# 两个固定标准化增量用于逐步手算，不是拟合得到的随机样本。
z <- c(1,-1)
path <- c(x0,NA_real_,NA_real_)
for (k in 1:2) path[k+1] <- path[k]-theta*path[k]*h+sigma*sqrt(h)*z[k]
stopifnot(max(abs(path-c(1,1,0.5)))<1e-12)
a <- exp(-theta*h)
q <- sigma^2*(1-exp(-2*theta*h))/(2*theta)
q_integral <- integrate(function(s) sigma^2*exp(-2*theta*(h-s)),0,h)$value
stopifnot(abs(q-q_integral)<1e-12)
# 比较固定 T=1 下 Euler 离散过程的精确均值/方差与 OU 真值。
T <- 1
true_mean <- exp(-theta*T)*x0
true_variance <- sigma^2*(1-exp(-2*theta*T))/(2*theta)
steps <- c(0.25,0.125,0.0625)
moment_table <- t(vapply(steps,function(step) {
  nstep <- round(T/step); b <- 1-theta*step
  c(step=step,mean=b^nstep*x0,
    variance=sigma^2*step*(1-b^(2*nstep))/(1-b^2))
},numeric(3)))
stopifnot(all(diff(abs(moment_table[,"mean"]-true_mean))<0))
stopifnot(all(diff(abs(moment_table[,"variance"]-true_variance))<0))
# 模拟检查针对的是 Euler 离散模型，而非宣称它就是精确 OU。
n <- 50000; step <- 0.125; nstep <- round(T/step)
x <- rep(x0,n)
for (k in seq_len(nstep)) x <- (1-theta*step)*x+sigma*sqrt(step)*rnorm(n)
em_mean <- moment_table[2,"mean"]; em_var <- moment_table[2,"variance"]
stopifnot(abs(mean(x)-em_mean)<6*sqrt(em_var/n))
stopifnot(abs(var(x)-em_var)<6*em_var*sqrt(2/(n-1)))
# 另设高斯初始信念 N(1,0.2)，采用精确 OU 转移做一次滤波。
m0 <- 1; P0 <- 0.2; R <- 0.04; observation <- 0.7
m_prior <- a*m0; P_prior <- a^2*P0+q
K <- P_prior/(P_prior+R)
m_post <- m_prior+K*(observation-m_prior)
P_post <- (1-K)*P_prior
density_product <- function(x)
  dnorm(x,m_prior,sqrt(P_prior))*dnorm(observation,x,sqrt(R))
normalizer <- integrate(density_product,-Inf,Inf,rel.tol=1e-10)$value
numeric_mean <- integrate(function(x) x*density_product(x),-Inf,Inf,
                          rel.tol=1e-10)$value/normalizer
numeric_variance <- integrate(function(x) (x-numeric_mean)^2*density_product(x),
                              -Inf,Inf,rel.tol=1e-10)$value/normalizer
stopifnot(abs(numeric_mean-m_post)<1e-8,abs(numeric_variance-P_post)<1e-8)
print(list(Euler_hand_path=path,exact_transition_a=a,exact_process_variance=q))
print(moment_table)
print(list(OU_mean_T1=true_mean,OU_variance_T1=true_variance,
           simulated_Euler_mean=mean(x),simulated_Euler_variance=var(x)))
print(list(predicted_mean=m_prior,predicted_variance=P_prior,gain=K,
           filtered_mean=m_post,filtered_variance=P_post))
