import { Client, Message } from 'discord.js';
import { Command } from '../../shared/interfaces/Command';
import { InteractionHandler } from '../../shared/interfaces/InteractionHandler';
import { diceRoll } from '../../infrastructure/services/dice/classicDiceRoll';
import { createErrorMessage, createServerErrorMessage } from '../../presentation/discord/builders/messages';
import { WebSocketServer } from '../../infrastructure/websocket/WebSocketServer';
import { MessageProcessor } from '../../infrastructure/services/MessageProcessor';
import { isBanned } from '../../shared/access/accessControl';

import * as fs from 'fs';
import * as path from 'path';

export class DiscordAdapter {
    private prefix = '/#';
    private commands: Map<string, Command> = new Map();
    private adminCommands: Map<string, (message: Message, guildId: string) => Promise<void>> = new Map();
    private interactionHandlers: Map<string, InteractionHandler> = new Map();
    private initPromise: Promise<void>;

    constructor(private client: Client, private wsServer?: WebSocketServer) {
        this.initPromise = this.init();
    }

    public waitForInit(): Promise<void> {
        return this.initPromise;
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
                    console.warn(`Invalid interaction handler definition in ${file}`);
                }
            } catch (error) {
                console.error(`Error loading ${file}:`, error);
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
                const module = await import(filePath);
                
                if (module.command?.data?.name) {
                    // notify-commandの特別処理
                    if (file === 'notify-command.ts' && module.createNotifyCommand && this.wsServer) {
                        const command = module.createNotifyCommand(this.wsServer);
                        this.commands.set(command.data.name, command);
                        console.log(`Command loaded: ${command.data.name} (with WebSocket)`);
                    } else {
                        this.commands.set(module.command.data.name, module.command);
                        console.log(`Command loaded: ${module.command.data.name}`);
                    }
                } else {
                    console.warn(`Invalid command definition in ${file}`);
                }
            } catch (error) {
                console.error(`Error loading ${file}:`, error);
            }
        }
    }

    private async loadAdminCommands() {
        const adminCommandsPath = path.join(process.cwd(), 'dist/infrastructure/commands/admin');
        const commandFiles = fs.readdirSync(adminCommandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            try {
                const filePath = path.join(adminCommandsPath, file);
                const { execute } = await import(filePath);
                const commandName = file.replace('.js', '');
                this.adminCommands.set(commandName, execute);
            } catch (error) {
                console.error(`Error loading ${file}:`, error);
            }
        }
    }

    private setupInteractionHandler() {
        this.client.on('interactionCreate', async interaction => {
            // アクセスガード：BAN チェック
            if (isBanned(interaction.user.id, interaction.guild?.id)) {
                if (interaction.isAutocomplete()) {
                    return;
                }
                // Autocomplete 以外の場合はエラーメッセージを返す
                if (interaction.isChatInputCommand() || interaction.isStringSelectMenu() || interaction.isButton() || interaction.isModalSubmit()) {
                    await interaction.reply(createServerErrorMessage(interaction));
                }
                return;
            }

            if (interaction.isAutocomplete()) {
                const command = this.commands.get(interaction.commandName);
                if (command && 'autocomplete' in command && typeof (command as any).autocomplete === 'function') {
                    try {
                        await (command as any).autocomplete(interaction);
                    } catch (error) {
                        console.error(`Autocomplete error for ${interaction.commandName}:`, error);
                    }
                }
            } else if (interaction.isChatInputCommand()) {
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
                console.log(`Processing interaction with customId: ${interaction.customId}, prefix: ${prefix}`);
                

                const handler = this.interactionHandlers.get(prefix);

                if (handler) {
                    console.log(`Found handler for prefix: ${prefix}`);
                    try {
                        await handler.execute(interaction);
                    } catch (error) {
                        console.error(`Error executing handler for ${prefix}:`, error);
                        await interaction.reply(
                            createErrorMessage(
                                interaction,
                                `INTERACTION FAILED`,
                                error instanceof Error ? error.message : 'Unknown error'
                            )
                        );
                    }
                } else {
                    console.warn(`No handler found for prefix: ${prefix}`);
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
                // wordleGuessModalの処理
                if (interaction.customId.startsWith('wordle:guess:')) {
                    const { handleWordleGuessModal } = await import('../../modals/wordleGuessModal');
                    try {
                        await handleWordleGuessModal(interaction);
                    } catch (error) {
                        console.error(error);
                        await interaction.reply(
                            createErrorMessage(
                                interaction,
                                `WORDLE GUESS FAILED`,
                                error instanceof Error ? error.message : 'Unknown error'
                            )
                        );
                    }
                }
            }
        });
    }

    async handleMessage(message: Message) {
        // アクセスガード：BAN チェック
        // コマンド試行時のみ通知し、通常会話・ダイス記法はサイレントブロックする
        if (isBanned(message.author.id, message.guild?.id)) {
            if (message.content.startsWith(this.prefix)) {
                await message.reply(
                    createErrorMessage(
                        message,
                        'Server Error',
                        'サーバーエラーが発生しました。'
                    )
                );
            }
            return;
        }

        // 特別なメッセージパターンをチェック
        const processed = await MessageProcessor.processMessage(message);
        if (processed) {
            return;
        }

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