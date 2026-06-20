# Lull · 听简 — 前端

英语分级阅读学习网站的用户端前端原型，70 年代复古海报风。配合后端仓库 `eng-mp` 使用。

## 快速开始
```bash
cd frontend
python3 -m http.server 5173
# 打开 http://localhost:5173/Lull-Reading.dc.html
```

## 内容
- `Lull-Reading.dc.html` — 主文件，含 12 个用户端页面（登录/注册、文章列表、文章精读、词典、生词本、单词复习、语法库、语法详情、打卡、统计+能力雷达、AI 助手、设置）。
- `Flower.dc.html` — 花朵装饰子组件。
- `support.js` — 运行时（勿改）。

## 文档
- **设计规范** → [`DESIGN_SPEC.md`](./DESIGN_SPEC.md)
- **交接文档（含后端路由 / 数据对接）** → [`HANDOFF.md`](./HANDOFF.md)

> 当前为纯前端原型，数据为样例数据，对接真实接口见 HANDOFF.md 第 4 节。
