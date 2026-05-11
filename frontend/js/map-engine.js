/**
 * Map Engine Module
 * Handles all Leaflet map interactions.
 */

import { fmt } from './utils.js';

let leafletMap = null;
let leafletMarkers = [];

export function initMap(elementId, center = [-31.8, -52.8], zoom = 8) {
    if (!leafletMap) {
        leafletMap = L.map(elementId, { center, zoom });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
            maxZoom: 18
        }).addTo(leafletMap);
    }
    return leafletMap;
}

export function renderMapMarkers(geoData, activeVendor, getCityValFn, showCityPanelFn) {
    if (!leafletMap) return;
    
    leafletMarkers.forEach(m => leafletMap.removeLayer(m));
    leafletMarkers = [];

    const values = geoData.map(c => getCityValFn(c, activeVendor)).filter(v => v > 0);
    const maxVal = values.length > 0 ? Math.max(...values) : 1;

    geoData.forEach(city => {
        const val = getCityValFn(city, activeVendor);
        if (val <= 0) return;

        const radius = 14 + (val / maxVal) * 38;
        let color = city.vendors[0]?.color || '#2563eb';
        if (activeVendor !== 'all') {
            const vend = city.vendors.find(v => v.key === activeVendor);
            color = vend ? vend.color : '#64748b';
        }

        const vendorRows = (activeVendor === 'all' ? city.vendors : city.vendors.filter(v => v.key === activeVendor))
            .map(v => `
                <div class="lf-popup-row">
                    <div class="lf-popup-dot" style="background:${v.color}"></div>
                    <span class="lf-popup-name">${v.label}</span>
                    <span class="lf-popup-val">${fmt(v.value)}</span>
                </div>
            `).join('');

        const popup = `
            <div class="lf-popup">
                <div class="lf-popup-city">📍 ${city.city}</div>
                <div class="lf-popup-total">TOTAL: ${fmt(val)}</div>
                ${vendorRows}
                <button class="lf-popup-btn" id="btn-city-${city.key}">Ver detalhes →</button>
            </div>
        `;

        const marker = L.circleMarker([city.lat, city.lng], {
            radius, fillColor: color, fillOpacity: 0.78, color, weight: 2.5, opacity: 1
        }).addTo(leafletMap);

        marker.bindPopup(popup, { maxWidth: 300 });
        marker.bindTooltip(`<b>${city.city}</b><br>${fmt(val)}`, { direction: 'top', offset: [0, -radius] });
        
        // Use popupopen event to attach listener to dynamically created button
        marker.on('popupopen', () => {
            const btn = document.getElementById(`btn-city-${city.key}`);
            if (btn) btn.onclick = () => showCityPanelFn(city.key);
        });

        leafletMarkers.push(marker);
    });
}
