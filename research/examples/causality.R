# R >= 4.0；base R / stats。全部数字为合成教学分布。
set.seed(20261126)
cells <- data.frame(L=c(0,0,1,1),A=c(0,1,0,1),
                    n=c(80,20,20,80),events=c(16,2,16,56))
cells$risk <- cells$events/cells$n
cells$propensity <- c(0.2,0.2,0.8,0.8)
joint <- cells$n/sum(cells$n)
crude_risks <- tapply(cells$events,cells$A,sum)/tapply(cells$n,cells$A,sum)
crude_difference <- unname(crude_risks["1"]-crude_risks["0"])
pL <- c(0.5,0.5)
risk0 <- c(0.2,0.8); risk1 <- c(0.1,0.7)
mu0 <- sum(pL*risk0); mu1 <- sum(pL*risk1)
standardized <- mu1-mu0
ipw1 <- sum(joint*(cells$A==1)*cells$risk/cells$propensity)
ipw0 <- sum(joint*(cells$A==0)*cells$risk/(1-cells$propensity))
stopifnot(abs(crude_difference-0.26)<1e-12)
stopifnot(abs(standardized+0.10)<1e-12)
stopifnot(abs(ipw1-mu1)<1e-12,abs(ipw0-mu0)<1e-12)
# 用已知结构模型验证。现实数据不会同时给出 Y0 和 Y1。
n_sim <- 100000
L <- rbinom(n_sim,1,0.5)
U_A <- runif(n_sim); U_Y <- runif(n_sim)
A <- as.integer(U_A<c(0.2,0.8)[L+1])
Y0 <- as.integer(U_Y<risk0[L+1])
Y1 <- as.integer(U_Y<risk1[L+1])
Y <- ifelse(A==1,Y1,Y0)
true_ate_sim <- mean(Y1-Y0)
causal_mc_se <- sqrt(0.1*0.9/n_sim)
stopifnot(abs(true_ate_sim-standardized)<6*causal_mc_se)
crude_sim <- mean(Y[A==1])-mean(Y[A==0])
crude_mc_se <- sqrt(0.58*0.42/sum(A==1)+0.32*0.68/sum(A==0))
stopifnot(abs(crude_sim-crude_difference)<6*crude_mc_se)
print(cells)
print(list(crude_risks=crude_risks,crude_difference=crude_difference,
           standardized_risk0=mu0,standardized_risk1=mu1,
           standardized_difference=standardized,IPW_difference=ipw1-ipw0))
print(list(simulated_ATE=true_ate_sim,simulated_crude=crude_sim))
