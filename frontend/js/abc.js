import { MONTH_LABELS } from './constants.js';
import { fmt } from './utils.js';
import { normalizeClientText } from './client-identity.js';

let APP_DATA = null;
let abcCompareChart = null;
let abcTotalPages = 1;
export const abcState = { mes:'acum',vendor:'all',city:'all',curva:new Set(['A','B','C']),sort:'value',sortDir:-1,page:1,pageSize:10 };
export let abcChartMes = 'acum';
const el = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const vendorInfo = key => APP_DATA.VND_LIST.find(v=>v.k===key) || { k:key,l:key,c:'#64748b' };

export function initAbc(appData) {
    APP_DATA=appData;
    if(!el('abc-tbody')) return;
    el('abc-vendor-sel').innerHTML='<option value="all">Todos os vendedores</option>'+APP_DATA.VND_LIST.map(v=>`<option value="${escape(v.k)}">${escape(v.l)}</option>`).join('');
    if(abcState.vendor!=='all' && !APP_DATA.VND_LIST.some(v=>v.k===abcState.vendor)) abcState.vendor='all';
    el('abc-vendor-sel').value=abcState.vendor;el('abc-mes-sel').value=abcState.mes;el('abc-page-size').value=abcState.pageSize;
    updateAbcCityOptions();
    el('abc-page-size').onchange=event=>{abcState.pageSize=Number(event.target.value);abcState.page=1;renderAbcTable(false);};
    el('abc-page-prev').onclick=()=>changeAbcPage(abcState.page-1);
    el('abc-page-next').onclick=()=>changeAbcPage(abcState.page+1);
    el('abc-page-go').onclick=()=>changeAbcPage(Number(el('abc-page-number').value));
    el('abc-page-number').onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();changeAbcPage(Number(event.target.value));}};
    el('abc-chart-top').onchange=renderAbcChart;
    el('abc-chart-details').ontoggle=()=>{if(el('abc-chart-details').open) renderAbcChart();};
    el('abc-sort-name').onclick=()=>sortAbcBy('name');el('abc-sort-value').onclick=()=>sortAbcBy('value');
    renderAbcTable();
}

function changeAbcPage(page) {
    abcState.page=Math.max(1,Math.min(Number.isSafeInteger(page)?page:1,abcTotalPages));
    renderAbcTable(false);
}
function getAbcSource() {return abcState.mes==='acum'?APP_DATA?.ABC_ACUM:APP_DATA?.[`ABC_${abcState.mes.toUpperCase()}`];}
export function getAbcRows() {
    const src=getAbcSource() || {};
    const vendors=abcState.vendor==='all'?Object.keys(src):[abcState.vendor];
    const query=normalizeClientText(el('abc-search')?.value);
    return vendors.flatMap(vendor=>(src[vendor] || []).map(client=>({vendor,name:client.n,code:client.code || '',value:client.v,city:client.cd,cityKey:client.ck,abc:client.a})))
        .filter(row=>(abcState.city==='all' || row.cityKey===abcState.city) && abcState.curva.has(row.abc)
            && (!query || normalizeClientText(`${row.name} ${row.code} ${row.city}`).includes(query)))
        .sort((a,b)=>abcState.sortDir*(abcState.sort==='name'?a.name.localeCompare(b.name,'pt-BR'):a.value-b.value) || a.name.localeCompare(b.name,'pt-BR'));
}

