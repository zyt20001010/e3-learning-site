# R >= 4.4；可核验的工作流反馈环；不调用大模型、不训练网络。
set.seed(20261126)
left <- function(f) (f(0)+f(.5))/2
trap <- function(f) (f(0)+2*f(.5)+f(1))/4
simpson <- function(f) (f(0)+4*f(.5)+f(1))/6
workflows <- list(left=left,trapezoid=trap,simpson=simpson)
# 开发任务与最终核验任务分开；每次函数评估最多3个节点。
dev_functions <- list(function(x) rep(1,length(x)),function(x) x,function(x) x^2)
dev_truth <- c(1,.5,1/3)
dev_loss <- function(solver) mean((vapply(dev_functions,solver,numeric(1))-dev_truth)^2)
current <- "left"; memory <- character(); log <- list()
for(round in 1:3) {
  candidate <- c("left","trapezoid","simpson")[round]
  loss <- dev_loss(workflows[[candidate]])
  if(loss <= dev_loss(workflows[[current]])) current <- candidate
  memory <- c(memory,paste(candidate,"development MSE",format(loss,digits=5)))
  log[[round]] <- data.frame(round=round,candidate=candidate,loss=loss,
                             retained=current,retained_loss=dev_loss(workflows[[current]]))
}
# 候选冻结后才用未参与选择的任务；不是反复查询测试集。
holdout_functions <- list(function(x) x^3,function(x) exp(x))
holdout_truth <- c(.25,exp(1)-1)
before <- vapply(holdout_functions,workflows$left,numeric(1))
after <- vapply(holdout_functions,workflows[[current]],numeric(1))
stopifnot(current=="simpson",abs(after[1]-.25)<1e-12)
stopifnot(mean((after-holdout_truth)^2)<mean((before-holdout_truth)^2))
trace <- do.call(rbind,log)
stopifnot(all(diff(trace$retained_loss)<=1e-12))
# 信息反例：所有评估节点均为零，真实积分却是1/2。
missed <- function(x) sin(2*pi*x)^2
alias_value <- workflows[[current]](missed)
stopifnot(abs(alias_value)<1e-12)
print(trace)
print(list(memory=memory,holdout=data.frame(truth=holdout_truth,before=before,after=after),
           alias_prediction=alias_value,alias_true_integral=.5))
