document.addEventListener('DOMContentLoaded', () => {

    // =============================================
    // CONFIGURAÇÃO — Rota base sempre /logvert
    // =============================================
    const API = 'http://localhost:8080/logvert';
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
        window.location.href = '/pages/login/login.html';
        return;
    }

    // Welcome dinâmico
    const userName = localStorage.getItem('userName') || localStorage.getItem('consumidorNome') || 'Cliente';
    const welcomeEl = document.getElementById('welcome-user');
    if (welcomeEl) welcomeEl.textContent = `Bem-vindo, ${userName}`;

    // =============================================
    // SIDEBAR / MOBILE / DROPDOWNS
    // =============================================
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) sidebarToggle.addEventListener('click', () => document.body.classList.toggle('sidebar-collapsed'));

    const menuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.overlay');
    if (menuToggle) menuToggle.addEventListener('click', () => { sidebar?.classList.add('active'); overlay?.classList.add('active'); });
    if (overlay) overlay.addEventListener('click', () => { sidebar?.classList.remove('active'); overlay?.classList.remove('active'); });

    document.querySelectorAll('.header-action-btn').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const ddId = toggle.id.replace('Btn', 'Dropdown');
            const dd = document.getElementById(ddId);
            document.querySelectorAll('.dropdown-menu').forEach(m => { if (m.id !== ddId) m.classList.remove('active'); });
            if (dd) dd.classList.toggle('active');
        });
    });
    window.addEventListener('click', () => document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('active')));

    // Partículas
    if (document.getElementById('dashboard-particles') && typeof particlesJS !== 'undefined') {
        particlesJS("dashboard-particles", {
            particles: { number: { value: 50, density: { enable: true, value_area: 800 } }, color: { value: "#ffffff" }, shape: { type: "circle" }, opacity: { value: 0.2, random: true }, size: { value: 3, random: true }, line_linked: { enable: true, distance: 150, color: "#ffffff", opacity: 0.1, width: 1 }, move: { enable: true, speed: 1.5, direction: "none", random: true, out_mode: "out" } },
            interactivity: { detect_on: "canvas", events: { onhover: { enable: true, mode: "grab" }, resize: true }, modes: { grab: { distance: 140, line_linked: { opacity: 0.3 } } } },
            retina_detect: true
        });
    }

    // =============================================
    // HELPERS
    // =============================================
    const getStatusClass = (s) => ({ 'Pendente': 'status-pending', 'Aprovada': 'status-approved', 'Em Trânsito': 'status-sent', 'Concluída': 'status-completed', 'Rejeitada': 'status-rejected', 'Cancelada': 'status-cancelled' }[s] || 'status-pending');

    const feedbackDiv = document.getElementById('feedback-message');
    const showFeedback = (msg, type) => {
        if (!feedbackDiv) return;
        feedbackDiv.textContent = msg;
        feedbackDiv.className = `feedback-message ${type}`;
        feedbackDiv.style.display = 'block';
        setTimeout(() => { feedbackDiv.style.display = 'none'; }, 5000);
    };

    // =============================================
    // LISTAR SOLICITAÇÕES DO CONSUMIDOR
    // GET /logvert/solicitacoes?page=0&size=50&sort=dataSolicitacao,desc
    // =============================================
    const grid = document.getElementById('solicitacoes-cliente-grid');
    const loadingDiv = document.getElementById('loading-solicitacoes');
    const emptyDiv = document.getElementById('empty-message');
    let solicitacoesData = [];

    async function loadMinhasSolicitacoes() {
        if (!grid) return;

        try {
            const resp = await fetch(`${API}/solicitacoes?page=0&size=50&sort=dataSolicitacao,desc`, { headers: jsonHeaders() });

            if (resp.status === 401) {
                showFeedback('Sessão expirada. Faça login novamente.', 'error');
                setTimeout(() => { window.location.href = '/pages/login/login.html'; }, 2000);
                return;
            }
            if (!resp.ok) throw new Error(`Erro ${resp.status}`);

            const data = await resp.json();
            const sols = data.content || [];
            solicitacoesData = sols;

            if (loadingDiv) loadingDiv.style.display = 'none';
            if (sols.length === 0) { if (emptyDiv) emptyDiv.style.display = 'block'; return; }
            if (emptyDiv) emptyDiv.style.display = 'none';

            renderSolicitacoes(sols);

        } catch (err) {
            console.error('Erro ao carregar solicitações:', err);
            if (loadingDiv) loadingDiv.innerHTML = '<i class="fas fa-exclamation-triangle fa-2x" style="color:#e53935;"></i><p>Erro ao carregar solicitações.</p>';
        }
    }

    function renderSolicitacoes(sols) {
        grid.innerHTML = sols.map(sol => {
            const canEdit = sol.statusSolicitacao === 'Pendente';
            const canCancel = sol.statusSolicitacao === 'Pendente' || sol.statusSolicitacao === 'Aprovada';

            return `
                <div class="card" data-id="${sol.id}">
                    <div class="card-header">
                        <h3>Solicitação #${sol.id}</h3>
                        <span class="status-badge ${getStatusClass(sol.statusSolicitacao)}">${sol.statusSolicitacao}</span>
                    </div>
                    <p class="card-product">${sol.tipo} — ${sol.motivo || ''}</p>
                    <small style="color: var(--text-muted);">${sol.dataSolicitacao || ''}</small>
                    <div style="margin-top: 10px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <a href="#" class="card-details" data-id="${sol.id}">Ver detalhes <i class="fa-solid fa-arrow-right"></i></a>
                        ${canEdit ? `<a href="#" class="card-edit" data-id="${sol.id}" style="color: var(--neon-green-accent); text-decoration: none; font-weight: 500;"><i class="fas fa-edit"></i> Editar</a>` : ''}
                        ${canCancel ? `<a href="#" class="card-cancel" data-id="${sol.id}" style="color: #e53935; text-decoration: none; font-weight: 500;">Cancelar</a>` : ''}
                    </div>
                </div>`;
        }).join('');

        grid.querySelectorAll('.card-details').forEach(btn => btn.addEventListener('click', (e) => { e.preventDefault(); openDetailsModal(btn.dataset.id); }));
        grid.querySelectorAll('.card-edit').forEach(btn => btn.addEventListener('click', (e) => { e.preventDefault(); openEditModal(btn.dataset.id); }));
        grid.querySelectorAll('.card-cancel').forEach(btn => btn.addEventListener('click', (e) => { e.preventDefault(); cancelarSolicitacao(btn.dataset.id); }));
    }

    // =============================================
    // MODAL DE DETALHES
    // =============================================
    let currentSolId = null;

    function openDetailsModal(id) {
        const sol = solicitacoesData.find(s => String(s.id) === String(id));
        if (!sol) return;
        currentSolId = id;

        const modal = document.getElementById('modalDetalhes');
        if (!modal) return;

        const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.textContent = val || '—'; };
        set('modalPedido', `Solicitação #${sol.id}`);
        const ms = document.getElementById('modalStatus');
        if (ms) { ms.textContent = sol.statusSolicitacao; ms.className = `status-badge ${getStatusClass(sol.statusSolicitacao)}`; }
        set('modalProduto', `Venda #${sol.idVenda}`);
        set('modalTipo', sol.tipo);
        set('modalMotivo', sol.motivo);
        set('modalData', sol.dataSolicitacao);
        set('modalAtualizacao', sol.dataAtualizacao || 'Sem atualização');

        const canCancel = sol.statusSolicitacao === 'Pendente' || sol.statusSolicitacao === 'Aprovada';
        const canEdit = sol.statusSolicitacao === 'Pendente';
        const actions = document.getElementById('modal-consumer-actions');
        if (actions) actions.style.display = canCancel ? 'block' : 'none';
        const btnEdit = document.getElementById('btn-editar-sol');
        if (btnEdit) btnEdit.style.display = canEdit ? 'inline-flex' : 'none';

        modal.classList.add('active');
    }

    // Fechar modal detalhes
    document.addEventListener('click', (e) => {
        if (e.target.closest('.modal-close-btn') && e.target.closest('#modalDetalhes')) {
            document.getElementById('modalDetalhes')?.classList.remove('active');
        }
        if (e.target.id === 'modalDetalhes') {
            document.getElementById('modalDetalhes')?.classList.remove('active');
        }
    });

    // Botões do modal de detalhes
    const btnEditarModal = document.getElementById('btn-editar-sol');
    if (btnEditarModal) btnEditarModal.addEventListener('click', () => { if (currentSolId) openEditModal(currentSolId); });

    const btnCancelar = document.getElementById('btn-cancelar-sol');
    if (btnCancelar) btnCancelar.addEventListener('click', () => { if (currentSolId) cancelarSolicitacao(currentSolId); });

    // =============================================
    // EDITAR SOLICITAÇÃO — PUT /logvert/solicitacoes/{id}
    // multipart/form-data: solicitacao (JSON) + anexos (files)
    // =============================================
    const editModal = document.getElementById('modalEditar');
    const closeEditBtn = document.getElementById('closeEditModal');
    const formEditar = document.getElementById('form-editar-solicitacao');
    const editErrorMsg = document.getElementById('edit-error-msg');

    function openEditModal(id) {
        const sol = solicitacoesData.find(s => String(s.id) === String(id));
        if (!sol) return;

        document.getElementById('modalDetalhes')?.classList.remove('active');

        document.getElementById('edit-sol-id').value = sol.id;

        // Tipo
        const tipoSel = document.getElementById('edit-tipo');
        if (sol.tipo) {
            const t = sol.tipo.toLowerCase();
            tipoSel.value = (t === 'troca') ? 'troca' : (t.includes('devol') ? 'devolucao' : '');
        }

        // Motivo
        const motivoSel = document.getElementById('edit-motivo');
        const detalhes = document.getElementById('edit-detalhes');
        const predef = ['Tamanho incorreto', 'Produto com defeito na costura', 'Arrependimento', 'Item enviado errado'];
        if (predef.includes(sol.motivo)) { motivoSel.value = sol.motivo; detalhes.value = ''; }
        else { motivoSel.value = 'Outro'; detalhes.value = sol.motivo || ''; }

        document.getElementById('edit-idItem').value = '';
        document.getElementById('edit-quantidade').value = '';
        document.getElementById('edit-anexos').value = '';
        if (editErrorMsg) editErrorMsg.style.display = 'none';

        if (editModal) editModal.classList.add('active');
    }

    if (closeEditBtn) closeEditBtn.addEventListener('click', () => editModal?.classList.remove('active'));
    if (editModal) editModal.addEventListener('click', (e) => { if (e.target === editModal) editModal.classList.remove('active'); });

    if (formEditar) {
        formEditar.addEventListener('submit', async (e) => {
            e.preventDefault();

            const solId = document.getElementById('edit-sol-id').value;
            const idItem = parseInt(document.getElementById('edit-idItem').value);
            const quantidade = parseFloat(document.getElementById('edit-quantidade').value);
            const tipo = document.getElementById('edit-tipo').value;
            const motivoVal = document.getElementById('edit-motivo').value;
            const detalhesVal = document.getElementById('edit-detalhes').value;
            const anexosInput = document.getElementById('edit-anexos');

            const motivo = motivoVal === 'Outro' ? detalhesVal : motivoVal;

            if (!idItem || idItem < 1) { showEditError('Informe o ID do item.'); return; }
            if (!quantidade || quantidade < 1) { showEditError('Informe a quantidade.'); return; }
            if (!tipo) { showEditError('Selecione o tipo.'); return; }
            if (!motivo) { showEditError('Selecione ou descreva o motivo.'); return; }

            const fd = new FormData();
            fd.append('solicitacao', new Blob([JSON.stringify({ idItem, quantidade, tipo, motivo })], { type: 'application/json' }));
            if (anexosInput && anexosInput.files.length > 0) {
                for (let i = 0; i < anexosInput.files.length; i++) fd.append('anexos', anexosInput.files[i]);
            }

            const btn = document.getElementById('btn-salvar-edicao');
            btn.disabled = true; btn.textContent = 'Salvando...';

            try {
                const resp = await fetch(`${API}/solicitacoes/${solId}`, {
                    method: 'PUT', headers: multipartHeaders(), body: fd
                });

                if (resp.ok) {
                    editModal?.classList.remove('active');
                    showFeedback('Solicitação editada com sucesso!', 'success');
                    loadMinhasSolicitacoes();
                } else if (resp.status === 400) { showEditError('Tipo de arquivo inválido.');
                } else if (resp.status === 401) { showEditError('Sessão expirada.'); setTimeout(() => { window.location.href = '/pages/login/login.html'; }, 2000);
                } else if (resp.status === 403) { showEditError('Acesso negado.');
                } else if (resp.status === 404) { showEditError('Solicitação ou item não encontrado.');
                } else if (resp.status === 409) { showEditError('Não pode ser alterada no status atual.');
                } else if (resp.status === 422) { showEditError('Erro de validação.');
                } else { showEditError('Erro inesperado.'); }

            } catch (err) {
                console.error('Erro ao editar:', err);
                showEditError('Erro de conexão.');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';
            }
        });
    }

    function showEditError(msg) {
        if (editErrorMsg) { editErrorMsg.textContent = msg; editErrorMsg.style.display = 'block'; }
    }

    // =============================================
    // CANCELAR SOLICITAÇÃO — PUT /logvert/solicitacoes/cancelar/{id}
    // Body: { idItem, quantidade, tipo, motivo }
    // =============================================
    async function cancelarSolicitacao(id) {
        if (!confirm('Deseja cancelar esta solicitação? Esta ação não pode ser desfeita.')) return;

        const sol = solicitacoesData.find(s => String(s.id) === String(id));
        if (!sol) { showFeedback('Solicitação não encontrada.', 'error'); return; }

        const body = {
            idItem: 1,
            quantidade: 1.0,
            tipo: sol.tipo ? sol.tipo.toLowerCase() : 'troca',
            motivo: 'Desistência do consumidor'
        };

        try {
            const resp = await fetch(`${API}/solicitacoes/cancelar/${id}`, {
                method: 'PUT', headers: jsonHeaders(), body: JSON.stringify(body)
            });

            if (resp.ok) {
                showFeedback('Solicitação cancelada com sucesso.', 'success');
                document.getElementById('modalDetalhes')?.classList.remove('active');
                loadMinhasSolicitacoes();
            } else if (resp.status === 401) { showFeedback('Sessão expirada.', 'error');
            } else if (resp.status === 403) { showFeedback('Acesso negado.', 'error');
            } else if (resp.status === 404) { showFeedback('Solicitação não encontrada.', 'error');
            } else if (resp.status === 409) { showFeedback('Não pode ser cancelada no status atual.', 'error');
            } else { showFeedback('Erro ao cancelar.', 'error'); }

        } catch (err) {
            console.error('Erro ao cancelar:', err);
            showFeedback('Erro de conexão.', 'error');
        }
    }

    // =============================================
    // LOGOUT
    // =============================================
    document.querySelectorAll('a[href*="login"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = '/pages/login/login.html';
        });
    });

    // =============================================
    // INICIALIZAÇÃO
    // =============================================
    if (grid) loadMinhasSolicitacoes();
});
