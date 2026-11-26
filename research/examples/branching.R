set.seed(20261126)
moments <- function(b,d,t) {
  r <- b-d; m1 <- exp(r*t)
  m2 <- if(abs(r)<1e-10) 2*b*t else 2*b/r*m1*expm1(r*t)
  c(m1=m1,m2=m2,variance=m2+m1-m1^2)
}
tend <- log(2)
stopifnot(max(abs(moments(2,1,tend)-c(2,8,6)))<1e-10)
stopifnot(max(abs(moments(3,2,tend)-c(2,12,10)))<1e-10)
stopifnot(max(abs(moments(2,2,0.5)-c(1,2,2)))<1e-10)
f <- function(n) n*(n-1)
for(n in 0:20) {
  b <- 2; d <- 1
  generator <- b*n*(f(n+1)-f(n))+d*n*(f(n-1)-f(n))
  stopifnot(abs(generator-(2*(b-d)*f(n)+2*b*n))<1e-12)
}
simulate <- function(b,d,T) {
  n <- 1L; time <- 0
  while(n>0 && b+d>0) {
    time <- time+rexp(1,rate=(b+d)*n)
    if(time>T) break
    n <- n+ifelse(runif(1)<b/(b+d),1L,-1L)
  }
  n
}
counts <- replicate(2000,simulate(2,1,tend))
stopifnot(all(counts>=0), all(counts==floor(counts)))
print(moments(2,1,tend))
print(c(simulated_m1=mean(counts),simulated_m2=mean(counts*(counts-1))))
