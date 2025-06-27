import { DiceService } from '../DiceService';
import { DiceExpression } from '../../value-objects/DiceExpression';
import { CCBRoll, DiceRoll } from '../../entities/DiceRoll';
import { CoCDiceRoll, FARRoll } from '../../entities/CoCDiceRoll';

describe('CoC Dice Service', () => {
    let diceService: DiceService;

    beforeEach(() => {
        diceService = new DiceService();
    });

    describe('基本ロール', () => {
        test('CC は単純な1d100', () => {
            const expression = new DiceExpression('cc');
            const result = diceService.roll(expression);
            
            expect(result).toBeInstanceOf(DiceRoll);
            expect(result).not.toBeInstanceOf(CCBRoll);
            expect(result).not.toBeInstanceOf(CoCDiceRoll);
            
            const roll = result.getTotal();
            expect(roll).toBeGreaterThanOrEqual(1);
            expect(roll).toBeLessThanOrEqual(100);
        });

        test('CCB は単純な1d100', () => {
            const expression = new DiceExpression('ccb');
            const result = diceService.roll(expression);
            
            expect(result).toBeInstanceOf(DiceRoll);
            expect(result).not.toBeInstanceOf(CCBRoll);
            
            const roll = result.getTotal();
            expect(roll).toBeGreaterThanOrEqual(1);
            expect(roll).toBeLessThanOrEqual(100);
        });
    });

    describe('6版判定', () => {
        test('CCB<=50 は6版判定（5%ルール）', () => {
            const expression = new DiceExpression('ccb<=50');
            const result = diceService.roll(expression);
            
            expect(result).toBeInstanceOf(CCBRoll);
            if (result instanceof CCBRoll) {
                expect(result.getTarget()).toBe(50);
                
                const roll = result.getTotal();
                // クリティカルは5以下
                if (roll <= 5 && roll <= 50) {
                    expect(result.isCriticalSuccess()).toBe(true);
                }
                // ファンブルは96以上
                if (roll >= 96) {
                    expect(result.isCriticalFailure()).toBe(true);
                }
            }
        });

        test('CCB(96)<=70 は故障判定付き', () => {
            const expression = new DiceExpression('ccb(96)<=70');
            const result = diceService.roll(expression);
            
            expect(result).toBeInstanceOf(CCBRoll);
            if (result instanceof CCBRoll) {
                expect(result.getTarget()).toBe(70);
                const breakdownNumber = (result as any).breakdownNumber;
                expect(breakdownNumber).toBe(96);
            }
        });
    });

    describe('7版判定', () => {
        test('CC<=50 は7版判定（成功レベル）', () => {
            const expression = new DiceExpression('cc<=50');
            const result = diceService.roll(expression);
            
            expect(result).toBeInstanceOf(CoCDiceRoll);
            if (result instanceof CoCDiceRoll) {
                expect(result.getTarget()).toBe(50);
                
                const roll = result.getTotal();
                const level = result.getSuccessLevel();
                
                if (roll === 1) {
                    expect(level).toBe('critical');
                } else if (roll <= 10) { // 50/5 = 10
                    expect(level).toBe('extreme');
                } else if (roll <= 25) { // 50/2 = 25
                    expect(level).toBe('hard');
                } else if (roll <= 50) {
                    expect(level).toBe('regular');
                } else {
                    expect(level).toBe('failure');
                }
            }
        });

        test('CC(2)<=60 はボーナスダイス判定', () => {
            const expression = new DiceExpression('cc(2)<=60');
            const result = diceService.roll(expression);
            
            expect(result).toBeInstanceOf(CoCDiceRoll);
            if (result instanceof CoCDiceRoll) {
                expect(result.getTarget()).toBe(60);
                expect(result.getBonusDice()).toBe(2);
            }
        });

        test('CC(-1)<=40 はペナルティダイス判定', () => {
            const expression = new DiceExpression('cc(-1)<=40');
            const result = diceService.roll(expression);
            
            expect(result).toBeInstanceOf(CoCDiceRoll);
            if (result instanceof CoCDiceRoll) {
                expect(result.getTarget()).toBe(40);
                expect(result.getBonusDice()).toBe(-1);
            }
        });

        test('CC<=70r は難易度レギュラー', () => {
            const expression = new DiceExpression('cc<=70r');
            const result = diceService.roll(expression);
            
            expect(result).toBeInstanceOf(CoCDiceRoll);
            if (result instanceof CoCDiceRoll) {
                expect(result.getTarget()).toBe(70);
                expect(result.getDifficulty()).toBe('r');
            }
        });

        test('CC<=80h は難易度ハード', () => {
            const expression = new DiceExpression('cc<=80h');
            const result = diceService.roll(expression);
            
            expect(result).toBeInstanceOf(CoCDiceRoll);
            if (result instanceof CoCDiceRoll) {
                expect(result.getTarget()).toBe(80);
                expect(result.getDifficulty()).toBe('h');
            }
        });
    });

    describe('FAR自動火器', () => {
        test('FAR(25,70,98) は基本的な自動火器判定', () => {
            const expression = new DiceExpression('far(25,70,98)');
            const result = diceService.roll(expression);
            
            expect(result).toBeInstanceOf(FARRoll);
            if (result instanceof FARRoll) {
                expect(result.getHits()).toBeGreaterThanOrEqual(0);
                expect(result.getHits()).toBeLessThanOrEqual(25);
                expect(result.getRemainingBullets()).toBeGreaterThanOrEqual(0);
                expect(result.getRemainingBullets()).toBeLessThanOrEqual(25);
            }
        });

        test('FAR(30,70,99,1,r) はボーナスダイスと難易度指定', () => {
            const expression = new DiceExpression('far(30,70,99,1,r)');
            const result = diceService.roll(expression);
            
            expect(result).toBeInstanceOf(FARRoll);
        });

        test('FAR(40,77,100,,,3) はボレーサイズ指定', () => {
            const expression = new DiceExpression('far(40,77,100,,,3)');
            const result = diceService.roll(expression);
            
            expect(result).toBeInstanceOf(FARRoll);
        });
    });
});