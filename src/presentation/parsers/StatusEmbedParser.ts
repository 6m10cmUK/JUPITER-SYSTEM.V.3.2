import { Embed } from 'discord.js';
import { SecondaryStats } from '../../application/dto/StatusDto';
import { StatusViewModel } from '../viewmodels/StatusViewModel';

// StatusEmbedFormatterが生成するフィールド名/値のパターンに対応
// フィールド名例: "1️⃣ STR: 15", "Total: 120", "LUC: 75\nKNW: 60\nIDA: 55"
// フィールド値例: "**振り直し回数: 3**", "**DB: +1d4 BUILD: 1**"
const EMBED_PATTERNS = {
    /** プライマリステータスのフィールド名: "1️⃣ STR: 15" → stat名と値 */
    primaryStat: /^\d️⃣\s*([A-Z]+):\s*(\d+)$/,
    /** 振り直し回数: "**振り直し回数: 3**" */
    rerollCount: /\*\*振り直し回数\s*:\s*(\d+)\*\*/,
    /** DB: "DB: +1d4" or "DB: ±0" */
    db: /DB:\s*([+-]?\d+[dD]\d+|±0|[+-]?\d+)/,
    /** BUILD (Ver7): "BUILD: 1" */
    build: /BUILD:\s*([+-]?\d+)/,
    /** 二次ステータス各種 */
    luc: /LUC:\s*(\d+)/,
    knw: /KNW:\s*(\d+)/,
    ida: /IDA:\s*(\d+)/,
    mov: /MOV:\s*(\d+)/,
    hp: /HP:\s*(\d+)/,
    mp: /MP:\s*(\d+)/,
    san: /SAN:\s*(\d+)/,
    jobPoints: /基礎職業P:\s*(\d+)/,
    interestPoints: /興味P:\s*(\d+)/,
} as const;

export class StatusEmbedParser {
    parse(embed: Embed): StatusViewModel | null {
        if (!embed.data?.fields || embed.data.fields.length === 0) {
            return null;
        }

        const version = embed.data.footer?.text as '6' | '7' || '6';
        const characterName = embed.data.description?.split('NAME: ')[1] || 'キャラクター名';
        
        // タイトルからカスタムメニューフラグを判定
        const showCustomMenu = embed.data.title?.includes('CUSTOM STATUS') || false;
        
        // プライマリステータスの抽出
        const primaryStats: Record<string, number> = {};
        const primaryStatsDetails: Record<string, string> = {};
        
        const statOrder = version === '6' 
            ? ['STR', 'CON', 'POW', 'DEX', 'APP', 'SIZ', 'INT', 'EDU']
            : ['STR', 'CON', 'POW', 'DEX', 'APP', 'SIZ', 'INT', 'EDU', 'LUC'];
        
        // フィールド名でステータスを検索して値を抽出（インデックスに依存しない）
        for (const field of embed.data!.fields!) {
            const match = field.name.match(EMBED_PATTERNS.primaryStat);
            if (match && statOrder.includes(match[1])) {
                primaryStats[match[1]] = parseInt(match[2], 10);
                primaryStatsDetails[match[1]] = field.value || '(詳細なし)';
            }
        }
        
        // 二次ステータスの抽出
        const secondaryStats: Partial<SecondaryStats> = {};
        
        // 振り直し回数の抽出
        let rerollCount = 0;
        embed.data.fields.forEach(field => {
            const match = field.value.match(EMBED_PATTERNS.rerollCount);
            if (match) {
                rerollCount = parseInt(match[1], 10);
            }
        });
        
        // 変更履歴の抽出
        const historyField = embed.data.fields.find(field => field.name === '変更履歴');
        const history = historyField?.value || '';
        
        // 二次ステータスをフィールドから抽出
        this.extractSecondaryStats(embed, version, primaryStats, secondaryStats);
        
        return {
            version,
            characterName,
            primaryStats,
            primaryStatsDetails,
            secondaryStats: secondaryStats as SecondaryStats,
            rerollCount,
            history,
            showCustomMenu,
            messageId: '', // これはインタラクションのコンテキストから設定される
            userId: '' // これはインタラクションのコンテキストから設定される
        };
    }
    
