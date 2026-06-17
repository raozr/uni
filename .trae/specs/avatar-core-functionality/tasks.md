# 陪陪核心功能实施任务清单

## Phase 1: 修复阻塞性问题（REQ-4, REQ-5, REQ-6, REQ-7）

### Task 1: 修复 DeepSeek 角色映射
**需求**: REQ-4  
**影响文件**: `server/src/services/deepseek.ts`

- [x] 1.1 修改角色映射逻辑，将 `creator` 角色独立处理（不映射为 `user`）
- [x] 1.2 在 DeepSeek API 调用中正确传递三种角色：`user`（聊天对象）、`assistant`（AI）、`creator`（创建者）
- [x] 1.3 测试验证：创建者发送的消息在历史记录中被正确标识，AI 能区分不同来源

**验收标准**: 
- 创建者手动回复的消息在历史中显示为独立角色
- AI 不会将创建者的回复与聊天对象的回复混淆

---

### Task 2: API 地址动态配置
**需求**: REQ-5  
**影响文件**: `mobile/lib/api.ts`, 新增 `mobile/lib/config.ts`

- [x] 2.1 创建 `mobile/lib/config.ts`，实现动态配置管理：
  ```typescript
  - 支持开发环境（localhost）和生产环境配置
  - 提供 getConfig() 函数获取当前配置
  - 支持运行时切换配置
  ```
- [x] 2.2 修改 `mobile/lib/api.ts`，使用 `config.ts` 提供的配置而非硬编码
- [x] 2.3 在应用启动时自动检测网络环境并选择合适的 API 地址
- [x] 2.4 测试验证：在不同网络环境下（WiFi、4G）应用能正确连接后端

**验收标准**:
- 应用在不同网络环境下无需修改代码即可连接后端
- 提供清晰的配置切换机制

---

### Task 3: 修复 avatarApi.getMine() 数据完整性
**需求**: REQ-6  
**影响文件**: `mobile/lib/api.ts`

- [x] 3.1 修改 `getMine()` 方法，正确返回服务端提供的 `preset_count` 和 `unanswered_count`
- [x] 3.2 确保类型定义与实际返回数据结构一致
- [x] 3.3 测试验证：仪表板正确显示每个分身的预设问答数和未回复问题数

**验收标准**:
- 仪表板中显示的数据与服务端一致
- 不再硬编码返回 0

---

### Task 4: 清理遗留代码
**需求**: REQ-7  
**影响文件**: 删除 `server/src/routes/profile.ts`

- [x] 4.1 删除 `server/src/routes/profile.ts` 文件
- [x] 4.2 确认 `server/src/index.ts` 中没有对该文件的引用
- [x] 4.3 确认应用启动和运行不受影响

**验收标准**:
- 无遗留的 profile 相关代码
- 应用正常运行

---

## Phase 2: 安全加固（REQ-3）

### Task 5: 聊天 API 认证保护
**需求**: REQ-3  
**影响文件**: `server/src/routes/chat.ts`, `server/src/middleware/auth.ts`

- [x] 5.1 为 `/api/chat/message` 添加认证中间件：
  ```
  - 接受两种认证方式：创建者 JWT token 或 配对码 token
  - 验证请求者有权访问该 avatar
  ```
- [x] 5.2 为 `/api/chat/history/:avatar_id` 添加相同的认证保护
- [x] 5.3 实现配对码 token 机制：
  ```
  - 配对成功后生成短期 token（如 24 小时有效期）
  - token 绑定 avatar_id，只能访问对应分身的聊天
  ```
- [x] 5.4 修改移动端，在配对成功后保存并使用 token
- [x] 5.5 测试验证：未认证请求返回 401，认证请求正常访问

**验收标准**:
- 未配对用户无法访问聊天历史
- 配对用户只能访问自己配对的聊天
- 创建者可以访问自己创建的所有分身聊天

---

### Task 6: 配对码暴力破解防护
**需求**: REQ-3  
**影响文件**: `server/src/routes/pairing.ts`

- [x] 6.1 实现速率限制中间件：
  ```
  - 同一 IP 在 1 分钟内最多 5 次配对码验证
  - 超过限制返回 429 Too Many Requests
  ```
- [x] 6.2 记录验证失败日志，用于监控异常行为
- [x] 6.3 测试验证：连续快速请求被正确限制

**验收标准**:
- 暴力破解成功率低于 1%
- 正常用户不受影响

---

## Phase 3: 记忆系统（REQ-1）

### Task 7: 记忆数据库设计
**需求**: REQ-1  
**影响文件**: `server/src/db/index.ts`

- [x] 7.1 创建 `avatar_memories` 表：
  ```sql
  id SERIAL PRIMARY KEY
  avatar_id INTEGER REFERENCES avatars(id) ON DELETE CASCADE
  key VARCHAR(100) NOT NULL      -- 记忆关键词
  content TEXT NOT NULL          -- 记忆内容
  source VARCHAR(20) NOT NULL    -- 'manual' 或 'auto'
  created_at TIMESTAMP DEFAULT NOW()
  updated_at TIMESTAMP DEFAULT NOW()
  ```