export function updateAbcFilters() {
    const changed=abcState.mes!==el('abc-mes-sel').value || abcState.vendor!==el('abc-vendor-sel').value;
    abcState.mes=el('abc-mes-sel').value;abcState.vendor=el('abc-vendor-sel').value;
    if(changed) updateAbcCityOptions();
    else abcState.city=el('abc-sel-city').value;
    abcState.page=1;renderAbcTable();
}
export function setAbcFilter(type,value) {
    if(type==='mes') {abcState.mes=value;el('abc-mes-sel').value=value;}
    if(type==='vendor') {abcState.vendor=value;el('abc-vendor-sel').value=value;}
    if(type==='city') {abcState.city=value;el('abc-sel-city').value=value;}
    abcState.page=1;
    if(type!=='city') updateAbcCityOptions();
    renderAbcTable();
}
export function toggleAbcCurva(letter,button) {
    if(abcState.curva.has(letter)){if(abcState.curva.size===1)return;abcState.curva.delete(letter);}else abcState.curva.add(letter);
    button.classList.toggle('active',abcState.curva.has(letter));button.setAttribute('aria-pressed',String(abcState.curva.has(letter)));
    abcState.page=1;renderAbcTable();
}
export function sortAbcBy(column) {
    if(abcState.sort===column)abcState.sortDir*=-1;else{abcState.sort=column;abcState.sortDir=column==='value'?-1:1;}
    abcState.page=1;renderAbcTable();
}
export function updateAbcCityOptions() {
    const src=getAbcSource() || {};
    const cities=new Map();
    for(const vendor of abcState.vendor==='all'?Object.keys(src):[abcState.vendor]) for(const client of src[vendor] || []) if(client.ck && client.ck!=='*') cities.set(client.ck,client.cd);
    if(!cities.has(abcState.city))abcState.city='all';
    el('abc-sel-city').innerHTML='<option value="all">Todas as cidades</option>'+[...cities].sort((a,b)=>a[1].localeCompare(b[1],'pt-BR')).map(([key,name])=>`<option value="${escape(key)}">${escape(name)}</option>`).join('');
    el('abc-sel-city').value=abcState.city;
}
export function renderAbcTable(updateChart=true) {
    const rows=getAbcRows();
    abcTotalPages=Math.max(1,Math.ceil(rows.length/abcState.pageSize));abcState.page=Math.min(abcState.page,abcTotalPages);
    const offset=(abcState.page-1)*abcState.pageSize;
    const pageRows=rows.slice(offset,offset+abcState.pageSize);
    const total=rows.reduce((sum,row)=>sum+row.value,0);
    el('abc-stats').innerHTML=[{name:'Clientes por vendedor',count:rows.length,total,color:'#2563eb'},...['A','B','C'].map(curve=>({name:`Curva ${curve}`,count:rows.filter(row=>row.abc===curve).length,total:rows.filter(row=>row.abc===curve).reduce((sum,row)=>sum+row.value,0),color:{A:'#059669',B:'#b45309',C:'#e11d48'}[curve]}))]
        .map(stat=>`<div class="abc-stat" style="border-top:3px solid ${stat.color}"><div class="abc-stat-val" style="color:${stat.color}">${stat.count}</div><div class="abc-stat-lbl">${stat.name}</div><div class="central-stat-money">${fmt(stat.total)}</div></div>`).join('');
    el('abc-footer').textContent=`Mostrando ${rows.length?offset+1:0}–${offset+pageRows.length} de ${rows.length} registros · Total filtrado: ${fmt(total)}`;
    el('abc-pagination').hidden=rows.length===0;el('abc-page-prev').disabled=abcState.page<=1;el('abc-page-next').disabled=abcState.page>=abcTotalPages;
    el('abc-page-number').value=abcState.page;el('abc-page-number').max=abcTotalPages;el('abc-page-total').textContent=`de ${abcTotalPages}`;
    const failed=APP_DATA.ABC_LOADED_MONTHS && (abcState.mes==='acum'?APP_DATA.ABC_LOADED_MONTHS.length<12:!APP_DATA.ABC_LOADED_MONTHS.includes(abcState.mes));
    el('abc-data-notice').hidden=!failed;el('abc-data-notice').textContent='Alguns dados mensais não foram carregados. A seleção pode estar incompleta; atualize a página para tentar novamente.';
    for(const column of ['name','value']) el(`abc-sort-${column}`).parentElement.setAttribute('aria-sort',abcState.sort===column?(abcState.sortDir===1?'ascending':'descending'):'none');
    el('abc-tbody').innerHTML=pageRows.length?pageRows.map((row,index)=>{
        const vendor=vendorInfo(row.vendor);
        return `<tr><td><span class="abc-rank">${offset+index+1}</span></td><th scope="row"><span class="central-client-name">${escape(row.name)}</span>${row.code?`<span class="opp-entity-meta">Cód. ${escape(row.code)}</span>`:''}</th><td class="opp-money">${fmt(row.value)}</td><td>${escape(row.city || '—')}</td><td><span class="central-vendor-tag" style="--vendor-color:${vendor.c}">${escape(vendor.l)}</span></td><td><span class="abc-badge ${row.abc}">${row.abc}</span></td></tr>`;
    }).join(''):'<tr><td colspan="6" class="abc-empty">Nenhum cliente encontrado.</td></tr>';
    if(updateChart && el('abc-chart-details').open && !el('central-abc').hidden)renderAbcChart();
}
export function renderAbcChart() {
    if(!APP_DATA || el('central-abc').hidden)return;
    abcCompareChart?.destroy();
    const top=Math.min(20,Number(el('abc-chart-top').value) || 10);
    const rows=getAbcRows().sort((a,b)=>b.value-a.value).slice(0,top);
    el('abc-chart-frame').style.height=`${Math.max(280,rows.length*24+60)}px`;
    el('abc-chart-empty').hidden=rows.length!==0;el('abc-compare-chart').hidden=rows.length===0;
    if(!rows.length){abcCompareChart=null;return;}
    abcCompareChart=new Chart(el('abc-compare-chart').getContext('2d'),{type:'bar',data:{labels:rows.map(row=>row.name.length>24?row.name.slice(0,23)+'…':row.name),datasets:[{label:'Compras no período',data:rows.map(row=>row.value),backgroundColor:rows.map(row=>vendorInfo(row.vendor).c),borderRadius:4}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{title:items=>`${rows[items[0].dataIndex].name} · ${vendorInfo(rows[items[0].dataIndex].vendor).l}`,label:context=>fmt(context.raw)}}},scales:{x:{beginAtZero:true,ticks:{callback:value=>Number(value).toLocaleString('pt-BR',{notation:'compact'})},grid:{color:'#f1f5f9'}},y:{ticks:{autoSkip:false,font:{size:10}},grid:{display:false}}}}});
    el('abc-chart-sub').textContent=`Top ${rows.length} clientes nos filtros atuais · ${abcState.mes==='acum'?'Acumulado 2026':MONTH_LABELS[abcState.mes]}`;
}
// Preserve the existing module interface for integrations that select chart months.
export function setAbcChartMes(month) {abcChartMes=month;setAbcFilter('mes',month);}
export function setAbcChartMesNew(month) {setAbcChartMes(month);}
