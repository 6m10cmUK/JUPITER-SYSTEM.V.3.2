export class DiceExpression {
    private readonly expression: string;
    private readonly normalizedExpression: string;

    constructor(expression: string) {
        if (!expression || expression.trim().length === 0) {
            throw new Error('Dice expression cannot be empty');
        }
        
        this.expression = expression;
        this.normalizedExpression = this.normalize(expression);
    }

    private normalize(expr: string): string {
        return expr.toLowerCase().trim();
    }

    getValue(): string {
        return this.expression;
    }

    getNormalizedValue(): string {
        return this.normalizedExpression;
    }

    isCCB(): boolean {
        // ccbのみ、ccb<=数字、ccb(x)、ccb(x)<=数字の形式をチェック
        return /^ccb$|^ccb<=\d+$|^ccb\(\d+\)(?:<=\d+)?$/i.test(this.normalizedExpression) || 
               this.normalizedExpression.startsWith('1d100<=');
    }

    isCC(): boolean {
        // ccのみの形式をチェック（単純な1d100として処理）
        return /^cc$/i.test(this.normalizedExpression);
    }

    isCCv7(): boolean {
        // cc<=数字の形式をチェック（7版処理）
        return /^cc<=\d+$/i.test(this.normalizedExpression);
    }

    isChoice(): boolean {
        return this.normalizedExpression.startsWith('choice(') || 
               this.normalizedExpression.startsWith('choice[');
    }

    isRes(): boolean {
        return /^resb?\(/i.test(this.normalizedExpression);
    }

    isCBR(): boolean {
        return /^cbrb?\(/i.test(this.normalizedExpression);
    }

    isStandardDice(): boolean {
        const diceRegex = /^\d+d\d+([+\-*/]\d+)*$/;
        return diceRegex.test(this.normalizedExpression);
    }

    isUpperUnlimited(): boolean {
        return /^\d+u\d+\[\d+\]/i.test(this.normalizedExpression);
    }

    isBaraDice(): boolean {
        return /^\d+b\d+/i.test(this.normalizedExpression);
    }

    isCountDice(): boolean {
        return /^\d+b\d+(?:>=|<=|>|<|=)\d+/i.test(this.normalizedExpression);
    }

    isCalculation(): boolean {
        return /^c\(/i.test(this.normalizedExpression);
    }

    isD66(): boolean {
        return /^d66[ns]?$/i.test(this.normalizedExpression);
    }

    isCoCRoll(): boolean {
        // CC(±x)<=y, CC<=y(r/h/e/c)などのCoC 7版形式
        return /^cc\([+-]?\d+\)<=\d+(?:[rhec])?$/i.test(this.normalizedExpression) ||
               /^cc(?:[+-]?\d+)?<=\d+[rhec]$/i.test(this.normalizedExpression);
    }

    isFAR(): boolean {
        return /^far\(/i.test(this.normalizedExpression);
    }

    hasRepeat(): boolean {
        return /x\d+/i.test(this.normalizedExpression);
    }

    getRepeatCount(): number {
        const match = this.normalizedExpression.match(/x(\d+)/i);
        return match ? parseInt(match[1]) : 1;
    }

    getTargetExpression(): string {
        const match = this.normalizedExpression.match(/x\d+/i);
        if (match) {
            return this.normalizedExpression.replace(/x\d+/i, '').trim();
        }
        return this.normalizedExpression;
    }
}