    private extractSecondaryStats(
        embed: Embed, 
        version: '6' | '7', 
        primaryStats: Record<string, number>,
        secondaryStats: Partial<SecondaryStats>
    ): void {
        // Totalフィールドからの抽出
        const totalField = embed.data!.fields!.find(field => field.name.startsWith('Total:'));
        if (totalField) {
            // DBの抽出（ダイス記法を優先）
            const dbMatch = totalField.value.match(EMBED_PATTERNS.db);
            if (dbMatch) {
                secondaryStats.DB = dbMatch[1];
            }

            // BUILDの抽出（Ver7のみ）
            if (version === '7') {
                const buildMatch = totalField.value.match(EMBED_PATTERNS.build);
                if (buildMatch) {
                    secondaryStats.BUILD = parseInt(buildMatch[1], 10);
                }
            }
        }
        
        // その他の二次ステータスをフィールド名から抽出
        embed.data!.fields!.forEach(field => {
            const name = field.name;
            const tryExtract = (pattern: RegExp): number | null => {
                const m = name.match(pattern);
                return m ? parseInt(m[1], 10) : null;
            };

            secondaryStats.LUC ??= tryExtract(EMBED_PATTERNS.luc) ?? undefined;
            secondaryStats.KNW ??= tryExtract(EMBED_PATTERNS.knw) ?? undefined;
            secondaryStats.IDA ??= tryExtract(EMBED_PATTERNS.ida) ?? undefined;
            secondaryStats.MOV ??= tryExtract(EMBED_PATTERNS.mov) ?? undefined;
            secondaryStats.HP ??= tryExtract(EMBED_PATTERNS.hp) ?? undefined;
            secondaryStats.MP ??= tryExtract(EMBED_PATTERNS.mp) ?? undefined;
            secondaryStats.SAN ??= tryExtract(EMBED_PATTERNS.san) ?? undefined;
            secondaryStats.JobPoints ??= tryExtract(EMBED_PATTERNS.jobPoints) ?? undefined;
            secondaryStats.InterestPoints ??= tryExtract(EMBED_PATTERNS.interestPoints) ?? undefined;
        });
        
        // 計算で求められる値を埋める（抽出できなかった場合）
        if (!secondaryStats.HP && primaryStats.CON && primaryStats.SIZ) {
            secondaryStats.HP = Math.ceil((primaryStats.CON + primaryStats.SIZ) / 2);
        }
        if (!secondaryStats.MP && primaryStats.POW) {
            secondaryStats.MP = primaryStats.POW;
        }
        if (!secondaryStats.SAN && primaryStats.POW) {
            secondaryStats.SAN = primaryStats.POW * 5;
        }
        if (!secondaryStats.JobPoints && primaryStats.EDU) {
            secondaryStats.JobPoints = primaryStats.EDU * 20;
        }
        if (!secondaryStats.InterestPoints && primaryStats.INT) {
            secondaryStats.InterestPoints = primaryStats.INT * 10;
        }
        
        if (version === '6') {
            if (!secondaryStats.LUC && primaryStats.POW) {
                secondaryStats.LUC = primaryStats.POW * 5;
            }
            if (!secondaryStats.KNW && primaryStats.EDU) {
                secondaryStats.KNW = primaryStats.EDU * 5;
            }
            if (!secondaryStats.IDA && primaryStats.INT) {
                secondaryStats.IDA = primaryStats.INT * 5;
            }
        } else {
            if (!secondaryStats.KNW && primaryStats.EDU) {
                secondaryStats.KNW = primaryStats.EDU * 5;
            }
            if (!secondaryStats.IDA && primaryStats.INT) {
                secondaryStats.IDA = primaryStats.INT * 5;
            }
            if (!secondaryStats.MOV && primaryStats.DEX && primaryStats.STR && primaryStats.SIZ) {
                // MOVの計算ロジック（Ver7）
                if (primaryStats.DEX < primaryStats.SIZ && primaryStats.STR < primaryStats.SIZ) {
                    secondaryStats.MOV = 7;
                } else if (primaryStats.DEX > primaryStats.SIZ && primaryStats.STR > primaryStats.SIZ) {
                    secondaryStats.MOV = 9;
                } else {
                    secondaryStats.MOV = 8;
                }
            }
        }
    }
}