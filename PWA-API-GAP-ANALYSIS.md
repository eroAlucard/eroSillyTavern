# eroSillyTavern PWA — API 缺失分析报告

对比官方源码 `D:\Work\AI_Web\SillyTavern` 与当前 `pwa-shim.js`，列出前端实际调用但 PWA 未覆盖的 API。

## 🔴 高优先级缺失（影响核心功能）

| API 端点 | 前端调用位置 | 说明 | 建议处理 |
|----------|-------------|------|----------|
| `/api/modules` | extensions.js:745 | Extras API 模块列表，检查后端是否提供分类/字幕等扩展功能 | 返回 `{ modules: [] }` 空数组，表示无 Extras 后端 |

## 🟡 中优先级缺失（影响部分功能）

| API 端点 | 前端调用位置 | 说明 | 建议处理 |
|----------|-------------|------|----------|
| `/api/avatars/upload` | personas.js:370,403,2040 | 用户头像上传 | 返回空成功，PWA 模式下不支持文件系统写入 |
| `/api/avatars/delete` | personas.js:1170 | 用户头像删除 | 返回空成功 |
| `/api/characters/edit-avatar` | slash-commands.js:5158 | 编辑角色头像 | 返回空成功 |
| `/api/secrets/view` | secrets.js:309 | 查看密钥列表 | 返回 `{}` |
| `/api/secrets/delete` | secrets.js:390 | 删除密钥 | 返回 `{ result: 'ok' }` |
| `/api/secrets/settings` | secrets.js:291 | 密钥设置 | 返回 `{}` |
| `/api/secrets/rotate` | secrets.js:461 | 轮换密钥 | 返回 `{}` |
| `/api/secrets/rename` | secrets.js:486 | 重命名密钥 | 返回 `{}` |

## 🟢 低优先级缺失（功能受限但不崩溃）

| API 端点 | 前端调用位置 | 说明 |
|----------|-------------|------|
| `/api/image-metadata/all` | backgrounds.js:742 | 图片元数据查询 |
| `/api/image-metadata/folders/set-thumbnails` | backgrounds.js:793 | 设置文件夹缩略图 |
| `/api/image-metadata/folders/assign` | backgrounds.js:1044 | 分配图片到文件夹 |
| `/api/image-metadata/folders/unassign` | backgrounds.js:1044 | 取消分配 |
| `/api/image-metadata/folders/create` | backgrounds.js:1168 | 创建图片文件夹 |
| `/api/image-metadata/folders/update` | backgrounds.js:1197,1333 | 更新图片文件夹 |
| `/api/image-metadata/folders/delete` | backgrounds.js:1225 | 删除图片文件夹 |
| `/api/plugins/fandom/probe-mediawiki` | scrapers.js:260 | Fandom MediaWiki 探测 |
| `/api/plugins/fandom/scrape-mediawiki` | scrapers.js:301 | Fandom MediaWiki 抓取 |
| `/api/plugins/fandom/probe` | scrapers.js:353 | Fandom 探测 |
| `/api/plugins/fandom/scrape` | scrapers.js:408 | Fandom 抓取 |
| `/api/plugins/office/probe` | utils.js:2105 | Office 文档探测 |
| `/api/plugins/office/parse` | utils.js:2124 | Office 文档解析 |
| `/api/openrouter/credits` | secrets.js:1176 | OpenRouter 积分查询 |
| `/api/openrouter/models/providers` | textgen-models.js:385 | OpenRouter 模型提供商 |
| `/api/nanogpt/credits` | secrets.js:1242 | NanoGPT 积分查询 |
| `/api/nanogpt/models/providers` | textgen-models.js:433 | NanoGPT 模型提供商 |
| `/api/search/visit` | scrapers.js:193 | 访问搜索结果页面 |
| `/api/search/transcript` | scrapers.js:558 | 获取视频转录 |
| `/api/ping?extend=1` | user.js:906 | 扩展 ping（返回版本等额外信息） |
| `/api/settings/get-snapshots` | user.js:539 | 获取设置快照列表 |
| `/api/settings/load-snapshot` | user.js:511 | 加载设置快照 |
| `/api/settings/make-snapshot` | user.js:565 | 创建设置快照 |
| `/api/settings/restore-snapshot` | user.js:486 | 恢复设置快照 |
| `/api/sprites/get` | 精灵图管理 | 获取精灵图 |
| `/api/sprites/upload` | 精灵图管理 | 上传精灵图 |
| `/api/sprites/upload-zip` | 精灵图管理 | 上传 ZIP 精灵图 |
| `/api/sprites/delete` | 精灵图管理 | 删除精灵图 |
| `/api/backends/text-completions/ollama/download` | textgen-models.js:1231 | Ollama 模型下载 |
| `/api/backends/text-completions/tabby/download` | textgen-models.js:1301 | Tabby 模型下载 |
| `/api/backends/chat-completions/bias` | openai.js:3406 | Token 偏差设置 |
| `/api/users/recover-step1` | login.js:53 | 密码恢复步骤1 |
| `/api/users/recover-step2` | login.js:84 | 密码恢复步骤2 |
| `/api/users/change-password` | user.js:322 | 修改密码 |
| `/api/users/change-name` | user.js:449 | 修改用户名 |
| `/api/users/change-avatar` | user.js:764 | 修改用户头像 |
| `/api/users/backup` | user.js:258 | 用户数据备份 |
| `/api/users/reset-settings` | user.js:413 | 重置设置 |
| `/api/users/get` | user.js:85 | 获取用户列表 |
| `/api/users/enable` | user.js:108 | 启用用户 |
| `/api/users/disable` | user.js:128 | 禁用用户 |
| `/api/users/promote` | user.js:154 | 提升用户权限 |
| `/api/users/demote` | user.js:179 | 降低用户权限 |
| `/api/users/create` | user.js:230 | 创建用户 |
| `/api/users/delete` | user.js:376 | 删除用户 |
| `/api/users/slugify` | user.js:884 | Slugify 用户名 |
| `/api/users/reset-step1` | user.js:623 | 重置步骤1 |
| `/api/users/reset-step2` | user.js:655 | 重置步骤2 |

