/**
 * BONECD メインアプリケーション
 * 2ペインレイアウト：パーツ選択 → 即時フォーム表示
 */

// ============================================================
//  列数切替システム
// ============================================================
const ColSwitcher = {

    STORAGE_KEY: 'bonecd_cols',
    current: 2,  // デフォルト2列

    init() {
        // 保存済み列数を復元
        const saved = parseInt(localStorage.getItem(this.STORAGE_KEY));
        if (saved && [1, 2, 3, 4].includes(saved)) {
            this.current = saved;
        }
        // ボタンにイベントを付与
        document.querySelectorAll('.col-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const cols = parseInt(btn.dataset.cols);
                this.apply(cols);
            });
        });
        // 起動時に適用
        this.apply(this.current, false);
    },

    // 列数を適用（saveFlag=trueのときlocalStorageに保存）
    apply(cols, save = true) {
        this.current = cols;
        if (save) localStorage.setItem(this.STORAGE_KEY, cols);

        // 全グリッドに cols-N クラスを付け替え
        document.querySelectorAll('.form-fields-grid').forEach(grid => {
            grid.classList.remove('cols-1', 'cols-2', 'cols-3', 'cols-4');
            grid.classList.add(`cols-${cols}`);
        });

        // ボタンのアクティブ状態を更新
        document.querySelectorAll('.col-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.cols) === cols);
        });
    },

    // 新しく追加されたグリッドにも列数クラスを適用（addFormSection から呼ぶ）
    applyToNew(gridEl) {
        gridEl.classList.remove('cols-1', 'cols-2', 'cols-3', 'cols-4');
        gridEl.classList.add(`cols-${this.current}`);
    },
};

// ============================================================
//  クイック選択プリセット定義（第3章「用途別おすすめ構成」準拠）
// ============================================================
const QUICK_PRESETS = [
    {
        id: 'minimal',
        label: '最小構成',
        parts: [36, 37, 2]
    },
    {
        id: 'light',
        label: 'ライト',
        parts: [1,2,3,4,5,6,7,8, 36,37,38,39,40,41,42,43,44,45,46,47,48]
    },
    {
        id: 'illust',
        label: 'イラスト発注',
        parts: [37, 1, 38, 9, 49, 51, 47]
    },
    {
        id: 'novel',
        label: '小説・漫画',
        parts: [1,2,3,4,5,6,7,8, 36,37,38,39,40,41,42,43,44,45,46,47,48]
        // 共通ベース全部。拡張はユーザーが追加
    },
    {
        id: 'trpg',
        label: 'TRPG',
        parts: [1,2,3,4,5,6,7,8, 36,37,38,39,40,41,42,43,44,45,46,47,48, 58,59,22]
    },
    {
        id: 'r18',
        label: 'R18',
        parts: [1,2,3,4,5,6,7,8, 36,37,38,39,40,41,42,43,44,45,46,47,48,
                9,10,11,12,13,14,15,16,17,18,19, 53]
    },
    {
        id: 'all',
        label: '全部',
        parts: Array.from({length: 61}, (_, i) => i + 1)
    }
];

// ============================================================
//  区分フィルタ定義（第2章「区分」列準拠）
// ============================================================
const CATEGORY_FILTERS = [
    { id: 'all',         label: 'すべて',       parts: null },
    { id: 'visual',      label: 'ビジュアル',    parts: [1,9,10,14,15,16,17,18,19,33,35,37,38,39,49,50,51,52,55,61] },
    { id: 'personality', label: 'パーソナリティ', parts: [2,3,4,8,11,13,22,23,24,25,27,29,31] },
    { id: 'lifestyle',   label: 'ライフスタイル', parts: [5,6,12,20,21,26,28,30,34,42,43] },
    { id: 'narrative',   label: 'ナラティブ',    parts: [7,58,59] },
    { id: 'expression',  label: '表現',          parts: [32,40,41,56] },
    { id: 'social',      label: 'ソーシャル',    parts: [44,45,46,53,57,60] },
    { id: 'meta',        label: 'メタ・設定',    parts: [36,47,48,54] },
];

