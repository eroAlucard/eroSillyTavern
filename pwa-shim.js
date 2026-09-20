/**
 * PWA Shim — 全局 API 拦截层
 * 在纯前端 PWA 模式下，没有 Node.js 后端。
 * 此脚本拦截所有 fetch() 和 XMLHttpRequest 请求，
 * 对后端 API 返回合理的 mock 响应，让应用正常初始化。
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
        CHATS: 'chats', CHARACTERS: 'characters', SETTINGS: 'settings',
        WORLD_INFO: 'worldInfo', BACKGROUNDS: 'backgrounds', AVATARS: 'avatars', GROUPS: 'groups',
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
                        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'id' });
                    }
                };
            });
        }
        async put(storeName, data) {
            if (!this.db) await this.init();
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction([storeName], 'readwrite');
                const req = tx.objectStore(storeName).put(data);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        }
        async get(storeName, key) {
            if (!this.db) await this.init();
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction([storeName], 'readonly');
                const req = tx.objectStore(storeName).get(key);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        }
        async getAll(storeName) {
            if (!this.db) await this.init();
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction([storeName], 'readonly');
                const req = tx.objectStore(storeName).getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => reject(req.error);
            });
        }
        async delete(storeName, key) {
            if (!this.db) await this.init();
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction([storeName], 'readwrite');
                const req = tx.objectStore(storeName).delete(key);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        }
        async getSetting(key) { const r = await this.get(STORES.SETTINGS, key); return r?.value; }
        async saveSetting(key, value) { return this.put(STORES.SETTINGS, { id: key, key, value, updatedAt: new Date().toISOString() }); }
        // Generic store helpers (storeName as string)
        async getFromStore(storeName, key) { return this.get(storeName, key); }
        async getAllFromStore(storeName) { return this.getAll(storeName); }
        async saveToStore(storeName, key, data) { const record = typeof data === 'object' ? { ...data, id: key } : { id: key, value: data }; return this.put(storeName, record); }
        async deleteFromStore(storeName, key) { return this.delete(storeName, key); }
    }

    window.__pwaStorage = new PwaStorage();

    // ============================================================
    // 默认设置
    // ============================================================
    const DEFAULT_SETTINGS = {
        username: 'User', main_api: 'openai', api_server: '',
        amount_gen: 80, max_context: 4096, swipes: true,
        active_character: null, active_group: null, selected_button: 'coa',
        user_avatar: 'user_default.png',
        oai_settings: { type: 'openai', chat_completion_source: 'openai', openai_model: 'gpt-4o-mini' },
        kai_settings: { type: 'kobold' }, nai_settings: { type: 'novel' },
        textGenSettings: { type: 'textgen' },
        world_info_settings: {}, extension_settings: {},
        powerUser: {}, accountStorage: {}, currentVersion: '1.12.6',
    };

    // ============================================================
    // 默认预设/模板（从原版 SillyTavern default/content/presets 提取）
    // ============================================================
const DEFAULT_PRESETS = {"instruct":[{"input_sequence":"","output_sequence":"","last_output_sequence":"","system_sequence":"","stop_sequence":"","wrap":true,"macro":true,"names_behavior":"none","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"","input_suffix":"","system_suffix":"","user_alignment_message":"","system_same_as_user":false,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"","story_string_suffix":"","name":"Adventure"},{"input_sequence":"","output_sequence":"","last_output_sequence":"\n### Response:","system_sequence":"","stop_sequence":"","wrap":true,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"<START OF CHAT>","skip_examples":false,"output_suffix":"","input_suffix":"","system_suffix":"","user_alignment_message":"","system_same_as_user":false,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"Below is an instruction that describes a task. Write a response that appropriately completes the request.\n\n### Instruction:","story_string_suffix":"\n","name":"Alpaca-Single-Turn"},{"input_sequence":"### Instruction:","output_sequence":"### Response:","last_output_sequence":"","system_sequence":"### Input:","stop_sequence":"","wrap":true,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"\n\n","input_suffix":"\n\n","system_suffix":"\n\n","user_alignment_message":"","system_same_as_user":false,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"","story_string_suffix":"\n\n","name":"Alpaca"},{"input_sequence":"<|im_start|>{{name}}","output_sequence":"<|im_start|>{{name}}","last_output_sequence":"","system_sequence":"<|im_start|>system","stop_sequence":"<|im_end|>","wrap":true,"macro":true,"names_behavior":"none","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"<|im_end|>\n","input_suffix":"<|im_end|>\n","system_suffix":"<|im_end|>\n","user_alignment_message":"","system_same_as_user":false,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"<|im_start|>system","story_string_suffix":"<|im_end|>\n","name":"ChatML-Names"},{"input_sequence":"<|im_start|>user","output_sequence":"<|im_start|>assistant","last_output_sequence":"","system_sequence":"<|im_start|>system","stop_sequence":"<|im_end|>","wrap":true,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"<|im_end|>\n","input_suffix":"<|im_end|>\n","system_suffix":"<|im_end|>\n","user_alignment_message":"","system_same_as_user":false,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"<|im_start|>system","story_string_suffix":"<|im_end|>\n","name":"ChatML"},{"input_sequence":"<|START_OF_TURN_TOKEN|><|USER_TOKEN|>","output_sequence":"<|START_OF_TURN_TOKEN|><|CHATBOT_TOKEN|>","last_output_sequence":"","system_sequence":"<|START_OF_TURN_TOKEN|><|SYSTEM_TOKEN|>","stop_sequence":"<|END_OF_TURN_TOKEN|>","wrap":false,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"<|END_OF_TURN_TOKEN|>","input_suffix":"<|END_OF_TURN_TOKEN|>","system_suffix":"<|END_OF_TURN_TOKEN|>","user_alignment_message":"","system_same_as_user":false,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"<|START_OF_TURN_TOKEN|><|SYSTEM_TOKEN|>","story_string_suffix":"<|END_OF_TURN_TOKEN|>","name":"Command R"},{"input_sequence":"<｜User｜>","output_sequence":"<｜Assistant｜>","last_output_sequence":"","system_sequence":"","stop_sequence":"","wrap":false,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"<｜end▁of▁sentence｜>","input_suffix":"","system_suffix":"","user_alignment_message":"","system_same_as_user":true,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"","story_string_suffix":"","name":"DeepSeek-V2.5"},{"input_sequence":"<|userprompt|>","output_sequence":"<|response|>","last_output_sequence":"","system_sequence":"<|system|>","stop_sequence":"<|endofresponse|>","wrap":true,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"<|endofresponse|>\n","input_suffix":"<|endofuserprompt|>\n","system_suffix":"<|endofsystem|>\n","user_alignment_message":"","system_same_as_user":false,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"<|system|>","story_string_suffix":"<|endofsystem|>\n","name":"Dots1"},{"input_sequence":"<|user|>\n","output_sequence":"<|assistant|>\n","last_output_sequence":"","system_sequence":"","stop_sequence":"","wrap":false,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"","input_suffix":"","system_suffix":"","user_alignment_message":"","system_same_as_user":true,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"[gMASK]<sop>","story_string_suffix":"\n","name":"GLM-4"},{"input_sequence":"<start_of_turn>user","output_sequence":"<start_of_turn>model","last_output_sequence":"","system_sequence":"<start_of_turn>system","stop_sequence":"<end_of_turn>","wrap":true,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"<end_of_turn>\n","input_suffix":"<end_of_turn>\n","system_suffix":"<end_of_turn>\n","user_alignment_message":"","system_same_as_user":true,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"<start_of_turn>user","story_string_suffix":"<end_of_turn>\n","name":"Gemma 2"},{"input_sequence":"<|turn>user\n","output_sequence":"<|turn>model\n","last_output_sequence":"","system_sequence":"<|turn>system\n","stop_sequence":"<turn|>","wrap":false,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"<turn|>\n","input_suffix":"<turn|>\n","system_suffix":"<turn|>\n","user_alignment_message":"","system_same_as_user":false,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"<|turn>system\n","story_string_suffix":"<turn|>\n","name":"Gemma 4"},{"input_sequence":"USER: ","output_sequence":"GPT: ","last_output_sequence":"","system_sequence":"","stop_sequence":"","wrap":false,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"</s>","input_suffix":" ","system_suffix":"","user_alignment_message":"","system_same_as_user":true,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"BEGINNING OF CONVERSATION: ","story_string_suffix":"\n","name":"Koala"},{"input_sequence":"{{[INPUT]}}","output_sequence":"{{[OUTPUT]}}","last_output_sequence":"","system_sequence":"{{[SYSTEM]}}","stop_sequence":"","wrap":false,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"{{[OUTPUT_END]}}","input_suffix":"{{[INPUT_END]}}","system_suffix":"{{[SYSTEM_END]}}","user_alignment_message":"","system_same_as_user":false,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"{{[SYSTEM]}}","story_string_suffix":"{{[SYSTEM_END]}}","name":"KoboldAI"},{"input_sequence":"","output_sequence":"","last_output_sequence":"\n### Response:","system_sequence":"","stop_sequence":"","wrap":true,"macro":true,"names_behavior":"always","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"","input_suffix":"","system_suffix":"","user_alignment_message":"","system_same_as_user":false,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"### Instruction:","story_string_suffix":"","name":"Libra-32B"},{"input_sequence":"### Instruction:","output_sequence":"### Response:","last_output_sequence":"### Response: (length = unlimited)","system_sequence":"","stop_sequence":"","wrap":true,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"\n\n","input_suffix":"\n\n","system_suffix":"","user_alignment_message":"","system_same_as_user":true,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"Below is an instruction that describes a task. Write a response that appropriately completes the request.\n\n### Instruction:","story_string_suffix":"\n\n","name":"Lightning 1.1"},{"input_sequence":"[INST] ","output_sequence":"","last_output_sequence":"","system_sequence":"","stop_sequence":"","wrap":false,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"\n","input_suffix":" [/INST]\n","system_suffix":"","user_alignment_message":"Let's get started. Please respond based on the information and instructions provided above.","system_same_as_user":true,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"[INST] <<SYS>>\n","story_string_suffix":"\n<</SYS>> Understood. [/INST]","name":"Llama 2 Chat"},{"input_sequence":"<|start_header_id|>user<|end_header_id|>\n\n","output_sequence":"<|start_header_id|>assistant<|end_header_id|>\n\n","last_output_sequence":"","system_sequence":"<|start_header_id|>system<|end_header_id|>\n\n","stop_sequence":"<|eot_id|>","wrap":false,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"<|eot_id|>","input_suffix":"<|eot_id|>","system_suffix":"<|eot_id|>","user_alignment_message":"","system_same_as_user":false,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"<|start_header_id|>system<|end_header_id|>\n\n","story_string_suffix":"<|eot_id|>","name":"Llama 3 Instruct"},{"input_sequence":"<|header_start|>user<|header_end|>\n\n","output_sequence":"<|header_start|>assistant<|header_end|>\n\n","last_output_sequence":"","system_sequence":"<|header_start|>system<|header_end|>\n\n","stop_sequence":"<|eot|>","wrap":false,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"<|eot|>","input_suffix":"<|eot|>","system_suffix":"<|eot|>","user_alignment_message":"","system_same_as_user":false,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"<|begin_of_text|><|header_start|>system<|header_end|>\n\n","story_string_suffix":"<|eot|>","name":"Llama 4 Instruct"},{"input_sequence":"<|start_header_id|>{{name}}<|end_header_id|>\n\n","output_sequence":"<|start_header_id|>{{name}}<|end_header_id|>\n\n","last_output_sequence":"","system_sequence":"<|start_header_id|>system<|end_header_id|>\n\n","stop_sequence":"<|eot_id|>","wrap":false,"macro":true,"names_behavior":"none","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"<|eot_id|>","input_suffix":"<|eot_id|>","system_suffix":"<|eot_id|>","user_alignment_message":"","system_same_as_user":true,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"<|start_header_id|>system<|end_header_id|>\n\n","story_string_suffix":"<|eot_id|>","name":"Llama-3-Instruct-Names"},{"input_sequence":"<|user|>","output_sequence":"<|model|>","last_output_sequence":"","system_sequence":"","stop_sequence":"</s>","wrap":false,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"","input_suffix":"","system_suffix":"","user_alignment_message":"","system_same_as_user":true,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"<|system|>","story_string_suffix":"","name":"Metharme"},{"input_sequence":" [INST] ","output_sequence":" [/INST] ","last_output_sequence":" [/INST]","system_sequence":"","stop_sequence":"","wrap":false,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"</s>","input_suffix":"","system_suffix":"","user_alignment_message":"Let's get started. Please respond based on the information and instructions provided above.","system_same_as_user":true,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":" [INST] ","story_string_suffix":" [/INST] Understood.</s>","name":"Mistral V1"},{"input_sequence":"[INST] ","output_sequence":"[/INST] ","last_output_sequence":"[/INST]","system_sequence":"","stop_sequence":"","wrap":false,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"</s>","input_suffix":"","system_suffix":"","user_alignment_message":"Let's get started. Please respond based on the information and instructions provided above.","system_same_as_user":true,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"[INST] ","story_string_suffix":"[/INST] Understood.</s>","name":"Mistral V2 & V3"},{"input_sequence":"[INST]","output_sequence":"[/INST]","last_output_sequence":"","system_sequence":"","stop_sequence":"","wrap":false,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"</s>","input_suffix":"","system_suffix":"","user_alignment_message":"Let's get started. Please respond based on the information and instructions provided above.","system_same_as_user":true,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"[INST]","story_string_suffix":"[/INST]Understood.</s>","name":"Mistral V3-Tekken"},{"input_sequence":"[INST]","output_sequence":"","last_output_sequence":"","system_sequence":"[SYSTEM_PROMPT]","stop_sequence":"</s>","wrap":false,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"</s>","input_suffix":"[/INST]","system_suffix":"[/SYSTEM_PROMPT]","user_alignment_message":"","system_same_as_user":false,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"[SYSTEM_PROMPT]","story_string_suffix":"[/SYSTEM_PROMPT]","name":"Mistral V7-Tekken"},{"input_sequence":"[INST] ","output_sequence":" ","last_output_sequence":"","system_sequence":"[SYSTEM_PROMPT] ","stop_sequence":"</s>","wrap":false,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"</s>","input_suffix":"[/INST]","system_suffix":"[/SYSTEM_PROMPT]","user_alignment_message":"","system_same_as_user":false,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"[SYSTEM_PROMPT] ","story_string_suffix":"[/SYSTEM_PROMPT]","name":"Mistral V7"},{"input_sequence":"<|im_user|>user<|im_middle|>","output_sequence":"<|im_assistant|>assistant<|im_middle|>","last_output_sequence":"","system_sequence":"<|im_system|>system<|im_middle|>","stop_sequence":"<|im_end|>","wrap":false,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"<|im_end|>","input_suffix":"<|im_end|>","system_suffix":"<|im_end|>","user_alignment_message":"","system_same_as_user":false,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"<|im_system|>system<|im_middle|>","story_string_suffix":"<|im_end|>","name":"Moonshot AI"},{"input_sequence":"<|start|>user<|message|>","output_sequence":"<|start|>assistant<|channel|>final<|message|>","last_output_sequence":"{{noop}}","system_sequence":"<|start|>developer<|message|>","stop_sequence":"","wrap":false,"macro":true,"activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"<|end|>","input_suffix":"<|end|>","system_suffix":"<|end|>","user_alignment_message":"","system_same_as_user":false,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","names_behavior":"force","sequences_as_stop_strings":false,"story_string_prefix":"<|start|>system<|message|>","story_string_suffix":"<|end|>","name":"OpenAI Harmony (Thinking)"},{"input_sequence":"<|start|>user<|message|>","output_sequence":"<|start|>assistant<|channel|>final<|message|>","last_output_sequence":"","system_sequence":"<|start|>developer<|message|>","stop_sequence":"","wrap":false,"macro":true,"activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"<|end|>","input_suffix":"<|end|>","system_suffix":"<|end|>","user_alignment_message":"","system_same_as_user":false,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","names_behavior":"force","sequences_as_stop_strings":true,"story_string_prefix":"<|start|>system<|message|>","story_string_suffix":"<|end|>","name":"OpenAI Harmony"},{"input_sequence":"\nUser: ","output_sequence":"\nAssistant: ","last_output_sequence":"","system_sequence":"","stop_sequence":"","wrap":false,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"<|end_of_turn|>","input_suffix":"<|end_of_turn|>","system_suffix":"","user_alignment_message":"","system_same_as_user":false,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"","story_string_suffix":"","name":"OpenOrca-OpenChat"},{"input_sequence":"<|user|>\n","output_sequence":"<|assistant|>\n","last_output_sequence":"","system_sequence":"<|system|>\n","stop_sequence":"<|end|>","wrap":false,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"<|end|>\n","input_suffix":"<|end|>\n","system_suffix":"<|end|>\n","user_alignment_message":"","system_same_as_user":false,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"<|system|>\n","story_string_suffix":"<|end|>\n","name":"Phi"},{"input_sequence":"","output_sequence":"","last_output_sequence":"","system_sequence":"","stop_sequence":"","wrap":true,"macro":true,"names_behavior":"none","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"","input_suffix":"","system_suffix":"","user_alignment_message":"","system_same_as_user":false,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"","story_string_suffix":"","name":"Story"},{"input_sequence":"USER: ","output_sequence":"ASSISTANT: ","last_output_sequence":"","system_sequence":"SYSTEM: ","stop_sequence":"","wrap":false,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"\n","input_suffix":"\n","system_suffix":"\n","user_alignment_message":"Let's get started. Please respond based on the information and instructions provided above.","system_same_as_user":false,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"SYSTEM: ","story_string_suffix":"\n","name":"Synthia"},{"input_sequence":"<|user|>\n","output_sequence":"<|assistant|>\n","last_output_sequence":"","system_sequence":"<|system|>\n","stop_sequence":"<|end_of_text|>","wrap":false,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"<|end_of_text|>\n","input_suffix":"\n","system_suffix":"\n","user_alignment_message":"","system_same_as_user":false,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"<|system|>\n","story_string_suffix":"\n","name":"Tulu"},{"input_sequence":"### Human:","output_sequence":"### Assistant:","last_output_sequence":"","system_sequence":"","stop_sequence":"","wrap":true,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"","input_suffix":"","system_suffix":"","user_alignment_message":"","system_same_as_user":true,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"","story_string_suffix":"","name":"Vicuna 1.0"},{"input_sequence":"\nUSER: ","output_sequence":"\nASSISTANT: ","last_output_sequence":"","system_sequence":"","stop_sequence":"","wrap":false,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"</s>","input_suffix":"","system_suffix":"","user_alignment_message":"","system_same_as_user":true,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"BEGINNING OF CONVERSATION: ","story_string_suffix":"","name":"Vicuna 1.1"},{"input_sequence":"USER: ","output_sequence":"ASSISTANT: ","last_output_sequence":"","system_sequence":"","stop_sequence":"","wrap":true,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"","input_suffix":"","system_suffix":"","user_alignment_message":"","system_same_as_user":true,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"","story_string_suffix":"","name":"WizardLM-13B"},{"input_sequence":"","output_sequence":"### Response:","last_output_sequence":"","system_sequence":"","stop_sequence":"","wrap":true,"macro":true,"names_behavior":"force","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"</s>","input_suffix":"","system_suffix":"","user_alignment_message":"","system_same_as_user":false,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"","story_string_suffix":"","name":"WizardLM"},{"input_sequence":"### Instruction:\n#### {{name}}:","output_sequence":"### Response:\n#### {{name}}:","last_output_sequence":"### Response (2 paragraphs, engaging, natural, authentic, descriptive, creative):\n#### {{name}}:","system_sequence":"","stop_sequence":"","wrap":true,"macro":true,"names_behavior":"none","activation_regex":"","first_output_sequence":"","skip_examples":false,"output_suffix":"","input_suffix":"","system_suffix":"","user_alignment_message":"","system_same_as_user":false,"last_system_sequence":"","first_input_sequence":"","last_input_sequence":"","sequences_as_stop_strings":true,"story_string_prefix":"## {{char}}\n- You're \"{{char}}\" in this never-ending roleplay with \"{{user}}\".\n### Input:","story_string_suffix":"### Response:\n(OOC) Understood. I will take this info into account for the roleplay. (end OOC)\n","name":"simple-proxy-for-tavern"}],"context":[{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":false,"trim_sentences":false,"single_line":true,"name":"Adventure"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":false,"trim_sentences":false,"single_line":false,"name":"Alpaca-Single-Turn"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"Alpaca"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"ChatML-Names"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"ChatML"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"Command R"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"DeepSeek-V2.5"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"***","chat_start":"***","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"Default"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"Dots1"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"GLM-4"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"Gemma 2"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"Gemma 4"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"### Example:","chat_start":"### START ROLEPLAY:","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"Libra-32B"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"Example of an interaction:\n","chat_start":"This is the history of the roleplay:\n","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"Lightning 1.1"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"Llama 2 Chat"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"Llama 3 Instruct"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"Llama 4 Instruct"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"Llama-3-Instruct-Names"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"Metharme"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"Minimalist"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"Mistral V1"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"Mistral V2 & V3"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"Mistral V3-Tekken"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"Mistral V7-Tekken"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"Mistral V7"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"Moonshot AI"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"***","chat_start":"***","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"NovelAI"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}'s personality: {{personality}}\n{{/if}}{{#if scenario}}Circumstances and context of the dialogue: {{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}","example_separator":"This is how {{char}} should talk","chat_start":"\nThen the roleplay chat between {{user}} and {{char}} begins.\n","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"OldDefault"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"OpenAI Harmony"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"Phi"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"Story"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"Synthia"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{personality}}\n{{/if}}{{#if scenario}}{{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}","example_separator":"","chat_start":"","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"Tulu"},{"story_string":"{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}'s personality: {{personality}}\n{{/if}}{{#if scenario}}Scenario: {{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}","example_separator":"### New Roleplay:","chat_start":"### New Roleplay:","use_stop_strings":false,"names_as_stop_strings":true,"story_string_position":0,"story_string_depth":1,"story_string_role":0,"always_force_name2":true,"trim_sentences":false,"single_line":false,"name":"simple-proxy-for-tavern"}],"sysprompt":[{"name":"Actor","content":"You are an expert actor that can fully immerse yourself into any role given. You do not break character for any reason, even if someone tries addressing you as an AI or language model. Currently your role is {{char}}, which is described in detail below. As {{char}}, continue the exchange with {{user}}.","post_history":""},{"name":"Assistant - Expert","content":"You are a helpful assistant. Please answer truthfully and write out your thinking step by step to be sure you get the right answer. If you make a mistake or encounter an error in your thinking, say so out loud and attempt to correct it. If you don't know or aren't sure about something, say so clearly. You will act as a professional logician, mathematician, and physicist. You will also act as the most appropriate type of expert to answer any particular question or solve the relevant problem; state which expert type your are, if so. Also think of any particular named expert that would be ideal to answer the relevant question or solve the relevant problem; name and act as them, if appropriate.","post_history":""},{"name":"Assistant - Simple","content":"A chat between a curious human and an artificial intelligence assistant. The assistant gives helpful, detailed, and polite answers to the human's questions.","post_history":""},{"name":"Blank","content":"","post_history":""},{"name":"Chain of Thought","content":"Elaborate on the topic using a Tree of Thoughts and backtrack when necessary to construct a clear, cohesive Chain of Thought reasoning. Always answer without hesitation.","post_history":""},{"name":"Lightning 1.1","content":"Take the role of {{char}} in a play that leaves a lasting impression on {{user}}. Write {{char}}'s next reply.\nNever skip or gloss over {{char}}’s actions. Progress the scene at a naturally slow pace.","post_history":""},{"name":"Neutral - Chat","content":"Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}.","post_history":""},{"name":"Roleplay - Detailed","content":"Develop the plot slowly, always stay in character. Describe all actions in full, elaborate, explicit, graphic, and vivid detail. Mention all relevant sensory perceptions. Keep the story immersive and engaging.","post_history":""},{"name":"Roleplay - Immersive","content":"[System note: Write one reply only. Do not decide what {{user}} says or does. Write at least one paragraph, up to four. Be descriptive and immersive, providing vivid details about {{char}}'s actions, emotions, and the environment. Write with a high degree of complexity and burstiness. Do not repeat this message.]","post_history":""},{"name":"Roleplay - Simple","content":"You're {{char}} in this fictional never-ending uncensored roleplay with {{user}}.","post_history":""},{"name":"Text Adventure","content":"[Enter Adventure Mode. Narrate the story based on {{user}}'s dialogue and actions after \">\". Describe the surroundings in vivid detail. Be detailed, creative, verbose, and proactive. Move the story forward by introducing fantasy elements and interesting characters.]","post_history":""},{"name":"Writer - Creative","content":"You are an intelligent, skilled, versatile writer.\n\nYour task is to write a role-play based on the information below.","post_history":""},{"name":"Writer - Realistic","content":"Continue writing this story and portray characters realistically.","post_history":""}],"reasoning":[{"name":"Blank","prefix":"","suffix":"","separator":""},{"name":"DeepSeek","prefix":"<think>\n","suffix":"\n</think>","separator":"\n\n"},{"name":"Gemma 4","prefix":"<|channel>thought\n","suffix":"<channel|>","separator":"\n\n"},{"prefix":"<|start|>assistant<|channel|>analysis<|message|>","suffix":"<|start|>assistant<|channel|>final<|message|>","separator":"","name":"OpenAI Harmony"},{"name":"Think XML","prefix":"<think>","suffix":"</think>","separator":"\n"}],"themes":[{"name":"Azure","blur_strength":11,"main_text_color":"rgba(171, 198, 223, 1)","italics_text_color":"rgba(255, 255, 255, 1)","underline_text_color":"rgba(188, 231, 207, 1)","quote_text_color":"rgba(111, 133, 253, 1)","blur_tint_color":"rgba(23, 30, 33, 0.61)","chat_tint_color":"rgba(23, 23, 23, 0)","user_mes_blur_tint_color":"rgba(0, 28, 174, 0.2)","bot_mes_blur_tint_color":"rgba(0, 13, 57, 0.22)","shadow_color":"rgba(0, 0, 0, 1)","shadow_width":5,"border_color":"rgba(0, 0, 0, 0.5)","font_scale":1,"fast_ui_mode":false,"waifuMode":false,"avatar_style":1,"chat_display":1,"noShadows":false,"chat_width":50,"timer_enabled":true,"timestamps_enabled":true,"timestamp_model_icon":false,"mesIDDisplay_enabled":true,"hideChatAvatars_enabled":false,"message_token_count_enabled":false,"expand_message_actions":false,"enableZenSliders":false,"enableLabMode":false,"hotswap_enabled":true,"custom_css":"","bogus_folders":false,"reduced_motion":false,"compact_input_area":false},{"name":"Cappuccino","blur_strength":3,"main_text_color":"rgba(235, 235, 235, 1)","italics_text_color":"rgba(230, 210, 190, 1)","underline_text_color":"rgba(205, 180, 160, 1)","quote_text_color":"rgba(165, 140, 115, 1)","blur_tint_color":"rgba(34, 30, 32, 0.95)","chat_tint_color":"rgba(50, 45, 50, 0.75)","user_mes_blur_tint_color":"rgba(34, 30, 32, 0.75)","bot_mes_blur_tint_color":"rgba(34, 30, 32, 0.75)","shadow_color":"rgba(0, 0, 0, 0.3)","shadow_width":1,"border_color":"rgba(80, 80, 80, 0.89)","font_scale":1,"fast_ui_mode":false,"waifuMode":false,"avatar_style":0,"chat_display":1,"noShadows":false,"chat_width":50,"timer_enabled":false,"timestamps_enabled":true,"timestamp_model_icon":true,"mesIDDisplay_enabled":true,"hideChatAvatars_enabled":false,"message_token_count_enabled":false,"expand_message_actions":false,"enableZenSliders":false,"enableLabMode":false,"hotswap_enabled":true,"custom_css":"","bogus_folders":true,"reduced_motion":false,"compact_input_area":true},{"name":"Celestial Macaron","blur_strength":10,"main_text_color":"rgba(229, 175, 162, 1)","italics_text_color":"rgba(146, 147, 161, 1)","underline_text_color":"rgba(157, 215, 198, 1)","quote_text_color":"rgba(197, 202, 206, 1)","blur_tint_color":"rgba(23, 36, 55, 0.9)","chat_tint_color":"rgba(18, 26, 40, 0.9)","user_mes_blur_tint_color":"rgba(51, 67, 90, 0.7)","bot_mes_blur_tint_color":"rgba(23, 36, 55, 0.75)","shadow_color":"rgba(0, 0, 0, 0.3)","shadow_width":1,"border_color":"rgba(60, 74, 110, 0.93)","font_scale":1,"fast_ui_mode":false,"waifuMode":false,"avatar_style":0,"chat_display":1,"noShadows":true,"chat_width":58,"timer_enabled":true,"timestamps_enabled":true,"timestamp_model_icon":false,"mesIDDisplay_enabled":true,"hideChatAvatars_enabled":false,"message_token_count_enabled":true,"expand_message_actions":true,"enableZenSliders":false,"enableLabMode":false,"hotswap_enabled":true,"custom_css":"","bogus_folders":true,"zoomed_avatar_magnification":false,"reduced_motion":false,"compact_input_area":true},{"name":"Dark Lite","blur_strength":10,"main_text_color":"rgba(220, 220, 210, 1)","italics_text_color":"rgba(145, 145, 145, 1)","underline_text_color":"rgba(188, 231, 207, 1)","quote_text_color":"rgba(225, 138, 36, 1)","blur_tint_color":"rgba(23, 23, 23, 1)","chat_tint_color":"rgba(23, 23, 23, 1)","user_mes_blur_tint_color":"rgba(30, 30, 30, 0.9)","bot_mes_blur_tint_color":"rgba(30, 30, 30, 0.9)","shadow_color":"rgba(0, 0, 0, 1)","shadow_width":2,"border_color":"rgba(0, 0, 0, 1)","font_scale":1,"fast_ui_mode":true,"waifuMode":false,"avatar_style":0,"chat_display":0,"noShadows":true,"chat_width":50,"timer_enabled":false,"timestamps_enabled":true,"timestamp_model_icon":true,"mesIDDisplay_enabled":false,"hideChatAvatars_enabled":false,"message_token_count_enabled":false,"expand_message_actions":false,"enableZenSliders":"","enableLabMode":"","hotswap_enabled":true,"custom_css":"","bogus_folders":true,"reduced_motion":false,"compact_input_area":true},{"name":"Dark V 1.0","blur_strength":13,"main_text_color":"rgba(207, 207, 197, 1)","italics_text_color":"rgba(145, 145, 145, 1)","underline_text_color":"rgba(145, 145, 145, 1)","quote_text_color":"rgba(198, 193, 151, 1)","blur_tint_color":"rgba(29, 33, 40, 0.9)","chat_tint_color":"rgba(29, 33, 40, 0.9)","user_mes_blur_tint_color":"rgba(29, 33, 40, 0.9)","bot_mes_blur_tint_color":"rgba(29, 33, 40, 0.9)","shadow_color":"rgba(0, 0, 0, 0.9)","shadow_width":2,"border_color":"rgba(0, 0, 0, 1)","font_scale":1,"fast_ui_mode":false,"waifuMode":false,"avatar_style":0,"chat_display":0,"noShadows":false,"chat_width":55,"timer_enabled":false,"timestamps_enabled":false,"timestamp_model_icon":false,"mesIDDisplay_enabled":false,"hideChatAvatars_enabled":false,"message_token_count_enabled":false,"expand_message_actions":false,"enableZenSliders":false,"enableLabMode":false,"hotswap_enabled":true,"custom_css":"","bogus_folders":true,"zoomed_avatar_magnification":true,"reduced_motion":true,"compact_input_area":false}],"movingUIPresets":[{"name":"Default","movingUIState":{}}],"quickReplyPresets":[{"name":"Default","quickReplyEnabled":true,"quickReplySlots":[{"mes":"/?","label":"HELP","enabled":true},{"mes":"/newchat","label":"New Chat","enabled":true},{"mes":"/bgcol","label":"Match UI to Background","enabled":true}],"numberOfSlots":3,"selectedPreset":"Default"}],"openai_settings":["{\"chat_completion_source\":\"openai\",\"openai_model\":\"gpt-5.6-terra\",\"claude_model\":\"claude-sonnet-5\",\"openrouter_model\":\"OR_Website\",\"openrouter_use_fallback\":false,\"openrouter_group_models\":false,\"openrouter_sort_models\":\"alphabetically\",\"ai21_model\":\"jamba-large\",\"mistralai_model\":\"mistral-large-latest\",\"chutes_model\":\"deepseek-ai/DeepSeek-V3-0324\",\"chutes_sort_models\":\"alphabetically\",\"minimax_model\":\"MiniMax-M2.7\",\"minimax_endpoint\":\"global\",\"electronhub_model\":\"gpt-4o-mini\",\"electronhub_sort_models\":\"alphabetically\",\"electronhub_group_models\":false,\"custom_model\":\"\",\"custom_url\":\"\",\"custom_include_body\":\"\",\"custom_exclude_body\":\"\",\"custom_include_headers\":\"\",\"google_model\":\"gemini-3.7-flash\",\"vertexai_model\":\"gemini-3.7-flash\",\"temperature\":1,\"frequency_penalty\":0,\"presence_penalty\":0,\"top_p\":1,\"top_k\":0,\"top_a\":0,\"min_p\":0,\"repetition_penalty\":1,\"openai_max_context\":4095,\"openai_max_tokens\":300,\"names_behavior\":0,\"send_if_empty\":\"\",\"impersonation_prompt\":\"[Write your next reply from the point of view of {{user}}, using the chat history so far as a guideline for the writing style of {{user}}. Don't write as {{char}} or system. Don't describe actions of {{char}}.]\",\"new_chat_prompt\":\"[Start a new Chat]\",\"new_group_chat_prompt\":\"[Start a new group chat. Group members: {{group}}]\",\"new_example_chat_prompt\":\"[Example Chat]\",\"continue_nudge_prompt\":\"[Continue your last message without repeating its original content.]\",\"bias_preset_selected\":\"Default (none)\",\"reverse_proxy\":\"\",\"proxy_password\":\"\",\"max_context_unlocked\":false,\"wi_format\":\"{0}\",\"scenario_format\":\"{{scenario}}\",\"personality_format\":\"{{personality}}\",\"group_nudge_prompt\":\"[Write the next reply only as {{char}}.]\",\"stream_openai\":true,\"prompts\":[{\"name\":\"Main Prompt\",\"system_prompt\":true,\"role\":\"system\",\"content\":\"Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}.\",\"identifier\":\"main\"},{\"name\":\"Auxiliary Prompt\",\"system_prompt\":true,\"role\":\"system\",\"content\":\"\",\"identifier\":\"nsfw\"},{\"identifier\":\"dialogueExamples\",\"name\":\"Chat Examples\",\"system_prompt\":true,\"marker\":true},{\"name\":\"Post-History Instructions\",\"system_prompt\":true,\"role\":\"system\",\"content\":\"\",\"identifier\":\"jailbreak\"},{\"identifier\":\"chatHistory\",\"name\":\"Chat History\",\"system_prompt\":true,\"marker\":true},{\"identifier\":\"worldInfoAfter\",\"name\":\"World Info (after)\",\"system_prompt\":true,\"marker\":true},{\"identifier\":\"worldInfoBefore\",\"name\":\"World Info (before)\",\"system_prompt\":true,\"marker\":true},{\"identifier\":\"enhanceDefinitions\",\"role\":\"system\",\"name\":\"Enhance Definitions\",\"content\":\"If you have more knowledge of {{char}}, add to the character's lore and personality to enhance them but keep the Character Sheet's definitions absolute.\",\"system_prompt\":true,\"marker\":false},{\"identifier\":\"charDescription\",\"name\":\"Char Description\",\"system_prompt\":true,\"marker\":true},{\"identifier\":\"charPersonality\",\"name\":\"Char Personality\",\"system_prompt\":true,\"marker\":true},{\"identifier\":\"scenario\",\"name\":\"Scenario\",\"system_prompt\":true,\"marker\":true},{\"identifier\":\"personaDescription\",\"name\":\"Persona Description\",\"system_prompt\":true,\"marker\":true}],\"prompt_order\":[{\"character_id\":100000,\"order\":[{\"identifier\":\"main\",\"enabled\":true},{\"identifier\":\"worldInfoBefore\",\"enabled\":true},{\"identifier\":\"charDescription\",\"enabled\":true},{\"identifier\":\"charPersonality\",\"enabled\":true},{\"identifier\":\"scenario\",\"enabled\":true},{\"identifier\":\"enhanceDefinitions\",\"enabled\":false},{\"identifier\":\"nsfw\",\"enabled\":true},{\"identifier\":\"worldInfoAfter\",\"enabled\":true},{\"identifier\":\"dialogueExamples\",\"enabled\":true},{\"identifier\":\"chatHistory\",\"enabled\":true},{\"identifier\":\"jailbreak\",\"enabled\":true}]},{\"character_id\":100001,\"order\":[{\"identifier\":\"main\",\"enabled\":true},{\"identifier\":\"worldInfoBefore\",\"enabled\":true},{\"identifier\":\"personaDescription\",\"enabled\":true},{\"identifier\":\"charDescription\",\"enabled\":true},{\"identifier\":\"charPersonality\",\"enabled\":true},{\"identifier\":\"scenario\",\"enabled\":true},{\"identifier\":\"enhanceDefinitions\",\"enabled\":false},{\"identifier\":\"nsfw\",\"enabled\":true},{\"identifier\":\"worldInfoAfter\",\"enabled\":true},{\"identifier\":\"dialogueExamples\",\"enabled\":true},{\"identifier\":\"chatHistory\",\"enabled\":true},{\"identifier\":\"jailbreak\",\"enabled\":true}]}],\"show_external_models\":false,\"assistant_prefill\":\"\",\"assistant_impersonation\":\"\",\"use_sysprompt\":false,\"squash_system_messages\":false,\"media_inlining\":true,\"bypass_status_check\":false,\"continue_prefill\":false,\"continue_postfix\":\" \",\"seed\":-1,\"n\":1}"],"openai_setting_names":["Unknown"],"koboldai_settings":["{\"temp\":0,\"rep_pen\":1,\"rep_pen_range\":0,\"top_p\":0,\"min_p\":0,\"top_a\":0,\"top_k\":1,\"typical\":1,\"tfs\":1,\"rep_pen_slope\":0,\"sampler_order\":[6,0,1,3,4,2,5],\"mirostat\":0,\"mirostat_tau\":5,\"mirostat_eta\":0.1,\"use_default_badwordsids\":false,\"grammar\":\"\"}","{\"temp\":1,\"rep_pen\":1,\"rep_pen_range\":0,\"top_p\":1,\"min_p\":0,\"top_a\":0,\"top_k\":0,\"typical\":1,\"tfs\":1,\"rep_pen_slope\":0,\"sampler_order\":[6,0,1,3,4,2,5],\"mirostat\":0,\"mirostat_tau\":5,\"mirostat_eta\":0.1,\"use_default_badwordsids\":false,\"grammar\":\"\"}","{\"temp\":1,\"rep_pen\":1.1,\"rep_pen_range\":600,\"top_p\":0.95,\"min_p\":0.01,\"top_a\":0,\"top_k\":0,\"typical\":1,\"tfs\":1,\"rep_pen_slope\":0,\"sampler_order\":[6,0,1,2,3,4,5],\"mirostat\":0,\"mirostat_tau\":5,\"mirostat_eta\":0.1,\"use_default_badwordsids\":false,\"grammar\":\"\"}","{\"temp\":1.5,\"rep_pen\":1,\"rep_pen_range\":0,\"top_p\":1,\"min_p\":0.1,\"top_a\":0,\"top_k\":0,\"typical\":1,\"tfs\":1,\"rep_pen_slope\":0,\"sampler_order\":[5,6,0,1,2,3,4],\"mirostat\":0,\"mirostat_tau\":5,\"mirostat_eta\":0.1,\"use_default_badwordsids\":false,\"grammar\":\"\"}","{\"temp\":1.25,\"rep_pen\":1,\"rep_pen_range\":0,\"top_p\":1,\"min_p\":0.1,\"top_a\":0,\"top_k\":0,\"typical\":1,\"tfs\":1,\"rep_pen_slope\":0,\"sampler_order\":[5,6,0,1,2,3,4],\"mirostat\":0,\"mirostat_tau\":5,\"mirostat_eta\":0.1,\"use_default_badwordsids\":false,\"grammar\":\"\"}","{\"temp\":2,\"rep_pen\":1,\"rep_pen_range\":0,\"top_p\":1,\"min_p\":0.1,\"top_a\":0,\"top_k\":0,\"typical\":1,\"tfs\":1,\"rep_pen_slope\":0,\"sampler_order\":[5,6,0,1,2,3,4],\"mirostat\":0,\"mirostat_tau\":5,\"mirostat_eta\":0.1,\"use_default_badwordsids\":false,\"grammar\":\"\"}"],"koboldai_setting_names":["Unknown","Unknown","Unknown","Unknown","Unknown","Unknown"],"novelai_settings":["{\"order\":[5,0,1,3],\"temperature\":1.16,\"max_length\":150,\"min_length\":1,\"top_k\":175,\"typical_p\":0.96,\"tail_free_sampling\":0.994,\"repetition_penalty\":1.68,\"repetition_penalty_range\":2240,\"repetition_penalty_slope\":1.5,\"repetition_penalty_frequency\":0,\"repetition_penalty_presence\":0.005,\"use_cache\":false,\"return_full_text\":false,\"prefix\":\"vanilla\",\"phrase_rep_pen\":\"medium\",\"max_context\":7800,\"min_p\":0,\"math1_temp\":1,\"math1_quad\":0,\"math1_quad_entropy_scale\":0}","{\"order\":[0,1,2,3],\"temperature\":1,\"max_length\":150,\"min_length\":1,\"top_k\":25,\"top_p\":1,\"tail_free_sampling\":0.925,\"repetition_penalty\":1.6,\"repetition_penalty_frequency\":0.001,\"repetition_penalty_range\":0,\"repetition_penalty_presence\":0,\"use_cache\":false,\"return_full_text\":false,\"prefix\":\"vanilla\",\"phrase_rep_pen\":\"medium\",\"max_context\":7800,\"min_p\":0,\"math1_temp\":1,\"math1_quad\":0,\"math1_quad_entropy_scale\":0}","{\"order\":[2,3,1,0],\"temperature\":1,\"max_length\":150,\"min_length\":1,\"top_k\":0,\"top_p\":0.96,\"tail_free_sampling\":0.96,\"repetition_penalty\":2,\"repetition_penalty_slope\":1,\"repetition_penalty_frequency\":0.02,\"repetition_penalty_range\":0,\"repetition_penalty_presence\":0.3,\"use_cache\":false,\"return_full_text\":false,\"prefix\":\"vanilla\",\"phrase_rep_pen\":\"very_aggressive\",\"max_context\":7800,\"min_p\":0,\"math1_temp\":1,\"math1_quad\":0,\"math1_quad_entropy_scale\":0}","{\"order\":[2,3,0,4,1],\"temperature\":1.35,\"max_length\":150,\"min_length\":1,\"top_k\":15,\"top_p\":0.85,\"top_a\":0.1,\"tail_free_sampling\":0.915,\"repetition_penalty\":2.8,\"repetition_penalty_range\":2048,\"repetition_penalty_slope\":0.02,\"repetition_penalty_frequency\":0.02,\"repetition_penalty_presence\":0,\"use_cache\":false,\"return_full_text\":false,\"prefix\":\"vanilla\",\"phrase_rep_pen\":\"aggressive\",\"max_context\":7800,\"min_p\":0,\"math1_temp\":1,\"math1_quad\":0,\"math1_quad_entropy_scale\":0}","{\"order\":[8,5,0,3],\"temperature\":0.9,\"max_length\":150,\"min_length\":1,\"typical_p\":0.95,\"tail_free_sampling\":0.92,\"mirostat_lr\":0.22,\"mirostat_tau\":4.95,\"repetition_penalty\":3,\"repetition_penalty_range\":4000,\"repetition_penalty_frequency\":0,\"repetition_penalty_presence\":0,\"use_cache\":false,\"return_full_text\":false,\"prefix\":\"vanilla\",\"phrase_rep_pen\":\"off\",\"max_context\":7800,\"min_p\":0,\"math1_temp\":1,\"math1_quad\":0,\"math1_quad_entropy_scale\":0}","{\"order\":[4,0,5,3,2],\"temperature\":1.09,\"max_length\":150,\"min_length\":1,\"top_p\":0.969,\"top_a\":0.09,\"typical_p\":0.99,\"tail_free_sampling\":0.969,\"repetition_penalty\":1.09,\"repetition_penalty_range\":8192,\"repetition_penalty_slope\":0.069,\"repetition_penalty_frequency\":0.006,\"repetition_penalty_presence\":0.009,\"use_cache\":false,\"return_full_text\":false,\"prefix\":\"vanilla\",\"phrase_rep_pen\":\"very_light\",\"max_context\":7800,\"min_p\":0,\"math1_temp\":1,\"math1_quad\":0,\"math1_quad_entropy_scale\":0}","{\"max_context\":8000,\"temperature\":1.37,\"max_length\":150,\"min_length\":1,\"top_k\":0,\"top_p\":1,\"top_a\":0.1,\"typical_p\":0.875,\"tail_free_sampling\":0.87,\"repetition_penalty\":3.25,\"repetition_penalty_range\":6000,\"repetition_penalty_slope\":3.25,\"repetition_penalty_frequency\":0,\"repetition_penalty_presence\":0,\"phrase_rep_pen\":\"off\",\"mirostat_lr\":0.2,\"mirostat_tau\":4,\"math1_temp\":0.9,\"math1_quad\":0.07,\"math1_quad_entropy_scale\":-0.05,\"min_p\":0.035,\"order\":[0,5,9,10,8,4]}","{\"max_context\":8000,\"temperature\":1,\"max_length\":150,\"min_length\":1,\"top_k\":0,\"top_p\":0.995,\"top_a\":1,\"typical_p\":1,\"tail_free_sampling\":0.87,\"repetition_penalty\":1.5,\"repetition_penalty_range\":2240,\"repetition_penalty_slope\":1,\"repetition_penalty_frequency\":0,\"repetition_penalty_presence\":0,\"phrase_rep_pen\":\"light\",\"mirostat_lr\":1,\"mirostat_tau\":0,\"math1_temp\":0.3,\"math1_quad\":0.19,\"math1_quad_entropy_scale\":0,\"min_p\":0,\"order\":[9,2]}","{\"max_context\":8000,\"temperature\":1,\"max_length\":150,\"min_length\":1,\"top_k\":50,\"top_p\":0.85,\"top_a\":1,\"typical_p\":1,\"tail_free_sampling\":0.895,\"repetition_penalty\":1.63,\"repetition_penalty_range\":1024,\"repetition_penalty_slope\":3.33,\"repetition_penalty_frequency\":0.0035,\"repetition_penalty_presence\":0,\"phrase_rep_pen\":\"medium\",\"mirostat_lr\":1,\"mirostat_tau\":0,\"math1_temp\":0.3,\"math1_quad\":0.0645,\"math1_quad_entropy_scale\":0.05,\"min_p\":0.05,\"order\":[9,10]}","{\"max_context\":8000,\"temperature\":1,\"max_length\":150,\"min_length\":1,\"top_k\":300,\"top_p\":0.98,\"top_a\":0.004,\"typical_p\":0.96,\"tail_free_sampling\":0.96,\"repetition_penalty\":1.48,\"repetition_penalty_range\":2240,\"repetition_penalty_slope\":0.64,\"repetition_penalty_frequency\":0,\"repetition_penalty_presence\":0,\"phrase_rep_pen\":\"medium\",\"mirostat_lr\":1,\"mirostat_tau\":0,\"math1_temp\":-0.0485,\"math1_quad\":0.145,\"math1_quad_entropy_scale\":0,\"min_p\":0.02,\"order\":[9,10]}","{\"max_context\":8000,\"temperature\":1,\"max_length\":150,\"min_length\":1,\"top_k\":0,\"top_p\":0.99,\"top_a\":1,\"typical_p\":1,\"tail_free_sampling\":0.99,\"repetition_penalty\":1,\"repetition_penalty_range\":64,\"repetition_penalty_slope\":1,\"repetition_penalty_frequency\":0.75,\"repetition_penalty_presence\":1.5,\"phrase_rep_pen\":\"medium\",\"mirostat_lr\":1,\"mirostat_tau\":1,\"math1_temp\":-0.4,\"math1_quad\":0.6,\"math1_quad_entropy_scale\":-0.1,\"min_p\":0.08,\"order\":[9,2]}","{\"order\":[0,1,2,3],\"temperature\":1,\"max_length\":40,\"min_length\":1,\"top_k\":25,\"top_p\":1,\"top_a\":0,\"typical_p\":1,\"tail_free_sampling\":0.925,\"repetition_penalty\":1.9,\"repetition_penalty_range\":768,\"repetition_penalty_slope\":3.33,\"repetition_penalty_frequency\":0.0025,\"repetition_penalty_presence\":0.001,\"use_cache\":false,\"return_full_text\":false,\"prefix\":\"vanilla\",\"phrase_rep_pen\":\"very_light\",\"max_context\":7800,\"min_p\":0,\"math1_temp\":1,\"math1_quad\":0,\"math1_quad_entropy_scale\":0}","{\"order\":[0,1,2,3],\"temperature\":1,\"max_length\":150,\"min_length\":1,\"top_k\":25,\"top_p\":1,\"tail_free_sampling\":0.925,\"repetition_penalty\":1.9,\"repetition_penalty_range\":768,\"repetition_penalty_slope\":1,\"repetition_penalty_frequency\":0.0025,\"repetition_penalty_presence\":0.001,\"use_cache\":false,\"return_full_text\":false,\"prefix\":\"vanilla\",\"phrase_rep_pen\":\"off\",\"max_context\":7800,\"min_p\":0,\"math1_temp\":1,\"math1_quad\":0,\"math1_quad_entropy_scale\":0}","{\"order\":[0,8,5,3],\"temperature\":1.5,\"max_length\":150,\"min_length\":1,\"typical_p\":0.95,\"tail_free_sampling\":0.95,\"mirostat_lr\":0.2,\"mirostat_tau\":5.5,\"repetition_penalty\":1,\"repetition_penalty_range\":1632,\"repetition_penalty_frequency\":0,\"repetition_penalty_presence\":0,\"use_cache\":false,\"return_full_text\":false,\"prefix\":\"vanilla\",\"phrase_rep_pen\":\"very_aggressive\",\"max_context\":7800,\"min_p\":0,\"math1_temp\":1,\"math1_quad\":0,\"math1_quad_entropy_scale\":0}","{\"order\":[4,5,0,3],\"temperature\":1.18,\"max_length\":40,\"min_length\":1,\"top_a\":0.022,\"top_k\":0,\"top_p\":1,\"typical_p\":0.9,\"tail_free_sampling\":0.956,\"repetition_penalty\":1.25,\"repetition_penalty_range\":4096,\"repetition_penalty_slope\":0.9,\"repetition_penalty_frequency\":0,\"repetition_penalty_presence\":0,\"use_cache\":false,\"return_full_text\":false,\"prefix\":\"vanilla\",\"phrase_rep_pen\":\"very_light\",\"max_context\":7800,\"min_p\":0,\"math1_temp\":1,\"math1_quad\":0,\"math1_quad_entropy_scale\":0}","{\"order\":[0,4,1,5,3],\"temperature\":1.155,\"max_length\":40,\"min_length\":1,\"top_k\":25,\"top_a\":0.3,\"top_p\":1,\"typical_p\":0.96,\"tail_free_sampling\":0.895,\"repetition_penalty\":1.0125,\"repetition_penalty_range\":2048,\"repetition_penalty_slope\":3.33,\"repetition_penalty_frequency\":0.011,\"repetition_penalty_presence\":0.005,\"use_cache\":false,\"return_full_text\":false,\"prefix\":\"vanilla\",\"phrase_rep_pen\":\"very_light\",\"max_context\":7800,\"min_p\":0,\"math1_temp\":1,\"math1_quad\":0,\"math1_quad_entropy_scale\":0}","{\"order\":[0,4,1,2,5,3],\"temperature\":1.31,\"max_length\":150,\"min_length\":1,\"top_k\":25,\"top_p\":0.97,\"top_a\":0.18,\"typical_p\":0.98,\"tail_free_sampling\":1,\"repetition_penalty\":1.55,\"repetition_penalty_frequency\":0.00075,\"repetition_penalty_presence\":0.00085,\"repetition_penalty_range\":8192,\"repetition_penalty_slope\":1.8,\"use_cache\":false,\"return_full_text\":false,\"prefix\":\"vanilla\",\"phrase_rep_pen\":\"medium\",\"max_context\":7800,\"min_p\":0,\"math1_temp\":1,\"math1_quad\":0,\"math1_quad_entropy_scale\":0}","{\"order\":[3,4,5,0],\"temperature\":1.06,\"max_length\":150,\"min_length\":1,\"top_a\":0.146,\"typical_p\":0.976,\"tail_free_sampling\":0.969,\"repetition_penalty\":1.86,\"repetition_penalty_slope\":2.33,\"repetition_penalty_frequency\":0,\"repetition_penalty_presence\":0,\"repetition_penalty_range\":2048,\"use_cache\":false,\"return_full_text\":false,\"prefix\":\"vanilla\",\"phrase_rep_pen\":\"medium\",\"max_context\":7800,\"min_p\":0,\"math1_temp\":1,\"math1_quad\":0,\"math1_quad_entropy_scale\":0}","{\"order\":[3,0,5],\"temperature\":2.5,\"max_length\":150,\"min_length\":1,\"typical_p\":0.969,\"tail_free_sampling\":0.941,\"repetition_penalty\":1,\"repetition_penalty_range\":1024,\"repetition_penalty_frequency\":0,\"repetition_penalty_presence\":0,\"use_cache\":false,\"return_full_text\":false,\"prefix\":\"vanilla\",\"phrase_rep_pen\":\"medium\",\"max_context\":7800,\"min_p\":0,\"math1_temp\":1,\"math1_quad\":0,\"math1_quad_entropy_scale\":0}","{\"order\":[1,5,0,2,3,4],\"temperature\":1.5,\"max_length\":150,\"min_length\":1,\"top_k\":10,\"top_p\":0.75,\"top_a\":0.08,\"typical_p\":0.975,\"tail_free_sampling\":0.967,\"repetition_penalty\":2.25,\"repetition_penalty_range\":8192,\"repetition_penalty_slope\":0.09,\"repetition_penalty_frequency\":0,\"repetition_penalty_presence\":0.005,\"use_cache\":false,\"return_full_text\":false,\"prefix\":\"vanilla\",\"phrase_rep_pen\":\"very_light\",\"max_context\":7800,\"min_p\":0,\"math1_temp\":1,\"math1_quad\":0,\"math1_quad_entropy_scale\":0}","{\"order\":[5,0,4],\"temperature\":1,\"max_length\":150,\"min_length\":1,\"top_a\":0.017,\"typical_p\":0.975,\"repetition_penalty\":3,\"repetition_penalty_slope\":0.09,\"repetition_penalty_frequency\":0,\"repetition_penalty_presence\":0,\"repetition_penalty_range\":7680,\"use_cache\":false,\"return_full_text\":false,\"prefix\":\"vanilla\",\"phrase_rep_pen\":\"aggressive\",\"max_context\":7800,\"min_p\":0,\"math1_temp\":1,\"math1_quad\":0,\"math1_quad_entropy_scale\":0}","{\"order\":[0,5],\"temperature\":0.895,\"max_length\":150,\"min_length\":1,\"typical_p\":0.9,\"repetition_penalty\":2,\"repetition_penalty_slope\":3.2,\"repetition_penalty_frequency\":0,\"repetition_penalty_presence\":0,\"repetition_penalty_range\":4048,\"use_cache\":false,\"return_full_text\":false,\"prefix\":\"vanilla\",\"phrase_rep_pen\":\"aggressive\",\"max_context\":7800,\"min_p\":0,\"math1_temp\":1,\"math1_quad\":0,\"math1_quad_entropy_scale\":0}","{\"order\":[0,5,3,2,1],\"temperature\":1.21,\"max_length\":40,\"min_length\":1,\"top_k\":0,\"top_p\":0.912,\"top_a\":1,\"typical_p\":0.912,\"tail_free_sampling\":0.921,\"repetition_penalty\":1.21,\"repetition_penalty_range\":321,\"repetition_penalty_slope\":3.33,\"repetition_penalty_frequency\":0.00621,\"repetition_penalty_presence\":0,\"use_cache\":false,\"return_full_text\":false,\"prefix\":\"vanilla\",\"phrase_rep_pen\":\"very_light\",\"max_context\":7800,\"min_p\":0,\"math1_temp\":1,\"math1_quad\":0,\"math1_quad_entropy_scale\":0}","{\"order\":[8,0,5,3,2,4],\"temperature\":1.5,\"max_length\":150,\"min_length\":1,\"top_a\":0.02,\"top_p\":0.95,\"typical_p\":0.95,\"tail_free_sampling\":0.95,\"mirostat_lr\":0.25,\"mirostat_tau\":5,\"repetition_penalty\":1.625,\"repetition_penalty_range\":2016,\"repetition_penalty_frequency\":0,\"repetition_penalty_presence\":0,\"use_cache\":false,\"return_full_text\":false,\"prefix\":\"vanilla\",\"phrase_rep_pen\":\"very_aggressive\",\"max_context\":7800,\"min_p\":0,\"math1_temp\":1,\"math1_quad\":0,\"math1_quad_entropy_scale\":0}"],"novelai_setting_names":["Unknown","Unknown","Unknown","Unknown","Unknown","Unknown","Unknown","Unknown","Unknown","Unknown","Unknown","Unknown","Unknown","Unknown","Unknown","Unknown","Unknown","Unknown","Unknown","Unknown","Unknown","Unknown","Unknown","Unknown"],"textgenerationwebui_presets":["{\"temp\":1,\"temperature_last\":true,\"top_p\":0.95,\"top_k\":0,\"top_a\":0,\"tfs\":1,\"epsilon_cutoff\":0,\"eta_cutoff\":0,\"typical_p\":1,\"min_p\":0.01,\"rep_pen\":1.1,\"rep_pen_range\":0,\"rep_pen_decay\":0,\"rep_pen_slope\":1,\"no_repeat_ngram_size\":0,\"penalty_alpha\":0,\"num_beams\":1,\"length_penalty\":1,\"min_length\":0,\"encoder_rep_pen\":1,\"freq_pen\":0,\"presence_pen\":0,\"skew\":0,\"do_sample\":true,\"early_stopping\":false,\"dynatemp\":false,\"min_temp\":0,\"max_temp\":2,\"dynatemp_exponent\":1,\"smoothing_factor\":0,\"smoothing_curve\":1,\"dry_allowed_length\":2,\"dry_multiplier\":0,\"dry_base\":1.75,\"dry_sequence_breakers\":\"[\\\"\\\\n\\\", \\\":\\\", \\\"\\\\\\\"\\\", \\\"*\\\"]\",\"dry_penalty_last_n\":0,\"add_bos_token\":true,\"ban_eos_token\":false,\"skip_special_tokens\":true,\"mirostat_mode\":0,\"mirostat_tau\":5,\"mirostat_eta\":0.1,\"guidance_scale\":1,\"negative_prompt\":\"\",\"grammar_string\":\"\",\"json_schema\":null,\"json_schema_allow_empty\":false,\"banned_tokens\":\"\",\"sampler_priority\":[\"repetition_penalty\",\"presence_penalty\",\"frequency_penalty\",\"dry\",\"temperature\",\"dynamic_temperature\",\"quadratic_sampling\",\"top_n_sigma\",\"top_k\",\"top_p\",\"typical_p\",\"epsilon_cutoff\",\"eta_cutoff\",\"tfs\",\"top_a\",\"min_p\",\"mirostat\",\"xtc\",\"encoder_repetition_penalty\",\"no_repeat_ngram\"],\"samplers\":[\"penalties\",\"dry\",\"top_n_sigma\",\"top_k\",\"typ_p\",\"tfs_z\",\"typical_p\",\"xtc\",\"top_p\",\"min_p\",\"temperature\"],\"samplers_priorities\":[\"dry\",\"penalties\",\"no_repeat_ngram\",\"temperature\",\"top_nsigma\",\"top_p_top_k\",\"top_a\",\"min_p\",\"tfs\",\"eta_cutoff\",\"epsilon_cutoff\",\"typical_p\",\"quadratic\",\"xtc\"],\"ignore_eos_token\":false,\"spaces_between_special_tokens\":true,\"speculative_ngram\":false,\"sampler_order\":[6,0,1,3,4,2,5],\"logit_bias\":[],\"xtc_threshold\":0.1,\"xtc_probability\":0,\"nsigma\":0,\"min_keep\":0,\"rep_pen_size\":0}","{\"temp\":0,\"temperature_last\":true,\"top_p\":0,\"top_k\":1,\"top_a\":0,\"tfs\":1,\"epsilon_cutoff\":0,\"eta_cutoff\":0,\"typical_p\":1,\"min_p\":0,\"rep_pen\":1,\"rep_pen_range\":0,\"rep_pen_decay\":0,\"rep_pen_slope\":1,\"no_repeat_ngram_size\":0,\"penalty_alpha\":0,\"num_beams\":1,\"length_penalty\":1,\"min_length\":0,\"encoder_rep_pen\":1,\"freq_pen\":0,\"presence_pen\":0,\"skew\":0,\"do_sample\":false,\"early_stopping\":false,\"dynatemp\":false,\"min_temp\":0,\"max_temp\":2,\"dynatemp_exponent\":1,\"smoothing_factor\":0,\"smoothing_curve\":1,\"dry_allowed_length\":2,\"dry_multiplier\":0,\"dry_base\":1.75,\"dry_sequence_breakers\":\"[\\\"\\\\n\\\", \\\":\\\", \\\"\\\\\\\"\\\", \\\"*\\\"]\",\"dry_penalty_last_n\":0,\"add_bos_token\":true,\"ban_eos_token\":false,\"skip_special_tokens\":true,\"mirostat_mode\":0,\"mirostat_tau\":5,\"mirostat_eta\":0.1,\"guidance_scale\":1,\"negative_prompt\":\"\",\"grammar_string\":\"\",\"json_schema\":null,\"json_schema_allow_empty\":false,\"banned_tokens\":\"\",\"sampler_priority\":[\"repetition_penalty\",\"presence_penalty\",\"frequency_penalty\",\"dry\",\"temperature\",\"dynamic_temperature\",\"quadratic_sampling\",\"top_n_sigma\",\"top_k\",\"top_p\",\"typical_p\",\"epsilon_cutoff\",\"eta_cutoff\",\"tfs\",\"top_a\",\"min_p\",\"mirostat\",\"xtc\",\"encoder_repetition_penalty\",\"no_repeat_ngram\"],\"samplers\":[\"penalties\",\"dry\",\"top_n_sigma\",\"top_k\",\"typ_p\",\"tfs_z\",\"typical_p\",\"xtc\",\"top_p\",\"min_p\",\"temperature\"],\"samplers_priorities\":[\"dry\",\"penalties\",\"no_repeat_ngram\",\"temperature\",\"top_nsigma\",\"top_p_top_k\",\"top_a\",\"min_p\",\"tfs\",\"eta_cutoff\",\"epsilon_cutoff\",\"typical_p\",\"quadratic\",\"xtc\"],\"ignore_eos_token\":false,\"spaces_between_special_tokens\":true,\"speculative_ngram\":false,\"sampler_order\":[6,0,1,3,4,2,5],\"logit_bias\":[],\"xtc_threshold\":0.1,\"xtc_probability\":0,\"nsigma\":0,\"min_keep\":0,\"rep_pen_size\":0}","{\"temp\":1,\"temperature_last\":true,\"top_p\":1,\"top_k\":0,\"top_a\":0,\"tfs\":1,\"epsilon_cutoff\":0,\"eta_cutoff\":0,\"typical_p\":1,\"min_p\":0,\"rep_pen\":1,\"rep_pen_range\":0,\"rep_pen_decay\":0,\"rep_pen_slope\":1,\"no_repeat_ngram_size\":0,\"penalty_alpha\":0,\"num_beams\":1,\"length_penalty\":1,\"min_length\":0,\"encoder_rep_pen\":1,\"freq_pen\":0,\"presence_pen\":0,\"skew\":0,\"do_sample\":true,\"early_stopping\":false,\"dynatemp\":false,\"min_temp\":0,\"max_temp\":2,\"dynatemp_exponent\":1,\"smoothing_factor\":0,\"smoothing_curve\":1,\"dry_allowed_length\":2,\"dry_multiplier\":0,\"dry_base\":1.75,\"dry_sequence_breakers\":\"[\\\"\\\\n\\\", \\\":\\\", \\\"\\\\\\\"\\\", \\\"*\\\"]\",\"dry_penalty_last_n\":0,\"add_bos_token\":true,\"ban_eos_token\":false,\"skip_special_tokens\":true,\"mirostat_mode\":0,\"mirostat_tau\":5,\"mirostat_eta\":0.1,\"guidance_scale\":1,\"negative_prompt\":\"\",\"grammar_string\":\"\",\"json_schema\":null,\"json_schema_allow_empty\":false,\"banned_tokens\":\"\",\"sampler_priority\":[\"repetition_penalty\",\"presence_penalty\",\"frequency_penalty\",\"dry\",\"temperature\",\"dynamic_temperature\",\"quadratic_sampling\",\"top_n_sigma\",\"top_k\",\"top_p\",\"typical_p\",\"epsilon_cutoff\",\"eta_cutoff\",\"tfs\",\"top_a\",\"min_p\",\"mirostat\",\"xtc\",\"encoder_repetition_penalty\",\"no_repeat_ngram\"],\"samplers\":[\"penalties\",\"dry\",\"top_n_sigma\",\"top_k\",\"typ_p\",\"tfs_z\",\"typical_p\",\"xtc\",\"top_p\",\"min_p\",\"temperature\"],\"samplers_priorities\":[\"dry\",\"penalties\",\"no_repeat_ngram\",\"temperature\",\"top_nsigma\",\"top_p_top_k\",\"top_a\",\"min_p\",\"tfs\",\"eta_cutoff\",\"epsilon_cutoff\",\"typical_p\",\"quadratic\",\"xtc\"],\"ignore_eos_token\":false,\"spaces_between_special_tokens\":true,\"speculative_ngram\":false,\"sampler_order\":[6,0,1,3,4,2,5],\"logit_bias\":[],\"xtc_threshold\":0.1,\"xtc_probability\":0,\"nsigma\":0,\"min_keep\":0,\"rep_pen_size\":0}","{\"temp\":1.5,\"temperature_last\":false,\"top_p\":1,\"top_k\":0,\"top_a\":0,\"tfs\":1,\"epsilon_cutoff\":0,\"eta_cutoff\":0,\"typical_p\":1,\"min_p\":0.1,\"rep_pen\":1,\"rep_pen_range\":0,\"rep_pen_decay\":0,\"rep_pen_slope\":1,\"no_repeat_ngram_size\":0,\"penalty_alpha\":0,\"num_beams\":1,\"length_penalty\":1,\"min_length\":0,\"encoder_rep_pen\":1,\"freq_pen\":0,\"presence_pen\":0,\"skew\":0,\"do_sample\":true,\"early_stopping\":false,\"dynatemp\":false,\"min_temp\":0,\"max_temp\":2,\"dynatemp_exponent\":1,\"smoothing_factor\":0,\"smoothing_curve\":1,\"dry_allowed_length\":2,\"dry_multiplier\":0,\"dry_base\":1.75,\"dry_sequence_breakers\":\"[\\\"\\\\n\\\", \\\":\\\", \\\"\\\\\\\"\\\", \\\"*\\\"]\",\"dry_penalty_last_n\":0,\"add_bos_token\":true,\"ban_eos_token\":false,\"skip_special_tokens\":true,\"mirostat_mode\":0,\"mirostat_tau\":5,\"mirostat_eta\":0.1,\"guidance_scale\":1,\"negative_prompt\":\"\",\"grammar_string\":\"\",\"json_schema\":null,\"json_schema_allow_empty\":false,\"banned_tokens\":\"\",\"sampler_priority\":[\"repetition_penalty\",\"presence_penalty\",\"frequency_penalty\",\"dry\",\"temperature\",\"dynamic_temperature\",\"quadratic_sampling\",\"top_n_sigma\",\"top_k\",\"top_p\",\"typical_p\",\"epsilon_cutoff\",\"eta_cutoff\",\"tfs\",\"top_a\",\"min_p\",\"mirostat\",\"xtc\",\"encoder_repetition_penalty\",\"no_repeat_ngram\"],\"samplers\":[\"penalties\",\"dry\",\"top_n_sigma\",\"top_k\",\"typ_p\",\"tfs_z\",\"typical_p\",\"xtc\",\"top_p\",\"min_p\",\"temperature\"],\"samplers_priorities\":[\"dry\",\"penalties\",\"no_repeat_ngram\",\"temperature\",\"top_nsigma\",\"top_p_top_k\",\"top_a\",\"min_p\",\"tfs\",\"eta_cutoff\",\"epsilon_cutoff\",\"typical_p\",\"quadratic\",\"xtc\"],\"ignore_eos_token\":false,\"spaces_between_special_tokens\":true,\"speculative_ngram\":false,\"sampler_order\":[5,6,0,1,2,3,4],\"logit_bias\":[],\"xtc_threshold\":0.1,\"xtc_probability\":0,\"nsigma\":0,\"min_keep\":0,\"rep_pen_size\":0}","{\"temp\":1.25,\"temperature_last\":false,\"top_p\":1,\"top_k\":0,\"top_a\":0,\"tfs\":1,\"epsilon_cutoff\":0,\"eta_cutoff\":0,\"typical_p\":1,\"min_p\":0.1,\"rep_pen\":1,\"rep_pen_range\":0,\"rep_pen_decay\":0,\"rep_pen_slope\":1,\"no_repeat_ngram_size\":0,\"penalty_alpha\":0,\"num_beams\":1,\"length_penalty\":1,\"min_length\":0,\"encoder_rep_pen\":1,\"freq_pen\":0,\"presence_pen\":0,\"skew\":0,\"do_sample\":true,\"early_stopping\":false,\"dynatemp\":false,\"min_temp\":0,\"max_temp\":2,\"dynatemp_exponent\":1,\"smoothing_factor\":0,\"smoothing_curve\":1,\"dry_allowed_length\":2,\"dry_multiplier\":0,\"dry_base\":1.75,\"dry_sequence_breakers\":\"[\\\"\\\\n\\\", \\\":\\\", \\\"\\\\\\\"\\\", \\\"*\\\"]\",\"dry_penalty_last_n\":0,\"add_bos_token\":true,\"ban_eos_token\":false,\"skip_special_tokens\":true,\"mirostat_mode\":0,\"mirostat_tau\":5,\"mirostat_eta\":0.1,\"guidance_scale\":1,\"negative_prompt\":\"\",\"grammar_string\":\"\",\"json_schema\":null,\"json_schema_allow_empty\":false,\"banned_tokens\":\"\",\"sampler_priority\":[\"repetition_penalty\",\"presence_penalty\",\"frequency_penalty\",\"dry\",\"temperature\",\"dynamic_temperature\",\"quadratic_sampling\",\"top_n_sigma\",\"top_k\",\"top_p\",\"typical_p\",\"epsilon_cutoff\",\"eta_cutoff\",\"tfs\",\"top_a\",\"min_p\",\"mirostat\",\"xtc\",\"encoder_repetition_penalty\",\"no_repeat_ngram\"],\"samplers\":[\"penalties\",\"dry\",\"top_n_sigma\",\"top_k\",\"typ_p\",\"tfs_z\",\"typical_p\",\"xtc\",\"top_p\",\"min_p\",\"temperature\"],\"samplers_priorities\":[\"dry\",\"penalties\",\"no_repeat_ngram\",\"temperature\",\"top_nsigma\",\"top_p_top_k\",\"top_a\",\"min_p\",\"tfs\",\"eta_cutoff\",\"epsilon_cutoff\",\"typical_p\",\"quadratic\",\"xtc\"],\"ignore_eos_token\":false,\"spaces_between_special_tokens\":true,\"speculative_ngram\":false,\"sampler_order\":[5,6,0,1,2,3,4],\"logit_bias\":[],\"xtc_threshold\":0.1,\"xtc_probability\":0,\"nsigma\":0,\"min_keep\":0,\"rep_pen_size\":0}","{\"temp\":2,\"temperature_last\":false,\"top_p\":1,\"top_k\":0,\"top_a\":0,\"tfs\":1,\"epsilon_cutoff\":0,\"eta_cutoff\":0,\"typical_p\":1,\"min_p\":0.1,\"rep_pen\":1,\"rep_pen_range\":0,\"rep_pen_decay\":0,\"rep_pen_slope\":1,\"no_repeat_ngram_size\":0,\"penalty_alpha\":0,\"num_beams\":1,\"length_penalty\":1,\"min_length\":0,\"encoder_rep_pen\":1,\"freq_pen\":0,\"presence_pen\":0,\"skew\":0,\"do_sample\":true,\"early_stopping\":false,\"dynatemp\":false,\"min_temp\":0,\"max_temp\":2,\"dynatemp_exponent\":1,\"smoothing_factor\":0,\"smoothing_curve\":1,\"dry_allowed_length\":2,\"dry_multiplier\":0,\"dry_base\":1.75,\"dry_sequence_breakers\":\"[\\\"\\\\n\\\", \\\":\\\", \\\"\\\\\\\"\\\", \\\"*\\\"]\",\"dry_penalty_last_n\":0,\"add_bos_token\":true,\"ban_eos_token\":false,\"skip_special_tokens\":true,\"mirostat_mode\":0,\"mirostat_tau\":5,\"mirostat_eta\":0.1,\"guidance_scale\":1,\"negative_prompt\":\"\",\"grammar_string\":\"\",\"json_schema\":null,\"json_schema_allow_empty\":false,\"banned_tokens\":\"\",\"sampler_priority\":[\"repetition_penalty\",\"presence_penalty\",\"frequency_penalty\",\"dry\",\"temperature\",\"dynamic_temperature\",\"quadratic_sampling\",\"top_n_sigma\",\"top_k\",\"top_p\",\"typical_p\",\"epsilon_cutoff\",\"eta_cutoff\",\"tfs\",\"top_a\",\"min_p\",\"mirostat\",\"xtc\",\"encoder_repetition_penalty\",\"no_repeat_ngram\"],\"samplers\":[\"penalties\",\"dry\",\"top_n_sigma\",\"top_k\",\"typ_p\",\"tfs_z\",\"typical_p\",\"xtc\",\"top_p\",\"min_p\",\"temperature\"],\"samplers_priorities\":[\"dry\",\"penalties\",\"no_repeat_ngram\",\"temperature\",\"top_nsigma\",\"top_p_top_k\",\"top_a\",\"min_p\",\"tfs\",\"eta_cutoff\",\"epsilon_cutoff\",\"typical_p\",\"quadratic\",\"xtc\"],\"ignore_eos_token\":false,\"spaces_between_special_tokens\":true,\"speculative_ngram\":false,\"sampler_order\":[5,6,0,1,2,3,4],\"logit_bias\":[],\"xtc_threshold\":0.1,\"xtc_probability\":0,\"nsigma\":0,\"min_keep\":0,\"rep_pen_size\":0}"],"textgenerationwebui_preset_names":["Unknown","Unknown","Unknown","Unknown","Unknown","Unknown"]};


    // ============================================================
    // 内置扩展列表（PWA 模式下静态提供）
    // ============================================================
    const BUILTIN_EXTENSIONS = [
        'attachments', 'caption', 'connection-manager', 'expressions',
        'gallery', 'memory', 'quick-reply', 'regex', 'stable-diffusion',
        'token-counter', 'translate', 'tts', 'vectors',
    ];

    // ============================================================
    // PNG tEXt chunk 解析
    // ============================================================
    function readPngTextChunks(arrayBuffer) {
        const view = new DataView(arrayBuffer);
        const sig = [137, 80, 78, 71, 13, 10, 26, 10];
        for (let i = 0; i < 8; i++) { if (view.getUint8(i) !== sig[i]) throw new Error('Not a valid PNG file'); }
        const chunks = [];
        let offset = 8;
        while (offset < view.byteLength) {
            const length = view.getUint32(offset);
            const type = String.fromCharCode(view.getUint8(offset+4), view.getUint8(offset+5), view.getUint8(offset+6), view.getUint8(offset+7));
            const data = new Uint8Array(arrayBuffer, offset + 8, length);
            chunks.push({ type, data, offset });
            offset += 12 + length;
            if (type === 'IEND') break;
        }
        const textChunks = [];
        for (const chunk of chunks) {
            if (chunk.type === 'tEXt') {
                let nullIndex = -1;
                for (let i = 0; i < chunk.data.length; i++) { if (chunk.data[i] === 0) { nullIndex = i; break; } }
                if (nullIndex > 0) {
                    const keyword = new TextDecoder('latin1').decode(chunk.data.slice(0, nullIndex));
                    const text = new TextDecoder('latin1').decode(chunk.data.slice(nullIndex + 1));
                    textChunks.push({ keyword, text });
                }
            }
        }
        return textChunks;
    }

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

    function normalizeCharacterData(cardData, avatarKey, avatarBase64) {
        const data = cardData.data || cardData;
        const extensions = data.extensions || {};
        const talkativeness = extensions.talkativeness ?? 0.5;
        const fav = extensions.fav ?? false;
        const v2Data = {
            name: data.name || cardData.name || '', description: data.description || '',
            personality: data.personality || '', scenario: data.scenario || '',
            first_mes: data.first_mes || '', mes_example: data.mes_example || '',
            creator_notes: data.creator_notes || '', system_prompt: data.system_prompt || '',
            post_history_instructions: data.post_history_instructions || '',
            tags: data.tags || [], creator: data.creator || '',
            character_version: data.character_version || '',
            alternate_greetings: data.alternate_greetings || [],
            extensions: { talkativeness, fav, world: extensions.world || '',
                depth_prompt: extensions.depth_prompt || { prompt: '', depth: 4, role: 'system' }, ...extensions },
            character_book: data.character_book || null,
        };
        const name = data.name || cardData.name || '';
        const now = new Date().toISOString();
        return {
            name, description: v2Data.description, personality: v2Data.personality,
            scenario: v2Data.scenario, first_mes: v2Data.first_mes, mes_example: v2Data.mes_example,
            talkativeness, fav, tags: v2Data.tags, chat: `${name} - ${now.replace(/[T:].*/g, '')}`,
            creator_notes: v2Data.creator_notes,
            spec: cardData.spec || 'chara_card_v2', spec_version: cardData.spec_version || '2.0', data: v2Data,
            avatar: avatarKey, json_data: JSON.stringify(cardData),
            date_added: Date.now(), create_date: cardData.create_date || now,
            chat_size: 0, date_last_chat: 0, data_size: 0,
            _pwaAvatarData: avatarBase64, updatedAt: now,
        };
    }

    async function handleCharacterImport(formData) {
        const file = formData.get('avatar');
        const format = formData.get('file_type');
        const preservedName = formData.get('preserved_name');
        if (!file) throw new Error('No file in FormData');
        let cardData, avatarBase64 = null;
        if (format === 'png') {
            cardData = extractCharacterFromPng(await file.arrayBuffer());
            avatarBase64 = await fileToBase64(file);
        } else if (format === 'json') {
            cardData = JSON.parse(await file.text());
        } else { throw new Error(`Unsupported format: ${format}`); }
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

    function parseBody(body) {
        try { return typeof body === 'string' ? JSON.parse(body) : body; } catch (e) { return {}; }
    }

    // ============================================================
    // API Mock 响应映射
    // ============================================================
    async function getMockResponse(url, method, body) {
        let path;
        try { path = new URL(url, location.origin).pathname; } catch (e) { return null; }

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
                return { status: 200, data: { result: 'ok', settings: JSON.stringify(settings), enable_accounts: false, enable_extensions: true, enable_extensions_auto_update: false, request_compression: { enabled: false, minPayloadSize: 0, maxPayloadSize: 0, timeout: 0 }, instruct: DEFAULT_PRESETS.instruct, context: DEFAULT_PRESETS.context, sysprompt: DEFAULT_PRESETS.sysprompt, reasoning: DEFAULT_PRESETS.reasoning, themes: DEFAULT_PRESETS.themes, movingUIPresets: DEFAULT_PRESETS.movingUIPresets, quickReplyPresets: DEFAULT_PRESETS.quickReplyPresets, openai_settings: DEFAULT_PRESETS.openai_settings, openai_setting_names: DEFAULT_PRESETS.openai_setting_names, koboldai_settings: DEFAULT_PRESETS.koboldai_settings, koboldai_setting_names: DEFAULT_PRESETS.koboldai_setting_names, novelai_settings: DEFAULT_PRESETS.novelai_settings, novelai_setting_names: DEFAULT_PRESETS.novelai_setting_names, textgenerationwebui_presets: DEFAULT_PRESETS.textgenerationwebui_presets, textgenerationwebui_preset_names: DEFAULT_PRESETS.textgenerationwebui_preset_names, world_names: [] } };
            } catch (e) {
                return { status: 200, data: { result: 'file not find', settings: JSON.stringify(DEFAULT_SETTINGS), enable_accounts: false, enable_extensions: true, enable_extensions_auto_update: false, request_compression: { enabled: false, minPayloadSize: 0, maxPayloadSize: 0, timeout: 0 }, instruct: DEFAULT_PRESETS.instruct, context: DEFAULT_PRESETS.context, sysprompt: DEFAULT_PRESETS.sysprompt, reasoning: DEFAULT_PRESETS.reasoning, themes: DEFAULT_PRESETS.themes, movingUIPresets: DEFAULT_PRESETS.movingUIPresets, quickReplyPresets: DEFAULT_PRESETS.quickReplyPresets, openai_settings: DEFAULT_PRESETS.openai_settings, openai_setting_names: DEFAULT_PRESETS.openai_setting_names, koboldai_settings: DEFAULT_PRESETS.koboldai_settings, koboldai_setting_names: DEFAULT_PRESETS.koboldai_setting_names, novelai_settings: DEFAULT_PRESETS.novelai_settings, novelai_setting_names: DEFAULT_PRESETS.novelai_setting_names, textgenerationwebui_presets: DEFAULT_PRESETS.textgenerationwebui_presets, textgenerationwebui_preset_names: DEFAULT_PRESETS.textgenerationwebui_preset_names, world_names: [] } };
            }
        }
        if (path === '/api/settings/save') {
            try { const data = parseBody(body); if (data.settings) { const parsed = typeof data.settings === 'string' ? JSON.parse(data.settings) : data.settings; await window.__pwaStorage.saveSetting('mainSettings', parsed); } } catch (e) { /* ignore */ }
            return { status: 200, data: { result: 'ok' } };
        }
        // --- 设置快照（PWA 模式下使用 IndexedDB 存储）---
        if (path === '/api/settings/get-snapshots') {
            try { const snapshots = await window.__pwaStorage.getSetting('settingsSnapshots') || []; return { status: 200, data: snapshots }; }
            catch (e) { return { status: 200, data: [] }; }
        }
        if (path === '/api/settings/make-snapshot') {
            try {
                const currentSettings = await window.__pwaStorage.getSetting('mainSettings') || {};
                const snapshots = await window.__pwaStorage.getSetting('settingsSnapshots') || [];
                const name = 'snapshot_' + Date.now();
                snapshots.push({ name, date: Date.now(), size: JSON.stringify(currentSettings).length });
                await window.__pwaStorage.saveSetting('settingsSnapshots', snapshots);
                await window.__pwaStorage.saveSetting('snapshot_' + name, currentSettings);
                return { status: 200, data: { result: 'ok' } };
            } catch (e) { return { status: 200, data: { result: 'ok' } }; }
        }
        if (path === '/api/settings/load-snapshot') {
            try {
                const data = parseBody(body);
                const name = data.name;
                if (name) { const content = await window.__pwaStorage.getSetting('snapshot_' + name); return { status: 200, data: { settings: JSON.stringify(content || {}) } }; }
                return { status: 200, data: { settings: '{}' } };
            } catch (e) { return { status: 200, data: { settings: '{}' } }; }
        }
        if (path === '/api/settings/restore-snapshot') {
            try {
                const data = parseBody(body);
                const name = data.name;
                if (name) { const content = await window.__pwaStorage.getSetting('snapshot_' + name); if (content) await window.__pwaStorage.saveSetting('mainSettings', content); }
                return { status: 200, data: { result: 'ok' } };
            } catch (e) { return { status: 200, data: { result: 'ok' } }; }
        }
        if (path.startsWith('/api/settings/')) return { status: 200, data: { result: 'ok' } };

        // --- 扩展发现（返回内置扩展列表）---
        if (path === '/api/extensions/discover') {
            return { status: 200, data: BUILTIN_EXTENSIONS.map(name => ({ type: 'system', name })) };
        }

        // --- 扩展管理（Extensions）— PWA 模式下仅支持内置扩展 ---
        if (path === '/api/extensions/install') return { status: 200, data: { error: 'PWA mode does not support extension installation' } };
        if (path === '/api/extensions/update') return { status: 200, data: {} };
        if (path === '/api/extensions/branches') return { status: 200, data: [] };
        if (path === '/api/extensions/switch') return { status: 200, data: {} };
        if (path === '/api/extensions/move') return { status: 200, data: {} };
        if (path === '/api/extensions/version') return { status: 200, data: {} };
        if (path === '/api/extensions/delete') return { status: 200, data: {} };
        if (path.startsWith('/api/extensions/')) return { status: 200, data: {} };

        // --- Extras API 模块列表（PWA 无 Extras 后端）---
        if (path === '/api/modules') return { status: 200, data: { modules: [] } };

        // --- 插件（Fandom 抓取、Office 解析等，PWA 不支持）---
        if (path.startsWith('/api/plugins/')) return { status: 200, data: {} };

        // --- 人物卡导入（由 fetch 拦截器直接处理 FormData）---
        if (path === '/api/characters/import') return null;

        // --- 角色 ---
        if (path === '/api/characters/all') {
            try { return { status: 200, data: await window.__pwaStorage.getAll(STORES.CHARACTERS) }; }
            catch (e) { return { status: 200, data: [] }; }
        }
        if (path === '/api/characters/create') {
            try {
                const data = parseBody(body);
                const name = data.name || data.data?.name || Date.now().toString();
                const avatarKey = `${name}.png`;
                const existing = await window.__pwaStorage.get(STORES.CHARACTERS, avatarKey);
                if (existing) {
                    const merged = { ...existing, ...data, id: avatarKey, updatedAt: new Date().toISOString() };
                    await window.__pwaStorage.put(STORES.CHARACTERS, merged);
                    return { status: 200, data: { file_name: name } };
                }
                const now = new Date().toISOString();
                const charData = { id: avatarKey, name, avatar: avatarKey, ...data, date_added: Date.now(), create_date: now, chat_size: 0, date_last_chat: 0, data_size: 0, updatedAt: now };
                await window.__pwaStorage.put(STORES.CHARACTERS, charData);
                return { status: 200, data: { file_name: name } };
            } catch (e) { return { status: 500, data: { error: 'Failed' } }; }
        }
        if (path === '/api/characters/edit') {
            try {
                const data = parseBody(body);
                const avatarKey = data.avatar_url || data.avatar || data.id;
                if (avatarKey) {
                    const existing = await window.__pwaStorage.get(STORES.CHARACTERS, avatarKey);
                    if (existing) {
                        const merged = { ...existing, ...data, id: avatarKey, updatedAt: new Date().toISOString() };
                        if (data.data) merged.data = { ...(existing.data || {}), ...data.data };
                        await window.__pwaStorage.put(STORES.CHARACTERS, merged);
                    }
                }
                return { status: 200, data: {} };
            } catch (e) { return { status: 200, data: {} }; }
        }
        if (path === '/api/characters/edit-attribute') {
            try {
                const data = parseBody(body);
                const avatarKey = data.avatar_url || data.avatar;
                if (avatarKey && data.attribute && data.value !== undefined) {
                    const existing = await window.__pwaStorage.get(STORES.CHARACTERS, avatarKey);
                    if (existing) {
                        existing[data.attribute] = data.value;
                        if (existing.data) existing.data[data.attribute] = data.value;
                        existing.updatedAt = new Date().toISOString();
                        await window.__pwaStorage.put(STORES.CHARACTERS, existing);
                    }
                }
                return { status: 200, data: {} };
            } catch (e) { return { status: 200, data: {} }; }
        }
        if (path === '/api/characters/merge-attributes') {
            try {
                const data = parseBody(body);
                const avatarKey = data.avatar_url || data.avatar;
                if (avatarKey && data.attributes) {
                    const existing = await window.__pwaStorage.get(STORES.CHARACTERS, avatarKey);
                    if (existing) {
                        for (const [key, value] of Object.entries(data.attributes)) {
                            existing[key] = value;
                            if (existing.data) existing.data[key] = value;
                        }
                        existing.updatedAt = new Date().toISOString();
                        await window.__pwaStorage.put(STORES.CHARACTERS, existing);
                    }
                }
                return { status: 200, data: {} };
            } catch (e) { return { status: 200, data: {} }; }
        }
        if (path === '/api/characters/rename') {
            try {
                const data = parseBody(body);
                const oldAvatar = data.avatar_url || data.old_name;
                const newName = data.new_name;
                if (oldAvatar && newName) {
                    const existing = await window.__pwaStorage.get(STORES.CHARACTERS, oldAvatar);
                    if (existing) {
                        const newAvatarKey = `${newName}.png`;
                        await window.__pwaStorage.delete(STORES.CHARACTERS, oldAvatar);
                        existing.id = newAvatarKey; existing.name = newName; existing.avatar = newAvatarKey;
                        if (existing.data) existing.data.name = newName;
                        existing.updatedAt = new Date().toISOString();
                        await window.__pwaStorage.put(STORES.CHARACTERS, existing);
                    }
                }
                return { status: 200, data: {} };
            } catch (e) { return { status: 200, data: {} }; }
        }
        if (path === '/api/characters/duplicate') {
            try {
                const data = parseBody(body);
                const originAvatar = data.avatar_url || data.avatar;
                if (originAvatar) {
                    const existing = await window.__pwaStorage.get(STORES.CHARACTERS, originAvatar);
                    if (existing) {
                        const newName = `${existing.name} (copy)`;
                        const newAvatarKey = `${newName}.png`;
                        const duplicate = { ...existing, id: newAvatarKey, name: newName, avatar: newAvatarKey, date_added: Date.now(), updatedAt: new Date().toISOString() };
                        if (duplicate.data) duplicate.data.name = newName;
                        delete duplicate._pwaAvatarData;
                        await window.__pwaStorage.put(STORES.CHARACTERS, duplicate);
                        return { status: 200, data: { avatar_url: newAvatarKey } };
                    }
                }
                return { status: 200, data: {} };
            } catch (e) { return { status: 200, data: {} }; }
        }
        if (path === '/api/characters/delete') {
            try {
                const data = parseBody(body);
                const avatarKey = data.avatar_url || data.id;
                if (avatarKey) { await window.__pwaStorage.delete(STORES.CHARACTERS, avatarKey); console.log('[PWA Shim] Character deleted:', avatarKey); }
                return { status: 200, data: {} };
            } catch (e) { return { status: 200, data: {} }; }
        }
        if (path === '/api/characters/get') {
            try { const data = parseBody(body); const char = await window.__pwaStorage.get(STORES.CHARACTERS, data.avatar_url || data.id); return { status: 200, data: char || {} }; }
            catch (e) { return { status: 200, data: {} }; }
        }
        if (path === '/api/characters/chats') {
            try {
                const data = parseBody(body);
                const avatarKey = data.avatar_url;
                const allChats = await window.__pwaStorage.getAll(STORES.CHATS);
                const charChats = allChats.filter(c => c.character_name === avatarKey || c.avatar_url === avatarKey);
                const result = {};
                for (const chat of charChats) { result[chat.id] = { file_name: chat.id, last_mes: chat.last_mes || '', mes_count: chat.mes_count || 0 }; }
                return { status: 200, data: result };
            } catch (e) { return { status: 200, data: {} }; }
        }
        if (path === '/api/characters/export') {
            try { const data = parseBody(body); const char = await window.__pwaStorage.get(STORES.CHARACTERS, data.avatar_url || data.avatar); return { status: 200, data: char ? JSON.parse(char.json_data || '{}') : {} }; }
            catch (e) { return { status: 200, data: {} }; }
        }
        if (path.startsWith('/api/characters/')) return { status: 200, data: {} };

        // --- 角色头像编辑（PWA 返回空成功）---
        if (path === '/api/characters/edit-avatar') return { status: 200, data: {} };

        // --- 聊天 ---
        if (path === '/api/chats/save') { try { const data = parseBody(body); const id = data.id || data.chatfile || Date.now().toString(); await window.__pwaStorage.put(STORES.CHATS, { id, ...data }); } catch (e) { /* ignore */ } return { status: 200, data: { result: 'ok' } }; }
        if (path === '/api/chats/get') { try { const data = parseBody(body); const chat = await window.__pwaStorage.get(STORES.CHATS, data.id || data.chatfile); return { status: 200, data: chat || {} }; } catch (e) { return { status: 200, data: {} }; } }
        if (path === '/api/chats/delete') { try { const data = parseBody(body); await window.__pwaStorage.delete(STORES.CHATS, data.chatfile || data.id); } catch (e) { /* ignore */ } return { status: 200, data: { result: 'ok' } }; }
        if (path === '/api/chats/rename') {
            try { const data = parseBody(body); const oldId = data.chatfile || data.id; const newName = data.new_name; if (oldId && newName) { const existing = await window.__pwaStorage.get(STORES.CHATS, oldId); if (existing) { await window.__pwaStorage.delete(STORES.CHATS, oldId); existing.id = newName; await window.__pwaStorage.put(STORES.CHATS, existing); } } } catch (e) { /* ignore */ }
            return { status: 200, data: {} };
        }
        if (path === '/api/chats/export') { try { const data = parseBody(body); const chat = await window.__pwaStorage.get(STORES.CHATS, data.id || data.chatfile); return { status: 200, data: chat || {} }; } catch (e) { return { status: 200, data: {} }; } }
        if (path === '/api/chats/import') { try { const data = parseBody(body); const id = data.id || data.chatfile || Date.now().toString(); await window.__pwaStorage.put(STORES.CHATS, { id, ...data }); return { status: 200, data: { id } }; } catch (e) { return { status: 200, data: {} }; } }
        if (path === '/api/chats/recent') return { status: 200, data: [] };
        if (path === '/api/chats/search') return { status: 200, data: [] };
        // --- 群组聊天（IndexedDB 读写）---
        if (path === '/api/chats/group/save') {
            try { const data = parseBody(body); const id = data.id || data.chatfile || Date.now().toString(); const existing = await window.__pwaStorage.get(STORES.CHATS, id); const merged = existing ? { ...existing, ...data, id, is_group: true } : { id, ...data, is_group: true }; await window.__pwaStorage.put(STORES.CHATS, merged); return { status: 200, data: { id } }; }
            catch (e) { return { status: 200, data: {} }; }
        }
        if (path === '/api/chats/group/get') {
            try { const data = parseBody(body); const chat = await window.__pwaStorage.get(STORES.CHATS, data.id || data.chatfile); return { status: 200, data: chat || {} }; }
            catch (e) { return { status: 200, data: {} }; }
        }
        if (path === '/api/chats/group/import') {
            try { const data = parseBody(body); const id = data.id || data.chatfile || Date.now().toString(); await window.__pwaStorage.put(STORES.CHATS, { id, ...data, is_group: true }); return { status: 200, data: { id } }; }
            catch (e) { return { status: 200, data: {} }; }
        }
        if (path === '/api/chats/group/info') {
            try { const data = parseBody(body); const chat = await window.__pwaStorage.get(STORES.CHATS, data.id || data.chatfile); return { status: 200, data: chat ? { id: chat.id, name: chat.name || chat.id } : {} }; }
            catch (e) { return { status: 200, data: {} }; }
        }
        if (path === '/api/chats/group/delete') {
            try { const data = parseBody(body); const id = data.chatfile || data.id; if (id) await window.__pwaStorage.delete(STORES.CHATS, id); } catch (e) { /* ignore */ }
            return { status: 200, data: {} };
        }
        if (path.startsWith('/api/chats/')) return { status: 200, data: {} };

        // --- 群组 ---
        if (path === '/api/groups/all') { try { return { status: 200, data: await window.__pwaStorage.getAll(STORES.GROUPS) }; } catch (e) { return { status: 200, data: [] }; } }
        if (path === '/api/groups/create') { try { const data = parseBody(body); const id = data.id || Date.now().toString(); await window.__pwaStorage.put(STORES.GROUPS, { id, ...data }); return { status: 200, data: { id } }; } catch (e) { return { status: 500, data: { error: 'Failed' } }; } }
        if (path === '/api/groups/edit') { try { const data = parseBody(body); const id = data.id; if (id) { const existing = await window.__pwaStorage.get(STORES.GROUPS, id); if (existing) { await window.__pwaStorage.put(STORES.GROUPS, { ...existing, ...data }); } } return { status: 200, data: {} }; } catch (e) { return { status: 200, data: {} }; } }
        if (path === '/api/groups/delete') { try { const data = parseBody(body); if (data.id) await window.__pwaStorage.delete(STORES.GROUPS, data.id); } catch (e) { /* ignore */ } return { status: 200, data: {} }; }
        if (path.startsWith('/api/groups/')) return { status: 200, data: {} };

        // --- 背景/头像/世界信息 ---
        if (path === '/api/backgrounds/all') {
            const bgImages = [
                { filename: 'bedroom clean.jpg', isAnimated: false },
                { filename: 'bedroom cyberpunk.jpg', isAnimated: false },
                { filename: 'bedroom red.jpg', isAnimated: false },
                { filename: 'bedroom tatami.jpg', isAnimated: false },
                { filename: 'cityscape medieval market.jpg', isAnimated: false },
                { filename: 'cityscape medieval night.jpg', isAnimated: false },
                { filename: 'cityscape postapoc.jpg', isAnimated: false },
                { filename: 'forest treehouse fireworks air baloons (by kallmeflocc).jpg', isAnimated: false },
                { filename: 'japan classroom side.jpg', isAnimated: false },
                { filename: 'japan classroom.jpg', isAnimated: false },
                { filename: 'japan path cherry blossom.jpg', isAnimated: false },
                { filename: 'japan university.jpg', isAnimated: false },
                { filename: 'landscape autumn great tree.jpg', isAnimated: false },
                { filename: 'landscape beach day.png', isAnimated: false },
                { filename: 'landscape beach night.jpg', isAnimated: false },
                { filename: 'landscape mountain lake.jpg', isAnimated: false },
                { filename: 'landscape postapoc.jpg', isAnimated: false },
                { filename: 'landscape winter lake house.jpg', isAnimated: false },
                { filename: 'royal.jpg', isAnimated: false },
                { filename: 'tavern day.jpg', isAnimated: false },
                { filename: '_black.jpg', isAnimated: false },
                { filename: '_white.jpg', isAnimated: false },
                { filename: '__transparent.png', isAnimated: false },
            ];
            return { status: 200, data: { images: bgImages, config: { width: 320, height: 180 } } };
        }
        if (path === '/api/backgrounds/folders') return { status: 200, data: [] };

        // --- 背景管理（Backgrounds）---
        // /api/backgrounds/upload 用 FormData 发送，由 fetch 拦截层处理
        if (path === '/api/backgrounds/upload') return null;
        if (path === '/api/backgrounds/delete') {
            try {
                const data = parseBody(body);
                if (data.bg) await window.__pwaStorage.deleteFromStore('BACKGROUNDS', data.bg);
                return { status: 200, data: {} };
            } catch (e) { return { status: 200, data: {} }; }
        }
        if (path === '/api/backgrounds/rename') {
            try {
                const data = parseBody(body);
                if (data.oldName && data.newName) {
                    const bg = await window.__pwaStorage.getFromStore('BACKGROUNDS', data.oldName);
                    if (bg) { await window.__pwaStorage.deleteFromStore('BACKGROUNDS', data.oldName); await window.__pwaStorage.saveToStore('BACKGROUNDS', data.newName, bg); }
                }
                return { status: 200, data: {} };
            } catch (e) { return { status: 200, data: {} }; }
        }
        if (path.startsWith('/api/backgrounds/')) return { status: 200, data: {} };

        // --- 头像管理（Avatars）---
        if (path === '/api/avatars/get') {
            try {
                const avatars = (await window.__pwaStorage.getAllFromStore('AVATARS')) || [];
                return { status: 200, data: avatars };
            } catch (e) { return { status: 200, data: [] }; }
        }
        if (path === '/api/avatars/upload') {
            try {
                const data = parseBody(body);
                if (data.name && data.data) {
                    await window.__pwaStorage.saveToStore('AVATARS', data.name, { name: data.name, data: data.data });
                    return { status: 200, data: { path: 'user/avatars/' + data.name } };
                }
                return { status: 200, data: { path: 'img/user_default.png' } };
            } catch (e) { return { status: 200, data: { path: 'img/user_default.png' } }; }
        }
        if (path === '/api/avatars/delete') {
            try {
                const data = parseBody(body);
                if (data.path) {
                    const fileName = data.path.replace('user/avatars/', '');
                    await window.__pwaStorage.deleteFromStore('AVATARS', fileName);
                }
                return { status: 200, data: {} };
            } catch (e) { return { status: 200, data: {} }; }
        }
        if (path.startsWith('/api/avatars/')) return { status: 200, data: {} };

        // --- 世界信息（World Info）IndexedDB 读写 ---
        if (path === '/api/worldinfo/list') {
            try {
                const wiList = (await window.__pwaStorage.getAllFromStore('WORLD_INFO')) || [];
                return { status: 200, data: wiList };
            } catch (e) { return { status: 200, data: [] }; }
        }
        if (path === '/api/worldinfo/get') {
            try {
                const data = parseBody(body);
                if (!data.name) return { status: 400, data: {} };
                const wi = await window.__pwaStorage.getFromStore('WORLD_INFO', data.name);
                return { status: 200, data: wi || { entries: {} } };
            } catch (e) { return { status: 200, data: { entries: {} } }; }
        }
        if (path === '/api/worldinfo/edit') {
            try {
                const data = parseBody(body);
                if (!data.name || !data.data) return { status: 400, data: {} };
                await window.__pwaStorage.saveToStore('WORLD_INFO', data.name, data.data);
                // Update world_names in settings
                const mainSettings = (await window.__pwaStorage.getSetting('mainSettings')) || {};
                if (!mainSettings.world_info) mainSettings.world_info = {};
                if (!Array.isArray(mainSettings.world_info.globalSelect)) mainSettings.world_info.globalSelect = [];
                await window.__pwaStorage.saveSetting('mainSettings', mainSettings);
                return { status: 200, data: { ok: true } };
            } catch (e) { console.error('[PWA Shim] WI edit error:', e); return { status: 500, data: {} }; }
        }
        if (path === '/api/worldinfo/delete') {
            try {
                const data = parseBody(body);
                if (!data.name) return { status: 400, data: {} };
                await window.__pwaStorage.deleteFromStore('WORLD_INFO', data.name);
                return { status: 200, data: {} };
            } catch (e) { return { status: 500, data: {} }; }
        }
        if (path === '/api/worldinfo/import') {
            try {
                const data = parseBody(body);
                if (data.convertedData) {
                    const parsed = typeof data.convertedData === 'string' ? JSON.parse(data.convertedData) : data.convertedData;
                    const name = parsed.name || 'imported_world';
                    await window.__pwaStorage.saveToStore('WORLD_INFO', name, parsed);
                    return { status: 200, data: { name } };
                }
                return { status: 400, data: {} };
            } catch (e) { console.error('[PWA Shim] WI import error:', e); return { status: 400, data: {} }; }
        }
        if (path.startsWith('/api/worldinfo/')) return { status: 200, data: {} };

        // --- 秘密/API 密钥（完整 IndexedDB 读写）---
        if (path === '/api/secrets/read') { try { return { status: 200, data: (await window.__pwaStorage.getSetting('secrets')) || {} }; } catch (e) { return { status: 200, data: {} }; } }
        if (path === '/api/secrets/write') { try { const data = parseBody(body); const secrets = (await window.__pwaStorage.getSetting('secrets')) || {}; if (data.key) secrets[data.key] = data.value; await window.__pwaStorage.saveSetting('secrets', secrets); } catch (e) { /* ignore */ } return { status: 200, data: {} }; }
        if (path === '/api/secrets/find') { try { const data = parseBody(body); const secrets = (await window.__pwaStorage.getSetting('secrets')) || {}; return { status: 200, data: data.key && secrets.hasOwnProperty(data.key) ? secrets[data.key] : null }; } catch (e) { return { status: 200, data: null }; } }
        if (path === '/api/secrets/view') { try { const data = parseBody(body); const secrets = (await window.__pwaStorage.getSetting('secrets')) || {}; return { status: 200, data: data.key ? { [data.key]: secrets[data.key] || null } : secrets }; } catch (e) { return { status: 200, data: {} }; } }
        if (path === '/api/secrets/delete') { try { const data = parseBody(body); const secrets = (await window.__pwaStorage.getSetting('secrets')) || {}; if (data.key) delete secrets[data.key]; await window.__pwaStorage.saveSetting('secrets', secrets); } catch (e) { /* ignore */ } return { status: 200, data: {} }; }
        if (path === '/api/secrets/settings') { try { return { status: 200, data: (await window.__pwaStorage.getSetting('secretsSettings')) || {} }; } catch (e) { return { status: 200, data: {} }; } }
        if (path === '/api/secrets/rotate') { try { const data = parseBody(body); const secrets = (await window.__pwaStorage.getSetting('secrets')) || {}; if (data.key && data.value) secrets[data.key] = data.value; await window.__pwaStorage.saveSetting('secrets', secrets); } catch (e) { /* ignore */ } return { status: 200, data: {} }; }
        if (path === '/api/secrets/rename') { try { const data = parseBody(body); const secrets = (await window.__pwaStorage.getSetting('secrets')) || {}; if (data.oldKey && data.newKey && secrets.hasOwnProperty(data.oldKey)) { secrets[data.newKey] = secrets[data.oldKey]; delete secrets[data.oldKey]; await window.__pwaStorage.saveSetting('secrets', secrets); } } catch (e) { /* ignore */ } return { status: 200, data: {} }; }
        if (path.startsWith('/api/secrets/')) return { status: 200, data: {} };

        // --- 图片/文件/元数据/精灵图 ---

        // --- 图片画廊（Images）IndexedDB IMAGES store ---
        if (path === '/api/images/list' || path.startsWith('/api/images/list/')) {
            try {
                const images = (await window.__pwaStorage.getAllFromStore('IMAGES')) || [];
                return { status: 200, data: images };
            } catch (e) { return { status: 200, data: [] }; }
        }
        if (path === '/api/images/folders') return { status: 200, data: [] };
        if (path === '/api/images/upload') {
            try {
                const data = parseBody(body);
                if (!data.name || !data.data) return { status: 400, data: {} };
                await window.__pwaStorage.saveToStore('IMAGES', data.name, { name: data.name, data: data.data, uploadedAt: Date.now() });
                return { status: 200, data: { path: 'user/images/' + data.name } };
            } catch (e) { return { status: 500, data: {} }; }
        }
        if (path === '/api/images/delete') {
            try {
                const data = parseBody(body);
                if (!data.path) return { status: 400, data: {} };
                const fileName = data.path.replace('user/images/', '');
                await window.__pwaStorage.deleteFromStore('IMAGES', fileName);
                return { status: 200, data: {} };
            } catch (e) { return { status: 500, data: {} }; }
        }
        if (path.startsWith('/api/images/')) return { status: 200, data: {} };

        // --- 文件管理（Files）IndexedDB 读写 ---
        if (path === '/api/files/sanitize-filename') {
            try {
                const data = parseBody(body);
                const fileName = String(data.fileName || '').replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
                return { status: 200, data: { fileName: fileName || 'untitled' } };
            } catch (e) { return { status: 200, data: { fileName: 'untitled' } }; }
        }
        if (path === '/api/files/upload') {
            try {
                const data = parseBody(body);
                if (!data.name || !data.data) return { status: 400, data: {} };
                const fileData = { name: data.name, data: data.data, uploadedAt: Date.now() };
                await window.__pwaStorage.saveToStore('FILES', data.name, fileData);
                const url = 'user/files/' + data.name;
                return { status: 200, data: { path: url } };
            } catch (e) { console.error('[PWA Shim] File upload error:', e); return { status: 500, data: {} }; }
        }
        if (path === '/api/files/delete') {
            try {
                const data = parseBody(body);
                if (!data.path) return { status: 400, data: {} };
                const fileName = data.path.replace('user/files/', '');
                await window.__pwaStorage.deleteFromStore('FILES', fileName);
                return { status: 200, data: {} };
            } catch (e) { return { status: 500, data: {} }; }
        }
        if (path === '/api/files/verify') {
            try {
                const data = parseBody(body);
                if (!Array.isArray(data.urls)) return { status: 400, data: {} };
                const verified = {};
                for (const url of data.urls) {
                    const fileName = url.replace('user/files/', '');
                    const exists = !!(await window.__pwaStorage.getFromStore('FILES', fileName));
                    verified[url] = exists;
                }
                return { status: 200, data: verified };
            } catch (e) { return { status: 200, data: {} }; }
        }
        if (path.startsWith('/api/files/')) return { status: 200, data: {} };

        // --- 图片元数据（Image Metadata）---
        if (path === '/api/image-metadata/all') return { status: 200, data: [] };
        if (path.startsWith('/api/image-metadata/folders/')) return { status: 200, data: [] };
        if (path.startsWith('/api/image-metadata/')) return { status: 200, data: [] };

        // --- 角色表情/立绘（Sprites）---
        if (path.startsWith('/api/sprites/get')) return { status: 200, data: [] };
        if (path === '/api/sprites/upload' || path === '/api/sprites/upload-zip') return { status: 200, data: { count: 0 } };
        if (path === '/api/sprites/delete') return { status: 200, data: {} };
        if (path.startsWith('/api/sprites/')) return { status: 200, data: [] };

        // --- 预设/主题/快速回复/统计/资产/内容导入 ---
        // --- 预设/模板 CRUD（保存到 IndexedDB SETTINGS store）---
        if (path === '/api/presets/save') {
            try {
                const data = parseBody(body);
                const { name, preset, apiId } = data;
                if (!name || !preset) return { status: 400, data: {} };
                const storageKey = `pwa_presets_${apiId}`;
                let presets = (await window.__pwaStorage.getSetting(storageKey)) || {};
                presets[name] = preset;
                await window.__pwaStorage.saveSetting(storageKey, presets);
                console.log('[PWA Shim] Preset saved:', apiId, name);
                return { status: 200, data: { name } };
            } catch (e) { console.error('[PWA Shim] Preset save error:', e); return { status: 500, data: {} }; }
        }
        if (path === '/api/presets/delete') {
            try {
                const data = parseBody(body);
                const { name, apiId } = data;
                if (!name) return { status: 400, data: {} };
                const storageKey = `pwa_presets_${apiId}`;
                let presets = (await window.__pwaStorage.getSetting(storageKey)) || {};
                if (presets[name]) { delete presets[name]; await window.__pwaStorage.saveSetting(storageKey, presets); return { status: 200, data: {} }; }
                return { status: 404, data: {} };
            } catch (e) { return { status: 500, data: {} }; }
        }
        if (path === '/api/presets/restore') {
            try {
                const data = parseBody(body);
                const { name, apiId } = data;
                if (!name) return { status: 200, data: { isDefault: false, preset: {} } };
                // Check if it's a default preset
                const defaultKey = apiId === 'instruct' ? 'instruct' : apiId === 'context' ? 'context' : apiId === 'sysprompt' ? 'sysprompt' : apiId === 'reasoning' ? 'reasoning' : null;
                if (defaultKey && DEFAULT_PRESETS[defaultKey]) {
                    const found = DEFAULT_PRESETS[defaultKey].find(p => p.name === name);
                    if (found) return { status: 200, data: { isDefault: true, preset: found } };
                }
                return { status: 200, data: { isDefault: false, preset: {} } };
            } catch (e) { return { status: 200, data: { isDefault: false, preset: {} } }; }
        }
        if (path.startsWith('/api/presets/')) return { status: 200, data: {} };

        // --- 主题保存/删除（Themes）IndexedDB SETTINGS ---
        if (path === '/api/themes/save') {
            try {
                const data = parseBody(body);
                if (!data.name) return { status: 400, data: {} };
                const themes = (await window.__pwaStorage.getSetting('pwa_themes')) || {};
                themes[data.name] = data;
                await window.__pwaStorage.saveSetting('pwa_themes', themes);
                return { status: 200, data: {} };
            } catch (e) { return { status: 500, data: {} }; }
        }
        if (path === '/api/themes/delete') {
            try {
                const data = parseBody(body);
                if (!data.name) return { status: 400, data: {} };
                const themes = (await window.__pwaStorage.getSetting('pwa_themes')) || {};
                delete themes[data.name];
                await window.__pwaStorage.saveSetting('pwa_themes', themes);
                return { status: 200, data: {} };
            } catch (e) { return { status: 500, data: {} }; }
        }
        if (path.startsWith('/api/themes/')) return { status: 200, data: {} };
        // --- Moving UI 预设保存 ---
        if (path === '/api/moving-ui/save') {
            try {
                const data = parseBody(body);
                if (!data.name) return { status: 400, data: {} };
                const presets = (await window.__pwaStorage.getSetting('pwa_movingUIPresets')) || {};
                presets[data.name] = data;
                await window.__pwaStorage.saveSetting('pwa_movingUIPresets', presets);
                return { status: 200, data: {} };
            } catch (e) { return { status: 500, data: {} }; }
        }
        if (path.startsWith('/api/moving-ui/')) return { status: 200, data: {} };
        // --- Quick Reply 保存/删除 ---
        if (path === '/api/quick-replies/save') {
            try {
                const data = parseBody(body);
                if (!data.name) return { status: 400, data: {} };
                const qrPresets = (await window.__pwaStorage.getSetting('pwa_quickReplyPresets')) || {};
                qrPresets[data.name] = data;
                await window.__pwaStorage.saveSetting('pwa_quickReplyPresets', qrPresets);
                return { status: 200, data: {} };
            } catch (e) { return { status: 500, data: {} }; }
        }
        if (path === '/api/quick-replies/delete') {
            try {
                const data = parseBody(body);
                if (!data.name) return { status: 400, data: {} };
                const qrPresets = (await window.__pwaStorage.getSetting('pwa_quickReplyPresets')) || {};
                delete qrPresets[data.name];
                await window.__pwaStorage.saveSetting('pwa_quickReplyPresets', qrPresets);
                return { status: 200, data: {} };
            } catch (e) { return { status: 500, data: {} }; }
        }
        if (path.startsWith('/api/quick-replies/')) return { status: 200, data: {} };

        // --- 统计（Stats）IndexedDB SETTINGS store ---
        if (path === '/api/stats/get') {
            try {
                const stats = (await window.__pwaStorage.getSetting('stats')) || {};
                return { status: 200, data: stats };
            } catch (e) { return { status: 200, data: {} }; }
        }
        if (path === '/api/stats/recreate') {
            try {
                await window.__pwaStorage.saveSetting('stats', { timestamp: Date.now() });
                return { status: 200, data: {} };
            } catch (e) { return { status: 500, data: {} }; }
        }
        if (path === '/api/stats/update') {
            try {
                const data = parseBody(body);
                if (!data) return { status: 400, data: {} };
                data.timestamp = Date.now();
                await window.__pwaStorage.saveSetting('stats', data);
                return { status: 200, data: {} };
            } catch (e) { return { status: 500, data: {} }; }
        }
        if (path.startsWith('/api/stats/')) return { status: 200, data: {} };

        // --- 角色资产（Assets）---
        if (path === '/api/assets/get') return { status: 200, data: [] };
        if (path === '/api/assets/download') return { status: 200, data: {} };
        if (path === '/api/assets/delete') return { status: 200, data: {} };
        if (path === '/api/assets/character') return { status: 200, data: [] };
        if (path.startsWith('/api/assets/')) return { status: 200, data: {} };

        // --- 内容导入（Content Import）— PWA 不支持外部 URL 抓取 ---
        if (path === '/api/content/importURL') return { status: 400, data: { error: 'PWA mode does not support URL import' } };
        if (path === '/api/content/importUUID') return { status: 400, data: { error: 'PWA mode does not support UUID import' } };

        // --- 向量/翻译/搜索/语音/备份/数据清理 ---
        if (path.startsWith('/api/vector/')) return { status: 200, data: [] };
        if (path.startsWith('/api/translate/')) return { status: 200, data: {} };
        if (path.startsWith('/api/search/')) return { status: 200, data: {} };
        if (path.startsWith('/api/speech/')) return { status: 200, data: {} };

        // --- 聊天备份（Backups）IndexedDB BACKUPS store ---
        if (path === '/api/backups/chat/get') {
            try {
                const data = parseBody(body);
                if (!data.chatName) return { status: 400, data: [] };
                const backupList = (await window.__pwaStorage.getAllFromStore('BACKUPS')) || [];
                const filtered = backupList.filter(b => b.chatName === data.chatName);
                return { status: 200, data: filtered };
            } catch (e) { return { status: 200, data: [] }; }
        }
        if (path === '/api/backups/chat/download') {
            try {
                const data = parseBody(body);
                if (!data.chatName || !data.backupId) return { status: 400, data: {} };
                const backup = await window.__pwaStorage.getFromStore('BACKUPS', data.backupId);
                return { status: 200, data: backup || {} };
            } catch (e) { return { status: 404, data: {} }; }
        }
        if (path === '/api/backups/chat/delete') {
            try {
                const data = parseBody(body);
                if (!data.backupId) return { status: 400, data: {} };
                await window.__pwaStorage.deleteFromStore('BACKUPS', data.backupId);
                return { status: 200, data: {} };
            } catch (e) { return { status: 500, data: {} }; }
        }
        if (path.startsWith('/api/backups/')) return { status: 200, data: {} };

        // --- 数据清理（Data Maid）---
        if (path === '/api/data-maid/report') return { status: 200, data: { entries: [] } };
        if (path === '/api/data-maid/finalize') return { status: 200, data: {} };
        if (path === '/api/data-maid/view') return { status: 200, data: '' };
        if (path === '/api/data-maid/delete') return { status: 200, data: {} };
        if (path.startsWith('/api/data-maid/')) return { status: 200, data: {} };

        // --- AI 后端 (放行到 Cloudflare Functions) ---
        if (path.startsWith('/api/backends/')) return null;
        if (path.startsWith('/api/openai/') || path.startsWith('/api/novelai/') ||
            path.startsWith('/api/google/') || path.startsWith('/api/anthropic/') ||
            path.startsWith('/api/azure/') || path.startsWith('/api/volcengine/') ||
            path.startsWith('/api/minimax/') ||
            path.startsWith('/api/openrouter/') || path.startsWith('/api/nanogpt/') ||
            path.startsWith('/api/horde/')) return null;

        // --- Stable Diffusion API（PWA 无后端，拦截返回空数据避免 404）---
        if (path.startsWith('/api/sd/')) {
            // ComfyUI workflows 需要返回空数组（前端会迭代）
            if (path.includes('/comfy/workflows')) return { status: 200, data: [] };
            return { status: 200, data: {} };
        }

        // --- 分词器 ---
        if (path.startsWith('/api/tokenizers/')) {
            if (path.includes('/encode')) return { status: 200, data: { tokens: [], token_count: 0 } };
            if (path.includes('/decode')) return { status: 200, data: { text: '' } };
            if (path.includes('/count')) return { status: 200, data: { token_count: 0 } };
            return { status: 200, data: {} };
        }

        // --- 其他 /api/ 请求 ---

        // --- 分类/图像描述（Classify/Caption）---
        if (path.startsWith('/api/classify/') || path === '/api/classify') return { status: 200, data: {} };
        if (path.startsWith('/api/extra/classify')) return { status: 200, data: {} };
        if (path.startsWith('/api/caption/') || path === '/api/caption') return { status: 200, data: {} };
        if (path.startsWith('/api/extra/caption')) return { status: 200, data: {} };
        // --- 摘要（Summarize）— PWA 无后端，返回空结果 ---
        if (path === '/api/summarize') return { status: 200, data: { text: '' } };
        // --- 图片生成 API（SD 扩展使用）---
        if (path === '/api/image') return { status: 200, data: {} };
        if (path === '/api/image/model') return { status: 200, data: {} };
        if (path === '/api/image/models') return { status: 200, data: [] };
        if (path === '/api/image/samplers') return { status: 200, data: [] };
        if (path.startsWith('/api/image/')) return { status: 200, data: {} };
        if (path.startsWith('/api/')) { console.warn('[PWA Shim] Unhandled API:', method, path); return { status: 200, data: {} }; }

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

        let requestPath, requestUrl;
        try {
            requestUrl = new URL(url, location.origin);
            if (requestUrl.origin !== location.origin) return originalFetch.call(this, input, init);
            requestPath = requestUrl.pathname;
        } catch (e) { return originalFetch.call(this, input, init); }

        // --- 人物卡导入（FormData）---
        if (requestPath === '/api/characters/import' && method === 'POST' && body instanceof FormData) {
            try {
                const result = await handleCharacterImport(body);
                console.log('[PWA Shim]', method, requestPath, '→ import', result.file_name);
                if (window.__pwaApiLog) window.__pwaApiLog.push(method + ' ' + requestPath + ' → import ' + result.file_name);
                return new Response(JSON.stringify(result), { status: 200, statusText: 'OK', headers: { 'Content-Type': 'application/json' } });
            } catch (err) {
                console.error('[PWA Shim] Character import failed:', err);
                return new Response(JSON.stringify({ error: true }), { status: 200, statusText: 'OK', headers: { 'Content-Type': 'application/json' } });
            }
        }

        // --- 背景图上传（FormData）---
        // 前端用 FormData 发送（字段名 avatar），期望 response.text() 返回文件名
        if (requestPath === '/api/backgrounds/upload' && method === 'POST' && body instanceof FormData) {
            try {
                const file = body.get('avatar');
                if (file && file instanceof File) {
                    const fileName = file.name;
                    // 读取文件为 base64 并存入 IndexedDB
                    const arrayBuffer = await file.arrayBuffer();
                    const bytes = new Uint8Array(arrayBuffer);
                    let binary = '';
                    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                    const base64 = 'data:' + file.type + ';base64,' + btoa(binary);
                    await window.__pwaStorage.saveToStore('BACKGROUNDS', fileName, { name: fileName, data: base64 });
                    console.log('[PWA Shim]', method, requestPath, '→ uploaded', fileName);
                    if (window.__pwaApiLog) window.__pwaApiLog.push(method + ' ' + requestPath + ' → uploaded ' + fileName);
                    // 前端期望 response.text() 返回文件名（不含路径）
                    return new Response(fileName, { status: 200, statusText: 'OK', headers: { 'Content-Type': 'text/plain' } });
                }
                console.warn('[PWA Shim] Background upload: no file in FormData');
                return new Response('Missing file', { status: 400, statusText: 'Bad Request' });
            } catch (err) {
                console.error('[PWA Shim] Background upload failed:', err);
                return new Response('Upload failed', { status: 500, statusText: 'Internal Error' });
            }
        }

        // --- 缩略图 API（JS fetch 调用）---
        // 注意：<img src="/thumbnail?..."> 的请求由 Service Worker 拦截处理
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
                        return new Response(new Blob([bytes], { type: mime }), { status: 200, statusText: 'OK', headers: { 'Content-Type': mime, 'Cache-Control': 'no-cache' } });
                    }
                } catch (e) { console.error('[PWA Shim] Thumbnail error:', e); }
                return new Response(null, { status: 404, statusText: 'Not Found' });
            }
            return new Response(null, { status: 404, statusText: 'Not Found' });
        }

        const mockResponse = await getMockResponse(url, method, body);
        if (mockResponse !== null) {
            console.log('[PWA Shim]', method, requestPath, '→ mock', mockResponse.status);
            if (window.__pwaApiLog) window.__pwaApiLog.push(method + ' ' + requestPath + ' → ' + mockResponse.status);
            if (mockResponse.status === 204) return new Response(null, { status: 204, statusText: 'No Content', headers: { 'Content-Type': 'application/json' } });
            return new Response(JSON.stringify(mockResponse.data), { status: mockResponse.status, statusText: mockResponse.status === 200 ? 'OK' : 'Error', headers: { 'Content-Type': 'application/json' } });
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
                    })().catch(err => { console.error('[PWA Shim] XHR mock error:', err); originalXHRSend.call(xhr, body); });
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
