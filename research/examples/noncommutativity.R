set.seed(20261126)
A <- matrix(c(0,1,0,0), 2, byrow=TRUE)
B <- t(A); I <- diag(2); x0 <- c(1,0)
stopifnot(all(A %*% A == 0), all(B %*% B == 0))
s <- 1; tt <- 1
AB_order <- as.vector((I+tt*B) %*% (I+s*A) %*% x0)
BA_order <- as.vector((I+s*A) %*% (I+tt*B) %*% x0)
stopifnot(all(AB_order == c(1,1)), all(BA_order == c(2,1)))
expm_small <- function(M) {
  ans <- diag(nrow(M)); term <- ans
  for(k in 1:80) {term <- term %*% M/k; ans <- ans+term}
  ans
}
for(u in c(0,0.4,1)) for(v in c(0,0.7,1)) for(T in c(0.2,1)) {
  M <- T*(u*A+v*B)
  y <- as.numeric(t(x0) %*% expm_small(M) %*% x0)
  y_dual <- as.numeric(t(x0) %*% expm_small(t(M)) %*% x0)
  stopifnot(abs(y-y_dual)<1e-12, abs(y-cosh(T*sqrt(u*v)))<1e-12)
}
dual_AB <- as.vector((I+tt*t(B)) %*% (I+s*t(A)) %*% x0)
stopifnot(dual_AB[1] == 2, AB_order[1] == 1, AB_order[2] == BA_order[2])
print(rbind(A_then_B=AB_order,B_then_A=BA_order,dual_A_then_B=dual_AB))
print(A %*% B-B %*% A)
