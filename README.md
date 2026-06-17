# Uni · 数字分身专属陪伴应用

> 创建一个 AI 分身，让它陪伴你最在乎的人。

**Uni**（原名「陪陪」）是一款基于 AI 的数字分身应用。创建者为家人（如老人）创建一个 AI 分身，分身就能自动陪聊，让陪伴无处不在。

---

## ✨ 核心功能

- 🤖 **AI 分身创建** — 定义角色人设、性格、语气，打造专属数字分身
- 💬 **智能陪聊** — 基于 DeepSeek 大模型，结合记忆和预设回答自然对话
- 🔗 **配对码分享** — 生成 6 位配对码，家人输入即可开始聊天
- 🧠 **记忆管理** — 为分身添加记忆，让对话更贴心
- 📝 **预设问答** — 常见问题预设回答，AI 优先使用
- ❓ **未知问题收集** — AI 不确定的问题自动记录，创建者可补充回答
- 👀 **创建者介入** — 创建者可以分身身份手工回复，纠正 AI

---

## 🏗 技术栈

| 层 | 技术 |
|----|------|
| **Mobile** | Expo SDK 55 · React Native 0.83 · React 19 · expo-router · TypeScript 5.9 |
| **Server** | Express 4 · Node.js · TypeScript · PostgreSQL · DeepSeek AI |
| **UI** | expo-blur（毛玻璃） · expo-linear-gradient · 自定义设计系统 |
| **存储** | AsyncStorage（移动端） · PostgreSQL（服务端） |

---

## 📁 项目结构

```
peipei/
├── mobile/                         # 📱 Expo React Native App
│   ├── app/                        # expo-router 页面
│   │   ├── _layout.tsx             # 根布局 · 渐变背景 · 启动路由
│   │   ├── index.tsx               # 首页（两个入口卡片）
│   │   ├── pairing.tsx             # 配对码输入
│   │   ├── creator-login.tsx       # 管理者登录/注册
│   │   ├── dashboard.tsx           # 分身管理面板
│   │   ├── avatar-setup.tsx        # 创建/编辑分身
│   │   ├── code-display.tsx        # 配对码展示
│   │   ├── chat/[avatarId].tsx     # 💬 聊天界面
│   │   ├── memories/[avatarId].tsx # 🧠 记忆管理
│   │   ├── preset-answers/[avatarId].tsx  # 📝 预设问答
│   │   └── unknown-queries/[avatarId].tsx # ❓ 未知问题
│   ├── lib/
│   │   ├── api.ts                  # API 封装 · Token 管理
│   │   ├── config.ts               # API 地址配置
│   │   ├── theme.ts                # 🎨 设计 Token
│   │   └── components/
│   │       └── NavBar.tsx          # 浮动导航栏组件
│   └── assets/                     # 图标 · 启动图
│
├── server/                         # 🖥 Express API Server
│   └── src/
│       ├── index.ts                # 入口 · 中间件挂载
│       ├── config.ts               # ⚙️ 环境变量校验 · 密钥管理
│       ├── db/
│       │   └── index.ts            # PostgreSQL 池 · 事务封装 · 建表
│       ├── middleware/
│       │   ├── auth.ts             # JWT 认证（创建者）
│       │   ├── chatAuth.ts         # 双模式认证（创建者/配对者）
│       │   └── rateLimiter.ts      # IP 限流中间件
│       ├── routes/
│       │   ├── auth.ts             # 注册/登录/me
│       │   ├── avatar.ts           # 分身 CRUD · 配对码
│       │   ├── chat.ts             # 消息收发 · 历史
│       │   ├── pairing.ts          # 配对码验证
│       │   ├── unknown.ts          # 未知问题管理
│       │   └── avatar-memories.ts  # 记忆 CRUD
│       ├── services/
│       │   ├── chat.ts             # AI 对话编排 · Prompt 构建
│       │   ├── deepseek.ts         # DeepSeek API 调用
│       │   └── push.ts             # 推送通知（预留）
│       └── __tests__/              # ✅ Jest 测试套件
│           ├── config.test.ts
│           ├── rateLimiter.test.ts
│           ├── avatar.pairing.test.ts
│           ├── chat.service.test.ts
│           └── db.transaction.test.ts
│
├── mockup/                         # 🎨 HTML 设计稿
│   └── index-modern.html           # 毛玻璃风格设计基准
│
├── .trae/
│   └── rules/project_rules.md      # 📋 项目开发规则
│
└── PLAN.md                         # 项目规划文档
```

---

## 🚀 快速开始

### 前置要求

- Node.js ≥ 18
- PostgreSQL ≥ 12
- Expo CLI（`npm install -g expo-cli`）
- DeepSeek API Key

