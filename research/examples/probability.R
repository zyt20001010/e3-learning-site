# R >= 4.0；base R。两种合成硬币假设，固定种子。
set.seed(20261126)
p <- c(fair=0.5,biased=0.8); prior <- c(0.5,0.5)
observed <- c(1,1)
likelihood <- p^sum(observed)*(1-p)^(length(observed)-sum(observed))
evidence <- sum(prior*likelihood)
posterior <- prior*likelihood/evidence
stopifnot(abs(evidence-0.445)<1e-12)
stopifnot(max(abs(posterior-c(25,64)/89))<1e-12)
step <- prior
for (x in observed) {
  step <- step*p^x*(1-p)^(1-x)
  step <- step/sum(step)
}
stopifnot(max(abs(step-posterior))<1e-12)
predictive <- sum(posterior*p)
stopifnot(abs(predictive-637/890)<1e-12)
# 枚举全部两次抛掷结果，直接验证联合分布归一化。
patterns <- expand.grid(x1=0:1,x2=0:1)
patterns$probability <- apply(patterns,1,function(x)
  sum(prior*p^sum(x)*(1-p)^(2-sum(x))))
stopifnot(abs(sum(patterns$probability)-1)<1e-12)
marginal <- sum(prior*p)
joint_heads <- sum(prior*p^2)
covariance <- joint_heads-marginal^2
stopifnot(abs(covariance-0.0225)<1e-12)
# 独立生成“先选硬币、再抛两次”实验，检查混合分布。
n <- 100000
h <- sample.int(2,n,replace=TRUE,prob=prior)
x1 <- rbinom(n,1,p[h]); x2 <- rbinom(n,1,p[h])
empirical <- mean(x1*x2)
mc_se <- sqrt(joint_heads*(1-joint_heads)/n)
stopifnot(abs(empirical-joint_heads)<6*mc_se)
print(list(likelihood=likelihood,evidence=evidence,posterior=posterior,
           next_head_probability=predictive))
print(patterns)
print(list(marginal=marginal,joint_heads=joint_heads,
           covariance=covariance,simulated_joint=empirical,Monte_Carlo_SE=mc_se))
