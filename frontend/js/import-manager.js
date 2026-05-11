const API_URL = '/api';

export async function initImportPage() {
    loadHistory();
}

async function loadHistory() {
    try {
        const res = await fetch(`${API_URL}/history`);
        const imports = await res.json();
        renderHistory(imports);
    } catch (err) {
        console.error('Erro ao carregar histórico:', err);
    }
}

function renderHistory(imports) {
    const tbody = document.getElementById('import-history-table').querySelector('tbody');
    const empty = document.getElementById('import-history-empty');
    
    tbody.innerHTML = '';
    
    if (!imports || imports.length === 0) {
        empty.style.display = 'block';
        return;
    }
    
    empty.style.display = 'none';
    
    imports.forEach(imp => {
        const tr = document.createElement('tr');
        let typeLabel = '';
        let typeClass = '';
        if (imp.type === 'type1') { typeLabel = 'T1: Fornec'; typeClass = 'active'; }
        else if (imp.type === 'type2') { typeLabel = 'T2: Pedidos'; typeClass = ''; }
        else if (imp.type === 'adjustment') { typeLabel = 'Ajuste'; typeClass = ''; }

        tr.innerHTML = `
            <td>${new Date(imp.createdAt).toLocaleDateString()}</td>
            <td><span class="abc-chip ${typeClass}" ${imp.type === 'adjustment' ? 'style="background:#ca8a04;color:white;border-color:#ca8a04"' : ''}>${typeLabel}</span></td>
            <td><strong>${imp.vendorKey}</strong></td>
            <td>${imp.periodText}</td>
            <td>${imp.rowsCount}</td>
            <td>
                <button onclick="window.deleteImport(${imp.id})" style="color:#ef4444;background:none;border:none;cursor:pointer;font-size:16px">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Global functions for HTML access
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
            loadHistory();
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

window.deleteImport = async function(id) {
    if (!confirm('Tem certeza que deseja excluir esta importação? Isso removerá os dados do dashboard.')) return;
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

// Global functions for Adjustment Modal
window.openAdjustmentModal = function() {
    // Reset fields
    document.getElementById('adj-vendor').value = 'solisnando';
    document.getElementById('adj-factory').value = 'pian';
    document.getElementById('adj-month').value = '4'; // Abril as default
    document.getElementById('adj-value').value = '';
    document.getElementById('adj-description').value = '';
    
    document.getElementById('modal-adjustment').style.display = 'flex';
};

window.submitAdjustment = async function() {
    const vendorKey = document.getElementById('adj-vendor').value;
    const factoryKey = document.getElementById('adj-factory').value;
    const month = document.getElementById('adj-month').value;
    const value = document.getElementById('adj-value').value;
    const description = document.getElementById('adj-description').value;

    if (!value || isNaN(value)) {
        alert('Por favor, insira um valor numérico válido.');
        return;
    }

    try {
        showLoading(true, 'Salvando ajuste...');
        const payload = {
            vendorKey,
            factoryKey,
            month: parseInt(month),
            year: 2026, // Assuming 2026 as per dashboard current year
            value: parseFloat(value),
            description
        };

        const res = await fetch(`${API_URL}/import/adjustment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert('Ajuste salvo com sucesso!');
            window.closeModal('adjustment');
            loadHistory();
            if (window.refreshAppData) window.refreshAppData();
        } else {
            const err = await res.json();
            alert('Erro ao salvar ajuste: ' + err.error);
        }
    } catch (err) {
        alert('Erro de conexão: ' + err.message);
    } finally {
        showLoading(false);
    }
};
