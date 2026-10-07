import { fmt } from './utils.js';
import { parseAdjustmentMoney, adjustmentPreview } from './adjustment-model.js';
import { openImportDetails, closeImportDetails } from './import-details.js';

const API_URL = '/api';
let historyPage = 1;
let historyPageSize = 10;
let historyTotalPages = 1;
let historySearch = '';
let historyType = '';
let historyController = null;
let historySearchTimer = null;
let historySyncStarted = false;

export async function initImportPage() {
    bindHistoryControls();
    loadHistory();
    // Auto-sync existing imports quietly in the background on visit
    // A data refresh revisits this page; sync only once to avoid a refresh loop.
    if (historySyncStarted) return;
    historySyncStarted = true;
    fetch(`${API_URL}/history/sync`, { method: 'POST' })
        .then(r => r.json())
        .then(() => { if (window.refreshAppData) window.refreshAppData(); })
        .catch(() => {});
}

function bindHistoryControls() {
    document.getElementById('import-history-search').oninput = event => {
        historySearch = event.target.value.trim();
        historyPage = 1;
        historyController?.abort();
        clearTimeout(historySearchTimer);
        historySearchTimer = setTimeout(() => loadHistory(true), 300);
    };
    document.getElementById('import-history-type').onchange = event => {
        historyType = event.target.value;
        loadHistory(true);
    };
    document.getElementById('import-history-size').onchange = event => {
        historyPageSize = Number(event.target.value);
        loadHistory(true);
    };
    document.getElementById('import-history-prev').onclick = () => changeHistoryPage(historyPage - 1);
    document.getElementById('import-history-next').onclick = () => changeHistoryPage(historyPage + 1);
    document.getElementById('import-history-go').onclick = () => changeHistoryPage(Number(document.getElementById('import-history-page').value));
    document.getElementById('import-history-page').onkeydown = event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            changeHistoryPage(Number(event.target.value));
        }
    };
    document.getElementById('import-history-retry').onclick = () => loadHistory();
}

function changeHistoryPage(page) {
    historyPage = Math.max(1, Math.min(Number.isSafeInteger(page) ? page : 1, historyTotalPages));
    loadHistory();
}

function setHistoryLoading(loading) {
    document.getElementById('import-history-table').setAttribute('aria-busy', String(loading));
    document.getElementById('import-history-prev').disabled = loading || historyPage <= 1;
    document.getElementById('import-history-next').disabled = loading || historyPage >= historyTotalPages;
    document.getElementById('import-history-page').disabled = loading;
    document.getElementById('import-history-go').disabled = loading;
}

async function loadHistory(resetPage = false) {
    clearTimeout(historySearchTimer);
    if (resetPage) historyPage = 1;
    historyController?.abort();
    const controller = new AbortController();
    historyController = controller;
    const empty = document.getElementById('import-history-empty');
    document.querySelector('#import-history-table tbody').replaceChildren();
    document.getElementById('import-history-error').hidden = true;
    document.getElementById('import-history-pagination').hidden = true;
    document.getElementById('import-history-count').textContent = 'Carregando lançamentos...';
    empty.style.display = 'block';
    empty.textContent = 'Carregando...';
    setHistoryLoading(true);
    try {
        const params = new URLSearchParams({ page: historyPage, pageSize: historyPageSize, search: historySearch, type: historyType });
        const res = await fetch(`${API_URL}/history?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (controller.signal.aborted) return;
        if (!Array.isArray(data.items)) throw new Error('Histórico inválido');
        historyPage = data.page;
        historyTotalPages = data.totalPages;
        renderHistory(data);
    } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Erro ao carregar histórico:', err);
        empty.style.display = 'none';
        document.getElementById('import-history-count').textContent = '';
        document.getElementById('import-history-error').hidden = false;
    } finally {
        if (historyController === controller) setHistoryLoading(false);
    }
}

function renderHistory({ items, total, page, pageSize, totalPages }) {
    const tbody = document.getElementById('import-history-table').querySelector('tbody');
    const empty = document.getElementById('import-history-empty');
    
    tbody.innerHTML = '';
    
    empty.style.display = items.length ? 'none' : 'block';
    empty.textContent = historySearch || historyType
        ? 'Nenhum lançamento encontrado para os filtros informados.'
        : 'Nenhuma importação encontrada.';
    const first = total ? (page - 1) * pageSize + 1 : 0;
    const last = total ? first + items.length - 1 : 0;
    document.getElementById('import-history-count').textContent = `Mostrando ${first}–${last} de ${total} lançamentos`;
    document.getElementById('import-history-pagination').hidden = total === 0;
    const pageInput = document.getElementById('import-history-page');
    pageInput.value = page;
    pageInput.max = totalPages;
    document.getElementById('import-history-pages').textContent = `de ${totalPages}`;
    
    items.forEach(imp => {
        const tr = document.createElement('tr');
        let typeLabel = '';
        let typeClass = '';
        if (imp.type === 'type1') { typeLabel = 'T1: Fornec'; typeClass = 'active'; }
        else if (imp.type === 'type2') { typeLabel = 'T2: Pedidos'; typeClass = ''; }
        else if (imp.type === 'adjustment') { typeLabel = 'Ajuste'; typeClass = ''; }

        tr.innerHTML = `
            <td></td>
            <td><span class="abc-chip ${typeClass}" ${imp.type === 'adjustment' ? 'style="background:#ca8a04;color:white;border-color:#ca8a04"' : ''}>${typeLabel}</span></td>
            <td><strong></strong></td>
            <td></td>
            <td></td>
            <td>
                <div class="import-history-actions">
                    <button type="button" class="import-history-view"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>Ver dados</button>
                    <button type="button" class="import-history-delete"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></svg></button>
                </div>
            </td>
        `;
        tr.cells[0].textContent = new Date(imp.createdAt).toLocaleDateString('pt-BR');
        tr.cells[2].querySelector('strong').textContent = imp.vendorKey;
        tr.cells[3].textContent = imp.periodText;
        tr.cells[3].title = imp.filename;
        tr.cells[4].textContent = imp.rowsCount;
        const viewButton = tr.querySelector('.import-history-view');
        viewButton.setAttribute('aria-label', `Ver dados do lançamento #${imp.id} de ${imp.vendorKey}`);
        viewButton.onclick = () => openImportDetails(imp.id);
        const deleteButton = tr.querySelector('.import-history-delete');
        deleteButton.setAttribute('aria-label', `Excluir lançamento de ${imp.vendorKey}`);
        deleteButton.onclick = () => window.deleteImport(imp.id, imp.type);
        tbody.appendChild(tr);
    });
}

