/**
 * Data Loader Module
 * Handles fetching data from the backend API.
 * Fully dynamic — loads all 12 months.
 */
import { MONTHS, MONTH_LABELS, VND_COLORS } from './constants.js';

const API_URL = '/api/data';

export async function loadJson(endpoint) {
    try {
        const response = await fetch(`${API_URL}/${endpoint}?t=${Date.now()}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Could not load data from ${endpoint}:`, error);
        return null;
    }
}

export function buildGeoFromABC(abcData, geoRef) {
  const cityMap = {};
  Object.entries(abcData).forEach(([vkey, clients]) => {
    clients.forEach(c => {
      if (!c.ck || c.ck === '*') return;
      const ck = c.ck;
      if (!cityMap[ck]) cityMap[ck] = { city: c.cd, key: ck, lat:0, lng:0, total:0, vendors:[] };
      let vnd = cityMap[ck].vendors.find(v => v.key === vkey);
      if (!vnd) {
        vnd = { key: vkey, label: vkey, color: VND_COLORS[vkey] || '#64748b', value: 0, clients: [] };
        cityMap[ck].vendors.push(vnd);
      }
      vnd.value += c.v;
      vnd.clients.push({ name: c.n, value: c.v });
    });
  });
  
  // lat/lng reference from DB
  const latLng = {};
  geoRef.forEach(c => { 
    if (c.key) {
      const cleanKey = c.key.toUpperCase().replace(/\s/g, '');
      if (!latLng[cleanKey]) latLng[cleanKey] = { lat: c.lat, lng: c.lng }; 
    }
  });
  
  const arr = Object.values(cityMap).map(city => {
    const cleanCityKey = city.key.toUpperCase().replace(/\s/g, '');
    const ll = latLng[cleanCityKey] || { lat:0, lng:0 };
    city.lat = ll.lat; city.lng = ll.lng;
    city.total = city.vendors.reduce((s,v) => s + v.value, 0);
    city.vendors.forEach(v => { v.clients.sort((a,b) => b.value - a.value); });
    city.vendors.sort((a,b) => b.value - a.value);
    return city;
  }).filter(c => c.lat !== 0);
  return arr;
}

export async function loadAllData() {
    try {
        console.log('Iniciando carregamento de dados da API...');
        
        // Load sales + vendors + coordinates + fabricas
        const [D, VND_LIST, geoRef, FABRICAS_DETAIL] = await Promise.all([
            loadJson('sales'),
            loadJson('vendors'),
            loadJson('coordinates'),
            loadJson('fabricas')
        ]);

        if (!D || !VND_LIST || !FABRICAS_DETAIL) throw new Error('Dados essenciais não retornados pela API.');

        // Load all 12 months of ABC data
        const abcPromises = MONTHS.map((mk, i) => loadJson(`abc/${i + 1}`));
        const abcResults = await Promise.all(abcPromises);

        // Build ABC map
        const abcData = {};
        MONTHS.forEach((mk, i) => {
            const key = `ABC_${mk.toUpperCase()}`;
            abcData[key] = abcResults[i] || {};
        });

        const data = {
            D,
            VND_LIST,
            FABRICAS_DETAIL,
            ...abcData,
            geoRef,
            ABC_ACUM: abcData.ABC_JAN || {}
        };

        // Generate dynamic GEO data for each month + Accum
        MONTHS.forEach((mk, i) => {
            const abcKey = `ABC_${mk.toUpperCase()}`;
            const geoKey = `GEO_${mk.toUpperCase()}`;
            if (abcData[abcKey] && Object.keys(abcData[abcKey]).length > 0) {
                data[geoKey] = buildGeoFromABC(abcData[abcKey], geoRef);
            }
        });
        
        // Accum — use Jan as base if others empty, but better sum all
        const allAbc = {};
        MONTHS.forEach(mk => {
            const key = `ABC_${mk.toUpperCase()}`;
            Object.entries(abcData[key] || {}).forEach(([vk, clients]) => {
                if (!allAbc[vk]) allAbc[vk] = [];
                clients.forEach(c => {
                    let existing = allAbc[vk].find(x => x.n === c.n && x.ck === c.ck);
                    if (existing) existing.v += c.v;
                    else allAbc[vk].push({ ...c });
                });
            });
        });
        
        // Recalculate curves and sort for Accumulated ABC
        Object.keys(allAbc).forEach(vk => {
            allAbc[vk].forEach(c => {
                if (c.v > 2000) c.a = 'A';
                else if (c.v > 500) c.a = 'B';
                else c.a = 'C';
            });
            allAbc[vk].sort((a, b) => b.v - a.v);
        });

        data.ABC_ACUM = allAbc;
        data.GEO_ACUM = buildGeoFromABC(allAbc, geoRef);
        
        console.log('Dados carregados com sucesso.');
        return data;
    } catch (err) {
        console.error('Falha crítica ao carregar dados:', err);
        return null;
    }
}