- [x] 7.2 添加索引：`(avatar_id, key)` 用于快速检索
- [x] 7.3 更新 `initializeDatabase()` 函数包含新表创建

**验收标准**:
- 表结构正确创建
- 级联删除正常工作（删除 avatar 时自动删除相关记忆）

---

### Task 8: 记忆管理 API
**需求**: REQ-1  
**影响文件**: 新增 `server/src/routes/avatar-memories.ts`, `server/src/index.ts`

- [x] 8.1 创建记忆管理路由，包含以下端点：
  ```
  GET    /api/avatars/:id/memories          - 获取分身的所有记忆
  POST   /api/avatars/:id/memories          - 手动添加记忆
  PUT    /api/avatars/:id/memories/:mid     - 编辑记忆
  DELETE /api/avatars/:id/memories/:mid     - 删除记忆
  ```
- [x] 8.2 所有端点需要创建者认证
- [x] 8.3 实现输入验证：key 和 content 必填，长度限制
- [x] 8.4 在 `server/src/index.ts` 中注册新路由
- [x] 8.5 测试验证：CRUD 操作正常工作，认证保护有效

**验收标准**:
- 创建者可以完整管理分身的记忆
- 未认证请求被拒绝

---

### Task 9: 记忆应用逻辑
**需求**: REQ-1  
**影响文件**: `server/src/services/chat.ts`

- [x] 9.1 修改 `buildSystemPrompt()` 函数：
  ```
  - 查询该 avatar 的所有记忆点
  - 将记忆点整合到系统提示词中
  - 指导 AI 在合适时引用记忆
  ```
- [x] 9.2 实现记忆检索优化：
  ```
  - 根据当前对话内容提取关键词
  - 优先检索相关记忆点
  - 避免在每次对话中加载所有记忆（性能考虑）
  ```
- [x] 9.3 测试验证：AI 回复中包含对相关记忆的引用

**验收标准**:
- AI 在至少 30% 的回复中引用相关记忆
- 记忆应用不影响对话流畅性

---

### Task 10: 自动记忆提取（可选，低优先级）
**需求**: REQ-1  
**影响文件**: `server/src/services/chat.ts`, `server/src/services/deepseek.ts`

- [ ] 10.1 在聊天消息处理流程中添加记忆提取步骤：
  ```
  - 在 AI 回复生成后，分析对话内容
  - 使用 DeepSeek 提取关键信息（人物、地点、偏好等）
  - 将提取结果保存为自动记忆点
  ```
- [ ] 10.2 实现记忆去重和更新：
  ```
  - 检查新记忆是否与已有记忆重复
  - 如果重复，更新现有记忆而非新增
  ```
- [ ] 10.3 测试验证：对话中的关键信息被自动提取并保存

**验收标准**:
- 系统能够自动提取对话中的关键信息
- 自动记忆的质量可接受（误提取率低于 20%）

**注意**: 此任务为可选项，如果实现复杂度过高可推迟到后续版本

---

### Task 11: 移动端记忆管理界面
**需求**: REQ-1  
**影响文件**: 新增 `mobile/app/avatar-memories/[avatarId].tsx`, `mobile/lib/api.ts`

- [x] 11.1 在 `mobile/lib/api.ts` 中添加记忆 API 客户端：
  ```typescript
  memoriesApi.get(avatarId)
  memoriesApi.add(avatarId, key, content)
  memoriesApi.update(avatarId, memoryId, key, content)
  memoriesApi.delete(avatarId, memoryId)
  ```
- [x] 11.2 创建记忆管理界面 `mobile/app/avatar-memories/[avatarId].tsx`：
  ```
  - 列表展示所有记忆点（按来源分类：手动/自动）
  - 添加新记忆的表单（key + content）
  - 编辑和删除操作
  ```
- [x] 11.3 在仪表板中添加"管理记忆"入口按钮
- [x] 11.4 测试验证：界面交互流畅，数据同步正确

**验收标准**:
- 创建者可以通过界面完整管理记忆
- 界面设计与现有风格一致

---

## Phase 4: 性格深度（REQ-2）

### Task 12: 结构化性格数据库设计
**需求**: REQ-2  
**影响文件**: `server/src/db/index.ts`

- [x] 12.1 扩展 `avatars` 表，添加结构化性格字段：
  ```sql
  -- 基础信息
  age INTEGER
  occupation VARCHAR(100)
  relationship VARCHAR(50)       -- 与对象的关系
  
  -- 性格特征
  personality_traits JSONB       -- {"extroversion": 7, "humor": 8, ...}
  
  -- 兴趣爱好
  interests JSONB                -- ["下棋", "旅游", ...]
  
  -- 对话偏好
  dialogue_preferences JSONB     -- {"reply_length": "short", "use_emoji": true, ...}
  ```
- [x] 12.2 提供数据迁移脚本，将现有 `persona` 字段的内容解析到新字段
- [x] 12.3 测试验证：新字段正确创建，旧数据成功迁移