// Global functions for HTML access
window.openImportDetails = openImportDetails;
window.closeImportDetails = closeImportDetails;

window.updateImportFileLabel = function(input) {
    const file = input.files?.[0];
    const label = document.getElementById(`${input.id}-name`);
    if (label) {
        label.textContent = file ? file.name : 'Nenhum arquivo selecionado';
        label.title = file ? file.name : '';
    }
    input.closest('.import-file-picker')?.classList.toggle('has-file', Boolean(file));
};

window.handleImportParse = async function(type, event) {
    if (type === 1) {
        const file = event.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            showLoading(true, 'Analisando planilha T1...');
            const res = await fetch(`${API_URL}/import/type1/parse`, { method: 'POST', body: formData });
            const result = await res.json();
            
            if (!res.ok) {
                throw new Error(result.error || 'Erro desconhecido no servidor.');
            }
            
            showPreview(1, result, file.name);
        } catch (err) {
            console.error('Erro T1:', err);
            alert('Erro ao processar arquivo T1: ' + err.message);
        } finally {
            showLoading(false);
        }
    } else {
        const fileA = document.getElementById('import-t2a').files[0];
        const fileB = document.getElementById('import-t2b').files[0];
        
        if (!fileA || !fileB) {
            alert('Selecione ambas as planilhas (A e B).');
            return;
        }
        
        const formData = new FormData();
        formData.append('fileA', fileA);
        formData.append('fileB', fileB);
        
        try {
            showLoading(true, 'Processando e cruzando dados T2...');
            const res = await fetch(`${API_URL}/import/type2/parse`, { method: 'POST', body: formData });
            const result = await res.json();
            
            if (!res.ok) {
                throw new Error(result.error || 'Erro desconhecido no servidor.');
            }
            
            showPreview(2, result, `${fileA.name} + ${fileB.name}`);
        } catch (err) {
            console.error('Erro T2:', err);
            alert('Erro ao processar arquivos T2: ' + err.message);
        } finally {
            showLoading(false);
        }
    }
};

let currentPreview = null;

