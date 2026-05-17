<div align="center">

# Jameswan · AviSpotters / FlightBox

**航空摄影内容社区 · Ticket（奖励机票/积分票）工具子站 · iOS26 Aurora UI**

<img
  src="https://capsule-render.vercel.app/api?type=waving&height=240&color=0:0ea5e9,35:22c55e,70:a78bfa,100:38bdf8&text=FlightBox&fontColor=ffffff&fontSize=62&fontAlignY=38&desc=Jameswan%20%C2%B7%20AviSpotters%20%C2%B7%20iOS26%20Aurora%20UI%20%C2%B7%20Ticket%20Award%20Search&descAlignY=62&descSize=18"
  alt="Aurora banner"
/>

<img
  src="https://readme-typing-svg.demolab.com?font=Inter&weight=700&size=18&duration=2600&pause=900&color=38BDF8&center=true&vCenter=true&width=900&lines=iOS26+Aurora+UI+%E2%80%A2+Glassmorphism+%E2%80%A2+Aurora+Gradient;Aviation+Photography+Community+%E2%80%A2+Moderation+%E2%80%A2+Admin+Controls;Ticket+Award+Search+%E2%80%A2+FX+Conversion+%E2%80%A2+Cost+Estimation"
  alt="typing"
/>

<br/>

<img src="https://img.shields.io/badge/License-Apache--2.0-3DA639?style=for-the-badge" />
<img src="https://img.shields.io/badge/Owner-Jameswan-0EA5E9?style=for-the-badge" />
<img src="https://img.shields.io/badge/UI-iOS26%20Aurora-22C55E?style=for-the-badge" />
<img src="https://img.shields.io/badge/Theme-Light%20%2F%20Dark-A78BFA?style=for-the-badge" />

<br/>

<img src="https://img.shields.io/badge/Runtime-Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" />
<img src="https://img.shields.io/badge/Framework-Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
<img src="https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/UI-TailwindCSS-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white" />
<img src="https://img.shields.io/badge/DB-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
<img src="https://img.shields.io/badge/ORM-Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
<img src="https://img.shields.io/badge/Deploy-Linux-FCC624?style=for-the-badge&logo=linux&logoColor=111827" />
<img src="https://img.shields.io/badge/Reverse%20Proxy-Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white" />

<br/>

<img src="https://img.shields.io/badge/I18N-zh--Hans%20%7C%20zh--Hant%20%7C%20en-0EA5E9?style=for-the-badge" />
<img alt="Views" src="https://komarev.com/ghpvc/?username=Jameswan&label=Views&color=0ea5e9&style=flat" />

<br/><br/>

> 本仓库用于上传“源码镜像”，会刻意缺失生产数据与敏感内容（例如 `.env`、`uploads/`、`var/`、本地数据库文件等）。  
> 若需要完整部署，请使用服务器内网版本与受控配置。

</div>

---

## ✦ 网站定位

AviSpotters / FlightBox 是一个“内容与工具共生”的网站系统：

- **内容侧（主站）**：围绕航空摄影作品建立可探索的内容网络（机场 / 航司 / 机型 / 注册号）
- **治理侧（后台）**：审核、申诉、举报、风控与站点配置，保障内容质量与站点秩序
- **工具侧（Ticket 子站）**：奖励机票（积分票）检索与成本估算，让兑换更可比较、更可决策

---

## 🧱 技术架构（Tech Stack）

### 运行与框架
- **Runtime**：Node.js
- **Web Framework**：Next.js（App Router）
- **Language**：TypeScript
- **UI**：React + TailwindCSS（iOS26 Aurora / Glassmorphism 风格）

### 数据与存储
- **Database**：PostgreSQL
- **ORM**：Prisma（通过 Prisma Client 访问数据库）

### 部署形态（典型）
- **OS**：Linux
- **Reverse Proxy**：Nginx（TLS/HTTP2、静态资源缓存、反向代理到 Node 服务）

### 国际化与主题
- **I18N**：zh-Hans / zh-Hant / en
- **Theme**：Light / Dark

---

## 🖼️ 主站内容（航空摄影社区）

### 内容组织：从“照片”走向“可探索的内容网络”
- **机场聚合**：以机场为入口观察不同时间/机型/航司内容分布
- **航司聚合**：以航司为入口形成内容目录与机队视角
- **制造商 → 机族 → 机型**：层级化浏览路径
- **注册号（机尾号）**：以“某一架飞机”为中心串联历史作品与记录

