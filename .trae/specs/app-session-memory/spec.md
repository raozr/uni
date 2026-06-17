# 应用启动记忆与聊天退出功能 Spec

## Why
当前每次打开 APP 都停留在首页（身份选择页），用户需要重复点击进入对应的功能页面。同时聊天页面缺少便捷的退出入口。

## What Changes
- 新增启动记忆：根据上次使用的身份自动跳转到对应页面
- 聊天页面新增"退出聊天"按钮，可回到首页并清除配对

## Impact
- Affected code: `mobile/app/_layout.tsx`, `mobile/app/index.tsx`, `mobile/app/dashboard.tsx`, `mobile/app/chat/[avatarId].tsx`, `mobile/app/pairing.tsx`

## ADDED Requirements

### Requirement: 启动身份记忆
系统 SHALL 在用户切换身份时记录最后使用的身份，下次启动 APP 时自动跳转到对应页面。

#### Scenario: 上次以管理者身份使用
- **WHEN** 用户上次在管理分身页面（dashboard）使用 APP，再次打开
- **THEN** 自动跳转到管理分身页面（dashboard），无需手动选择

#### Scenario: 上次以聊天对象身份使用
- **WHEN** 用户上次通过配对码进入聊天页面，再次打开 APP
- **THEN** 自动跳转到聊天页面，无需重新输入配对码

#### Scenario: 首次使用或清除所有状态
- **WHEN** 用户首次使用 APP 或清除了所有本地数据
- **THEN** 显示首页（身份选择页）

### Requirement: 聊天页面退出功能
系统 SHALL 在聊天页面提供"退出聊天"按钮，点击后清除配对信息并返回首页。

#### Scenario: 退出聊天
- **WHEN** 用户在聊天页面点击"退出聊天"按钮
- **THEN** 清除 `paired_avatar`、`pairing_token`、`last_identity`，返回到首页

## Implementation Notes

### AsyncStorage 键设计
- `last_identity`: 值为 `'creator'` 或 `'chat'`，记录上次使用的身份
- `auth_token`: 管理者登录 token（已有）
- `paired_avatar`: 配对信息（已有）
- `pairing_token`: 配对 token（已有）

### 启动逻辑流程
```
启动 → 检查 last_identity
  ├── 'creator' + auth_token 存在 → 跳转 /dashboard
  ├── 'chat' + paired_avatar 存在 → 跳转 /chat/[avatarId]
  └── 其他情况 → 显示首页 /
```

### 身份记录时机
- 进入 dashboard 时：设置 `last_identity = 'creator'`
- 进入聊天页面时：设置 `last_identity = 'chat'`
- 退出聊天时：清除 `last_identity`

### 聊天页面退出按钮
- 位置：聊天页面顶部导航栏或底部
- 行为：清除配对 → 返回首页
- 确认弹窗：防止误触
