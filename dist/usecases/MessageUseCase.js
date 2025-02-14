"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageUseCase = void 0;
const setup_js_1 = require("../adminCommands/setup.js");
const update_js_1 = require("../adminCommands/update.js");
const add_js_1 = require("../adminCommands/add.js");
class MessageUseCase {
    async executeSetup(message, guildId) {
        await (0, setup_js_1.execute)(message, guildId);
    }
    async executeUpdate(message, guildId) {
        await (0, update_js_1.execute)(message, guildId);
    }
    async executeAdd(message, guildId) {
        await (0, add_js_1.execute)(message, guildId);
    }
}
exports.MessageUseCase = MessageUseCase;
