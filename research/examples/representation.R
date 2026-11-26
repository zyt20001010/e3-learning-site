# R >= 4.0；base R / stats。四点均匀分布，非真实实验数据。
set.seed(20261126)
X <- rbind(c(-10,-1),c(-10,1),c(10,-1),c(10,1))
Y <- as.integer(X[,2]>0)
center <- colMeans(X)
Xc <- sweep(X,2,center)
C <- crossprod(Xc)/nrow(Xc) # 本课使用 1/n，而不是 1/(n-1)。
e <- eigen(C,symmetric=TRUE)
v <- e$vectors[,1,drop=FALSE]
# 特征向量整体符号任意；统一朝向，使打印结果与手算表相同。
if (v[which.max(abs(v)),1]<0) v <- -v
Z <- drop(Xc %*% v)
reconstruction <- Z %o% drop(v)
retained <- e$values[1]/sum(e$values)
error <- mean(rowSums((Xc-reconstruction)^2))
stopifnot(max(abs(C-diag(c(100,1))))<1e-12)
stopifnot(abs(retained-100/101)<1e-12, abs(error-1)<1e-12)
stopifnot(max(abs(Z-X[,1]))<1e-12)
# 每个相同 Z 内都有一正一负标签，最佳分类也只能各答对一半。
label_groups <- split(Y,round(Z,10))
best_accuracy <- sum(vapply(label_groups,function(y)
  max(sum(y==0),sum(y==1)),numeric(1)))/length(Y)
stopifnot(best_accuracy==0.5, all(as.integer(X[,2]>0)==Y))
# 与成熟实现交叉核对；特征向量允许整体变号。
reference <- prcomp(X,center=TRUE,scale.=FALSE)
stopifnot(abs(abs(sum(reference$rotation[,1]*v))-1)<1e-12)
# 完整正交变换可以逆回，降维投影则不能。
R <- matrix(c(cos(pi/4),-sin(pi/4),sin(pi/4),cos(pi/4)),2,byrow=TRUE)
rotated <- Xc %*% R
stopifnot(max(abs(rotated %*% t(R)-Xc))<1e-12)
print(list(input=X,label=Y,covariance=C,eigenvalues=e$values,
           representation=Z,reconstruction=reconstruction))
print(list(retained_variance=retained,reconstruction_MSE=error,
           best_label_accuracy_from_Z=best_accuracy))
