import { 
    ChatInputCommandInteraction, 
    EmbedBuilder,
    SlashCommandBuilder,
    ColorResolvable,
} from 'discord.js';
import { Command } from '../../shared/interfaces/Command';
import axios from 'axios';


export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('ccfolia-log')
        .setDescription('CCFOLIAのログを処理する')
        .addAttachmentOption(option =>
            option.setName('logfile')
                .setDescription('CCFOLIAのログHTMLファイル')
                .setRequired(true)
        ) as SlashCommandBuilder,
        
        async execute(interaction: ChatInputCommandInteraction) {
            await interaction.deferReply();

            const attachment = interaction.options.getAttachment('logfile');
            if (!attachment) {
                console.error('Attachment is null');
                return;
            }

            const response = await axios.get(attachment.url);
            const htmlContent = response.data;
                
            const regex = /<p style="color:((?!#888888)[^;]+);">\s*<span>\s*\[([^\]]+)\]<\/span>\s*<span>([^<]+)<\/span>\s*:\s*<span>\s*([^<]+)\s*<\/span>\s*<\/p>/g;
        
            let match;
            const result: { name: string, color: string, critical: string[], special: string[], fumble: string[] }[] = [];
            while ((match = regex.exec(htmlContent)) !== null) {

                let [, color, channel, name, message] = match;
                if (!result.find(item => item.name === name)) {
                    result.push({ name, color, critical: [], special: [], fumble: [] });
                }
                message = message.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                message = message.replace(/\*/g, '\\*');
                if(message.includes('＞ 決定的成功')) {
                    result[result.findIndex(item => item.name === name)]
                        .critical.push(`[${channel}]: ${message}`);
                } else if(message.includes('＞ スペシャル')) {
                    result[result.findIndex(item => item.name === name)]
                        .special.push(`[${channel}]: ${message}`);
                } else if(message.includes('＞ 致命的失敗')) {
                    result[result.findIndex(item => item.name === name)]
                        .fumble.push(`[${channel}]: ${message}`);
                }
            }

            const filteredResult = result.filter(item =>
                item.critical.length > 0 || item.special.length > 0 || item.fumble.length > 0
            );
            
            const embeds: EmbedBuilder[] = [];

            function chunkStringArray(array: string[], maxLength: number): string[] {
                const chunks: string[] = [];
                let currentChunk = '';

                array.forEach(item => {
                    if ((currentChunk + item).length > maxLength) {
                        chunks.push(currentChunk);
                        currentChunk = '';
                    }
                    currentChunk += item;
                });

                if (currentChunk.length > 0) {
                    chunks.push(currentChunk);
                }

                return chunks;
            }

            filteredResult.forEach(item => {

                const criticalChunks = chunkStringArray(item.critical, 1000);
                const specialChunks = chunkStringArray(item.special, 1000);
                const fumbleChunks = chunkStringArray(item.fumble, 1000);

                const color = /^#[0-9A-F]{6}$/i.test(item.color) ? item.color : null;

                criticalChunks.forEach((chunk) => {
                    const itemEmbed = new EmbedBuilder()
                        .setTitle(`${item.name} クリティカル(${item.critical.length})`)
                        .setDescription(chunk);
                    if (color) {
                        itemEmbed.setColor(color as ColorResolvable);
                    }
                    embeds.push(itemEmbed);
                });

                specialChunks.forEach((chunk) => {
                    const itemEmbed = new EmbedBuilder()
                        .setTitle(`${item.name} スペシャル(${item.special.length})`)
                        .setDescription(chunk);
                    if (color) {
                        itemEmbed.setColor(color as ColorResolvable);
                    }
                    embeds.push(itemEmbed);
                });

                fumbleChunks.forEach((chunk) => {
                    const itemEmbed = new EmbedBuilder()
                        .setTitle(`${item.name} 致命的失敗(${item.fumble.length})`)
                        .setDescription(chunk);
                    if (color) {
                        itemEmbed.setColor(color as ColorResolvable);
                    }
                    embeds.push(itemEmbed);
                });
            });

            const chunkedEmbeds = [];
            for (let i = 0; i < embeds.length; i += 10) {
                chunkedEmbeds.push(embeds.slice(i, i + 10));
            }

            for (const embedChunk of chunkedEmbeds) {
                await interaction.followUp({ embeds: embedChunk });
            }

    }

}