set.seed(20261126)
mu <- function(a0,l,a1) 10+2*a0-4*l+3*a1
pL <- function(a0) ifelse(a0==1,0.2,0.8)
gmean <- function(a0,a1) (1-pL(a0))*mu(a0,0,a1)+pL(a0)*mu(a0,1,a1)
tab <- expand.grid(a0=0:1,l=0:1,a1=0:1)
tab$p_l <- ifelse(tab$l==1,pL(tab$a0),1-pL(tab$a0))
e1 <- ifelse(tab$l==1,0.9,0.1)
tab$p_a1 <- ifelse(tab$a1==1,e1,1-e1)
tab$joint <- 0.5*tab$p_l*tab$p_a1
tab$mean_y <- with(tab,mu(a0,l,a1))
stopifnot(abs(sum(tab$joint)-1)<1e-12)
sel <- tab$a0==1 & tab$a1==1
observational <- sum(tab$joint[sel]*tab$mean_y[sel])/sum(tab$joint[sel])
interventional <- gmean(1,1)
stopifnot(abs(interventional-14.2)<1e-12,abs(gmean(0,0)-6.8)<1e-12)
stopifnot(abs(observational-(15-4*9/13))<1e-12)
print(tab)
print(c(observational=observational,interventional=interventional,
        strategy_difference=gmean(1,1)-gmean(0,0)))
