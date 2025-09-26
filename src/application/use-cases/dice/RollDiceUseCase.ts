import { DiceService } from '../../../domain/services/DiceService';
import { DiceExpression } from '../../../domain/value-objects/DiceExpression';
import { DiceRollRequest, DiceRollResponse, DiceRollDto } from '../../dto/DiceRollDto';
import { CCBRoll, ChoiceRoll } from '../../../domain/entities/DiceRoll';
import { CoCDiceRoll, FARRoll } from '../../../domain/entities/CoCDiceRoll';
import { convertFullWidthToHalfWidth } from '../../../shared/utils/stringUtils';
import { DiceRollResult, isDiceRoll, isCoCDiceRoll, isFARRoll, isCCBRoll, isBreakdownAwareCCBRoll } from './types/DiceRollTypes';

export class RollDiceUseCase {
    constructor(private readonly diceService: DiceService) {}

    async execute(request: DiceRollRequest): Promise<DiceRollResponse> {
        const normalizedExpression = convertFullWidthToHalfWidth(request.expression);
        const diceExpression = new DiceExpression(normalizedExpression);
        
        const rolls = diceExpression.hasRepeat() 
            ? this.diceService.rollMultiple(diceExpression)
            : [this.diceService.roll(diceExpression)];

        const rollDtos: DiceRollDto[] = rolls.map((roll, index) => {
            const dto = this.mapToDto(roll);
            
            if (rolls.length > 1) {
                dto.result = `#${index + 1} ${dto.result}`;
            }
            
            return dto;
        });

        return {
            rolls: rollDtos,
            originalExpression: request.expression
        };
    }

    private mapToDto(roll: DiceRollResult): DiceRollDto {
        if (roll instanceof CCBRoll) {
            return this.mapCCBToDto(roll);
        }
        
        if (roll instanceof ChoiceRoll) {
            return this.mapChoiceToDto(roll);
        }

        if (isCoCDiceRoll(roll)) {
            return this.mapCoCToDto(roll);
        }

        if (isFARRoll(roll)) {
            return this.mapFARToDto(roll);
        }
        
        if (isCCBRoll(roll)) {
            return this.mapCCBToDto(roll);
        }
        
        return this.mapStandardToDto(roll);
    }

    /**
     * CCBRoll（6版）を型安全にDTOに変換
     * @param roll CCBRollインスタンス
     * @returns DiceRollDto
     */
    private mapCCBToDto(roll: CCBRoll): DiceRollDto {
        let result = `＞ **${roll.getTotal()}** `;
        let color = 0x888888;
        
        // 故障判定の場合（型安全なアクセス）
        const breakdownNumber = roll.getBreakdownNumber();
        if (breakdownNumber !== undefined) {
            // 故障ナンバーが設定されている場合の処理
            if (roll.getTotal() >= breakdownNumber) {
                if (roll.isCriticalFailure()) {
                    result += `＞ **ファンブル＆故障** `;
                    color = 0xFF0000;
                } else {
                    result += `＞ **故障** `;
                    color = 0xFFA500; // オレンジ色
                }
            } else {
                result += `＞ **正常** `;
                color = 0x888888;
            }
        } else if (roll.getTarget()) {
            // 通常のCC/CCB判定
            if (roll.isSuccess()) {
                color = 0x0000FF;
                result += `**<= ${roll.getTarget()}** ＞ **成功** `;
                
                if (roll.isSpecial()) {
                    result += `**/ スペシャル** `;
                }
                if (roll.isCriticalSuccess()) {
                    result += `**/ 決定的成功** `;
                }
            } else {
                color = 0xFF0000;
                result += `**<=${roll.getTarget()}** ＞ **失敗** `;
                
                if (roll.isCriticalFailure()) {
                    result += `**/ 致命的失敗** `;
                }
            }
        }
        
        return {
            expression: roll.getExpression(),
            result,
            total: roll.getTotal(),
            color
        };
    }

    private mapChoiceToDto(roll: ChoiceRoll): DiceRollDto {
        return {
            expression: roll.getExpression(),
            result: `＞ **${roll.getSelectedChoice()}**`,
            total: roll.getTotal(),
            color: 0x888888
        };
    }

    private mapStandardToDto(roll: DiceRollResult): DiceRollDto {
        return {
            expression: roll.getExpression(),
            result: ` ＞ ${roll.getDetailedExpression()} ＞ **${roll.getTotal()}**`,
            total: roll.getTotal(),
            color: 0x888888
        };
    }

    private mapCoCToDto(roll: CoCDiceRoll): DiceRollDto {
        let result = `＞ **${roll.getTotal()}** `;
        let color = 0x888888;
        
        const target = roll.getTarget();
        const successLevel = roll.getSuccessLevel();
        const difficulty = roll.getDifficulty();
        
        if (target && successLevel) {
            // 難易度指定がある場合
            if (difficulty) {
                const difficultyName = {
                    'r': 'レギュラー',
                    'h': 'ハード',
                    'e': 'イクストリーム',
                    'c': 'クリティカル'
                }[difficulty];
                
                if (roll.isSuccess()) {
                    color = 0x0000FF;
                    result += `**<= ${target}(${difficultyName})** ＞ **成功** `;
                } else {
                    color = 0xFF0000;
                    result += `**<= ${target}(${difficultyName})** ＞ **失敗** `;
                }
                
                // クリティカル/ファンブル表示
                if (successLevel === 'critical') {
                    result += `**/ クリティカル** `;
                } else if (successLevel === 'fumble') {
                    result += `**/ ファンブル** `;
                }
            } else {
                // 通常の成功レベル判定
                const levelNames = {
                    'critical': 'クリティカル',
                    'extreme': 'イクストリーム成功',
                    'hard': 'ハード成功',
                    'regular': 'レギュラー成功',
                    'failure': '失敗',
                    'fumble': 'ファンブル'
                };
                
                const levelColors = {
                    'critical': 0x00FFFF,
                    'extreme': 0x00FF00,
                    'hard': 0x0080FF,
                    'regular': 0x0000FF,
                    'failure': 0xFF0000,
                    'fumble': 0xFF00FF
                };
                
                color = levelColors[successLevel];
                result += `**<= ${target}** ＞ **${levelNames[successLevel]}** `;
            }
        }
        
        return {
            expression: roll.getExpression(),
            result,
            total: roll.getTotal(),
            color
        };
    }

    private mapFARToDto(roll: FARRoll): DiceRollDto {
        let result = `＞ **命中: ${roll.getHits()}** / **貫通: ${roll.getImpales()}** / **残弾: ${roll.getRemainingBullets()}** `;
        
        if (roll.isMalfunctioned()) {
            result += `**/ 故障** `;
        }
        
        return {
            expression: roll.getExpression(),
            result,
            total: roll.getHits(),
            color: roll.isMalfunctioned() ? 0xFF0000 : 0x888888
        };
    }
}