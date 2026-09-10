/**
 * Calendário Comercial Oficial 2026
 * Izair Borba & Cia Ltda
 * 
 * Regra: Padrão 4-4-5 trimestral
 * Meses com 5 semanas: Março, Junho, Setembro
 * Meses com 4 semanas: Janeiro, Fevereiro, Abril, Maio, Julho, Agosto, Outubro, Novembro, Dezembro
 */

const MONTH_KEYS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const COMMERCIAL_CALENDAR_2026 = [
    {
        month: 1,
        key: 'jan',
        name: 'Janeiro',
        periodText: '05/01 - 30/01',
        start: new Date(2026, 0, 5),
        end: new Date(2026, 0, 30, 23, 59, 59),
        weeks: [
            { week: 1, label: 'SEMANA 1', start: new Date(2026, 0, 5), end: new Date(2026, 0, 9), range: '05/01 - 09/01' },
            { week: 2, label: 'SEMANA 2', start: new Date(2026, 0, 12), end: new Date(2026, 0, 16), range: '12/01 - 16/01' },
            { week: 3, label: 'SEMANA 3', start: new Date(2026, 0, 19), end: new Date(2026, 0, 23), range: '19/01 - 23/01' },
            { week: 4, label: 'SEMANA 4', start: new Date(2026, 0, 26), end: new Date(2026, 0, 30), range: '26/01 - 30/01' }
        ]
    },
    {
        month: 2,
        key: 'fev',
        name: 'Fevereiro',
        periodText: '02/02 - 27/02',
        start: new Date(2026, 1, 2),
        end: new Date(2026, 1, 27, 23, 59, 59),
        weeks: [
            { week: 1, label: 'SEMANA 1', start: new Date(2026, 1, 2), end: new Date(2026, 1, 6), range: '02/02 - 06/02' },
            { week: 2, label: 'SEMANA 2', start: new Date(2026, 1, 9), end: new Date(2026, 1, 13), range: '09/02 - 13/02' },
            { week: 3, label: 'SEMANA 3', start: new Date(2026, 1, 16), end: new Date(2026, 1, 20), range: '16/02 - 20/02' },
            { week: 4, label: 'SEMANA 4', start: new Date(2026, 1, 23), end: new Date(2026, 1, 27), range: '23/02 - 27/02' }
        ]
    },
    {
        month: 3,
        key: 'mar',
        name: 'Março',
        periodText: '02/03 - 02/04',
        start: new Date(2026, 2, 2),
        end: new Date(2026, 3, 2, 23, 59, 59), // 02/04 (Quinta antes de Sexta-Feira Santa)
        weeks: [
            { week: 1, label: 'SEMANA 1', start: new Date(2026, 2, 2), end: new Date(2026, 2, 6), range: '02/03 - 06/03' },
            { week: 2, label: 'SEMANA 2', start: new Date(2026, 2, 9), end: new Date(2026, 2, 13), range: '09/03 - 13/03' },
            { week: 3, label: 'SEMANA 3', start: new Date(2026, 2, 16), end: new Date(2026, 2, 20), range: '16/03 - 20/03' },
            { week: 4, label: 'SEMANA 4', start: new Date(2026, 2, 23), end: new Date(2026, 2, 27), range: '23/03 - 27/03' },
            { week: 5, label: 'SEMANA 5', start: new Date(2026, 2, 30), end: new Date(2026, 3, 2), range: '30/03 - 02/04' }
        ]
    },
    {
        month: 4,
        key: 'abr',
        name: 'Abril',
        periodText: '06/04 - 30/04',
        start: new Date(2026, 3, 6),
        end: new Date(2026, 3, 30, 23, 59, 59),
        weeks: [
            { week: 1, label: 'SEMANA 1', start: new Date(2026, 3, 6), end: new Date(2026, 3, 10), range: '06/04 - 10/04' },
            { week: 2, label: 'SEMANA 2', start: new Date(2026, 3, 13), end: new Date(2026, 3, 17), range: '13/04 - 17/04' },
            { week: 3, label: 'SEMANA 3', start: new Date(2026, 3, 20), end: new Date(2026, 3, 24), range: '20/04 - 24/04' },
            { week: 4, label: 'SEMANA 4', start: new Date(2026, 3, 27), end: new Date(2026, 3, 30), range: '27/04 - 30/04' }
        ]
    },
    {
        month: 5,
        key: 'mai',
        name: 'Maio',
        periodText: '04/05 - 29/05',
        start: new Date(2026, 4, 4),
        end: new Date(2026, 4, 29, 23, 59, 59),
        weeks: [
            { week: 1, label: 'SEMANA 1', start: new Date(2026, 4, 4), end: new Date(2026, 4, 8), range: '04/05 - 08/05' },
            { week: 2, label: 'SEMANA 2', start: new Date(2026, 4, 11), end: new Date(2026, 4, 15), range: '11/05 - 15/05' },
            { week: 3, label: 'SEMANA 3', start: new Date(2026, 4, 18), end: new Date(2026, 4, 22), range: '18/05 - 22/05' },
            { week: 4, label: 'SEMANA 4', start: new Date(2026, 4, 25), end: new Date(2026, 4, 29), range: '25/05 - 29/05' }
        ]
    },
    {
        month: 6,
        key: 'jun',
        name: 'Junho',
        periodText: '01/06 - 03/07',
        start: new Date(2026, 5, 1),
        end: new Date(2026, 6, 3, 23, 59, 59), // 03/07
        weeks: [
            { week: 1, label: 'SEMANA 1', start: new Date(2026, 5, 1), end: new Date(2026, 5, 5), range: '01/06 - 05/06' },
            { week: 2, label: 'SEMANA 2', start: new Date(2026, 5, 8), end: new Date(2026, 5, 12), range: '08/06 - 12/06' },
            { week: 3, label: 'SEMANA 3', start: new Date(2026, 5, 15), end: new Date(2026, 5, 19), range: '15/06 - 19/06' },
            { week: 4, label: 'SEMANA 4', start: new Date(2026, 5, 22), end: new Date(2026, 5, 26), range: '22/06 - 26/06' },
            { week: 5, label: 'SEMANA 5', start: new Date(2026, 5, 29), end: new Date(2026, 6, 3), range: '29/06 - 03/07' }
        ]
    },
    {
        month: 7,
        key: 'jul',
        name: 'Julho',
        periodText: '06/07 - 31/07',
        start: new Date(2026, 6, 6),
        end: new Date(2026, 6, 31, 23, 59, 59),
        weeks: [
            { week: 1, label: 'SEMANA 1', start: new Date(2026, 6, 6), end: new Date(2026, 6, 10), range: '06/07 - 10/07' },
            { week: 2, label: 'SEMANA 2', start: new Date(2026, 6, 13), end: new Date(2026, 6, 17), range: '13/07 - 17/07' },
            { week: 3, label: 'SEMANA 3', start: new Date(2026, 6, 20), end: new Date(2026, 6, 24), range: '20/07 - 24/07' },
            { week: 4, label: 'SEMANA 4', start: new Date(2026, 6, 27), end: new Date(2026, 6, 31), range: '27/07 - 31/07' }
        ]
    },
    {
        month: 8,
        key: 'ago',
        name: 'Agosto',
        periodText: '03/08 - 28/08',
        start: new Date(2026, 7, 3),
        end: new Date(2026, 7, 28, 23, 59, 59),
        weeks: [
            { week: 1, label: 'SEMANA 1', start: new Date(2026, 7, 3), end: new Date(2026, 7, 7), range: '03/08 - 07/08' },
            { week: 2, label: 'SEMANA 2', start: new Date(2026, 7, 10), end: new Date(2026, 7, 14), range: '10/08 - 14/08' },
            { week: 3, label: 'SEMANA 3', start: new Date(2026, 7, 17), end: new Date(2026, 7, 21), range: '17/08 - 21/08' },
            { week: 4, label: 'SEMANA 4', start: new Date(2026, 7, 24), end: new Date(2026, 7, 28), range: '24/08 - 28/08' }
        ]
    },
    {
        month: 9,
        key: 'set',
        name: 'Setembro',
        periodText: '31/08 - 02/10',
        start: new Date(2026, 7, 31), // 31 de Agosto já é Setembro comercial!
        end: new Date(2026, 9, 2, 23, 59, 59), // 02 de Outubro
        weeks: [
            { week: 1, label: 'SEMANA 1', start: new Date(2026, 7, 31), end: new Date(2026, 8, 4), range: '31/08 - 04/09' },
            { week: 2, label: 'SEMANA 2', start: new Date(2026, 8, 7), end: new Date(2026, 8, 11), range: '07/09 - 11/09' },
            { week: 3, label: 'SEMANA 3', start: new Date(2026, 8, 14), end: new Date(2026, 8, 18), range: '14/09 - 18/09' },
            { week: 4, label: 'SEMANA 4', start: new Date(2026, 8, 21), end: new Date(2026, 8, 25), range: '21/09 - 25/09' },
            { week: 5, label: 'SEMANA 5', start: new Date(2026, 8, 28), end: new Date(2026, 9, 2), range: '28/09 - 02/10' }
        ]
    },
    {
        month: 10,
        key: 'out',
        name: 'Outubro',
        periodText: '05/10 - 30/10',
        start: new Date(2026, 9, 5),
        end: new Date(2026, 9, 30, 23, 59, 59),
        weeks: [
            { week: 1, label: 'SEMANA 1', start: new Date(2026, 9, 5), end: new Date(2026, 9, 9), range: '05/10 - 09/10' },
            { week: 2, label: 'SEMANA 2', start: new Date(2026, 9, 12), end: new Date(2026, 9, 16), range: '12/10 - 16/10' },
            { week: 3, label: 'SEMANA 3', start: new Date(2026, 9, 19), end: new Date(2026, 9, 23), range: '19/10 - 23/10' },
            { week: 4, label: 'SEMANA 4', start: new Date(2026, 9, 26), end: new Date(2026, 9, 30), range: '26/10 - 30/10' }
        ]
    },
    {
        month: 11,
        key: 'nov',
        name: 'Novembro',
        periodText: '02/11 - 27/11',
        start: new Date(2026, 10, 2),
        end: new Date(2026, 10, 27, 23, 59, 59),
        weeks: [
            { week: 1, label: 'SEMANA 1', start: new Date(2026, 10, 2), end: new Date(2026, 10, 6), range: '02/11 - 06/11' },
            { week: 2, label: 'SEMANA 2', start: new Date(2026, 10, 9), end: new Date(2026, 10, 13), range: '09/11 - 13/11' },
            { week: 3, label: 'SEMANA 3', start: new Date(2026, 10, 16), end: new Date(2026, 10, 20), range: '16/11 - 20/11' },
            { week: 4, label: 'SEMANA 4', start: new Date(2026, 10, 23), end: new Date(2026, 10, 27), range: '23/11 - 27/11' }
        ]
    },
    {
        month: 12,
        key: 'dez',
        name: 'Dezembro',
        periodText: '30/11 - 23/12',
        start: new Date(2026, 10, 30), // 30 de Novembro já é Dezembro comercial!
        end: new Date(2026, 11, 23, 23, 59, 59), // 23 de Dezembro
        weeks: [
            { week: 1, label: 'SEMANA 1', start: new Date(2026, 10, 30), end: new Date(2026, 11, 4), range: '30/11 - 04/12' },
            { week: 2, label: 'SEMANA 2', start: new Date(2026, 11, 7), end: new Date(2026, 11, 11), range: '07/12 - 11/12' },
            { week: 3, label: 'SEMANA 3', start: new Date(2026, 11, 14), end: new Date(2026, 11, 18), range: '14/12 - 18/12' },
            { week: 4, label: 'SEMANA 4', start: new Date(2026, 11, 21), end: new Date(2026, 11, 23), range: '21/12 - 23/12' }
        ]
    }
];

