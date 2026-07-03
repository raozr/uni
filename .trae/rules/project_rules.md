# Uni 项目规则

## 项目概述
**Uni**（原名「陪陪」）— 数字分身专属陪伴应用。创建者为家人（如老人）创建 AI 分身，分身自动陪聊。

- 仓库：https://github.com/raozr/uni
- 技术文档：见根目录 `README.md`

## 技术栈
- **Mobile**: Expo SDK 55 / React Native 0.83 / React 19 / expo-router / TypeScript 5.9
- **Server**: Express 4 / Node.js / TypeScript / PostgreSQL / DeepSeek AI
- **测试**: Jest 29 + ts-jest（server 端）
- **关键依赖**: expo-blur, expo-linear-gradient, @react-native-async-storage/async-storage

## 开发命令

### Mobile (在 mobile/ 目录)
```bash
npm start              # Expo 开发服务器
npm run android        # Android
npm run ios            # iOS
npx tsc --noEmit       # TypeScript 类型检查（无独立 lint 命令）
```

### Server (在 server/ 目录)
```bash
npm run dev            # tsx watch 开发模式
npm run build          # tsc 编译
npm start              # 生产模式
npm test               # Jest 测试套件
npx tsc --noEmit       # TypeScript 类型检查
JWT_SECRET="test-key" npx jest --verbose   # 带环境变量跑测试
```

### 部署 (在 server/ 目录)
```bash
./deploy.sh setup      # 首次部署：环境检查 + 安装 + 构建 + 启动
./deploy.sh update     # 更新：git pull + 构建 + 重启
./deploy.sh status     # 查看状态
./deploy.sh logs       # 实时日志
./deploy.sh rollback   # 回滚上一版本
```

## 项目结构
```
peipei/
├── README.md              # 项目文档（含 API 文档、设计系统、部署说明）
├── .gitignore             # 根目录 gitignore
├── .trae/rules/           # 项目规则（本文件）
├── mobile/                # Expo React Native App
│   ├── app/               # expo-router 页面
│   │   ├── _layout.tsx    # 根布局 · 渐变背景 · 启动路由（multiGet + cancelled）
│   │   ├── index.tsx      # 首页（两个入口卡片，reqId 防竞态）
│   │   ├── pairing.tsx    # 配对码输入（multiSet 原子写入）
│   │   ├── creator-login.tsx  # 管理者登录（写 last_identity）
│   │   ├── dashboard.tsx  # 分身管理面板（reqId 防竞态）
│   │   ├── avatar-setup.tsx   # 创建/编辑分身
│   │   ├── code-display.tsx   # 配对码展示
│   │   ├── chat/[avatarId].tsx    # 聊天界面（nextMsgId 防碰撞 + useCallback）
│   │   ├── memories/[avatarId].tsx     # 记忆管理（useMemo）
│   │   ├── preset-answers/[avatarId].tsx  # 预设问答（saving 防重入 + keywords 兜底）
│   │   └── unknown-queries/[avatarId].tsx # 未知问题（清空 replyText + 防重入）
│   ├── lib/
│   │   ├── api.ts         # API 封装 · 超时 · 401 全局处理
│   │   ├── config.ts      # API 地址配置
│   │   ├── theme.ts       # 设计 Token（颜色/圆角/阴影/渐变）
│   │   └── components/NavBar.tsx  # 浮动导航栏组件
│   └── package.json
├── server/                # Express API Server
│   ├── deploy.sh          # 一键部署脚本
│   ├── uni-server.service # systemd 服务模板
│   ├── jest.config.js     # Jest 配置
│   ├── .env.example       # 环境变量模板
│   └── src/
│       ├── index.ts       # 入口 · 中间件挂载 · trust proxy
│       ├── config.ts      # ⚙️ 环境变量校验 · 密钥集中管理
│       ├── db/
│       │   └── index.ts   # PostgreSQL 池 · withTransaction · 建表 · 索引
│       ├── middleware/
│       │   ├── auth.ts        # JWT 认证（创建者）
│       │   ├── chatAuth.ts    # 双模式认证（创建者/配对者）
│       │   └── rateLimiter.ts # IP 限流中间件
│       ├── routes/
│       │   ├── auth.ts            # 注册/登录/me
│       │   ├── avatar.ts          # 分身 CRUD · 配对码生成
│       │   ├── chat.ts            # 消息收发（事务）· 历史 · creator-reply
│       │   ├── pairing.ts         # 配对码验证 · IDOR 防护
│       │   ├── unknown.ts         # 未知问题管理
│       │   └── avatar-memories.ts # 记忆 CRUD（upsert）
│       ├── services/
│       │   ├── chat.ts        # AI 对话编排 · isUncertainReply
│       │   ├── deepseek.ts    # DeepSeek API 调用
│       │   └── push.ts        # 推送通知（预留）
│       └── __tests__/         # ✅ Jest 测试套件
│           ├── config.test.ts          # JWT_SECRET 校验
│           ├── rateLimiter.test.ts     # 限流逻辑
│           ├── avatar.pairing.test.ts  # 配对码生成
│           ├── chat.service.test.ts    # isUncertainReply + 预设匹配
│           └── db.transaction.test.ts  # 事务 COMMIT/ROLLBACK
└── mockup/                # HTML 设计稿
    └── index-modern.html  # 毛玻璃风格设计稿（基准）
```

