// ATENÇÃO: Cole aqui a URL do seu Web App gerado no Google Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbyQ1kAGgEmsp9tgcJOtWq59nKZylH4IamMmkudXPAZJ50O31iTsA3CBAQ-vOjNi1VHNlw/exec";

let produtosGlobais = [];
let lojasGlobais = [];
let produtosExibidos = []; 
let carrinho = [];
let favoritos = JSON.parse(localStorage.getItem('favoritosLG')) || [];

// Variáveis de controle para o Motor Central de Filtros
let filtroAtivo = { tipo: null, valor: null }; 
let buscaAtiva = "";

window.onload = async () => {
  await carregarDados();
};

async function carregarDados() {
  try {
    const response = await fetch(API_URL);
    const dados = await response.json();
    
    produtosGlobais = dados.produtos;
    lojasGlobais = dados.lojas; 
    produtosExibidos = [...produtosGlobais]; 
    
    renderizarLojas(lojasGlobais);
    renderizarCategorias(produtosGlobais);
    renderizarBanners(produtosGlobais);
    
    // Roda o motor central para desenhar a vitrine corretamente
    atualizarVitrine(); 
  } catch (error) {
    document.getElementById('vitrine').innerHTML = '<p>Erro ao conectar aos servidores.</p>';
  }
}

// 1. CARROSSEL DE LOJAS
function renderizarLojas(lojas) {
  const container = document.getElementById('listaLojas');
  container.innerHTML = lojas.map(loja => {
    const logo = loja.logo_url ? loja.logo_url : `https://ui-avatars.com/api/?name=${loja.nome_loja}&background=16161a&color=00f2ff`;
    return `
      <div class="store-card" onclick="filtrarPorLoja('${loja.id}', '${loja.nome_loja}')">
        <img src="${logo}" alt="${loja.nome_loja}" class="store-logo" style="${loja.status === 'fechada' ? 'filter: grayscale(1);' : ''}">
        <span class="store-name-card">${loja.nome_loja}</span>
      </div>
    `;
  }).join('');
}

// 2. CATEGORIAS (TAGS)
function renderizarCategorias(produtos) {
  const container = document.getElementById('categoriesArea');
  const categorias = [...new Set(produtos.map(p => p.categoria).filter(c => c))];
  
  container.innerHTML = categorias.map(cat => 
    `<div class="cat-pill" onclick="filtrarPorCategoria('${cat}')">${cat}</div>`
  ).join('');
}

