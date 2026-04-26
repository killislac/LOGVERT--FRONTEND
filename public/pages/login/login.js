document.addEventListener('DOMContentLoaded', () => {
    const lojistaCard = document.getElementById('lojistaCard');
    const clienteCard = document.getElementById('clienteCard');
    const showClienteBtn = document.getElementById('showCliente');
    const showLojistaBtn = document.getElementById('showLojista');
    const body = document.body;

    // --- FUNÇÕES DE CONTROLE DO SPINNER ---
    const showSpinner = (button) => {
        button.classList.add('loading');
        button.disabled = true;
        const spinner = button.querySelector('.btn-spinner');
        if (spinner) spinner.style.display = 'inline-block';
    };

    const hideSpinner = (button) => {
        button.classList.remove('loading');
        button.disabled = false;
        const spinner = button.querySelector('.btn-spinner');
        if (spinner) spinner.style.display = 'none';
    };

    // --- LÓGICA DAS PARTÍCULAS ---
    const baseConfig = {
        "particles": {
            "number": { "value": 50, "density": { "enable": true, "value_area": 800 } },
            "shape": { "type": "circle" }, "opacity": { "value": 0.2, "random": true },
            "size": { "value": 3, "random": true },
            "line_linked": { "enable": true, "distance": 150, "color": "#ffffff", "opacity": 0.1, "width": 1 },
            "move": { "enable": true, "speed": 1.5, "direction": "none", "random": true, "out_mode": "out" }
        },
        "interactivity": { "events": { "onhover": { "enable": true, "mode": "grab" } } }
    };
    const particlesConfigLojista = { ...baseConfig, particles: { ...baseConfig.particles, color: { "value": "#1A73E8" } } };
    const particlesConfigCliente = { ...baseConfig, particles: { ...baseConfig.particles, color: { "value": "#388e3c" } } };

    const loadParticles = (config) => {
        if (typeof particlesJS !== 'undefined') {
            particlesJS("login-particles", config);
        }
    };
    loadParticles(particlesConfigLojista); // Carrega a versão azul inicial

    // --- LÓGICA DA ANIMAÇÃO DOS CARDS ---
    const switchCards = (cardToShow, cardToHide) => {
        if (cardToShow.classList.contains('active')) return;

        // Adiciona/Remove a classe do tema no body
        if (cardToShow === clienteCard) {
            body.classList.add('theme-cliente');
            loadParticles(particlesConfigCliente); // Carrega partículas verdes
        } else {
            body.classList.remove('theme-cliente');
            loadParticles(particlesConfigLojista); // Carrega partículas azuis
        }

        cardToHide.classList.add('is-leaving');
        cardToHide.classList.remove('active');

        cardToShow.classList.add('active');
        cardToShow.classList.add('is-entering');

        const items = cardToShow.querySelectorAll('.animate-item');
        items.forEach(item => item.style.animation = 'none');

        setTimeout(() => {
            cardToHide.classList.remove('is-leaving');
            cardToShow.classList.remove('is-entering');
            items.forEach(item => item.style.animation = '');
        }, 800);
    };

    if (showClienteBtn) {
        showClienteBtn.addEventListener('click', () => switchCards(clienteCard, lojistaCard));
    }
    if (showLojistaBtn) {
        showLojistaBtn.addEventListener('click', () => switchCards(lojistaCard, clienteCard));
    }

    // Estado inicial
    setTimeout(() => { lojistaCard.classList.add('active'); }, 100);

    // Modo demonstração removido


    // =================================================================
    // --- LÓGICA DE INTEGRAÇÃO (AJUSTADA) ---
    // =================================================================

    // --- Formulário 1: Login do Lojista ---
    const lojistaForm = document.getElementById('lojista-form');
    const lojistaMessage = document.getElementById('lojista-message');

    if (lojistaForm) {
        lojistaForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Impede o recarregamento da página

            const email = document.getElementById('lojista-email').value;
            const password = document.getElementById('lojista-senha').value;
            const submitBtn = document.getElementById('lojista-submit-btn');

            // Limpa mensagem anterior e mostra spinner
            lojistaMessage.textContent = '';
            lojistaMessage.className = 'form-message animate-item';
            showSpinner(submitBtn);

            try {
                // Tenta fazer login no backend
                const response = await fetch(`${API_BASE_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });

                const result = await response.json();

                if (response.ok) {
                    // Login bem-sucedido
                    if (result.token) {
                        localStorage.setItem('authToken', result.token);
                        localStorage.setItem('userRole', 'lojista');
                        localStorage.setItem('userName', result.userName || email);
                    }

                    // Mensagem de sucesso SEM aparecer nada visível (só redireciona)
                    setTimeout(() => {
                        window.location.href = "/pages/menu.lojista/menuLojista.html";
                    }, 300);

                } else {
                    // Erro de credenciais - Mensagem clara
                    if (response.status === 401 || response.status === 404) {
                        lojistaMessage.textContent = '✗ Email ou senha inválidos';
                    } else if (response.status === 403) {
                        lojistaMessage.textContent = '✗ Usuário não autorizado';
                    } else {
                        lojistaMessage.textContent = result.message || '✗ Erro ao fazer login';
                    }
                    lojistaMessage.classList.add('error');
                }
            } catch (error) {
                console.error('Erro no login:', error);

                // Mensagem clara de erro
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    lojistaMessage.textContent = '✗ Erro de conexão. Verifique sua internet.';
                } else {
                    lojistaMessage.textContent = '✗ Email ou senha inválidos';
                }
                lojistaMessage.classList.add('error');
            } finally {
                hideSpinner(submitBtn);
            }
        });
    }

    // --- Formulário 2: Login do Cliente ---
    const clienteForm = document.getElementById('cliente-form');
    const clienteMessage = document.getElementById('cliente-message');

    if (clienteForm) {
        clienteForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Impede o recarregamento da página

            const serial = document.getElementById('cliente-codigo').value;
            const senha = document.getElementById('cliente-senha').value;
            const submitBtn = document.getElementById('cliente-submit-btn');

            // Limpa mensagem anterior e mostra spinner
            clienteMessage.textContent = '';
            clienteMessage.className = 'form-message animate-item';
            showSpinner(submitBtn);

            try {
                // Tenta fazer login do cliente no backend
                const response = await fetch(`${API_BASE_URL}/login/consumidores`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ serial, senha }),
                });

                const result = await response.json();

                if (response.ok) {
                    // Login bem-sucedido - salva TODOS os dados de identificação
                    if (result.token) {
                        localStorage.setItem('authToken', result.token);
                        localStorage.setItem('userRole', 'cliente');
                        localStorage.setItem('clientCode', serial);
                        localStorage.setItem('userName', result.userName || result.nome || serial);
                    }
                    // Armazena dados adicionais do consumidor se retornados
                    if (result.idConsumidor) localStorage.setItem('idConsumidor', result.idConsumidor);
                    if (result.nome) localStorage.setItem('consumidorNome', result.nome);
                    if (result.idVenda) localStorage.setItem('idVenda', result.idVenda);

                    // Redireciona direto para o menu do cliente
                    setTimeout(() => {
                        window.location.href = '/pages/menu.cliente/menuCliente.html';
                    }, 300);

                } else {
                    // Erro de credenciais - Mensagem clara
                    if (response.status === 401 || response.status === 404) {
                        clienteMessage.textContent = '✗ Serial ou senha inválidos';
                    } else if (response.status === 403) {
                        clienteMessage.textContent = '✗ Serial não encontrado ou inativo';
                    } else {
                        clienteMessage.textContent = result.message || '✗ Erro ao fazer login';
                    }
                    clienteMessage.classList.add('error');
                }
            } catch (error) {
                console.error('Erro no login do cliente:', error);

                // Mensagem clara de erro
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    clienteMessage.textContent = '✗ Erro de conexão. Verifique sua internet.';
                } else {
                    clienteMessage.textContent = '✗ Serial ou senha inválidos';
                }
                clienteMessage.classList.add('error');
            } finally {
                hideSpinner(submitBtn);
            }
        });
    }
});