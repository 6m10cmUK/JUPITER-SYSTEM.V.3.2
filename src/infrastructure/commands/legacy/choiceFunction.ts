import { rollDice } from '../../../domain/utils/dice';

export async function choice(content: string): Promise<[string, number]> {
    const choiceMatch = content.match(/choice\(([^)]+)\)/i);
    if (!choiceMatch) {
        throw new Error('Invalid choice expression');
    }
    
    const choices = choiceMatch[1].split(/[\s,]+/).filter(c => c.length > 0);
    const result = rollDice(1, choices.length);
    const total = result.reduce((sum, val) => sum + val, 0);
    
    return [`＞ **${choices[total - 1]}**`, 0x888888];
}