# R >= 4.0；base R。两个二值模态的合成联合分布。
set.seed(20261126)
P_same <- diag(0.5,2)
P_opposite <- matrix(c(0,0.5,0.5,0),2,byrow=TRUE)
stopifnot(all(rowSums(P_same)==rowSums(P_opposite)))
stopifnot(all(colSums(P_same)==colSums(P_opposite)))
values <- c(-1,1)
product <- outer(values,values)
cor_same <- sum(P_same*product)
cor_opposite <- sum(P_opposite*product)
stopifnot(cor_same==1,cor_opposite==-1)
# 固定一维、单位范数嵌入，计算两向交叉熵。
X <- matrix(values,ncol=1); Y <- matrix(values,ncol=1)
temperature <- 1
scores <- X %*% t(Y)/temperature
row_softmax <- function(S) {
  shifted <- sweep(S,1,apply(S,1,max))
  raw <- exp(shifted)
  sweep(raw,1,rowSums(raw),"/")
}
row_prob <- row_softmax(scores)
column_prob <- t(row_softmax(t(scores)))
same_loss <- -mean(c(log(diag(row_prob)),log(diag(column_prob))))
reverse <- c(2,1)
opposite_loss <- -mean(c(log(row_prob[cbind(1:2,reverse)]),
                        log(column_prob[cbind(1:2,reverse)])))
stopifnot(max(abs(rowSums(row_prob)-1))<1e-12)
stopifnot(abs(same_loss-log1p(exp(-2)))<1e-12)
stopifnot(abs(opposite_loss-same_loss-2)<1e-12)
# 翻转第二模态编码后可拟合相反配对；边缘分布仍一样。
flipped_scores <- X %*% t(-Y)
flipped_prob <- row_softmax(flipped_scores)
stopifnot(max(abs(flipped_prob[,reverse]-row_prob))<1e-12)
print(list(same_joint=P_same,opposite_joint=P_opposite,
           common_marginal=rowSums(P_same)))
print(list(cross_moment_same=cor_same,cross_moment_opposite=cor_opposite,
           score_matrix=scores,row_probability=row_prob))
print(list(loss_for_same_pairs=same_loss,loss_for_opposite_pairs=opposite_loss))
