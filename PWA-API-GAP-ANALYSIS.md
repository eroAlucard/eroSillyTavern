# eroSillyTavern PWA — API 缺失分析报告（更新）

对比官方源码 `D:\Work\AI_Web\SillyTavern` 与当前 `pwa-shim.js`，列出前端实际调用但 PWA 未覆盖的 API。

## ✅ 已实现的 API（最新状态 2026-09-20）

### 核心功能
| API 端点 | 状态 | 说明 |
|----------|------|------|
| `/api/settings/get` | ✅ 完整 | 返回 settings + DEFAULT_PRESETS（instruct/context/sysprompt/reasoning/themes/各种预设） |
| `/api/settings/save` | ✅ 完整 | 保存到 IndexedDB |
| `/api/modules` | ✅ 完整 | 返回 `{ modules: [] }` |
| `/api/extensions/discover` | ✅ 完整 | 返回 13 个内置扩展 |

### 角色管理
| API 端点 | 状态 | 说明 |
|----------|------|------|
| `/api/characters/all` | ✅ 完整 | IndexedDB 读取 |
| `/api/characters/create` | ✅ 完整 | IndexedDB 写入 |
| `/api/characters/edit` | ✅ 完整 | IndexedDB 更新 |
| `/api/characters/edit-attribute` | ✅ 完整 | 属性更新 |
| `/api/characters/merge-attributes` | ✅ 完整 | 属性合并 |
| `/api/characters/rename` | ✅ 完整 | 重命名 |
| `/api/characters/duplicate` | ✅ 完整 | 复制 |
| `/api/characters/delete` | ✅ 完整 | 删除 |
| `/api/characters/get` | ✅ 完整 | 获取单个角色 |
| `/api/characters/chats` | ✅ 完整 | 角色聊天列表 |
| `/api/characters/export` | ✅ 完整 | 导出 |
| `/api/characters/import` | ✅ 完整 | FormData 导入（含 PNG tEXt chunk 解析） |
| `/api/characters/edit-avatar` | ✅ 空实现 | 返回成功 |

### 聊天管理
| API 端点 | 状态 | 说明 |
|----------|------|------|
| `/api/chats/save` | ✅ 完整 | IndexedDB |
| `/api/chats/get` | ✅ 完整 | IndexedDB |
| `/api/chats/delete` | ✅ 完整 | IndexedDB |
| `/api/chats/rename` | ✅ 完整 | 重命名 |
| `/api/chats/export` | ✅ 完整 | 导出 |
| `/api/chats/import` | ✅ 完整 | 导入 |
| `/api/chats/recent` | ✅ 空实现 | 返回空数组 |
| `/api/chats/search` | ✅ 空实现 | 返回空数组 |
| `/api/chats/group/save` | ✅ 完整 | 群组聊天 |
| `/api/chats/group/get` | ✅ 完整 | 群组聊天 |
| `/api/chats/group/import` | ✅ 完整 | 群组导入 |
| `/api/chats/group/info` | ✅ 完整 | 群组信息 |
| `/api/chats/group/delete` | ✅ 完整 | 群组删除 |

### 群组管理
| API 端点 | 状态 | 说明 |
|----------|------|------|
| `/api/groups/all` | ✅ 完整 | IndexedDB |
| `/api/groups/create` | ✅ 完整 | IndexedDB |
| `/api/groups/edit` | ✅ 完整 | IndexedDB |
| `/api/groups/delete` | ✅ 完整 | IndexedDB |

### 世界信息（NEW）
| API 端点 | 状态 | 说明 |
|----------|------|------|
| `/api/worldinfo/list` | ✅ 完整 | IndexedDB WORLD_INFO store |
| `/api/worldinfo/get` | ✅ 完整 | 返回世界信息或 `{ entries: {} }` |
| `/api/worldinfo/edit` | ✅ 完整 | IndexedDB 保存 |
| `/api/worldinfo/delete` | ✅ 完整 | IndexedDB 删除 |
| `/api/worldinfo/import` | ✅ 完整 | 导入世界信息 |

