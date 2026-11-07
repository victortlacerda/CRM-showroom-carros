// Interface: barra, busca/filtros, HUD, navegação de câmera, painel de detalhes, simulação, alertas, tema e modo TV.
import './estilo.css';
import { html, esc, brl, dataBR, ZONA_NOME, pref } from './util.js';
import { ICONES, painelCarro, painelCliente, painelFuncionario, painelZona } from './paineis.js';
import { filtroVazio, filtroAtivo, aplicarFiltro, buscar } from './filtros.js';
import { Interacao } from './interacao.js';
import { PRESETS } from '../cena/camaras.js';

const ZONAS_NAV = [
  ['geral', 'Visão geral', null], ['loja', 'Loja', null], ['showroom', 'Showroom', 'showroom'], ['escritorio', 'Escritório', null],
  ['oficina', 'Oficina', 'oficina'], ['lavajato', 'Lava-jato', 'lavajato'], ['patio', 'Pátio', 'patio'], ['avaliacao', 'Avaliação', 'avaliacao'], ['calcada', 'Calçada', null],
];
const ROTEIRO_TV = ['loja', 'showroom', 'escritorio', 'oficina', 'lavajato', 'calcada', 'patio'];

export class UI {
  constructor(ctx) {
    this.ctx = ctx; const { loja } = ctx;
    this.sel = null; this.filtro = filtroVazio(); this.tema = pref.ler('tema', 'auto'); this.horario = pref.ler('horario', 'auto');
    this.pendente = false; this.tvTimer = null; this.tvIdx = 0; this.destaqueVendedor = null;
    this.raiz = document.getElementById('ui');
    this._construir();
    this._ligar();
    ctx.clima.setModo(this.horario);
    ctx.clima.onMudanca(() => this._aplicarTema());
    this._aplicarTema();
    this.interacao = new Interacao({
      canvas: ctx.canvas, camera: ctx.camera, scene: ctx.scene, carros: ctx.carros, agentes: ctx.agentes, loja, camaras: ctx.camaras,
      aoSelecionar: (t, id) => this.selecionar(t, id), aoHover: (a, x, y) => this._dica(a, x, y), aoZona: (z) => this.selecionar('zona', z),
      aoMover: (fase, id, info) => this._aoMover(fase, id, info),
    });
    loja.on('*', (ev, p) => this._aoEvento(ev, p));
    this.atualizar();
    setInterval(() => this._relogio(), 15000);
  }

