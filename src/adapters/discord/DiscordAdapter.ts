import { Client, Message } from 'discord.js';
import type { AutocompleteInteraction } from 'discord.js';
import { Command } from '../../shared/interfaces/Command';
import { InteractionHandler } from '../../shared/interfaces/InteractionHandler';
import { diceRoll } from '../../infrastructure/services/dice/classicDiceRoll';
import { createErrorMessage } from '../../presentation/discord/builders/messages';
import { WebSocketServer } from '../../infrastructure/websocket/WebSocketServer';
import { MessageProcessor } from '../../infrastructure/services/MessageProcessor';
import { banService } from '../../infrastructure/services/BanService';
import { logBanBlock, logError, logMessageCommand, logSystem, logUsage } from '../../shared/utils/UsageLogger';

import * as fs from 'fs';
import * as path from 'path';

type AutocompleteCommand = Command & {
    autocomplete: (interaction: AutocompleteInteraction) => Promise<void>;
};

function hasAutocomplete(command: Command): command is AutocompleteCommand {
    return 'autocomplete' in command && typeof command.autocomplete === 'function';
}

export class DiscordAdapter {
    /** bot運営者(OWNER_ID)のみが実行できるメッセージコマンド */
    private static readonly OWNER_ONLY_COMMANDS = new Set(['ban', 'unban', 'bans']);
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
            // BANチェック: 対象ユーザー/サーバーは全機能を無言でブロック（運営者は除外）
            if (
                interaction.user.id !== process.env.OWNER_ID &&
                banService.isBlocked(interaction.user.id, interaction.guildId)
            ) {
                logBanBlock(interaction);
                return;
            }

            if (interaction.isAutocomplete()) {
                const command = this.commands.get(interaction.commandName);
                if (command && hasAutocomplete(command)) {
                    try {
                        await command.autocomplete(interaction);
                    } catch (error) {
                        console.error(`Autocomplete error for ${interaction.commandName}:`, error);
                    }
                }
            } else if (interaction.isChatInputCommand()) {
                logUsage(interaction);
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
                    logError(interaction, error, `/${interaction.commandName}`);
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
                
                logUsage(interaction);

                const handler = this.interactionHandlers.get(prefix);

                if (handler) {
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
                logUsage(interaction);

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
                } else if (interaction.customId.startsWith('customSetModal:')) {
                    // customSetModalの処理
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
                } else if (interaction.customId.startsWith('wordle:guess:')) {
                    // wordleGuessModalの処理
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
                } else {
                    console.warn(`Unknown modal customId: ${interaction.customId}`);
                    logSystem('discord-adapter', `未知のmodal customId: ${interaction.customId}`);
                }
            }
        });
    }

    async handleMessage(message: Message) {
        // BANチェック: 対象ユーザー/サーバーは全機能を無言でブロック（運営者は除外）
        if (
            message.author.id !== process.env.OWNER_ID &&
            banService.isBlocked(message.author.id, message.guild?.id)
        ) {
            logBanBlock(message);
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
            const commandDetail = args.length > 0 ? args.join(' ') : undefined;
            const executeAdminCommand = async () => {
                try {
                    logMessageCommand(message, command, commandDetail);
                    await adminCommand(message, guildId);
                } catch (error) {
                    logError(message, error, `#${command}`);
                    await message.reply(
                        createErrorMessage(
                            message,
                            `COMMAND FAILED`,
                            'コマンドの実行中にエラーが発生しました'
                        )
                    );
                }
            };

            // BAN管理コマンドはbot運営者のみ。権限が無ければ無言で無視
            if (DiscordAdapter.OWNER_ONLY_COMMANDS.has(command)) {
                if (message.author.id !== process.env.OWNER_ID) {
                    return;
                }
                await executeAdminCommand();
                return;
            }
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
            await executeAdminCommand();
        }
    }
}