const App = {

    // 現在アクティブな区分フィルタ
    activeFilter: 'all',
    // 現在アクティブなクイック選択
    activePreset: null,

    init() {
        this.bindTabs();
        this.bindCharNameInput();
        this.renderQuickSelect();
        this.renderCategoryFilter();
        this.renderPartsSelector();
        this.bindSelectorPanels();
        this.loadSavedState();
        this.bindSaveButton();
        this.bindExportModal();
        this.bindClearAll();
        this.updateSelectedCount();
        this.updateEmptyState();
        Gallery.init();
    },

    // ============================================================
    //  タブ切り替え（エディタ ↔ ギャラリー）
    // ============================================================
    bindTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                // タブボタンのactive切り替え
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
                // 画面切り替え
                document.getElementById('view-editor').classList.toggle('hidden', tab !== 'editor');
                document.getElementById('view-gallery').classList.toggle('hidden', tab !== 'gallery');
                // ヘッダーアクション切り替え
                document.getElementById('editor-actions').classList.toggle('hidden', tab !== 'editor');
                document.getElementById('gallery-actions').classList.toggle('hidden', tab !== 'gallery');
                // ギャラリー表示時は再描画
                if (tab === 'gallery') Gallery.render();
            });
        });
    },

    // ============================================================
    //  キャラクター名入力バインド
    // ============================================================
    bindCharNameInput() {
        const input = document.getElementById('char-name-input');
        const hint  = document.getElementById('char-name-hint');
        if (!input) return;
        // 初期値をロード
        input.value = Storage.loadCharacterName();
        if (input.value) hint.style.display = 'none';

        input.addEventListener('input', () => {
            Storage.saveCharacterName(input.value);
            hint.style.display = input.value ? 'none' : '';
        });
    },

    // エディタ画面をアクティブキャラで再ロード
    reloadEditor() {
        // フォームをクリア
        document.getElementById('form-container').innerHTML = '';
        document.querySelectorAll('.part-checkbox:checked').forEach(cb => {
            cb.checked = false;
            cb.closest('.part-checkbox-item').classList.remove('is-checked');
        });
        document.querySelectorAll('.group-toggle').forEach(t => t.checked = false);
        // キャラ名反映
        const input = document.getElementById('char-name-input');
        const hint  = document.getElementById('char-name-hint');
        if (input) {
            input.value = Storage.loadCharacterName();
            if (hint) hint.style.display = input.value ? 'none' : '';
        }
        // 保存済み状態を復元
        this.loadSavedState();
        this.activePreset = null;
        document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
    },

    // ============================================================
    //  セレクターパネル（3パネル）開閉バインド
    // ============================================================
    bindSelectorPanels() {
        document.querySelectorAll('.selector-panel-header').forEach(header => {
            header.addEventListener('click', () => {
                const panel = header.dataset.panel;
                const body  = document.getElementById(`panel-${panel}-body`);
                const icon  = header.querySelector('.selector-panel-icon');
                if (!body) return;
                const isOpen = body.classList.contains('open');
                body.classList.toggle('open', !isOpen);
                icon.classList.toggle('open', !isOpen);
            });
        });
    },

    // ============================================================
    //  クイック選択パネル描画
    // ============================================================
    renderQuickSelect() {
        const grid = document.getElementById('quick-btn-grid');
        if (!grid) return;
        grid.innerHTML = '';

        QUICK_PRESETS.forEach(preset => {
            const btn = document.createElement('button');
            btn.className = 'quick-btn';
            btn.dataset.presetId = preset.id;
            btn.textContent = preset.label;

            btn.addEventListener('click', () => {
                this.applyPreset(preset);
            });

            grid.appendChild(btn);
        });
    },

    applyPreset(preset) {
        const currentSelected = Storage.loadSelectedParts();
        const hasSelection = currentSelected.length > 0;

        const doApply = () => {
            // 既存を全解除
            document.querySelectorAll('.part-checkbox:checked').forEach(cb => {
                cb.checked = false;
                cb.closest('.part-checkbox-item').classList.remove('is-checked');
            });
            document.querySelectorAll('.group-toggle').forEach(t => t.checked = false);
            document.getElementById('form-container').innerHTML = '';

            // プリセットのパーツを選択
            preset.parts.forEach(no => {
                const cb = document.getElementById(`part-${no}`);
                if (!cb) return;
                // フィルタで非表示でも選択は通す
                cb.checked = true;
                cb.closest('.part-checkbox-item').classList.add('is-checked');
                this.addFormSection(no);
            });

            // アクティブ状態の更新
            document.querySelectorAll('.quick-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.presetId === preset.id);
            });
            this.activePreset = preset.id;

            this.saveSelection();
            this.updateSelectedCount();
            this.updateEmptyState();
            BONECD_GROUPS.forEach(g => {
                this.updateGroupToggle(g.id);
                this.updateGroupCount(g.id);
            });
        };

        if (hasSelection) {
            if (confirm(`現在の選択（${currentSelected.length}パーツ）を「${preset.label}」に置き換えますか？`)) {
                doApply();
            }
        } else {
            doApply();
        }
    },

    // ============================================================
    //  区分フィルタパネル描画
    // ============================================================
    renderCategoryFilter() {
        const grid = document.getElementById('filter-btn-grid');
        if (!grid) return;
        grid.innerHTML = '';

        CATEGORY_FILTERS.forEach(filter => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn' + (filter.id === 'all' ? ' filter-all active' : '');
            btn.dataset.filterId = filter.id;
            btn.textContent = filter.label;

            btn.addEventListener('click', () => {
                this.applyFilter(filter);
            });

            grid.appendChild(btn);
        });
    },

    applyFilter(filter) {
        this.activeFilter = filter.id;

        // ボタンのアクティブ状態
        document.querySelectorAll('.filter-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.filterId === filter.id);
        });

        // パーツ一覧の表示/非表示を切り替え
        document.querySelectorAll('.part-checkbox-item').forEach(item => {
            const no = parseInt(item.dataset.partNo);
            if (filter.parts === null) {
                // すべて表示
                item.classList.remove('filter-hidden');
            } else {
                item.classList.toggle('filter-hidden', !filter.parts.includes(no));
            }
        });

        // グループ内が全非表示になったグループは折りたたむ
        document.querySelectorAll('.part-category-group').forEach(group => {
            const visible = group.querySelectorAll('.part-checkbox-item:not(.filter-hidden)');
            group.classList.toggle('filter-empty', visible.length === 0);
        });
    },

    // ============================================================
    //  パーツ選択カラム描画（アコーディオン）
    // ============================================================
    renderPartsSelector() {
        const container = document.getElementById('parts-selector');
        container.innerHTML = '';

        BONECD_GROUPS.forEach((group) => {
            // 3パネル構造では全グループをデフォルト展開
            const parts = BONECD_PARTS.filter(p => p.group === group.id);
            const isOpen = true;

            const groupDiv = document.createElement('div');
            groupDiv.className = 'part-category-group';
            groupDiv.dataset.groupId = group.id;

            // ヘッダー（クリックで開閉）
            const header = document.createElement('div');
            header.className = 'part-category-header accordion-header';
            header.innerHTML = `
                <span class="accordion-title">
                    <i class="fas fa-chevron-right accordion-icon open"></i>
                    ${group.label}
                    <span class="group-count" data-group-count="${group.id}">0 / ${parts.length}</span>
                </span>
                <label class="group-select-all" onclick="event.stopPropagation()">
                    <input type="checkbox" class="group-toggle" data-group="${group.id}">
                    全選択
                </label>
            `;

            // パーツリスト（開閉対象）
            const body = document.createElement('div');
            body.className = 'accordion-body' + (isOpen ? ' open' : '');

            parts.forEach(part => {
                const item = document.createElement('div');
                item.className = 'part-checkbox-item';
                item.dataset.partNo = part.no;
                item.innerHTML = `
                    <input type="checkbox" id="part-${part.no}" data-part-no="${part.no}" class="part-checkbox">
                    <label for="part-${part.no}">
                        <span class="part-no">No.${part.no}</span>${part.name}
                    </label>
                    <span class="part-meta">${part.fields.length}項</span>
                `;
                body.appendChild(item);
            });

            groupDiv.appendChild(header);
            groupDiv.appendChild(body);
            container.appendChild(groupDiv);

            // ヘッダークリックで開閉
            header.addEventListener('click', (e) => {
                // 全選択ラベルのクリックは除外
                if (e.target.closest('.group-select-all')) return;
                const isNowOpen = body.classList.contains('open');
                body.classList.toggle('open', !isNowOpen);
                header.querySelector('.accordion-icon').classList.toggle('open', !isNowOpen);
            });
        });

        this.bindPartCheckboxes();
        this.bindGroupToggles();
    },

    bindPartCheckboxes() {
        document.querySelectorAll('.part-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const partNo = parseInt(e.target.dataset.partNo);
                const checked = e.target.checked;
                const item = e.target.closest('.part-checkbox-item');

                // チェック済みスタイル
                item.classList.toggle('is-checked', checked);

                if (checked) {
                    this.addFormSection(partNo);
                } else {
                    this.removeFormSection(partNo);
                }

                const groupId = BONECD_PARTS.find(p => p.no === partNo).group;
                this.saveSelection();
                this.updateSelectedCount();
                this.updateEmptyState();
                this.updateGroupToggle(groupId);
                this.updateGroupCount(groupId);
            });
        });
    },

    bindGroupToggles() {
        document.querySelectorAll('.group-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const groupId = e.target.dataset.group;
                const parts   = BONECD_PARTS.filter(p => p.group === groupId);
                const checked = e.target.checked;

                parts.forEach(part => {
                    const cb = document.getElementById(`part-${part.no}`);
                    if (!cb) return;
                    if (cb.checked === checked) return; // 変化なし

                    cb.checked = checked;
                    const item = cb.closest('.part-checkbox-item');
                    item.classList.toggle('is-checked', checked);

                    if (checked) {
                        this.addFormSection(part.no);
                    } else {
                        this.removeFormSection(part.no);
                    }
                });

                this.saveSelection();
                this.updateSelectedCount();
                this.updateEmptyState();
                BONECD_GROUPS.forEach(g => this.updateGroupCount(g.id));
            });
        });
    },

    // ============================================================
    //  フォームセクションの追加・削除
    // ============================================================
    addFormSection(partNo) {
        // すでに存在する場合はスキップ
        if (document.getElementById(`form-part-${partNo}`)) return;

        const part = BONECD_PARTS.find(p => p.no === partNo);
        if (!part) return;

        const formData = Storage.loadFormData();
        const section  = document.createElement('div');
        section.className = 'form-part-section';
        section.id = `form-part-${partNo}`;
        section.dataset.partGroup = part.group;  // 内在/外在色分け用

        // フィールドHTML生成（列数はColSwitcherが管理）
        let fieldsHtml = '<div class="form-fields-grid">';
        part.fields.forEach(field => {
            const key   = `part${part.no}_${field}`;
            const value = formData[key] || '';
            const desc  = (part.descriptions && part.descriptions[field])
                ? part.descriptions[field]
                : `${field}を入力`;
            const hasVal = value ? ' has-value' : '';
            fieldsHtml += `
                <div class="form-field">
                    <label for="${key}">${field}</label>
                    <textarea id="${key}" data-key="${key}" rows="2"
                              placeholder="${desc}"
                              class="${hasVal}">${this.escapeHtml(value)}</textarea>
                </div>
            `;
        });
        fieldsHtml += '</div>';

        section.innerHTML = `
            <div class="form-part-header">
                <span>
                    <span class="text-gray-400 text-xs mr-1.5">No.${part.no}</span>
                    ${part.name}
                    <span class="text-xs text-gray-400 ml-1.5">${part.category}</span>
                </span>
                <button class="part-header-remove" data-remove="${partNo}" title="選択を外す">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="form-part-body">
                ${fieldsHtml}
            </div>
        `;

        // 正しい順序（No. 昇順）で挿入
        const container = document.getElementById('form-container');
        const existing  = [...container.querySelectorAll('.form-part-section')];
        const afterEl   = existing.find(el => {
            const no = parseInt(el.id.replace('form-part-', ''));
            return no > partNo;
        });

        if (afterEl) {
            container.insertBefore(section, afterEl);
        } else {
            container.appendChild(section);
        }

        // 現在の列数設定を新しいグリッドに適用
        const newGrid = section.querySelector('.form-fields-grid');
        if (newGrid) ColSwitcher.applyToNew(newGrid);

        // 削除ボタン
        section.querySelector('.part-header-remove').addEventListener('click', () => {
            const cb = document.getElementById(`part-${partNo}`);
            if (cb) {
                cb.checked = false;
                cb.closest('.part-checkbox-item').classList.remove('is-checked');
            }
            this.removeFormSection(partNo);
            this.saveSelection();
            this.updateSelectedCount();
            this.updateEmptyState();
            this.updateGroupToggle(part.group);
            this.updateGroupCount(part.group);
        });

        // textarea 自動保存イベント
        section.querySelectorAll('textarea').forEach(ta => {
            ta.addEventListener('input', () => {
                ta.classList.toggle('has-value', ta.value.length > 0);
                this.scheduleSave();
            });
        });
    },

    removeFormSection(partNo) {
        const el = document.getElementById(`form-part-${partNo}`);
        if (el) {
            // フェードアウト
            el.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
            el.style.opacity = '0';
            el.style.transform = 'translateY(-6px)';
            setTimeout(() => el.remove(), 150);
        }
    },

    // ============================================================
    //  ユーティリティ
    // ============================================================
    escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },

    updateEmptyState() {
        const container  = document.getElementById('form-container');
        const emptyState = document.getElementById('form-empty-state');
        const hasAny     = container.children.length > 0;
        emptyState.style.display = hasAny ? 'none' : 'block';
    },

    updateSelectedCount() {
        const count = document.querySelectorAll('.part-checkbox:checked').length;
        document.getElementById('selected-count').textContent = `${count} / 61 パーツ選択中`;
    },

    updateGroupToggle(groupId) {
        const parts = BONECD_PARTS.filter(p => p.group === groupId);
        const allChecked = parts.every(p => {
            const cb = document.getElementById(`part-${p.no}`);
            return cb && cb.checked;
        });
        const toggle = document.querySelector(`.group-toggle[data-group="${groupId}"]`);
        if (toggle) toggle.checked = allChecked;
    },

    // グループのカウントバッジを更新
    updateGroupCount(groupId) {
        const parts      = BONECD_PARTS.filter(p => p.group === groupId);
        const checked    = parts.filter(p => {
            const cb = document.getElementById(`part-${p.no}`);
            return cb && cb.checked;
        }).length;
        const badge = document.querySelector(`[data-group-count="${groupId}"]`);
        if (badge) badge.textContent = `${checked} / ${parts.length}`;
        // 1件以上選択中はバッジを強調
        if (badge) badge.classList.toggle('has-selection', checked > 0);
    },

    // ============================================================
    //  保存まわり
    // ============================================================
    _saveTimer: null,
    scheduleSave() {
        clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => this.saveFormData(), 500);
    },

    saveFormData() {
        const data = {};
        document.querySelectorAll('#form-container textarea').forEach(ta => {
            if (ta.dataset.key && ta.value) {
                data[ta.dataset.key] = ta.value;
            }
        });
        Storage.saveFormData(data);
    },

    saveSelection() {
        const selected = [];
        document.querySelectorAll('.part-checkbox:checked').forEach(cb => {
            selected.push(parseInt(cb.dataset.partNo));
        });
        Storage.saveSelectedParts(selected);
    },

    bindSaveButton() {
        document.getElementById('btn-save').addEventListener('click', () => {
            this.saveFormData();
            this.showToast('保存しました');
        });
    },

    bindClearAll() {
        document.getElementById('btn-clear-all').addEventListener('click', () => {
            if (!confirm('選択中のパーツを全て解除しますか？')) return;

            document.querySelectorAll('.part-checkbox:checked').forEach(cb => {
                cb.checked = false;
                cb.closest('.part-checkbox-item').classList.remove('is-checked');
            });
            document.querySelectorAll('.group-toggle').forEach(t => t.checked = false);

            document.getElementById('form-container').innerHTML = '';
            this.saveSelection();
            this.updateSelectedCount();
            this.updateEmptyState();
        });
    },

    showToast(message) {
        const existing = document.querySelector('.save-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'save-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    },

    // ============================================================
    //  出力モーダル
    // ============================================================
    bindExportModal() {
        const modal       = document.getElementById('modal-export');
        const btnOpen     = document.getElementById('btn-show-export');
        const btnClose    = document.getElementById('btn-close-modal');
        const toggleChk   = document.getElementById('export-include-empty');
        const toggleLabel = document.getElementById('export-toggle-label');

        /** トグル状態を読み取り、ラベルを更新してプレビューを再描画 */
        const refreshPreview = () => {
            const includeEmpty = toggleChk.checked;
            // ラベルテキスト切替
            toggleLabel.textContent = includeEmpty ? '含む' : '含まない';
            toggleLabel.classList.toggle('is-active', includeEmpty);
            // プレビュー再描画
            document.getElementById('md-preview').textContent =
                Export.generateMarkdown(includeEmpty);
        };

        // モーダルを開く → プレビュー初期描画
        btnOpen.addEventListener('click', () => {
            refreshPreview();
            modal.classList.remove('hidden');
        });

        // トグル変更 → プレビューをリアルタイム更新
        toggleChk.addEventListener('change', refreshPreview);

        // 閉じる
        btnClose.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });

        // 印刷・Markdown DL にも includeEmpty を渡す
        document.getElementById('btn-print').addEventListener('click', () => {
            Export.print(toggleChk.checked);
        });
        document.getElementById('btn-download-md').addEventListener('click', () => {
            Export.downloadMarkdown(toggleChk.checked);
        });
    },

    // ============================================================
    //  保存状態の復元
    // ============================================================
    loadSavedState() {
        const selectedParts = Storage.loadSelectedParts();

        selectedParts.forEach(no => {
            const cb = document.getElementById(`part-${no}`);
            if (!cb) return;
            cb.checked = true;
            cb.closest('.part-checkbox-item').classList.add('is-checked');
            this.addFormSection(no);
        });

        // グループトグル・カウントの状態更新
        BONECD_GROUPS.forEach(group => {
            this.updateGroupToggle(group.id);
            this.updateGroupCount(group.id);
        });

        this.updateSelectedCount();
        this.updateEmptyState();
    }
};

