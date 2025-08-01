import { ChatInputCommandInteraction } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { rollDice } from '../../../domain/utils/dice';
import { generateEmbed } from '../../../presentation/discord/builders/embedGenerator';
import { configurationStore } from '../../services/ConfigurationStore';

export class FeatureCommandHandler {
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const dataPath = path.join(process.cwd(), 'src', 'data', 'features.json');
        const featureData = await JSON.parse(fs.readFileSync(dataPath, 'utf8'));

        const embed = generateEmbed(interaction)
            .setTitle('ランダム特徴表')
            .setColor(0x888888);

        const count = interaction.options.getInteger('count') ?? 1;
        const userId = interaction.user.id;
        
        // ユーザー設定を確認
        const predefinedValues = configurationStore.getUserConfiguration(userId, 'feature');
        
        for (let i = 0; i < count; i++) {
            let randomIndex: number;
            let randomNumber: number;
            
            if (predefinedValues && i < predefinedValues.length) {
                // 事前設定された値を使用
                const value = predefinedValues[i];
                randomIndex = Math.floor(value / 10);
                randomNumber = value % 10;
            } else {
                // 通常のランダム処理
                randomIndex = rollDice(1, 6).reduce((a, b) => a + b, 0) - 1;
                randomNumber = rollDice(1, 10).reduce((a, b) => a + b, 0) - 1;
            }

            const randomFeature = featureData[randomIndex][randomNumber];

            embed.addFields(
                { name: `${randomIndex + 1}-${randomNumber + 1} ${randomFeature.name}`, value: randomFeature.detail }
            );
        }
        
        // 使用後は設定をクリア
        if (predefinedValues) {
            configurationStore.clearUserConfiguration(userId, 'feature');
        }

        await interaction.reply({ embeds: [embed] });
    }
}