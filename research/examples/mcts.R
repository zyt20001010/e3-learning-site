# R >= 4.4；两层合成决策树；没有神经网络或梯度。
set.seed(20261126)
leaf_value <- c(A1=.2,A2=.9,B1=.6,B2=.7)
new_node <- function(path="",parent=NULL) {
  z <- new.env(parent=emptyenv()); z$path <- path; z$parent <- parent
  z$children <- list(); z$n <- 0L; z$total <- 0
  z$untried <- if(nchar(path)==0) c("A","B") else if(nchar(path)==1) c("1","2") else character()
  z
}
root <- new_node(); budget <- 500L; exploration_c <- 1
for(iteration in 1:budget) {
  node <- root
  # 1 Selection：只在已展开且没有待试动作的节点用 UCT。
  while(length(node$untried)==0 && length(node$children)>0) {
    scores <- vapply(node$children,function(ch) ch$total/ch$n+exploration_c*sqrt(log(node$n)/ch$n),numeric(1))
    node <- node$children[[which.max(scores)]]
  }
  # 2 Expansion：增加一个还没访问过的动作节点。
  if(length(node$untried)>0) {
    action <- node$untried[1]; node$untried <- node$untried[-1]
    child <- new_node(paste0(node$path,action),node)
    node$children[[action]] <- child; node <- child
  }
  # 3 Simulation：新节点不足终点时随机补完；终点按定义给奖励。
  terminal <- node$path
  if(nchar(terminal)==1) terminal <- paste0(terminal,sample(c("1","2"),1))
  reward <- unname(leaf_value[terminal])
  # 4 Backup：沿实际访问路径累加同一终点收益。
  while(!is.null(node)) {
    node$n <- node$n+1L; node$total <- node$total+reward; node <- node$parent
  }
}
visits <- vapply(root$children,function(z) z$n,integer(1))
means <- vapply(root$children,function(z) z$total/z$n,numeric(1))
stopifnot(root$n==budget,sum(visits)==budget,all(means>=0),all(means<=1))
stopifnot(names(which.max(means))=="A")
# 单次回传核验：旧节点 N=3,W=2.0，再收到0.9。
new_mean <- (2.0+.9)/(3+1)
stopifnot(abs(new_mean-.725)<1e-12)
print(list(visits=visits,mean_return=means,recommendation=names(which.max(means)),backup_mean=new_mean))
hand_indices <- c(2/3,.7)+sqrt(log(4)/c(3,1))
stopifnot(max(abs(hand_indices-c(1.3464446601,1.8774100225)))<1e-9)
print(hand_indices)
