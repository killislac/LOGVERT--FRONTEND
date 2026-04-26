document.addEventListener('DOMContentLoaded', () => {

    // =============================================
    // 1. REFERÊNCIAS DO DOM
    // =============================================
    const tableBody = document.getElementById('vendasTableBody');
    const vendaFormModal = document.getElementById('vendaFormModal');
    const openModalBtn = document.getElementById('openModalBtn');
    const closeVendaFormBtn = document.getElementById('closeVendaFormModalBtn');
    const vendaForm = document.getElementById('vendaForm');
    const vendaMessage = document.getElementById('vendaMessage');
    const submitVendaBtn = document.getElementById('submitVendaBtn');

    const detalhesModal = document.getElementById('detalhesVendaModal');
    const closeDetalhesBtn = document.getElementById('closeDetalhesModalBtn');
    const btnEditarDetalhes = document.getElementById('btnEditarVendaDetalhes');
    const btnDesativarDetalhes = document.getElementById('btnDesativarVendaDetalhes');

    const confirmOverlay = document.getElementById('confirmOverlay');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmIcon = document.getElementById('confirmIcon');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    const confirmOkBtn = document.getElementById('confirmOkBtn');
    const toastContainer = document.getElementById('toastContainer');

    // KPIs
    const statReceitaTotal = document.getElementById('statReceitaTotal');
    const statEmAndamento = document.getElementById('statEmAndamento');
    const statTicketMedio = document.getElementById('statTicketMedio');
    const statEntregues = document.getElementById('statEntregues');

    // Estado
    let editingVendaId = null;  // null = criar, number = editar
    let vendaDetalheAtual = null; // venda carregada no modal de detalhes

    // ✅ Rota correta — API_BASE_URL já contém /logvert
    const VENDAS_URL = `${API_BASE_URL}/vendas`;
    const CONSUMIDORES_URL = `${API_BASE_URL}/consumidores`;
    const PRODUTOS_URL = `${API_BASE_URL}/produtos`;

    let produtosCache = [];

    // Container de itens da venda
    const itensContainer = document.getElementById('itensVendaContainer');
    const btnAddItem = document.getElementById('btnAddItem');

    // Consumidor searchable select
    const consumidorWrapper = document.getElementById('consumidorSelectWrapper');
    const consumidorTrigger = document.getElementById('consumidorTrigger');
    const consumidorDropdown = document.getElementById('consumidorDropdown');
    const consumidorSearchInput = document.getElementById('consumidorSearchInput');
    const consumidorOptionsList = document.getElementById('consumidorOptionsList');
    const idConsumidorHidden = document.getElementById('idConsumidor');

    let consumidoresCache = [];
    let selectedConsumidorId = null;

    // =============================================
    // 2a. GERENCIAMENTO DE ITENS DA VENDA (campos estruturados)
    // =============================================
    let itemCounter = 1; // Contador para labels dos itens

    const criarItemRow = (dados = {}) => {
        const idx = itemCounter++;
        const row = document.createElement('div');
        row.className = 'item-venda-row';
        row.setAttribute('data-index', idx);

        // Determina o texto de exibição inicial do produto
        let produtoTriggerContent = `<span class="select-search-value placeholder">Selecione um produto...</span>`;
        if (dados.idProduto) {
            // Tenta encontrar o produto no cache
            const prod = produtosCache.find(p => p.idProduto === parseInt(dados.idProduto));
            if (prod) {
                produtoTriggerContent = `
                    <div class="selected-consumer-chip">
                        <div class="option-avatar" style="background:linear-gradient(135deg,#f39c12,#e67e22);font-size:0.6rem;">📦</div>
                        <span class="chip-name">${prod.descricao}</span>
                        <span class="chip-id">#${prod.idProduto}</span>
                    </div>`;
            } else {
                produtoTriggerContent = `
                    <div class="selected-consumer-chip">
                        <div class="option-avatar" style="background:linear-gradient(135deg,#f39c12,#e67e22);font-size:0.6rem;">📦</div>
                        <span class="chip-name">Produto #${dados.idProduto}</span>
                        <span class="chip-id">#${dados.idProduto}</span>
                    </div>`;
            }
        }

        row.innerHTML = `
            <div class="item-row-header">
                <span class="item-row-label">Item ${idx}</span>
                <button type="button" class="btn-remove-item" title="Remover item">&times;</button>
            </div>
            <div class="item-row-fields">
                <div class="item-field item-field-produto">
                    <label>Produto <span class="required">*</span></label>
                    <div class="select-search-wrapper produto-select-wrapper">
                        <div class="select-search-trigger produto-trigger" tabindex="0">
                            ${produtoTriggerContent}
                            <i class="fas fa-chevron-down select-search-arrow"></i>
                        </div>
                        <div class="select-search-dropdown produto-dropdown">
                            <div class="select-search-input-wrapper">
                                <i class="fas fa-search"></i>
                                <input type="text" class="produto-search-input"
                                       placeholder="Buscar produto..."
                                       autocomplete="off">
                            </div>
                            <ul class="select-search-options produto-options-list">
                                <li class="select-search-loading">
                                    <i class="fas fa-spinner fa-spin"></i> Carregando...
                                </li>
                            </ul>
                        </div>
                    </div>
                    <input type="hidden" data-field="idProduto" value="${dados.idProduto || ''}" required>
                </div>
                <div class="item-field">
                    <label>Quantidade <span class="required">*</span></label>
                    <input type="number" data-field="quantidade" min="1" step="1" value="${dados.quantidade || 1}" placeholder="Ex: 2" required>
                </div>
                <div class="item-field">
                    <label>Valor Vendido (R$) <span class="required">*</span></label>
                    <input type="number" data-field="valorVendido" min="0" step="0.01" value="${dados.valorVendido || ''}" placeholder="Ex: 89.90" required>
                </div>
                <div class="item-field">
                    <label>Detalhe</label>
                    <input type="text" data-field="detalhe" value="${dados.detalhe || ''}" placeholder="Ex: Tamanho G">
                </div>
            </div>
        `;

        // Wire up the product dropdown for this row
        initProdutoDropdown(row);
        return row;
    };

    // Initialize product dropdown events for a given item row
    const initProdutoDropdown = (row) => {
        const wrapper = row.querySelector('.produto-select-wrapper');
        const trigger = row.querySelector('.produto-trigger');
        const searchInput = row.querySelector('.produto-search-input');
        const optionsList = row.querySelector('.produto-options-list');
        const hiddenInput = row.querySelector('[data-field="idProduto"]');

        if (!wrapper || !trigger) return;

        const renderProdutoOptions = (produtos, searchTerm = '') => {
            optionsList.innerHTML = '';
            if (produtos.length === 0) {
                const msg = searchTerm
                    ? `Nenhum produto para "${searchTerm}"`
                    : 'Nenhum produto cadastrado.';
                optionsList.innerHTML = `<li class="no-results">${msg}</li>`;
                return;
            }
            const selectedId = parseInt(hiddenInput.value);
            produtos.forEach(p => {
                const li = document.createElement('li');
                li.dataset.id = p.idProduto;
                if (selectedId === p.idProduto) li.classList.add('selected');
                const precoFmt = `R$ ${parseFloat(p.preco || 0).toFixed(2).replace('.', ',')}`;
                li.innerHTML = `
                    <div class="option-avatar" style="background:linear-gradient(135deg,#f39c12,#e67e22);font-size:0.6rem;">📦</div>
                    <div class="option-info">
                        <span class="option-name">${p.descricao || 'Sem descrição'}</span>
                        <span class="option-detail">${precoFmt} · ${p.unidadeMedida || 'UN'}</span>
                    </div>
                    <span class="option-id">#${p.idProduto}</span>
                `;
                li.addEventListener('click', () => {
                    hiddenInput.value = p.idProduto;
                    // Auto-fill valor vendido with product price
                    const valorInput = row.querySelector('[data-field="valorVendido"]');
                    if (valorInput && !valorInput.value) {
                        valorInput.value = p.preco || '';
                    }
                    trigger.innerHTML = `
                        <div class="selected-consumer-chip">
                            <div class="option-avatar" style="background:linear-gradient(135deg,#f39c12,#e67e22);font-size:0.6rem;">📦</div>
                            <span class="chip-name">${p.descricao || 'Sem descrição'}</span>
                            <span class="chip-id">#${p.idProduto}</span>
                        </div>
                        <i class="fas fa-chevron-down select-search-arrow"></i>
                    `;
                    wrapper.classList.remove('open');
                    if (searchInput) searchInput.value = '';
                    renderProdutoOptions(produtosCache);
                });
                optionsList.appendChild(li);
            });
        };

        // Populate with cached products
        renderProdutoOptions(produtosCache);

        // Toggle
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close all other product dropdowns first
            document.querySelectorAll('.produto-select-wrapper.open').forEach(w => {
                if (w !== wrapper) w.classList.remove('open');
            });
            wrapper.classList.toggle('open');
            if (wrapper.classList.contains('open')) {
                renderProdutoOptions(produtosCache);
                setTimeout(() => { if (searchInput) searchInput.focus(); }, 100);
            }
        });

        // Search
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase().trim();
                if (!term) { renderProdutoOptions(produtosCache); return; }
                const filtered = produtosCache.filter(p => {
                    const desc = (p.descricao || '').toLowerCase();
                    const id = String(p.idProduto);
                    return desc.includes(term) || id.includes(term);
                });
                renderProdutoOptions(filtered, e.target.value);
            });
            searchInput.addEventListener('keydown', (e) => e.stopPropagation());
        }
    };

    // Close product dropdowns on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.produto-select-wrapper')) {
            document.querySelectorAll('.produto-select-wrapper.open').forEach(w => w.classList.remove('open'));
        }
    });

    // Load products from API (cached)
    const carregarProdutosSelect = async () => {
        try {
            const response = await fetch(`${PRODUTOS_URL}?page=0&size=100`, {
                method: 'GET',
                headers: getAuthHeaders(),
                cache: 'no-store'
            });
            if (!response.ok) throw new Error(`Status: ${response.status}`);
            const dados = await response.json();
            let produtos = [];
            if (Array.isArray(dados)) produtos = dados;
            else if (dados && Array.isArray(dados.content)) produtos = dados.content;
            else if (dados && Array.isArray(dados.data)) produtos = dados.data;
            produtosCache = produtos;
            // Re-render all open product dropdowns
            document.querySelectorAll('.produto-options-list').forEach(list => {
                const wrapper = list.closest('.produto-select-wrapper');
                const row = list.closest('.item-venda-row');
                if (row) {
                    const hiddenInput = row.querySelector('[data-field="idProduto"]');
                    const selectedId = parseInt(hiddenInput?.value);
                    list.innerHTML = '';
                    produtosCache.forEach(p => {
                        const li = document.createElement('li');
                        li.dataset.id = p.idProduto;
                        if (selectedId === p.idProduto) li.classList.add('selected');
                        const precoFmt = `R$ ${parseFloat(p.preco || 0).toFixed(2).replace('.', ',')}`;
                        li.innerHTML = `
                            <div class="option-avatar" style="background:linear-gradient(135deg,#f39c12,#e67e22);font-size:0.6rem;">📦</div>
                            <div class="option-info">
                                <span class="option-name">${p.descricao || 'Sem descrição'}</span>
                                <span class="option-detail">${precoFmt} · ${p.unidadeMedida || 'UN'}</span>
                            </div>
                            <span class="option-id">#${p.idProduto}</span>
                        `;
                        li.addEventListener('click', () => {
                            hiddenInput.value = p.idProduto;
                            const valorInput = row.querySelector('[data-field="valorVendido"]');
                            if (valorInput && !valorInput.value) valorInput.value = p.preco || '';
                            const trigger = row.querySelector('.produto-trigger');
                            trigger.innerHTML = `
                                <div class="selected-consumer-chip">
                                    <div class="option-avatar" style="background:linear-gradient(135deg,#f39c12,#e67e22);font-size:0.6rem;">📦</div>
                                    <span class="chip-name">${p.descricao || 'Sem descrição'}</span>
                                    <span class="chip-id">#${p.idProduto}</span>
                                </div>
                                <i class="fas fa-chevron-down select-search-arrow"></i>
                            `;
                            wrapper.classList.remove('open');
                        });
                        list.appendChild(li);
                    });
                    if (produtosCache.length === 0) {
                        list.innerHTML = '<li class="no-results">Nenhum produto cadastrado.</li>';
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
        }
    };

    const limparItensContainer = () => {
        if (itensContainer) itensContainer.innerHTML = '';
        itemCounter = 1;
    };

    const adicionarItemVazio = () => {
        if (itensContainer) {
            itensContainer.appendChild(criarItemRow());
        }
    };

    const coletarItensDoFormulario = () => {
        const rows = itensContainer.querySelectorAll('.item-venda-row');
        const itens = [];
        rows.forEach(row => {
            const idProduto = row.querySelector('[data-field="idProduto"]')?.value;
            const quantidade = row.querySelector('[data-field="quantidade"]')?.value;
            const valorVendido = row.querySelector('[data-field="valorVendido"]')?.value;
            const detalhe = row.querySelector('[data-field="detalhe"]')?.value || '';

            if (idProduto && quantidade && valorVendido) {
                itens.push({
                    idProduto: parseInt(idProduto),
                    quantidade: parseFloat(quantidade),
                    detalhe: detalhe.trim(),
                    valorVendido: parseFloat(valorVendido)
                });
            }
        });
        return itens;
    };

    const renumerarItens = () => {
        const rows = itensContainer.querySelectorAll('.item-venda-row');
        rows.forEach((row, i) => {
            const label = row.querySelector('.item-row-label');
            if (label) label.textContent = `Item ${i + 1}`;
        });
    };

    // Event: botão adicionar item
    if (btnAddItem) {
        btnAddItem.addEventListener('click', adicionarItemVazio);
    }

    // Event delegation: remover item
    if (itensContainer) {
        itensContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-remove-item');
            if (!btn) return;
            const row = btn.closest('.item-venda-row');
            const totalRows = itensContainer.querySelectorAll('.item-venda-row').length;
            if (totalRows <= 1) {
                showToast('A venda precisa ter pelo menos 1 item.', 'warning');
                return;
            }
            row.remove();
            renumerarItens();
        });
    }

    // =============================================
    // 2b. CONSUMIDOR SEARCHABLE SELECT
    // =============================================

    const getInitials = (nome) => {
        if (!nome) return '?';
        const parts = nome.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return parts[0].substring(0, 2).toUpperCase();
    };

    const carregarConsumidoresSelect = async () => {
        consumidorOptionsList.innerHTML = `
            <li class="select-search-loading">
                <i class="fas fa-spinner fa-spin"></i> Carregando consumidores...
            </li>`;
        try {
            const response = await fetch(CONSUMIDORES_URL, {
                method: 'GET',
                headers: getAuthHeaders(),
                cache: 'no-store'
            });
            if (!response.ok) throw new Error(`Status: ${response.status}`);
            const dados = await response.json();
            let consumidores = [];
            if (Array.isArray(dados)) consumidores = dados;
            else if (dados && Array.isArray(dados.content)) consumidores = dados.content;
            else if (dados && Array.isArray(dados.data)) consumidores = dados.data;
            consumidoresCache = consumidores.filter(c => c.status === 'ATIVO');
            renderConsumidorOptions(consumidoresCache);
        } catch (error) {
            console.error('Erro ao carregar consumidores:', error);
            consumidorOptionsList.innerHTML = `
                <li class="no-results">
                    <i class="fas fa-exclamation-circle" style="margin-right:0.4rem;"></i>
                    Erro ao carregar consumidores.
                </li>`;
        }
    };

    const renderConsumidorOptions = (consumidores, searchTerm = '') => {
        consumidorOptionsList.innerHTML = '';
        if (consumidores.length === 0) {
            const msg = searchTerm
                ? `Nenhum consumidor encontrado para "${searchTerm}"`
                : 'Nenhum consumidor cadastrado.';
            consumidorOptionsList.innerHTML = `<li class="no-results">${msg}</li>`;
            return;
        }
        consumidores.forEach(c => {
            const li = document.createElement('li');
            li.dataset.id = c.idConsumidor;
            if (selectedConsumidorId === c.idConsumidor) li.classList.add('selected');
            li.innerHTML = `
                <div class="option-avatar">${getInitials(c.nome)}</div>
                <div class="option-info">
                    <span class="option-name">${c.nome || 'Sem nome'}</span>
                    <span class="option-detail">${c.email || c.cpf_cnpj || '-'}</span>
                </div>
                <span class="option-id">#${c.idConsumidor}</span>
            `;
            li.addEventListener('click', () => selecionarConsumidor(c));
            consumidorOptionsList.appendChild(li);
        });
    };

    const selecionarConsumidor = (consumidor) => {
        selectedConsumidorId = consumidor.idConsumidor;
        idConsumidorHidden.value = consumidor.idConsumidor;
        consumidorTrigger.innerHTML = `
            <div class="selected-consumer-chip">
                <div class="option-avatar">${getInitials(consumidor.nome)}</div>
                <span class="chip-name">${consumidor.nome || 'Sem nome'}</span>
                <span class="chip-id">#${consumidor.idConsumidor}</span>
            </div>
            <i class="fas fa-chevron-down select-search-arrow"></i>
        `;
        consumidorOptionsList.querySelectorAll('li').forEach(li => {
            li.classList.toggle('selected', parseInt(li.dataset.id) === consumidor.idConsumidor);
        });
        fecharConsumidorDropdown();
    };

    const resetConsumidorSelect = () => {
        selectedConsumidorId = null;
        idConsumidorHidden.value = '';
        consumidorTrigger.innerHTML = `
            <span class="select-search-value placeholder">Selecione um consumidor...</span>
            <i class="fas fa-chevron-down select-search-arrow"></i>
        `;
        if (consumidorSearchInput) consumidorSearchInput.value = '';
    };

    const abrirConsumidorDropdown = () => {
        consumidorWrapper.classList.add('open');
        setTimeout(() => { if (consumidorSearchInput) consumidorSearchInput.focus(); }, 100);
    };

    const fecharConsumidorDropdown = () => {
        consumidorWrapper.classList.remove('open');
        if (consumidorSearchInput) consumidorSearchInput.value = '';
        renderConsumidorOptions(consumidoresCache);
    };

    if (consumidorTrigger) {
        consumidorTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (consumidorWrapper.classList.contains('open')) fecharConsumidorDropdown();
            else abrirConsumidorDropdown();
        });
    }

    if (consumidorSearchInput) {
        consumidorSearchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            if (!term) { renderConsumidorOptions(consumidoresCache); return; }
            const filtered = consumidoresCache.filter(c => {
                const nome = (c.nome || '').toLowerCase();
                const email = (c.email || '').toLowerCase();
                const cpf = (c.cpf_cnpj || '').toLowerCase();
                const id = String(c.idConsumidor);
                return nome.includes(term) || email.includes(term) || cpf.includes(term) || id.includes(term);
            });
            renderConsumidorOptions(filtered, e.target.value);
        });
        consumidorSearchInput.addEventListener('keydown', (e) => e.stopPropagation());
    }

    document.addEventListener('click', (e) => {
        if (consumidorWrapper && !consumidorWrapper.contains(e.target)) fecharConsumidorDropdown();
    });

    // =============================================
    // 2. UTILIDADES
    // =============================================

    const showToast = (message, type = 'info') => {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas ${icons[type] || icons.info}"></i>
            <span>${message}</span>
            <button class="toast-close" title="Fechar">&times;</button>
        `;
        toastContainer.appendChild(toast);
        const removeToast = () => {
            toast.classList.add('toast-removing');
            setTimeout(() => toast.remove(), 300);
        };
        toast.querySelector('.toast-close').addEventListener('click', removeToast);
        setTimeout(removeToast, 5000);
    };

    const showConfirm = (title, message) => {
        return new Promise((resolve) => {
            confirmTitle.textContent = title;
            confirmMessage.textContent = message;
            confirmOverlay.classList.add('active');

            const cleanup = (result) => {
                confirmOverlay.classList.remove('active');
                confirmCancelBtn.removeEventListener('click', onCancel);
                confirmOkBtn.removeEventListener('click', onConfirm);
                resolve(result);
            };
            const onCancel = () => cleanup(false);
            const onConfirm = () => cleanup(true);

            confirmCancelBtn.addEventListener('click', onCancel);
            confirmOkBtn.addEventListener('click', onConfirm);
        });
    };

    // ✅ Mapeia statusPedido para classe CSS
    const getStatusClass = (status) => {
        switch ((status || '').toLowerCase()) {
            case 'entregue': return 'status-entregue';
            case 'em andamento': return 'status-andamento';
            case 'pendente': return 'status-pendente';
            case 'cancelado': return 'status-cancelado';
            default: return 'status-pendente';
        }
    };

    const formatMoeda = (valor) =>
        `R$ ${parseFloat(valor || 0).toFixed(2).replace('.', ',')}`;

    // =============================================
    // 3. LÓGICA DOS MODAIS
    // =============================================

    // --- Modal Formulário (criar/editar) ---
    const fecharVendaFormModal = () => {
        vendaFormModal.classList.remove('active');
        vendaForm.reset();
        editingVendaId = null;
        if (vendaMessage) {
            vendaMessage.textContent = '';
            vendaMessage.className = 'form-message';
        }
        document.getElementById('vendaFormModalTitle').innerHTML =
            '<i class="fas fa-plus-circle"></i> Nova Venda';
        submitVendaBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Venda';
        resetConsumidorSelect();
        fecharConsumidorDropdown();
        // Reseta itens para 1 vazio
        limparItensContainer();
        adicionarItemVazio();
    };

    const abrirVendaFormModalNovo = () => {
        editingVendaId = null;
        vendaForm.reset();
        if (vendaMessage) {
            vendaMessage.textContent = '';
            vendaMessage.className = 'form-message';
        }
        document.getElementById('vendaFormModalTitle').innerHTML =
            '<i class="fas fa-plus-circle"></i> Nova Venda';
        submitVendaBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Venda';
        resetConsumidorSelect();
        carregarConsumidoresSelect();
        carregarProdutosSelect();
        // Reseta itens para 1 vazio
        limparItensContainer();
        adicionarItemVazio();
        vendaFormModal.classList.add('active');
    };

    // Abre modal de formulário em modo edição com dados preenchidos
    const abrirVendaFormModalEditar = (venda) => {
        editingVendaId = venda.idVenda;

        document.getElementById('vendaFormModalTitle').innerHTML =
            `<i class="fas fa-pencil-alt"></i> Editar Venda #${venda.idVenda}`;
        submitVendaBtn.innerHTML = '<i class="fas fa-save"></i> Atualizar Venda';

        // ✅ Preenche campos com dados atuais da venda
        document.getElementById('formaPagamento').value = venda.formaPagamento || '';
        document.getElementById('statusPedido').value = venda.statusPedido || 'Em Andamento';
        document.getElementById('desconto').value = venda.desconto || 0;
        document.getElementById('prazoTroca').value = venda.prazoTroca || 30;
        document.getElementById('prazoDevolucao').value = venda.prazoDevolucao || 7;

        // ✅ Preenche consumidor no select
        const consumidor = venda.consumidor || {};
        const cId = consumidor.id || consumidor.idConsumidor || '';
        const cNome = consumidor.nome || 'Consumidor';
        if (cId) {
            selectedConsumidorId = parseInt(cId);
            idConsumidorHidden.value = cId;
            consumidorTrigger.innerHTML = `
                <div class="selected-consumer-chip">
                    <div class="option-avatar">${getInitials(cNome)}</div>
                    <span class="chip-name">${cNome}</span>
                    <span class="chip-id">#${cId}</span>
                </div>
                <i class="fas fa-chevron-down select-search-arrow"></i>
            `;
        } else {
            resetConsumidorSelect();
        }
        carregarConsumidoresSelect();

        // Reconstrói itens nos campos estruturados a partir dos itens retornados pela API
        // GET /{id} retorna: itens[].produto.id, itens[].quantidade, itens[].detalhes, itens[].precoVendido
        limparItensContainer();
        const itensData = (venda.itens || []);
        if (itensData.length === 0) {
            adicionarItemVazio();
        } else {
            itensData.forEach(item => {
                const row = criarItemRow({
                    idProduto: item.produto?.id || item.produto?.idProduto || '',
                    quantidade: item.quantidade || 1,
                    detalhe: item.detalhes || '',
                    valorVendido: item.precoVendido || 0
                });
                itensContainer.appendChild(row);
            });
        }

        if (vendaMessage) {
            vendaMessage.textContent = '';
            vendaMessage.className = 'form-message';
        }

        // Fecha detalhes e abre formulário
        detalhesModal.classList.remove('active');
        vendaFormModal.classList.add('active');
    };

    // --- Modal Detalhes ---
    const fecharDetalhesModal = () => {
        detalhesModal.classList.remove('active');
        vendaDetalheAtual = null;
    };

    // Preenche o modal de detalhes com os dados do GET /vendas/{id}
    // ✅ Todos os campos espelham exatamente o response body da documentação
    const preencherDetalhes = (venda) => {
        vendaDetalheAtual = venda;

        document.getElementById('detalheIdVenda').textContent = `#${venda.idVenda}`;
        document.getElementById('detalheSerial').textContent = venda.serial ? `— ${venda.serial}` : '';

        // Dados da venda
        document.getElementById('detalhePrecoTotal').textContent = formatMoeda(venda.precoTotal);
        document.getElementById('detalheDesconto').textContent = formatMoeda(venda.desconto);
        document.getElementById('detalheFormaPagamento').textContent = venda.formaPagamento || '-';
        document.getElementById('detalhePrazoTroca').textContent = venda.prazoTroca
            ? `${venda.prazoTroca} dias` : '-';
        document.getElementById('detalhePrazoDevolucao').textContent = venda.prazoDevolucao
            ? `${venda.prazoDevolucao} dias` : '-';
        document.getElementById('detalheDataCriacao').textContent = venda.dataCriacao || '-';
        document.getElementById('detalheDataEntrega').textContent = venda.dataEntrega || 'Não entregue';

        // Status com badge
        const statusClass = getStatusClass(venda.statusPedido);
        document.getElementById('detalheStatusPedido').innerHTML =
            `<span class="status-badge ${statusClass}">${venda.statusPedido || '-'}</span>`;

        // Consumidor
        const c = venda.consumidor || {};
        document.getElementById('detalheConsumidorNome').textContent = c.nome || '-';
        document.getElementById('detalheConsumidorEmail').textContent = c.email || '-';
        document.getElementById('detalheConsumidorCelular').textContent = c.celular || '-';
        document.getElementById('detalheConsumidorEndereco').textContent = c.endereco || '-';

        // Loja
        const l = venda.loja || {};
        document.getElementById('detalheLojaNome').textContent = l.nome || '-';
        document.getElementById('detalheLojaEmail').textContent = l.email || '-';

        // ✅ Itens — campos: produto.descricao, quantidade, precoOriginal,
        //                    precoVendido, percentualVariacao, detalhes
        const itensBody = document.getElementById('detalhesItensBody');
        itensBody.innerHTML = '';

        if (!venda.itens || venda.itens.length === 0) {
            itensBody.innerHTML =
                '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Nenhum item.</td></tr>';
        } else {
            venda.itens.forEach(item => {
                const variacao = parseFloat(item.percentualVariacao || 0);
                const variacaoClass = variacao >= 0 ? 'variacao-positiva' : 'variacao-negativa';
                const variacaoStr = `${variacao >= 0 ? '+' : ''}${variacao.toFixed(2)}%`;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.produto?.descricao || `ID ${item.produto?.id}` || '-'}</td>
                    <td>${item.quantidade || '-'}</td>
                    <td>${formatMoeda(item.precoOriginal)}</td>
                    <td>${formatMoeda(item.precoVendido)}</td>
                    <td class="${variacaoClass}">${variacaoStr}</td>
                    <td>${item.detalhes || '-'}</td>
                `;
                itensBody.appendChild(tr);
            });
        }

        detalhesModal.classList.add('active');
    };

    // Eventos de fechar modais
    if (openModalBtn) openModalBtn.addEventListener('click', abrirVendaFormModalNovo);
    if (closeVendaFormBtn) closeVendaFormBtn.addEventListener('click', fecharVendaFormModal);
    if (closeDetalhesBtn) closeDetalhesBtn.addEventListener('click', fecharDetalhesModal);

    if (vendaFormModal) {
        vendaFormModal.addEventListener('click', (e) => {
            if (e.target === vendaFormModal) fecharVendaFormModal();
        });
    }
    if (detalhesModal) {
        detalhesModal.addEventListener('click', (e) => {
            if (e.target === detalhesModal) fecharDetalhesModal();
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (vendaFormModal.classList.contains('active')) fecharVendaFormModal();
            if (detalhesModal.classList.contains('active')) fecharDetalhesModal();
        }
    });

    // =============================================
    // 4. CALCULAR E ATUALIZAR KPIs
    // =============================================
    const atualizarKpis = (vendas) => {
        if (!vendas.length) {
            statReceitaTotal.textContent = 'R$ 0,00';
            statEmAndamento.textContent = '0';
            statTicketMedio.textContent = 'R$ 0,00';
            statEntregues.textContent = '0';
            return;
        }

        const somaTotal = vendas.reduce((acc, v) => acc + parseFloat(v.precoTotal || 0), 0);
        const emAndamento = vendas.filter(v =>
            (v.statusPedido || '').toLowerCase() === 'em andamento').length;
        const entregues = vendas.filter(v =>
            (v.statusPedido || '').toLowerCase() === 'entregue').length;
        const ticketMedio = somaTotal / vendas.length;

        statReceitaTotal.textContent = formatMoeda(somaTotal);
        statEmAndamento.textContent = emAndamento;
        statTicketMedio.textContent = formatMoeda(ticketMedio);
        statEntregues.textContent = entregues;
    };

    // =============================================
    // 5. READ: BUSCAR TODAS AS VENDAS
    // GET /logvert/vendas?page=0&size=50&sort=dataCriacao,desc
    // Response: Page { content: [ { idVenda, nomeConsumidor, dataCriacao,
    //                                precoTotal, formaPagamento, statusPedido, status } ] }
    // =============================================
    const carregarVendas = async () => {
        tableBody.innerHTML = `
            <tr class="skeleton-row">
                <td><div class="skeleton-bar short"></div></td>
                <td><div class="skeleton-bar"></div></td>
                <td><div class="skeleton-bar medium"></div></td>
                <td><div class="skeleton-bar medium"></div></td>
                <td><div class="skeleton-bar short"></div></td>
                <td><div class="skeleton-bar short"></div></td>
                <td><div class="skeleton-bar short"></div></td>
            </tr>
            <tr class="skeleton-row">
                <td><div class="skeleton-bar short"></div></td>
                <td><div class="skeleton-bar"></div></td>
                <td><div class="skeleton-bar medium"></div></td>
                <td><div class="skeleton-bar medium"></div></td>
                <td><div class="skeleton-bar short"></div></td>
                <td><div class="skeleton-bar short"></div></td>
                <td><div class="skeleton-bar short"></div></td>
            </tr>`;

        try {
            const response = await fetch(
                `${VENDAS_URL}?page=0&size=50&sort=dataCriacao,desc`,
                { method: 'GET', headers: getAuthHeaders() }
            );

            if (response.status === 401)
                throw new Error('Token inválido ou expirado. Faça login novamente.');
            if (!response.ok)
                throw new Error(`Erro ao buscar vendas. Status: ${response.status}`);

            const dados = await response.json();

            // ✅ API retorna Page<Venda> com campo "content"
            let vendas = [];
            if (Array.isArray(dados)) {
                vendas = dados;
            } else if (dados && Array.isArray(dados.content)) {
                vendas = dados.content;
            }

            atualizarKpis(vendas);
            tableBody.innerHTML = '';

            if (vendas.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align:center; padding:3rem 1rem;">
                            <i class="fas fa-receipt" style="font-size:2.5rem; color:var(--text-muted);
                               margin-bottom:0.75rem; display:block;"></i>
                            <span style="color:var(--text-muted);">Nenhuma venda cadastrada.</span>
                        </td>
                    </tr>`;
                return;
            }

            vendas.forEach((venda, idx) => {
                const tr = document.createElement('tr');
                tr.style.animation = `fadeInUp 0.3s ease-out ${idx * 0.04}s backwards`;

                // ✅ Campos exatos do response body do GET /vendas
                const statusClass = getStatusClass(venda.statusPedido);

                tr.innerHTML = `
                    <td class="text-highlight">#${venda.idVenda}</td>
                    <td>${venda.nomeConsumidor || '-'}</td>
                    <td>${formatMoeda(venda.precoTotal)}</td>
                    <td>${venda.formaPagamento || '-'}</td>
                    <td>${venda.dataCriacao || '-'}</td>
                    <td>
                        <span class="status-badge ${statusClass}">
                            ${venda.statusPedido || '-'}
                        </span>
                    </td>
                    <td class="action-buttons">
                        <button class="btn-icon btn-view"
                                data-id="${venda.idVenda}"
                                title="Ver Detalhes">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon btn-edit"
                                data-id="${venda.idVenda}"
                                title="Editar Venda">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        <button class="btn-icon btn-deactivate"
                                data-id="${venda.idVenda}"
                                title="Desativar Venda">
                            <i class="fas fa-ban"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(tr);
            });

        } catch (error) {
            console.error('Erro ao carregar vendas:', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; color:#e53935; padding:2rem;">
                        <i class="fas fa-exclamation-circle" style="margin-right:0.5rem;"></i>
                        ${error.message}
                    </td>
                </tr>`;
        }
    };

    // =============================================
    // 6. READ ONE: BUSCAR VENDA POR ID
    // GET /logvert/vendas/{id}
    // Response: { idVenda, serial, precoTotal, statusPedido, desconto,
    //             formaPagamento, prazoTroca, prazoDevolucao, dataCriacao,
    //             dataEntrega, loja{}, consumidor{}, status, itens[] }
    // =============================================
    const buscarVendaPorId = async (id) => {
        const response = await fetch(`${VENDAS_URL}/${id}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (response.status === 401) throw new Error('Token inválido. Faça login novamente.');
        if (response.status === 404) throw new Error(`Venda #${id} não encontrada.`);
        if (!response.ok) throw new Error(`Erro ao buscar venda. Status: ${response.status}`);

        return await response.json();
    };

    // =============================================
    // 7. CREATE / UPDATE: SALVAR VENDA
    // POST /logvert/vendas
    // PUT  /logvert/vendas/{id}
    // Body: { desconto, idConsumidor, prazoTroca, prazoDevolucao,
    //         formaPagamento, statusPedido, itensVenda[] }
    // ✅ NÃO envia idLoja (vem do JWT) nem valorTotal (calculado pelo backend)
    // =============================================
    if (vendaForm) {
        vendaForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (vendaMessage) {
                vendaMessage.textContent = 'Salvando...';
                vendaMessage.className = 'form-message';
            }
            submitVendaBtn.disabled = true;
            const originalBtnText = submitVendaBtn.innerHTML;
            submitVendaBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

            // ✅ Coleta itens dos campos estruturados (JSON gerado automaticamente)
            const itensVenda = coletarItensDoFormulario();
            if (itensVenda.length === 0) {
                if (vendaMessage) {
                    vendaMessage.textContent = 'ERRO: Preencha pelo menos 1 item com todos os campos obrigatórios.';
                    vendaMessage.className = 'form-message error';
                }
                submitVendaBtn.disabled = false;
                submitVendaBtn.innerHTML = originalBtnText;
                return;
            }

            // ✅ Payload exato conforme documentação do POST/PUT
            const payload = {
                desconto: parseFloat(document.getElementById('desconto').value) || 0,
                idConsumidor: parseInt(document.getElementById('idConsumidor').value),
                prazoTroca: parseInt(document.getElementById('prazoTroca').value) || 30,
                prazoDevolucao: parseInt(document.getElementById('prazoDevolucao').value) || 7,
                formaPagamento: document.getElementById('formaPagamento').value.trim(),
                statusPedido: document.getElementById('statusPedido').value,
                itensVenda: itensVenda
            };

            const url = editingVendaId ? `${VENDAS_URL}/${editingVendaId}` : VENDAS_URL;
            const method = editingVendaId ? 'PUT' : 'POST';

            console.log(`[${method}] ${url}`, payload);

            try {
                const response = await fetch(url, {
                    method,
                    headers: getAuthHeaders(),
                    body: JSON.stringify(payload)
                });

                // ✅ Tratamento de erros por status code conforme documentação
                if (response.status === 401)
                    throw new Error('Token inválido. Faça login novamente.');

                if (response.status === 403)
                    throw new Error('Acesso negado.');

                if (response.status === 404)
                    throw new Error('Venda não encontrada para atualização.');

                if (response.status === 409) {
                    let detail = '';
                    try {
                        const json = await response.json();
                        detail = json.mensagem || json.message || '';
                    } catch (_) { }
                    throw new Error(
                        detail ||
                        (editingVendaId
                            ? 'Edição não permitida para o estado atual da venda.'
                            : 'Conflito ao criar venda. Verifique os dados.')
                    );
                }

                if (response.status === 422) {
                    let json = {};
                    try { json = await response.json(); } catch (_) { }
                    const msg = json.mensagem || json.message || JSON.stringify(json);
                    throw new Error(`Erro de validação: ${msg}`);
                }

                if (!response.ok) {
                    let erroText = '';
                    try {
                        const json = await response.json();
                        erroText = json.mensagem || json.message || JSON.stringify(json);
                    } catch (_) {
                        try { erroText = await response.text(); } catch (_) { }
                    }
                    throw new Error(erroText || `Erro ao salvar venda. Status: ${response.status}`);
                }

                // ✅ Sucesso: 201 Created (POST) ou 200 OK (PUT)
                const result = await response.json();
                const verb = editingVendaId ? 'atualizada' : 'criada';

                if (vendaMessage) {
                    vendaMessage.textContent = `Venda #${result.idVenda} ${verb} com sucesso!`;
                    vendaMessage.className = 'form-message success';
                }

                showToast(`Venda #${result.idVenda} ${verb} com sucesso!`, 'success');

                setTimeout(() => {
                    fecharVendaFormModal();
                    carregarVendas();
                }, 1200);

            } catch (error) {
                console.error('Erro ao salvar venda:', error);
                if (vendaMessage) {
                    vendaMessage.textContent = `Erro: ${error.message}`;
                    vendaMessage.className = 'form-message error';
                }
                showToast(`Erro: ${error.message}`, 'error');
            } finally {
                submitVendaBtn.disabled = false;
                submitVendaBtn.innerHTML = originalBtnText;
            }
        });
    }

    // =============================================
    // 8. DEATUALIZAR / DESATIVAR VENDA (SOFT DELETE EM LOTE)
    // PATCH /logvert/vendas
    // ✅ Alterado para usar PATCH com payload [id]
    // =============================================
    const desativarVenda = async (id) => {
        const confirmed = await showConfirm(
            'Desativar venda?',
            `A venda #${id} será desativada. O registro será mantido no sistema.`
        );
        if (!confirmed) return;

        try {
            // ✅ Payload esperado pela API para desativação em lote (um array de IDs)
            const payload = [parseInt(id)];

            const response = await fetch(`${VENDAS_URL}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            if (response.status === 204 || response.ok) {
                showToast(`Venda #${id} desativada com sucesso!`, 'success');
                fecharDetalhesModal();
                await carregarVendas();
            } else {
                let erroText = '';
                try {
                    const json = await response.json();
                    erroText = json.mensagem || json.message;
                } catch (_) {
                    try { erroText = await response.text(); } catch (__) { }
                }

                switch (response.status) {
                    case 401: throw new Error('Token inválido. Faça login novamente.');
                    case 403: throw new Error('Acesso negado para desativar esta venda.');
                    case 404: throw new Error(`Venda #${id} não encontrada.`);
                    default: throw new Error(erroText || `Erro ao desativar. Status: ${response.status}`);
                }
            }
        } catch (error) {
            console.error('Erro ao desativar venda:', error);
            showToast(`Erro: ${error.message}`, 'error');
        }
    };

    // =============================================
    // 9. BOTÕES DO MODAL DE DETALHES
    // =============================================
    if (btnEditarDetalhes) {
        btnEditarDetalhes.addEventListener('click', () => {
            if (vendaDetalheAtual) {
                abrirVendaFormModalEditar(vendaDetalheAtual);
            }
        });
    }

    if (btnDesativarDetalhes) {
        btnDesativarDetalhes.addEventListener('click', () => {
            if (vendaDetalheAtual) {
                desativarVenda(vendaDetalheAtual.idVenda);
            }
        });
    }

    // =============================================
    // 10. EVENT DELEGATION — CLIQUES NA TABELA
    // =============================================
    tableBody.addEventListener('click', async (e) => {
        const button = e.target.closest('button.btn-icon');
        if (!button) return;

        const id = button.dataset.id;
        if (!id) return;

        // --- VER DETALHES: GET /vendas/{id} ---
        if (button.classList.contains('btn-view')) {
            try {
                const venda = await buscarVendaPorId(id);
                preencherDetalhes(venda);
            } catch (error) {
                console.error('Erro ao carregar detalhes:', error);
                showToast(error.message, 'error');
            }

            // --- EDITAR: GET /vendas/{id} para preencher form, depois PUT ---
        } else if (button.classList.contains('btn-edit')) {
            try {
                const venda = await buscarVendaPorId(id);
                abrirVendaFormModalEditar(venda);
            } catch (error) {
                console.error('Erro ao carregar venda para edição:', error);
                showToast(error.message, 'error');
            }

            // --- DESATIVAR: PATCH /vendas com [id] ---
        } else if (button.classList.contains('btn-deactivate')) {
            await desativarVenda(id);
        }
    });

    // =============================================
    // 11. CARGA INICIAL
    // =============================================
    carregarVendas();
});