set.seed(20261126)
D <- 100; V <- 20; CL <- 2
k <- CL/V
concentration <- function(t, clearance=CL) D/V*exp(-clearance/V*t)
effect <- function(C, ec50=5, emax=100, hill=1) emax*C^hill/(ec50^hill+C^hill)
half <- log(2)/k
auc_numeric <- integrate(concentration, lower=0, upper=Inf)$value
stopifnot(abs(concentration(half)-2.5)<1e-12, abs(auc_numeric-D/CL)<1e-7)
stopifnot(abs(effect(5)-50)<1e-12, abs(effect(2.5)-100/3)<1e-12)
t <- 3; delta <- 1e-4
derivative <- (concentration(t+delta)-concentration(t-delta))/(2*delta)
stopifnot(abs(derivative+k*concentration(t))<1e-8)
scenario <- data.frame(scenario=c("baseline","CL_half","EC50_half"),
  C0=c(5,5,5), AUC=c(D/CL,D/(CL/2),D/CL),
  initial_effect=c(effect(5),effect(5),effect(5,ec50=2.5)))
stopifnot(scenario$AUC[2]==2*scenario$AUC[1])
print(c(k=k,half_life=half,auc=auc_numeric,effect_at_half_life=effect(2.5)))
print(scenario)