/**
 * Retorna as semanas canônicas de um mês (1 a 12)
 * @param {number} monthNum 1-12
 * @returns {Array} semanas com label, range, start, end
 */
function getMonthWeeks(monthNum) {
    const entry = COMMERCIAL_CALENDAR_2026.find(m => m.month === parseInt(monthNum));
    return entry ? entry.weeks : [];
}

/**
 * Retorna as informações do mês comercial a partir do número do mês (1-12)
 */
function getCommercialMonth(monthNum) {
    return COMMERCIAL_CALENDAR_2026.find(m => m.month === parseInt(monthNum)) || null;
}

/**
 * Normaliza uma data para timestamp de início do dia em UTC para comparações limpas
 */
function toDayUtc(date) {
    if (!date) return 0;
    const d = new Date(date);
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Identifica o mês e a semana comercial a partir das datas de início e fim da planilha
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {Object} { month, monthKey, week, weekLabel, year, range }
 */
function getCommercialPeriodInfo(startDate, endDate) {
    const startUtc = toDayUtc(startDate);
    const endUtc = endDate ? toDayUtc(endDate) : startUtc;
    const midUtc = Math.round((startUtc + endUtc) / 2);

    // 1. Tentar casamento direto com as semanas cadastradas
    for (const m of COMMERCIAL_CALENDAR_2026) {
        for (const w of m.weeks) {
            const wStartUtc = toDayUtc(w.start);
            const wEndUtc = toDayUtc(w.end);

            // Se o início bate com até 2 dias de diferença (ex: feriado na segunda) e o fim bate perto
            const diffStartDays = Math.abs((startUtc - wStartUtc) / 86400000);
            const diffEndDays = Math.abs((endUtc - wEndUtc) / 86400000);

            if (diffStartDays <= 2 && diffEndDays <= 3) {
                return {
                    month: m.month,
                    monthKey: m.key,
                    monthName: m.name,
                    week: w.week,
                    weekLabel: w.label,
                    range: w.range,
                    year: 2026
                };
            }
        }
    }

    // 2. Se não casou exatamente na semana, casar pelo período global do mês comercial
    for (const m of COMMERCIAL_CALENDAR_2026) {
        const mStartUtc = toDayUtc(m.start);
        const mEndUtc = toDayUtc(m.end);

        // Se o ponto médio do período da planilha está dentro do mês comercial
        if (midUtc >= mStartUtc && midUtc <= mEndUtc) {
            // Achar qual semana do mês está mais próxima
            let bestWeek = m.weeks[0];
            let minDiff = Infinity;
            m.weeks.forEach(w => {
                const wMid = (toDayUtc(w.start) + toDayUtc(w.end)) / 2;
                const diff = Math.abs(midUtc - wMid);
                if (diff < minDiff) {
                    minDiff = diff;
                    bestWeek = w;
                }
            });

            return {
                month: m.month,
                monthKey: m.key,
                monthName: m.name,
                week: bestWeek.week,
                weekLabel: bestWeek.label,
                range: bestWeek.range,
                year: 2026
            };
        }
    }

    // Fallback padrão civil se estiver totalmente fora de 2026
    const d = new Date(startDate);
    const civilMonth = d.getMonth() + 1;
    const civilKey = MONTH_KEYS[civilMonth - 1] || 'jan';
    const civilWeek = Math.min(5, Math.ceil(d.getDate() / 7));

    return {
        month: civilMonth,
        monthKey: civilKey,
        monthName: MONTH_NAMES[civilMonth - 1] || 'Janeiro',
        week: civilWeek,
        weekLabel: `SEMANA ${civilWeek}`,
        range: '',
        year: d.getFullYear() || 2026
    };
}

/**
 * Retorna a chave do mês comercial ('jan'..'dez') para uma data
 * @param {Date} date 
 * @returns {string} 'jan'..'dez'
 */
function getCommercialMonthKey(date) {
    const info = getCommercialPeriodInfo(date, date);
    return info.monthKey;
}

module.exports = {
    COMMERCIAL_CALENDAR_2026,
    MONTH_KEYS,
    MONTH_NAMES,
    getMonthWeeks,
    getCommercialMonth,
    getCommercialPeriodInfo,
    getCommercialMonthKey
};
