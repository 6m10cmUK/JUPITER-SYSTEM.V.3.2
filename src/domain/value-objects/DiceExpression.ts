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
        return this.normalizedExpression.startsWith('ccb') || 
               this.normalizedExpression.startsWith('1d100<=');
    }

    isChoice(): boolean {
        return this.normalizedExpression.startsWith('choice(');
    }

    isRes(): boolean {
        return this.normalizedExpression.startsWith('res(');
    }

    isStandardDice(): boolean {
        const diceRegex = /^\d+d\d+([+\-*/]\d+)*$/;
        return diceRegex.test(this.normalizedExpression);
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