// ============================================================
//  ギャラリー管理
// ============================================================
const Gallery = {

    init() {
        // 新規キャラボタン（ヘッダー右 + ギャラリー画面内）
        ['btn-new-char', 'btn-new-char-gallery', 'btn-new-char-empty'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', () => this.createNew());
        });
    },

    // 新規キャラクターを作成してエディタへ
    createNew() {
        const char = Storage.createCharacter('新規キャラクター');
        Storage.setActiveId(char.id);
        App.reloadEditor();
        // エディタタブへ切り替え
        document.querySelector('.tab-btn[data-tab="editor"]').click();
        // 名前入力にフォーカス
        setTimeout(() => {
            const input = document.getElementById('char-name-input');
            if (input) { input.focus(); input.select(); }
        }, 50);
    },

    // ギャラリーグリッドを描画
    render() {
        const all      = Storage.loadAll();
        const activeId = Storage.getActiveId();
        const grid     = document.getElementById('gallery-grid');
        const empty    = document.getElementById('gallery-empty');
        const summary  = document.getElementById('gallery-summary');

        summary.textContent = `${all.length} キャラクター`;

        if (all.length === 0) {
            grid.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }
        empty.classList.add('hidden');
        grid.innerHTML = '';

        // updatedAt 降順でソート
        const sorted = [...all].sort((a, b) => b.updatedAt - a.updatedAt);

        sorted.forEach(char => {
            const card = this.buildCard(char, char.id === activeId);
            grid.appendChild(card);
        });
    },

    // ギャラリーカードを生成
    buildCard(char, isActive) {
        const partsCount = char.parts ? char.parts.length : 0;
        const filledCount = char.formData
            ? Object.values(char.formData).filter(v => v && v.trim()).length
            : 0;
        const updatedDate = new Date(char.updatedAt).toLocaleDateString('ja-JP', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const card = document.createElement('div');
        card.className = 'gallery-card' + (isActive ? ' active' : '');
        card.dataset.charId = char.id;

        card.innerHTML = `
            <div class="gallery-card-header">
                <span class="gallery-card-active-badge ${isActive ? '' : 'hidden'}">
                    <i class="fas fa-pen-to-square"></i> 編集中
                </span>
                <button class="gallery-card-delete" data-id="${char.id}" title="削除">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="gallery-card-body">
                <div class="gallery-card-name">${this._esc(char.name) || '<span style="opacity:0.4">名前なし</span>'}</div>
                <div class="gallery-card-stats">
                    <span><i class="fas fa-puzzle-piece mr-1"></i>${partsCount} パーツ</span>
                    <span><i class="fas fa-pen mr-1"></i>${filledCount} 記入済み</span>
                </div>
            </div>
            <div class="gallery-card-footer">
                <span class="gallery-card-date">${updatedDate}</span>
                <button class="gallery-card-edit" data-id="${char.id}">
                    <i class="fas fa-pen-to-square mr-1"></i>編集
                </button>
            </div>
        `;

        // 編集ボタン
        card.querySelector('.gallery-card-edit').addEventListener('click', (e) => {
            e.stopPropagation();
            this.switchTo(char.id);
        });

        // カード本体クリックでも編集
        card.querySelector('.gallery-card-body').addEventListener('click', () => {
            this.switchTo(char.id);
        });

        // 削除ボタン
        card.querySelector('.gallery-card-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteChar(char.id, char.name);
        });

        return card;
    },

    // キャラクターに切り替えてエディタへ
    switchTo(id) {
        Storage.setActiveId(id);
        App.reloadEditor();
        document.querySelector('.tab-btn[data-tab="editor"]').click();
    },

    // キャラクターを削除
    deleteChar(id, name) {
        const all = Storage.loadAll();
        if (all.length === 1) {
            if (!confirm(`「${name || '名前なし'}」を削除しますか？\n削除後、新しいキャラクターが作成されます。`)) return;
            Storage.deleteCharacter(id);
            // 1体もいなくなるので新規作成
            const created = Storage.createCharacter();
            Storage.setActiveId(created.id);
            App.reloadEditor();
        } else {
            if (!confirm(`「${name || '名前なし'}」を削除しますか？`)) return;
            Storage.deleteCharacter(id);
            // アクティブIDは deleteCharacter 内で自動切替済み
            App.reloadEditor();
        }
        this.render();
    },

    _esc(str) {
        if (!str) return '';
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    },
};

