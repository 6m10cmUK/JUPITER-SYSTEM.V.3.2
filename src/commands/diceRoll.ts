import { Message, EmbedBuilder } from 'discord.js';
import { rollDice } from '../commons/dice';

export async function diceRoll(message: Message) {

    if (message.content.includes('\n')) {
        return;
    }

    let target = message.content.split(' ')[0];

    const toHalfWidth = (str: string) => {
        return str.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    };

    target = toHalfWidth(target);

    if (target === "ccb"){
        target = "1d100";
    }

    const dicePattern = /(\d+)[dDｄＤ](\d+)/g; // ダイスパターンを抽出
    const operationsPattern = /([+\-*/]|\b\d+\b)/g; // 四則演算と数値を抽出

    let calculation = target.replace(dicePattern, (count, faces) => {
        const roll = rollDice(Number(count), Number(faces));
        const rollResult = roll.reduce((a, b) => a + b, 0);
        return `(${rollResult})`;
    });

    console.log(calculation);

    // 四則演算の計算
    const tokens = calculation.match(operationsPattern);
    if (tokens) {
        let totalResult = parseFloat(tokens[0]);
        let currentOperator = null;

        for (let i = 1; i < tokens.length; i++) {
            const token = tokens[i];
            if (['+', '-', '*', '/'].includes(token)) {
                currentOperator = token;
            } else {
                const number = parseFloat(token);
                switch (currentOperator) {
                    case '+':
                        totalResult += number;
                        break;
                    case '-':
                        totalResult -= number;
                        break;
                    case '*':
                        totalResult *= number;
                        break;
                    case '/':
                        totalResult = Math.floor(totalResult / number); // 整数除算
                        break;
                }
            }
        }

        let reply = `> ${target} ＞ ${calculation} ＞ ${totalResult}`;
        
        const embed = new EmbedBuilder()
            .setAuthor({ name: message.author.displayName, iconURL: message.author.displayAvatarURL() })
            .setDescription(`${message.content} \n＞ ${calculation} ＞ **${totalResult}**`)
            .setColor(0x888888);
        
        await message.reply({ embeds: [embed] });
    }
}