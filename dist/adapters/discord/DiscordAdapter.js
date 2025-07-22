"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordAdapter = void 0;
const classicDiceRoll_1 = require("../../infrastructure/commands/legacy/classicDiceRoll");
const messages_1 = require("../../presentation/discord/builders/messages");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class DiscordAdapter {
    constructor(client, wsServer) {
        this.client = client;
        this.wsServer = wsServer;
        this.prefix = '/#';
        this.commands = new Map();
        this.adminCommands = new Map();
        this.interactionHandlers = new Map();
        this.init();
    }
    async init() {
        await this.loadCommands();
        await this.loadAdminCommands();
        await this.loadInteractionHandlers();
        this.setupInteractionHandler();
    }
    async loadInteractionHandlers() {
        const interactionsPath = path.join(process.cwd(), 'dist/interactions');
        const files = fs.readdirSync(interactionsPath).filter(file => file.endsWith('.js'));
        for (const file of files) {
            try {
                const filePath = path.join(interactionsPath, file);
                const handler = await Promise.resolve(`${filePath}`).then(s => __importStar(require(s)));
                if (handler.prefix && handler.execute) {
                    this.interactionHandlers.set(handler.prefix, handler);
                }
                else {
                    console.warn(`Invalid interaction handler definition in ${file}`);
                }
            }
            catch (error) {
                console.error(`Error loading ${file}:`, error);
            }
        }
    }
    async loadCommands() {
        const commandsPath = path.join(process.cwd(), 'src/infrastructure/commands');
        const entries = fs.readdirSync(commandsPath, { withFileTypes: true });
        const commandFiles = entries
            .filter(entry => entry.isFile() && entry.name.endsWith('-command.ts'))
            .map(entry => entry.name);
        for (const file of commandFiles) {
            try {
                const filePath = path.join(process.cwd(), 'dist/infrastructure/commands', file.replace('.ts', '.js'));
                const module = await Promise.resolve(`${filePath}`).then(s => __importStar(require(s)));
                if (module.command?.data?.name) {
                    // notify-commandの特別処理
                    if (file === 'notify-command.ts' && module.createNotifyCommand && this.wsServer) {
                        const command = module.createNotifyCommand(this.wsServer);
                        this.commands.set(command.data.name, command);
                        console.log(`Command loaded: ${command.data.name} (with WebSocket)`);
                    }
                    else {
                        this.commands.set(module.command.data.name, module.command);
                        console.log(`Command loaded: ${module.command.data.name}`);
                    }
                }
                else {
                    console.warn(`Invalid command definition in ${file}`);
                }
            }
            catch (error) {
                console.error(`Error loading ${file}:`, error);
            }
        }
    }
    async loadAdminCommands() {
        const adminCommandsPath = path.join(process.cwd(), 'dist/adminCommands');
        const commandFiles = fs.readdirSync(adminCommandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            try {
                const filePath = path.join(adminCommandsPath, file);
                const { execute } = await Promise.resolve(`${filePath}`).then(s => __importStar(require(s)));
                const commandName = file.replace('.js', '');
                this.adminCommands.set(commandName, execute);
            }
            catch (error) {
                console.error(`Error loading ${file}:`, error);
            }
        }
    }
    setupInteractionHandler() {
        this.client.on('interactionCreate', async (interaction) => {
            if (interaction.isChatInputCommand()) {
                console.log(`${interaction.guild?.id} ${interaction.user.globalName} ${interaction.commandName}`);
                const command = this.commands.get(interaction.commandName);
                if (!command) {
                    console.error(`${interaction.commandName} is not found`);
                    await interaction.reply((0, messages_1.createErrorMessage)(interaction, `COMMAND EXECUTE FAILED`, 'Command is not found'));
                    return;
                }
                try {
                    await command.execute(interaction);
                }
                catch (error) {
                    console.error(error);
                    await interaction.reply((0, messages_1.createErrorMessage)(interaction, `COMMAND EXECUTE FAILED`, error instanceof Error ? error.message : 'Unknown error'));
                }
            }
            else if (interaction.isStringSelectMenu() || interaction.isButton()) {
                const [prefix] = interaction.customId.split(':');
                console.log(`Processing interaction with customId: ${interaction.customId}, prefix: ${prefix}`);
                const handler = this.interactionHandlers.get(prefix);
                if (handler) {
                    console.log(`Found handler for prefix: ${prefix}`);
                    try {
                        await handler.execute(interaction);
                    }
                    catch (error) {
                        console.error(`Error executing handler for ${prefix}:`, error);
                        await interaction.reply((0, messages_1.createErrorMessage)(interaction, `INTERACTION FAILED`, error instanceof Error ? error.message : 'Unknown error'));
                    }
                }
                else {
                    console.warn(`No handler found for prefix: ${prefix}`);
                }
            }
            else if (interaction.isModalSubmit()) {
                // changeNameModalの処理
                if (interaction.customId.startsWith('nameChangeModal:')) {
                    const { handleNameChangeModal } = await Promise.resolve().then(() => __importStar(require('../../interactions/changeNameInteraction')));
                    try {
                        await handleNameChangeModal(interaction);
                    }
                    catch (error) {
                        console.error(error);
                        await interaction.reply((0, messages_1.createErrorMessage)(interaction, `MODAL SUBMIT FAILED`, error instanceof Error ? error.message : 'Unknown error'));
                    }
                }
                // customSetModalの処理
                if (interaction.customId.startsWith('customSetModal:')) {
                    const { handleCustomSetModal } = await Promise.resolve().then(() => __importStar(require('../../interactions/customSetInteraction')));
                    try {
                        await handleCustomSetModal(interaction);
                    }
                    catch (error) {
                        console.error(error);
                        await interaction.reply((0, messages_1.createErrorMessage)(interaction, `MODAL SUBMIT FAILED`, error instanceof Error ? error.message : 'Unknown error'));
                    }
                }
                // wordleGuessModalの処理
                if (interaction.customId.startsWith('wordle:guess:')) {
                    const { handleWordleGuessModal } = await Promise.resolve().then(() => __importStar(require('../../modals/wordleGuessModal')));
                    try {
                        await handleWordleGuessModal(interaction);
                    }
                    catch (error) {
                        console.error(error);
                        await interaction.reply((0, messages_1.createErrorMessage)(interaction, `WORDLE GUESS FAILED`, error instanceof Error ? error.message : 'Unknown error'));
                    }
                }
            }
        });
    }
    async handleMessage(message) {
        if (!message.content.startsWith(this.prefix)) {
            await (0, classicDiceRoll_1.diceRoll)(message);
            return;
        }
        const commandBody = message.content.slice(this.prefix.length).trim();
        const args = commandBody.split(/\s+/);
        const command = args.shift()?.toLowerCase();
        const guildId = message.guild?.id;
        if (!guildId || !command)
            return;
        const adminCommand = this.adminCommands.get(command);
        if (adminCommand) {
            // 管理者権限を持っているか確認
            if (!message.member?.permissions.has('Administrator') && message.guild?.ownerId !== message.author.id) {
                await message.reply((0, messages_1.createErrorMessage)(message, `PERMISSION DENIED`, 'This command can only be used by administrators'));
                return;
            }
            await adminCommand(message, guildId);
        }
    }
}
exports.DiscordAdapter = DiscordAdapter;