function showPreview(type, result, filename) {
    if (!result || !result.data || result.data.length === 0) {
        alert('Aviso: Nenhum dado válido foi encontrado nesta planilha. Verifique se o formato está correto.');
        return;
    }

    currentPreview = { type, ...result, filename };
    
    document.getElementById('modal-import-confirm').style.display = 'flex';
    const info = document.getElementById('import-preview-info');
    info.innerHTML = `
        <div class="card" style="padding:10px">
            <div class="cs">TIPO</div>
            <div class="ct">Relatório ${type}</div>
        </div>
        <div class="card" style="padding:10px">
            <div class="cs">PERÍODO</div>
            <div class="ct">${result.periodText || 'Não identificado'}</div>
        </div>
        <div class="card" style="padding:10px">
            <div class="cs">REGISTROS</div>
            <div class="ct">${result.data.length}</div>
        </div>
    `;
    
    const tableWrap = document.getElementById('import-preview-table');
    const rows = result.data.slice(0, 50).map(item => `
        <tr>
            <td>${item.supplierName || item.clientName}</td>
            <td>${(item.value || item.totalValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td>${item.factoryKey || item.city || ''}</td>
        </tr>
    `).join('');
    
    tableWrap.innerHTML = `
        <table class="abc-table" style="font-size:11px">
            <thead>
                <tr>
                    <th>Nome</th>
                    <th>Valor</th>
                    <th>${type === 1 ? 'Fábrica' : 'Cidade'}</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
        ${result.data.length > 50 ? `<p style="padding:10px;font-size:10px;color:var(--text3)">Mostrando apenas os primeiros 50 registros...</p>` : ''}
    `;
    
    document.getElementById('btn-confirm-import').onclick = () => finalizeImport();
}

async function finalizeImport() {
    const vendorKey = document.getElementById('import-vendor-sel').value;
    if (!vendorKey) {
        alert('Selecione um vendedor para associar esta importação.');
        return;
    }
    
    try {
        showLoading(true);
        const payload = { ...currentPreview, vendorKey };
        const endpoint = currentPreview.type === 1 ? 'type1/confirm' : 'type2/confirm';
        
        const res = await fetch(`${API_URL}/import/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            alert('Importação realizada com sucesso!');
            document.getElementById('modal-import-confirm').style.display = 'none';
            loadHistory(true);
            // Trigger data reload in main app if needed
            if (window.refreshAppData) window.refreshAppData();
        } else {
            const err = await res.json();
            alert('Erro ao salvar: ' + err.error);
        }
    } catch (err) {
        alert('Erro de conexão: ' + err.message);
    } finally {
        showLoading(false);
    }
}

window.deleteImport = async function(id, type) {
    const message = type === 'adjustment'
        ? 'Excluir este ajuste? A diferença será retirada do faturamento mensal e dos relatórios.'
        : 'Tem certeza que deseja excluir esta importação? Isso removerá os dados do dashboard.';
    if (!confirm(message)) return;
    try {
        const res = await fetch(`${API_URL}/history/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadHistory();
            if (window.refreshAppData) window.refreshAppData();
        }
    } catch (err) {
        alert('Erro ao excluir: ' + err.message);
    }
};


function showLoading(show, message = 'Carregando...') {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.style = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:none;align-items:center;justify-content:center;z-index:9999;flex-direction:column;color:white;backdrop-filter:blur(3px);';
        overlay.innerHTML = `
            <div style="width:50px;height:50px;border:5px solid #f3f3f3;border-top:5px solid #2563eb;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:15px"></div>
            <div id="loading-message" style="font-family:Outfit,sans-serif;font-weight:600;font-size:16px"></div>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        `;
        document.body.appendChild(overlay);
    }
    
    if (show) {
        document.getElementById('loading-message').textContent = message;
        overlay.style.display = 'flex';
    } else {
        overlay.style.display = 'none';
    }
}

let adjustmentBalance = null;
let adjustmentController = null;
let adjustmentSaving = false;
const adjustmentElement = id => document.getElementById(id);
const adjustmentScope = () => ({
    vendorKey: adjustmentElement('adj-vendor').value,
    factoryKey: adjustmentElement('adj-factory').value,
    month: Number(adjustmentElement('adj-month').value),
    year: 2026
});
const adjustmentStatus = message => { adjustmentElement('adj-status').textContent = message; };

window.updateAdjustmentPreview = function() {
    const mode = adjustmentElement('adj-mode').value;
    adjustmentElement('adj-value-label').textContent = mode === 'target' ? 'Valor final correto da fábrica no mês (R$)' : 'Diferença a acrescentar ou subtrair (R$)';
    adjustmentElement('adj-value-hint').textContent = mode === 'target'
        ? 'Informe o total mensal correto. A diferença será calculada automaticamente.'
        : 'Use um valor negativo para subtrair. Exemplo: −0,08 para retirar oito centavos.';
    const preview = adjustmentPreview(adjustmentBalance, mode, parseAdjustmentMoney(adjustmentElement('adj-value').value));
    adjustmentElement('adj-current').textContent = adjustmentBalance ? fmt(adjustmentBalance.currentValue) : '—';
    adjustmentElement('adj-difference').textContent = preview ? `${preview.difference > 0 ? '+' : ''}${fmt(preview.difference)}` : '—';
    adjustmentElement('adj-corrected').textContent = preview ? fmt(preview.corrected) : '—';
    adjustmentElement('adj-vendor-total').textContent = preview ? fmt(preview.vendorTotal) : '—';
    adjustmentElement('adj-save').disabled = adjustmentSaving || !preview || preview.difference === 0;
};

