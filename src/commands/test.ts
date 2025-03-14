import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder,        
    SlashCommandStringOption,
} from 'discord.js';
import { Command } from '../interfaces/Command';
import puppeteer from 'puppeteer';
import { generateEmbed } from '../commons/embedGenerator';
import { createErrorMessage } from '../commons/messages';

interface CharacterData {
    name: {
        kana: string;
        kanji: string;
    };
    personal: {
        job: string;
        age: string;
        gender: string;
        height: string;
        weight: string;
        hairColor: string;
        eyeColor: string;
        skinColor: string;
    };
    stats: {
        str: string;
        con: string;
        pow: string;
        dex: string;
        app: string;
        siz: string;
        int: string;
        edu: string;
        san: string;
        hp: string;
        mp: string;
        db: string;
        idea: string;
        luck: string;
        know: string;
    };
    skills: Array<{
        name: string;
        value: string;
    }>;
    items: string[];
    skillNames: string[];
    skillValues: string[];
}

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('テスト')
        .addStringOption((option: SlashCommandStringOption) =>
            option.setName('url')
                .setDescription('iacharaのURL')
                .setRequired(true)
        )as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();
        
        const url = interaction.options.getString('url');
        console.log(url);

        if (!url || !url.startsWith('https://iachara.com/view/')) {
            await interaction.editReply(createErrorMessage(interaction, 'INVALID URL', 'URLはiacharaのキャラクターシートのものを指定してください'));
            return;
        }

        try {
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox']
            });
            const page = await browser.newPage();
            
            await page.goto(url, { waitUntil: 'networkidle0' });
            
            await page.waitForSelector('#__next', { timeout: 5000 });
            
            const characterData = await page.evaluate(() => {
                const texts: string[] = [];
                const divs = document.querySelectorAll('div');
                
                divs.forEach(div => {
                    if (!div.querySelector('div')) {
                        const text = div.textContent?.trim();
                        if (text && text.length > 0) {
                            texts.push(text);
                        }
                    }
                });

                const skillNames: string[] = [];
                const skillValues: string[] = [];
                const skillRows = document.querySelectorAll('div[class^="AbilityTable_tableLeftHeaderSkill"]');
                
                // まず技能名を収集
                skillRows.forEach(row => {
                    const skillBox = row.querySelector('.MuiBox-root');
                    if (skillBox) {
                        const skillDiv = skillBox.querySelector('div');
                        if (skillDiv) {
                            const text = skillDiv.textContent?.trim() || '';
                            if (!['初期', '職業', '興味', '成長', '他', '合計'].includes(text)) {
                                if (!skillDiv.querySelector('div')) {
                                    // 専門分野なしの技能
                                    skillNames.push(text);
                                } else {
                                    // 専門分野ありの技能
                                    const baseSkill = skillDiv.querySelector('div[style*="border-radius: 4px 0px 0px 4px"]')?.textContent?.trim() || '';
                                    const specialtyInput = skillDiv.querySelector('input[type="text"][disabled]') as HTMLInputElement;
                                    const specialty = specialtyInput?.value?.trim() || '';
                                    skillNames.push(specialty ? `${baseSkill}（${specialty}）` : baseSkill);
                                }
                            }
                        }
                    }
                });

                console.log("hoge");

                // 次に値を収集
                skillRows.forEach((row, index) => {
                    // 値を含むdivを探す
                    const valueCell = row.nextElementSibling;
                    
                    if (valueCell) {
                        // 数値入力を探す
                        const input = valueCell.querySelector('input[type="number"][disabled]') as HTMLInputElement | null;
                        
                        if (input && input.value) {
                            skillValues.push(input.value);
                        } else {
                            skillValues.push('0');
                        }
                    } else {
                        skillValues.push('0');
                    }
                });

                const data = {
                    name: {
                        kana: texts.find(t => t.match(/[ぁ-んァ-ン]/)) || '',
                        kanji: texts.find(t => t.match(/[一-龯]/)) || ''
                    },
                    personal: {
                        job: texts.find(t => t.startsWith('職業'))?.replace('職業', '') || '',
                        age: texts.find(t => t.startsWith('年齢'))?.replace('年齢', '') || '',
                        gender: texts.find(t => t.startsWith('性別'))?.replace('性別', '') || '',
                        height: texts.find(t => t.startsWith('身長'))?.replace('身長', '') || '',
                        weight: texts.find(t => t.startsWith('体重'))?.replace('体重', '') || '',
                        hairColor: texts.find(t => t.startsWith('髪の色'))?.replace('髪の色', '') || '',
                        eyeColor: texts.find(t => t.startsWith('瞳の色'))?.replace('瞳の色', '') || '',
                        skinColor: texts.find(t => t.startsWith('肌の色'))?.replace('肌の色', '') || ''
                    },
                    stats: {
                        str: texts[texts.indexOf('STR') + 1] || '',
                        con: texts[texts.indexOf('CON') + 1] || '',
                        pow: texts[texts.indexOf('POW') + 1] || '',
                        dex: texts[texts.indexOf('DEX') + 1] || '',
                        app: texts[texts.indexOf('APP') + 1] || '',
                        siz: texts[texts.indexOf('SIZ') + 1] || '',
                        int: texts[texts.indexOf('INT') + 1] || '',
                        edu: texts[texts.indexOf('EDU') + 1] || '',
                        san: texts.find(t => t.startsWith('SAN')) || '',
                        hp: texts.find(t => t.startsWith('HP')) || '',
                        mp: texts.find(t => t.startsWith('MP')) || '',
                        db: texts.find(t => t.startsWith('DB')) || '',
                        idea: texts.find(t => t.startsWith('アイデア')) || '',
                        luck: texts.find(t => t.startsWith('幸運')) || '',
                        know: texts.find(t => t.startsWith('知識')) || ''
                    },
                    skills: skillNames.map((name, i) => ({ name, value: skillValues[i] || '0' })),
                    items: texts.slice(texts.indexOf('所持品・所持金') + 1, texts.indexOf('メモ')),
                    skillNames,
                    skillValues
                };
                
                return data;
            });
            
            console.log('Character data:', characterData);

            const embed = generateEmbed(interaction)
                .setTitle(`${characterData.name.kanji}のキャラクターシート`)
                .setDescription(
                    `**基本情報**
名前: ${characterData.name.kanji} (${characterData.name.kana})
${Object.entries(characterData.personal).map(([key, value]) => `${key}: ${value}`).join('\n')}

**能力値**
${Object.entries(characterData.stats).map(([key, value]) => `${key.toUpperCase()}: ${value}`).join('\n')}

**技能名**
${characterData.skillNames.join('\n')}

**技能値**
${characterData.skillValues.join('\n')}

**所持品**
${characterData.items.join(', ')}`
                );

            await browser.close();
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error:', error);
            await interaction.editReply(
                createErrorMessage(
                    interaction,
                    'FETCH ERROR',
                    'キャラクターシートの取得に失敗しました'
                )
            );
        }
    }
};
