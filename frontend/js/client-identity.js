export const normalizeClientText = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toUpperCase();

// Codes are stable across spelling changes and vendor transfers. Legacy records
// without codes use name + city, never the name alone.
export function clientIdentity(client) {
    const code = String(client.code || '').trim();
    return JSON.stringify(code ? ['code', code] : ['legacy', normalizeClientText(client.n), normalizeClientText(client.cd || client.ck)]);
}

export function accumulateAbc(monthSources) {
    const buckets = new Map();
    for (const source of monthSources) {
        for (const [vendor, clients] of Object.entries(source || {})) {
            if (!buckets.has(vendor)) buckets.set(vendor, new Map());
            const bucket = buckets.get(vendor);
            for (const client of clients) {
                const key = clientIdentity(client);
                bucket.set(key, { ...client, v: (bucket.get(key)?.v || 0) + client.v });
            }
        }
    }
    return Object.fromEntries([...buckets].map(([vendor, bucket]) => [vendor, [...bucket.values()].map(client => ({ ...client, a: client.v > 2000 ? 'A' : client.v > 500 ? 'B' : 'C' })).sort((a, b) => b.v - a.v)]));
}
