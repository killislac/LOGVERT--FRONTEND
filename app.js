const express = require('express');
const path = require('path');
const cors = require('cors');
const exphbs = require('express-handlebars');

const app = express();
const port = process.env.PORT || 3000;

// View engine (Handlebars) - compatibility with different versions
const exphbsModule = exphbs;
if (exphbsModule && exphbsModule.engine) {
  app.engine('handlebars', exphbsModule.engine({ defaultLayout: 'main' }));
} else {
  app.engine('handlebars', exphbsModule({ defaultLayout: 'main' }));
}
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir recursos estáticos (CSS, JS, imagens)
app.use(express.static(path.join(__dirname, 'public')));

// Rota principal (página inicial com Handlebars) - sem layout
app.get('/', (req, res) => {
  res.render('index', {
    layout: false,  // Index tem estrutura HTML própria
    title: 'LogVert | Logística Reversa Inteligente',
    year: new Date().getFullYear(),
    head: `
      <link rel="stylesheet" href="/pages/index/welcome.css">
    `,
    pageScripts: `
      <script src="/js/api/apiClient.js"></script>
      <script src="/pages/index/welcome.js" defer></script>
    `
  });
});

// Rota que renderiza a view de produtos usando Handlebars
app.get('/produtos', (req, res) => {
  res.render('produtos', {
    title: 'Gestão de Produtos',
    year: new Date().getFullYear(),
    head: `
      <link rel="stylesheet" href="/pages/produtos/produtos.css">
    `,
    pageScripts: `
      <script src="https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js"></script>
      <script src="/pages/menu.lojista/menuLojista.js"></script>
      <script src="/pages/produtos/produtos.js"></script>
    `
    // NOTA: apiClient.js NÃO listado aqui — já é carregado pelo layout main.handlebars
  });
});

// Rota que renderiza a view de vendas usando Handlebars
app.get('/vendas', (req, res) => {
  res.render('vendas', {
    title: 'Gestão de Vendas',
    year: new Date().getFullYear(),
    head: `
      <link rel="stylesheet" href="/pages/vendas/venda.css">
    `,
    pageScripts: `
      <script src="https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js"></script>
      <script src="/pages/menu.lojista/menuLojista.js"></script>
      <script src="/pages/vendas/venda.js"></script>
    `
    // NOTA: apiClient.js NÃO listado aqui — já é carregado pelo layout main.handlebars
  });
});

// Rota que renderiza a view de consumidores usando Handlebars
app.get('/consumidores', (req, res) => {
  res.render('consumidores', {
    title: 'Gestão de Consumidores',
    year: new Date().getFullYear(),
    head: `
      <link rel="stylesheet" href="/pages/consumidores/consumidores.css">
    `,
    pageScripts: `
      <script src="https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js"></script>
      <script src="/pages/menu.lojista/menuLojista.js"></script>
      <script src="/pages/consumidores/consumidores.js"></script>
    `
    // NOTA: apiClient.js NÃO listado aqui — já é carregado pelo layout main.handlebars
  });
});



// Rota para Painel do Cliente (Minhas Solicitações) com Handlebars
app.get('/cliente/dashboard', (req, res) => {
  res.render('menu-cliente', {
    layout: false,
    title: 'LogVert | Painel do Cliente',
    year: new Date().getFullYear()
  });
});

// Rota para Assinatura com Handlebars (sem layout)
app.get('/assinatura', (req, res) => {
  res.render('assinatura', {
    layout: false,  // Assinatura tem estrutura HTML própria
    title: 'LogVert | Minha Assinatura',
    year: new Date().getFullYear(),
    head: `
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
      <link rel="stylesheet" href="/css/global.css">
      <link rel="stylesheet" href="/css/global-header.css">
      <link rel="stylesheet" href="/pages/menu.lojista/menuLojista.css">
      <link rel="stylesheet" href="/css/assinatura.css">
    `,
    pageScripts: `
      <script src="https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js"></script>
      <script src="/js/api/apiClient.js"></script>
      <script src="/js/global-header.js"></script>
      <script src="/pages/menu.lojista/menuLojista.js"></script>
      <script src="/js/assinatura.js"></script>
    `
  });
});

// Rota para Login com Handlebars (sem layout)
app.get('/login', (req, res) => {
  res.render('login', {
    layout: false,  // Login tem estrutura HTML própria
    title: 'LogVert | Login',
    year: new Date().getFullYear(),
    head: `
      <link rel="stylesheet" href="/css/global.css">
      <link rel="stylesheet" href="/pages/login/login.css">
      <link rel="stylesheet" href="/pages/login/demo_mode.css">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    `,
    pageScripts: `
      <script src="https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js"></script>
      <script src="/js/api/apiClient.js"></script>
      <script src="/pages/login/login.js" defer></script>
    `
  });
});
// ... código anterior

// 1. Você cola as rotas aqui (Linha 144):
app.get('/esqueci-senha-lojista', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/esqueci_senha.lojista/esqueci_senha.html'));
});

// Rota para Central de Trocas e Devoluções (Lojista)
app.get('/solicitacoes', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/devolucoes/devolucoes.html'));
});

// Rota alternativa para Trocas e Devoluções (usada no sidebar do lojista)
app.get('/devolucoes', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/devolucoes/devolucoes.html'));
});

// Rota para Nova Solicitação (Consumidor)
app.get('/solicitacoes/nova', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/solicitacao/solicitacao.html'));
});

// Rota para Feedbacks do Lojista (FAQ)
app.get('/FAQ', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/FAQ/faq.html'));
});

// Rota para o Dashboard do Lojista
app.get('/menu.lojista', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/menu.lojista/menuLojista.html'));
});

// Rota para Feedbacks do Consumidor (FAQ Cliente)
app.get('/FAQ-cliente', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/FAQ_cliente/FAQ.html'));
});






// Fallback para servir arquivos estáticos por caminho (mantém comportamento anterior)
// CORREÇÃO: Não redireciona para '/' em caso de erro — retorna 404
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', req.path), (err) => {
    if (err) {
      res.status(404).send('Página não encontrada');
    }
  });
});

app.listen(port, () => {
  console.log(`Servidor frontend rodando em http://localhost:${port}`);
  console.log('Acesse seu site em: http://localhost:' + port);
});