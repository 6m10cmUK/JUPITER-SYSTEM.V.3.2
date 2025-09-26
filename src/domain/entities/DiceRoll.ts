export class DiceRoll {
    constructor(
        private readonly expression: string,
        private readonly rolls: number[],
        private readonly total: number,
        private readonly detailedExpression: string
    ) {}

    getExpression(): string {
        return this.expression;
    }

    getRolls(): readonly number[] {
        return this.rolls;
    }

    getTotal(): number {
        return this.total;
    }

    getDetailedExpression(): string {
        return this.detailedExpression;
    }

    static create(expression: string, rolls: number[], total: number, detailedExpression?: string): DiceRoll {
        return new DiceRoll(
            expression,
            rolls,
            total,
            detailedExpression || expression
        );
    }
}

export class CCBRoll extends DiceRoll {
    constructor(
        expression: string,
        rolls: number[],
        total: number,
        private readonly target: number,
        private readonly success: boolean,
        private readonly special: boolean,
        private readonly critical: boolean,
        private readonly fumble: boolean,
        private readonly breakdownNumber?: number
    ) {
        super(expression, rolls, total, expression);
    }

    getTarget(): number {
        return this.target;
    }

    isSuccess(): boolean {
        return this.success;
    }

    isSpecial(): boolean {
        return this.special;
    }

    isCriticalSuccess(): boolean {
        return this.critical;
    }

    isCriticalFailure(): boolean {
        return this.fumble;
    }

    /**
     * 故障ナンバーを取得
     * @returns 故障ナンバー（設定されている場合）
     */
    getBreakdownNumber(): number | undefined {
        return this.breakdownNumber;
    }

    static evaluate(target: number, roll: number, ruleType: 'cc' | 'ccb' = 'ccb'): CCBRoll {
        const isSuccess = roll <= target;
        const isSpecial = roll <= Math.ceil(target / 5);
        const isCritical = ruleType === 'cc' ? roll === 1 : roll <= 5;
        const isFumble = ruleType === 'cc' ? roll === 100 : roll >= 96;

        return new CCBRoll(
            `1d100<=${target}`,
            [roll],
            roll,
            target,
            isSuccess,
            isSpecial && isSuccess,
            isCritical && isSuccess,
            isFumble && !isSuccess,
            undefined // 通常のCCBロールには故障ナンバーなし
        );
    }
}

export class ChoiceRoll extends DiceRoll {
    constructor(
        expression: string,
        rolls: number[],
        total: number,
        private readonly choices: string[],
        private readonly selectedChoice: string
    ) {
        super(expression, rolls, total, selectedChoice);
    }

    getChoices(): readonly string[] {
        return this.choices;
    }

    getSelectedChoice(): string {
        return this.selectedChoice;
    }

    static select(choices: string[], rollResult: number): ChoiceRoll {
        const index = Math.max(0, Math.min(rollResult - 1, choices.length - 1));
        const selected = choices[index];

        return new ChoiceRoll(
            `choice(${choices.join(',')})`,
            [rollResult],
            rollResult,
            choices,
            selected
        );
    }
}