### 1. 克隆并安装

```bash
git clone <repo-url>
cd peipei

# 安装服务端依赖
cd server && npm install

# 安装移动端依赖
cd ../mobile && npm install
```

### 2. 配置环境变量

```bash
# server/.env
DATABASE_URL=postgresql://user:password@localhost:5432/peipei
JWT_SECRET=your-super-secret-key-at-least-16-chars
DEEPSEEK_API_KEY=your-deepseek-api-key
CORS_ORIGINS=http://localhost:8081,https://yourdomain.com
PORT=3000
HOST=0.0.0.0
```

```bash
# mobile/.env
EXPO_PUBLIC_DEV_HOST=192.168.x.x    # 你的局域网 IP
EXPO_PUBLIC_DEV_PORT=3000
```

### 3. 启动数据库

确保 PostgreSQL 已运行，服务端启动时会自动创建表和索引。

### 4. 启动服务端

```bash
cd server
npm run dev    # 开发模式（热重载）
# 或
npm run build && npm start   # 生产模式
```

### 5. 启动移动端

```bash
cd mobile
npm start      # Expo 开发服务器
# 按 a 启动 Android，按 i 启动 iOS
```

---

## 🛠 开发命令

### Mobile（mobile/ 目录）

| 命令 | 说明 |
|------|------|
| `npm start` | 启动 Expo 开发服务器 |
| `npm run android` | 在 Android 设备上运行 |
| `npm run ios` | 在 iOS 设备上运行 |
| `npx tsc --noEmit` | TypeScript 类型检查 |

### Server（server/ 目录）

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发模式（tsx watch 热重载） |
| `npm run build` | 编译 TypeScript |
| `npm start` | 生产模式运行 |
| `npm test` | 运行 Jest 测试套件 |
| `npx tsc --noEmit` | TypeScript 类型检查 |

---

## 🌐 API 文档

服务端基础地址：`http://<host>:3000/api`

### 认证

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/auth/register` | 注册 | ❌ |
| POST | `/auth/login` | 登录 | ❌ |
| GET | `/auth/me` | 获取当前用户 | ✅ JWT |

### 分身管理

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/avatars` | 创建分身 | ✅ JWT |
| GET | `/avatars` | 获取我的分身列表 | ✅ JWT |
| GET | `/avatars/:id` | 获取分身详情 | ✅ JWT |
| PUT | `/avatars/:id` | 更新分身 | ✅ JWT |
| DELETE | `/avatars/:id` | 删除分身 | ✅ JWT |
| POST | `/avatars/:id/regenerate-code` | 重新生成配对码 | ✅ JWT |

### 配对

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/pairing/verify` | 验证配对码 | 限流 |
| GET | `/pairing/avatar/:id` | 获取分身基础信息 | 按 token |

### 聊天

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/chat/message` | 发送消息（触发 AI 回复） | JWT 或配对 token |
| GET | `/chat/history/:avatar_id` | 获取聊天历史 | JWT 或配对 token |
| POST | `/chat/creator-reply` | 创建者以分身身份回复 | ✅ JWT |

### 记忆 / 预设问答 / 未知问题

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST/PUT/DELETE | `/avatars/:id/memories` | 记忆 CRUD |
| GET/POST/DELETE | `/avatars/:id/preset-answers` | 预设问答 CRUD |
| GET | `/unknown-queries` | 未知问题列表 |
| POST | `/unknown-queries/:id/respond` | 回复未知问题 |

---

## 🎨 设计系统

设计 Token 定义在 [mobile/lib/theme.ts](mobile/lib/theme.ts)：

### 颜色

| Token | 色值 | 用途 |
|-------|------|------|
| `primary` | `#146d72` | 主色（按钮、强调） |
| `ink` | `#17262d` | 主文字 |
| `surface` | `rgba(255,255,255,0.66)` | 卡片背景 |
| `coral` | `#d77b55` | 辅助强调色 |
| `danger` | `#b95049` | 危险操作 |

### 渐变

```ts
background: ['#f0f9f4', '#f7f1e5', '#e2eef6']  // 页面背景
primary:    ['#146d72', '#477e80']              // 主按钮
bubble:     ['#146d72', '#2b8586']              // 聊天气泡
```

### 圆角

`pill: 999` · `xl: 32` · `lg: 26` · `md: 20` · `sm: 14`

---

## 🧩 核心产品逻辑

### 三类角色

```
创建者 (Creator)
  │  真人，登录管理面板，创建分身
  │
  ▼ 创建
AI 分身 (Avatar)
  │  数字人，自动陪聊，可被手工介入纠正
  │
  ▼ 配对码分享给
聊天对象 (Target)
  │  真人（如老人），输入配对码开始聊天
```

