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
const rerollInteraction_1 = require("../../interactions/rerollInteraction");
const confirmRerollInteraction_1 = require("../../interactions/confirmRerollInteraction");
const dice_1 = require("../../commons/dice");
const diceRoll_1 = require("../../commands/diceRoll");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class DiscordAdapter {
    constructor(client) {
        this.client = client;
        this.prefix = '/#';
        this.commands = new Map();
        this.init();
    }
    async init() {
        await this.loadCommands();
        this.setupInteractionHandler();
    }
    async loadCommands() {
        const commandsPath = path.join(process.cwd(), 'src/commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));
        for (const file of commandFiles) {
            const { command } = await Promise.resolve(`${path.join(process.cwd(), 'dist/commands', file.replace('.ts', '.js'))}`).then(s => __importStar(require(s)));
            this.commands.set(command.data.name, command);
        }
    }
    setupInteractionHandler() {
        this.client.on('interactionCreate', async (interaction) => {
            if (interaction.isChatInputCommand()) {
                const command = this.commands.get(interaction.commandName);
                if (!command) {
                    console.error(`${interaction.commandName}というコマンドが見つからないよ`);
                    return;
                }
                try {
                    await command.execute(interaction);
                }
                catch (error) {
                    console.error(error);
                    await interaction.reply({
                        content: 'コマンドの実行中にエラーが発生しちゃった...',
                        ephemeral: true
                    });
                }
            }
            else if (interaction.isStringSelectMenu()) {
                if (interaction.customId.startsWith('reroll:')) {
                    await (0, rerollInteraction_1.handleRerollInteraction)(interaction);
                }
            }
            else if (interaction.isButton()) {
                if (interaction.customId.startsWith('confirmReroll:')) {
                    await (0, confirmRerollInteraction_1.handleConfirmRerollInteraction)(interaction);
                }
            }
        });
    }
    async handleMessage(message, useCase) {
        await (0, diceRoll_1.diceRoll)(message);
        if (message.content === 'ccb') {
            const roll = (0, dice_1.rollDice)(3, 6);
            await message.reply(`ダイスを振りました: ${roll}`);
        }
        if (!message.content.startsWith(this.prefix))
            return;
        const commandBody = message.content.slice(this.prefix.length).trim();
        const args = commandBody.split(/\s+/);
        const command = args.shift()?.toLowerCase();
        if (command === 'setup') {
            const guildId = message.guild?.id;
            if (!guildId)
                return;
            await useCase.executeSetup(message, guildId);
        }
    }
}
exports.DiscordAdapter = DiscordAdapter;
