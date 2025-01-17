"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diceRoll = diceRoll;
const discord_js_1 = require("discord.js");
const dice_1 = require("../../commons/dice");
async function diceRoll(message) {
    if (message.content.includes('\n')) {
        return;
    }
    let contents = message.content.split(/[\s\u3000]/);
    const fullWidthChars = /[Ａ-Ｚａ-ｚ０-９＋－＊／＜＝（）]/g;
    let target = contents[0].replace(fullWidthChars, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).toLowerCase();
    let repeat = 1;
    const match = target.toLowerCase().match(/x(\d+)/i);
    if (match) {
        target = contents[1].replace(fullWidthChars, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).toLowerCase();
        repeat = parseInt(match[1]);
    }
    let resultTexts = [];
    let color = 0x888888;
    for (let i = 0; i < repeat; i++) {
        const result = await roll(target, message);
        if (result == null) {
            return;
        }
        color = result[1];
        let text = `${result[0]}`;
        if (repeat > 1) {
            text = `#${i + 1} ${text}`;
        }
        resultTexts.push(text);
    }
    const embed = new discord_js_1.EmbedBuilder()
        .setAuthor({ name: message.author.displayName, iconURL: message.author.displayAvatarURL() })
        .addFields({ name: message.content, value: resultTexts.join('\n') })
        .setColor(color);
    await message.reply({ embeds: [embed] });
    async function roll(target, message) {
        if (target.toLowerCase().startsWith('ccb') || target.toLowerCase().startsWith('1d100<=')) {
            return await ccb(target);
        }
        if (target.toLowerCase().startsWith('choice(')) {
            const result = await choice(message.content.replace(fullWidthChars, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).toLowerCase());
            return result;
        }
        if (target.toLowerCase().startsWith('res(')) {
            const result = await res(target);
            return result;
        }
        const diceRegex = /(\d+)[d](\d+)/g;
        const invalidDiceRegex = /\d+d\d+d\d+/;
        if (invalidDiceRegex.test(target.toLowerCase())) {
            return null;
        }
        if (!target.toLowerCase().match(diceRegex)) {
            return null;
        }
        let expression = target;
        let match;
        let totalResult = 0;
        let detailedExpression = target;
        // ダイスロールを先に処理
        while ((match = diceRegex.exec(expression)) !== null) {
            const count = parseInt(match[1]);
            const faces = parseInt(match[2]);
            const results = (0, dice_1.rollDice)(count, faces);
            const diceTotal = results.reduce((sum, val) => sum + val, 0);
            // ダイス部分を計算結果で置換
            expression = expression.substring(0, match.index) +
                diceTotal +
                expression.substring(match.index + match[0].length);
            // 詳細な式を更新
            let resultString;
            if (count > 1) {
                resultString = `${diceTotal}(${results.join(',')})`;
            }
            else {
                resultString = `${diceTotal}`;
            }
            detailedExpression = detailedExpression.replace(match[0], resultString);
            // 正規表現のインデックスをリセット
            diceRegex.lastIndex = 0;
        }
        // 四則演算の評価
        try {
            totalResult = eval(expression);
            if (isNaN(totalResult)) {
                return null;
            }
        }
        catch (error) {
            return null;
        }
        return [` ＞ ${detailedExpression} ＞ **${totalResult}**`, 0x888888];
    }
}
async function ccb(target) {
    const dice = target.split('<=');
    const result = (0, dice_1.rollDice)(1, 100);
    const total = result.reduce((sum, val) => sum + val, 0);
    let resultText = `＞ **${total}** `;
    let color = 0x888888;
    if (dice[1] != undefined) {
        dice[1];
        if (total <= parseInt(dice[1])) {
            color = 0x0000FF;
            resultText += `**<= ${dice[1]}** ＞ **成功** `;
            if (total <= Math.ceil(parseInt(dice[1]) / 5)) {
                resultText += `**/ スペシャル** `;
            }
            if (total <= 5) {
                resultText += `**/ 決定的成功** `;
            }
        }
        else {
            color = 0xFF0000;
            resultText += `**<=${dice[1]}** ＞ **失敗** `;
            if (total >= 96) {
                resultText += `**/ 致命的失敗** `;
            }
        }
    }
    return [resultText, color];
}
async function choice(content) {
    console.log(content);
    const choices = content.split('(')[1].split(')')[0].split(/[\s,]+/);
    const result = (0, dice_1.rollDice)(1, choices.length);
    const total = result.reduce((sum, val) => sum + val, 0);
    return [`＞ **${choices[total - 1]}**`, 0x888888];
}
async function res(target) {
    const [left, right] = target.split('(')[1].split(')')[0].split('-');
    if (left == undefined || right == undefined) {
        return null;
    }
    const result = await ccb(`ccb<=${(parseInt(left) - parseInt(right)) * 5 + 50}`);
    return result;
}
