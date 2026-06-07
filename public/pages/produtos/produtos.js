document.addEventListener('DOMContentLoaded', () => {

    // --- 1. REFERÊNCIAS DO DOM ---
    const tableBody     = document.getElementById('productsTableBody');
    const modal         = document.getElementById('addProdutoModal');
    const openModalBtn  = document.getElementById('openModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const produtoForm   = document.getElementById('addProdutoForm');
    const exportBtn     = document.getElementById('exportBtn');

    // Campo oculto para controlar modo edição
    const editIdInput   = document.createElement('input');
    editIdInput.type    = 'hidden';
    editIdInput.id      = 'editId';
    produtoForm.appendChild(editIdInput);

    // ── URL base ─────────────────────────────────────────────────────────────
    // API_BASE_URL já é 'http://localhost:8080/logvert' (definido no apiClient.js)
    // Garante que não haja barra dupla caso a URL termine com '/'
    const PRODUTOS_URL = `${API_BASE_URL.replace(/\/$/, '')}/produtos`;


    // ── Sistema de Toast ──────────────────────────────────────────────────────
    const showToast = (mensagem, tipo = 'info', duracao = 4000) => {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${tipo}`;

        const icones = { success: '✓', error: '✕', info: 'i' };

        toast.innerHTML = `
            <div class="toast-icon">${icones[tipo] || 'i'}</div>
            <span class="toast-msg">${mensagem}</span>
            <button class="toast-close" title="Fechar">×</button>
        `;

        container.appendChild(toast);

        const remover = () => {
            toast.classList.add('hide');
            toast.addEventListener('animationend', () => toast.remove(), { once: true });
        };

        toast.querySelector('.toast-close').addEventListener('click', remover);
        setTimeout(remover, duracao);
    };


    // ── Modal de Confirmação (substitui o confirm() nativo) ───────────────────
    const showConfirm = (mensagem) => {
        return new Promise((resolve) => {
            const overlay = document.getElementById('confirmModal');

            if (!overlay) {
                resolve(window.confirm(mensagem));
                return;
            }

            const msgEl  = document.getElementById('confirmMsg');
            const btnSim = document.getElementById('confirmSim');
            const btnNao = document.getElementById('confirmNao');

            msgEl.textContent = mensagem;
            overlay.classList.add('active');

            const fechar = (resultado) => {
                overlay.classList.remove('active');
                btnSim.removeEventListener('click', onSim);
                btnNao.removeEventListener('click', onNao);
                overlay.removeEventListener('click', onOverlay);
                resolve(resultado);
            };

            const onSim     = () => fechar(true);
            const onNao     = () => fechar(false);
            const onOverlay = (e) => { if (e.target === overlay) fechar(false); };

            btnSim.addEventListener('click', onSim);
            btnNao.addEventListener('click', onNao);
            overlay.addEventListener('click', onOverlay);
        });
    };


    // --- 2. LÓGICA DO MODAL ---

    const fecharModal = () => {
        modal.classList.remove('active');
    };

    const abrirModalNovo = () => {
        produtoForm.reset();
        editIdInput.value = '';
        document.querySelector('#addProdutoModal .modal-header h2').textContent = 'Adicionar Novo Produto';
        // Imagem obrigatória apenas no cadastro (POST)
        document.getElementById('imagem').required = true;
        const smallImagem = document.querySelector('#addProdutoForm .form-group small');
        if (smallImagem) smallImagem.textContent = 'Selecione a imagem do produto.';
        modal.classList.add('active');
    };

    if (openModalBtn)  openModalBtn.addEventListener('click', abrirModalNovo);
    if (closeModalBtn) closeModalBtn.addEventListener('click', fecharModal);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) fecharModal();
        });
    }


    // --- 3. LÓGICA DE API (CRUD) ---

    const carregarProdutos = async () => {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Carregando produtos...</td></tr>';
        try {
            const response = await fetch(`${PRODUTOS_URL}?page=0&size=50`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (response.status === 401) throw new Error('Token inválido ou não fornecido. Faça login novamente.');
            if (!response.ok)            throw new Error(`Erro ao buscar produtos. Status: ${response.status}`);

            const dados    = await response.json();
            let produtos = Array.isArray(dados)
                           ? dados
                           : Array.isArray(dados.content) ? dados.content : [];

            // ✅ Filtra produtos inativos (soft-deleted via PATCH)
            produtos = produtos.filter(p => (p.status || '').toUpperCase() !== 'INATIVO');

            tableBody.innerHTML = '';

            if (produtos.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum produto cadastrado.</td></tr>';
                return;
            }

            produtos.forEach(produto => {
                const tr = document.createElement('tr');

                const imageUrl = produto.imagem
                    ? `https://lh3.googleusercontent.com/d/${produto.imagem}`
                    : 'https://placehold.co/40x40/334155/94a3b8?text=?';

                const precoFormatado = `R$ ${parseFloat(produto.preco || 0).toFixed(2).replace('.', ',')}`;

                tr.innerHTML = `
                    <td class="produto-cell">
                        <img src="${imageUrl}"
                             alt="Imagem do produto"
                             class="produto-img-preview"
                             onerror="this.src='https://placehold.co/40x40/334155/94a3b8?text=?'">
                        <span>${produto.descricao || 'Sem descrição'}</span>
                    </td>
                    <td>${precoFormatado}</td>
                    <td>${produto.unidadeMedida || 'UN'}</td>
                    <td class="action-buttons">
                        <button class="btn-icon btn-edit"   data-id="${produto.idProduto}" title="Editar"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn-icon btn-delete" data-id="${produto.idProduto}" title="Excluir"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                tableBody.appendChild(tr);
            });

        } catch (error) {
            console.error('Erro em carregarProdutos:', error);
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#e53935;">${error.message}</td></tr>`;
            showToast(error.message, 'error');
        }
    };


    /**
     * CREATE / UPDATE: Submit do formulário
     * POST /logvert/produtos      → multipart/form-data (produto JSON + imagem)
     * PUT  /logvert/produtos/{id} → multipart/form-data (produto JSON + imagem opcional)
     */
    if (produtoForm) {
        produtoForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const idParaEditar = editIdInput.value.trim();
            const isEdicao     = !!idParaEditar;

            // Coleta e valida campos
            const descricao     = document.getElementById('descricao').value.trim();
            const unidadeMedida = document.getElementById('unidadeMedida').value.trim();
            const precoRaw      = document.getElementById('preco').value;
            const preco         = parseFloat(precoRaw);
            const imagemFile    = document.getElementById('imagem').files[0];

            if (!descricao) {
                showToast('Informe a descrição do produto.', 'error');
                return;
            }
            if (isNaN(preco) || preco < 0) {
                showToast('Informe um preço válido e não negativo.', 'error');
                return;
            }
            // Imagem obrigatória apenas no cadastro (POST)
            if (!isEdicao && !imagemFile) {
                showToast('Selecione uma imagem para o produto.', 'error');
                return;
            }

            // Monta o multipart/form-data conforme a documentação:
            // Parte 1: "produto" → application/json
            // Parte 2: "imagem"  → image/* (obrigatória no POST, opcional no PUT)
            const produtoJson = { descricao, unidadeMedida, preco };

            const formData = new FormData();
            formData.append(
                'produto',
                new Blob([JSON.stringify(produtoJson)], { type: 'application/json' })
            );
            if (imagemFile) {
                formData.append('imagem', imagemFile);
            } else {
                // PUT exige a part "imagem" no multipart — envia blob vazio
                formData.append('imagem', new Blob(), 'empty');
            }

            const url    = isEdicao ? `${PRODUTOS_URL}/${idParaEditar}` : PRODUTOS_URL;
            const method = isEdicao ? 'PUT' : 'POST';

            // IMPORTANTE: não passar Content-Type manualmente.
            // O browser define o boundary correto do multipart automaticamente.
            try {
                const response = await fetch(url, {
                    method,
                    body:    formData,
                    headers: getAuthHeadersForFormData()
                });

                if (!response.ok) {
                    let mensagem = `Erro ${response.status}`;
                    try {
                        const err = await response.json();
                        mensagem = err.message || err.erro || JSON.stringify(err);
                    } catch {
                        try { mensagem = await response.text(); } catch { /* sem body */ }
                    }

                    switch (response.status) {
                        case 400: throw new Error(`Tipo de arquivo de imagem inválido. ${mensagem}`);
                        case 401: throw new Error('Token inválido. Faça login novamente.');
                        case 403: throw new Error(`Acesso negado ou erro no Google Drive. ${mensagem}`);
                        case 404: throw new Error('Produto não encontrado.');
                        case 409: throw new Error('Já existe um produto com essa descrição nesta loja.');
                        case 422: throw new Error(`Erro de validação nos campos: ${mensagem}`);
                        default:  throw new Error(mensagem);
                    }
                }

                showToast(
                    isEdicao ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!',
                    'success'
                );
                fecharModal();
                await carregarProdutos();

            } catch (error) {
                console.error('Erro ao salvar produto:', error);
                showToast(error.message, 'error');
            }
        });
    }


    /**
     * EDIT (GET /logvert/produtos/{id}) e DELETE (DELETE /logvert/produtos/{id})
     */
    tableBody.addEventListener('click', async (e) => {
        const button = e.target.closest('button.btn-icon');
        if (!button) return;

        const id = button.dataset.id;

        if (!id || id === 'undefined' || id === 'null') {
            showToast('Produto sem ID válido. Atualize a página e tente novamente.', 'error');
            return;
        }

        // ── Editar ────────────────────────────────────────────────────────────
        if (button.classList.contains('btn-edit')) {
            try {
                const response = await fetch(`${PRODUTOS_URL}/${id}`, {
                    headers: getAuthHeaders()
                });

                if (response.status === 401) throw new Error('Token inválido. Faça login novamente.');
                if (response.status === 403) throw new Error('Este produto pertence a outra loja.');
                if (response.status === 404) throw new Error('Produto não encontrado.');
                if (!response.ok)            throw new Error(`Erro ao carregar produto. Status: ${response.status}`);

                const produto = await response.json();

                document.getElementById('descricao').value     = produto.descricao     || '';
                document.getElementById('preco').value         = produto.preco         || '';
                document.getElementById('unidadeMedida').value = produto.unidadeMedida || 'UN';
                // Limpa o file input (não dá para preencher por segurança do browser)
                document.getElementById('imagem').value        = '';
                // ✅ Imagem NÃO é obrigatória na edição — mantém a existente se não selecionar
                document.getElementById('imagem').required     = false;
                const smallImagem = document.querySelector('#addProdutoForm .form-group small');
                if (smallImagem) smallImagem.textContent = 'Opcional: selecione apenas se quiser trocar a imagem atual.'

                editIdInput.value = String(produto.idProduto);
                document.querySelector('#addProdutoModal .modal-header h2').textContent = 'Editar Produto';
                modal.classList.add('active');

            } catch (error) {
                console.error('Erro ao preparar edição:', error);
                showToast(error.message, 'error');
            }

        // ── Deletar ───────────────────────────────────────────────────────────
        } else if (button.classList.contains('btn-delete')) {
            const confirmado = await showConfirm(`Excluir permanentemente o produto ID ${id}?`);
            if (!confirmado) return;

            try {
                const response = await fetch(`${PRODUTOS_URL}/${id}`, {
                    method:  'DELETE',
                    headers: getAuthHeaders()
                });

                if (response.status === 204 || response.ok) {
                    showToast('Produto excluído com sucesso.', 'success');
                    await carregarProdutos();
                    return;
                }

                switch (response.status) {
                    case 401: throw new Error('Token inválido. Faça login novamente.');
                    case 403: throw new Error('Acesso negado para excluir este produto.');
                    case 404: throw new Error('Produto não encontrado.');
                    case 409: throw new Error('Não é possível excluir: produto vinculado a vendas.');
                    default:  throw new Error(`Erro ao excluir produto. Status: ${response.status}`);
                }

            } catch (error) {
                console.error('Erro ao deletar produto:', error);
                showToast(error.message, 'error');
            }
        }
    });


    // --- 4. EXPORTAÇÃO PARA EXCEL (via endpoint do backend) ---
    // GET /logvert/relatorios/produtos/excel
    const exportarParaExcel = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/relatorios/produtos/excel`, {
                method:  'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                showToast('Token inválido. Faça login novamente.', 'error');
                return;
            }
            if (response.status === 204) {
                showToast('Não há produtos para exportar.', 'info');
                return;
            }
            if (!response.ok) {
                throw new Error(`Falha na exportação. Status: ${response.status}`);
            }

            // Faz download do blob como arquivo Excel
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'produtos_logvert.xlsx';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            showToast('Exportação realizada com sucesso!', 'success');

        } catch (error) {
            console.error('Erro ao exportar:', error);
            showToast(error.message, 'error');
        }
    };

    if (exportBtn) exportBtn.addEventListener('click', exportarParaExcel);


    // --- 5. CARGA INICIAL ---
    carregarProdutos();
});