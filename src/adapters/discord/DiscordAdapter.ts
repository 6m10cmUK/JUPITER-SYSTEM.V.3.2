import { Client, Message, EmbedBuilder } from 'discord.js';
import { MessageUseCase } from '../../usecases/MessageUseCase';
import { Command } from '../../interfaces/Command';
import { handleRerollInteraction } from '../../interactions/rerollInteraction';
import { handleConfirmRerollInteraction } from '../../interactions/confirmRerollInteraction';
import { handleChangeInteraction } from '../../interactions/changeInteraction';
import { handleChangeSelectorInteraction } from '../../interactions/changeSelectorInteraction';
import { handleChangeConfirmInteraction } from '../../interactions/changeConfirmInteraction';

import { handleJobInteraction } from '../../interactions/jobInteraction';
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
                        embeds: [
                            new EmbedBuilder()
                            .setTitle('COMMAND EXECUTE FAILED')
                            .setDescription(error instanceof Error ? error.message : 'Unknown error')
                            .setColor(0xff0000)
                        ],
                        ephemeral: true
                    });
                }
            } else if (interaction.isStringSelectMenu()) {
                if (interaction.customId.startsWith('reroll:')) {
                    await handleRerollInteraction(interaction);
                }

                if (interaction.customId.startsWith('change:')) {
                    await handleChangeInteraction(interaction);
                }

                if (interaction.customId.startsWith('change_selector:')) {
                    await handleChangeSelectorInteraction(interaction);
                }
            } else if (interaction.isButton()) {
                if (interaction.customId.startsWith('confirmReroll:')) {
                    await handleConfirmRerollInteraction(interaction);
                }

                if (interaction.customId.startsWith('job_')) {
                    await handleJobInteraction(interaction);
                }
                if (interaction.customId.startsWith('change_confirm:')) {
                    await handleChangeConfirmInteraction(interaction);
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
        const guildId = message.guild?.id;
        if (!guildId) return;

        if (command === 'setup') {
            await useCase.executeSetup(message, guildId);
        }

        if (command === 'update') {
            await useCase.executeUpdate(message, guildId);
        }

        if (command === 'add') {
            await useCase.executeAdd(message, guildId);
        }
    }
} 