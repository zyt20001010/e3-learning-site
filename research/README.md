# E3 Research

[进入 E3 Research](https://zyt20001010.github.io/e3-learning-site/research/) · [返回 E3 长期学习](https://zyt20001010.github.io/e3-learning-site/)

2026-11-26 基础版。沿用原站静态 HTML、CSS、JavaScript 与 GitHub Pages；课程内容为独立 JSON。无需账号，也不向服务器上传学习记录。

## 本版可使用的内容

- 31 门限定范围的 A/B 基础课程：L0–L8、手算、定义、关键推导、反例、最小代码、科研联系及参考来源。
- 31 段代码已实际运行（R 4.4.1、Python 3.9.6），75 道自测经过内容复核，102 个公式经过 KaTeX 解析检查。
- 17 个数学实验：反向传播、卷积、核、GNN、Attention、Fourier、采样、Gaussian 去噪、Flow Matching、ODE/SDE、非对易性、反事实耦合、生灭矩、Bandit、MCTS、信息增益、PK/PD。全部为合成数据，实验范围在面板中说明。
- 14 天路线，每天 200 分钟、3–4 个有范围限制的单元。优先 A 层，部分推导与复现进入 B 层。路线和专题复用同一课，不复制正文。
- 10 个领域、39 个模块的知识树，71 个统一节点；910 条去重覆盖项仅表示已收录需求，不表示完成教学。
- 42 组技术对比，其中 14 组已写成十维对照，28 组保持待扩展；13 条数学联系、6 个研究专题。
- 19 项论文索引：6 项核验了标注的方法范围，11 项仅核验书目，2 项待消歧。每条有自己的阅读边界，未将摘要核验说成全文审阅或实验复现。

## 学习与数据保存

从首页或 14 天路线进入。A/B/C 决定阅读深度，P0/P1/P2 决定优先级。C 层目前是理论扩展目录，自评不会因为阅读目录而自动完成。每门课的建设状态与个人学习进度分开显示。

收藏、笔记、错题、复习标记及各深度自评写入浏览器 `localStorage` 的 `e3-research-progress-v1`。旧 E3 的 `yanting-execution-e3-v1` 与教材 IndexedDB 不被读取或修改。跨设备需要在“学习记录”导出和导入；清理网站数据前先备份。

导入会校验格式、展示记录数量，默认按更新时间合并，并先将原始记录保存在 `e3-research-before-import-v1`。损坏存储不会被自动覆盖。备份可能包含笔记中的个人内容，不应提交到仓库。

## 运行与验证

网站运行不需要 npm、R 或 Python；KaTeX 与字体都在本地，无 CDN 依赖。需要 HTTP 服务，直接双击 HTML 不能加载 ES modules 和 JSON。

在仓库根目录运行：

```sh
python3 -m http.server 4183 --bind 127.0.0.1
```

打开 `http://127.0.0.1:4183/research/`。维护和检查在 `research/` 中执行：

```sh
npm ci --ignore-scripts
npm run verify:examples
npm run typecheck
npm run build
npm test
node --check js/app.js
node --check js/labs.js
```

`verify:examples` 从课程 JSON 提取当前代码，逐段执行并记录 SHA-256、环境与输出；必须已安装 R 和 Python。类型检查覆盖数值函数与进度存储核心；页面组件另做语法及浏览器操作检查。33 项自动化测试覆盖数学不变量、梯度、概率、路径统计、备份恢复、知识引用与原 E3 六段脚本哈希。

## 内容结构与维护

- `content/catalog.json`：节点、先修关系和覆盖清单。
- `content/lessons/*.json`：唯一正文来源，含全部 L0–L8 和题目。
- `content/route.json`：每日单元、时间、深度和入口段落。
- `content/sources.json` / `papers.json`：来源与论文阅读范围。
- `content/comparisons.json` / `topics.json` / `connections.json`：对比、专题和数学关系。
- `js/math.js`：共享数值运算；`js/labs.js`：实验控件；`js/app.js`：阅读与导航；`js/progress.js`：独立学习记录。
- `content/code-run-report.json` / `build-report.json` / `editorial-review.json`：代码运行、构建与独立内容复核记录。

新增课程先设稳定 ID、模块、先修和相关节点，再写正文。仅有目录时所有完成标记为 false。修改公式、反例或题目后重新做内容复核；不得因为构建通过就自动宣称理论正确。修改代码后须重新运行，构建会拒绝代码哈希与通过记录不一致的课程。修改交互计算须增加针对其数学对象的测试。

原 E3 首页只追加入口。`tests/fixtures/original-script-hashes.json` 锁定原课程与全部原站脚本；不得为方便更新而随意改掉基准。

## 剩余工作

本版为可运行的基础版，不是全部知识树已完成。40 个节点尚无正式正文（其中 39 个为模块扩展目录）；算子学习等专项课、Level C 严格证明、28 组完整技术对比仍待写作。待扩展实验包括向量量化、多模态对齐、FFT 补零可视化、粒子滤波、Bellman 更新、RSI 和细胞谱系。部分当前 DDI 理论审查案例仍只列为扩展议题，不宣称已证明或确认原创性。

论文索引的两项待消歧与 11 项书目记录需要取得并阅读原文。已有课程和合成实验不替代真实药理、细胞、临床验证，也不代表复现了原论文的大模型性能。