  // ------------------------------------------------------------------ DOM
  _construir() {
    const { loja } = this.ctx;
    const cats = [...new Set(loja.carros.map((c) => c.categoria))].sort();
    const stat = ['disponivel', 'reservado', 'preparacao', 'manutencao', 'avaliacao'];
    const NOME_STATUS = { disponivel: 'Disponível', reservado: 'Reservado', preparacao: 'Em preparação', manutencao: 'Em manutenção', avaliacao: 'Em avaliação' };
    this.raiz.innerHTML = `
    <div class="barra">
      <div class="marca vidro"><div class="logo">${ICONES.carro}</div><div><b>${esc(loja.config.nomeLoja)}</b><small>Showroom 3D · CRM e estoque</small></div></div>
      <div class="busca rel">
        <div class="campo vidro">${ICONES.busca}<input id="busca" type="search" autocomplete="off" placeholder="Buscar carro, placa ou cliente   ( / )" aria-label="Buscar" />
          <button class="btn pequeno" id="btnFiltros" aria-expanded="false" aria-controls="popFiltros">${ICONES.filtro}<span class="rotulo-btn">Filtros</span><span id="nFiltros"></span></button></div>
        <div class="resultados vidro" id="resultados" role="listbox"></div>
        <div class="popover vidro" id="popFiltros">
          <div class="secao"><h3>Categoria</h3><div class="chips">${cats.map((c) => `<button class="chip" data-cat="${esc(c)}" aria-pressed="false">${esc(c)}</button>`).join('')}</div></div>
          <div class="secao"><h3>Situação</h3><div class="chips">${stat.map((s) => `<button class="chip" data-st="${s}" aria-pressed="false">${NOME_STATUS[s]}</button>`).join('')}</div></div>
          <div class="secao"><h3>Preço máximo</h3><select class="sel" id="fPreco"><option value="">Sem limite</option>${[60, 80, 100, 150, 200, 300, 500].map((v) => `<option value="${v * 1000}">até ${brl(v * 1000)}</option>`).join('')}</select></div>
          <div class="secao"><h3>Ano mínimo</h3><select class="sel" id="fAno"><option value="">Qualquer</option>${[2026, 2024, 2022, 2020, 2018].map((v) => `<option value="${v}">${v} ou mais novo</option>`).join('')}</select></div>
          <div class="secao"><h3>Km máximo</h3><select class="sel" id="fKm"><option value="">Qualquer</option>${[10, 30, 60, 100].map((v) => `<option value="${v * 1000}">até ${v}.000 km</option>`).join('')}</select></div>
          <div class="acoes"><button class="btn pequeno" id="limpaFiltros">Limpar filtros</button><button class="btn pequeno primario" id="fechaFiltros">Pronto</button></div>
        </div>
      </div>
      <div class="espaco"></div>
      <div class="grupo-seg vidro" role="group" aria-label="Câmera"><button data-cam="diorama" aria-pressed="true" title="Câmera diorama (limitada)">${ICONES.camera}<span class="rotulo-btn">Diorama</span></button><button data-cam="orbital" aria-pressed="false" title="Câmera orbital livre">Orbital</button></div>
      <div class="grupo-seg vidro" role="group" aria-label="Horário da cena"><button data-hor="auto" aria-pressed="false" title="Segue o horário do computador">Auto</button><button data-hor="dia" aria-pressed="false" aria-label="Dia">${ICONES.sol}</button><button data-hor="noite" aria-pressed="false" aria-label="Noite">${ICONES.lua}</button></div>
      <div class="grupo-seg vidro" role="group" aria-label="Tema"><button data-tema="auto" aria-pressed="false">Tema auto</button><button data-tema="claro" aria-pressed="false">Claro</button><button data-tema="escuro" aria-pressed="false">Escuro</button></div>
      <div class="rel"><button class="btn icone-so" id="btnAlertas" aria-label="Alertas" aria-expanded="false">${ICONES.sino}<span class="selo" id="seloAlertas">0</span></button><div class="alertas vidro" id="popAlertas"></div></div>
      <button class="btn" id="btnTV" title="Modo TV: tela da loja para um monitor">${ICONES.tv}<span class="rotulo-btn">Modo TV</span></button>
    </div>
    <div class="hud" id="hud"></div>
    <nav class="nav vidro" aria-label="Ir para"><h3>Ir para</h3>${ZONAS_NAV.map(([id, nome, z]) => `<button data-preset="${id}"><span>${nome}</span>${z ? `<span class="cont" data-cont="${z}">0</span>` : ''}</button>`).join('')}</nav>
    <aside class="painel vidro" id="painel" aria-live="polite"><header><div class="tit"><h2 id="pTitulo"></h2><p id="pSub"></p></div><button class="fechar" id="pFechar" aria-label="Fechar painel">${ICONES.fechar}</button></header><div class="corpo" id="pCorpo"></div></aside>
    <div class="sim vidro" aria-label="Simulação de dias">
      <div class="data"><b id="simData"></b><small>Simulação · dados em memória</small></div>
      <button class="btn pequeno" data-dias="1">+1 dia</button><button class="btn pequeno" data-dias="3">+3 dias</button><button class="btn pequeno" id="simReset" title="Recarrega os dados de exemplo">Reiniciar demo</button>
    </div>
    <button class="btn legenda-btn" id="btnLegenda" aria-expanded="false">${ICONES.ajuda}<span class="rotulo-btn">Legenda</span></button>
    <div class="legenda vidro" id="legenda">
      <h4>Como ler a loja</h4>
      <ul><li><span class="pt ok"></span>Anel verde: follow-up em dia</li><li><span class="pt atencao"></span>Anel amarelo: follow-up vence hoje</li><li><span class="pt atrasado"></span>Anel vermelho: atrasado (volta para a calçada)</li></ul>
      <ul><li><b>Calçada</b>: lead novo ou sem follow-up</li><li><b>Porta / showroom</b>: cliente quente em atendimento</li><li><b>Mesa</b>: negociação · <b>Escritório</b>: documentos e assinatura</li></ul>
      <p class="mini" style="margin:0">Arraste um carro até outra zona para mudar a situação dele. Clique em qualquer carro, pessoa ou zona para ver detalhes.</p>
    </div>
    <div class="dica" id="dica"></div><div class="toasts" id="toasts"></div>
    <div class="tv-info vidro" id="tvInfo"></div><button class="btn tv-sair" id="tvSair">Sair do modo TV (Esc)</button>`;
    this.$ = (s) => this.raiz.querySelector(s);
    this.$$ = (s) => [...this.raiz.querySelectorAll(s)];
  }

