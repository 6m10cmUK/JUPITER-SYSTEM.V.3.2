export interface DiceRollDto {
    expression: string;
    result: string;
    total: number;
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