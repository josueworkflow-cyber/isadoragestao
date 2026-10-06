import { buildOpportunities, filterOpportunities, opportunityTypes, saoPauloDay, availableOpportunityMonths } from './opportunities-model.js';
import { clientIdentity, normalizeClientText } from './client-identity.js';
import { MONTHS, MONTH_LABELS } from './constants.js';
import { fmt } from './utils.js';
import { abcState, initAbc } from './abc.js';

let data;
let model;
let filtered = [];
let currentPageRows = [];
let totalPages = 1;
let activeSection = 'opportunities';
const state = { month:null,type:'recover',vendor:'all',city:'all',search:'',threshold:20,page:1,pageSize:10 };
const titles = { recover:'Clientes para recuperar',drop:'Clientes com queda',important:'Clientes A em atenção',regions:'Regiões com queda' };
const explanations = {
    recover:'Compravam no mês anterior e não têm vendas líquidas positivas no mês analisado.',
    drop:'Continuam comprando, mas reduziram o valor comprado em relação ao mês anterior.',
    important:'Eram curva A no mês anterior e deixaram de comprar, reduziram compras ou perderam participação na carteira.',
    regions:'Cidades com redução nas vendas por cliente, considerando os mesmos vendedores nos dois meses.',
};
const escape = value => String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const percent = value => value === null ? '—' : `${value.toLocaleString('pt-BR',{maximumFractionDigits:1})}%`;
const el = id => document.getElementById(id);
const label = vendor => data.VND_LIST.find(v=>v.k===vendor)?.l || vendor;
const vendorNames = vendors => vendors.map(label).join(', ');
const setText = (id,value) => { if(el(id)) el(id).textContent=value; };

export function initOpportunities(appData) {
    data = appData;
    if (!el('opp-list')) return;
    for (const section of ['opportunities','abc']) {
        const button=el(`central-tab-${section}`);
        button.onclick = () => showSection(section);
        button.onkeydown = event => {
            if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
            event.preventDefault();
            const target=event.key==='Home'?'opportunities':event.key==='End'?'abc':section==='abc'?'opportunities':'abc';
            showSection(target);el(`central-tab-${target}`).focus();
        };
    }
    el('opp-month').onchange = event => { state.month=event.target.value;state.page=1;rebuild(); };
    el('opp-threshold').onchange = event => { state.threshold=Number(event.target.value);state.page=1;rebuild(); };
    el('opp-vendor').onchange = event => { state.vendor=event.target.value;state.page=1;renderList(); };
    el('opp-city').onchange = event => { state.city=event.target.value;state.page=1;renderList(); };
    el('opp-search').oninput = event => { state.search=event.target.value;state.page=1;renderList(); };
    el('opp-page-size').onchange = event => { state.pageSize=Number(event.target.value);state.page=1;renderList(); };
    el('opp-prev').onclick = () => goPage(state.page-1);
    el('opp-next').onclick = () => goPage(state.page+1);
    el('opp-go').onclick = () => goPage(Number(el('opp-page').value));
    el('opp-page').onkeydown = event => { if(event.key==='Enter'){event.preventDefault();goPage(Number(event.target.value));} };
    for (const type of opportunityTypes) el(`opp-category-${type}`).onclick = () => {state.type=type;state.page=1;renderList();};
    el('opp-list').onclick = event => {
        const button=event.target.closest('[data-opportunity-index]');
        if(button) openDetail(currentPageRows[Number(button.dataset.opportunityIndex)]);
    };
    el('opp-detail-close').onclick = () => el('opp-detail').close();
    el('opp-detail-abc').onclick = () => {
        const client=el('opp-detail').client;
        if(!client) return;
        el('opp-detail').close();
        abcState.mes='acum';abcState.vendor='all';abcState.city='all';abcState.curva=new Set(['A','B','C']);abcState.page=1;
        el('abc-mes-sel').value='acum';el('abc-vendor-sel').value='all';el('abc-search').value=client.code || client.name;
        document.querySelectorAll('[data-abc-curve]').forEach(button=>{button.classList.add('active');button.setAttribute('aria-pressed','true');});
        showSection('abc');
    };
    // Keep a selected month only while it still has a closed imported report.
    if(!availableOpportunityMonths(data).some(option=>option.key===state.month)) state.month=null;
    rebuild();
    showSection(activeSection);
}

function showSection(section) {
    activeSection=section;
    for(const key of ['opportunities','abc']) {
        el(`central-${key}`).hidden=section!==key;
        el(`central-tab-${key}`).setAttribute('aria-selected',String(section===key));
        el(`central-tab-${key}`).tabIndex=section===key?0:-1;
    }
    if(section==='abc') initAbc(data);
}

