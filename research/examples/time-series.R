# R >= 4.4；已知参数AR(1)合成过程，不估计真实患者规律。
set.seed(20261126)
phi <- .8; noise_sd <- .5; x0 <- 1; horizon <- 5L; N <- 80000L
mu <- phi^(1:horizon)*x0
variance <- noise_sd^2*(1-phi^(2*(1:horizon)))/(1-phi^2)
path <- matrix(NA_real_,N,horizon); state <- rep(x0,N)
for(h in 1:horizon) {
  state <- phi*state+rnorm(N,0,noise_sd); path[,h] <- state
}
stopifnot(max(abs(colMeans(path)-mu))<.015)
stopifnot(max(abs(apply(path,2,var)-variance))<.02)
stopifnot(max(abs(variance[1:3]-c(.25,.41,.5124)))<1e-12)
# 理论Gaussian条件区间；这里只含过程噪声，没有参数估计误差。
lower <- mu-qnorm(.975)*sqrt(variance); upper <- mu+qnorm(.975)*sqrt(variance)
coverage <- colMeans(sweep(path,2,lower,">=") & sweep(path,2,upper,"<="))
stopifnot(max(abs(coverage-.95))<.01)
# 等价的一维状态空间，加观测噪声后先做状态更新，不能把y0当作x0。
obs_var <- .04; prior_var <- noise_sd^2/(1-phi^2); y0 <- 1
gain <- prior_var/(prior_var+obs_var)
posterior_mean <- gain*y0; posterior_var <- (1-gain)*prior_var
forecast_y1_mean <- phi*posterior_mean
forecast_y1_var <- phi^2*posterior_var+noise_sd^2+obs_var
stopifnot(gain>0,gain<1,forecast_y1_var>noise_sd^2)
# 一步滚动预测与固定原点的两步预测使用的信息不同。
realized_x1 <- phi*x0+.5
rolling_mean_x2 <- phi*realized_x1
fixed_origin_mean_x2 <- phi^2*x0
stopifnot(abs(rolling_mean_x2-1.04)<1e-12,abs(fixed_origin_mean_x2-.64)<1e-12)
print(data.frame(h=1:horizon,theory_mean=mu,simulated_mean=colMeans(path),
                 theory_variance=variance,simulated_variance=apply(path,2,var),coverage=coverage))
print(list(Kalman=c(gain=gain,posterior_mean=posterior_mean,posterior_var=posterior_var,
                    next_y_mean=forecast_y1_mean,next_y_var=forecast_y1_var),
           information_sets=c(rolling=rolling_mean_x2,fixed_origin=fixed_origin_mean_x2)))
