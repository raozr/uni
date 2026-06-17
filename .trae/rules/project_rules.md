# Uni 项目规则

## 项目概述
**Uni**（原名「陪陪」）— 数字分身专属陪伴应用。创建者为家人（如老人）创建 AI 分身，分身自动陪聊。

## 技术栈
- **Mobile**: Expo SDK 55 / React Native 0.83 / React 19 / expo-router / TypeScript 5.9
- **Server**: Express 4 / Node.js / TypeScript / PostgreSQL / DeepSeek AI
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
npm start             # 生产模式
```

## 项目结构
```
peipei/
├── mobile/                # Expo React Native App
│   ├── app/               # expo-router 页面
│   │   ├── _layout.tsx    # 根布局，渐变背景
│   │   ├── index.tsx      # 首页（两个入口）
│   │   ├── pairing.tsx    # 配对码输入
│   │   ├── creator-login.tsx  # 管理者登录
│   │   ├── dashboard.tsx  # 分身管理面板
│   │   ├── avatar-setup.tsx   # 创建/编辑分身
│   │   ├── chat/[avatarId].tsx    # 聊天界面
│   │   ├── memories/[avatarId].tsx     # 记忆管理
│   │   ├── preset-answers/[avatarId].tsx  # 预设问答
│   │   └── unknown-queries/[avatarId].tsx # 未知问题
│   ├── lib/
│   │   ├── api.ts         # API 封装
│   │   ├── config.ts      # API 地址配置
│   │   ├── theme.ts       # 设计 Token（颜色/圆角/阴影/渐变）
│   │   └── components/NavBar.tsx  # 浮动导航栏组件
│   └── package.json
├── server/                # Express API Server
│   └── src/
│       ├── index.ts       # 入口
│       ├── db/            # PostgreSQL 初始化
│       ├── middleware/    # auth, chatAuth, rateLimiter
│       ├── routes/        # auth, avatar, chat, pairing, unknown
│       └── services/      # chat (AI), deepseek, push
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
- `avatar.target_name` — 聊对象称呼（如：爷爷）
- `avatar.relationship` — 分身与聊天对象的关系（如：孙子）

### 聊天视角（两个入口）
| 入口 | 视角 | 标题 | 用户标签 | AI 标签 |
|------|------|------|----------|---------|
| 首页（配对者） | 爷爷同小明聊 | 同「小明」聊天 | 你 | 小明 |
| 我的分身→查看聊天 | 创建者查看 | 同「爷爷」聊天 | 爷爷 | 小明 |

## 关键约定

### Android elevation 白色色块问题
**禁止**在以下组合中使用 `shadows.soft` 或 `shadows.card`：
- `overflow: 'hidden'` + 半透明背景 + `elevation`
- 会圆角处漏出白色色块
- 解决：移除 elevation，或改用纯不透明背景

### NavBar 组件
- `position: absolute` 浮动，不占布局空间
- 下方内容需 `paddingTop: 74` 避免重叠
- 背景 `colors.white48`（半透明），不要改成纯白

### 代码风格
- 不添加注释（除非用户要求）
- 遵循现有文件的风格和导入方式
- 移除未使用的导入（尤其是 shadows）
