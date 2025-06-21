"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.choice = exports.diceRoll = void 0;
var ClassicDiceRollHandler_1 = require("../../infrastructure/commands/handlers/ClassicDiceRollHandler");
Object.defineProperty(exports, "diceRoll", { enumerable: true, get: function () { return ClassicDiceRollHandler_1.diceRoll; } });
var choiceFunction_1 = require("../../infrastructure/commands/legacy/choiceFunction");
Object.defineProperty(exports, "choice", { enumerable: true, get: function () { return choiceFunction_1.choice; } });