window.refreshAdjustmentBalance = async function() {
    if (adjustmentSaving) return;
    adjustmentController?.abort();
    const controller = new AbortController();
    adjustmentController = controller;
    adjustmentBalance = null;
    adjustmentElement('adj-value').value = '';
    adjustmentStatus('Consultando o faturamento atual...');
    window.updateAdjustmentPreview();
    try {
        const response = await fetch(`${API_URL}/import/adjustment?${new URLSearchParams(adjustmentScope())}`, { signal: controller.signal, cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Falha ao consultar o faturamento.');
        if (adjustmentController !== controller) return;
        adjustmentBalance = result;
        if (adjustmentElement('adj-mode').value === 'target') {
            adjustmentElement('adj-value').value = result.currentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        adjustmentStatus(result.adjustmentValue ? `O valor atual já inclui ${fmt(result.adjustmentValue)} em ajustes deste mês.` : 'Confira o vendedor, a fábrica e o mês comercial antes de salvar.');
        window.updateAdjustmentPreview();
    } catch (error) {
        if (error.name !== 'AbortError' && adjustmentController === controller) adjustmentStatus(error.message + ' Use “Atualizar valor” para tentar novamente.');
    }
};

window.openAdjustmentModal = function() {
    if (adjustmentSaving) return;
    const now = new Date();
    adjustmentElement('adj-month').value = String(now.getFullYear() === 2026 ? now.getMonth() + 1 : 1);
    adjustmentElement('adj-mode').value = 'target';
    adjustmentElement('adj-description').value = '';
    adjustmentElement('modal-adjustment').style.display = 'flex';
    window.refreshAdjustmentBalance();
};

window.submitAdjustment = async function() {
    if (adjustmentSaving || !adjustmentBalance) return;
    const amount = parseAdjustmentMoney(adjustmentElement('adj-value').value);
    const mode = adjustmentElement('adj-mode').value;
    const preview = adjustmentPreview(adjustmentBalance, mode, amount);
    if (!preview || preview.difference === 0) {
        adjustmentStatus('Informe um valor válido com até duas casas decimais que altere o faturamento.');
        return;
    }
    adjustmentSaving = true;
    window.updateAdjustmentPreview();
    adjustmentElement('adj-controls').disabled = true;
    let saved = false;
    try {
        adjustmentStatus('Salvando ajuste...');
        const response = await fetch(`${API_URL}/import/adjustment`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...adjustmentScope(), mode, expectedValue: adjustmentBalance.currentValue,
                ...(mode === 'target' ? { targetValue: amount } : { value: amount }),
                description: adjustmentElement('adj-description').value.trim()
            })
        });
        const result = await response.json();
        if (!response.ok) {
            if (response.status === 409) adjustmentBalance = null;
            throw new Error(result.error || 'Erro ao salvar o ajuste.');
        }
        saved = true;
        adjustmentBalance = null;
        await loadHistory(true);
        if (window.refreshAppData) await window.refreshAppData();
        window.closeModal('adjustment');
        alert(`Ajuste salvo. O faturamento da fábrica no mês passou de ${fmt(result.previousValue)} para ${fmt(result.correctedValue)}.`);
    } catch (error) {
        // A connection failure may happen after the server saved the record. Require a fresh balance.
        adjustmentBalance = null;
        adjustmentStatus(saved
            ? 'O ajuste foi salvo, mas a tela não foi atualizada. Recarregue a página para consultar os valores.'
            : `${error.message} Atualize o valor atual e confira o histórico antes de tentar novamente.`);
    } finally {
        adjustmentSaving = false;
        adjustmentElement('adj-controls').disabled = false;
        window.updateAdjustmentPreview();
    }
};

window.syncCalendarImports = async function() {
    try {
        showLoading(true, 'Recalculando e sincronizando datas oficiais...');
        const res = await fetch(`${API_URL}/history/sync`, { method: 'POST' });
        const data = await res.json();
        alert(data.message || 'Sincronização concluída com sucesso!');
        loadHistory();
        if (window.refreshAppData) window.refreshAppData();
    } catch (err) {
        alert('Erro ao sincronizar: ' + err.message);
    } finally {
        showLoading(false);
    }
};
