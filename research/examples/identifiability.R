set.seed(20261126)
theta <- rbind(c(1, 2), c(2, 1), c(1.5, 1.5))
obs_mean <- rowSums(theta)
target_difference <- theta[, 1] - theta[, 2]
stopifnot(all(obs_mean == 3), identical(as.numeric(target_difference), c(-1, 1, 0)))
n <- 1000L
y <- 3 + rnorm(n)
print(data.frame(a=theta[,1], b=theta[,2], observed_mean=obs_mean, difference=target_difference))
print(c(estimate_of_sum=mean(y), standard_error=1/sqrt(n)))
epsilon <- 0.001
K <- diag(c(1, epsilon))
truth <- c(1, 2)
z <- as.vector(K %*% truth)
perturbed <- z + c(0, 0.001)
estimate <- as.vector(solve(K, perturbed))
stopifnot(max(abs(estimate - c(1, 3))) < 1e-12)
print(c(observation_error=0.001, parameter_error=estimate[2]-truth[2]))
