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
const discord_js_1 = require("discord.js");
const rerollInteraction_1 = require("../../interactions/rerollInteraction");
const confirmRerollInteraction_1 = require("../../interactions/confirmRerollInteraction");
const changeInteraction_1 = require("../../interactions/changeInteraction");
const changeSelectorInteraction_1 = require("../../interactions/changeSelectorInteraction");
const changeConfirmInteraction_1 = require("../../interactions/changeConfirmInteraction");
const jobInteraction_1 = require("../../interactions/jobInteraction");
const diceRoll_1 = require("../../commands/classicCommands/diceRoll");
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
            try {
                const filePath = path.join(process.cwd(), 'dist/commands', file.replace('.ts', '.js'));
                const { command } = await Promise.resolve(`${filePath}`).then(s => __importStar(require(s)));
                if (command?.data?.name) {
                    this.commands.set(command.data.name, command);
                }
                else {
                    console.warn(`${file}のコマンド定義が不正だよ`);
                }
            }
            catch (error) {
                console.error(`${file}の読み込み中にエラーが発生したよ:`, error);
            }
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
                        embeds: [
                            new discord_js_1.EmbedBuilder()
                                .setTitle('COMMAND EXECUTE FAILED')
                                .setDescription(error instanceof Error ? error.message : 'Unknown error')
                                .setColor(0xff0000)
                        ],
                        ephemeral: true
                    });
                }
            }
            else if (interaction.isStringSelectMenu()) {
                if (interaction.customId.startsWith('reroll:')) {
                    await (0, rerollInteraction_1.handleRerollInteraction)(interaction);
                }
                if (interaction.customId.startsWith('change:')) {
                    await (0, changeInteraction_1.handleChangeInteraction)(interaction);
                }
                if (interaction.customId.startsWith('change_selector:')) {
                    await (0, changeSelectorInteraction_1.handleChangeSelectorInteraction)(interaction);
                }
            }
            else if (interaction.isButton()) {
                if (interaction.customId.startsWith('confirmReroll:')) {
                    await (0, confirmRerollInteraction_1.handleConfirmRerollInteraction)(interaction);
                }
                if (interaction.customId.startsWith('job_')) {
                    await (0, jobInteraction_1.handleJobInteraction)(interaction);
                }
                if (interaction.customId.startsWith('change_confirm:')) {
                    await (0, changeConfirmInteraction_1.handleChangeConfirmInteraction)(interaction);
                }
            }
        });
    }
    async handleMessage(message, useCase) {
        await (0, diceRoll_1.diceRoll)(message);
        if (!message.content.startsWith(this.prefix))
            return;
        const commandBody = message.content.slice(this.prefix.length).trim();
        const args = commandBody.split(/\s+/);
        const command = args.shift()?.toLowerCase();
        const guildId = message.guild?.id;
        if (!guildId)
            return;
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
exports.DiscordAdapter = DiscordAdapter;
