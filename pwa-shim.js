/**
 * PWA Shim — 全局 API 拦截层
 * 
 * 在纯前端 PWA 模式下，没有 Node.js 后端。
 * 此脚本拦截所有 fetch() 和 XMLHttpRequest 请求，
 * 对后端 API 返回合理的 mock 响应，让应用正常初始化。
 * 
 * 必须在所有其他脚本之前加载！
 */

(function () {
    'use strict';

    console.log('[PWA Shim] Initializing API interception layer...');

    // ============================================================
    // IndexedDB 存储层
    // ============================================================
    const DB_NAME = 'eroSillyTavern';
    const DB_VERSION = 2;
    const STORES = {
        CHATS: 'chats',
        CHARACTERS: 'characters',
        SETTINGS: 'settings',
        WORLD_INFO: 'worldInfo',
        BACKGROUNDS: 'backgrounds',
        AVATARS: 'avatars',
        GROUPS: 'groups',
    };

    class PwaStorage {
        constructor() { this.db = null; }

        async init() {
            if (this.db) return this.db;
            return new Promise((resolve, reject) => {
                const req = indexedDB.open(DB_NAME, DB_VERSION);
                req.onerror = () => reject(req.error);
                req.onsuccess = () => { this.db = req.result; resolve(this.db); };
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    for (const store of Object.values(STORES)) {
                        if (!db.objectStoreNames.contains(store)) {
                            db.createObjectStore(store, { keyPath: 'id' });
                        }
                    }
                };
            });
        }

        async put(storeName, data) {
            if (!this.db) await this.init();
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction([storeName], 'readwrite');
                const store = tx.objectStore(storeName);
                const req = store.put(data);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        }

        async get(storeName, key) {
            if (!this.db) await this.init();
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction([storeName], 'readonly');
                const store = tx.objectStore(storeName);
                const req = store.get(key);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        }

        async getAll(storeName) {
            if (!this.db) await this.init();
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction([storeName], 'readonly');
                const store = tx.objectStore(storeName);
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => reject(req.error);
            });
        }

        async delete(storeName, key) {
            if (!this.db) await this.init();
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction([storeName], 'readwrite');
                const store = tx.objectStore(storeName);
                const req = store.delete(key);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        }

        async getSetting(key) {
            const result = await this.get(STORES.SETTINGS, key);
            return result?.value;
        }

        async saveSetting(key, value) {
            return this.put(STORES.SETTINGS, { id: key, key, value, updatedAt: new Date().toISOString() });
        }
    }

    window.__pwaStorage = new PwaStorage();

    // ============================================================
    // 默认设置
    // ============================================================
    const DEFAULT_SETTINGS = {
        username: 'User',
        main_api: 'openai',
        api_server: '',
        amount_gen: 80,
        max_context: 4096,
        swipes: true,
        active_character: null,
        active_group: null,
        selected_button: 'coa',
        user_avatar: 'user_default.png',
        oai_settings: { type: 'openai', chat_completion_source: 'openai', openai_model: 'gpt-4o-mini' },
        kai_settings: { type: 'kobold' },
        nai_settings: { type: 'novel' },
        textGenSettings: { type: 'textgen' },
        world_info_settings: {},
        extension_settings: {},
        powerUser: {},
        accountStorage: {},
        currentVersion: '1.12.6',
    };

    // ============================================================
    // PNG tEXt chunk 解析（纯前端，无需后端）
    // ============================================================
    function readPngTextChunks(arrayBuffer) {
        const view = new DataView(arrayBuffer);
        const sig = [137, 80, 78, 71, 13, 10, 26, 10];
        for (let i = 0; i < 8; i++) {
            if (view.getUint8(i) !== sig[i]) throw new Error('Not a valid PNG file');
        }

        const chunks = [];
        let offset = 8;
        while (offset < view.byteLength) {
            const length = view.getUint32(offset);
            const type = String.fromCharCode(
                view.getUint8(offset + 4), view.getUint8(offset + 5),
                view.getUint8(offset + 6), view.getUint8(offset + 7)
            );
            const data = new Uint8Array(arrayBuffer, offset + 8, length);
            chunks.push({ type, data, offset });
            offset += 12 + length;
            if (type === 'IEND') break;
        }

        const textChunks = [];
        for (const chunk of chunks) {
            if (chunk.type === 'tEXt') {
                let nullIndex = -1;
                for (let i = 0; i < chunk.data.length; i++) {
                    if (chunk.data[i] === 0) { nullIndex = i; break; }
                }
                if (nullIndex > 0) {
                    const keyword = new TextDecoder('latin1').decode(chunk.data.slice(0, nullIndex));
                    const text = new TextDecoder('latin1').decode(chunk.data.slice(nullIndex + 1));
                    textChunks.push({ keyword, text });
                }
            }
        }
        return textChunks;
    }

    /**
     * base64 字符串 → UTF-8 字符串
     * atob() 返回 Latin-1 字符串，但人物卡数据是 UTF-8 编码的 JSON，
     * 必须先转为 Uint8Array 再用 TextDecoder('utf-8') 解码
     */
    function base64ToUtf8(base64) {
        const binaryStr = atob(base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
        return new TextDecoder('utf-8').decode(bytes);
    }

    function extractCharacterFromPng(arrayBuffer) {
        const textChunks = readPngTextChunks(arrayBuffer);
        const ccv3 = textChunks.find(c => c.keyword.toLowerCase() === 'ccv3');
        if (ccv3) return JSON.parse(base64ToUtf8(ccv3.text));
        const chara = textChunks.find(c => c.keyword.toLowerCase() === 'chara');
        if (chara) return JSON.parse(base64ToUtf8(chara.text));
        throw new Error('No character data found in PNG');
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * 将人物卡数据规范化为 SillyTavern processCharacter 返回的格式
     */
    function normalizeCharacterData(cardData, avatarKey, avatarBase64) {
        const data = cardData.data || cardData;
        const extensions = data.extensions || {};
        const talkativeness = extensions.talkativeness ?? 0.5;
        const fav = extensions.fav ?? false;

        const v2Data = {
            name: data.name || cardData.name || '',
            description: data.description || '',
            personality: data.personality || '',
            scenario: data.scenario || '',
            first_mes: data.first_mes || '',
            mes_example: data.mes_example || '',
            creator_notes: data.creator_notes || '',
            system_prompt: data.system_prompt || '',
            post_history_instructions: data.post_history_instructions || '',
            tags: data.tags || [],
            creator: data.creator || '',
            character_version: data.character_version || '',
            alternate_greetings: data.alternate_greetings || [],
            extensions: {
                talkativeness,
                fav,
                world: extensions.world || '',
                depth_prompt: extensions.depth_prompt || { prompt: '', depth: 4, role: 'system' },
                ...extensions,
            },
            character_book: data.character_book || null,
        };

        const name = data.name || cardData.name || '';
        const now = new Date().toISOString();

        return {
            name: name,
            description: v2Data.description,
            personality: v2Data.personality,
            scenario: v2Data.scenario,
            first_mes: v2Data.first_mes,
            mes_example: v2Data.mes_example,
            talkativeness: talkativeness,
            fav: fav,
            tags: v2Data.tags,
            chat: `${name} - ${now.replace(/[T:].*/g, '')}`,
            creator_notes: v2Data.creator_notes,
            spec: cardData.spec || 'chara_card_v2',
            spec_version: cardData.spec_version || '2.0',
            data: v2Data,
            avatar: avatarKey,
            json_data: JSON.stringify(cardData),
            date_added: Date.now(),
            create_date: cardData.create_date || now,
            chat_size: 0,
            date_last_chat: 0,
            data_size: 0,
            _pwaAvatarData: avatarBase64,
            updatedAt: now,
        };
    }

    /**
     * 处理人物卡导入请求
     */
    async function handleCharacterImport(formData) {
        const file = formData.get('avatar');
        const format = formData.get('file_type');
        const preservedName = formData.get('preserved_name');

        if (!file) throw new Error('No file in FormData');

        let cardData;
        let avatarBase64 = null;

        if (format === 'png') {
            const arrayBuffer = await file.arrayBuffer();
            cardData = extractCharacterFromPng(arrayBuffer);
            avatarBase64 = await fileToBase64(file);
        } else if (format === 'json') {
            const text = await file.text();
            cardData = JSON.parse(text);
        } else if (format === 'yaml' || format === 'yml') {
            throw new Error('YAML import not supported in PWA mode');
        } else if (format === 'charx' || format === 'byaf') {
            throw new Error(`${format} import not supported in PWA mode`);
        } else {
            throw new Error(`Unsupported format: ${format}`);
        }

        const name = (cardData.data?.name || cardData.name || file.name.replace(/\.\w+$/, '')).trim();
        if (!name) throw new Error('Character name is empty');

        const fileName = preservedName || name;
        const avatarKey = `${fileName}.png`;

        const storageData = normalizeCharacterData(cardData, avatarKey, avatarBase64);
        storageData.id = avatarKey;

        await window.__pwaStorage.put(STORES.CHARACTERS, storageData);
        console.log('[PWA Shim] Character imported:', fileName);

        return { file_name: fileName };
    }

    // ============================================================
    // API Mock 响应映射
    // ============================================================
    async function getMockResponse(url, method, body) {
        let path;
        try {
            path = new URL(url, location.origin).pathname;
        } catch (e) {
            return null;
        }

        // --- 认证/安全 ---
        if (path === '/csrf-token') return { status: 200, data: { token: 'pwa-csrf-token' } };
        if (path === '/version') return { status: 200, data: { agent: 'SillyTavern PWA', pkgVersion: '1.12.6', gitRevision: '', gitBranch: 'pwa' } };
        if (path === '/api/ping') return { status: 200, data: { status: 'ok' } };

        // --- 用户 ---
        if (path === '/api/users/list') return { status: 204, data: null };
        if (path === '/api/users/login') return { status: 200, data: { handle: 'user', name: 'User' } };
        if (path === '/api/users/me') return { status: 200, data: { handle: 'user', name: 'User', avatar: 'img/user_default.png' } };
        if (path === '/api/users/logout') return { status: 200, data: {} };
        if (path.startsWith('/api/users/')) return { status: 200, data: {} };

        // --- 设置 ---
        if (path === '/api/settings/get') {
            try {
                const savedSettings = await window.__pwaStorage.getSetting('mainSettings');
                const settings = savedSettings || DEFAULT_SETTINGS;
                return { status: 200, data: { result: 'ok', settings: JSON.stringify(settings), enable_accounts: false, enable_extensions: true, enable_extensions_auto_update: false, request_compression: false } };
            } catch (e) {
                return { status: 200, data: { result: 'file not find', settings: JSON.stringify(DEFAULT_SETTINGS), enable_accounts: false, enable_extensions: true, enable_extensions_auto_update: false, request_compression: false } };
            }
        }
        if (path === '/api/settings/save') {
            try {
                const data = typeof body === 'string' ? JSON.parse(body) : body;
                if (data.settings) {
                    const parsed = typeof data.settings === 'string' ? JSON.parse(data.settings) : data.settings;
                    await window.__pwaStorage.saveSetting('mainSettings', parsed);
                }
            } catch (e) { /* ignore */ }
            return { status: 200, data: { result: 'ok' } };
        }
        if (path.startsWith('/api/settings/')) return { status: 200, data: { result: 'ok' } };

        // --- 人物卡导入（由 fetch 拦截器直接处理 FormData）---
        if (path === '/api/characters/import') return null;

        // --- 角色 ---
        if (path === '/api/characters/all') {
            try { return { status: 200, data: await window.__pwaStorage.getAll(STORES.CHARACTERS) }; }
            catch (e) { return { status: 200, data: [] }; }
        }
        if (path === '/api/characters/create') {
            try { const data = typeof body === 'string' ? JSON.parse(body) : body; const id = data.name || Date.now().toString(); await window.__pwaStorage.put(STORES.CHARACTERS, { id, ...data }); return { status: 200, data: { id, ...data } }; }
            catch (e) { return { status: 500, data: { error: 'Failed' } }; }
        }
        if (path === '/api/characters/delete') {
            try {
                const data = typeof body === 'string' ? JSON.parse(body) : body;
                const avatarKey = data.avatar_url || data.id;
                if (avatarKey) {
                    await window.__pwaStorage.delete(STORES.CHARACTERS, avatarKey);
                    console.log('[PWA Shim] Character deleted:', avatarKey);
                }
                return { status: 200, data: {} };
            } catch (e) { return { status: 200, data: {} }; }
        }
        if (path === '/api/characters/get') {
            try { const data = typeof body === 'string' ? JSON.parse(body) : body; const char = await window.__pwaStorage.get(STORES.CHARACTERS, data.avatar_url || data.id); return { status: 200, data: char || {} }; }
            catch (e) { return { status: 200, data: {} }; }
        }
        if (path.startsWith('/api/characters/')) return { status: 200, data: {} };

        // --- 聊天 ---
        if (path === '/api/chats/save') { try { const data = typeof body === 'string' ? JSON.parse(body) : body; const id = data.id || data.chatfile || Date.now().toString(); await window.__pwaStorage.put(STORES.CHATS, { id, ...data }); } catch (e) { /* ignore */ } return { status: 200, data: { result: 'ok' } }; }
        if (path === '/api/chats/get') { try { const data = typeof body === 'string' ? JSON.parse(body) : body; const chat = await window.__pwaStorage.get(STORES.CHATS, data.id || data.chatfile); return { status: 200, data: chat || {} }; } catch (e) { return { status: 200, data: {} }; } }
        if (path === '/api/chats/delete') { try { const data = typeof body === 'string' ? JSON.parse(body) : body; await window.__pwaStorage.delete(STORES.CHATS, data.chatfile || data.id); } catch (e) { /* ignore */ } return { status: 200, data: { result: 'ok' } }; }
        if (path === '/api/chats/recent') return { status: 200, data: [] };
        if (path === '/api/chats/search') return { status: 200, data: [] };
        if (path.startsWith('/api/chats/')) return { status: 200, data: {} };

        // --- 群组 ---
        if (path === '/api/groups/all') { try { return { status: 200, data: await window.__pwaStorage.getAll(STORES.GROUPS) }; } catch (e) { return { status: 200, data: [] }; } }
        if (path.startsWith('/api/groups/')) return { status: 200, data: {} };

        // --- 背景 ---
        if (path === '/api/backgrounds/all') return { status: 200, data: { images: [], config: {} } };
        if (path === '/api/backgrounds/folders') return { status: 200, data: [] };
        if (path.startsWith('/api/backgrounds/')) return { status: 200, data: {} };

        // --- 头像 ---
        if (path === '/api/avatars/get') return { status: 200, data: [] };
        if (path.startsWith('/api/avatars/')) return { status: 200, data: {} };

        // --- 世界信息 ---
        if (path === '/api/worldinfo/list') return { status: 200, data: [] };
        if (path.startsWith('/api/worldinfo/')) return { status: 200, data: {} };

        // --- 秘密/API 密钥 ---
        if (path === '/api/secrets/read') { try { return { status: 200, data: (await window.__pwaStorage.getSetting('secrets')) || {} }; } catch (e) { return { status: 200, data: {} }; } }
        if (path === '/api/secrets/write') { try { const data = typeof body === 'string' ? JSON.parse(body) : body; const secrets = (await window.__pwaStorage.getSetting('secrets')) || {}; if (data.key) secrets[data.key] = data.value; await window.__pwaStorage.saveSetting('secrets', secrets); } catch (e) { /* ignore */ } return { status: 200, data: {} }; }
        if (path === '/api/secrets/find') return { status: 200, data: null };
        if (path.startsWith('/api/secrets/')) return { status: 200, data: {} };

        // --- 扩展 ---
        if (path.startsWith('/api/extensions/')) return { status: 200, data: {} };

        // --- 图片/文件 ---
        if (path === '/api/images/list' || path.startsWith('/api/images/list/')) return { status: 200, data: [] };
        if (path === '/api/images/folders') return { status: 200, data: [] };
        if (path.startsWith('/api/images/')) return { status: 200, data: {} };
        if (path.startsWith('/api/files/')) return { status: 200, data: {} };

        // --- 图片元数据 ---
        if (path.startsWith('/api/image-metadata/')) return { status: 200, data: [] };

        // --- 精灵图 ---
        if (path.startsWith('/api/sprites/')) return { status: 200, data: [] };

        // --- 预设/主题/快速回复 ---
        if (path.startsWith('/api/presets/')) return { status: 200, data: {} };
        if (path.startsWith('/api/themes/')) return { status: 200, data: {} };
        if (path.startsWith('/api/moving-ui/')) return { status: 200, data: {} };
        if (path.startsWith('/api/quick-replies/')) return { status: 200, data: {} };

        // --- 统计 ---
        if (path.startsWith('/api/stats/')) return { status: 200, data: {} };

        // --- 资产 ---
        if (path.startsWith('/api/assets/')) return { status: 200, data: {} };

        // --- 内容导入 ---
        if (path === '/api/content/importURL') return { status: 200, data: {} };
        if (path === '/api/content/importUUID') return { status: 200, data: {} };

        // --- AI 后端 (放行到 Cloudflare Functions) ---
        if (path.startsWith('/api/backends/')) return null;
        if (path.startsWith('/api/openai/') || path.startsWith('/api/novelai/') ||
            path.startsWith('/api/google/') || path.startsWith('/api/anthropic/') ||
            path.startsWith('/api/azure/') || path.startsWith('/api/volcengine/') ||
            path.startsWith('/api/minimax/') || path.startsWith('/api/sd/') ||
            path.startsWith('/api/openrouter/') || path.startsWith('/api/nanogpt/')) return null;

        // --- 分词器 ---
        if (path.startsWith('/api/tokenizers/')) {
            if (path.includes('/encode')) return { status: 200, data: { tokens: [], token_count: 0 } };
            if (path.includes('/decode')) return { status: 200, data: { text: '' } };
            if (path.includes('/count')) return { status: 200, data: { token_count: 0 } };
            return { status: 200, data: {} };
        }

        // --- 其他 /api/ 请求 ---
        if (path.startsWith('/api/')) {
            console.warn('[PWA Shim] Unhandled API:', method, path);
            return { status: 200, data: {} };
        }

        // 非 API 请求不拦截
        return null;
    }

    // ============================================================
    // 拦截 fetch()
    // ============================================================
    const originalFetch = window.fetch;

    window.fetch = async function pwaFetch(input, init) {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        const method = ((init && init.method) || (input instanceof Request ? input.method : 'GET')).toUpperCase();
        const body = init && init.body;

        // 解析 URL，只拦截同源请求
        let requestPath;
        let requestUrl;
        try {
            requestUrl = new URL(url, location.origin);
            if (requestUrl.origin !== location.origin) {
                return originalFetch.call(this, input, init);
            }
            requestPath = requestUrl.pathname;
        } catch (e) {
            return originalFetch.call(this, input, init);
        }

        // --- 特殊处理：人物卡导入（需要解析 FormData 中的文件）---
        if (requestPath === '/api/characters/import' && method === 'POST' && body instanceof FormData) {
            try {
                const result = await handleCharacterImport(body);
                console.log('[PWA Shim]', method, requestPath, '→ import', result.file_name);
                if (window.__pwaApiLog) window.__pwaApiLog.push(method + ' ' + requestPath + ' → import ' + result.file_name);
                return new Response(JSON.stringify(result), {
                    status: 200,
                    statusText: 'OK',
                    headers: { 'Content-Type': 'application/json' },
                });
            } catch (err) {
                console.error('[PWA Shim] Character import failed:', err);
                return new Response(JSON.stringify({ error: true }), {
                    status: 200,
                    statusText: 'OK',
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        }

        // --- 特殊处理：缩略图 API（返回图片数据）---
        if (requestPath === '/thumbnail' && method === 'GET') {
            const type = requestUrl.searchParams.get('type');
            const file = requestUrl.searchParams.get('file');

            if (type === 'avatar' && file) {
                try {
                    const char = await window.__pwaStorage.get(STORES.CHARACTERS, file);
                    if (char && char._pwaAvatarData) {
                        const base64 = char._pwaAvatarData;
                        const mimeMatch = base64.match(/^data:(image\/\w+);base64,/);
                        const mime = mimeMatch ? mimeMatch[1] : 'image/png';
                        const binaryStr = atob(base64.split(',')[1]);
                        const bytes = new Uint8Array(binaryStr.length);
                        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
                        return new Response(new Blob([bytes], { type: mime }), {
                            status: 200,
                            statusText: 'OK',
                            headers: { 'Content-Type': mime, 'Cache-Control': 'no-cache' },
                        });
                    }
                } catch (e) {
                    console.error('[PWA Shim] Thumbnail error:', e);
                }
                return new Response(null, { status: 404, statusText: 'Not Found' });
            }

            return new Response(null, { status: 404, statusText: 'Not Found' });
        }

        const mockResponse = await getMockResponse(url, method, body);

        if (mockResponse !== null) {
            console.log('[PWA Shim]', method, requestPath, '→ mock', mockResponse.status);
            if (window.__pwaApiLog) window.__pwaApiLog.push(method + ' ' + requestPath + ' → ' + mockResponse.status);

            if (mockResponse.status === 204) {
                return new Response(null, { status: 204, statusText: 'No Content', headers: { 'Content-Type': 'application/json' } });
            }

            return new Response(JSON.stringify(mockResponse.data), {
                status: mockResponse.status,
                statusText: mockResponse.status === 200 ? 'OK' : 'Error',
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return originalFetch.call(this, input, init);
    };

    // ============================================================
    // 拦截 XMLHttpRequest
    // ============================================================
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
        this.__pwaMethod = method;
        this.__pwaUrl = url;
        return originalXHROpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
        const url = this.__pwaUrl;
        const method = this.__pwaMethod;

        if (url && method) {
            try {
                const requestUrl = new URL(url, location.origin);
                if (requestUrl.origin === location.origin && requestUrl.pathname.startsWith('/api/')) {
                    const xhr = this;
                    (async () => {
                        const mockResponse = await getMockResponse(url, method, body);
                        if (mockResponse !== null) {
                            console.log('[PWA Shim] XHR', method, requestUrl.pathname, '→ mock', mockResponse.status);

                            Object.defineProperty(xhr, 'status', { writable: true, value: mockResponse.status });
                            Object.defineProperty(xhr, 'responseText', { writable: true, value: JSON.stringify(mockResponse.data) });
                            Object.defineProperty(xhr, 'readyState', { writable: true, value: 4 });
                            Object.defineProperty(xhr, 'response', { writable: true, value: JSON.stringify(mockResponse.data) });

                            if (typeof xhr.onreadystatechange === 'function') xhr.onreadystatechange(new Event('readystatechange'));
                            if (typeof xhr.onload === 'function') xhr.onload(new ProgressEvent('load'));
                            try { xhr.dispatchEvent(new ProgressEvent('load')); xhr.dispatchEvent(new Event('readystatechange')); } catch (e) { /* ignore */ }
                            return;
                        }
                        originalXHRSend.call(xhr, body);
                    })().catch(err => {
                        console.error('[PWA Shim] XHR mock error:', err);
                        originalXHRSend.call(xhr, body);
                    });
                    return;
                }
            } catch (e) { /* URL parse failed, pass through */ }
        }

        return originalXHRSend.apply(this, arguments);
    };

    // ============================================================
    // 全局工具
    // ============================================================
    window.__pwaMode = true;
    window.__pwaApiLog = [];

    window.__pwaStorage.init().then(() => {
        console.log('[PWA Shim] IndexedDB initialized');
    }).catch(err => {
        console.error('[PWA Shim] IndexedDB init failed:', err);
    });

    console.log('[PWA Shim] API interception layer ready');

})();
