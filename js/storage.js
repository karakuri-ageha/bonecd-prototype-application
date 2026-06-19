/**
 * BONECD localStorage管理 — 複数キャラクター対応版
 *
 * データ構造:
 *   bonecd_characters : Character[]   全キャラクター一覧
 *   bonecd_active_id  : string        現在編集中のキャラクターID
 *
 * Character {
 *   id        : string   UUID
 *   name      : string   キャラクター名
 *   parts     : number[] 選択パーツNo.一覧
 *   formData  : object   { "part1_フィールド名": "値", ... }
 *   createdAt : number   作成日時 (ms)
 *   updatedAt : number   更新日時 (ms)
 * }
 */

const Storage = {
    KEYS: {
        CHARACTERS: 'bonecd_characters',
        ACTIVE_ID:  'bonecd_active_id',
    },

    // --------------------------------------------------------
    //  ユーティリティ
    // --------------------------------------------------------
    _genId() {
        return 'ch_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    },

    // --------------------------------------------------------
    //  全キャラクター CRUD
    // --------------------------------------------------------
    loadAll() {
        const raw = localStorage.getItem(this.KEYS.CHARACTERS);
        return raw ? JSON.parse(raw) : [];
    },

    saveAll(characters) {
        localStorage.setItem(this.KEYS.CHARACTERS, JSON.stringify(characters));
    },

    /** 指定IDのキャラクターを取得（なければ null） */
    getById(id) {
        return this.loadAll().find(c => c.id === id) || null;
    },

    /** 新規キャラクターを作成して返す */
    createCharacter(name = '新規キャラクター') {
        const char = {
            id:        this._genId(),
            name,
            parts:     [],
            formData:  {},
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        const all = this.loadAll();
        all.push(char);
        this.saveAll(all);
        return char;
    },

    /** キャラクターを更新（部分更新可） */
    updateCharacter(id, patch) {
        const all = this.loadAll();
        const idx = all.findIndex(c => c.id === id);
        if (idx === -1) return null;
        all[idx] = { ...all[idx], ...patch, updatedAt: Date.now() };
        this.saveAll(all);
        return all[idx];
    },

    /** キャラクターを削除 */
    deleteCharacter(id) {
        const all = this.loadAll().filter(c => c.id !== id);
        this.saveAll(all);
        // アクティブIDが削除対象なら先頭に切り替え
        if (this.getActiveId() === id) {
            this.setActiveId(all.length > 0 ? all[0].id : null);
        }
    },

    // --------------------------------------------------------
    //  アクティブキャラクター管理
    // --------------------------------------------------------
    getActiveId() {
        return localStorage.getItem(this.KEYS.ACTIVE_ID) || null;
    },

    setActiveId(id) {
        if (id === null) {
            localStorage.removeItem(this.KEYS.ACTIVE_ID);
        } else {
            localStorage.setItem(this.KEYS.ACTIVE_ID, id);
        }
    },

    /** アクティブキャラクターを取得。なければ最初の1体、それもなければ新規作成 */
    getActiveCharacter() {
        const id  = this.getActiveId();
        const all = this.loadAll();

        if (id) {
            const found = all.find(c => c.id === id);
            if (found) return found;
        }
        // fallback: 先頭 or 新規作成
        if (all.length > 0) {
            this.setActiveId(all[0].id);
            return all[0];
        }
        const created = this.createCharacter();
        this.setActiveId(created.id);
        return created;
    },

    // --------------------------------------------------------
    //  選択パーツ・フォームデータ（アクティブキャラ対象）
    // --------------------------------------------------------
    saveSelectedParts(partNumbers) {
        const char = this.getActiveCharacter();
        this.updateCharacter(char.id, { parts: partNumbers });
    },

    loadSelectedParts() {
        return this.getActiveCharacter().parts || [];
    },

    saveFormData(data) {
        const char = this.getActiveCharacter();
        this.updateCharacter(char.id, { formData: data });
    },

    loadFormData() {
        return this.getActiveCharacter().formData || {};
    },

    saveCharacterName(name) {
        const char = this.getActiveCharacter();
        this.updateCharacter(char.id, { name });
    },

    loadCharacterName() {
        return this.getActiveCharacter().name || '';
    },

    // --------------------------------------------------------
    //  旧互換・全クリア
    // --------------------------------------------------------
    clearAll() {
        Object.values(this.KEYS).forEach(key => localStorage.removeItem(key));
    },

    /** エクスポート用：アクティブキャラの全データ取得 */
    getAllData() {
        const char = this.getActiveCharacter();
        return {
            characterName: char.name,
            selectedParts: char.parts,
            formData:      char.formData,
        };
    },
};