## ⚠️ 已有但实现不完整的 API

| API 端点 | 当前实现 | 问题 | 建议 |
|----------|----------|------|------|
| `/api/characters/edit` | 合并数据到 IndexedDB | 缺少 `edit-avatar` 子路径 | 添加 `/api/characters/edit-avatar` |
| `/api/secrets/read` | 从 IndexedDB 读取 | 缺少 `view`, `delete`, `settings`, `rotate`, `rename` | 补全 secrets 子路径 |
| `/api/chats/group/save` | 返回空 `{}` | 群组聊天保存需要实际写入 IndexedDB | 实现 IndexedDB 写入 |
| `/api/chats/group/get` | 返回空 `{}` | 群组聊天获取需要从 IndexedDB 读取 | 实现 IndexedDB 读取 |
| `/api/chats/group/import` | 返回空 `{}` | 群组聊天导入 | 实现 IndexedDB 写入 |
| `/api/chats/group/info` | 返回空 `{}` | 群组聊天信息 | 实现 IndexedDB 读取 |

## 📊 总结

- **已覆盖的 API 前缀**: 28 个（characters, chats, groups, settings, extensions, secrets, backgrounds, avatars, worldinfo, images, files, image-metadata, sprites, presets, themes, moving-ui, quick-replies, stats, assets, content, vector, translate, search, speech, backups, data-maid, tokenizers, AI 后端）
- **高优先级缺失**: 1 个（`/api/modules`）
- **中优先级缺失**: 8 个（主要是 avatars 和 secrets 子路径）
- **低优先级缺失**: 约 30 个（管理功能、插件、下载等）
- **实现不完整**: 6 个（群组聊天和 secrets 子路径）

### 建议修复顺序
1. **`/api/modules`** — 返回 `{ modules: [] }`，防止扩展系统报错
2. **`/api/characters/edit-avatar`** — 角色头像编辑
3. **群组聊天 API** (`group/save`, `group/get`, `group/import`, `group/info`) — 实现 IndexedDB 读写
4. **secrets 子路径** — 补全 `view`, `delete`, `settings`, `rotate`, `rename`
5. **avatars 子路径** — 补全 `upload`, `delete`
