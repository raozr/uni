# 应用启动记忆与聊天退出 - 任务清单

## Task 1: 启动自动跳转逻辑
**需求**: 启动身份记忆
**影响文件**: `mobile/app/_layout.tsx`

- [x] 1.1 在 `_layout.tsx` 的启动加载阶段，读取 `last_identity`、`auth_token`、`paired_avatar` 三个 AsyncStorage 键
- [x] 1.2 根据 `last_identity` 值决定初始路由：
  - `'creator'` 且 `auth_token` 存在 → `router.replace('/dashboard')`
  - `'chat'` 且 `paired_avatar` 存在 → 解析 avatarId 后 `router.replace('/chat/[avatarId]')`
  - 其他 → 保持默认首页
- [x] 1.3 测试验证：清除数据后首次打开显示首页

**验收标准**:
- 启动时根据记忆正确跳转到对应页面
- 无记忆数据时正常显示首页

---

## Task 2: Dashboard 记录管理者身份
**需求**: 启动身份记忆
**影响文件**: `mobile/app/dashboard.tsx`

- [x] 2.1 在 dashboard 的 `useEffect` 中，设置 `last_identity = 'creator'`
- [x] 2.2 在 dashboard 的退出登录处理中，清除 `last_identity`
- [x] 2.3 测试验证：从 dashboard 退出登录后，重新打开 APP 显示首页

**验收标准**:
- 进入 dashboard 后身份被正确记录
- 退出登录后身份记录被清除

---

## Task 3: 聊天页面记录聊天身份
**需求**: 启动身份记忆
**影响文件**: `mobile/app/chat/[avatarId].tsx`, `mobile/app/pairing.tsx`

- [x] 3.1 在 `chat/[avatarId].tsx` 的 `useEffect` 中（非创建者模式时），设置 `last_identity = 'chat'`
- [x] 3.2 在 `pairing.tsx` 配对成功后也设置 `last_identity = 'chat'`（确保配对跳转也记录身份）
- [x] 3.3 测试验证：配对进入聊天后，关闭重开 APP 直接进入聊天

**验收标准**:
- 通过配对码进入聊天后身份被记录
- 创建者查看聊天时不覆盖聊天身份记录

---

## Task 4: 聊天页面退出按钮
**需求**: 聊天页面退出功能
**影响文件**: `mobile/app/chat/[avatarId].tsx`

- [x] 4.1 在聊天页面添加"退出聊天"按钮（使用 Stack.Screen 的 headerLeft）
- [x] 4.2 点击时弹出确认弹窗，确认后清除 `paired_avatar`、`pairing_token`、`last_identity`，然后 `router.replace('/')`
- [x] 4.3 测试验证：退出后返回首页，再次打开 APP 显示首页而非聊天

**验收标准**:
- 退出按钮可见且易用
- 退出后所有配对相关数据被清除
- 退出后返回首页，不再自动跳转

---

## 任务依赖关系

```
Task 1 (启动跳转) ← 无依赖，可先行
Task 2 (dashboard 记录) ← 无依赖，可并行
Task 3 (聊天记录) ← 无依赖，可并行
Task 4 (退出按钮) ← 依赖 Task 3 完成（确保退出时清除正确）
```

**并行机会**:
- Task 1、2、3 可以并行
- Task 4 依赖 Task 3 的身份记录逻辑
