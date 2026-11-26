set.seed(20261126)
threshold <- function(scores,alpha) {
  stopifnot(length(scores)>0, alpha>0, alpha<1)
  k <- ceiling((length(scores)+1)*(1-alpha))
  if(k>length(scores)) Inf else sort(scores)[k]
}
all_scores <- 1:5
tab <- do.call(rbind,lapply(seq_along(all_scores),function(i) {
  cutoff <- threshold(all_scores[-i],0.2)
  data.frame(test=all_scores[i],cutoff=cutoff,covered=all_scores[i]<=cutoff)
}))
stopifnot(mean(tab$covered)==4/5)
stopifnot(is.infinite(threshold(c(1,2,3,4),0.1)))
stopifnot(threshold(c(1,1,1,1),0.2)==1)
group_probability <- c(0.9,0.1)
group_coverage <- c(1,0)
overall <- sum(group_probability*group_coverage)
stopifnot(abs(overall-0.9)<1e-12, group_coverage[2]==0)
print(tab)
print(c(rank_coverage=mean(tab$covered),threshold_90=threshold(1:4,0.1),
        overall_coverage=overall,rare_group_coverage=group_coverage[2]))
