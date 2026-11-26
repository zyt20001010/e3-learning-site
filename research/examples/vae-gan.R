# R >= 4.4；解析Gaussian VAE与离散GAN算例；未训练大模型。
set.seed(20261126)
x <- 1; observation_variance <- .25
post_mean <- x/(1+observation_variance)
post_var <- observation_variance/(1+observation_variance)
ELBO <- function(m,log_v) {
  v <- exp(log_v)
  reconstruction <- -.5*log(2*pi*observation_variance)-((x-m)^2+v)/(2*observation_variance)
  kl_prior <- .5*(m^2+v-1-log_v)
  reconstruction-kl_prior
}
m <- .6; v <- .3
bound <- ELBO(m,log(v))
log_evidence <- dnorm(x,0,sqrt(1+observation_variance),log=TRUE)
kl_posterior <- .5*(log(post_var/v)+(v+(m-post_mean)^2)/post_var-1)
stopifnot(abs(log_evidence-bound-kl_posterior)<1e-12,kl_posterior>=0)
stopifnot(abs(ELBO(post_mean,log(post_var))-log_evidence)<1e-12)
# 固定独立标准噪声，经重参数化得到q样本，验证期望及路径梯度。
eps <- rnorm(60000); z <- m+sqrt(v)*eps
mc_bound <- mean(dnorm(x,z,sqrt(observation_variance),log=TRUE))-.5*(m^2+v-1-log(v))
grad_m <- mean((x-z)/observation_variance)-m
grad_logv <- mean((x-z)/observation_variance*.5*sqrt(v)*eps)-.5*(v-1)
delta <- 1e-5
fd_m <- (ELBO(m+delta,log(v))-ELBO(m-delta,log(v)))/(2*delta)
fd_logv <- (ELBO(m,log(v)+delta)-ELBO(m,log(v)-delta))/(2*delta)
stopifnot(abs(mc_bound-bound)<.035,abs(grad_m-fd_m)<.04,abs(grad_logv-fd_logv)<.04)
# 两点空间上的GAN最优判别器与JS恒等式。
p <- c(.8,.2); generated <- c(.2,.8); mixture <- (p+generated)/2
Dstar <- p/(p+generated)
value <- sum(p*log(Dstar)+generated*log(1-Dstar))
JS <- .5*sum(p*log(p/mixture))+.5*sum(generated*log(generated/mixture))
stopifnot(abs(value-(-log(4)+2*JS))<1e-12)
stopifnot(max(abs(Dstar-c(.8,.2)))<1e-12,JS>=0)
print(list(VAE=c(ELBO=bound,log_evidence=log_evidence,KL_gap=kl_posterior,MC=mc_bound),
           gradients=rbind(analytic=c(fd_m,fd_logv),monte_carlo=c(grad_m,grad_logv)),
           GAN=list(discriminator=Dstar,value=value,JS=JS)))