## 设计系统（theme.ts）

### 颜色
- 主色: `#146d72` (primary), `#0f555d` (primary2)
- 文字: `#17262d` (ink), `#2d4248` (ink2)
- 背景: `#f0f9f4` → `#f7f1e5` → `#e2eef6` (渐变)
- 卡片底: `rgba(255,255,255,0.66)` (surface)
- 边框: `rgba(255,255,255,0.58)` (line)

### 圆角
- pill: 999 (按钮), xl: 32, lg: 26, md: 20, sm: 14

### 渐变
- background, primary, coral, bubble

## 核心产品逻辑（三类角色）

```
创建者 (Creator) — 真人，登录管理面板，创建分身
  ↓ 创建
AI 分身 (Avatar) — 数字人，自动陪聊
  ↓ 配对码分享给
聊天对象 (Target) — 真人，输入配对码开始聊天
```

### 数据字段
- `avatar.name` — 分身名称（如：小明）
- `avatar.target_name` — 聊天对象称呼（如：爷爷）
- `avatar.relationship` — 分身与聊天对象的关系（如：孙子）

### 消息角色（chat_messages.role）
| role | 含义 | 气泡位置 |
|------|------|---------|
| `user` | 聊天对象发送 | 右侧 |
| `ai` | AI 自动回复 | 左侧 |
| `creator` | 创建者手工介入 | 左侧（前端统一映射为 ai 视觉） |

### 聊天视角（两个入口）
| 入口 | 视角 | 标题 | 用户标签 | AI 标签 |
|------|------|------|----------|---------|
| 首页（配对者） | 爷爷同小明聊 | 同「小明」聊天 | 你 | 小明 |
| 我的分身→查看聊天 | 创建者查看 | 同「爷爷」聊天 | 爷爷 | 小明 |

## 环境变量（server/.env）

**必需**（缺失即启动失败）：
- `DATABASE_URL` — PostgreSQL 连接字符串
- `JWT_SECRET` — JWT 签名密钥（≥16 位，启动时强制校验）
- `DEEPSEEK_API_KEY` — DeepSeek API 密钥

**可选**：
- `CORS_ORIGINS` — 允许的前端域名（逗号分隔，空则允许全部）
- `PORT` — 服务端口（默认 3000）
- `HOST` — 监听地址（默认 0.0.0.0）

## 关键约定

### 安全约定（不可违反）
- **禁止**在代码中硬编码 JWT_SECRET 或 API Key 兜底默认值
- 所有密钥从 `server/src/config.ts` 统一导入
- SQL 必须使用参数化查询（`$1, $2`），禁止字符串拼接
- 敏感写接口必须挂载 `rateLimiter`
- `.env` 文件禁止提交到 git（已在 .gitignore 排除）

### 代码风格
- 不添加注释（除非用户要求）
- 遵循现有文件的风格和导入方式
- 移除未使用的导入（尤其是 shadows）
- 错误响应统一使用中文提示

### 移动端状态管理约定
- `useFocusEffect` 内的网络请求必须用 `reqId` 标志位防竞态
- 多个 AsyncStorage 写入必须用 `multiSet` 保证原子性
- 启动读取用 `multiGet` 一次性读取
- 表单提交必须有 `saving` 状态 + 按钮 `disabled` 防重入
- `useEffect` 异步操作必须有 `cancelled` 标志位，卸载时不 setState

### 服务端数据库约定
- 聊天消息写入必须用 `withTransaction` 保证原子性
- `avatar_memories` 的 `(avatar_id, key)` 是唯一约束，用 upsert
- `unknown_queries` 插入前检查是否已存在（去重）
- 高频查询路径必须有索引（chat_messages、preset_answers 等）

### 测试约定
- 测试文件放在 `server/src/__tests__/` 下，命名 `*.test.ts`
- 跑测试必须带环境变量：`JWT_SECRET="test-key" npx jest`
- 纯函数逻辑（如 isUncertainReply、配对码生成）优先补测试
- 涉及 DB 的测试用 mock，不要依赖真实数据库连接

### Android elevation 白色色块问题
**禁止**在以下组合中使用 `shadows.soft` 或 `shadows.card`：
- `overflow: 'hidden'` + 半透明背景 + `elevation`
- 会圆角处漏出白色色块
- 解决：移除 elevation，或改用纯不透明背景

### NavBar 组件
- `position: absolute` 浮动，不占布局空间
- 下方内容需 `paddingTop: 74` 避免重叠
- 背景 `colors.white48`（半透明），不要改成纯白

## 本地开发环境

### 数据库（Docker）
```bash
docker start xiaonuan-postgres   # 启动
docker exec xiaonuan-postgres pg_isready -U xiaonuan -d peipei  # 检查
```

### 完整启动流程
```bash
# 1. 启动 PostgreSQL
docker start xiaonuan-postgres

# 2. 启动服务端
cd server && ./deploy.sh build && ./deploy.sh start

# 3. 验证
curl http://localhost:3000/api/health

# 4. 启动移动端
cd mobile && npm start
```
