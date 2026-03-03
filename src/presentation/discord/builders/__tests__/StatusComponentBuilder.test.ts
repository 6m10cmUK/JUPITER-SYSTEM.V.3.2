import { describe, it, expect, jest } from '@jest/globals';
import { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { StatusComponentBuilder } from '../StatusComponentBuilder';
import { StatusViewModel } from '../../../viewmodels/StatusViewModel';

describe('StatusComponentBuilder', () => {
    const mockMessageId = 'test-message-123';
    const mockUserId = 'test-user-456';

    const createMockStatusData = (version: '6' | '7', showCustomMenu = false): StatusViewModel => ({
        version,
        characterName: 'テストキャラクター',
        primaryStats: {
            STR: 10,
            CON: 12,
            POW: 14,
            DEX: 16,
            APP: 18,
            SIZ: 8,
            INT: 20,
            EDU: 22,
            ...(version === '7' ? { LUC: 15 } : {})
        },
        primaryStatsDetails: {
            STR: '3D6 => 3 + 4 + 3 = 10',
            CON: '3D6 => 4 + 4 + 4 = 12',
            POW: '3D6 => 5 + 5 + 4 = 14',
            DEX: '3D6 => 6 + 5 + 5 = 16',
            APP: '3D6 => 6 + 6 + 6 = 18',
            SIZ: '2D6+6 => 1 + 1 + 6 = 8',
            INT: '2D6+6 => 6 + 6 + 8 = 20',
            EDU: '3D6+3 => 6 + 6 + 6 + 4 = 22',
            ...(version === '7' ? { LUC: '3D6 => 5 + 5 + 5 = 15' } : {})
        },
        secondaryStats: {
            HP: version === '6' ? 10 : 10,
            MP: version === '6' ? 14 : 14,
            SAN: version === '6' ? 70 : 75,
            DB: '-1D4',
            JobPoints: 200,
            InterestPoints: 100,
            ...(version === '6' ? {
                IDA: 100,
                LUC: 70,
                KNW: 110
            } : {
                IDA: 100,
                KNW: 110,
                MOV: 8
            })
        },
        rerollCount: 0,
        history: '',
        messageId: mockMessageId,
        userId: mockUserId,
        showCustomMenu
    });

    describe('createComponents', () => {
        it('Ver6のコンポーネントを正しく生成する', () => {
            const statusData = createMockStatusData('6');
            const components = StatusComponentBuilder.createComponents(statusData, mockMessageId, mockUserId);

            expect(components).toHaveLength(3);
            
            // 振り直しセレクトメニューの検証
            const rerollRow = components[0];
            expect(rerollRow).toBeInstanceOf(ActionRowBuilder);
            const rerollMenu = rerollRow.components[0] as StringSelectMenuBuilder;
            expect(rerollMenu.toJSON().custom_id).toBe(`reroll:${mockMessageId}:${mockUserId}`);
            expect(rerollMenu.toJSON().placeholder).toBe('振り直すステータス');
            expect(rerollMenu.toJSON().options).toHaveLength(8);
            
            // 最初のオプションを詳細に検証
            const firstOption = rerollMenu.toJSON().options![0];
            expect(firstOption.label).toBe('1️⃣ STR');
            expect(firstOption.value).toBe('str');
            expect(firstOption.description).toBe('10 3D6 => 3 + 4 + 3 = 10');

            // 変更セレクトメニューの検証
            const changeRow = components[1];
            expect(changeRow).toBeInstanceOf(ActionRowBuilder);
            const changeMenu = changeRow.components[0] as StringSelectMenuBuilder;
            expect(changeMenu.toJSON().custom_id).toBe(`change:${mockMessageId}:${mockUserId}`);
            expect(changeMenu.toJSON().placeholder).toBe('入れ替えるステータス');
            expect(changeMenu.toJSON().options).toHaveLength(8);

            // ボタン行の検証
            const buttonRow = components[2];
            expect(buttonRow).toBeInstanceOf(ActionRowBuilder);
            expect(buttonRow.components).toHaveLength(2);
            
            const nameButton = buttonRow.components[0] as ButtonBuilder;
            const nameButtonJSON = nameButton.toJSON() as any;
            expect(nameButtonJSON.custom_id).toBe(`changeName:${mockMessageId}:${mockUserId}`);
            expect(nameButtonJSON.label).toBe('名前変更');
            expect(nameButton.data.style).toBe(ButtonStyle.Primary);

            const iacharaButton = buttonRow.components[1] as ButtonBuilder;
            const iacharaButtonJSON = iacharaButton.toJSON() as any;
            expect(iacharaButtonJSON.label).toBe('iacharaに出力');
            expect(iacharaButton.data.style).toBe(ButtonStyle.Link);
            expect(iacharaButtonJSON.url).toContain('https://iachara.com/new/costom/webdice?var=6');
            expect(iacharaButtonJSON.url).toContain('STR=10&CON=12&POW=14&DEX=16&APP=18&SIZ=8&INT=20&EDU=22');
        });

        it('Ver7のコンポーネントを正しく生成する', () => {
            const statusData = createMockStatusData('7');
            const components = StatusComponentBuilder.createComponents(statusData, mockMessageId, mockUserId);

            expect(components).toHaveLength(3);
            
            // 振り直しセレクトメニューの検証（Ver7は9つのステータス）
            const rerollMenu = components[0].components[0] as StringSelectMenuBuilder;
            expect(rerollMenu.toJSON().options).toHaveLength(9);
            
            // LUCオプションの存在確認
            const lucOption = rerollMenu.toJSON().options!.find(opt => opt.value === 'luc');
            expect(lucOption).toBeDefined();
            expect(lucOption!.label).toBe('9️⃣ LUC');
            expect(lucOption!.description).toBe('15 3D6 => 5 + 5 + 5 = 15');

            // iacharaボタンのURL検証（Ver7）
            const iacharaButton = components[2].components[1] as ButtonBuilder;
            const iacharaButtonJSON = iacharaButton.toJSON() as any;
            expect(iacharaButtonJSON.url).toContain('https://iachara.com/new/costom/webdice?var=7');
            expect(iacharaButtonJSON.url).toContain('LUC=15');
        });

        it('カスタムセットメニューが表示される場合', () => {
            const statusData = createMockStatusData('6', true);
            const components = StatusComponentBuilder.createComponents(statusData, mockMessageId, mockUserId);

            expect(components).toHaveLength(4);
            
            // カスタムセットメニューの検証
            const customSetRow = components[3];
            expect(customSetRow).toBeInstanceOf(ActionRowBuilder);
            const customSetMenu = customSetRow.components[0] as StringSelectMenuBuilder;
            expect(customSetMenu.toJSON().custom_id).toBe(`customSet:${mockMessageId}:${mockUserId}`);
            expect(customSetMenu.toJSON().placeholder).toBe('カスタムセット');
            expect(customSetMenu.toJSON().options).toHaveLength(8);
        });

        it('カスタムセットメニューが非表示の場合', () => {
            const statusData = createMockStatusData('6', false);
            const components = StatusComponentBuilder.createComponents(statusData, mockMessageId, mockUserId);

            expect(components).toHaveLength(3);
            
            // カスタムセットメニューが存在しないことを確認
            const hasCustomSetMenu = components.some(row => 
                row.components.some(comp => 
                    comp instanceof StringSelectMenuBuilder && 
                    comp.toJSON().custom_id?.startsWith('customSet:')
                )
            );
            expect(hasCustomSetMenu).toBe(false);
        });

        it('マークダウンエスケープが正しく処理される', () => {
            const statusData = createMockStatusData('6');
            // エスケープされた文字を含むデータに更新
            statusData.primaryStatsDetails.STR = '3D6 => 1\\*2\\*3 = 6';

            const components = StatusComponentBuilder.createComponents(statusData, mockMessageId, mockUserId);
            
            const rerollMenu = components[0].components[0] as StringSelectMenuBuilder;
            const strOption = rerollMenu.toJSON().options!.find(opt => opt.value === 'str');
            
            // unescapeDiscordMarkdownによって元に戻されることを確認
            expect(strOption!.description).toBe('10 3D6 => 1*2*3 = 6');
        });

        it('ステータスの順番が正しい', () => {
            const statusData = createMockStatusData('6');
            const components = StatusComponentBuilder.createComponents(statusData, mockMessageId, mockUserId);
            
            const rerollMenu = components[0].components[0] as StringSelectMenuBuilder;
            const statLabels = rerollMenu.toJSON().options!.map(opt => opt.label);
            
            expect(statLabels).toEqual([
                '1️⃣ STR',
                '2️⃣ CON',
                '3️⃣ POW',
                '4️⃣ DEX',
                '5️⃣ APP',
                '6️⃣ SIZ',
                '7️⃣ INT',
                '8️⃣ EDU'
            ]);
        });

        it('セレクトメニューのvalueが小文字に変換される', () => {
            const statusData = createMockStatusData('6');
            const components = StatusComponentBuilder.createComponents(statusData, mockMessageId, mockUserId);
            
            const rerollMenu = components[0].components[0] as StringSelectMenuBuilder;
            const values = rerollMenu.toJSON().options!.map(opt => opt.value);
            
            expect(values).toEqual(['str', 'con', 'pow', 'dex', 'app', 'siz', 'int', 'edu']);
        });

        it('すべてのコンポーネントタイプが正しい', () => {
            const statusData = createMockStatusData('6', true);
            const components = StatusComponentBuilder.createComponents(statusData, mockMessageId, mockUserId);
            
            // 行1: 振り直しセレクトメニュー
            expect(components[0]).toBeInstanceOf(ActionRowBuilder);
            expect(components[0].components[0]).toBeInstanceOf(StringSelectMenuBuilder);
            
            // 行2: 変更セレクトメニュー
            expect(components[1]).toBeInstanceOf(ActionRowBuilder);
            expect(components[1].components[0]).toBeInstanceOf(StringSelectMenuBuilder);
            
            // 行3: ボタン
            expect(components[2]).toBeInstanceOf(ActionRowBuilder);
            expect(components[2].components[0]).toBeInstanceOf(ButtonBuilder);
            expect(components[2].components[1]).toBeInstanceOf(ButtonBuilder);
            
            // 行4: カスタムセットメニュー
            expect(components[3]).toBeInstanceOf(ActionRowBuilder);
            expect(components[3].components[0]).toBeInstanceOf(StringSelectMenuBuilder);
        });
    });
});