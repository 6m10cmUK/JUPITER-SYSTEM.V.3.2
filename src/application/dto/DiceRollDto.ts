export interface DiceRollDto {
    expression: string;
    result: string;
    total: number;
    color: number;
}

export interface DiceRollRequest {
    expression: string;
    userId: string;
    guildId?: string;
}

export interface DiceRollResponse {
    rolls: DiceRollDto[];
    originalExpression: string;
}