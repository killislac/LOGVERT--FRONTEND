/**
 * FAQ Page (Lojista) - Feedbacks API Integration
 * Endpoints:
 *   1. GET /logvert/feedbacks/{id}                    — Buscar feedback por ID (Bearer Token)
 *   2. GET /logvert/feedbacks/solicitacoes/{id}        — Buscar feedbacks por solicitação (Bearer Token)
 *   3. GET /logvert/feedbacks/lojas/{idLoja}?periodo=180 — Listar feedbacks da loja (Público)
 *   4. GET /logvert/solicitacoes?page=0&size=100       — Listar solicitações da loja (Bearer Token)
 */

document.addEventListener('DOMContentLoaded', function () {

    // =============================================
    // CONFIGURAÇÃO
    // =============================================
    const AUTH_API_URL = 'http://localhost:8080/logvert';

    // =============================================
    // ELEMENTOS DOM
    // =============================================
    const feedbackDiv         = document.getElementById('feedback-message');
    const resultsSection      = document.getElementById('feedback-results');
    const resultsTitle        = document.getElementById('results-title');
    const cardsContainer      = document.getElementById('feedback-cards-container');
    const emptyResults        = document.getElementById('empty-results');
    const btnClearResults     = document.getElementById('btn-clear-results');

    // Dropdown A — Solicitações
    const solicitacaoWrapper      = document.getElementById('solicitacaoSelectWrapper');
    const solicitacaoTrigger      = document.getElementById('solicitacaoTrigger');
    const solicitacaoDropdown     = document.getElementById('solicitacaoDropdown');
    const solicitacaoSearchInput  = document.getElementById('solicitacaoSearchInput');
    const solicitacaoOptionsList  = document.getElementById('solicitacaoOptionsList');
    const solicitacaoPlaceholder  = document.getElementById('solicitacaoPlaceholder');
    const solicitacaoLoadingIcon  = document.getElementById('solicitacaoLoadingIcon');

    // Dropdown B — Feedbacks da Loja
    const feedbackWrapper      = document.getElementById('feedbackSelectWrapper');
    const feedbackTrigger      = document.getElementById('feedbackTrigger');
    const feedbackDropdown     = document.getElementById('feedbackDropdown');
    const feedbackSearchInput  = document.getElementById('feedbackSearchInput');
    const feedbackOptionsList  = document.getElementById('feedbackOptionsList');
    const feedbackPlaceholder  = document.getElementById('feedbackPlaceholder');
    const feedbackLoadingIcon  = document.getElementById('feedbackLoadingIcon');

    // =============================================
    // FUNÇÕES AUXILIARES
    // =============================================
    const getToken = () => localStorage.getItem('authToken');

    const authHeaders = () => ({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
    });

    /**
     * Decodifica o payload do JWT (Base64) sem biblioteca externa.
     * Retorna o objeto de claims ou null em caso de falha.
     */
    const decodeJwtPayload = (token) => {
        try {
            const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            return JSON.parse(atob(base64));
        } catch (_) {
            return null;
        }
    };

    /**
     * Extrai o idLoja do JWT armazenado no localStorage.
     */
    const getIdLoja = () => {
        const token = getToken();
        if (!token) return null;
        const payload = decodeJwtPayload(token);
        return payload ? payload.idLoja : null;
    };

    const showFeedback = (message, type) => {
        if (!feedbackDiv) return;
        feedbackDiv.textContent = message;
        feedbackDiv.className = `feedback-msg ${type}`;
        feedbackDiv.style.display = 'block';
        setTimeout(() => { feedbackDiv.style.display = 'none'; }, 5000);
    };

    /**
     * Renderiza estrelas (★/☆) com base na nota (1-5)
     */
    const renderStars = (nota) => {
        const n = Math.max(1, Math.min(5, nota || 1));
        return '★'.repeat(n) + '☆'.repeat(5 - n);
    };

    /**
     * Renderiza um card de feedback seguindo o contrato da API:
     * { idFeedback, tipoFeedback, nota, comentario, dataFeedback, idConsumidor, nomeConsumidor, idLoja, idSolicitacao }
     */
    const renderFeedbackCard = (f) => `
        <div class="feedback-card">
            <div class="feedback-card-header">
                <span class="feedback-id">#${f.idFeedback ?? f.idSolicitacao ?? '—'}</span>
                <span class="feedback-tipo-badge">${f.tipoFeedback || '—'}</span>
            </div>
            <div class="feedback-stars">${renderStars(f.nota)}</div>
            <p class="feedback-comentario">${f.comentario || 'Sem comentário.'}</p>
            <div class="feedback-card-footer">
                <span class="feedback-consumidor">
                    <i class="fas fa-user"></i> ${f.nomeConsumidor || 'Anônimo'}
                </span>
                <span class="feedback-data">
                    <i class="fas fa-calendar-alt"></i> ${f.dataFeedback || '—'}
                </span>
            </div>
            <div class="feedback-card-meta">
                <span><i class="fas fa-store"></i> Loja: ${f.idLoja ?? '—'}</span>
                <span><i class="fas fa-clipboard-list"></i> Solicitação: ${f.idSolicitacao ?? '—'}</span>
            </div>
        </div>
    `;

    /**
     * Exibe os feedbacks na área de resultados
     */
    const showResults = (feedbacks, title) => {
        if (!feedbacks || feedbacks.length === 0) {
            resultsSection.style.display = 'none';
            emptyResults.style.display = 'block';
            return;
        }
        emptyResults.style.display = 'none';
        resultsTitle.innerHTML = `<i class="fas fa-list"></i> ${title}`;
        cardsContainer.innerHTML = feedbacks.map(renderFeedbackCard).join('');
        resultsSection.style.display = 'block';
    };

    const clearResults = () => {
        resultsSection.style.display = 'none';
        emptyResults.style.display = 'none';
        cardsContainer.innerHTML = '';
    };

    // =============================================
    // DROPDOWN HELPERS — abrir/fechar
    // =============================================
    const abrirDropdown = (wrapper, searchInput) => {
        wrapper.classList.add('open');
        setTimeout(() => { if (searchInput) searchInput.focus(); }, 80);
    };

    const fecharDropdown = (wrapper, searchInput, renderFn, cache) => {
        wrapper.classList.remove('open');
        if (searchInput) searchInput.value = '';
        if (renderFn && cache) renderFn(cache);
    };

    // Fecha todos os dropdowns ao clicar fora
    document.addEventListener('click', (e) => {
        if (solicitacaoWrapper && !solicitacaoWrapper.contains(e.target)) {
            solicitacaoWrapper.classList.remove('open');
            if (solicitacaoSearchInput) solicitacaoSearchInput.value = '';
        }
        if (feedbackWrapper && !feedbackWrapper.contains(e.target)) {
            feedbackWrapper.classList.remove('open');
            if (feedbackSearchInput) feedbackSearchInput.value = '';
        }
    });

    // =============================================
    // DROPDOWN A — SOLICITAÇÕES
    // GET /logvert/solicitacoes?page=0&size=100
    // Retorna: Page<SolicitacaoResumidaDTO>
    // Campos: { id, consumidor, idVenda, tipo, motivo, dataSolicitacao, statusSolicitacao, status }
    // =============================================
    let solicitacoesCache = [];

    const renderSolicitacaoOptions = (lista, searchTerm = '') => {
        solicitacaoOptionsList.innerHTML = '';

        if (lista.length === 0) {
            const msg = searchTerm
                ? `Nenhuma solicitação para "${searchTerm}"`
                : 'Nenhuma solicitação encontrada.';
            solicitacaoOptionsList.innerHTML = `<li class="faq-option-empty">${msg}</li>`;
            return;
        }

        lista.forEach(s => {
            const li = document.createElement('li');
            li.className = 'faq-option-item';
            li.dataset.id = s.id;
            li.innerHTML = `
                <div class="faq-option-avatar faq-option-avatar--blue">
                    <i class="fas fa-clipboard-list"></i>
                </div>
                <div class="faq-option-info">
                    <span class="faq-option-name">${s.consumidor || 'Consumidor'} — ${s.tipo || ''}</span>
                    <span class="faq-option-detail">${s.statusSolicitacao || ''} · ${s.dataSolicitacao || ''}</span>
                </div>
                <span class="faq-option-id">#${s.id}</span>
            `;
            li.addEventListener('click', () => selecionarSolicitacao(s));
            solicitacaoOptionsList.appendChild(li);
        });
    };

    const selecionarSolicitacao = async (sol) => {
        // Atualiza o trigger com a opção selecionada
        solicitacaoTrigger.innerHTML = `
            <div class="faq-selected-chip">
                <div class="faq-option-avatar faq-option-avatar--blue" style="width:28px;height:28px;font-size:0.7rem;">
                    <i class="fas fa-clipboard-list"></i>
                </div>
                <span class="faq-chip-name">${sol.consumidor || 'Consumidor'} — ${sol.tipo || ''}</span>
                <span class="faq-chip-id">#${sol.id}</span>
            </div>
            <i class="fas fa-chevron-down faq-select-arrow"></i>
        `;
        solicitacaoWrapper.classList.remove('open');
        if (solicitacaoSearchInput) solicitacaoSearchInput.value = '';

        // Busca feedbacks da solicitação selecionada
        try {
            const response = await fetch(`${AUTH_API_URL}/feedbacks/solicitacoes/${sol.id}`, {
                method: 'GET',
                headers: authHeaders()
            });

            if (response.status === 200) {
                const feedbacks = await response.json();
                const total = Array.isArray(feedbacks) ? feedbacks.length : 0;
                showResults(
                    Array.isArray(feedbacks) ? feedbacks : [],
                    `Feedbacks da Solicitação #${sol.id} (${total} encontrado${total !== 1 ? 's' : ''})`
                );
                if (total > 0) showFeedback(`✓ ${total} feedback(s) encontrado(s).`, 'success');

            } else if (response.status === 401) {
                showFeedback('✗ Sessão expirada. Faça login novamente.', 'error');
                setTimeout(() => { window.location.href = '/login'; }, 2000);

            } else if (response.status === 404) {
                clearResults();
                emptyResults.style.display = 'block';
                showFeedback('✗ Nenhum feedback encontrado para esta solicitação.', 'error');

            } else {
                showFeedback('✗ Erro ao buscar feedbacks desta solicitação.', 'error');
            }

        } catch (error) {
            console.error('Erro ao buscar feedbacks por solicitação:', error);
            showFeedback('✗ Erro de conexão.', 'error');
        }
    };

    const carregarSolicitacoesDropdown = async () => {
        solicitacaoOptionsList.innerHTML = `<li class="faq-option-loading"><i class="fas fa-spinner fa-spin"></i> Carregando...</li>`;

        try {
            const response = await fetch(
                `${AUTH_API_URL}/solicitacoes?page=0&size=100&sort=dataSolicitacao,desc`,
                { method: 'GET', headers: authHeaders() }
            );

            if (response.status === 401) {
                showFeedback('✗ Sessão expirada. Faça login novamente.', 'error');
                setTimeout(() => { window.location.href = '/login'; }, 2000);
                return;
            }

            if (!response.ok) throw new Error(`Status: ${response.status}`);

            const dados = await response.json();
            let lista = [];
            if (Array.isArray(dados)) lista = dados;
            else if (dados && Array.isArray(dados.content)) lista = dados.content;

            solicitacoesCache = lista;

            // Atualiza o placeholder
            solicitacaoPlaceholder.innerHTML = lista.length > 0
                ? 'Selecione uma solicitação...'
                : 'Nenhuma solicitação encontrada';
            if (solicitacaoLoadingIcon) solicitacaoLoadingIcon.style.display = 'none';

            renderSolicitacaoOptions(lista);

        } catch (error) {
            console.error('Erro ao carregar solicitações:', error);
            solicitacaoOptionsList.innerHTML = `<li class="faq-option-empty"><i class="fas fa-exclamation-circle"></i> Erro ao carregar solicitações.</li>`;
            solicitacaoPlaceholder.textContent = 'Erro ao carregar';
            if (solicitacaoLoadingIcon) solicitacaoLoadingIcon.style.display = 'none';
        }
    };

    // Toggle dropdown A
    if (solicitacaoTrigger) {
        solicitacaoTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (solicitacaoWrapper.classList.contains('open')) {
                solicitacaoWrapper.classList.remove('open');
            } else {
                feedbackWrapper && feedbackWrapper.classList.remove('open');
                abrirDropdown(solicitacaoWrapper, solicitacaoSearchInput);
            }
        });
    }

    // Search dropdown A
    if (solicitacaoSearchInput) {
        solicitacaoSearchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            if (!term) { renderSolicitacaoOptions(solicitacoesCache); return; }
            const filtered = solicitacoesCache.filter(s => {
                const consumidor = (s.consumidor || '').toLowerCase();
                const tipo = (s.tipo || '').toLowerCase();
                const id = String(s.id);
                const status = (s.statusSolicitacao || '').toLowerCase();
                return consumidor.includes(term) || tipo.includes(term) || id.includes(term) || status.includes(term);
            });
            renderSolicitacaoOptions(filtered, e.target.value);
        });
        solicitacaoSearchInput.addEventListener('keydown', (e) => e.stopPropagation());
    }

    // =============================================
    // DROPDOWN B — FEEDBACKS DA LOJA
    // GET /logvert/feedbacks/lojas/{idLoja}?periodo=180
    // Retorna: Page<FeedbackResumidoDTO>
    // Campos: { idSolicitacao, nomeConsumidor, comentario, nota, dataFeedback }
    // Endpoint PÚBLICO — não exige Bearer Token
    // =============================================
    let feedbacksCache = [];

    const renderFeedbackOptions = (lista, searchTerm = '') => {
        feedbackOptionsList.innerHTML = '';

        if (lista.length === 0) {
            const msg = searchTerm
                ? `Nenhum feedback para "${searchTerm}"`
                : 'Nenhum feedback encontrado.';
            feedbackOptionsList.innerHTML = `<li class="faq-option-empty">${msg}</li>`;
            return;
        }

        lista.forEach(f => {
            const li = document.createElement('li');
            li.className = 'faq-option-item';
            li.dataset.idSolicitacao = f.idSolicitacao;
            li.innerHTML = `
                <div class="faq-option-avatar faq-option-avatar--gold">
                    <i class="fas fa-star"></i>
                </div>
                <div class="faq-option-info">
                    <span class="faq-option-name">${f.nomeConsumidor || 'Anônimo'} — ${'★'.repeat(Math.max(1, Math.min(5, f.nota || 1)))}</span>
                    <span class="faq-option-detail">${f.comentario ? f.comentario.substring(0, 50) + (f.comentario.length > 50 ? '…' : '') : 'Sem comentário'} · ${f.dataFeedback || ''}</span>
                </div>
                <span class="faq-option-id">#${f.idSolicitacao}</span>
            `;
            li.addEventListener('click', () => selecionarFeedback(f));
            feedbackOptionsList.appendChild(li);
        });
    };

    const selecionarFeedback = async (f) => {
        // Atualiza o trigger com o item selecionado
        feedbackTrigger.innerHTML = `
            <div class="faq-selected-chip">
                <div class="faq-option-avatar faq-option-avatar--gold" style="width:28px;height:28px;font-size:0.7rem;">
                    <i class="fas fa-star"></i>
                </div>
                <span class="faq-chip-name">${f.nomeConsumidor || 'Anônimo'} — ${'★'.repeat(Math.max(1, Math.min(5, f.nota || 1)))}</span>
                <span class="faq-chip-id">#${f.idSolicitacao}</span>
            </div>
            <i class="fas fa-chevron-down faq-select-arrow"></i>
        `;
        feedbackWrapper.classList.remove('open');
        if (feedbackSearchInput) feedbackSearchInput.value = '';

        // Busca todos os feedbacks da solicitação associada
        try {
            const response = await fetch(`${AUTH_API_URL}/feedbacks/solicitacoes/${f.idSolicitacao}`, {
                method: 'GET',
                headers: authHeaders()
            });

            if (response.status === 200) {
                const feedbacks = await response.json();
                const total = Array.isArray(feedbacks) ? feedbacks.length : 0;
                showResults(
                    Array.isArray(feedbacks) ? feedbacks : [],
                    `Feedbacks da Solicitação #${f.idSolicitacao} (${total} encontrado${total !== 1 ? 's' : ''})`
                );
                if (total > 0) showFeedback(`✓ ${total} feedback(s) encontrado(s).`, 'success');

            } else if (response.status === 401) {
                showFeedback('✗ Sessão expirada. Faça login novamente.', 'error');
                setTimeout(() => { window.location.href = '/login'; }, 2000);

            } else if (response.status === 404) {
                clearResults();
                emptyResults.style.display = 'block';
                showFeedback('✗ Feedback não encontrado.', 'error');

            } else {
                showFeedback('✗ Erro ao buscar o feedback.', 'error');
            }

        } catch (error) {
            console.error('Erro ao buscar feedback:', error);
            showFeedback('✗ Erro de conexão.', 'error');
        }
    };

    const carregarFeedbacksDropdown = async () => {
        const idLoja = getIdLoja();

        if (!idLoja) {
            feedbackOptionsList.innerHTML = `<li class="faq-option-empty"><i class="fas fa-exclamation-circle"></i> Não foi possível identificar a loja. Faça login novamente.</li>`;
            feedbackPlaceholder.textContent = 'Loja não identificada';
            if (feedbackLoadingIcon) feedbackLoadingIcon.style.display = 'none';
            return;
        }

        feedbackOptionsList.innerHTML = `<li class="faq-option-loading"><i class="fas fa-spinner fa-spin"></i> Carregando...</li>`;

        try {
            // Endpoint público — não exige token
            const response = await fetch(
                `${AUTH_API_URL}/feedbacks/lojas/${idLoja}?periodo=180&page=0&size=100`,
                { method: 'GET', headers: { 'Accept': 'application/json' } }
            );

            if (!response.ok) throw new Error(`Status: ${response.status}`);

            const dados = await response.json();
            let lista = [];
            if (Array.isArray(dados)) lista = dados;
            else if (dados && Array.isArray(dados.content)) lista = dados.content;

            feedbacksCache = lista;

            feedbackPlaceholder.textContent = lista.length > 0
                ? 'Selecione um feedback...'
                : 'Nenhum feedback nos últimos 180 dias';
            if (feedbackLoadingIcon) feedbackLoadingIcon.style.display = 'none';

            renderFeedbackOptions(lista);

        } catch (error) {
            console.error('Erro ao carregar feedbacks da loja:', error);
            feedbackOptionsList.innerHTML = `<li class="faq-option-empty"><i class="fas fa-exclamation-circle"></i> Erro ao carregar feedbacks.</li>`;
            feedbackPlaceholder.textContent = 'Erro ao carregar';
            if (feedbackLoadingIcon) feedbackLoadingIcon.style.display = 'none';
        }
    };

    // Toggle dropdown B
    if (feedbackTrigger) {
        feedbackTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (feedbackWrapper.classList.contains('open')) {
                feedbackWrapper.classList.remove('open');
            } else {
                solicitacaoWrapper && solicitacaoWrapper.classList.remove('open');
                abrirDropdown(feedbackWrapper, feedbackSearchInput);
            }
        });
    }

    // Search dropdown B
    if (feedbackSearchInput) {
        feedbackSearchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            if (!term) { renderFeedbackOptions(feedbacksCache); return; }
            const filtered = feedbacksCache.filter(f => {
                const nome = (f.nomeConsumidor || '').toLowerCase();
                const comentario = (f.comentario || '').toLowerCase();
                const id = String(f.idSolicitacao);
                return nome.includes(term) || comentario.includes(term) || id.includes(term);
            });
            renderFeedbackOptions(filtered, e.target.value);
        });
        feedbackSearchInput.addEventListener('keydown', (e) => e.stopPropagation());
    }

    // =============================================
    // LIMPAR RESULTADOS
    // =============================================
    if (btnClearResults) {
        btnClearResults.addEventListener('click', () => {
            clearResults();
            // Reseta trigger do dropdown A
            if (solicitacaoTrigger) {
                solicitacaoTrigger.innerHTML = `
                    <span class="faq-select-placeholder">Selecione uma solicitação...</span>
                    <i class="fas fa-chevron-down faq-select-arrow"></i>
                `;
            }
            // Reseta trigger do dropdown B
            if (feedbackTrigger) {
                feedbackTrigger.innerHTML = `
                    <span class="faq-select-placeholder">Selecione um feedback...</span>
                    <i class="fas fa-chevron-down faq-select-arrow"></i>
                `;
            }
        });
    }

    // =============================================
    // CARGA INICIAL — carrega os dois dropdowns
    // =============================================
    carregarSolicitacoesDropdown();
    carregarFeedbacksDropdown();
});