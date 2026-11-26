# R >= 4.4；合成 Gaussian 概率运输，使用解析速度核验数值积分。
set.seed(20261126)
# X0 ~ N(0,1)，X1 ~ N(2,1) 独立；Xt=(1-t)X0+tX1。
variance_path <- function(t) (1-t)^2+t^2
velocity <- function(x,t) 2+(2*t-1)/variance_path(t)*(x-2*t)
x0 <- rnorm(10000)
x <- x0; nstep <- 2000L; dt <- 1/nstep
for (k in 0:(nstep-1)) x <- x + dt*velocity(x,k*dt)
# 解析 flow 为 2t+sqrt((1-t)^2+t^2)*x0；末端是 x0+2。
max_error <- max(abs(x-(x0+2)))
stopifnot(max_error<.005, abs(mean(x)-2)<.05, abs(var(x)-1)<.06)
# 通过条件回归核验 t=1/4 时目标速度。
t <- .25; N <- 60000L
a <- rnorm(N); b <- rnorm(N,2,1)
z <- (1-t)*a+t*b; target <- b-a
fit <- lm.fit(cbind(1,z),target)$coefficients
exact <- c(2-(2*t-1)/variance_path(t)*2*t,(2*t-1)/variance_path(t))
stopifnot(max(abs(fit-exact))<.06)
# 采样配对直线不是总体最优运输耦合：比较二次成本。
independent_cost <- mean((b-a)^2)
translation_cost <- mean(((a+2)-a)^2)
stopifnot(abs(independent_cost-6)<.1, abs(translation_cost-4)<1e-12)
print(list(hand_velocity=velocity(1,.25), fitted=fit, exact=exact,
           max_ODE_error=max_error, generated=c(mean=mean(x),variance=var(x)),
           costs=c(independent=independent_cost,translation=translation_cost)))
