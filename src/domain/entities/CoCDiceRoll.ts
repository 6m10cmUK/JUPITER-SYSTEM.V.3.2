import { DiceRoll } from './DiceRoll';

export type CoCSuccessLevel = 'critical' | 'extreme' | 'hard' | 'regular' | 'failure' | 'fumble';
export type CoCDifficulty = 'r' | 'h' | 'e' | 'c';

export class CoCDiceRoll extends DiceRoll {
    constructor(
        expression: string,
        rolls: number[],
        total: number,
        detailedExpression: string,
        private readonly target?: number,
        private readonly successLevel?: CoCSuccessLevel,
        private readonly bonusDice?: number,
        private readonly difficulty?: CoCDifficulty
    ) {
        super(expression, rolls, total, detailedExpression);
    }

    getTarget(): number | undefined {
        return this.target;
    }

    getSuccessLevel(): CoCSuccessLevel | undefined {
        return this.successLevel;
    }

    getBonusDice(): number | undefined {
        return this.bonusDice;
    }

    getDifficulty(): CoCDifficulty | undefined {
        return this.difficulty;
    }

    isSuccess(): boolean {
        if (!this.successLevel) return false;
        return this.successLevel !== 'failure' && this.successLevel !== 'fumble';
    }

    static evaluate(
        target: number,
        roll: number,
        bonusDice: number = 0,
        difficulty?: CoCDifficulty
    ): CoCDiceRoll {
        let finalRoll = roll;
        const rolls: number[] = [roll];

        // ボーナス・ペナルティダイスの処理
        if (bonusDice !== 0) {
            const additionalRolls: number[] = [];
            for (let i = 0; i < Math.abs(bonusDice); i++) {
                const extraRoll = Math.floor(Math.random() * 10);
                additionalRolls.push(extraRoll);
            }

            // 十の位の候補を集める
            const tensDigit = Math.floor(roll / 10);
            const onesDigit = roll % 10;
            const candidates = [roll];

            // 追加のダイスから候補を作る
            additionalRolls.forEach(extra => {
                candidates.push(extra * 10 + onesDigit);
            });

            // ボーナスダイスなら最小値、ペナルティダイスなら最大値を選ぶ
            if (bonusDice > 0) {
                finalRoll = Math.min(...candidates.filter(c => c > 0 || c === 100));
            } else {
                finalRoll = Math.max(...candidates);
            }

            rolls.push(...additionalRolls);
        }

        const successLevel = this.calculateSuccessLevel(target, finalRoll, difficulty);
        const expression = bonusDice !== 0 ? `CC(${bonusDice})<=${target}` : `CC<=${target}`;

        return new CoCDiceRoll(
            expression,
            rolls,
            finalRoll,
            `${finalRoll}`,
            target,
            successLevel,
            bonusDice,
            difficulty
        );
    }

    private static calculateSuccessLevel(
        target: number,
        roll: number,
        difficulty?: CoCDifficulty
    ): CoCSuccessLevel {
        // ファンブル判定（96-100は常にファンブル、50以上の技能値なら100のみ）
        if (roll >= 96 && (target < 50 || roll === 100)) {
            return 'fumble';
        }

        // クリティカル判定（1は常にクリティカル）
        if (roll === 1) {
            return 'critical';
        }

        // 失敗判定
        if (roll > target) {
            return 'failure';
        }

        // 難易度が指定されている場合
        if (difficulty) {
            const requiredLevel = this.getDifficultyThreshold(target, difficulty);
            if (roll > requiredLevel) {
                return 'failure';
            }
            return 'regular'; // 難易度指定時は成功/失敗のみ
        }

        // 成功レベルの判定
        if (roll <= target / 5) {
            return 'extreme';
        } else if (roll <= target / 2) {
            return 'hard';
        } else {
            return 'regular';
        }
    }

    private static getDifficultyThreshold(target: number, difficulty: CoCDifficulty): number {
        switch (difficulty) {
            case 'c': return Math.floor(target / 5);
            case 'e': return Math.floor(target / 5);
            case 'h': return Math.floor(target / 2);
            case 'r': 
            default: return target;
        }
    }
}

export class FARRoll extends DiceRoll {
    constructor(
        expression: string,
        rolls: number[],
        total: number,
        detailedExpression: string,
        private readonly bullets: number,
        private readonly skill: number,
        private readonly malfunction: number,
        private readonly hits: number,
        private readonly impales: number,
        private readonly remainingBullets: number,
        private readonly malfunctioned: boolean
    ) {
        super(expression, rolls, total, detailedExpression);
    }

    getHits(): number {
        return this.hits;
    }

    getImpales(): number {
        return this.impales;
    }

    getRemainingBullets(): number {
        return this.remainingBullets;
    }

    isMalfunctioned(): boolean {
        return this.malfunctioned;
    }

    static evaluate(
        bullets: number,
        skill: number,
        malfunction: number,
        bonusDice: number = 0,
        difficulty?: CoCDifficulty,
        volleySize: number = 1
    ): FARRoll {
        const rolls: number[] = [];
        let hits = 0;
        let impales = 0;
        let shotsFired = 0;
        let malfunctioned = false;

        // 必要な成功値を計算
        let requiredRoll = skill;
        if (difficulty) {
            requiredRoll = CoCDiceRoll['getDifficultyThreshold'](skill, difficulty);
        }

        // ボレーごとに射撃
        for (let i = 0; i < bullets && !malfunctioned; i += volleySize) {
            const volleyBullets = Math.min(volleySize, bullets - i);
            
            for (let j = 0; j < volleyBullets && !malfunctioned; j++) {
                let roll = Math.floor(Math.random() * 100) + 1;
                const baseRoll = roll;
                rolls.push(roll);

                // ボーナス・ペナルティダイスの処理
                if (bonusDice !== 0) {
                    const candidates = [roll];
                    const onesDigit = roll % 10;
                    
                    for (let k = 0; k < Math.abs(bonusDice); k++) {
                        const extraTens = Math.floor(Math.random() * 10);
                        candidates.push(extraTens * 10 + onesDigit);
                    }

                    if (bonusDice > 0) {
                        roll = Math.min(...candidates.filter(c => c > 0 || c === 100));
                    } else {
                        roll = Math.max(...candidates);
                    }
                }

                shotsFired++;

                // 故障判定
                if (baseRoll >= malfunction) {
                    malfunctioned = true;
                    break;
                }

                // 命中判定
                if (roll <= requiredRoll) {
                    hits++;
                    // 貫通判定（5分の1以下）
                    if (roll <= requiredRoll / 5) {
                        impales++;
                    }
                }

                // 難易度指定がある場合、成功したら射撃終了
                if (difficulty && roll <= requiredRoll) {
                    shotsFired = i + j + 1;
                    i = bullets; // 外側のループも終了
                    break;
                }
            }
        }

        const remainingBullets = bullets - shotsFired;
        const expression = `FAR(${bullets},${skill},${malfunction}${bonusDice !== 0 ? ',' + bonusDice : ''}${difficulty ? ',' + difficulty : ''}${volleySize !== 1 ? ',' + volleySize : ''})`;
        const detailedExpression = `命中:${hits} 貫通:${impales} 残弾:${remainingBullets}${malfunctioned ? ' 故障' : ''}`;

        return new FARRoll(
            expression,
            rolls,
            hits,
            detailedExpression,
            bullets,
            skill,
            malfunction,
            hits,
            impales,
            remainingBullets,
            malfunctioned
        );
    }
}