### 文件管理（NEW）
| API 端点 | 状态 | 说明 |
|----------|------|------|
| `/api/files/sanitize-filename` | ✅ 完整 | 清理文件名 |
| `/api/files/upload` | ✅ 完整 | IndexedDB FILES store |
| `/api/files/delete` | ✅ 完整 | IndexedDB 删除 |
| `/api/files/verify` | ✅ 完整 | 验证文件存在 |

### 背景管理（NEW）
| API 端点 | 状态 | 说明 |
|----------|------|------|
| `/api/backgrounds/all` | ✅ 完整 | 硬编码 23 个默认背景 |
| `/api/backgrounds/folders` | ✅ 空实现 | 返回空数组 |
| `/api/backgrounds/upload` | ✅ 完整 | IndexedDB BACKGROUNDS store |
| `/api/backgrounds/delete` | ✅ 完整 | IndexedDB 删除 |
| `/api/backgrounds/rename` | ✅ 完整 | IndexedDB 重命名 |

### 头像管理（NEW）
| API 端点 | 状态 | 说明 |
|----------|------|------|
| `/api/avatars/get` | ✅ 完整 | IndexedDB AVATARS store |
| `/api/avatars/upload` | ✅ 完整 | IndexedDB 保存 |
| `/api/avatars/delete` | ✅ 完整 | IndexedDB 删除 |

### 密钥管理
| API 端点 | 状态 | 说明 |
|----------|------|------|
| `/api/secrets/read` | ✅ 完整 | IndexedDB |
| `/api/secrets/write` | ✅ 完整 | IndexedDB |
| `/api/secrets/find` | ✅ 完整 | IndexedDB |
| `/api/secrets/view` | ✅ 完整 | IndexedDB |
| `/api/secrets/delete` | ✅ 完整 | IndexedDB |
| `/api/secrets/settings` | ✅ 完整 | IndexedDB |
| `/api/secrets/rotate` | ✅ 完整 | IndexedDB |
| `/api/secrets/rename` | ✅ 完整 | IndexedDB |

### 预设/模板
| API 端点 | 状态 | 说明 |
|----------|------|------|
| `/api/presets/save` | ✅ 完整 | IndexedDB `pwa_presets_{apiId}` |
| `/api/presets/delete` | ✅ 完整 | IndexedDB 删除 |
| `/api/presets/restore` | ✅ 完整 | 从 DEFAULT_PRESETS 查找 |

### 主题/界面（NEW）
| API 端点 | 状态 | 说明 |
|----------|------|------|
| `/api/themes/save` | ✅ 完整 | IndexedDB `pwa_themes` |
| `/api/themes/delete` | ✅ 完整 | IndexedDB 删除 |
| `/api/moving-ui/save` | ✅ 完整 | IndexedDB `pwa_movingUIPresets` |
| `/api/quick-replies/save` | ✅ 完整 | IndexedDB `pwa_quickReplyPresets` |
| `/api/quick-replies/delete` | ✅ 完整 | IndexedDB 删除 |

### 统计（NEW）
| API 端点 | 状态 | 说明 |
|----------|------|------|
| `/api/stats/get` | ✅ 完整 | IndexedDB SETTINGS `stats` |
| `/api/stats/recreate` | ✅ 完整 | 重建统计 |
| `/api/stats/update` | ✅ 完整 | 更新统计 |

### 聊天备份（NEW）
| API 端点 | 状态 | 说明 |
|----------|------|------|
| `/api/backups/chat/get` | ✅ 完整 | IndexedDB BACKUPS store |
| `/api/backups/chat/download` | ✅ 完整 | IndexedDB 读取 |
| `/api/backups/chat/delete` | ✅ 完整 | IndexedDB 删除 |

### 图片画廊（NEW）
| API 端点 | 状态 | 说明 |
|----------|------|------|
| `/api/images/list` | ✅ 完整 | IndexedDB IMAGES store |
| `/api/images/folders` | ✅ 空实现 | 返回空数组 |
| `/api/images/upload` | ✅ 完整 | IndexedDB 保存 |
| `/api/images/delete` | ✅ 完整 | IndexedDB 删除 |

