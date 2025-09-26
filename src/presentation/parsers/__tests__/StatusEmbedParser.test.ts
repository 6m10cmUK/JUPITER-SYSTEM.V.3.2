import { StatusEmbedParser } from '../StatusEmbedParser';
import { Embed } from 'discord.js';

describe('StatusEmbedParser', () => {
    let parser: StatusEmbedParser;

    beforeEach(() => {
        parser = new StatusEmbedParser();
    });

    describe('ダメージボーナス抽出テスト', () => {
        test('6版: ダイス記法の正しい抽出', () => {
            const mockEmbed = {
                data: {
                    footer: { text: '6' },
                    description: 'NAME: テストキャラ',
                    title: 'CoC 6 CHAR STATUS',
                    fields: [
                        { name: '1️⃣ STR: 15', value: '(3,6,6)', inline: true },
                        { name: '2️⃣ CON: 12', value: '(4,4,4)', inline: true },
                        { name: '3️⃣ POW: 13', value: '(5,4,4)', inline: true },
                        { name: '4️⃣ DEX: 14', value: '(5,5,4)', inline: true },
                        { name: '5️⃣ APP: 11', value: '(3,4,4)', inline: true },
                        { name: '6️⃣ SIZ: 16', value: '(4,6,6)', inline: true },
                        { name: '7️⃣ INT: 15', value: '(3,6,6)', inline: true },
                        { name: '8️⃣ EDU: 12', value: '(2,4,6)', inline: true },
                        { name: '\u200B', value: '\u200B', inline: true },
                        { name: 'Total: 108', value: '**DB: +1d4**', inline: false },
                        { name: 'LUC: 65\nKNW: 60\nIDA: 75', value: '\u200B', inline: true },
                        { name: 'HP: 14\nMP: 13\nSAN: 65', value: '\u200B', inline: true },
                        { name: '基礎職業P: 240 興味P: 150', value: '**振り直し回数: 0**', inline: false },
                        { name: '変更履歴', value: '\u200B', inline: false }
                    ]
                }
            } as Embed;

            const result = parser.parse(mockEmbed);

            expect(result).not.toBeNull();
            expect(result!.version).toBe('6');
            expect(result!.secondaryStats.DB).toBe('+1d4');
        });

        test('6版: ゼロダメージボーナスの正しい抽出', () => {
            const mockEmbed = {
                data: {
                    footer: { text: '6' },
                    description: 'NAME: テストキャラ',
                    title: 'CoC 6 CHAR STATUS',
                    fields: [
                        { name: '1️⃣ STR: 10', value: '(3,3,4)', inline: true },
                        { name: '2️⃣ CON: 10', value: '(3,3,4)', inline: true },
                        { name: '3️⃣ POW: 10', value: '(3,3,4)', inline: true },
                        { name: '4️⃣ DEX: 10', value: '(3,3,4)', inline: true },
                        { name: '5️⃣ APP: 10', value: '(3,3,4)', inline: true },
                        { name: '6️⃣ SIZ: 10', value: '(3,3,4)', inline: true },
                        { name: '7️⃣ INT: 10', value: '(3,3,4)', inline: true },
                        { name: '8️⃣ EDU: 10', value: '(3,3,4)', inline: true },
                        { name: '\u200B', value: '\u200B', inline: true },
                        { name: 'Total: 80', value: '**DB: 0**', inline: false }
                    ]
                }
            } as Embed;

            const result = parser.parse(mockEmbed);

            expect(result).not.toBeNull();
            expect(result!.secondaryStats.DB).toBe('0');
        });

        test('6版: マイナスダメージボーナスの正しい抽出', () => {
            const mockEmbed = {
                data: {
                    footer: { text: '6' },
                    description: 'NAME: テストキャラ',
                    title: 'CoC 6 CHAR STATUS',
                    fields: [
                        { name: '1️⃣ STR: 8', value: '(2,3,3)', inline: true },
                        { name: '2️⃣ CON: 8', value: '(2,3,3)', inline: true },
                        { name: '3️⃣ POW: 8', value: '(2,3,3)', inline: true },
                        { name: '4️⃣ DEX: 8', value: '(2,3,3)', inline: true },
                        { name: '5️⃣ APP: 8', value: '(2,3,3)', inline: true },
                        { name: '6️⃣ SIZ: 6', value: '(1,2,3)', inline: true },
                        { name: '7️⃣ INT: 8', value: '(2,3,3)', inline: true },
                        { name: '8️⃣ EDU: 8', value: '(2,3,3)', inline: true },
                        { name: '\u200B', value: '\u200B', inline: true },
                        { name: 'Total: 62', value: '**DB: -1d4**', inline: false }
                    ]
                }
            } as Embed;

            const result = parser.parse(mockEmbed);

            expect(result).not.toBeNull();
            expect(result!.secondaryStats.DB).toBe('-1d4');
        });

        test('7版: 数値形式ダメージボーナスの正しい抽出', () => {
            const mockEmbed = {
                data: {
                    footer: { text: '7' },
                    description: 'NAME: テストキャラ',
                    title: 'CoC 7 CHAR STATUS',
                    fields: [
                        { name: '1️⃣ STR: 50', value: '(8,9,10) x5', inline: true },
                        { name: '2️⃣ CON: 45', value: '(7,8,9) x5', inline: true },
                        { name: '3️⃣ POW: 40', value: '(6,7,8) x5', inline: true },
                        { name: '4️⃣ DEX: 50', value: '(8,9,10) x5', inline: true },
                        { name: '5️⃣ APP: 45', value: '(7,8,9) x5', inline: true },
                        { name: '6️⃣ SIZ: 30', value: '(4,5,6) x5', inline: true },
                        { name: '7️⃣ INT: 55', value: '(9,10,11) x5', inline: true },
                        { name: '8️⃣ EDU: 60', value: '(10,11,12) x5', inline: true },
                        { name: '9️⃣ LUC: 35', value: '(5,6,7) x5', inline: true },
                        { name: 'Total: 410', value: '**DB: -1 BUILD: -1**', inline: false }
                    ]
                }
            } as Embed;

            const result = parser.parse(mockEmbed);

            expect(result).not.toBeNull();
            expect(result!.version).toBe('7');
            expect(result!.secondaryStats.DB).toBe('-1');
            expect(result!.secondaryStats.BUILD).toBe(-1);
        });

        test('7版: ダイス記法ダメージボーナスの正しい抽出', () => {
            const mockEmbed = {
                data: {
                    footer: { text: '7' },
                    description: 'NAME: テストキャラ',
                    title: 'CoC 7 CHAR STATUS',
                    fields: [
                        { name: '1️⃣ STR: 85', value: '(15,16,17) x5', inline: true },
                        { name: '2️⃣ CON: 70', value: '(12,13,14) x5', inline: true },
                        { name: '3️⃣ POW: 60', value: '(10,11,12) x5', inline: true },
                        { name: '4️⃣ DEX: 75', value: '(13,14,15) x5', inline: true },
                        { name: '5️⃣ APP: 65', value: '(11,12,13) x5', inline: true },
                        { name: '6️⃣ SIZ: 80', value: '(14,15,16) x5', inline: true },
                        { name: '7️⃣ INT: 70', value: '(12,13,14) x5', inline: true },
                        { name: '8️⃣ EDU: 75', value: '(13,14,15) x5', inline: true },
                        { name: '9️⃣ LUC: 55', value: '(9,10,11) x5', inline: true },
                        { name: 'Total: 635', value: '**DB: +1d4 BUILD: 1**', inline: false }
                    ]
                }
            } as Embed;

            const result = parser.parse(mockEmbed);

            expect(result).not.toBeNull();
            expect(result!.version).toBe('7');
            expect(result!.secondaryStats.DB).toBe('+1d4');
            expect(result!.secondaryStats.BUILD).toBe(1);
        });

        test('バグ修正: 6版でダイス記法が数値として誤抽出されないことを確認', () => {
            // このテストは修正前に失敗していたケース
            const mockEmbed = {
                data: {
                    footer: { text: '6' },
                    description: 'NAME: バグテストキャラ',
                    title: 'CoC 6 CHAR STATUS',
                    fields: [
                        { name: '1️⃣ STR: 16', value: '(5,5,6)', inline: true },
                        { name: '2️⃣ CON: 15', value: '(4,5,6)', inline: true },
                        { name: '3️⃣ POW: 14', value: '(4,4,6)', inline: true },
                        { name: '4️⃣ DEX: 13', value: '(3,4,6)', inline: true },
                        { name: '5️⃣ APP: 12', value: '(3,3,6)', inline: true },
                        { name: '6️⃣ SIZ: 17', value: '(5,6,6)', inline: true },
                        { name: '7️⃣ INT: 16', value: '(4,6,6)', inline: true },
                        { name: '8️⃣ EDU: 15', value: '(3,6,6)', inline: true },
                        { name: '\u200B', value: '\u200B', inline: true },
                        { name: 'Total: 118', value: '**DB: +1d4**', inline: false }
                    ]
                }
            } as Embed;

            const result = parser.parse(mockEmbed);

            expect(result).not.toBeNull();
            expect(result!.secondaryStats.DB).toBe('+1d4');
            // 修正前は '+1' として誤抽出されていた
            expect(result!.secondaryStats.DB).not.toBe('+1');
        });
    });

    describe('プライマリステータス抽出テスト', () => {
        test('6版: 基本ステータスの正しい抽出', () => {
            const mockEmbed = {
                data: {
                    footer: { text: '6' },
                    description: 'NAME: テストキャラ',
                    title: 'CoC 6 CHAR STATUS',
                    fields: [
                        { name: '1️⃣ STR: 15', value: '(3,6,6)', inline: true },
                        { name: '2️⃣ CON: 12', value: '(4,4,4)', inline: true },
                        { name: '3️⃣ POW: 13', value: '(5,4,4)', inline: true },
                        { name: '4️⃣ DEX: 14', value: '(5,5,4)', inline: true },
                        { name: '5️⃣ APP: 11', value: '(3,4,4)', inline: true },
                        { name: '6️⃣ SIZ: 16', value: '(4,6,6)', inline: true },
                        { name: '7️⃣ INT: 15', value: '(3,6,6)', inline: true },
                        { name: '8️⃣ EDU: 12', value: '(2,4,6)', inline: true }
                    ]
                }
            } as Embed;

            const result = parser.parse(mockEmbed);

            expect(result).not.toBeNull();
            expect(result!.primaryStats.STR).toBe(15);
            expect(result!.primaryStats.CON).toBe(12);
            expect(result!.primaryStats.POW).toBe(13);
            expect(result!.primaryStats.DEX).toBe(14);
            expect(result!.primaryStats.APP).toBe(11);
            expect(result!.primaryStats.SIZ).toBe(16);
            expect(result!.primaryStats.INT).toBe(15);
            expect(result!.primaryStats.EDU).toBe(12);
        });

        test('7版: LUCを含む基本ステータスの正しい抽出', () => {
            const mockEmbed = {
                data: {
                    footer: { text: '7' },
                    description: 'NAME: テストキャラ7版',
                    title: 'CoC 7 CHAR STATUS',
                    fields: [
                        { name: '1️⃣ STR: 75', value: '(13,14,15) x5', inline: true },
                        { name: '2️⃣ CON: 65', value: '(11,12,13) x5', inline: true },
                        { name: '3️⃣ POW: 60', value: '(10,11,12) x5', inline: true },
                        { name: '4️⃣ DEX: 70', value: '(12,13,14) x5', inline: true },
                        { name: '5️⃣ APP: 55', value: '(9,10,11) x5', inline: true },
                        { name: '6️⃣ SIZ: 65', value: '(11,12,13) x5', inline: true },
                        { name: '7️⃣ INT: 80', value: '(14,15,16) x5', inline: true },
                        { name: '8️⃣ EDU: 75', value: '(13,14,15) x5', inline: true },
                        { name: '9️⃣ LUC: 50', value: '(8,9,10) x5', inline: true }
                    ]
                }
            } as Embed;

            const result = parser.parse(mockEmbed);

            expect(result).not.toBeNull();
            expect(result!.version).toBe('7');
            expect(result!.primaryStats.LUC).toBe(50);
        });
    });

    describe('エラーハンドリング', () => {
        test('不正なEmbed形式でnullを返す', () => {
            const mockEmbed = {
                data: {}
            } as unknown as Embed;

            const result = parser.parse(mockEmbed);

            expect(result).toBeNull();
        });

        test('fieldsが空でnullを返す', () => {
            const mockEmbed = {
                data: {
                    fields: []
                }
            } as unknown as Embed;

            const result = parser.parse(mockEmbed);

            expect(result).toBeNull();
        });
    });
});