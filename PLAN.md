# CareChat — 产品规格书 v6（MVP 演示版）

## 摘要

一款基于 **React Native + Expo** 的通用陪伴聊天 App。**照护者（管理端）** 创建 AI 数字分身、语音录入关怀记忆、生成 6 位 PIN 码交给**使用者（聊天端）**。使用者输入 PIN 码后语音聊天，AI 以照护者口吻自然回复并穿插记忆，聊天内容自动沉淀为记忆。全程只需一个 Supabase 项目 + Expo Go 扫码即可演示，**零服务器部署**。

---

## 极简架构

```
┌──────────────────────────────────────────┐
│     React Native + Expo (Expo Go)        │
│                                          │
│  supabase-js ────── DB查询 + Auth        │
│  Edge Functions ─── DeepSeek 调用        │
│  expo-speech-recognition ─ 设备端语音转写 │
│  expo-av ────────────── 设备端录音       │
│  AsyncStorage ───────── PIN码本地存储     │
│  expo-secure-store ──── Session持久化    │
└──────────────────┬───────────────────────┘
                   │ HTTPS
                   ▼
┌──────────────────────────────────────────┐
│            Supabase (免费层)              │
│                                          │
│  PostgreSQL ───── 全部数据               │
│  Auth ─────────── 管理端登录             │
│  Edge Functions ─ 3 个 DeepSeek 端点     │
│  RLS ──────────── 行级安全               │
│  Realtime ─────── (预留)                 │
└──────────────────────────────────────────┘
```

### 零部署演示步骤

```
1. supabase init → 跑 migrations → 部署3个Edge Functions
2. 配置 DeepSeek API Key 到 Supabase secret
3. npm install → npx expo start → 扫码
4. 完成
```

无独立服务器、无 Docker、无 CI/CD。Expo Go 直接运行，无需 EAS Build。

---

## 双端角色

### 管理端（照护者）
- Supabase Auth 账号+密码注册/登录
- 五个 Tab：**我的档案 · 关怀记忆 · 快捷回复 · PIN码管理 · 消息中心**

### 使用端（被照护者）
- 无需注册/登录
- 打开 App → 输入 6 位 PIN → 聊天
- 按住说话 → 语音转文字 → 看 AI 回复

---

## 路由 (expo-router)

```
app/
├── (auth)/
│   ├── login.tsx
│   └── register.tsx
├── (tabs)/                  # 管理端
│   ├── profile.tsx
│   ├── memories.tsx
│   ├── quick-replies.tsx
│   ├── pin-codes.tsx
│   └── inbox.tsx
├── chat/                    # 使用端
│   ├── pin-entry.tsx
│   └── conversation.tsx
└── _layout.tsx
```

---

## 数据流设计

### 管理端 → 数据读写
管理端登录后获得 Supabase session，`supabase-js` 客户端直接操作数据库，受 RLS 保护（只能访问自己的 profile、memories 等）。

```
管理端 App
    │ supabase-js (authenticated)
    ├── .from('profiles').select/upsert
    ├── .from('care_memories').select/insert/update/delete
    ├── .from('quick_replies').select/insert/update/delete
    ├── .from('pin_codes').select/insert/update/delete
    ├── .from('conversations').select
    ├── .from('messages').select
    └── .from('flagged_messages_view').select
```

### 使用端 → 聊天
使用端无账号，通过 Edge Function 验证 PIN 并调用 DeepSeek。`supabase-js` 以 anon key 调用（无需登录）。

```
使用端 App
    │
    ├── .rpc('verify_pin', { code })  ← Postgres Function（无鉴权）
    │       返回: { valid, pin_code_id, profile_id, conversation_id }
    │
    └── .functions.invoke('chat', { body })  ← Edge Function（无鉴权）
            输入: { conversation_id, message }
            输出: { reply, is_flagged }
```

---

## Supabase Edge Functions（3 个）

### 1. `chat` — 聊天回复
```
POST /functions/v1/chat
Body: { conversation_id, message }

流程:
  1. 查询 conversation → pin_code → profile
  2. 加载 profile.memory_context + quick_replies + persona_prompt
  3. 快捷回复匹配（命中则跳过 DeepSeek）
  4. DeepSeek chat → 回复
  5. 存储 user message + assistant reply 到 messages 表
  6. 返回 { reply, is_flagged }
```

### 2. `distill-memories` — 手动记忆提炼
```
POST /functions/v1/distill-memories
Header: Authorization: Bearer <jwt>  （管理端鉴权）
Body: { transcript }

流程:
  1. JWT 验证 → user_id
  2. DeepSeek 提炼 → [{ category, content }]
  3. 返回卡片列表（不写库，由前端确认后通过 supabase-js 写入）
```

### 3. `extract-memories` — 对话记忆提取
```
POST /functions/v1/extract-memories
Body: { conversation_id }

流程:
  1. 查 conversation → pin_code → profile
  2. 判断 last_extracted_at 之后新增消息 ≥ 10 条？
     否 → 返回 { extracted: 0 }
  3. 拼接本轮对话全文 + 已有记忆（去重用）
  4. DeepSeek 提炼 → [{ category, content }]
  5. 写入 care_memories（source='auto'）
  6. 重生成 profile.memory_context
  7. 更新 conversation.last_extracted_at
  8. 返回 { extracted: N }
```

---

## Postgres Functions

