document.addEventListener('DOMContentLoaded', () => {

    // =============================================
    // CONFIGURAÇÃO — Rota base sempre /logvert
    // =============================================
    const API = 'http://localhost:8080/logvert';
    const PAGE_SIZE = 10;
    let currentPage = 0;
    let currentSolicitacaoId = null;
    let currentSolicitacaoTipo = null;

    const getToken = () => localStorage.getItem('authToken');

    const jsonHeaders = () => ({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
    });

    const multipartHeaders = () => ({
        'Accept': 'application/json',
        'Authorization': `Bearer ${getToken()}`
    });

    // =============================================
    // VERIFICAÇÃO DE AUTENTICAÇÃO
    // =============================================
    if (!getToken()) {
        window.location.href = '/login';
        return;
    }

    // =============================================
    // PARTÍCULAS
    // =============================================
    if (document.getElementById('dashboard-particles') && typeof particlesJS !== 'undefined') {
        particlesJS("dashboard-particles", {
            particles: { number: { value: 50, density: { enable: true, value_area: 800 } }, color: { value: "#1A73E8" }, shape: { type: "circle" }, opacity: { value: 0.2, random: true }, size: { value: 3, random: true }, line_linked: { enable: true, distance: 150, color: "#ffffff", opacity: 0.1, width: 1 }, move: { enable: true, speed: 1.5, direction: "none", random: true, out_mode: "out" } },
            interactivity: { detect_on: "canvas", events: { onhover: { enable: true, mode: "grab" }, resize: true }, modes: { grab: { distance: 140, line_linked: { opacity: 0.3 } } } },
            retina_detect: true
        });
    }

    // =============================================
    // ELEMENTOS DOM
    // =============================================
    const tbody = document.getElementById('solicitacoes-tbody');
    const paginationControls = document.getElementById('pagination-controls');
    const btnPrev = document.getElementById('btn-prev-page');
    const btnNext = document.getElementById('btn-next-page');
    const paginationInfo = document.getElementById('pagination-info');
    const feedbackDiv = document.getElementById('feedback-message');
    const modalOverlay = document.getElementById('detailsModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modalLoading = document.getElementById('modal-loading');
    const modalContent = document.getElementById('modal-details-content');

    // =============================================
    // HELPERS
    // =============================================
    const showFeedback = (msg, type) => {
        if (!feedbackDiv) return;
        feedbackDiv.textContent = msg;
        feedbackDiv.className = `feedback-message ${type}`;
        feedbackDiv.style.display = 'block';
        setTimeout(() => { feedbackDiv.style.display = 'none'; }, 5000);
    };

    const getStatusClass = (s) => ({ 'Pendente': 'status-pending', 'Aprovada': 'status-approved', 'Em Trânsito': 'status-transit', 'Concluída': 'status-completed', 'Rejeitada': 'status-rejected', 'Cancelada': 'status-cancelled' }[s] || 'status-pending');
    const getTypeClass = (t) => t === 'Troca' ? 'type-troca' : 'type-devolucao';

    const openModal = () => { if (modalOverlay) modalOverlay.classList.add('active'); };
    const closeModal = () => { if (modalOverlay) modalOverlay.classList.remove('active'); currentSolicitacaoId = null; currentSolicitacaoTipo = null; };

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

    // =============================================
    // 1. LISTAR SOLICITAÇÕES — GET /logvert/solicitacoes
    // =============================================
    async function loadSolicitacoes(page = 0) {
        try {
            const resp = await fetch(`${API}/solicitacoes?page=${page}&size=${PAGE_SIZE}&sort=dataSolicitacao,desc`, { headers: jsonHeaders() });

            if (resp.status === 401) {
                showFeedback('Sessão expirada. Faça login novamente.', 'error');
                setTimeout(() => { window.location.href = '/login'; }, 2000);
                return;
            }
            if (!resp.ok) throw new Error(`Erro ${resp.status}`);

            const data = await resp.json();
            renderTable(data.content || []);
            renderPagination(data);
            updateStats(data.content || []);
            currentPage = page;

        } catch (err) {
            console.error('Erro ao carregar solicitações:', err);
            if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);"><i class="fas fa-exclamation-triangle"></i> Erro ao carregar.</td></tr>';
        }
    }

    function renderTable(sols) {
        if (!tbody) return;
        if (sols.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">Nenhuma solicitação encontrada.</td></tr>';
            return;
        }

        tbody.innerHTML = sols.map(sol => `
            <tr class="row-clickable" data-id="${sol.id}">
                <td><span class="text-highlight">#${sol.id}</span></td>
                <td>${sol.dataSolicitacao || '—'}</td>
                <td>${sol.consumidor || '—'}</td>
                <td>#${sol.idVenda || '—'}</td>
                <td><span class="badge ${getTypeClass(sol.tipo)}">${sol.tipo}</span></td>
                <td><span class="status-badge ${getStatusClass(sol.statusSolicitacao)}">${sol.statusSolicitacao}</span></td>
                <td class="action-buttons">
                    <button class="btn-icon btn-view-details" data-id="${sol.id}" title="Ver Detalhes">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.btn-view-details').forEach(btn => {
            btn.addEventListener('click', (e) => { e.stopPropagation(); loadSolicitacaoDetails(btn.dataset.id); });
        });
        document.querySelectorAll('.row-clickable').forEach(row => {
            row.addEventListener('click', () => loadSolicitacaoDetails(row.dataset.id));
        });
    }

    function renderPagination(data) {
        if (!paginationControls) return;
        if (data.totalPages <= 1) { paginationControls.style.display = 'none'; return; }
        paginationControls.style.display = 'flex';
        if (paginationInfo) paginationInfo.textContent = `Página ${data.number + 1} de ${data.totalPages}`;
        if (btnPrev) btnPrev.disabled = data.first;
        if (btnNext) btnNext.disabled = data.last;
    }

    function updateStats(sols) {
        const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
        el('stat-pendentes', sols.filter(s => s.statusSolicitacao === 'Pendente').length);
        el('stat-andamento', sols.filter(s => s.statusSolicitacao === 'Aprovada' || s.statusSolicitacao === 'Em Trânsito').length);
        el('stat-total', sols.length);
    }

    if (btnPrev) btnPrev.addEventListener('click', () => loadSolicitacoes(currentPage - 1));
    if (btnNext) btnNext.addEventListener('click', () => loadSolicitacoes(currentPage + 1));

    // =============================================
    // 2. DETALHES — GET /logvert/solicitacoes/{id}
    // =============================================
    async function loadSolicitacaoDetails(id) {
        currentSolicitacaoId = id;
        openModal();
        if (modalLoading) modalLoading.style.display = 'block';
        if (modalContent) modalContent.style.display = 'none';

        try {
            const resp = await fetch(`${API}/solicitacoes/${id}`, { headers: jsonHeaders() });

            if (resp.status === 401) { showFeedback('Sessão expirada.', 'error'); closeModal(); return; }
            if (resp.status === 403) { showFeedback('Acesso negado. Solicitação de outra loja.', 'error'); closeModal(); return; }
            if (resp.status === 404) { showFeedback('Solicitação não encontrada.', 'error'); closeModal(); return; }
            if (!resp.ok) throw new Error(`Erro ${resp.status}`);

            const sol = await resp.json();
            currentSolicitacaoTipo = sol.tipo;
            renderModalDetails(sol);
            loadFeedbacks(id);

        } catch (err) {
            console.error('Erro ao carregar detalhes:', err);
            showFeedback('Erro ao carregar detalhes.', 'error');
            closeModal();
        }
    }

    async function loadFeedbacks(idSol) {
        const div = document.getElementById('modal-feedbacks-list');
        if (!div) return;
        div.innerHTML = '<p style="color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Carregando...</p>';

        try {
            const resp = await fetch(`${API}/feedbacks/solicitacoes/${idSol}`, { headers: jsonHeaders() });
            if (resp.ok) {
                const fbs = await resp.json();
                if (fbs && fbs.length > 0) {
                    div.innerHTML = fbs.map(f => `
                        <div class="data-group" style="margin-bottom:8px; padding:8px; border-left:3px solid #f39c12; background:rgba(243,156,18,0.05); border-radius:4px;">
                            <p><strong>${f.nomeConsumidor || 'Anônimo'}</strong> <span style="margin-left:8px; font-size:0.8rem; color:#f39c12; background:rgba(243,156,18,0.12); padding:2px 8px; border-radius:12px;">${f.tipoFeedback || '—'}</span> — ${'★'.repeat(Math.min(5, f.nota))}${'☆'.repeat(5 - Math.min(5, f.nota))}</p>
                            <small style="color:var(--text-muted);">${f.comentario || ''} (${f.dataFeedback || '—'})</small>
                        </div>
                    `).join('');
                } else { div.innerHTML = '<p style="color:var(--text-muted);">Nenhum feedback.</p>'; }
            } else { div.innerHTML = '<p style="color:var(--text-muted);">Nenhum feedback.</p>'; }
        } catch (err) { div.innerHTML = '<p style="color:var(--text-muted);">Erro ao carregar feedbacks.</p>'; }
    }

    function renderModalDetails(sol) {
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };

        set('modal-sol-id', `#${sol.id}`);

        // Consumidor
        const c = sol.consumidor || {};
        set('modal-consumidor-nome', c.nome);
        set('modal-consumidor-cpf', c.cpf_cnpj);
        set('modal-consumidor-email', c.email);
        set('modal-consumidor-celular', c.celular);
        set('modal-consumidor-endereco', c.endereco);

        // Venda
        const v = sol.venda || {};
        set('modal-venda-id', v.idVenda);
        set('modal-venda-serial', v.serial);
        set('modal-venda-criacao', v.dataCriacao);
        set('modal-venda-entrega', v.dataEntrega);

        // Produto
        const p = sol.produto || {};
        set('modal-produto-descricao', p.descricao);
        set('modal-produto-preco-original', p.precoOriginal ? `R$ ${p.precoOriginal.toFixed(2)}` : '—');
        set('modal-produto-preco-vendido', p.precoVendido ? `R$ ${p.precoVendido.toFixed(2)}` : '—');
        set('modal-produto-quantidade', p.quantidade);

        // Solicitação
        const tipoEl = document.getElementById('modal-sol-tipo');
        if (tipoEl) tipoEl.innerHTML = `<span class="badge ${getTypeClass(sol.tipo)}">${sol.tipo}</span>`;
        set('modal-sol-motivo', sol.motivo);
        set('modal-sol-quantidade', sol.quantidade);
        set('modal-sol-data', sol.dataSolicitacao);
        const statusEl = document.getElementById('modal-sol-status');
        if (statusEl) statusEl.innerHTML = `<span class="status-badge ${getStatusClass(sol.statusSolicitacao)}">${sol.statusSolicitacao}</span>`;

        // Anexos
        const anexosDiv = document.getElementById('modal-anexos-list');
        if (anexosDiv) {
            if (sol.anexos && sol.anexos.length > 0) {
                anexosDiv.innerHTML = sol.anexos.map((url, i) => `<p><a href="${url}" target="_blank" class="text-link"><i class="fas fa-external-link-alt"></i> Anexo ${i + 1}</a></p>`).join('');
            } else { anexosDiv.innerHTML = '<p style="color:var(--text-muted);">Nenhum anexo.</p>'; }
        }

        // Histórico
        const histDiv = document.getElementById('modal-historico-list');
        if (histDiv) {
            if (sol.historico && sol.historico.length > 0) {
                histDiv.innerHTML = sol.historico.map(h => `
                    <div class="data-group" style="margin-bottom:8px; padding:8px; border-left:3px solid var(--primary-blue); background:rgba(26,115,232,0.05); border-radius:4px;">
                        <p><strong>${h.statusAnterior}</strong> → <strong>${h.statusNovo}</strong></p>
                        <small style="color:var(--text-muted);">${h.dataAtualizacao} — ${h.observacao || ''}</small>
                    </div>
                `).join('');
            } else { histDiv.innerHTML = '<p style="color:var(--text-muted);">Nenhum histórico.</p>'; }
        }

        // Ações condicionais
        const actPendente = document.getElementById('modal-actions-pendente');
        const actAtualizar = document.getElementById('modal-actions-atualizar');
        if (actPendente) actPendente.style.display = sol.statusSolicitacao === 'Pendente' ? 'block' : 'none';
        if (actAtualizar) actAtualizar.style.display = (sol.statusSolicitacao === 'Aprovada' || sol.statusSolicitacao === 'Em Trânsito') ? 'block' : 'none';

        if (modalLoading) modalLoading.style.display = 'none';
        if (modalContent) modalContent.style.display = 'block';
    }

    // =============================================
    // 3. APROVAR — PUT /logvert/solicitacoes/aprovar/{id}
    // =============================================
    const btnAprovar = document.getElementById('btn-aprovar');
    if (btnAprovar) {
        btnAprovar.addEventListener('click', async () => {
            if (!currentSolicitacaoId || !confirm('Deseja aprovar esta solicitação?')) return;
            btnAprovar.disabled = true;
            try {
                const resp = await fetch(`${API}/solicitacoes/aprovar/${currentSolicitacaoId}`, { method: 'PUT', headers: jsonHeaders() });
                if (resp.ok) { showFeedback('Solicitação aprovada!', 'success'); closeModal(); loadSolicitacoes(currentPage); }
                else if (resp.status === 409) showFeedback('Não pode ser aprovada no status atual.', 'error');
                else showFeedback('Erro ao aprovar.', 'error');
            } catch (err) { showFeedback('Erro de conexão.', 'error'); }
            finally { btnAprovar.disabled = false; }
        });
    }

    // =============================================
    // 4. REPROVAR — PUT /logvert/solicitacoes/reprovar/{id}
    // =============================================
    const btnReprovar = document.getElementById('btn-reprovar');
    if (btnReprovar) {
        btnReprovar.addEventListener('click', async () => {
            if (!currentSolicitacaoId || !confirm('Deseja reprovar esta solicitação?')) return;
            btnReprovar.disabled = true;
            try {
                const resp = await fetch(`${API}/solicitacoes/reprovar/${currentSolicitacaoId}`, { method: 'PUT', headers: jsonHeaders() });
                if (resp.ok) { showFeedback('Solicitação reprovada.', 'success'); closeModal(); loadSolicitacoes(currentPage); }
                else if (resp.status === 409) showFeedback('Não pode ser reprovada no status atual.', 'error');
                else showFeedback('Erro ao reprovar.', 'error');
            } catch (err) { showFeedback('Erro de conexão.', 'error'); }
            finally { btnReprovar.disabled = false; }
        });
    }

    // =============================================
    // 5. ATUALIZAR STATUS — POST /logvert/solicitacoes/atualizar/{id}
    // multipart/form-data: historico (JSON) + novosProdutos (JSON, opcional)
    // =============================================
    const statusSelect = document.getElementById('status-novo');
    const novosProdSection = document.getElementById('novos-produtos-section');

    if (statusSelect) {
        statusSelect.addEventListener('change', () => {
            const show = statusSelect.value === 'Concluída' && currentSolicitacaoTipo === 'Troca';
            if (novosProdSection) novosProdSection.style.display = show ? 'block' : 'none';
        });
    }

    // Adicionar produto
    const btnAddProd = document.getElementById('btn-add-produto');
    if (btnAddProd) {
        btnAddProd.addEventListener('click', () => {
            const list = document.getElementById('novos-produtos-list');
            const div = document.createElement('div');
            div.className = 'data-group';
            div.style.cssText = 'margin-bottom:10px; padding:10px; border:1px solid var(--border-color); border-radius:6px;';
            div.innerHTML = `
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                    <div><label style="font-size:0.85rem; color:var(--text-muted);">ID Produto</label>
                    <input type="number" class="np-idProduto" required style="width:100%; padding:6px; border-radius:4px; border:1px solid var(--border-color); background:var(--card-background); color:var(--text-light);"></div>
                    <div><label style="font-size:0.85rem; color:var(--text-muted);">Quantidade</label>
                    <input type="number" step="0.1" class="np-quantidade" required value="1" style="width:100%; padding:6px; border-radius:4px; border:1px solid var(--border-color); background:var(--card-background); color:var(--text-light);"></div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                    <div><label style="font-size:0.85rem; color:var(--text-muted);">Detalhe</label>
                    <input type="text" class="np-detalhe" placeholder="Ex: Tamanho M" style="width:100%; padding:6px; border-radius:4px; border:1px solid var(--border-color); background:var(--card-background); color:var(--text-light);"></div>
                    <div><label style="font-size:0.85rem; color:var(--text-muted);">Valor (R$)</label>
                    <input type="number" step="0.01" class="np-valorVendido" required style="width:100%; padding:6px; border-radius:4px; border:1px solid var(--border-color); background:var(--card-background); color:var(--text-light);"></div>
                </div>
                <button type="button" onclick="this.parentElement.remove()" style="margin-top:5px; background:none; border:none; color:#e53935; cursor:pointer; font-size:0.85rem;"><i class="fas fa-trash"></i> Remover</button>
            `;
            list.appendChild(div);
        });
    }

    // Submit atualizar status
    const formAtualizar = document.getElementById('form-atualizar-status');
    if (formAtualizar) {
        formAtualizar.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentSolicitacaoId) return;

            const statusNovo = document.getElementById('status-novo').value;
            const observacao = document.getElementById('observacao-status').value;
            if (!statusNovo || !observacao) { showFeedback('Preencha status e observação.', 'error'); return; }

            const fd = new FormData();
            fd.append('historico', new Blob([JSON.stringify({ statusNovo, observacao })], { type: 'application/json' }));

            // Novos produtos (para troca concluída)
            if (statusNovo === 'Concluída' && currentSolicitacaoTipo === 'Troca') {
                const prods = document.querySelectorAll('#novos-produtos-list > .data-group');
                if (prods.length > 0) {
                    const novosProdutos = Array.from(prods).map(el => ({
                        idProduto: parseInt(el.querySelector('.np-idProduto').value),
                        quantidade: parseFloat(el.querySelector('.np-quantidade').value),
                        detalhe: el.querySelector('.np-detalhe').value,
                        valorVendido: parseFloat(el.querySelector('.np-valorVendido').value)
                    }));
                    fd.append('novosProdutos', new Blob([JSON.stringify(novosProdutos)], { type: 'application/json' }));
                }
            }

            const btn = formAtualizar.querySelector('button[type="submit"]');
            btn.disabled = true;

            try {
                const resp = await fetch(`${API}/solicitacoes/atualizar/${currentSolicitacaoId}`, {
                    method: 'POST', headers: multipartHeaders(), body: fd
                });

                if (resp.ok) { showFeedback('Status atualizado!', 'success'); closeModal(); loadSolicitacoes(currentPage); }
                else if (resp.status === 409) showFeedback('Não pode ser atualizada no status atual.', 'error');
                else if (resp.status === 422) showFeedback('Erro de validação.', 'error');
                else showFeedback('Erro ao atualizar.', 'error');

            } catch (err) { showFeedback('Erro de conexão.', 'error'); }
            finally { btn.disabled = false; }
        });
    }

    // =============================================
    // INICIALIZAÇÃO
    // =============================================
    loadSolicitacoes(0);
});