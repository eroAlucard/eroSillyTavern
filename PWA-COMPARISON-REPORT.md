# eroSillyTavern PWA 与官方源码对比检查报告

**检查日期**: 2026-09-20
**对比源**: `D:\Work\AI_Web\SillyTavern\public\` vs `D:\Work\AI_Web\eroSillyTavern\dist\`

---

## 1. 静态资源完整性 ✅

| 目录 | 状态 | 说明 |
|------|------|------|
| `scripts/` | ✅ 完全一致 | 77 个 JS 文件/目录 |
| `scripts/extensions/` | ✅ 完全一致 | 15 个扩展目录 + shared.js |
| `scripts/templates/` | ✅ 完全一致 | 57 个 HTML 模板 |
| `scripts/macros/` | ✅ 完全一致 | definitions/ + engine/ + macro-system.js |
| `scripts/slash-commands/` | ✅ 完全一致 | 26 个 JS 文件 |
| `scripts/autocomplete/` | ✅ 完全一致 | 11 个 JS 文件 |
| `scripts/util/` | ✅ 完全一致 | 7 个 JS 文件 |
| `css/` | ✅ 一致 | 37 个文件（dist 多了 user.css 占位文件，正常） |
| `lib/` | ✅ 完全一致 | 24 个文件 |
| `img/` | ✅ 完全一致 | 66 个文件/目录 |
| `img/default-expressions/` | ✅ 完全一致 | 30 个表情 PNG |
| `sounds/` | ✅ 完全一致 | 2 个 MP3 |
| `locales/` | ✅ 完全一致 | 18 个 JSON |
| `webfonts/` | ✅ 存在 | NotoSans + NotoSansMono + Font Awesome |
| `style.css` | ✅ 存在 | |
| `index.html` | ✅ 存在 | 引用的 JS/CSS 均存在 |
| `login.html` | ✅ 存在 | |
| `manifest.json` | ✅ 存在 | |
| `favicon.ico` | ✅ 存在 | |
| `backgrounds/` | ✅ PWA 新增 | 23 个默认背景图片 |

**结论**: 所有前端静态资源与官方源码完全一致，无遗漏。

---

## 2. API 路由覆盖情况

### 2.1 已正确实现的 API ✅

核心功能 API 均已实现（65+ 端点），包括：
- 人物卡 CRUD（characters/all/get/create/edit/delete/duplicate/import/export/rename/merge-attributes/edit-avatar/edit-attribute）
- 聊天 CRUD（chats/get/save/delete/recent/rename/search/import/export）
- 群组聊天（groups/all/create/edit/delete + chats/group/*）
- 设置（settings/get/save）
- 预设（presets/save/delete/restore）
- 密钥（secrets/view/write/delete/find/read/rotate/rename/settings）
- 扩展发现（extensions/discover）
- 背景（backgrounds/all/upload/delete/rename/folders）
- 头像（avatars/get/upload/delete）
- World Info（worldinfo/list/get/edit/delete/import）
- 文件（files/sanitize-filename/upload/delete/verify）
- 统计（stats/get/recreate/update）
- 主题（themes/save/delete）
- 备份（backups/chat/get/download/delete）
- 图片（images/list/upload/delete/folders）

### 2.2 通配符匹配覆盖的 API ⚠️

以下 API 被 `startsWith` 通配符匹配，返回空/默认值，功能受限但不崩溃：

| API 路径 | 匹配方式 | 返回值 | 影响 |
|----------|----------|--------|------|
| `/api/settings/*` (get-snapshots 等) | `startsWith('/api/settings/')` | `{ result: 'ok' }` | 设置快照功能不可用 |
| `/api/tokenizers/*` | `startsWith('/api/tokenizers/')` | `{ tokens: [], token_count: 0 }` | Token 计数始终为 0 |
| `/api/classify/*` | `startsWith('/api/classify/')` | `{}` | 分类功能不可用 |
| `/api/caption/*` | `startsWith('/api/caption/')` | `{}` | 图片描述不可用 |
| `/api/users/*` | `startsWith('/api/users/')` | `{}` | 多用户功能不可用 |
| `/api/image-metadata/folders/*` | `startsWith` | `[]` | 图片文件夹管理不可用 |
| `/api/image-metadata/*` | `startsWith` | `[]` | 图片元数据不可用 |
| `/api/plugins/*` | `startsWith` | `{}` | 插件不可用 |
| `/api/vector/*` | `startsWith` | `[]` | 向量搜索不可用 |
| `/api/translate/*` | `startsWith` | `{}` | 翻译不可用 |
| `/api/search/*` | `startsWith` | `{}` | 搜索不可用 |
| `/api/speech/*` | `startsWith` | `{}` | TTS 不可用 |
| `/api/sd/*` | 放行 (null) | — | Stable Diffusion 请求发往外部 |
| `/api/backends/*` | 放行 (null) | — | AI 后端请求发往外部 |
| `/api/openai/*` 等 | 放行 (null) | — | AI API 请求发往外部 |

### 2.3 需要修复的高优先级 API 🔴

| API | 当前返回 | 应返回 | 影响 |
|-----|---------|--------|------|
| `/api/settings/get-snapshots` | `{ result: 'ok' }` | `[]` (空数组) | 前端 `getSnapshots()` 尝试对非数组 `.sort()` 会报错 |
| `/api/settings/load-snapshot` | `{ result: 'ok' }` | `{ settings: '{}' }` | 加载快照内容失败 |
| `/api/settings/make-snapshot` | `{ result: 'ok' }` | `{ result: 'ok' }` | ✅ 当前返回正确 |
| `/api/settings/restore-snapshot` | `{ result: 'ok' }` | `{ result: 'ok' }` | ✅ 当前返回正确 |
| `/api/summarize` | `{}` (兜底) | `{ text: '' }` | memory/vectors 扩展摘要功能报错 |

### 2.4 兜底匹配 ⚠️

`/api/` 开头但未匹配任何具体路由的请求，返回 `{ status: 200, data: {} }` 并打印控制台警告。
被兜底匹配的路径：`/api/extra/caption`, `/api/extra/classify`, `/api/extra/classify/labels`, `/api/image`, `/api/image/model`, `/api/image/models`, `/api/image/samplers` 等。

---

## 3. Service Worker 检查

### 3.1 缓存策略
- ✅ 缩略图拦截：`/thumbnail` 从 IndexedDB 读取头像数据
- ✅ API 请求：直接 fetch（pwa-shim.js 在 window 层拦截）
- ✅ HTML 页面：网络优先
- ✅ 静态资源：缓存优先

### 3.2 潜在问题
- ⚠️ `STATIC_ASSETS` 列表只有 6 个文件，离线体验依赖动态缓存
- ✅ `NEVER_CACHE_PATTERNS` 正确排除了 index.html/pwa-shim.js/script.js

---

## 4. 部署配置检查

### 4.1 wrangler.toml ✅
```toml
name = "ero-sillytavern-pwa"
compatibility_date = "2024-01-01"
[assets]
directory = "dist"
```
配置正确，无多余字段。

### 4.2 部署问题（从截图分析）
- 截图显示 CI 系统扫描了整个仓库目录（含 .git/），导致 118 MiB 的 pack 文件超出 25 MiB 限制
- **解决方案**: 确保通过 Cloudflare Dashboard 手动部署时只上传 dist/ 目录，或确保 CI 配置正确指向 dist/

---

## 5. 总结

### 无遗漏项 ✅
- 所有前端静态资源（JS/CSS/图片/字体/音效/国际化）与官方源码完全一致
- 核心 API 路由已全部实现
- pwa-shim.js (149,882 bytes) 和 dist/pwa-shim.js 已同步

### 需要修复的问题 🔴
1. **`/api/settings/get-snapshots`** — 应返回 `[]` 而非 `{ result: 'ok' }`，否则前端 `.sort()` 报错
2. **`/api/settings/load-snapshot`** — 应返回 `{ settings: '{}' }` 而非 `{ result: 'ok' }`
3. **`/api/summarize`** — 应返回 `{ text: '' }` 而非 `{}`

### PWA 架构限制（无法修复）⚠️
- Token 计数始终为 0（无后端 tokenizer 模型）
- 设置快照功能受限（无法持久化快照到文件系统）
- 翻译/TTS/SD/向量搜索等需要后端服务的功能不可用
- 多用户系统不可用（PWA 单用户模式）