  // ------------------------------------------------------------------ eventos
  _ligar() {
    const { camaras, clima, loja } = this.ctx;
    const busca = this.$('#busca');
    busca.addEventListener('input', () => { this.filtro.texto = busca.value; this._renderResultados(); this._aplicarFiltro(); });
    busca.addEventListener('focus', () => this._renderResultados());
    busca.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const p = this.$('#resultados .item-resultado'); if (p) p.click(); }
      if (e.key === 'Escape') { busca.value = ''; this.filtro.texto = ''; this._renderResultados(); this._aplicarFiltro(); busca.blur(); }
    });
    this.$('#resultados').addEventListener('click', (e) => { const b = e.target.closest('[data-acao]'); if (b) { this.selecionar(b.dataset.tipo, b.dataset.id); this.$('#resultados').classList.remove('aberto'); } });
    addEventListener('pointerdown', (e) => { if (!e.target.closest('.busca')) this.$('#resultados').classList.remove('aberto'); if (!e.target.closest('.rel')) { this._fecharPop('popAlertas', 'btnAlertas'); } });

    const pf = this.$('#popFiltros');
    this.$('#btnFiltros').addEventListener('click', () => { const a = pf.classList.toggle('aberto'); this.$('#btnFiltros').setAttribute('aria-expanded', a); });
    this.$('#fechaFiltros').addEventListener('click', () => pf.classList.remove('aberto'));
    pf.addEventListener('click', (e) => {
      const c = e.target.closest('[data-cat]'), s = e.target.closest('[data-st]');
      if (c) { const k = c.dataset.cat; this.filtro.categorias.has(k) ? this.filtro.categorias.delete(k) : this.filtro.categorias.add(k); }
      if (s) { const k = s.dataset.st; this.filtro.status.has(k) ? this.filtro.status.delete(k) : this.filtro.status.add(k); }
      this._aplicarFiltro();
    });
    const num = (v) => (v === '' ? null : Number(v));
    this.$('#fPreco').addEventListener('change', (e) => { this.filtro.precoMax = num(e.target.value); this._aplicarFiltro(); });
    this.$('#fAno').addEventListener('change', (e) => { this.filtro.anoMin = num(e.target.value); this._aplicarFiltro(); });
    this.$('#fKm').addEventListener('change', (e) => { this.filtro.kmMax = num(e.target.value); this._aplicarFiltro(); });
    this.$('#limpaFiltros').addEventListener('click', () => this._limparFiltros());

    this.$$('[data-cam]').forEach((b) => b.addEventListener('click', () => { if (b.dataset.cam !== camaras.modo) camaras.alternarModo(); this._marcarBotoes(); }));
    this.$$('[data-hor]').forEach((b) => b.addEventListener('click', () => { this.horario = b.dataset.hor; pref.gravar('horario', this.horario); clima.setModo(this.horario); this._marcarBotoes(); }));
    this.$$('[data-tema]').forEach((b) => b.addEventListener('click', () => { this.tema = b.dataset.tema; pref.gravar('tema', this.tema); this._aplicarTema(); }));
    this.$$('[data-preset]').forEach((b) => b.addEventListener('click', () => { camaras.irPara(b.dataset.preset); this._marcarNav(); }));
    this.$('#btnAlertas').addEventListener('click', () => { const a = this.$('#popAlertas').classList.toggle('aberto'); this.$('#btnAlertas').setAttribute('aria-expanded', a); if (a) this._renderAlertas(); });
    this.$('#popAlertas').addEventListener('click', (e) => { const b = e.target.closest('[data-acao]'); if (b) { this.selecionar(b.dataset.tipo, b.dataset.id); this.$('#popAlertas').classList.remove('aberto'); } });
    this.$('#btnLegenda').addEventListener('click', () => { const a = this.$('#legenda').classList.toggle('aberto'); this.$('#btnLegenda').setAttribute('aria-expanded', a); });
    this.$('#hud').addEventListener('click', (e) => { const b = e.target.closest('[data-kpi]'); if (!b) return; if (b.dataset.kpi === 'atrasados') { this.$('#popAlertas').classList.add('aberto'); this._renderAlertas(); } if (b.dataset.kpi === 'parados') { this.$('#busca').value = ''; this._limparFiltros(); this._mostrarParados(); } });

    this.$$('[data-dias]').forEach((b) => b.addEventListener('click', () => this._avancar(Number(b.dataset.dias))));
    this.$('#simReset').addEventListener('click', () => location.reload());

    this.$('#pFechar').addEventListener('click', () => this.selecionar(null));
    const corpo = this.$('#pCorpo');
    corpo.addEventListener('click', (e) => this._acaoPainel(e));
    corpo.addEventListener('change', (e) => { const s = e.target.closest('select[data-acao="mover-carro"]'); if (s) { this.ctx.loja.moverCarroParaZona(s.dataset.id, s.value); } });

    this.$('#btnTV').addEventListener('click', () => this._entrarTV());
    this.$('#tvSair').addEventListener('click', () => this._sairTV());
    addEventListener('mousemove', () => { if (document.body.classList.contains('tv')) { document.body.classList.add('tv-mostra'); clearTimeout(this._tvOcultar); this._tvOcultar = setTimeout(() => document.body.classList.remove('tv-mostra'), 2800); } });
    addEventListener('keydown', (e) => {
      const digitando = /^(input|select|textarea)$/i.test(e.target.tagName);
      if (e.key === 'Escape') { if (document.body.classList.contains('tv')) this._sairTV(); else if (this.sel) this.selecionar(null); this.$('#popFiltros').classList.remove('aberto'); this.$('#popAlertas').classList.remove('aberto'); }
      if (!digitando && e.key === '/') { e.preventDefault(); this.$('#busca').focus(); }
    });
    ['pointerdown', 'wheel'].forEach((t) => this.ctx.canvas.addEventListener(t, () => { this.ctx.camaras.interromper(); this._marcarNav(true); }, { passive: true }));
    this._marcarBotoes(); this._marcarNav();
  }

  // ------------------------------------------------------------------ filtros / busca
  _aplicarFiltro() {
    const { loja, carros } = this.ctx; const f = this.filtro;
    this.$$('[data-cat]').forEach((b) => b.setAttribute('aria-pressed', f.categorias.has(b.dataset.cat)));
    this.$$('[data-st]').forEach((b) => b.setAttribute('aria-pressed', f.status.has(b.dataset.st)));
    const ids = aplicarFiltro(loja.carros, f);
    carros.setDestaque(ids);
    const n = [f.categorias.size, f.status.size, f.precoMax, f.anoMin, f.kmMax].filter((v) => v != null && v !== 0).length;
    this.$('#nFiltros').innerHTML = n ? `<span class="badge neutro" style="padding:1px 7px">${n}</span>` : '';
    this.ids = ids; this._renderHud();
  }
  _limparFiltros() {
    this.filtro = filtroVazio(); this.$('#busca').value = ''; this.$('#fPreco').value = ''; this.$('#fAno').value = ''; this.$('#fKm').value = '';
    this._aplicarFiltro(); this._renderResultados();
  }
  _mostrarParados() {
    const { loja, carros } = this.ctx;
    const ids = new Set(loja.carros.filter((c) => c.status !== 'vendido' && loja.diasEstoque(c) > 90).map((c) => c.id));
    this.ids = ids; carros.setDestaque(ids); this._renderHud();
    this._toast(`${ids.size} carros parados há mais de 90 dias estão em destaque na cena.`, 'warn');
  }
  _renderResultados() {
    const el = this.$('#resultados'); const t = this.$('#busca').value;
    if (!t.trim()) { el.classList.remove('aberto'); return; }
    const { loja } = this.ctx; const r = buscar(loja, t);
    const etapa = (id) => loja.config.etapas.find((e) => e.id === id)?.nome;
    const bloco = (tit, itens) => (itens.length ? `<h4>${tit}</h4>${itens.join('')}` : '');
    const corpo =
      bloco('Carros', r.carros.map((c) => `<button class="item-resultado" data-acao data-tipo="carro" data-id="${esc(c.id)}"><span class="amostra" style="background:${esc(c.corHex)}"></span><div><b>${esc(c.marca)} ${esc(c.modelo)} ${esc(c.versao)}</b><div class="sub">${c.anoModelo} · ${esc(c.placa)} · ${brl(c.precoVenda)}</div></div></button>`)) +
      bloco('Clientes', r.clientes.map((l) => `<button class="item-resultado" data-acao data-tipo="cliente" data-id="${esc(l.id)}"><div><b>${esc(l.nome)}</b><div class="sub">${esc(etapa(l.etapa))} · ${esc(l.telefone)}</div></div></button>`)) +
      bloco('Equipe', r.equipe.map((f) => `<button class="item-resultado" data-acao data-tipo="funcionario" data-id="${esc(f.id)}"><span class="amostra" style="background:${esc(f.cor)}"></span><div><b>${esc(f.nome)}</b><div class="sub">${esc(f.cargo)}</div></div></button>`));
    el.innerHTML = corpo || '<div class="mini" style="padding:10px">Nada encontrado.</div>'; el.classList.add('aberto');
  }

  // ------------------------------------------------------------------ seleção e painel
  selecionar(tipo, id) {
    const { carros, agentes, camaras, loja } = this.ctx;
    this.sel = tipo ? { tipo, id } : null;
    carros.selecionar(tipo === 'carro' ? id : null);
    agentes.selecionar(tipo === 'cliente' || tipo === 'funcionario' ? tipo : null, id);
    if (tipo !== 'funcionario') { agentes.destacarClientes(null); this.destaqueVendedor = null; }
    if (!tipo) { this.$('#painel').classList.remove('aberto'); return; }
    this._renderPainel(true);
    // foco suave da câmera
    if (tipo === 'carro') { const p = carros.posicaoDoCarro(id); if (p) camaras.focarEm(new (p.constructor)(p.x, 1, p.z), Math.min(camaras._esfericas().r, 34)); }
    if (tipo === 'cliente' || tipo === 'funcionario') { const p = agentes.posicaoDe(tipo, id); if (p) camaras.focarEm(p.setY(p.y + 1), Math.min(camaras._esfericas().r, 26)); }
    if (tipo === 'zona' && PRESETS[id]) camaras.irPara(id);
    if (tipo !== 'zona') this._marcarNav(true); else this._marcarNav();
    void loja;
  }
  _renderPainel(abrir = false) {
    if (!this.sel) return; const { loja } = this.ctx; const { tipo, id } = this.sel; let p = null;
    if (tipo === 'carro') { const c = loja.carro(id); if (c) p = painelCarro(loja, c); }
    if (tipo === 'cliente') { const l = loja.lead(id); if (l) p = painelCliente(loja, l); }
    if (tipo === 'funcionario') { const f = loja.funcionario(id); if (f) p = painelFuncionario(loja, f); }
    if (tipo === 'zona') p = painelZona(loja, id);
    if (!p) return;
    const corpo = this.$('#pCorpo'); const rolagem = abrir ? 0 : corpo.scrollTop;
    this.$('#pTitulo').textContent = p.titulo; this.$('#pSub').textContent = p.subtitulo; corpo.innerHTML = p.html; corpo.scrollTop = rolagem;
    this.$('#painel').classList.add('aberto');
  }
  _acaoPainel(e) {
    const b = e.target.closest('[data-acao]'); if (!b || b.tagName === 'SELECT') return;
    const { loja, agentes, camaras } = this.ctx; const { acao, id } = b.dataset;
    if (acao === 'sel-carro') this.selecionar('carro', id);
    else if (acao === 'sel-lead') this.selecionar('cliente', id);
    else if (acao === 'sel-func') this.selecionar('funcionario', id);
    else if (acao === 'etapa') { const l = loja.lead(id); const nome = l.nome; const antes = l.etapa; loja.mudarEtapa(id, b.dataset.etapa);
      if (b.dataset.etapa === 'vendido') this._toast(`Venda fechada: ${nome} 🎉`, 'ok'); else if (antes !== b.dataset.etapa) this._toast(`${nome} → ${loja.config.etapas.find((x) => x.id === b.dataset.etapa).nome}`, 'ok'); }
    else if (acao === 'contato') { loja.registrarContato(id); this._toast('Contato registrado hoje. O cliente volta ao fluxo normal.', 'ok'); }
    else if (acao === 'temp') loja.ajustarTemperatura(id, b.dataset.valor);
    else if (acao === 'foco-cliente') { const p = agentes.posicaoDe('cliente', id); if (p) camaras.focarEm(p.setY(p.y + 1), 22); else this._toast('Este cliente não está na cena (venda concluída ou perdido).', 'warn'); }
    else if (acao === 'destacar-vendedor') {
      if (this.destaqueVendedor === id) { agentes.destacarClientes(null); this.destaqueVendedor = null; }
      else { agentes.destacarClientes(new Set(loja.leadsDoVendedor(id).map((l) => l.id))); this.destaqueVendedor = id; }
    }
  }

  // ------------------------------------------------------------------ HUD, nav, alertas
  _renderHud() {
    const { loja } = this.ctx; const r = loja.resumo();
    const k = (v, rot, cls = '', kpi = '') => `<${kpi ? 'button' : 'div'} class="kpi ${cls}" ${kpi ? `data-kpi="${kpi}"` : ''}><b>${v}</b><span>${rot}</span></${kpi ? 'button' : 'div'}>`;
    const fil = filtroAtivo(this.filtro) || this.ids ? `<div class="kpi" style="flex-direction:row;align-items:center;gap:10px"><div><b>${this.ids ? this.ids.size : 0}</b><span>carros no filtro</span></div><button class="btn pequeno" id="hudLimpa">Limpar</button></div>` : '';
    this.$('#hud').innerHTML = k(r.estoque, 'Carros em estoque') + k(r.disponiveis, 'Disponíveis p/ venda', 'ok') + k(r.oficina + r.lavajato, 'Oficina + lava-jato') +
      k(r.leadsQuentes, 'Leads quentes', 'warn') + k(r.followUpsAtrasados, 'Follow-ups atrasados', r.followUpsAtrasados ? 'bad' : '', 'atrasados') + k(r.carrosParados, 'Parados +90 dias', r.carrosParados ? 'warn' : '', 'parados') + k(r.vendas, 'Vendas fechadas', 'ok') + fil;
    const l = this.$('#hudLimpa'); if (l) l.addEventListener('click', () => { this._limparFiltros(); this.ids = null; this.ctx.carros.setDestaque(null); this._renderHud(); });
  }
  _renderNavContadores() { const { loja } = this.ctx; this.$$('[data-cont]').forEach((s) => { s.textContent = loja.carrosDaZona(s.dataset.cont).length; }); }
  _marcarNav(limpar = false) {
    const atual = limpar ? null : this.ctx.camaras.presetAtual;
    this.$$('[data-preset]').forEach((b) => { if (b.dataset.preset === atual) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  }
  _marcarBotoes() {
    const { camaras } = this.ctx;
    this.$$('[data-cam]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.cam === camaras.modo));
    this.$$('[data-hor]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.hor === this.horario));
    this.$$('[data-tema]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.tema === this.tema));
  }
  _renderAlertas() {
    const { loja } = this.ctx; const lista = loja.alertas();
    this.$('#popAlertas').innerHTML = lista.length ? `<div class="lista">${lista.slice(0, 40).map((a) => `<button class="item" data-acao data-tipo="${a.tipo === 'lead' ? 'cliente' : 'carro'}" data-id="${esc(a.id)}"><span class="pt ${a.nivel === 'atrasado' ? 'atrasado' : 'atencao'}"></span><div class="corpo-item"><b>${esc(a.texto)}</b><small>${a.tipo === 'lead' ? 'Follow-up' : 'Estoque parado'}</small></div></button>`).join('')}</div>` : '<p class="mini" style="padding:8px">Tudo em dia. 🎉</p>';
  }
  _fecharPop(pop, btn) { this.$('#' + pop).classList.remove('aberto'); this.$('#' + btn).setAttribute('aria-expanded', 'false'); }

  // ------------------------------------------------------------------ simulação / eventos
  _avancar(n) {
    const { loja } = this.ctx; const antes = loja.resumo().followUpsAtrasados;
    loja.avancarDias(n);
    const depois = loja.resumo().followUpsAtrasados;
    this._toast(`Avançou ${n} dia(s). ${depois > antes ? `${depois - antes} cliente(s) voltaram para a calçada por falta de follow-up.` : 'Nenhum follow-up novo atrasou.'}`, depois > antes ? 'warn' : 'ok');
  }
  _aoEvento(ev, p) {
    if (ev === 'leads' && p?.para === 'vendido') { /* toast já disparado pela ação */ }
    if (!this.pendente) { this.pendente = true; requestAnimationFrame(() => { this.pendente = false; this.atualizar(); }); }
  }
  _aoMover(fase, id, info) {
    this._dica(null);
    if (fase === 'fim' && info?.mudou) {
      const c = this.ctx.loja.carro(id);
      this._toast(`${c.marca} ${c.modelo} → ${ZONA_NOME[info.para] || info.para}`, 'ok');
      if (this.sel?.id === id) this._renderPainel();
    }
  }
  atualizar() {
    const { loja } = this.ctx;
    this._renderHud(); this._renderNavContadores();
    this.$('#simData').textContent = dataBR(loja.hoje);
    const n = loja.alertas().filter((a) => a.nivel === 'atrasado').length;
    const selo = this.$('#seloAlertas'); selo.textContent = n; selo.style.display = n ? 'grid' : 'none';
    if (this.$('#popAlertas').classList.contains('aberto')) this._renderAlertas();
    if (this.sel) this._renderPainel();
    if (document.body.classList.contains('tv')) this._tvInfo();
  }
  _relogio() { if (document.body.classList.contains('tv')) this._tvInfo(); }

  // ------------------------------------------------------------------ dica (hover)
  _dica(alvo, x, y) {
    const el = this.$('#dica'); const { loja } = this.ctx;
    if (!alvo) { el.style.display = 'none'; return; }
    let h = '';
    if (alvo.tipo === 'carro') { const c = loja.carro(alvo.id); h = `<b>${esc(c.marca)} ${esc(c.modelo)}</b><small>${brl(c.precoVenda)} · ${c.anoModelo} · ${c.km.toLocaleString('pt-BR')} km</small>`; }
    if (alvo.tipo === 'cliente') { const l = loja.lead(alvo.id); const u = loja.urgencia(l); h = `<b>${esc(l.nome)}</b><small>${esc(loja.config.etapas.find((e) => e.id === l.etapa)?.nome)} · ${u.dias}d sem contato</small>`; }
    if (alvo.tipo === 'funcionario') { const f = loja.funcionario(alvo.id); h = `<b>${esc(f.nome)}</b><small>${esc(f.cargo)}</small>`; }
    el.innerHTML = h; el.style.display = 'block';
    el.style.left = Math.min(x + 14, innerWidth - 270) + 'px'; el.style.top = Math.min(y + 16, innerHeight - 70) + 'px';
  }

  _toast(msg, tom = 'ok') {
    const t = html(`<div class="toast ${tom}" role="status">${esc(msg)}</div>`); this.$('#toasts').appendChild(t); setTimeout(() => t.remove(), 4200);
    while (this.$('#toasts').children.length > 3) this.$('#toasts').firstChild.remove();
  }

  // ------------------------------------------------------------------ tema
  _aplicarTema() {
    const escuro = this.tema === 'escuro' || (this.tema === 'auto' && this.ctx.clima.ehNoite);
    document.documentElement.dataset.tema = escuro ? 'escuro' : 'claro';
    if (this.raiz) this._marcarBotoes();
  }

  // ------------------------------------------------------------------ modo TV
  _entrarTV() {
    document.body.classList.add('tv', 'tv-mostra'); this.selecionar(null);
    if (this.ctx.camaras.modo !== 'diorama') this.ctx.camaras.alternarModo();
    this.tvIdx = 0; this._tvPasso(); this.tvTimer = setInterval(() => this._tvPasso(), 13000); this._tvInfo();
    document.documentElement.requestFullscreen?.().catch(() => {});
    clearTimeout(this._tvOcultar); this._tvOcultar = setTimeout(() => document.body.classList.remove('tv-mostra'), 2800);
  }
  _sairTV() {
    document.body.classList.remove('tv', 'tv-mostra'); clearInterval(this.tvTimer); this.tvTimer = null;
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    this.ctx.camaras.irPara('loja'); this._marcarNav();
  }
  _tvPasso() { this.ctx.camaras.irPara(ROTEIRO_TV[this.tvIdx % ROTEIRO_TV.length]); this.tvIdx++; }
  _tvInfo() {
    const { loja } = this.ctx; const r = loja.resumo(); const h = new Date();
    this.$('#tvInfo').innerHTML = `<b>${esc(loja.config.nomeLoja)}</b><span>${r.disponiveis} carros disponíveis · ${r.leadsQuentes} clientes quentes · ${h.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>`;
  }
}