### 数据模型

| 字段 | 说明 | 示例 |
|------|------|------|
| `avatar.name` | 分身名称 | 小明 |
| `avatar.target_name` | 聊天对象称呼 | 爷爷 |
| `avatar.relationship` | 关系 | 孙子 |
| `avatar.persona` | 人设描述 | 阳光开朗的大学生 |
| `avatar.ai_tone` | AI 语气 | 温暖、耐心 |

### 聊天视角

应用有两个聊天入口，视角不同但数据一致：

| 入口 | 视角 | 导航标题 | 用户消息标签 | AI 消息标签 |
|------|------|----------|-------------|------------|
| 首页「开始聊天」 | 爷爷同小明聊 | 同「小明」聊天 | 你 | 小明 |
| 我的分身→查看聊天 | 创建者查看 | 同「爷爷」聊天 | 爷爷 | 小明 |

### 消息角色

| role | 含义 | 气泡位置 |
|------|------|---------|
| `user` | 聊天对象发送 | 右侧 |
| `ai` | AI 自动回复 | 左侧 |
| `creator` | 创建者手工介入 | 左侧（视觉同 AI） |

---

## ✅ 测试

### 运行测试

```bash
cd server
JWT_SECRET="test-secret-key" npx jest
```

### 测试覆盖

| 测试套件 | 用例数 | 覆盖范围 |
|---------|-------|---------|
| `config.test.ts` | 5 | JWT_SECRET 启动校验、CORS 解析 |
| `rateLimiter.test.ts` | 4 | 限流通过、超限 429、IP/路径隔离 |
| `avatar.pairing.test.ts` | 4 | 配对码格式、前导零、随机性 |
| `chat.service.test.ts` | 6 | 不确定回复检测、预设答案匹配 |
| `db.transaction.test.ts` | 2 | 事务 COMMIT/ROLLBACK |

---

## 🔒 安全特性

- ✅ JWT_SECRET 启动强制校验（缺失即终止）
- ✅ 配对码 `ON CONFLICT` 原子生成（无竞态）
- ✅ IDOR 防护（按 token 校验资源访问）
- ✅ CORS 白名单
- ✅ 接口限流（chat: 60s/20次，pairing: 60s/5次）
- ✅ 请求体大小限制（1MB）
- ✅ SQL 全部参数化（无注入风险）
- ✅ 聊天消息写入事务保护
- ✅ 密码 bcrypt 加密

---

## 📐 数据库设计

### 表结构

```
users              用户（创建者）
  ├─ avatars       AI 分身
  │   ├─ chat_messages      聊天消息
  │   ├─ preset_answers     预设问答
  │   ├─ unknown_queries    未知问题
  │   └─ avatar_memories     记忆（UNIQUE: avatar_id + key）
```

### 关键索引

```sql
idx_avatars_creator                      -- 创建者维度查询
idx_chat_messages_avatar_created         -- 聊天历史（高频）
idx_preset_answers_avatar                -- 预设匹配
idx_unknown_queries_avatar_answered      -- 未知问题列表
idx_avatar_memories_avatar_id_key (UNIQUE)  -- 记忆唯一约束
```

---

## 📝 开发约定

### 代码风格

- **不添加注释**（除非用户要求）
- 遵循现有文件的风格和导入方式
- 移除未使用的导入

### Android 兼容性

禁止在以下组合中使用 elevation 阴影：
- `overflow: 'hidden'` + 半透明背景 + `elevation`
- 会圆角处漏出白色色块

### NavBar 组件

- `position: absolute` 浮动，不占布局空间
- 下方内容需 `paddingTop: 74` 避免重叠

---

## 🔄 部署

### 服务端

```bash
cd server
npm run build
npm start
```

推荐使用 PM2 / Docker 管理进程，配合 Nginx 反向代理。

### 移动端

```bash
cd mobile
# Expo EAS Build
eas build --platform android
eas build --platform ios
```

### 环境变量清单

| 变量 | 必需 | 说明 |
|------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 连接字符串 |
| `JWT_SECRET` | ✅ | JWT 签名密钥（≥16 位） |
| `DEEPSEEK_API_KEY` | ✅ | DeepSeek API 密钥 |
| `CORS_ORIGINS` | ❌ | 允许的前端域名（逗号分隔） |
| `PORT` | ❌ | 服务端口（默认 3000） |
| `HOST` | ❌ | 监听地址（默认 0.0.0.0） |

---

## 📄 License

私有项目，保留所有权利。

---

<p align="center">
  <strong>Uni · 重要的人，有你陪伴</strong>
</p>
