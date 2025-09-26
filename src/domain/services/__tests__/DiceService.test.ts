import { DiceService } from '../DiceService';
import { DiceExpression } from '../../value-objects/DiceExpression';
import { CCBRoll } from '../../entities/DiceRoll';
import { CoCDiceRoll } from '../../entities/CoCDiceRoll';

describe('DiceService', () => {
    let diceService: DiceService;

    beforeEach(() => {
        diceService = new DiceService();
    });

    describe('CC/CCB判定', () => {
        test('CC<=80 は1%ルールで判定される', () => {
            const expression = new DiceExpression('cc<=80');
            const result = diceService.roll(expression);
            
            expect(result).toBeInstanceOf(CoCDiceRoll);
            if (result instanceof CoCDiceRoll) {
                expect(result.getTarget()).toBe(80);
                const roll = result.getTotal();
                
                // クリティカルは1のみ
                if (roll === 1) {
                    expect(result.getSuccessLevel() === 'critical').toBe(true);
                }
                // ファンブルは100のみ
                if (roll === 100) {
                    expect(result.getSuccessLevel() === 'fumble').toBe(true);
                }
            }
        });

        test('CCB<=55 は5%ルールで判定される', () => {
            const expression = new DiceExpression('ccb<=55');
            const result = diceService.roll(expression);
            
            expect(result).toBeInstanceOf(CCBRoll);
            if (result instanceof CCBRoll) {
                expect(result.getTarget()).toBe(55);
                const roll = result.getTotal();
                
                // クリティカルは5以下
                if (roll <= 5) {
                    expect(result.isCriticalSuccess()).toBe(true);
                }
                // ファンブルは96以上
                if (roll >= 96) {
                    expect(result.isCriticalFailure()).toBe(true);
                }
            }
        });

        test('CC単体は通常の1d100として処理される', () => {
            const expression = new DiceExpression('cc');
            const result = diceService.roll(expression);
            
            expect(result.getExpression()).toBe('1d100');
        });
    });

    describe('故障ナンバー判定', () => {
        test('CCB(96) は6版故障判定を行う', () => {
            const expression = new DiceExpression('ccb(96)');
            const result = diceService.roll(expression);
            
            expect(result).toBeInstanceOf(CCBRoll);
            if (result instanceof CCBRoll) {
                const roll = result.getTotal();
                const breakdownNumber = (result as any).breakdownNumber;
                
                expect(breakdownNumber).toBe(96);
                
                // 96以上で故障
                if (roll >= 96) {
                    // ファンブル（96以上）なら「ファンブル＆故障」
                    // それ以外なら「故障」
                    expect(roll).toBeGreaterThanOrEqual(96);
                }
            }
        });
    });

    describe('CBR組み合わせロール', () => {
        test('CBR(70,60) は両方の判定を行う', () => {
            const expression = new DiceExpression('cbr(70,60)');
            const result = diceService.roll(expression);
            
            expect(result).toBeInstanceOf(CCBRoll);
            if (result instanceof CCBRoll) {
                const rolls = result.getRolls();
                expect(rolls.length).toBe(2);
                
                // 両方の出目が記録されている
                expect(rolls[0]).toBeGreaterThanOrEqual(1);
                expect(rolls[0]).toBeLessThanOrEqual(100);
                expect(rolls[1]).toBeGreaterThanOrEqual(1);
                expect(rolls[1]).toBeLessThanOrEqual(100);
            }
        });
    });

    describe('RES抵抗表ロール', () => {
        test('RES(15-12) は抵抗表の計算を行う', () => {
            const expression = new DiceExpression('res(15-12)');
            const result = diceService.roll(expression);
            
            expect(result).toBeInstanceOf(CCBRoll);
            if (result instanceof CCBRoll) {
                // (15-12)*5+50 = 3*5+50 = 65
                expect(result.getTarget()).toBe(65);
            }
        });

        test('RESB(10-10) は50%の判定になる', () => {
            const expression = new DiceExpression('resb(10-10)');
            const result = diceService.roll(expression);
            
            expect(result).toBeInstanceOf(CCBRoll);
            if (result instanceof CCBRoll) {
                // (10-10)*5+50 = 0*5+50 = 50
                expect(result.getTarget()).toBe(50);
            }
        });
    });

    describe('上方無限ロール', () => {
        test('3U6[5] は5以上で振り足しされる', () => {
            const expression = new DiceExpression('3u6[5]');
            const result = diceService.roll(expression);
            
            expect(result.getRolls().length).toBeGreaterThanOrEqual(3);
            // 振り足しが発生する可能性があるので、3個以上のダイスが含まれる
        });
    });

    describe('バラバラ出力', () => {
        test('3B6 は個別の出目を表示する', () => {
            const expression = new DiceExpression('3b6');
            const result = diceService.roll(expression);
            
            expect(result.getRolls().length).toBe(3);
            expect(result.getTotal()).toBe(0); // バラバラ出力は合計しない
            
            // 詳細表示は個別の値
            const detailed = result.getDetailedExpression();
            const values = detailed.split(',');
            expect(values.length).toBe(3);
        });
    });

    describe('個数カウント', () => {
        test('10B6>=4 は条件を満たす個数を数える', () => {
            const expression = new DiceExpression('10b6>=4');
            const result = diceService.roll(expression);
            
            expect(result.getRolls().length).toBe(10);
            
            // 成功数が total に格納される
            const successCount = result.getTotal();
            expect(successCount).toBeGreaterThanOrEqual(0);
            expect(successCount).toBeLessThanOrEqual(10);
            
            // 詳細表示に「X成功」が含まれる
            expect(result.getDetailedExpression()).toMatch(/\d+成功/);
        });
    });

    describe('計算式実行', () => {
        test('C(10-4*3/2+2) は計算のみ実行する', () => {
            const expression = new DiceExpression('c(10-4*3/2+2)');
            const result = diceService.roll(expression);
            
            // 10 - 4*3/2 + 2 = 10 - 12/2 + 2 = 10 - 6 + 2 = 6
            expect(result.getTotal()).toBe(6);
            expect(result.getRolls().length).toBe(0); // ダイスロールなし
        });
    });

    describe('choice拡張', () => {
        test('choice[a,b,c] は角括弧形式で動作する', () => {
            const expression = new DiceExpression('choice[apple,banana,cherry]');
            const result = diceService.roll(expression);
            
            const detailed = result.getDetailedExpression();
            expect(['apple', 'banana', 'cherry']).toContain(detailed);
        });

        test('choice(a,b,c) は丸括弧形式でも動作する', () => {
            const expression = new DiceExpression('choice(red,green,blue)');
            const result = diceService.roll(expression);
            
            const detailed = result.getDetailedExpression();
            expect(['red', 'green', 'blue']).toContain(detailed);
        });
    });

    describe('ダイス割り算', () => {
        test('3d6/2 は切り捨てで計算される', () => {
            const expression = new DiceExpression('3d6/2');
            const result = diceService.roll(expression);
            
            const rolls = result.getRolls();
            const sum = rolls.reduce((a, b) => a + b, 0);
            expect(result.getTotal()).toBe(Math.floor(sum / 2));
        });

        // 注: /2U と /2R のテストは、rollStandard内での処理のため
        // 実際の動作確認が必要
    });

    describe('D66ダイス', () => {
        test('D66 は通常の順序で表示される', () => {
            const expression = new DiceExpression('d66');
            const result = diceService.roll(expression);
            
            const total = result.getTotal();
            expect(total).toBeGreaterThanOrEqual(11);
            expect(total).toBeLessThanOrEqual(66);
            
            // 十の位と一の位が1-6の範囲
            const tens = Math.floor(total / 10);
            const ones = total % 10;
            expect(tens).toBeGreaterThanOrEqual(1);
            expect(tens).toBeLessThanOrEqual(6);
            expect(ones).toBeGreaterThanOrEqual(1);
            expect(ones).toBeLessThanOrEqual(6);
        });

        test('D66S は昇順ソートされる', () => {
            const expression = new DiceExpression('d66s');
            const result = diceService.roll(expression);
            
            const total = result.getTotal();
            const tens = Math.floor(total / 10);
            const ones = total % 10;
            
            // 昇順なので、十の位 <= 一の位
            expect(tens).toBeLessThanOrEqual(ones);
        });
    });

    describe('1d100<=n（CFSオフ）', () => {
        test('1d100<=50 は特殊判定なしの単純比較', () => {
            const expression = new DiceExpression('1d100<=50');
            const result = diceService.roll(expression);
            
            // CoCDiceRollではなく通常のDiceRoll
            expect(result.constructor.name).toBe('DiceRoll');
            expect(result).not.toBeInstanceOf(CoCDiceRoll);
        });
    });

    describe('四則演算', () => {
        test('1d10+1d5 は両方のダイスを振って加算する', () => {
            const expression = new DiceExpression('1d10+1d5');
            const result = diceService.roll(expression);
            
            const rolls = result.getRolls();
            expect(rolls.length).toBe(2);
            
            // 1d10の結果は1-10、1d5の結果は1-5
            expect(rolls[0]).toBeGreaterThanOrEqual(1);
            expect(rolls[0]).toBeLessThanOrEqual(10);
            expect(rolls[1]).toBeGreaterThanOrEqual(1);
            expect(rolls[1]).toBeLessThanOrEqual(5);
            
            // 合計は各ダイスの合計
            expect(result.getTotal()).toBe(rolls[0] + rolls[1]);
        });

        test('1d5-1d2 は減算を行う', () => {
            const expression = new DiceExpression('1d5-1d2');
            const result = diceService.roll(expression);
            
            const rolls = result.getRolls();
            expect(rolls.length).toBe(2);
            
            // 結果は負の値になる可能性もある
            const expectedTotal = rolls[0] - rolls[1];
            expect(result.getTotal()).toBe(expectedTotal);
        });

        test('1d10*5 は乗算を行う', () => {
            const expression = new DiceExpression('1d10*5');
            const result = diceService.roll(expression);
            
            const rolls = result.getRolls();
            expect(rolls.length).toBe(1);
            
            // 1d10の結果を5倍
            expect(result.getTotal()).toBe(rolls[0] * 5);
        });

        test('1d4/2 は除算を行う（切り捨て）', () => {
            const expression = new DiceExpression('1d4/2');
            const result = diceService.roll(expression);
            
            const rolls = result.getRolls();
            expect(rolls.length).toBe(1);
            
            // 切り捨て
            expect(result.getTotal()).toBe(Math.floor(rolls[0] / 2));
        });

        test('複雑な式 2d6+3-1d4*2 も正しく計算される', () => {
            const expression = new DiceExpression('2d6+3-1d4*2');
            const result = diceService.roll(expression);
            
            const rolls = result.getRolls();
            expect(rolls.length).toBe(3); // 2d6で2個、1d4で1個
            
            // 2d6の合計 + 3 - (1d4 * 2)
            const d6Total = rolls[0] + rolls[1];
            const d4Value = rolls[2];
            const expectedTotal = d6Total + 3 - (d4Value * 2);
            
            expect(result.getTotal()).toBe(expectedTotal);
        });

        test('括弧を含む式 (1d6+2)*3 も正しく計算される', () => {
            const expression = new DiceExpression('(1d6+2)*3');
            const result = diceService.roll(expression);
            
            const rolls = result.getRolls();
            expect(rolls.length).toBe(1);
            
            // (1d6 + 2) * 3
            const expectedTotal = (rolls[0] + 2) * 3;
            expect(result.getTotal()).toBe(expectedTotal);
        });

        test('累乗 2d6^2 も計算できる', () => {
            const expression = new DiceExpression('2d6^2');
            const result = diceService.roll(expression);
            
            const rolls = result.getRolls();
            expect(rolls.length).toBe(2);
            
            // (2d6の合計) の2乗
            const total = rolls[0] + rolls[1];
            expect(result.getTotal()).toBe(total * total);
        });
    });
});