// 3. BANNERS (PRODUTOS PATROCINADOS)
function renderizarBanners(produtos) {
  const container = document.getElementById('bannerArea');
  const destaques = produtos.filter(p => p.patrocinado && p.patrocinado.toLowerCase() === 'sim');
  
  if (destaques.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.innerHTML = destaques.map(p => `
    <div class="banner-card" onclick="abrirDetalhes('${p.id}')">
      <span class="tag-patrocinado">🔥 Destaque</span>
      <img src="${p.imagem_url}" alt="${p.nome}">
      <div class="banner-text">
        <h4>${p.nome}</h4>
        <p style="color: var(--neon-gold); font-weight: bold;">R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}</p>
      </div>
    </div>
  `).join('');
}

// 4. VITRINE DE PRODUTOS
function renderizarProdutos(produtos) {
  const container = document.getElementById('vitrine');
  if (produtos.length === 0) {
    container.innerHTML = '<p>Nenhum produto encontrado.</p>';
    return;
  }

  container.innerHTML = produtos.map(p => {
    const loja = lojasGlobais.find(l => l.id === p.loja_id) || { nome_loja: "Desconhecida", status: "aberta" };
    const isFechada = loja.status && loja.status.toLowerCase() === 'fechada';
    const isPatrocinado = p.patrocinado && p.patrocinado.toLowerCase() === 'sim';
    const isFavorito = favoritos.includes(p.id);

    return `
      <div class="product-card ${isPatrocinado ? 'sponsored' : ''} ${isFechada ? 'closed' : ''}" onclick="abrirDetalhes('${p.id}')">
        ${isFechada ? '<span class="store-status-badge">FECHADA</span>' : ''}
        <div class="heart-icon ${isFavorito ? 'active' : ''}" onclick="toggleFavorito('${p.id}', event)">
          ${isFavorito ? '♥' : '♡'}
        </div>
        <img src="${p.imagem_url}" alt="${p.nome}" class="product-image">
        <div class="product-info">
          <p class="store-name">🏢 ${loja.nome_loja}</p>
          <h3 class="product-title">${p.nome}</h3>
          <p class="product-price">R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}</p>
          <button class="btn-buy" ${isFechada ? 'disabled' : ''} onclick="adicionarAoCarrinho('${p.id}', event)">
            ${isFechada ? 'Indisponível' : 'Comprar'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// 5. SISTEMA DE FAVORITOS
function toggleFavorito(id, event) {
  event.stopPropagation(); 
  if (favoritos.includes(id)) {
    favoritos = favoritos.filter(fav => fav !== id);
  } else {
    favoritos.push(id);
  }
  localStorage.setItem('favoritosLG', JSON.stringify(favoritos));
  atualizarVitrine(); 
}

// 6. MODAL DE DETALHES DO PRODUTO
function abrirDetalhes(id) {
  const p = produtosGlobais.find(prod => prod.id === id);
  const loja = lojasGlobais.find(l => l.id === p.loja_id) || { nome_loja: "Desconhecida" };
  const modal = document.getElementById('modalDetalhes');
  const conteudo = document.getElementById('conteudoDetalhes');

  conteudo.innerHTML = `
    <span class="close" onclick="fecharModalDetalhes()">&times;</span>
    <p class="store-name">🏢 ${loja.nome_loja}</p>
    <h2>${p.nome}</h2>
    <img src="${p.imagem_url}" class="detalhes-img">
    <p class="detalhes-desc">${p.descricao ? p.descricao : 'Sem descrição disponível.'}</p>
    <h3 class="product-price">R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}</h3>
    <button class="btn-buy" style="margin-top: 15px;" onclick="adicionarAoCarrinho('${p.id}', event)">Adicionar ao Carrinho</button>
  `;
  modal.style.display = 'block';
}

function fecharModalDetalhes() {
  document.getElementById('modalDetalhes').style.display = 'none';
}

// 7. MOTOR CENTRAL DE FILTROS E ORDENAÇÃO
function atualizarVitrine() {
  let resultado = [...produtosGlobais];

  // Filtro ativo de Loja ou Categoria
  if (filtroAtivo.tipo === 'loja') {
    resultado = resultado.filter(p => p.loja_id == filtroAtivo.valor);
  } else if (filtroAtivo.tipo === 'categoria') {
    resultado = resultado.filter(p => p.categoria === filtroAtivo.valor);
  }

  // Filtro de Busca por digitação
  if (buscaAtiva !== "") {
    resultado = resultado.filter(p => 
      p.nome.toLowerCase().includes(buscaAtiva) || 
      (p.descricao && p.descricao.toLowerCase().includes(buscaAtiva)) ||
      (p.categoria && p.categoria.toLowerCase().includes(buscaAtiva))
    );
  }

  // Ordenação de preços
  const sortValue = document.getElementById('sortSelect').value;
  if (sortValue === 'menorPreco') {
    resultado.sort((a, b) => parseFloat(a.preco) - parseFloat(b.preco));
  } else if (sortValue === 'maiorPreco') {
    resultado.sort((a, b) => parseFloat(b.preco) - parseFloat(a.preco));
  }

  produtosExibidos = resultado;
  renderizarProdutos(produtosExibidos);
}

function ordenarProdutos() {
  atualizarVitrine();
}

function filtrarPorLoja(idLoja, nomeLoja) {
  filtroAtivo = { tipo: 'loja', valor: idLoja };
  document.getElementById('tituloVitrine').innerText = `Loja: ${nomeLoja}`;
  document.getElementById('btnLimparFiltro').style.display = 'inline-block';
  atualizarVitrine();
}

function filtrarPorCategoria(categoria) {
  filtroAtivo = { tipo: 'categoria', valor: categoria };
  document.getElementById('tituloVitrine').innerText = `Categoria: ${categoria}`;
  document.getElementById('btnLimparFiltro').style.display = 'inline-block';
  atualizarVitrine();
}

function filtrarBusca() {
  buscaAtiva = document.getElementById('searchInput').value.toLowerCase();
  atualizarVitrine();
}

function limparFiltros() {
  filtroAtivo = { tipo: null, valor: null }; 
  buscaAtiva = ""; 
  document.getElementById('searchInput').value = '';
  document.getElementById('tituloVitrine').innerText = "Todos os Produtos";
  document.getElementById('btnLimparFiltro').style.display = 'none';
  document.getElementById('sortSelect').value = 'recentes';
  atualizarVitrine();
}

// 8. CARRINHO E CHECKOUT VIA WHATSAPP
function adicionarAoCarrinho(idProduto, event) {
  if(event) event.stopPropagation(); 
  const produto = produtosGlobais.find(p => p.id === idProduto);
  if (produto) {
    carrinho.push(produto);
    atualizarContadorCarrinho();
    alert(`${produto.nome} adicionado!`);
    fecharModalDetalhes(); 
  }
}

function atualizarContadorCarrinho() {
  document.getElementById('cart-count').innerText = carrinho.length;
}

function toggleCarrinho() {
  const modal = document.getElementById('modalCarrinho');
  if (modal.style.display === "block") {
    modal.style.display = "none";
  } else {
    modal.style.display = "block";
    renderizarCarrinho();
  }
}

function renderizarCarrinho() {
  const container = document.getElementById('itensCarrinho');
  const valorTotalEl = document.getElementById('valorTotal');
  
  if (carrinho.length === 0) {
    container.innerHTML = '<p>Seu carrinho está vazio.</p>';
    valorTotalEl.innerText = "R$ 0,00";
    return;
  }

  let total = 0;
  container.innerHTML = carrinho.map((p, index) => {
    total += parseFloat(p.preco);
    return `
      <div class="cart-item">
        <span>${p.nome}</span>
        <span>R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}</span>
        <span style="color:red; cursor:pointer;" onclick="removerDoCarrinho(${index})">X</span>
      </div>
    `;
  }).join('');

  valorTotalEl.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

function removerDoCarrinho(index) {
  carrinho.splice(index, 1);
  atualizarContadorCarrinho();
  renderizarCarrinho();
}

function finalizarPedido() {
  if (carrinho.length === 0) return alert("Seu carrinho está vazio!");

  let textoMsg = "*NOVO PEDIDO - LG DIGITAL SHOPPING*%0A%0A";
  let total = 0;
  carrinho.forEach(p => {
    textoMsg += `- ${p.nome} (R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')})%0A`;
    total += parseFloat(p.preco);
  });
  textoMsg += `%0A*Total: R$ ${total.toFixed(2).replace('.', ',')}*%0A%0A`;
  
  const numeroWhatsApp = "5584999999999"; 
  window.open(`https://wa.me/${numeroWhatsApp}?text=${textoMsg}`, '_blank');
}