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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute = execute;
const discord_js_1 = require("discord.js");
const config_json_1 = __importDefault(require("../config.json"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function execute(message, guildId) {
    const commands = [];
    const commandsPath = path.join(process.cwd(), 'src/commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));
    const filteredCommandFiles = commandFiles.filter(file => !file.startsWith('classicCommands/'));
    for (const file of filteredCommandFiles) {
        const { command } = await Promise.resolve(`${path.join(process.cwd(), 'dist/commands', file.replace('.ts', '.js'))}`).then(s => __importStar(require(s)));
        commands.push(command.data.toJSON());
    }
    let commandNames = message.content.split(' ')[1] === 'all' ? commands.map(command => command.name) : message.content.split(' ').slice(1);
    if (commandNames.length === 0) {
        return;
    }
    if (message.content.split(' ')[1] === 'standard') {
        commandNames = [
            "choice",
            "feature",
            "job",
            "roll",
            "status"
        ];
    }
    const commandsToRegister = commands.filter(command => commandNames.includes(command.name));
    const rest = new discord_js_1.REST().setToken(config_json_1.default.token);
    try {
        await rest.put(discord_js_1.Routes.applicationGuildCommands(config_json_1.default.applicationId, guildId), { body: commandsToRegister });
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle('SUCCESS')
            .setAuthor({
            name: message.author.displayName,
            iconURL: message.author.displayAvatarURL()
        })
            .setFields({
            name: '[JUPITER-SYSTEM v3.2.0] SETUP COMPLETE',
            value: commandNames.join(' '),
        })
            .setColor(0x0099ff);
        await message.reply({ embeds: [embed] });
    }
    catch (error) {
        console.error('エラー:', error);
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle('ERROR')
            .setAuthor({
            name: message.author.displayName,
            iconURL: message.author.displayAvatarURL()
        })
            .setFields({
            name: '[JUPITER-SYSTEM v3.2.0] SETUP FAILED',
            value: error instanceof Error ? error.message : String(error),
        })
            .setColor(0xff0000);
        await message.reply({ embeds: [embed] });
    }
}