function rebuild() {
    model=buildOpportunities(data,{month:state.month,threshold:state.threshold});
    el('opp-month').innerHTML=model.options.length ? model.options.map(option=>`<option value="${option.key}">${MONTH_LABELS[option.key]} de ${model.year}</option>`).join('') : '<option value="">Sem mês completo importado</option>';
    el('opp-month').value=model.month || '';
    el('opp-month').disabled=!model.options.length;
    el('opp-threshold').value=String(state.threshold);
    setText('opp-period',model.periodLabel || 'Histórico ainda insuficiente');
    setText('opp-baseline',model.previous ? `${MONTH_LABELS[model.month]} comparado exclusivamente com ${MONTH_LABELS[model.previous]}. Queda mínima: ${state.threshold}%.` : 'A comparação exige dois meses consecutivos com relatório mensal.');
    const status={
        'coverage-unavailable':'Não foi possível consultar os meses importados. A carteira ABC continua disponível; atualize a página para tentar novamente.',
        'no-complete-month':'Ainda não há relatório mensal de um mês comercial encerrado para analisar.',
        'no-previous-month':'Janeiro não tem mês anterior dentro do histórico de 2026. Selecione outro mês quando houver relatórios disponíveis.',
        'data-unavailable':'Os dados de um dos meses não foram carregados. Nenhum alerta foi gerado; atualize a página para tentar novamente.',
        'missing-imports':'Não há vendedor com relatório mensal nos dois meses. Importe os relatórios pendentes para comparar.',
    };
    const messages=[];
    if(model.status!=='ready') messages.push(status[model.status]);
    if(model.status==='ready') messages.push(`${model.eligibleVendors.length} ${model.eligibleVendors.length===1?'vendedor com relatórios':'vendedores com relatórios'} nos dois meses.`);
    if(model.excludedVendors.length) messages.push(`${model.excludedVendors.length} ${model.excludedVendors.length===1?'vendedor ficou':'vendedores ficaram'} fora da comparação por falta de relatório em um ou nos dois meses.`);
    if(model.skippedClients) messages.push(`${model.skippedClients} ${model.skippedClients===1?'cliente não foi comparado':'clientes não foram comparados'} por dados incompletos entre vendedores.`);
    setText('opp-coverage-summary',messages.join(' '));
    el('opp-coverage-details').hidden=!model.excludedVendors.length;
    el('opp-coverage-list').innerHTML=model.excludedVendors.map(item=>`<li><strong>${escape(label(item.vendor))}</strong>: falta ${[item.missingPrevious?MONTH_LABELS[model.previous]:null,item.missingCurrent?MONTH_LABELS[model.month]:null].filter(Boolean).join(' e ')}</li>`).join('');
    el('opp-vendor').innerHTML='<option value="all">Todos os vendedores</option>'+data.VND_LIST.map(v=>`<option value="${escape(v.k)}">${escape(v.l)}</option>`).join('');
    if(!data.VND_LIST.some(v=>v.k===state.vendor)) state.vendor='all';
    el('opp-vendor').value=state.vendor;
    const cities=new Map();
    for(const rows of Object.values(model.groups)) for(const row of rows) cities.set(row.cityKey,row.city);
    if(!cities.has(state.city)) state.city='all';
    el('opp-city').innerHTML='<option value="all">Todas as cidades</option>'+[...cities].sort((a,b)=>a[1].localeCompare(b[1],'pt-BR')).map(([key,name])=>`<option value="${escape(key)}">${escape(name)}</option>`).join('');
    el('opp-city').value=state.city;
    renderList();
}

