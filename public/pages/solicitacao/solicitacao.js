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
    // ELEMENTOS DOM
    // =============================================
    const form = document.getElementById('form-solicitacao');
    const formCard = document.getElementById('form-card');
    const successMsg = document.getElementById('successMessage');
    const errorMsg = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const submitBtn = document.getElementById('btn-submit');
    const loadingItens = document.getElementById('loading-itens');
    const noItensMsg = document.getElementById('no-itens-message');
    const itemSelect = document.getElementById('idItem');
    const itemInfoCard = document.getElementById('item-info');

    const showError = (msg) => {
        if (errorText) errorText.textContent = msg;
        if (errorMsg) { errorMsg.style.display = 'flex'; errorMsg.scrollIntoView({ behavior: 'smooth' }); }
    };

    // =============================================
    // CARREGAR ITENS — GET /logvert/vendas/me (consumidor)
    // Fallback: GET /logvert/vendas (backend filtra pelo token)
    // =============================================
    let itensCache = [];

    async function carregarItens() {
        if (!itemSelect) return;

        try {
            // Tenta endpoint do consumidor primeiro
            let resp = await fetch(`${API}/vendas/me`, { headers: jsonHeaders() });

            // Fallback para listagem geral (backend filtra pelo token do consumidor)
            if (!resp.ok && resp.status !== 401) {
                resp = await fetch(`${API}/vendas?page=0&size=100&sort=dataCriacao,desc`, { headers: jsonHeaders() });
            }

            if (resp.status === 401) {
                showError('Sessão expirada. Faça login novamente.');
                setTimeout(() => { window.location.href = '/pages/login/login.html'; }, 2000);
                return;
            }
            if (!resp.ok) throw new Error(`Erro ${resp.status}`);

            const data = await resp.json();

            // Normaliza — pode ser array, paginado ou objeto único
            let vendas = [];
            if (Array.isArray(data)) vendas = data;
            else if (data.content) vendas = data.content;
            else if (data.idVenda || data.id) vendas = [data];

            // Extrai itens de todas as vendas
            itensCache = [];
            vendas.forEach(v => {
                (v.itens || []).forEach(item => {
                    itensCache.push({
                        idItem: item.id || item.idItem,
                        idVenda: v.idVenda || v.id,
                        serial: v.serial || `Venda #${v.idVenda || v.id}`,
                        produto: item.produto?.descricao || item.descricao || `Produto #${item.produto?.id || item.idProduto || '?'}`,
                        quantidade: item.quantidade || 1,
                        precoVendido: item.precoVendido || 0
                    });
                });
            });

            if (loadingItens) loadingItens.style.display = 'none';

            if (itensCache.length === 0) {
                if (noItensMsg) noItensMsg.style.display = 'block';
                return;
            }

            // Popula dropdown
            itemSelect.innerHTML = '<option value="">Selecione um item...</option>';
            itensCache.forEach(it => {
                const opt = document.createElement('option');
                opt.value = it.idItem;
                opt.textContent = `${it.produto} — ${it.serial} (Qtd: ${it.quantidade})`;
                itemSelect.appendChild(opt);
            });

            if (form) form.style.display = 'block';

        } catch (err) {
            console.error('Erro ao carregar itens:', err);
            if (loadingItens) loadingItens.innerHTML = '<i class="fas fa-exclamation-triangle fa-lg" style="color:#e53935;"></i><p>Erro ao carregar itens.</p>';
        }
    }

    // Info do item selecionado
    if (itemSelect) {
        itemSelect.addEventListener('change', () => {
            const id = itemSelect.value;
            if (!id) { if (itemInfoCard) itemInfoCard.style.display = 'none'; return; }

            const item = itensCache.find(i => String(i.idItem) === id);
            if (item && itemInfoCard) {
                document.getElementById('info-produto').textContent = item.produto;
                document.getElementById('info-venda').textContent = item.serial;
                document.getElementById('info-quantidade').textContent = item.quantidade;
                document.getElementById('info-preco').textContent = `R$ ${parseFloat(item.precoVendido).toFixed(2)}`;
                itemInfoCard.style.display = 'block';
            }
        });
    }

    // =============================================
    // CRIAR SOLICITAÇÃO — POST /logvert/solicitacoes/criar
    // multipart/form-data: solicitacao (JSON) + anexos (files)
    // =============================================
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (errorMsg) errorMsg.style.display = 'none';

            const idItem = parseInt(itemSelect.value);
            const quantidade = parseFloat(document.getElementById('quantidade').value);
            const tipo = document.getElementById('tipo-solicitacao').value;
            const motivoVal = document.getElementById('motivo').value;
            const detalhes = document.getElementById('detalhes').value;
            const anexosInput = document.getElementById('anexos');

            const motivo = motivoVal === 'Outro' ? detalhes : motivoVal;

            // Validações
            if (!idItem || idItem < 1) { showError('Selecione um item da sua compra.'); return; }
            if (!quantidade || quantidade < 1) { showError('Informe a quantidade.'); return; }
            if (!tipo) { showError('Selecione o tipo de solicitação.'); return; }
            if (!motivo) { showError('Selecione ou descreva o motivo.'); return; }

            // Monta FormData
            const fd = new FormData();
            const solicitacao = { idItem, quantidade, tipo, motivo };
            fd.append('solicitacao', new Blob([JSON.stringify(solicitacao)], { type: 'application/json' }));

            if (anexosInput && anexosInput.files.length > 0) {
                for (let i = 0; i < anexosInput.files.length; i++) {
                    fd.append('anexos', anexosInput.files[i]);
                }
            }

            submitBtn.disabled = true;
            submitBtn.querySelector('.btn-text').textContent = 'Enviando...';

            try {
                const resp = await fetch(`${API}/solicitacoes/criar`, {
                    method: 'POST',
                    headers: multipartHeaders(),
                    body: fd
                });

                if (resp.ok) {
                    if (formCard) formCard.style.display = 'none';
                    if (successMsg) { successMsg.style.display = 'flex'; successMsg.scrollIntoView({ behavior: 'smooth' }); }
                    form.reset();
                    // Redireciona para Minhas Solicitações
                    setTimeout(() => { window.location.href = '/pages/menu.cliente/menuCliente.html'; }, 2500);

                } else if (resp.status === 400) { showError('Tipo de arquivo inválido. Envie apenas imagens ou vídeos.');
                } else if (resp.status === 401) { showError('Sessão expirada.'); setTimeout(() => { window.location.href = '/pages/login/login.html'; }, 2000);
                } else if (resp.status === 404) { showError('Venda ou item não encontrado.');
                } else if (resp.status === 409) {
                    let msg = 'Não foi possível criar a solicitação.';
                    try { const t = await resp.text(); if (t) msg = t; } catch(x){}
                    showError(msg);
                } else if (resp.status === 422) { showError('Erro de validação. Verifique os campos.');
                } else { showError('Erro inesperado. Tente novamente.'); }

            } catch (err) {
                console.error('Erro ao criar solicitação:', err);
                showError('Erro de conexão. Verifique sua internet.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.querySelector('.btn-text').textContent = 'Enviar Solicitação';
            }
        });
    }

    // INIT
    carregarItens();
});
