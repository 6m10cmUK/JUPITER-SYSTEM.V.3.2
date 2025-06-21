export interface StatusGenerationDto {
    version: '6' | '7';
    characterName: string;
    userId: string;
    messageId: string;
}

export interface StatusResultDto {
    version: '6' | '7';
    characterName: string;
    primaryStats: Record<string, number>;
    primaryStatsDetails: Record<string, string>;
    secondaryStats: Record<string, any>;
    rerollCount: number;
    history: string;
    messageId?: string;
    userId?: string;
    showCustomMenu?: boolean;
}