import { fmt } from './utils.js';
import { MONTHS, MONTH_LABELS, FABS, FLAB } from './constants.js';

let currentId = null;
let currentPage = 1;
let totalPages = 1;
let controller = null;
let bound = false;
const el = id => document.getElementById(id);
const setText = (id, text) => { el(id).textContent = text; };
const date = value => value ? new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—';

function bindControls() {
    if (bound) return;
    bound = true;
    el('import-detail').addEventListener('close', () => {
        controller?.abort();
        currentId = null;
    });
    el('import-detail-prev').onclick = () => loadDetails(currentPage - 1);
    el('import-detail-next').onclick = () => loadDetails(currentPage + 1);
    el('import-detail-retry').onclick = () => loadDetails(currentPage);
}

export function closeImportDetails() {
    controller?.abort();
    currentId = null;
    el('import-detail').close();
}

export function openImportDetails(id) {
    bindControls();
    currentId = id;
    currentPage = 1;
    totalPages = 1;
    setText('import-detail-title', `Dados do lançamento #${id}`);
    if (!el('import-detail').open) el('import-detail').showModal();
    return loadDetails(1);
}

async function loadDetails(page) {
    if (currentId === null) return;
    controller?.abort();
    const request = new AbortController();
    controller = request;
    currentPage = Math.max(1, Math.min(page, totalPages));
    el('import-detail-content').hidden = true;
    el('import-detail-error').hidden = true;
    el('import-detail-loading').hidden = false;
    el('import-detail-body').setAttribute('aria-busy', 'true');
    try {
        const response = await fetch(`/api/history/${currentId}?${new URLSearchParams({ page: currentPage, pageSize: 50 })}`, {
            signal: request.signal, cache: 'no-store'
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Não foi possível carregar os dados deste lançamento.');
        if (request.signal.aborted || controller !== request || currentId === null) return;
        renderDetails(result);
        el('import-detail-content').hidden = false;
    } catch (error) {
        if (error.name === 'AbortError' || request.signal.aborted || controller !== request) return;
        setText('import-detail-error-message', error.message);
        el('import-detail-error').hidden = false;
    } finally {
        if (controller === request) {
            el('import-detail-loading').hidden = true;
            el('import-detail-body').setAttribute('aria-busy', 'false');
        }
    }
}

function renderDetails({ import: record, vendorLabel, kind, rows, totalValue, pagination }) {
    const adjustment = record.type === 'adjustment';
    setText('import-detail-type', { type1: 'Relatório Tipo 1', type2: 'Relatório Tipo 2', adjustment: 'Ajuste manual' }[record.type] || record.type);
    setText('import-detail-vendor', vendorLabel);
    setText('import-detail-total', fmt(totalValue));
    setText('import-detail-total-label', adjustment ? 'Valor do ajuste' : 'Total do lançamento');
    setText('import-detail-count', pagination.total.toLocaleString('pt-BR'));
    setText('import-detail-period', record.periodText || 'Não informado');
    setText('import-detail-month', `${MONTH_LABELS[MONTHS[record.periodMonth - 1]] || '—'} / ${record.periodYear}${record.periodWeek ? ' · Semana ' + record.periodWeek : ''}`);
    setText('import-detail-created', record.createdAt ? new Date(record.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—');
    setText('import-detail-filename', record.filename || 'Não informado');
    const headers = kind === 'clients'
        ? ['Código', 'Cliente', 'Cidade', 'Valor']
        : ['Código', adjustment ? 'Descrição' : 'Fornecedor', 'Fábrica', 'Período', adjustment ? 'Diferença' : 'Valor'];
    const header = el('import-detail-header');
    const body = el('import-detail-rows');
    header.replaceChildren();
    body.replaceChildren();
    for (const name of headers) {
        const th = document.createElement('th');
        th.scope = 'col';
        th.textContent = name;
        header.appendChild(th);
    }
    for (const row of rows) {
        const values = kind === 'clients'
            ? [row.clientCode, row.clientName, row.city, fmt(row.totalValue)]
            : [row.supplierCode, row.supplierName, FLAB[FABS.indexOf(row.factoryKey)] || row.factoryKey, `${date(row.periodStart)} – ${date(row.periodEnd)}`, fmt(row.value)];
        const tr = document.createElement('tr');
        for (const value of values) {
            const td = document.createElement('td');
            td.textContent = value ?? '—';
            tr.appendChild(td);
        }
        body.appendChild(tr);
    }
    el('import-detail-table-wrap').hidden = pagination.total === 0;
    el('import-detail-empty').hidden = pagination.total !== 0;
    currentPage = pagination.page;
    totalPages = pagination.totalPages;
    el('import-detail-pagination').hidden = totalPages <= 1;
    setText('import-detail-page', `Página ${currentPage} de ${totalPages}`);
    setText('import-detail-range', pagination.total ? `${(currentPage - 1) * pagination.pageSize + 1}–${(currentPage - 1) * pagination.pageSize + rows.length} de ${pagination.total} registros` : 'Nenhum registro neste lançamento.');
    el('import-detail-prev').disabled = currentPage <= 1;
    el('import-detail-next').disabled = currentPage >= totalPages;
}
