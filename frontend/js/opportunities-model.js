import { MONTHS, MONTH_LABELS } from './constants.js';
import { clientIdentity, normalizeClientText } from './client-identity.js';

export const DEFAULT_DROP_THRESHOLD = 20;
export const opportunityTypes = ['recover', 'drop', 'important', 'regions'];
const abcKey = month => `ABC_${month.toUpperCase()}`;
export function saoPauloDay(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(date);
    const get = type => parts.find(part => part.type === type).value;
    return `${get('year')}-${get('month')}-${get('day')}`;
}
export function availableOpportunityMonths(data, day = saoPauloDay()) {
    return (data.OPPORTUNITY_COVERAGE?.months || []).filter(month => month.endDate < day && month.vendors.length > 0).sort((a,b) => MONTHS.indexOf(b.key) - MONTHS.indexOf(a.key));
}

export function buildOpportunities(data, { month, threshold = DEFAULT_DROP_THRESHOLD, day = saoPauloDay() } = {}) {
    const options = availableOpportunityMonths(data, day);
    const selected = month || options[0]?.key;
    const previous = MONTHS[MONTHS.indexOf(selected) - 1];
    const result = { month:selected || null, previous:previous || null, year:data.OPPORTUNITY_COVERAGE?.year || 2026,
        threshold, options, eligibleVendors:[],excludedVendors:[],groups:{ recover:[],drop:[],important:[],regions:[] },status:'ready',skippedClients:0 };
    if (!data.OPPORTUNITY_COVERAGE) return { ...result,status:'coverage-unavailable' };
    const currentCoverage = options.find(option => option.key === selected);
    if (!currentCoverage) return { ...result,status:'no-complete-month' };
    if (!previous) return { ...result,status:'no-previous-month' };
    const loaded = data.ABC_LOADED_MONTHS || MONTHS.filter(key => data[abcKey(key)] !== undefined && data[abcKey(key)] !== null);
    if (!loaded.includes(selected) || !loaded.includes(previous)) return { ...result,status:'data-unavailable' };
    const beforeCoverage = data.OPPORTUNITY_COVERAGE.months.find(option => option.key === previous)?.vendors || [];
    const currentVendors = new Set(currentCoverage.vendors);
    const beforeVendors = new Set(beforeCoverage);
    result.eligibleVendors = [...currentVendors].filter(vendor => beforeVendors.has(vendor));
    result.excludedVendors = [...new Set([...currentVendors,...beforeVendors,...(data.VND_LIST || []).filter(vendor=>vendor.active !== false).map(vendor=>vendor.k)])]
        .filter(vendor => !result.eligibleVendors.includes(vendor)).map(vendor => ({ vendor,missingCurrent:!currentVendors.has(vendor),missingPrevious:!beforeVendors.has(vendor) }));
    if (!result.eligibleVendors.length) return { ...result,status:'missing-imports' };
    const eligible = new Set(result.eligibleVendors);
    const clients = new Map();
    const cities = new Map();
    const totals = { previous:0,current:0 };
    for (const [key,period] of [[previous,'previous'],[selected,'current']]) {
        for (const [vendor,records] of Object.entries(data[abcKey(key)] || {})) {
            for (const raw of records) {
                const identity = clientIdentity(raw);
                if (!clients.has(identity)) clients.set(identity,{ id:identity,code:raw.code || '',name:raw.n,city:raw.cd || 'Não informada',cityKey:normalizeClientText(raw.cd || raw.ck),vendors:new Set(),previous:0,current:0,excluded:false,hasEligibleRecord:false,previousIsA:false });
                const client = clients.get(identity);
                client.vendors.add(vendor);
                if (!eligible.has(vendor)) { client.excluded = true;continue; }
                client.hasEligibleRecord=true;
                const value = Number(raw.v);
                if (!Number.isFinite(value)) { client.excluded = true;continue; }
                client[period] += value;
                if(period==='previous' && (raw.a==='A' || value>2000)) client.previousIsA=true;
                client.name = raw.n;client.city = raw.cd || 'Não informada';client.cityKey = normalizeClientText(raw.cd || raw.ck);
                totals[period] += value;
                const cityKey = normalizeClientText(raw.cd || raw.ck);
                if (!cityKey || ['*','NAO ENCONTRADA','NAO INFORMADA'].includes(cityKey)) continue;
                if (!cities.has(cityKey)) cities.set(cityKey,{ id:cityKey,name:raw.cd || raw.ck,city:raw.cd || raw.ck,cityKey,vendors:new Set(),vendorValues:new Map(),previous:0,current:0 });
                const city = cities.get(cityKey);
                city[period] += value;city.vendors.add(vendor);
                if (!city.vendorValues.has(vendor)) city.vendorValues.set(vendor,{vendor,previous:0,current:0});
                city.vendorValues.get(vendor)[period] += value;
            }
        }
    }
    for (const client of clients.values()) {
        if (client.excluded) { if(client.hasEligibleRecord) result.skippedClients++;continue; }
        if (client.previous <= 0) continue;
        const reduction = client.previous - client.current;
        const dropPercent = reduction / client.previous * 100;
        const previousShare = totals.previous > 0 ? client.previous / totals.previous * 100 : null;
        const currentShare = totals.current > 0 ? Math.max(0,client.current) / totals.current * 100 : 0;
        const shareDrop = previousShare > 0 ? (previousShare-currentShare) / previousShare * 100 : 0;
        const recover = client.current <= 0;
        const drop = client.current > 0 && dropPercent + 1e-8 >= threshold;
        const important = client.previousIsA && (recover || drop || shareDrop + 1e-8 >= threshold);
        const row = { ...client,vendors:[...client.vendors].sort(),reduction,dropPercent,previousShare,currentShare,shareDrop,previousCurve:client.previous > 2000 ? 'A' : client.previous > 500 ? 'B' : 'C',currentCurve:client.current > 2000 ? 'A' : client.current > 500 ? 'B' : 'C',recover,drop,important };
        if (recover) result.groups.recover.push(row);
        if (drop) result.groups.drop.push(row);
        if (important) result.groups.important.push(row);
    }
    for (const city of cities.values()) {
        if (city.previous <= 0) continue;
        const reduction = city.previous-city.current;
        const dropPercent = reduction/city.previous*100;
        if (dropPercent + 1e-8 >= threshold) result.groups.regions.push({ ...city,vendors:[...city.vendors].sort(),vendorValues:[...city.vendorValues.values()],reduction,dropPercent });
    }
    for (const group of Object.values(result.groups)) group.sort((a,b) => Math.max(0,b.reduction)-Math.max(0,a.reduction) || (b.shareDrop || 0)-(a.shareDrop || 0) || a.name.localeCompare(b.name,'pt-BR'));
    result.periodLabel = `${MONTH_LABELS[selected]} × ${MONTH_LABELS[previous]} de ${result.year}`;
    return result;
}

export function filterOpportunities(rows, { vendor='all',city='all',search='' } = {}) {
    const query = normalizeClientText(search);
    return rows.filter(row => (vendor === 'all' || row.vendors.includes(vendor)) && (city === 'all' || row.cityKey === city)
        && (!query || normalizeClientText(`${row.name} ${row.code || ''} ${row.city}`).includes(query)));
}