// ============================================================
//  テーマシステム
// ============================================================
const Theme = {

    STORAGE_KEY_THEME:   'bonecd_theme',
    STORAGE_KEY_CUSTOMS: 'bonecd_custom_colors', // JSON: { "--theme-bg": "#xxx", ... }

    // テーマ定義
    THEMES: [
        { id: 'ledger',  label: '台帳',       swatch: '#6b4c2a' },
        { id: 'simple',  label: 'シンプル',    swatch: '#1f2937' },
        { id: 'modern',  label: 'モダン',       swatch: '#3b82f6' },
        { id: 'dark',    label: 'ダーク',       swatch: '#818cf8' },
        { id: 'fantasy', label: 'ファンタジー', swatch: '#c8960c' },
        { id: 'cyber',   label: 'サイバー',     swatch: '#00e5ff' },
        { id: 'wa',      label: '和',           swatch: '#c0392b' },
        { id: 'pop',     label: 'ポップ',       swatch: '#e8320a' },
    ],

    // カラーピッカー項目定義（var名 → エディタID / ギャラリーID）
    COLOR_PICKERS: [
        { varName: '--theme-bg',           editorId: 'cp-bg',      galleryId: 'cp-bg-g'      },
        { varName: '--theme-surface',      editorId: 'cp-surface',  galleryId: 'cp-surface-g' },
        { varName: '--theme-text',         editorId: 'cp-text',     galleryId: 'cp-text-g'    },
        { varName: '--theme-border',       editorId: 'cp-border',   galleryId: 'cp-border-g'  },
        { varName: '--theme-accent',       editorId: 'cp-accent',   galleryId: 'cp-accent-g'  },
        { varName: '--theme-inner-accent', editorId: 'cp-inner',    galleryId: 'cp-inner-g'   },
        { varName: '--theme-outer-accent', editorId: 'cp-outer',    galleryId: 'cp-outer-g'   },
    ],

    // テーマごとのデフォルトカラー値（ピッカー初期値のリセット用）
    THEME_DEFAULTS: {
        ledger:  { '--theme-bg':'#f8f5f0', '--theme-surface':'#ffffff', '--theme-text':'#2c2520', '--theme-border':'#ddd8cf', '--theme-accent':'#6b4c2a', '--theme-inner-accent':'#6b4c2a', '--theme-outer-accent':'#2a6b4c' },
        simple:  { '--theme-bg':'#f9fafb', '--theme-surface':'#ffffff', '--theme-text':'#111827', '--theme-border':'#e5e7eb', '--theme-accent':'#1f2937', '--theme-inner-accent':'#1f2937', '--theme-outer-accent':'#059669' },
        modern:  { '--theme-bg':'#f1f5f9', '--theme-surface':'#ffffff', '--theme-text':'#0f172a', '--theme-border':'#e2e8f0', '--theme-accent':'#3b82f6', '--theme-inner-accent':'#3b82f6', '--theme-outer-accent':'#10b981' },
        dark:    { '--theme-bg':'#0f1117', '--theme-surface':'#1a1d27', '--theme-text':'#e8eaf6', '--theme-border':'#2e3147', '--theme-accent':'#818cf8', '--theme-inner-accent':'#818cf8', '--theme-outer-accent':'#34d399' },
        fantasy: { '--theme-bg':'#1c1408', '--theme-surface':'#231a0c', '--theme-text':'#f2e4c0', '--theme-border':'#5c4820', '--theme-accent':'#c8960c', '--theme-inner-accent':'#c8960c', '--theme-outer-accent':'#6abf69' },
        cyber:   { '--theme-bg':'#050a0e', '--theme-surface':'#0a1628', '--theme-text':'#00ff9d', '--theme-border':'#0e3a50', '--theme-accent':'#00e5ff', '--theme-inner-accent':'#00e5ff', '--theme-outer-accent':'#00ff9d' },
        wa:      { '--theme-bg':'#faf7f2', '--theme-surface':'#fffef9', '--theme-text':'#1a0f0a', '--theme-border':'#d4c9b8', '--theme-accent':'#c0392b', '--theme-inner-accent':'#c0392b', '--theme-outer-accent':'#4a7c59' },
        pop:     { '--theme-bg':'#fef9ec', '--theme-surface':'#ffffff', '--theme-text':'#1a1200', '--theme-border':'#f0d060', '--theme-accent':'#e8320a', '--theme-inner-accent':'#e8320a', '--theme-outer-accent':'#00b050' },
    },

    current:      'simple',
    customColors: {},  // { "--theme-bg": "#xxx", ... }

    init() {
        // 保存済みテーマを復元
        const saved = localStorage.getItem(this.STORAGE_KEY_THEME);
        if (saved && this.THEMES.find(t => t.id === saved)) {
            this.current = saved;
        }
        // 保存済みカスタム色を復元
        const savedColors = localStorage.getItem(this.STORAGE_KEY_CUSTOMS);
        if (savedColors) {
            try { this.customColors = JSON.parse(savedColors); } catch(e) {}
        }

        this.apply(this.current);
        this.renderList();
        this.bindDropdown();
        this.bindColorPickers();
        this.bindResetButtons();
    },

    // テーマを適用（カスタム色は維持しつつテーマ切替）
    apply(themeId) {
        this.current = themeId;
        document.documentElement.setAttribute('data-theme', themeId);
        localStorage.setItem(this.STORAGE_KEY_THEME, themeId);

        // カスタム色が未設定ならCSS変数インラインをクリア（テーマ定義に戻す）
        if (Object.keys(this.customColors).length === 0) {
            this.COLOR_PICKERS.forEach(({ varName }) => {
                document.documentElement.style.removeProperty(varName);
            });
        } else {
            // カスタム色があれば再適用
            this._applyCustomColors();
        }

        // ピッカーの表示値をテーマデフォルト or カスタム値に更新
        this._syncPickerValues(themeId);

        // ラベル更新
        const t = this.THEMES.find(t => t.id === themeId);
        const labelText = t ? t.label : themeId;
        ['theme-label', 'theme-label-gallery'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = labelText;
        });

        // アクティブ状態更新
        document.querySelectorAll('.theme-item').forEach(item => {
            item.classList.toggle('active', item.dataset.themeId === themeId);
        });
    },

    // ピッカーの表示値を同期
    _syncPickerValues(themeId) {
        const defaults = this.THEME_DEFAULTS[themeId] || {};
        this.COLOR_PICKERS.forEach(({ varName, editorId, galleryId }) => {
            const val = this.customColors[varName] || defaults[varName] || '#ffffff';
            [editorId, galleryId].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = val;
            });
        });
    },

    // カスタム色をCSS変数に適用
    _applyCustomColors() {
        Object.entries(this.customColors).forEach(([varName, color]) => {
            document.documentElement.style.setProperty(varName, color);
            // アクセント系は accent-light も自動生成
            if (varName === '--theme-accent') {
                document.documentElement.style.setProperty('--theme-accent-light', color + '22');
            }
        });
    },

    // 1色を変更して即時反映
    setCustomColor(varName, color) {
        this.customColors[varName] = color;
        localStorage.setItem(this.STORAGE_KEY_CUSTOMS, JSON.stringify(this.customColors));
        document.documentElement.style.setProperty(varName, color);
        if (varName === '--theme-accent') {
            document.documentElement.style.setProperty('--theme-accent-light', color + '22');
        }
        // 両ドロップダウンのピッカーを同期
        this.COLOR_PICKERS.forEach(({ varName: vn, editorId, galleryId }) => {
            if (vn === varName) {
                [editorId, galleryId].forEach(id => {
                    const el = document.getElementById(id);
                    if (el && el.value !== color) el.value = color;
                });
            }
        });
    },

    // 全カスタム色をリセット
    resetCustomColors() {
        this.customColors = {};
        localStorage.removeItem(this.STORAGE_KEY_CUSTOMS);
        this.COLOR_PICKERS.forEach(({ varName }) => {
            document.documentElement.style.removeProperty(varName);
        });
        document.documentElement.style.removeProperty('--theme-accent-light');
        this._syncPickerValues(this.current);
    },

    // ドロップダウンにテーマ一覧を描画
    renderList() {
        ['theme-list', 'theme-list-gallery'].forEach(listId => {
            const list = document.getElementById(listId);
            if (!list) return;
            list.innerHTML = '';
            this.THEMES.forEach(t => {
                const item = document.createElement('div');
                item.className = 'theme-item' + (t.id === this.current ? ' active' : '');
                item.dataset.themeId = t.id;
                item.innerHTML = `
                    <span class="theme-swatch" style="background:${t.swatch}"></span>
                    <span>${t.label}</span>
                    <i class="fas fa-check theme-item-check"></i>
                `;
                item.addEventListener('click', () => {
                    this.resetCustomColors();
                    this.apply(t.id);
                    this.closeMenu();
                });
                list.appendChild(item);
            });
        });
    },

    // ドロップダウン開閉バインド
    bindDropdown() {
        [
            { triggerId: 'theme-trigger',        menuId: 'theme-menu' },
            { triggerId: 'theme-trigger-gallery', menuId: 'theme-menu-gallery' },
        ].forEach(({ triggerId, menuId }) => {
            const trigger = document.getElementById(triggerId);
            const menu    = document.getElementById(menuId);
            if (!trigger || !menu) return;
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = menu.classList.contains('open');
                this.closeMenu();
                if (!isOpen) {
                    menu.classList.add('open');
                    trigger.setAttribute('aria-expanded', 'true');
                }
            });
            menu.addEventListener('click', (e) => e.stopPropagation());
        });
        document.addEventListener('click', () => this.closeMenu());
    },

    closeMenu() {
        ['theme-menu', 'theme-menu-gallery'].forEach(id => {
            const m = document.getElementById(id);
            if (m) m.classList.remove('open');
        });
        ['theme-trigger', 'theme-trigger-gallery'].forEach(id => {
            const t = document.getElementById(id);
            if (t) t.setAttribute('aria-expanded', 'false');
        });
    },

    // カラーピッカーのinputイベントをバインド
    bindColorPickers() {
        this.COLOR_PICKERS.forEach(({ varName, editorId, galleryId }) => {
            [editorId, galleryId].forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                el.addEventListener('input', (e) => {
                    this.setCustomColor(varName, e.target.value);
                });
            });
        });
    },

    // リセットボタンをバインド
    bindResetButtons() {
        ['cp-reset-btn', 'cp-reset-btn-g'].forEach(id => {
            const btn = document.getElementById(id);
            if (!btn) return;
            btn.addEventListener('click', () => {
                this.resetCustomColors();
            });
        });
    },
};

