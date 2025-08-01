import { Message } from 'discord.js';
import { configurationStore } from './ConfigurationStore';

export class MessageProcessor {
    private static readonly PATTERN = /^\/\#\$c(\d{1,2}-\d{1,2}(?:,\d{1,2}-\d{1,2})*)$/;

    static async processMessage(message: Message): Promise<boolean> {
        const content = message.content.trim();
        const match = content.match(this.PATTERN);
        
        if (!match) {
            return false;
        }

        const valuesString = match[1];
        const values = valuesString.split(',').map(val => {
            const [row, col] = val.split('-').map(Number);
            return (row - 1) * 10 + (col - 1);
        });

        configurationStore.setUserConfiguration(message.author.id, 'feature', values);
        
        // メッセージを削除（可能な場合）
        try {
            await message.delete();
        } catch (error) {
            // 削除に失敗した場合は無視
        }
        
        return true;
    }
}