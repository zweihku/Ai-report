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
│   ├── keywords.json      # 关键词热力图数据（滚动14天窗口）
│   ├── trends.json        # 搜索趋势数据（滚动14天窗口）
│   └── reports-index.json # 日报索引
```

## 每日更新工作流（Scheduled Task）

每日更新任务需按以下步骤执行：

### 1. 收集数据
- 使用 WebSearch 搜索当日 AI 新闻、技术突破、公司动态
- 使用 Apify MCP 抓取 Twitter/X、Reddit、YouTube 等平台 AI 相关内容

### 2. 生成日报 HTML
- 输出到 `reports/YYYY-MM-DD.html`
- 三版本 Tab 切换（轻松阅读版 / 技术进阶版 / 深度技术版）
- 使用 Claude 配色方案，Lucide icon (SVG inline)，不用 emoji

### 3. 更新数据文件

**keywords.json** 更新规则：
- 从当日新闻中提取关键词，合并到现有数据
- 保留14天滚动窗口，删除超出窗口的旧数据
- 更新 weight（热度）、添加新的 links（关联关系）
- category: model | company | concept | policy | product | research

**trends.json** 更新规则：
- 为每个趋势关键词追加当日热度值
- 保持 dates 数组为14天窗口
- 移除最早一天，追加最新一天
- 保持 Top 10-15 个关键词

**reports-index.json** 更新规则：
- 追加当日日报条目 `{ date, file, title }`

### 4. 提交代码
- `git add reports/ data/`
- `git commit -m "daily: YYYY-MM-DD AI 日报更新"`
- `git push` → Railway 自动重新部署

## 设计规范
- 配色: Claude 风格 (accent: #DA7756)
- 字体: Inter + Noto Sans SC
- 图标: Lucide SVG inline，禁止 emoji
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
