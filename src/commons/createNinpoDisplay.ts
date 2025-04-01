import { Interaction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { generateEmbed } from './embedGenerator';

interface NinpoData {
    name: string;
    kana: string;
    category: string;
    type: string;
    range: string;
    cost: string;
    specialty: string;
    description: string;
    correction: string;
}

export const ryuhaMap: { label: string, value: string }[] = [
    {
        label: '汎用忍法',
        value: 'hanyo'
    },
    {
        label: '斜歯忍軍',
        value: 'hasuba'
    },
    {
        label: '鞍馬神流',
        value: 'kurama'
    },
    {
        label: 'ハグレモノ',
        value: 'hagure'
    },
    {
        label: '比良坂機関',
        value: 'hirasaka'
    },
    {
        label: '隠忍の血統',
        value: 'oni'
    },
    {
        label: '古流流派',
        value: 'koryu'
    }
];

export const ninpoTypeMap: { label: string, value: string }[] = [
    {
        label: '攻撃',
        value: 'at'
    },
    {
        label: 'サポート',
        value: 'su'
    },
    {
        label: '装備',
        value: 'eq'
    }
];

const ITEMS_PER_PAGE = 9;

export async function createNinpoDisplay(interaction: Interaction, ryuha: string, type: string | null, page: number) {

    if(type === 'null') {
        type = null;
    }

    console.log(ryuha, type);

    const dataPath = path.join(process.cwd(), 'src', 'data', 'shinobigami', 'ninpo', `${ryuha}.json`);
    const ninpoData = await JSON.parse(fs.readFileSync(dataPath, 'utf8')) as NinpoData[];

    let filteredData = ninpoData;
    if (type) {
        filteredData = filteredData.filter((ninpo: NinpoData) => 
            ninpoTypeMap.find(t => t.value === type)?.label === ninpo.type
        );
    }

    const categorizedData: { category: string, data: NinpoData[] }[] = [];
    const categorizedpaginatedData: { [key: number]: { category: string, data: NinpoData[] } } = {};

    filteredData.forEach((ninpo: NinpoData) => {
        categorizedData.push({ category: ninpo.category, data: [] });
        categorizedData.find(c => c.category === ninpo.category)?.data.push(ninpo);
    });

    let index = 1;
    categorizedData.forEach((categorizedData: { category: string, data: NinpoData[] }) => {
        // 9つずつに分ける
        for (let i = 0; i < categorizedData.data.length; i += 9) {
            const data = categorizedData.data.slice(i, i + 9);
            categorizedpaginatedData[index] = {
                category: categorizedData.category,
                data: data
            };
            index++;
        }
    });

    if (page > index-1) {
        page = index-1;
    }
    console.log(categorizedpaginatedData[page].category, categorizedpaginatedData[page].data);

    let ryuhaString = ryuhaMap.find(r => r.value === ryuha)?.label;
    if (type) {
        ryuhaString = `${ryuhaString} (${ninpoTypeMap.find(t => t.value === type)?.label})`;
    }

    const title = `${ryuhaString}: 忍法一覧`;
    const fields = categorizedpaginatedData[page].data.map((n: NinpoData) => {
        let text = `【${n.type}】`;
        if (n.range !== '' && n.cost !== '') {
            text += `間合${n.range} / コスト${n.cost}`;
        }else if (n.range !== '' && n.cost === '') {
            text += `間合${n.range}`;
        }else if (n.range === '' && n.cost !== '') {
            text += `コスト${n.cost}`;
        }
        text += `\n${n.description}\n(${n.correction})`;
        return {
            name: `${n.name} ${n.kana}`,
            value: text,
            inline: true
        };
    })
    if (fields.length % 3 !== 0) {
        for (let i = 0; i < 3 - fields.length % 3; i++) {
            fields.push({
                name: '\u200b',
                value: '\u200b',
                inline: true
            });
        }
    }
    const embed = generateEmbed(interaction)
        .setTitle(title)
        .setDescription(`### ${categorizedpaginatedData[page].category}\n${page}/${index-1}`)
        .setFields(fields)
        .setColor(0x888888)
        .setFooter({ text: `${ryuhaString}-${categorizedpaginatedData[page].category}: ${page}/${index-1}` });

        const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`ninpo:first:${ryuha}:${type}:1`)
                .setLabel('<<')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 1),
            new ButtonBuilder()
                .setCustomId(`ninpo:prev:${ryuha}:${type}:${page}`)
                .setLabel('<')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 1),
            new ButtonBuilder()
                .setCustomId(`ninpo:next:${ryuha}:${type}:${page}`)
                .setLabel('>')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === index-1),
            new ButtonBuilder()
                .setCustomId(`ninpo:last:${ryuha}:${type}:${index-1}`)
                .setLabel('>>')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === index-1)
        );

    return { embeds: [embed], components: [row] };
} 