"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDerivedStats = calculateDerivedStats;
function calculateDerivedStats(stats) {
    const hp = stats.con && stats.siz ? Math.ceil((stats.con + stats.siz) / 2) : 0;
    const mp = stats.pow ?? 0;
    const san = stats.pow ? stats.pow * 5 : 0;
    const idea = stats.int ? stats.int * 5 : 0;
    const knowledge = stats.edu ? stats.edu * 5 : 0;
    const db = (() => {
        const str = stats.str ?? 0;
        const siz = stats.siz ?? 0;
        const sum = str + siz;
        if (sum <= 32)
            return "-1D6";
        if (sum <= 40)
            return "-1D4";
        if (sum <= 56)
            return "なし";
        if (sum <= 72)
            return "+1D4";
        if (sum <= 88)
            return "+1D6";
        return "+2D6";
    })();
    return { hp, mp, san, idea, knowledge, db };
}
