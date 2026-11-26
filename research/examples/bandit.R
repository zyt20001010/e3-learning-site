# R >= 4.4；三个合成 Bernoulli 臂；不是临床试验推荐。
set.seed(20261126)
mu <- c(.3,.5,.7); K <- length(mu); horizon <- 500L; repetitions <- 60L
choose_arm <- function(method,count,wins,t) {
  if(any(count==0)) return(which(count==0)[1])
  means <- wins/count
  if(method=="ucb") return(which.max(means+sqrt(2*log(t-1)/count)))
  if(method=="epsilon") {
    if(runif(1)<.1) return(sample.int(K,1L))
    return(which.max(means))
  }
  if(method=="thompson") return(which.max(rbeta(K,1+wins,1+count-wins)))
  stop("unknown policy")
}
run_policy <- function(method,tape) {
  count <- wins <- rep(0,K); regret <- numeric(horizon)
  for(t in 1:horizon) {
    arm <- choose_arm(method,count,wins,t)
    count[arm] <- count[arm]+1
    reward <- tape[arm,count[arm]]  # 各臂第几次被拉取，对应固定奖励带。
    wins[arm] <- wins[arm]+reward
    regret[t] <- max(mu)-mu[arm]    # 本次选择的伪遗憾，不用带噪奖励替代。
  }
  stopifnot(sum(count)==horizon,all(wins<=count),all(regret>=0))
  chosen <- which.max(wins/count)
  c(pseudo_regret=sum(regret),simple_regret=max(mu)-mu[chosen],
    best_identified=as.numeric(chosen==which.max(mu)))
}
methods <- c("epsilon","ucb","thompson")
scores <- array(NA_real_,c(repetitions,3,3))
for(rep in 1:repetitions) {
  tape <- matrix(runif(K*horizon),nrow=K) < mu
  for(j in seq_along(methods)) scores[rep,j,] <- run_policy(methods[j],tape)
}
result <- t(vapply(seq_along(methods),function(j) colMeans(scores[,j,]),numeric(3)))
colnames(result) <- c("mean_pseudo_regret","mean_simple_regret","best_identification_rate")
rownames(result) <- methods
print(result)
# 手算的前六轮：初始化后依次选 A,C,B，奖励依次 0,0,1。
count <- c(1,1,1); wins <- c(1,0,1)
manual <- integer(3)
for(j in 1:3) {
  t <- j+3; arm <- choose_arm("ucb",count,wins,t); manual[j] <- arm
  count[arm] <- count[arm]+1; wins[arm] <- wins[arm]+c(0,0,1)[j]
}
stopifnot(identical(manual,c(1L,3L,2L)),all(count==2),all(wins==1))
print(list(manual_arms=manual,counts=count,wins=wins))
