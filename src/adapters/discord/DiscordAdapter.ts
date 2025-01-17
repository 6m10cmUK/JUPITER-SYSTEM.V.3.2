import { Client, Message } from 'discord.js';
import { MessageUseCase } from '../../usecases/MessageUseCase';
import { Command } from '../../interfaces/Command';
import { handleRerollInteraction } from '../../interactions/rerollInteraction';
import { handleConfirmRerollInteraction } from '../../interactions/confirmRerollInteraction';
import { diceRoll } from '../../commands/classicCommands/diceRoll';
import * as fs from 'fs';
import * as path from 'path';

export class DiscordAdapter {
    private prefix = '/#';
    private commands: Map<string, Command> = new Map();

    constructor(private client: Client) {
        this.init();
    }

    private async init() {
        await this.loadCommands();
        this.setupInteractionHandler();
    }

    private async loadCommands() {
        const commandsPath = path.join(process.cwd(), 'src/commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));

        for (const file of commandFiles) {
            try {
                const filePath = path.join(process.cwd(), 'dist/commands', file.replace('.ts', '.js'));
                const { command } = await import(filePath);
                if (command?.data?.name) {
                    this.commands.set(command.data.name, command);
                } else {
                    console.warn(`${file}のコマンド定義が不正だよ`);
                }
            } catch (error) {
                console.error(`${file}の読み込み中にエラーが発生したよ:`, error);
            }
        }
    }

    private setupInteractionHandler() {
        this.client.on('interactionCreate', async interaction => {
            if (interaction.isChatInputCommand()) {
                const command = this.commands.get(interaction.commandName);

                if (!command) {
                    console.error(`${interaction.commandName}というコマンドが見つからないよ`);
                    return;
                }

                try {
                    await command.execute(interaction);
                } catch (error) {
                    console.error(error);
                    await interaction.reply({ 
                        content: 'コマンドの実行中にエラーが発生しちゃった...', 
                        ephemeral: true 
                    });
                }
            } else if (interaction.isStringSelectMenu()) {
                if (interaction.customId.startsWith('reroll:')) {
                    await handleRerollInteraction(interaction);
                }
            } else if (interaction.isButton()) {
                if (interaction.customId.startsWith('confirmReroll:')) {
                    await handleConfirmRerollInteraction(interaction);
                }
            }
        });
    }

    async handleMessage(message: Message, useCase: MessageUseCase) {

        await diceRoll(message);

        if (!message.content.startsWith(this.prefix)) return;

        const commandBody = message.content.slice(this.prefix.length).trim();
        const args = commandBody.split(/\s+/);
        const command = args.shift()?.toLowerCase();

        if (command === 'setup') {
            const guildId = message.guild?.id;
            if (!guildId) return;
            await useCase.executeSetup(message, guildId);
        }
    }
} 