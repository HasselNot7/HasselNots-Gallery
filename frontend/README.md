# frontend/ — Next.js 前端

本目录是站点前端的 npm 包根（Next.js 16 App Router + Turbopack）。整体说明在仓库根：
架构 / 设计令牌 / API 全表 / 站点设置约定见 [`../PROJECT.md`](../PROJECT.md)，部署见
[`../docs/DEPLOY.md`](../docs/DEPLOY.md)，快速上手见 [`../README.md`](../README.md)。

```bash
npm install     # 装依赖
npm run dev     # 开发（:3000，需后端跑在 127.0.0.1:8001）
npm run build   # 生产构建
npm run start   # 跑已构建产物
npm run lint    # eslint
```

站点 URL 取 `.env.local` 的 `NEXT_PUBLIC_SITE_URL`（默认 `http://localhost:3000`）；字体是本地 Sigma Serif + Google Fonts，不是 create-next-app 模板里的 Geist / Vercel 部署。