// ============================================================
//  ドロワー管理（スマホ用）
// ============================================================
const Drawer = {

    init() {
        const btnOpen   = document.getElementById('btn-drawer-open');
        const overlay   = document.getElementById('drawer-overlay');
        const pane      = document.getElementById('pane-select');
        if (!btnOpen || !overlay || !pane) return;

        btnOpen.addEventListener('click', () => this.open());
        overlay.addEventListener('click', () => this.close());

        // スワイプで閉じる（左方向）
        let startX = 0;
        pane.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        }, { passive: true });
        pane.addEventListener('touchend', (e) => {
            const dx = e.changedTouches[0].clientX - startX;
            if (dx < -60) this.close();
        }, { passive: true });

        // タブ切替時はドロワーを閉じる
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.close());
        });
    },

    open() {
        document.getElementById('pane-select').classList.add('drawer-open');
        document.getElementById('drawer-overlay').classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    close() {
        document.getElementById('pane-select').classList.remove('drawer-open');
        document.getElementById('drawer-overlay').classList.remove('active');
        document.body.style.overflow = '';
    },
};

// ============================================================
//  HelpDrawer — 使い方ガイド／免責ドロワー
// ============================================================
const HelpDrawer = {
    _drawer:  null,
    _overlay: null,

    init() {
        this._drawer  = document.getElementById('help-drawer');
        this._overlay = document.getElementById('help-drawer-overlay');

        const btnOpen  = document.getElementById('btn-help-open');
        const btnClose = document.getElementById('btn-help-close');

        if (!this._drawer || !this._overlay || !btnOpen || !btnClose) return;

        btnOpen.addEventListener('click',  () => this.open());
        btnClose.addEventListener('click', () => this.close());

        // オーバーレイクリックで閉じる
        this._overlay.addEventListener('click', () => this.close());

        // Escキーで閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
        });
    },

    open() {
        this._drawer.classList.add('is-open');
        this._overlay.classList.add('is-open');
        this._drawer.removeAttribute('aria-hidden');
        document.body.style.overflow = 'hidden';
    },

    close() {
        this._drawer.classList.remove('is-open');
        this._overlay.classList.remove('is-open');
        this._drawer.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    },
};

// 起動
document.addEventListener('DOMContentLoaded', () => {
    Theme.init();
    Drawer.init();
    ColSwitcher.init();
    HelpDrawer.init();
    App.init();
});