### `verify_pin(code text)`
```sql
CREATE OR REPLACE FUNCTION verify_pin(code text)
RETURNS json AS $$
  -- 查询 pin_codes 匹配项
  -- 有效 → 查找或创建 conversation，返回 { valid: true, pin_code_id, profile_id, conversation_id }
  -- 无效 → 返回 { valid: false }
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
无鉴权可调用，通过 RPC 暴露。

---

## 数据模型（Supabase PostgreSQL）

### `users` — 由 Supabase Auth 管理
`auth.users` 自带，无需额外建表。通过 `auth.uid()` 关联。

### `profiles`
| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid PK (DEFAULT gen_random_uuid()) | |
| user_id | uuid FK → auth.users | UNIQUE，RLS 依此过滤 |
| persona_prompt | text | 数字分身人设 |
| memory_context | text | 全量记忆拼接缓存 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `care_memories`
| 字段 | 类型 |
|---|---|
| id | uuid PK |
| profile_id | uuid FK → profiles |
| source | enum('manual','auto') |
| category | enum('person','story','note') |
| content | text |
| source_transcript | text nullable |
| conversation_id | uuid FK nullable → conversations |
| created_at | timestamptz |
| updated_at | timestamptz |

### `quick_replies`
| 字段 | 类型 |
|---|---|
| id | uuid PK |
| profile_id | uuid FK → profiles |
| trigger_keywords | text[] |
| response | text |
| created_at | timestamptz |
| updated_at | timestamptz |

### `pin_codes`
| 字段 | 类型 |
|---|---|
| id | uuid PK |
| profile_id | uuid FK → profiles |
| code | char(6) UNIQUE |
| label | text |
| is_active | boolean DEFAULT TRUE |
| created_at | timestamptz |

### `conversations`
| 字段 | 类型 |
|---|---|
| id | uuid PK |
| pin_code_id | uuid FK → pin_codes |
| last_extracted_at | timestamptz nullable |
| created_at | timestamptz |

### `messages`
| 字段 | 类型 |
|---|---|
| id | uuid PK |
| conversation_id | uuid FK → conversations |
| role | enum('user','assistant') |
| content | text |
| is_flagged | boolean DEFAULT FALSE |
| created_at | timestamptz |

### RLS 策略要点
- `profiles`、`care_memories`、`quick_replies`、`pin_codes`：`user_id = auth.uid()` 或通过 profile 关联
- `conversations`、`messages`：通过 pin_code → profile → user_id 链路鉴权
- `verify_pin`：SECURITY DEFINER，无需 RLS

---

## 关键依赖

| 分类 | 包 | 用途 |
|---|---|---|
| 前端 | `@supabase/supabase-js` | 客户端：Auth + DB + Functions |
| 前端 | `expo-router` | 导航 |
| 前端 | `expo-speech-recognition` | 语音转文字 |
| 前端 | `expo-av` | 录音 |
| 前端 | `@react-native-async-storage/async-storage` | PIN 码持久化 |
| 前端 | `expo-secure-store` | Session 安全存储 |
| Edge Fn | `@supabase/supabase-js` | 服务端 Supabase 客户端 |
| Edge Fn | `openai` (DeepSeek 兼容) | DeepSeek API 调用 |

---

## 项目结构

```
carechat/
├── app/                         # expo-router 页面
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── profile.tsx
│   │   ├── memories.tsx
│   │   ├── quick-replies.tsx
│   │   ├── pin-codes.tsx
│   │   └── inbox.tsx
│   ├── chat/
│   │   ├── pin-entry.tsx
│   │   └── conversation.tsx
│   └── _layout.tsx
├── components/
│   ├── VoiceButton.tsx
│   ├── PinKeyboard.tsx
│   ├── MemoryCard.tsx
│   └── ChatBubble.tsx
├── lib/
│   ├── supabase.ts              # supabase-js 实例
│   └── storage.ts               # AsyncStorage + SecureStore
├── supabase/
│   ├── migrations/
│   │   └── 001_initial.sql      # 建表 + RLS + verify_pin 函数
│   └── functions/
│       ├── chat/
│       │   └── index.ts
│       ├── distill-memories/
│       │   └── index.ts
│       └── extract-memories/
│           └── index.ts
├── app.json
├── package.json
└── .env.example                 # EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
```

---

## MVP 演示 Checklist

```
□ supabase init → 跑 migration
□ 部署 3 个 Edge Function: supabase functions deploy
□ 设置 secret: supabase secrets set DEEPSEEK_API_KEY=sk-xxx
□ .env 填 SUPABASE_URL + ANON_KEY
□ npm install
□ npx expo start
□ 手机扫码 → 注册照护者账号
□ 录入档案 → 录入记忆 → 生成 PIN 码
□ 切到使用端（退出登录 / 另一台手机扫码）→ 输入 PIN → 开始聊天
```

---

## 假设

- Expo Go 运行，无需 EAS Build
- `expo-speech-recognition` 覆盖 iOS 14+ / Android 5+
- Supabase 免费层：500MB DB、2M Edge Function 调用/月，MVP 绰绰有余
- 手动记忆提炼录音上限 5 分钟
- 对话记忆提取阈值 10 条新消息
- DeepSeek API Key 仅存于 Supabase Secret，客户端不可见
- v1 不含：推送、图片、表情、多语言、字号调节
