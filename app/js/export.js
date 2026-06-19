/**
 * BONECD 出力機能（Markdown生成・ダウンロード・印刷）
 *
 * generateMarkdown(includeEmpty)
 *   includeEmpty=false（デフォルト）: 記入済みフィールドが1つもないパーツはまるごとスキップ
 *   includeEmpty=true : 全パーツ・全フィールドを出力、空欄は「（未記入）」と表示
 *
 * generatePrintHTML(includeEmpty)  — 同上
 */

const Export = {

    // --------------------------------------------------------
    // Markdown 生成
    // --------------------------------------------------------
    generateMarkdown(includeEmpty = false) {
        const data = Storage.getAllData();
        const characterName = data.characterName || '無名のキャラクター';
        const selectedParts = data.selectedParts;
        const formData = data.formData;

        let md = `# ${characterName}\n\n`;
        md += `> BONECD - Body-Oriented Notation & Element Character Database\n\n`;
        md += `---\n\n`;

        BONECD_GROUPS.forEach(group => {
            const partsInGroup = BONECD_PARTS.filter(
                p => p.group === group.id && selectedParts.includes(p.no)
            );

            if (partsInGroup.length === 0) return;

            // includeEmpty=false の場合、グループ内に「記入済みパーツ」が
            // 1つもなければグループ見出しごとスキップ
            const visibleParts = includeEmpty
                ? partsInGroup
                : partsInGroup.filter(part =>
                    part.fields.some(field => {
                        const v = formData[`part${part.no}_${field}`];
                        return v && v.trim();
                    })
                );

            if (visibleParts.length === 0) return;

            md += `## ${group.label}\n\n`;

            visibleParts.forEach(part => {
                md += `### No.${part.no} ${part.name}\n\n`;
                md += `| 項目 | 内容 |\n`;
                md += `| --- | --- |\n`;

                part.fields.forEach(field => {
                    const key = `part${part.no}_${field}`;
                    const value = formData[key] || '';

                    if (includeEmpty) {
                        // 空欄も出力 → 未記入と表示
                        const display = value.trim()
                            ? value.replace(/\n/g, ' ')
                            : '（未記入）';
                        md += `| ${field} | ${display} |\n`;
                    } else {
                        // 値があるフィールドのみ
                        if (value.trim()) {
                            md += `| ${field} | ${value.replace(/\n/g, ' ')} |\n`;
                        }
                    }
                });

                md += `\n`;
            });

            md += `---\n\n`;
        });

        return md;
    },

    // --------------------------------------------------------
    // Markdown ファイルダウンロード
    // --------------------------------------------------------
    downloadMarkdown(includeEmpty = false) {
        const md = this.generateMarkdown(includeEmpty);
        const characterName = Storage.loadCharacterName() || 'character';
        const filename = `${characterName}_BONECD.md`;

        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // --------------------------------------------------------
    // 印刷用 HTML 生成
    // --------------------------------------------------------
    generatePrintHTML(includeEmpty = false) {
        const data = Storage.getAllData();
        const characterName = data.characterName || '無名のキャラクター';
        const selectedParts = data.selectedParts;
        const formData = data.formData;

        let html = `<div class="print-title">${characterName} - BONECD</div>\n`;

        BONECD_GROUPS.forEach(group => {
            const partsInGroup = BONECD_PARTS.filter(
                p => p.group === group.id && selectedParts.includes(p.no)
            );

            if (partsInGroup.length === 0) return;

            // includeEmpty=false の場合、記入済みパーツのみ
            const visibleParts = includeEmpty
                ? partsInGroup
                : partsInGroup.filter(part =>
                    part.fields.some(field => {
                        const v = formData[`part${part.no}_${field}`];
                        return v && v.trim();
                    })
                );

            if (visibleParts.length === 0) return;

            html += `<h2 style="font-size:12pt;margin:1em 0 0.5em;border-bottom:1px solid #999;padding-bottom:0.3em;">${group.label}</h2>\n`;

            visibleParts.forEach(part => {
                // 出力するフィールドを絞り込む
                const fieldsToShow = includeEmpty
                    ? part.fields
                    : part.fields.filter(field => {
                        const v = formData[`part${part.no}_${field}`];
                        return v && v.trim();
                    });

                html += `<div class="print-part">\n`;
                html += `  <div class="print-part-title">No.${part.no} ${part.name}</div>\n`;
                html += `  <table class="print-table"><tbody>\n`;

                fieldsToShow.forEach(field => {
                    const key = `part${part.no}_${field}`;
                    const raw = formData[key] || '';
                    const display = includeEmpty && !raw.trim()
                        ? '<span style="color:#aaa;font-style:italic;">（未記入）</span>'
                        : raw.replace(/\n/g, '<br>');
                    html += `    <tr><th>${field}</th><td>${display}</td></tr>\n`;
                });

                html += `  </tbody></table>\n`;
                html += `</div>\n`;
            });
        });

        return html;
    },

    // --------------------------------------------------------
    // 印刷実行
    // --------------------------------------------------------
    print(includeEmpty = false) {
        const printContent = document.getElementById('print-content');
        printContent.innerHTML = this.generatePrintHTML(includeEmpty);
        window.print();
    }
};
