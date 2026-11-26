# R >= 4.0；base R。确定性合成测量，无外部数据。
set.seed(20261126)
A <- matrix(c(1,1,2,2),nrow=2,byrow=TRUE)
theta_a <- c(1,2); theta_b <- c(2,1)
y <- drop(A %*% theta_a)
null_direction <- c(1,-1)
stopifnot(all(y == c(3,6)), all(A %*% theta_b == y))
stopifnot(all(A %*% null_direction == 0))
# 从 SVD 自行构造伪逆；不对零奇异值取倒数。
decomp <- svd(A)
keep <- decomp$d > max(dim(A))*max(decomp$d)*.Machine$double.eps
Aplus <- decomp$v[,keep,drop=FALSE] %*%
         diag(1/decomp$d[keep],nrow=sum(keep)) %*%
         t(decomp$u[,keep,drop=FALSE])
theta_min <- drop(Aplus %*% y)
stopifnot(max(abs(theta_min-c(1.5,1.5)))<1e-12)
stopifnot(max(abs(A %*% Aplus %*% A-A))<1e-12)
# 和在零空间上不变，差在零空间上会改变。
stopifnot(sum(c(1,1)*null_direction)==0)
stopifnot(sum(c(1,-1)*null_direction)==2)
# 新测量记录两参数之差，增加独立信息。
A_new <- rbind(A,c(1,-1)); y_new <- c(y,-1)
theta_new <- drop(qr.solve(A_new,y_new))
stopifnot(max(abs(theta_new-theta_a))<1e-12)
# 满秩也可能病态：第二个方向放大测量误差一千倍。
B <- diag(c(1,0.001)); theta <- c(1,1)
truth <- drop(B %*% theta); noisy <- truth+c(0,0.001)
recovered <- drop(solve(B,noisy))
stopifnot(max(abs(recovered-c(1,2)))<1e-12)
print(list(A=A,y=y,singular_values=decomp$d,rank=sum(keep)))
print(list(minimum_norm=theta_min,new_measurement_solution=theta_new))
print(list(measurement_error=noisy-truth,parameter_error=recovered-theta))
