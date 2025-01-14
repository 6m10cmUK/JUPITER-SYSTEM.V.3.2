"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageUseCase = void 0;
const setup_js_1 = require("../adminCommands/setup.js");
class MessageUseCase {
    async executeSetup(message, guildId) {
        await (0, setup_js_1.execute)(message, guildId);
    }
}
exports.MessageUseCase = MessageUseCase;