### 图片元数据/精灵图/资产（NEW）
| API 端点 | 状态 | 说明 |
|----------|------|------|
| `/api/image-metadata/all` | ✅ 空实现 | 返回空数组 |
| `/api/image-metadata/folders/*` | ✅ 空实现 | 返回空数组 |
| `/api/sprites/get` | ✅ 空实现 | 返回空数组 |
| `/api/sprites/upload` | ✅ 空实现 | 返回空成功 |
| `/api/sprites/delete` | ✅ 空实现 | 返回空成功 |
| `/api/assets/get` | ✅ 空实现 | 返回空数组 |
| `/api/assets/download` | ✅ 空实现 | 返回空对象 |
| `/api/assets/delete` | ✅ 空实现 | 返回空成功 |

### 扩展管理（NEW）
| API 端点 | 状态 | 说明 |
|----------|------|------|
| `/api/extensions/install` | ✅ 限制 | 返回错误提示（PWA 不支持安装扩展） |
| `/api/extensions/update` | ✅ 空实现 | 返回空成功 |
| `/api/extensions/branches` | ✅ 空实现 | 返回空数组 |
| `/api/extensions/switch` | ✅ 空实现 | 返回空成功 |
| `/api/extensions/move` | ✅ 空实现 | 返回空成功 |
| `/api/extensions/version` | ✅ 空实现 | 返回空成功 |
| `/api/extensions/delete` | ✅ 空实现 | 返回空成功 |

### 其他
| API 端点 | 状态 | 说明 |
|----------|------|------|
| `/api/content/importURL` | ✅ 限制 | 返回 400 错误（PWA 不支持 URL 导入） |
| `/api/content/importUUID` | ✅ 限制 | 返回 400 错误（PWA 不支持 UUID 导入） |
| `/api/classify/*` | ✅ 空实现 | 返回空对象 |
| `/api/caption/*` | ✅ 空实现 | 返回空对象 |
| `/api/data-maid/report` | ✅ 空实现 | 返回 `{ entries: [] }` |
| `/api/data-maid/finalize` | ✅ 空实现 | 返回空成功 |
| `/api/data-maid/view` | ✅ 空实现 | 返回空字符串 |
| `/api/data-maid/delete` | ✅ 空实现 | 返回空成功 |
| `/api/tokenizers/*/encode` | ✅ 模拟 | 返回 `{ tokens: [], token_count: 0 }` |
| `/api/tokenizers/*/decode` | ✅ 模拟 | 返回 `{ text: '' }` |
| `/api/tokenizers/*/count` | ✅ 模拟 | 返回 `{ token_count: 0 }` |

### AI 后端（放行）
| API 端点 | 状态 | 说明 |
|----------|------|------|
| `/api/openai/*` | 🔄 放行 | 返回 null，请求继续到原始 fetch |
| `/api/novelai/*` | 🔄 放行 | 同上 |
| `/api/google/*` | 🔄 放行 | 同上 |
| `/api/anthropic/*` | 🔄 放行 | 同上 |
| `/api/azure/*` | 🔄 放行 | 同上 |
| `/api/volcengine/*` | 🔄 放行 | 同上 |
| `/api/minimax/*` | 🔄 放行 | 同上 |
| `/api/sd/*` | 🔄 放行 | 同上 |
| `/api/openrouter/*` | 🔄 放行 | 同上 |
| `/api/nanogpt/*` | 🔄 放行 | 同上 |
| `/api/horde/*` | 🔄 放行 | 同上 |
| `/api/backends/*` | 🔄 放行 | 同上 |

## 🟡 仍依赖外部服务（PWA 不可能实现）

| API 端点 | 说明 |
|----------|------|
| `/api/translate/*` | 翻译服务（Libre/Google/Yandex/DeepL/Bing 等），需要外部 API |
| `/api/search/*` | 网络搜索（SerpAPI/SearXNG/Tavily 等），需要外部 API |
| `/api/speech/*` | 语音识别/合成，需要外部 API |
| `/api/vector/*` | 向量检索，需要嵌入模型 |
| `/api/users/*` | 用户管理系统，需要后端认证 |

## 📊 统计

- **已完整实现**：~65 个 API 端点
- **空实现/限制**：~25 个 API 端点
- **放行到 AI 后端**：~12 个 API 前缀
- **不可能实现**：~30 个 API 端点（依赖外部服务）
