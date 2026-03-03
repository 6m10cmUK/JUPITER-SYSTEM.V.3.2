/**
 * 後方互換のための再エクスポートラッパー
 * 新規コードでは StatValueCalculator / ValidationStateService を直接使用すること
 */

import { StatValueCalculator } from '../../domain/services/status/StatValueCalculator';
import { ValidationStateService } from '../../application/services/ValidationStateService';

export function validateInput(input: string): boolean {
    return ValidationStateService.validateInput(input);
}

export function recordValidation(key: string, value?: number): void {
    ValidationStateService.recordValidation(key, value);
}

export function isValidated(key: string): boolean {
    return ValidationStateService.isValidated(key);
}

export function clearValidation(key: string): void {
    ValidationStateService.clearValidation(key);
}

export function calculateOptimalValue(type: string, version: string, messageId: string): number {
    return StatValueCalculator.calculateOptimalValue(type, version, messageId, ValidationStateService);
}

export function isValueInValidRange(type: string, version: string, value: number): boolean {
    return StatValueCalculator.isValueInValidRange(type, version, value);
}

export function generateOptimalDetails(type: string, value: number): string {
    return StatValueCalculator.generateOptimalDetails(type, value);
}