**验收标准**:
- 表结构支持结构化性格描述
- 旧数据不丢失

---

### Task 13: 性格 API 扩展
**需求**: REQ-2  
**影响文件**: `server/src/routes/avatar.ts`

- [x] 13.1 修改创建和更新接口，支持新的性格字段：
  ```
  POST /api/avatars - 支持传入结构化性格
  PUT  /api/avatars/:id - 支持更新结构化性格
  ```
- [x] 13.2 保持向后兼容：仍然接受 `persona` 字段
- [x] 13.3 实现输入验证：JSONB 字段格式检查
- [x] 13.4 测试验证：创建和更新操作正常工作

**验收标准**:
- API 支持结构化和非结构化两种性格描述
- 输入验证有效

---

### Task 14: 性格应用到 AI 提示词
**需求**: REQ-2  
**影响文件**: `server/src/services/chat.ts`

- [x] 14.1 修改 `buildSystemPrompt()` 函数：
  ```
  - 读取结构化性格字段
  - 将性格特征转化为具体的 AI 行为指导
  - 例如：humor=8 -> "经常使用幽默和玩笑"
  ```
- [x] 14.2 实现性格到提示词的映射规则：
  ```
  - extroversion: 影响回复的活跃度和提问频率
  - humor: 影响幽默元素的使用
  - reply_length: 控制回复长度
  - use_emoji: 控制表情使用
  ```
- [x] 14.3 测试验证：不同性格设置产生明显不同的对话风格

**验收标准**:
- 性格设置能够显著影响 AI 的回复风格
- 对话风格差异明显且符合设置

---

### Task 15: 移动端结构化性格表单
**需求**: REQ-2  
**影响文件**: `mobile/app/avatar-setup.tsx`

- [x] 15.1 重新设计分身设置界面，添加结构化性格输入：
  ```
  - 基础信息区：年龄（滑块）、职业（输入）、关系（选择）
  - 性格特征区：多个滑块（外向程度、幽默感等）
  - 兴趣爱好区：标签输入
  - 对话偏好区：开关和选择器
  ```
- [x] 15.2 保持向后兼容：仍然支持简单的 `persona` 文本输入
- [x] 15.3 提供"高级设置"折叠面板，默认隐藏结构化选项
- [x] 15.4 测试验证：表单交互流畅，数据正确保存

**验收标准**:
- 界面直观易用
- 结构化设置能够正确保存和加载

---

## 任务依赖关系

```
Phase 1 (Task 1-4) - 无依赖，可并行
    ↓
Phase 2 (Task 5-6) - 依赖 Phase 1 完成
    ↓
Phase 3 (Task 7-11) - 依赖 Phase 2 完成
    - Task 7 (数据库) -> Task 8 (API) -> Task 9 (应用逻辑)
    - Task 11 (移动端) 依赖 Task 8 完成
    - Task 10 (自动提取) 依赖 Task 9 完成
    ↓
Phase 4 (Task 12-15) - 依赖 Phase 3 完成
    - Task 12 (数据库) -> Task 13 (API) -> Task 14 (应用)
    - Task 15 (移动端) 依赖 Task 13 完成
```

**并行机会**:
- Phase 1 的所有任务可以并行
- Phase 3 中 Task 11（移动端）可以在 Task 8 完成后立即开始，与 Task 9 并行
- Phase 4 中 Task 15（移动端）可以在 Task 13 完成后立即开始，与 Task 14 并行

## 时间估算

- **Phase 1**: 1-2 天（4 个任务，简单修复）
- **Phase 2**: 2-3 天（2 个任务，中等复杂度）
- **Phase 3**: 3-4 天（5 个任务，复杂功能）
- **Phase 4**: 2-3 天（4 个任务，中等复杂度）

**总计**: 8-12 天

## 风险和注意事项

1. **记忆系统性能**: 如果记忆点过多，每次对话都加载所有记忆可能影响性能。需要实现智能检索，只加载相关记忆。

2. **自动记忆提取质量**: 使用 AI 提取记忆可能产生误提取，需要人工审核机制或置信度阈值。

3. **性格映射复杂度**: 将抽象的性格特征转化为具体的 AI 行为需要大量测试和调优。

4. **向后兼容性**: 性格结构化后需要保持对旧的 `persona` 文本字段的支持，避免破坏现有数据。

5. **移动端体验**: 结构化性格表单可能过于复杂，需要良好的 UI 设计避免用户困惑。

## 验收测试清单

- [ ] 所有 Phase 1 任务完成并通过验收
- [ ] 安全测试：未认证用户无法访问聊天历史
- [ ] 安全测试：配对码暴力破解被有效阻止
- [ ] 功能测试：记忆系统正常工作，AI 能够引用记忆
- [ ] 功能测试：不同性格设置产生明显的对话风格差异
- [ ] 性能测试：记忆检索不影响对话响应速度（< 3秒）
- [ ] 兼容性测试：旧数据正常迁移，无数据丢失
- [ ] 移动端测试：所有新界面在 iOS 和 Android 上正常工作
