import { Embed } from 'discord.js';
import { StatusResultDto, SecondaryStats } from '../../application/dto/StatusDto';

export class StatusEmbedParser {
    parse(embed: Embed): StatusResultDto | null {
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
        
        // 各ステータスフィールドから値を抽出
        statOrder.forEach((stat, index) => {
            const field = embed.data!.fields![index];
            if (field) {
                // フィールド名から数値を抽出 (例: "1️⃣ STR: 15" -> 15)
                const match = field.name.match(/:\s*(\d+)$/);
                if (match) {
                    primaryStats[stat] = parseInt(match[1], 10);
                    primaryStatsDetails[stat] = field.value || '(詳細なし)';
                }
            }
        });
        
        // 二次ステータスの抽出
        const secondaryStats: Partial<SecondaryStats> = {};
        
        // 振り直し回数の抽出
        let rerollCount = 0;
        embed.data.fields.forEach(field => {
            const match = field.value.match(/\*\*振り直し回数\s*:\s*(\d+)\*\*/);
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
            const dbMatch = totalField.value.match(/DB:\s*([+-]?\d+[dD]\d+|±0|[+-]?\d+)/);
            if (dbMatch) {
                secondaryStats.DB = dbMatch[1];
            }
            
            // BUILDの抽出（Ver7のみ）
            if (version === '7') {
                const buildMatch = totalField.value.match(/BUILD:\s*([+-]?\d+)/);
                if (buildMatch) {
                    secondaryStats.BUILD = parseInt(buildMatch[1], 10);
                }
            }
        }
        
        // その他の二次ステータスをフィールドから抽出
        embed.data!.fields!.forEach(field => {
            // LUC, KNW, IDA等の抽出
            const lucMatch = field.name.match(/LUC:\s*(\d+)/);
            if (lucMatch) secondaryStats.LUC = parseInt(lucMatch[1], 10);
            
            const knwMatch = field.name.match(/KNW:\s*(\d+)/);
            if (knwMatch) secondaryStats.KNW = parseInt(knwMatch[1], 10);
            
            const idaMatch = field.name.match(/IDA:\s*(\d+)/);
            if (idaMatch) secondaryStats.IDA = parseInt(idaMatch[1], 10);
            
            const movMatch = field.name.match(/MOV:\s*(\d+)/);
            if (movMatch) secondaryStats.MOV = parseInt(movMatch[1], 10);
            
            // HP, MP, SANの抽出
            const hpMatch = field.name.match(/HP:\s*(\d+)/);
            if (hpMatch) secondaryStats.HP = parseInt(hpMatch[1], 10);
            
            const mpMatch = field.name.match(/MP:\s*(\d+)/);
            if (mpMatch) secondaryStats.MP = parseInt(mpMatch[1], 10);
            
            const sanMatch = field.name.match(/SAN:\s*(\d+)/);
            if (sanMatch) secondaryStats.SAN = parseInt(sanMatch[1], 10);
            
            // 職業ポイントと興味ポイントの抽出
            const jobMatch = field.name.match(/基礎職業P:\s*(\d+)/);
            if (jobMatch) secondaryStats.JobPoints = parseInt(jobMatch[1], 10);
            
            const interestMatch = field.name.match(/興味P:\s*(\d+)/);
            if (interestMatch) secondaryStats.InterestPoints = parseInt(interestMatch[1], 10);
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