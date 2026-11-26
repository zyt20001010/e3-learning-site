set.seed(20261126)
evaluate <- function(q) {
  J <- matrix(c(q, 0.5-q, 0.5-q, q), 2, byrow=TRUE)
  observed <- rbind(0.5*rowSums(J), 0.5*colSums(J))
  stopifnot(abs(sum(J)-1)<1e-12, all(J>=0), max(abs(observed-0.25))<1e-12)
  c(ATE=sum(J[,2])-sum(J[2,]), benefit=J[1,2],
    counterfactual_given_Y0_zero=J[1,2]/sum(J[1,]), variance_effect=J[1,2]+J[2,1])
}
result <- rbind(same_coupling=evaluate(0.5), opposite_coupling=evaluate(0))
stopifnot(all(result[,'ATE']==0), result[1,2]==0, result[2,2]==0.5)
stopifnot(result[1,3]==0, result[2,3]==1)
print(result)
for(q in seq(0,0.5,length.out=101)) evaluate(q)
