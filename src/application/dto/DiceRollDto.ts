export type DiceOutcome =
    | 'fumble_malfunction'  // ファンブル＆故障
    | 'critical_failure'    // 致命的失敗
    | 'fumble'              // ファンブル
    | 'malfunction'         // 故障
    | 'critical'            // クリティカル
    | 'extreme_success'     // イクストリーム成功
    | 'hard_success'        // ハード成功
    | 'regular_success'     // レギュラー成功
    | 'success'             // 成功
    | 'failure'             // 失敗
    | 'normal';             // 通常（判定なし）

export interface DiceRollDto {
    expression: string;
    result: string;
    total: number;
    outcome: DiceOutcome;
}

export interface DiceRollRequest {
    expression: string;
    userId: string;
    guildId?: string;
}

export interface DiceRollResponse<T extends DiceRollDto = DiceRollDto> {
    rolls: T[];
    originalExpression: string;
}