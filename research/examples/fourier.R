# R >= 4.0；base R / stats。合成四点信号，无外部数据。
set.seed(20261126)
dft_direct <- function(x, inverse=FALSE) {
  n <- length(x); index <- 0:(n-1)
  sgn <- if (inverse) 1 else -1
  z <- vapply(index, function(k) sum(x*exp(sgn*2*pi*1i*k*index/n)), complex(1))
  if (inverse) z/n else z
}
x <- c(1,0,-1,0); y <- c(0,1,0,-1)
X <- dft_direct(x); Y <- dft_direct(y)
stopifnot(max(Mod(X-fft(x)))<1e-12)
stopifnot(max(Mod(Y-fft(y)))<1e-12)
stopifnot(max(abs(Mod(X)-Mod(Y)))<1e-12)
stopifnot(max(Mod(dft_direct(Y,TRUE)-y))<1e-12)
phase_removed <- Re(dft_direct(Mod(Y),TRUE))
stopifnot(max(abs(phase_removed-x))<1e-12)
stopifnot(sum((phase_removed-y)^2)>1)
stopifnot(abs(sum(x^2)-sum(Mod(X)^2)/length(x))<1e-12)
# 不补零的两点频域乘积给出循环卷积。
a <- c(1,2); b <- c(1,1)
circular <- Re(fft(fft(a)*fft(b),inverse=TRUE))/2
# 线性卷积长度为 2+2-1=3，先补零到至少 3。
padded <- Re(fft(fft(c(a,0))*fft(c(b,0)),inverse=TRUE))/3
stopifnot(max(abs(circular-c(3,3)))<1e-12)
stopifnot(max(abs(padded-c(1,3,2)))<1e-12)
print(list(x=x,y=y,DFT_x=X,DFT_y=Y,magnitude=Mod(Y),phase_removed=phase_removed))
print(list(circular=circular,linear=padded))
