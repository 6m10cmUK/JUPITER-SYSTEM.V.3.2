import { Client, Message } from 'discord.js';
import { Command } from '../../interfaces/Command';
import { InteractionHandler } from '../../interfaces/InteractionHandler';
import { diceRoll } from '../../infrastructure/commands/legacy/ClassicDiceRollHandler';
import { createErrorMessage } from '../../presentation/discord/builders/messages';

import * as fs from 'fs';
import * as path from 'path';

export class DiscordAdapter {
    private prefix = '/#';
    private commands: Map<string, Command> = new Map();
    private adminCommands: Map<string, (message: Message, guildId: string) => Promise<void>> = new Map();
    private interactionHandlers: Map<string, InteractionHandler> = new Map();

    constructor(private client: Client) {
        this.init();
    }

    private async init() {
        await this.loadCommands();
        await this.loadAdminCommands();
        await this.loadInteractionHandlers();
        this.setupInteractionHandler();
    }

    private async loadInteractionHandlers() {
        const interactionsPath = path.join(process.cwd(), 'dist/interactions');
        const files = fs.readdirSync(interactionsPath).filter(file => file.endsWith('.js'));

        for (const file of files) {
            try {
                const filePath = path.join(interactionsPath, file);
                const handler = await import(filePath);
                if (handler.prefix && handler.execute) {
                    this.interactionHandlers.set(handler.prefix, handler);
                } else {
                    console.warn(`${file}のインタラクションハンドラーの定義が不正だよ`);
                }
            } catch (error) {
                console.error(`${file}の読み込み中にエラーが発生したよ:`, error);
            }
        }
    }

    private async loadCommands() {
        const commandsPath = path.join(process.cwd(), 'src/infrastructure/commands');
        const entries = fs.readdirSync(commandsPath, { withFileTypes: true });
        const commandFiles = entries
            .filter(entry => entry.isFile() && entry.name.endsWith('-command.ts'))
            .map(entry => entry.name);

        for (const file of commandFiles) {
            try {
                const filePath = path.join(process.cwd(), 'dist/infrastructure/commands', file.replace('.ts', '.js'));
                const { command } = await import(filePath);
                if (command?.data?.name) {
                    this.commands.set(command.data.name, command);
                    console.log(`コマンド読み込み完了: ${command.data.name}`);
                } else {
                    console.warn(`${file}のコマンド定義が不正だよ`);
                }
            } catch (error) {
                console.error(`${file}の読み込み中にエラーが発生したよ:`, error);
            }
        }
    }

    private async loadAdminCommands() {
        const adminCommandsPath = path.join(process.cwd(), 'dist/adminCommands');
        const commandFiles = fs.readdirSync(adminCommandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            try {
                const filePath = path.join(adminCommandsPath, file);
                const { execute } = await import(filePath);
                const commandName = file.replace('.js', '');
                this.adminCommands.set(commandName, execute);
            } catch (error) {
                console.error(`${file}の読み込み中にエラーが発生したよ:`, error);
            }
        }
    }

    private setupInteractionHandler() {
        this.client.on('interactionCreate', async interaction => {
            if (interaction.isChatInputCommand()) {
                console.log(`${interaction.guild?.id} ${interaction.user.globalName} ${interaction.commandName}`);
                const command = this.commands.get(interaction.commandName);

                if (!command) {
                    console.error(`${interaction.commandName} is not found`);
                    await interaction.reply(
                        createErrorMessage(
                            interaction,
                            `COMMAND EXECUTE FAILED`,
                            'Command is not found'
                        )
                    );
                    return;
                }

                try {
                    await command.execute(interaction);
                } catch (error) {
                    console.error(error);
                    await interaction.reply(
                        createErrorMessage(
                            interaction,
                            `COMMAND EXECUTE FAILED`,
                            error instanceof Error ? error.message : 'Unknown error'
                        )
                    );
                }
            } else if (interaction.isStringSelectMenu() || interaction.isButton()) {
                const [prefix] = interaction.customId.split(':');
                const handler = this.interactionHandlers.get(prefix);

                if (handler) {
                    try {
                        await handler.execute(interaction);
                    } catch (error) {
                        console.error(error);
                        await interaction.reply(
                            createErrorMessage(
                                interaction,
                                `INTERACTION FAILED`,
                                error instanceof Error ? error.message : 'Unknown error'
                            )
                        );
                    }
                }
            } else if (interaction.isModalSubmit()) {
                // changeNameModalの処理
                if (interaction.customId.startsWith('nameChangeModal:')) {
                    const { handleNameChangeModal } = await import('../../interactions/changeNameInteraction');
                    try {
                        await handleNameChangeModal(interaction);
                    } catch (error) {
                        console.error(error);
                        await interaction.reply(
                            createErrorMessage(
                                interaction,
                                `MODAL SUBMIT FAILED`,
                                error instanceof Error ? error.message : 'Unknown error'
                            )
                        );
                    }
                }
                // customSetModalの処理
                if (interaction.customId.startsWith('customSetModal:')) {
                    const { handleCustomSetModal } = await import('../../interactions/customSetInteraction');
                    try {
                        await handleCustomSetModal(interaction);
                    } catch (error) {
                        console.error(error);
                        await interaction.reply(
                            createErrorMessage(
                                interaction,
                                `MODAL SUBMIT FAILED`,
                                error instanceof Error ? error.message : 'Unknown error'
                            )
                        );
                    }
                }
            }
        });
    }

    async handleMessage(message: Message) {
        if (!message.content.startsWith(this.prefix)) {
            await diceRoll(message);
            return;
        }

        const commandBody = message.content.slice(this.prefix.length).trim();
        const args = commandBody.split(/\s+/);
        const command = args.shift()?.toLowerCase();
        const guildId = message.guild?.id;
        if (!guildId || !command) return;

        const adminCommand = this.adminCommands.get(command);
        if (adminCommand) {
            // 管理者権限を持っているか確認
            if (!message.member?.permissions.has('Administrator') && message.guild?.ownerId !== message.author.id) {
                await message.reply(
                    createErrorMessage(
                        message,
                        `PERMISSION DENIED`,
                        'This command can only be used by administrators'
                    )
                );
                return;
            }
            await adminCommand(message, guildId);
        }
    }
} 