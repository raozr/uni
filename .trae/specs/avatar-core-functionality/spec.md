# 陪陪核心功能规格说明

## 背景
陪陪是一个数字分身陪聊平台，允许创建者（Creator）创建多个 AI 分身（Avatar），每个分身拥有独特的性格、记忆和对话风格，通过配对码分发给不同的聊天对象（Target），实现个性化的 AI 陪伴对话。

## 当前状态
核心基础功能已实现：
- ✅ 用户注册/登录系统（JWT 认证）
- ✅ 分身 CRUD 管理（创建、读取、更新、删除、重新生成配对码）
- ✅ 6 位数字配对码系统
- ✅ AI 聊天功能（DeepSeek API 集成）
- ✅ 预设问答管理
- ✅ 未知问题追踪与回复
- ✅ 移动端完整界面（Expo 55 + expo-router）

## 需要改进的问题

### P0 - 阻塞性问题

#### 1. 安全问题
- **聊天 API 无认证保护**：`/api/chat/message` 和 `/api/chat/history/:avatar_id` 无需认证，任何知道 `avatar_id` 的人都能读取和发送消息
- **API 地址硬编码**：移动端 `lib/api.ts` 中 `API_BASE` 硬编码为 `http://192.168.4.166:3000/api`，换网络环境即失效

#### 2. 数据问题
- **DeepSeek 角色映射不完整**：`creator` 角色的消息被错误映射为 `user`，导致 AI 无法区分聊天者和创建者的历史消息
- **avatarApi.getMine() 数据丢失**：硬编码返回 `preset_count: 0, unanswered_count: 0`，丢弃服务端统计数据

### P1 - 重要改进

#### 3. 记忆系统（用户明确要求）
当前分身只有静态的 `persona` 描述，缺乏动态记忆能力。需要实现：
- **手动记忆点**：创建者可以为分身添加关键记忆（如"对方喜欢下棋"、"对方住在深圳"）
- **自动记忆提取**：从对话中自动提取和更新记忆点
- **记忆应用**：AI 在生成回复时参考记忆，保持对话连贯性

#### 4. 性格深度（用户明确要求）
当前 `persona` 字段过于简单，需要扩展为结构化的性格描述：
- **基础信息**：名字、年龄、职业、关系
- **性格特征**：外向/内向、幽默感、说话风格
- **兴趣爱好**：喜欢的话题、活动
- **对话偏好**：回复长度、是否使用表情、是否主动提问

### P2 - 体验优化

#### 5. 代码清理
- **遗留文件**：`server/src/routes/profile.ts` 引用不存在的 `profiles` 表，需要删除
- **推送通知桩代码**：`server/src/services/push.ts` 完全未实现，`notified` 字段始终为 `false`

#### 6. 性能与可用性
- **消息 ID 冲突风险**：聊天界面使用 `Date.now()` 生成消息 ID，快速连续操作可能重复
- **缺少聊天分页**：只加载最近 50 条消息，无法查看更早记录
- **配对码暴力破解**：6 位数字仅 90 万种组合，无速率限制

### P3 - 生产准备

#### 7. 配置管理
- JWT Secret 使用弱开发密钥
- 数据库连接、API Key 需要环境区分
- 需要 `.env.example` 模板和配置文档

#### 8. 测试覆盖
- 服务端和移动端均无任何测试文件
- 需要添加关键路径的单元测试和集成测试

## 变更内容

### 新增需求

#### REQ-1: 记忆系统
系统应当提供分身记忆管理能力，包括：
- 创建者可以手动添加/编辑/删除分身的记忆点
- 系统可以从对话历史中自动提取关键信息作为记忆点
- AI 在生成回复时应当参考相关记忆点，保持对话连贯性

**场景**: 
- 当创建者添加记忆"对方喜欢下棋"后，AI 在后续对话中可以主动提及下棋话题
- 当聊天对象说"我今天去了公园"，系统自动提取"喜欢去公园"作为记忆点

#### REQ-2: 结构化性格描述
系统应当提供分身的结构化性格描述，包括：
- 基础信息（名字、年龄、职业、与对象的关系）
- 性格特征（外向/内向程度、幽默感、说话风格）
- 兴趣爱好（喜欢的话题、活动）
- 对话偏好（回复长度、表情使用、主动提问频率）

**场景**:
- 当设置性格为"幽默、喜欢开玩笑"时，AI 回复会包含更多幽默元素
- 当设置"回复简短"时，AI 不会生成长篇大论