function renderList() {
    const filters={vendor:state.vendor,city:state.city,search:state.search};
    for(const type of opportunityTypes) {
        const button=el(`opp-category-${type}`);
        button.setAttribute('aria-pressed',String(state.type===type));
        setText(`opp-count-${type}`,model.status==='ready'?String(filterOpportunities(model.groups[type],filters).length):'—');
    }
    filtered=filterOpportunities(model.groups[state.type],filters);
    totalPages=Math.max(1,Math.ceil(filtered.length/state.pageSize));
    state.page=Math.max(1,Math.min(state.page,totalPages));
    const offset=(state.page-1)*state.pageSize;
    currentPageRows=filtered.slice(offset,offset+state.pageSize);
    setText('opp-list-title',titles[state.type]);
    setText('opp-list-description',`${explanations[state.type]} ${state.type==='regions'?'Valores consolidados da cidade; o filtro de vendedor seleciona cidades sob sua responsabilidade.':'Clientes consolidados pelo código entre vendedores.'}`);
    setText('opp-before-heading',model.previous ? MONTH_LABELS[model.previous] : 'Anterior');
    setText('opp-current-heading',model.month ? MONTH_LABELS[model.month] : 'Atual');
    setText('opp-entity-heading',state.type==='regions'?'Cidade / responsáveis':'Cliente / cidade / responsáveis');
    el('opp-list').innerHTML=currentPageRows.length ? currentPageRows.map((row,index)=>`<tr>
        <th scope="row"><span class="opp-entity-name">${escape(row.name)}</span><span class="opp-entity-meta">${state.type==='regions'?'Cidade':`${escape(row.city)}${row.code?` · Cód. ${escape(row.code)}`:''}`}</span><span class="opp-entity-meta">${escape(vendorNames(row.vendors))}</span></th>
        <td class="opp-money">${fmt(row.previous)}</td><td class="opp-money">${fmt(row.current)}</td>
        <td><span class="opp-signal">${reason(row)}</span>${state.type==='important'?`<span class="opp-entity-meta">Participação: ${percent(row.previousShare)} → ${percent(row.currentShare)}</span>`:''}</td>
        <td><button type="button" class="opp-detail-button" data-opportunity-index="${index}" aria-label="Ver histórico de ${escape(row.name)}">Ver histórico</button></td>
    </tr>`).join('') : `<tr><td colspan="5" class="opp-empty">${model.status==='ready'?'Nenhuma oportunidade encontrada neste grupo com os filtros atuais.':'Aguardando histórico suficiente para comparar.'}</td></tr>`;
    setText('opp-pagination-status',`Mostrando ${filtered.length?offset+1:0}–${offset+currentPageRows.length} de ${filtered.length} ${state.type==='regions'?(filtered.length===1?'cidade':'cidades'):(filtered.length===1?'cliente':'clientes')}`);
    el('opp-pagination').hidden=filtered.length===0;
    el('opp-prev').disabled=state.page<=1;el('opp-next').disabled=state.page>=totalPages;
    el('opp-page').value=state.page;el('opp-page').max=totalPages;setText('opp-pages',`de ${totalPages}`);
}

function reason(row) {
    if(state.type==='regions') return `Queda de ${percent(row.dropPercent)}`;
    if(row.recover) return 'Sem compras líquidas positivas';
    if(row.drop) return `Queda de ${percent(row.dropPercent)}`;
    return `Participação caiu ${percent(row.shareDrop)}`;
}
function goPage(page) {state.page=Math.max(1,Math.min(Number.isSafeInteger(page)?page:1,totalPages));renderList();}

function openDetail(row) {
    const isRegion=state.type==='regions';
    const dialog=el('opp-detail');
    dialog.client=isRegion?null:row;
    setText('opp-detail-title',row.name);
    setText('opp-detail-subtitle',`${isRegion?'Região':row.city} · ${vendorNames(row.vendors)}`);
    el('opp-detail-abc').hidden=isRegion;
    const identity=isRegion?null:row.id;
    const history=MONTHS.map(month=>{
        const coverage=data.OPPORTUNITY_COVERAGE.months.find(item=>item.key===month);
        const imported=coverage?.vendors || [];
        const loaded=data.ABC_LOADED_MONTHS?.includes(month) ?? true;
        const valid=loaded && row.vendors.every(vendor=>imported.includes(vendor));
        const value=row.vendors.reduce((total,vendor)=>total+(data[`ABC_${month.toUpperCase()}`]?.[vendor] || []).filter(client=>isRegion?normalizeClientText(client.cd || client.ck)===row.cityKey:clientIdentity(client)===identity).reduce((sum,client)=>sum+client.v,0),0);
        return `<tr><th scope="row">${MONTH_LABELS[month]}${coverage && coverage.endDate>=saoPauloDay()?' <span class="opp-entity-meta">Mês não encerrado</span>':''}</th><td>${valid?fmt(value):'Sem relatório'}</td></tr>`;
    }).join('');
    const breakdown=isRegion?`<h3>Responsáveis na cidade</h3><div class="opp-detail-scroll"><table class="opp-detail-table"><thead><tr><th>Vendedor</th><th>${MONTH_LABELS[model.previous]}</th><th>${MONTH_LABELS[model.month]}</th></tr></thead><tbody>${row.vendorValues.map(vendor=>`<tr><th>${escape(label(vendor.vendor))}</th><td>${fmt(vendor.previous)}</td><td>${fmt(vendor.current)}</td></tr>`).join('')}</tbody></table></div>`:'';
    el('opp-detail-body').innerHTML=`<p class="opp-detail-rule">${model.periodLabel}. Valores líquidos por cliente; relatórios pendentes não são tratados como ausência de compras.</p>${breakdown}<h3>Histórico mensal</h3><table class="opp-detail-table"><tbody>${history}</tbody></table>`;
    dialog.showModal();
}