### 创作者工作流：提交到展示的完整链路
- 上传与信息结构化：提升检索与展示质量
- 元数据处理（EXIF/文件信息）：辅助归档与校验
- 审核流程（通过/拒绝/复审）：保证站点标准与一致性
- 历史追踪：可回溯作品生命周期

### 社区治理与后台能力
- 审核后台：队列处理、历史、复审
- 申诉与沟通：对争议提供复核通道
- 举报/事件处理：对违规内容与行为做闭环处理
- 封禁与限制：账号/身份/IP 等维度策略化控制
- 站点配置：维护模式、公告、站点资源与运营入口

---

## 🎫 Ticket 子站（奖励机票/积分票）

Ticket 子站强调“像 OTA 一样的信息结构”，同时补齐兑换玩家真正需要的“估值能力”。

### 奖励机票搜索（Award / Miles）
- 多条件组合：出发/到达、日期、舱位、经停、计划筛选等
- 结果卡片化：路线、航段、直飞/经停、点数、税费、更新时间、跳转链接
- 信息目标：让用户快速判断“哪个更划算 / 更合适”

### 税费换算与综合成本估算（可决策）
- 税费换算到统一视角便于横向对比
- 用户可设置自己的点值成本（Point Valuation）
- 展示综合成本（里程估值 + 税费）帮助判断兑换价值

### 权限与 Beta 管控
- 支持公开/登录/批准用户等访问策略
- 管理员开关：控制可用性与 provider 状态
- 便于灰度开放与稳定性管理

### 普通票价入口（规划）
- 预留 Cash Fare 入口与 provider 形态
- 当前阶段保留产品路径与结构，后续再接入真实查询

---

## 🧩 结构概览（读代码地图）

| 区域 | 路径（示例） | 说明 |
|------|--------------|------|
| 主站页面 | `src/app/*` | 内容浏览、上传、用户体系等 |
| 后台页面 | `src/app/admin/*` | 审核、配置、治理工具 |
| Ticket 子站 | `src/app/ticket/*` | 搜索、设置、Cash 入口 |
| API 路由 | `src/app/api/*` | Web API 与内部接口 |
| 数据访问 | `src/lib/db.ts` | Prisma Client 初始化 |

---

## 🖼️ 展示位（截图/动图）

> 把截图/动图填到这里，README 会更像官网。

<div align="center">

**主站 · 内容流 / 聚合页**  
_（放截图链接）_

**Ticket · 搜索表单 / 结果卡片**  
_（放截图链接）_

**后台 · 审核 / 站点配置**  
_（放截图链接）_

</div>

---

## 📜 License

Apache License 2.0 — see `LICENSE`.
node ./node_modules/next/dist/bin/next start -p 3000
```

---

## 專案結構（簡要）

```
FlightBox/
├── src/
│   ├── app/              # 頁面與 API 路由（App Router）
│   ├── components/       # React 元件
│   ├── lib/              # 業務邏輯、工具、Prisma 客戶端
│   └── i18n/             # 多語言
├── prisma/               # Schema 與遷移（若存在）
├── public/               # 靜態資源
└── package.json
```

主要路由示例：

| 路徑 | 說明 |
|------|------|
| `/` | 首頁 |
| `/gallery` | 圖庫 |
| `/photos/upload` | 上傳照片 |
| `/admin` | 管理後台 |
| `/shop` | 積分商城 |
| `/lottery` | 抽獎中心 |
| `/points` | 積分帳本 |
| `/video` | 影片專區 |

---

## 部署提示

1. 設定 `APP_URL` / `NEXT_PUBLIC_APP_URL` 為正式域名（含 `https`）。
2. 配置 Nginx 反向代理至 Node 進程（預設埠 `3000`）。
3. 上傳目錄需可寫，並建議定期備份。
4. 定時任務可透過 cron 呼叫 `/api/cron/*`（需 `CRON_TOKEN`）。
5. 若使用子網域（例如 `ticket.*`），需在反向代理與 middleware 中一併配置。

---

## 授權

本專案原始碼依 [MIT License](./LICENSE) 發布。

**使用者上傳的照片與其他 UGC 內容** 之版權歸原作者所有，與本儲存庫的程式授權無關。對外營運時請另行制定服務條款與內容授權政策。

---

## 貢獻

歡迎透過 Issue / Pull Request 參與。提交前請確保：

- 通過 `npm run build`
- 不提交密鑰、`.env` 或使用者資料
- 變更說明清楚、範圍聚焦

---

## 聯絡

- 網站：[https://www.avispotters.net](https://www.avispotters.net)
- 問題回報：請使用 GitHub Issues

---

<sub>FlightBox 為 Avispotters 網站之後端與前台程式碼庫名稱。</sub>