#### REQ-3: 安全加固
系统应当对敏感 API 添加认证保护：
- 聊天消息和历史记录接口需要验证配对码或创建者身份
- 配对码验证接口添加速率限制，防止暴力破解
- 所有 API 响应不应泄露敏感的内部 ID

**场景**:
- 未配对的用户无法访问聊天历史
- 同一 IP 在 1 分钟内只能尝试 5 次配对码验证

### 修改需求

#### REQ-4: DeepSeek 角色映射修复
当前 `creator` 角色消息被错误映射为 `user`，需要修正为独立的 `creator` 角色，使 AI 能够区分不同来源的消息。

**影响文件**: `server/src/services/deepseek.ts`

#### REQ-5: API 地址动态配置
移动端 API 地址应当支持动态配置，而非硬编码：
- 开发环境：`http://localhost:3000/api`
- 生产环境：通过环境变量或配置文件指定
- 支持在应用启动时动态检测网络环境

**影响文件**: `mobile/lib/api.ts`, 新增 `mobile/lib/config.ts`

#### REQ-6: avatarApi.getMine() 数据完整性
当前实现丢弃了服务端返回的统计数据，需要修复为正确返回 `preset_count` 和 `unanswered_count`。

**影响文件**: `mobile/lib/api.ts`

### 移除需求

#### REQ-7: 清理遗留代码
移除未使用的遗留文件 `server/src/routes/profile.ts`，该文件引用不存在的 `profiles` 表，容易造成混淆。

**原因**: 已被 `avatar.ts` 完全替代，保留只会增加维护成本
**迁移**: 无需迁移，直接删除

## 影响范围

### 受影响的能力
- **核心聊天能力**: REQ-1 (记忆系统), REQ-2 (性格深度), REQ-4 (角色映射)
- **安全性**: REQ-3 (安全加固)
- **可配置性**: REQ-5 (API 地址), REQ-7 (代码清理)
- **数据完整性**: REQ-6 (统计数据)

### 受影响的代码

#### 服务端
- `server/src/services/chat.ts` - 添加记忆检索和应用逻辑
- `server/src/services/deepseek.ts` - 修复角色映射
- `server/src/routes/chat.ts` - 添加认证中间件
- `server/src/routes/pairing.ts` - 添加速率限制
- `server/src/db/index.ts` - 新增 `avatar_memories` 表
- 新增 `server/src/routes/avatar-memories.ts` - 记忆管理路由
- 删除 `server/src/routes/profile.ts`

#### 移动端
- `mobile/lib/api.ts` - 修复 getMine()，添加记忆 API
- 新增 `mobile/lib/config.ts` - 动态配置管理
- `mobile/app/avatar-setup.tsx` - 扩展为结构化性格表单
- 新增 `mobile/app/avatar-memories/[avatarId].tsx` - 记忆管理界面

#### 数据库
- 新增 `avatar_memories` 表：
  ```sql
  id SERIAL PRIMARY KEY
  avatar_id INTEGER REFERENCES avatars(id) ON DELETE CASCADE
  key VARCHAR(100) NOT NULL  -- 记忆关键词
  content TEXT NOT NULL      -- 记忆内容
  source VARCHAR(20)         -- 'manual' 或 'auto'
  created_at TIMESTAMP DEFAULT NOW()
  updated_at TIMESTAMP DEFAULT NOW()
  ```

## 验收标准

1. **记忆系统**: 创建者添加的记忆点能够影响 AI 回复内容，AI 回复中至少 30% 的情况下会引用相关记忆
2. **性格深度**: 不同性格设置的分身表现出明显的对话风格差异
3. **安全加固**: 未认证用户无法访问聊天历史，配对码暴力破解成功率低于 1%
4. **角色映射**: AI 能够正确区分用户、AI、创建者三种消息来源
5. **API 配置**: 应用在不同网络环境下能够正确连接后端
6. **代码清理**: 无遗留文件，无未使用的桩代码

## 实施优先级

1. **Phase 1**: 修复阻塞性问题（REQ-4, REQ-5, REQ-6, REQ-7）- 1-2 天
2. **Phase 2**: 安全加固（REQ-3）- 2-3 天
3. **Phase 3**: 记忆系统（REQ-1）- 3-4 天
4. **Phase 4**: 性格深度（REQ-2）- 2-3 天

总计：8-12 天

## 技术债务

以下问题暂时不处理，但需要在后续版本中解决：
- 数据库迁移机制（当前使用 CREATE TABLE IF NOT EXISTS）
- 推送通知集成（TPNS 或其他服务）
- 聊天分页和无限滚动
- 完整的测试覆盖
- 生产环境配置管理
