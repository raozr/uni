# 应用启动记忆与聊天退出 - 验收清单

## 启动自动跳转
- [x] `_layout.tsx` 启动时读取 `last_identity` 并根据值跳转
- [x] `last_identity = 'creator'` + `auth_token` 存在时跳转到 `/dashboard`
- [x] `last_identity = 'chat'` + `paired_avatar` 存在时跳转到聊天页面
- [x] 无 `last_identity` 或数据不完整时显示首页
- [x] 跳转使用 `router.replace` 而非 `router.push`（避免返回按钮回到首页）

## Dashboard 身份记录
- [x] 进入 dashboard 时设置 `last_identity = 'creator'`
- [x] dashboard 退出登录时清除 `last_identity`
- [x] 从 dashboard 切换到聊天对象时不清除 `last_identity`（由聊天页面覆盖）

## 聊天身份记录
- [x] 通过配对码进入聊天时设置 `last_identity = 'chat'`
- [x] 聊天页面加载时（非创建者模式）设置 `last_identity = 'chat'`
- [x] 创建者模式查看聊天时不修改 `last_identity`

## 聊天退出功能
- [x] 聊天页面存在可见的"退出聊天"按钮
- [x] 点击退出按钮弹出确认弹窗
- [x] 确认后清除 `paired_avatar`
- [x] 确认后清除 `pairing_token`
- [x] 确认后清除 `last_identity`
- [x] 确认后使用 `router.replace('/')` 返回首页
- [x] 取消退出时保持在聊天页面

## 整体验收
- [ ] 首次使用场景：清除数据 → 打开 APP → 显示首页
- [ ] 管理者场景：打开 APP → 进入管理 → 关闭 → 再打开 → 自动进入管理
- [ ] 聊天场景：打开 APP → 配对 → 聊天 → 关闭 → 再打开 → 自动进入聊天
- [ ] 退出场景：聊天中退出 → 返回首页 → 关闭 → 再打开 → 显示首页
- [x] TypeScript 编译无错误
