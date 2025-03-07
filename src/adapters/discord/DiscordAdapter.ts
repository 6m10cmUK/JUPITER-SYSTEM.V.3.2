import { Client, Message } from 'discord.js';
import { Command } from '../../interfaces/Command';
import { InteractionHandler } from '../../interfaces/InteractionHandler';
import { diceRoll } from '../../commands/classicCommands/diceRoll';
import { createErrorMessage } from '../../commons/messages';
import { JUPITER_SYSTEM_VERSION } from '../../config/discord_config';
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
                const command = this.commands.get(interaction.commandName);

                if (!command) {
                    console.error(`${interaction.commandName}というコマンドが見つからないよ`);
                    return;
                }

                try {
                    await command.execute(interaction);
                } catch (error) {
                    console.error(error);
                    await interaction.reply(
                        createErrorMessage(
                            `[JUPITER-SYSTEM ${JUPITER_SYSTEM_VERSION}] COMMAND EXECUTE FAILED`,
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
                                `[JUPITER-SYSTEM ${JUPITER_SYSTEM_VERSION}] INTERACTION FAILED`,
                                error instanceof Error ? error.message : 'Unknown error'
                            )
                        );
                    }
                }
            }
        });
    }

    async handleMessage(message: Message) {
        await diceRoll(message);

        if (!message.content.startsWith(this.prefix)) return;

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
                        `[JUPITER-SYSTEM ${JUPITER_SYSTEM_VERSION}] PERMISSION DENIED`,
                        'This command can only be used by administrators'
                    )
                );
                return;
            }
            await adminCommand(message, guildId);
        }
    }
} 