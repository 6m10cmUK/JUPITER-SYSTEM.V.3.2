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
exports.command = void 0;
const discord_js_1 = require("discord.js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
exports.command = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('job')
        .setDescription('職業検索')
        .addSubcommand((subcommand) => subcommand.setName('name')
        .setDescription('職業名で検索')
        .addStringOption((option) => option.setName('query')
        .setDescription('検索したい職業名')
        .setRequired(true)))
        .addSubcommand((subcommand) => subcommand.setName('skill')
        .setDescription('職業技能で検索')
        .addStringOption((option) => option.setName('query')
        .setDescription('検索したい技能名')
        .setRequired(true)))
        .addSubcommand((subcommand) => subcommand.setName('point')
        .setDescription('職業ポイントで検索')
        .addStringOption((option) => option.setName('query')
        .setDescription('検索したい職業ポイント名')
        .setRequired(true)))
        .addSubcommand((subcommand) => subcommand.setName('all')
        .setDescription('職業一覧')),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        await interaction.deferReply();
        if (subcommand == 'all') {
            return;
        }
        const query = interaction.options.getString('query', true);
        try {
            const dataPath = path.join(process.cwd(), 'src', 'data', 'jobs.json');
            const jobData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            const response = jobData.filter((job) => job[subcommand].includes(query));
            console.log(response);
        }
        catch (error) {
            console.error('検索中にエラーが発生したよ:', error);
        }
    }
};
