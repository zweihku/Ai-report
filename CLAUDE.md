# AI Pulse - 每日 AI 日报项目

## 项目结构

```
Ai-report/
├── server.js              # Express 静态服务器
├── package.json
├── Dockerfile             # Railway 部署
├── railway.toml
├── public/                # 静态文件
│   ├── index.html         # 主页（热力图 + 趋势图 + 日历导航）
│   ├── css/style.css
│   └── js/main.js
├── reports/               # 每日日报 HTML（格式: YYYY-MM-DD.html）
├── data/                  # 数据文件
│   ├── keywords.json      # 关键词热力图数据（滚动14天窗口，保留 Top 25）
│   ├── trends.json        # 搜索趋势数据（滚动14天窗口，保留 Top 10）
│   └── reports-index.json # 日报索引
```

## 主页展示规则

- 热力图：从 keywords.json 取 **Top 10** 关键词展示，纯文字力导向图，颜色按热度渐变（蓝→绿→橙→红）
- 趋势图：从 trends.json 取 **Top 5** 关键词展示折线图
- 日报导航：从 reports-index.json 渲染日历卡片

## 每日更新工作流（Scheduled Task: ai-update）

### 前置检查
1. 读取本文件了解项目规范
2. 检查 reports/YYYY-MM-DD.html 是否已存在，已存在则跳过日报生成
3. 读取 data/ 下现有数据文件获取当前状态

### 1. 数据采集（并行）

**WebSearch 搜索**:
- "AI news today YYYY-MM-DD"
- "AI breakthroughs latest"
- "OpenAI Anthropic Google DeepMind news today"
- "AI agent multimodal robotics latest"
- "AI regulation policy latest"
- "AI startups funding latest"
- 中文: "AI 最新消息"、"人工智能 今日新闻"

**Apify MCP 社交媒体抓取**（按优先级）:
1. 用 `search-actors` 搜索平台 Actor → `add-actor` 加载 → 调用抓取
2. Twitter/X: "AI" "LLM" "GPT" 关键词，过去24h，按热度排序
3. Reddit: r/MachineLearning, r/artificial 热帖
4. YouTube: AI 频道最新视频
5. 用 apify/rag-web-browser 抓取重要新闻全文

**降级策略**: Apify 失败时降级为仅 WebSearch，日报中注明数据源有限

### 2. 生成日报 HTML

输出: `reports/YYYY-MM-DD.html`（单文件自包含）

**三版本 Tab 切换**:
1. **轻松阅读版** — 无技术背景可读，通俗语言，偏泛化娱乐，每条 2-3 句总结
2. **技术进阶版** — 有技术经验读者，包含原理简述和技术点评
3. **深度技术版** — 行业专家，详尽技术细节、论文引用、benchmark、原始链接

**日报顶部必须包含**: `<a href="/">← 返回 AI Pulse</a>`

### 3. 更新数据文件

**keywords.json**:
- 从当日新闻提取关键词，与现有数据合并
- 重新计算 weight（1-100），更新 links（strength 0-1）
- **保留 Top 25 个关键词**，删除其余
- 滚动14天窗口，更新 window.from / window.to
- category: model | company | concept | policy | product | research

**trends.json**:
- 为 **Top 10** 关键词追加今日热度值
- dates 数组保持14天窗口（移除最早一天，追加今天）
- 新进入 Top 10 的关键词，前面日期补 0

**reports-index.json**:
- 追加: `{ "date": "YYYY-MM-DD", "file": "YYYY-MM-DD.html", "title": "AI Daily Report | YYYY.MM.DD" }`

### 4. 本地验证

提交前必须用 preview 工具验证：
1. `preview_start` 启动 dev server（ai-pulse）
2. 验证日报页 `/reports/YYYY-MM-DD.html`：内容、Tab 切换、无控制台报错
3. 验证主页 `/`：今日卡片出现、热力图更新、趋势图更新、无报错
4. 有问题先修复再提交

### 5. Git 提交部署

```bash
git add reports/ data/ public/
git commit -m "daily: YYYY-MM-DD AI 日报更新"
git push
```

Railway 自动重新部署。push 失败时记录错误，不重试。

## 设计规范

- 配色: Claude 风格 (accent: #DA7756, bg: #FAF9F7, surface: #FFFFFF, border: #E8E5E0)
- 字体: Inter + Noto Sans SC
- 图标: Lucide SVG inline，**禁止 emoji**
- 排版: 简洁、逻辑清晰、大量留白

## 数据格式

### keywords.json
```json
{
  "updated": "YYYY-MM-DD",
  "window": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" },
  "keywords": [
    { "word": "GPT-5", "weight": 95, "category": "model" }
  ],
  "links": [
    { "source": "GPT-5", "target": "OpenAI", "strength": 0.9 }
  ]
}
```

### trends.json
```json
{
  "updated": "YYYY-MM-DD",
  "dates": ["YYYY-MM-DD", ...],
  "trends": [
    { "keyword": "GPT-5", "category": "model", "values": [10, 20, ...] }
  ]
}
```

### reports-index.json
```json
{
  "reports": [
    { "date": "YYYY-MM-DD", "file": "YYYY-MM-DD.html", "title": "AI Daily Report | YYYY.MM.DD" }
  ]
}
```
