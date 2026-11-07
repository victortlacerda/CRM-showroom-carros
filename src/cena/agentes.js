// Comportamento de clientes (guiado pelo funil/follow-up) e funcionários (rotinas).
import * as THREE from 'three';
import { Pessoa, estiloCliente, estiloFuncionario } from './pessoa.js';
import { Confete, criarIcone, criarAnelUrgencia, materialAnel, criarAura, pulsarAura } from './efeitos.js';
import {
  rota, GRAFO, MESAS_NEGOCIACAO, MESAS_VENDEDOR, ESCRITORIO, ESCRITORIO_PONTOS as EP, RECEPCAO_PONTOS, CIRCUITO_TESTDRIVE, ZONAS, RUA,
} from './layout.js';
import { clamp } from './util.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const N = (id) => ({ x: GRAFO.nos[id][0], z: GRAFO.nos[id][1], y: GRAFO.nos[id][2] });
const NOS_EXPLORAR = ['a1_-8', 'a1_0', 'a1_8', 'a1_16', 'a2_-8', 'a2_0', 'a2_8', 'a2_16', 'a0_-4', 'a0_14', 'a1_-13', 'a1_25'];
const LIMITE_CALCADA = [-64, 76];

// ----------------------------------------------------------------------------------------------
class Cliente {
  constructor(ag, lead) {
    this.ag = ag; this.lead = lead; this.tipo = 'cliente';
    this.pessoa = new Pessoa(estiloCliente(hash(lead.id)));
    this.pessoa.grupo.userData.agente = this; this.pessoa.grupo.userData.tipo = 'cliente'; this.pessoa.grupo.userData.id = lead.id;
    this.pessoa.grupo.traverse((o) => { o.userData.agente = this; });
    this.anel = criarAnelUrgencia(); this.pessoa.grupo.add(this.anel);
    this.icone = null; this.iconeTipo = null;
    this.aura = null;
    this.modo = 'oculto'; this.zona = null; this.t = 0; this.lane = rnd(8.3, 11.6); this.home = rnd(-45, 66);
    this.vendedorPerto = false; this.assento = null; this.carroTemp = null; this.lapT = 0; this.destacado = false;
    this.pessoa.grupo.visible = false; ag.raiz.add(this.pessoa.grupo);
  }
  get pos() { return this.pessoa.pos; }

  /** Ponto para onde o cliente vai (ou está). */
  alvoAtual() { const c = this.pessoa.caminho; return c.length ? c[c.length - 1] : this.pessoa.pos; }

  /** Recalcula o comportamento a partir do CRM. `inicial` = posiciona direto, sem caminhar. */
  sincronizar(inicial = false) {
    const loja = this.ag.loja;
    const pc = loja.posicaoCliente(this.lead);
    this.info = pc;
    this._atualizarIndicadores(pc);
    const zona = pc.zona;
    if (zona === this.zona) return;
    const antes = this.zona;
    this._largarAssento(); this._largarTestDrive();
    this.zona = zona; this.t = 0;

    if (zona === 'fora' || (zona === 'saida' && inicial)) { this._ocultar(); this.modo = 'oculto'; return; }
    if (!this.pessoa.grupo.visible) this._aparecer(zona, inicial);

    switch (zona) {
      case 'calcada': this.modo = 'calcada'; if (inicial || !antes) this._colocarInicial(zona); this._proximoPassoCalcada(); break;
      case 'porta': this.modo = 'porta'; if (inicial) this._colocarInicial(zona); this._irPara({ x: 6 + rnd(-1.4, 1.4), z: 6.6 + rnd(0, 0.6) }, { poseFinal: 'esperar', rotFinal: Math.PI }); break;
      case 'showroom': this.modo = 'explorar'; if (inicial) this._colocarInicial(zona); this._proximoExplorar(); break;
      case 'testdrive': this.modo = 'testdrive'; if (inicial) this._colocarInicial('porta'); this._iniciarTestDrive(); break;
      case 'mesa': this._irParaMesa(inicial); break;
      case 'escritorio': this._irParaEscritorio(inicial); break;
      case 'saida': this._celebrar(); break;
      default: break;
    }
  }

  _atualizarIndicadores(pc) {
    const tipoIcone = pc.icone;
    if (tipoIcone !== this.iconeTipo) {
      if (this.icone) this.icone.removeFromParent();
      this.icone = tipoIcone ? criarIcone(tipoIcone) : null; this.iconeTipo = tipoIcone;
      if (this.icone) { this.icone.position.y = 2.25; this.pessoa.grupo.add(this.icone); }
    }
    this.anel.material = materialAnel[pc.urgencia.nivel] || materialAnel.nenhum;
  }

  _aparecer(zona, inicial) {
    this.pessoa.grupo.visible = true;
    if (!inicial) { // entra pela ponta da calçada
      const x = this.pessoa.pos.x || (Math.random() < 0.5 ? -92 : 84);
      this.pessoa.colocar(x < 0 ? -92 : 84, this.lane, 0, x < 0 ? Math.PI / 2 : -Math.PI / 2);
    }
  }
  _ocultar() { this.pessoa.grupo.visible = false; if (this.aura) { this.aura.removeFromParent(); this.aura = null; } }

  _colocarInicial(zona) {
    const p = this.pessoa;
    if (zona === 'calcada') p.colocar(rnd(LIMITE_CALCADA[0], LIMITE_CALCADA[1]), this.lane, 0, rnd(-3, 3));
    else if (zona === 'porta') p.colocar(6 + rnd(-1.4, 1.4), 6.8, 0, Math.PI);
    else if (zona === 'showroom') { const n = N(pick(NOS_EXPLORAR)); p.colocar(n.x, n.z, 0, rnd(-3, 3)); }
    else p.colocar(6, 6.8, 0, Math.PI);
  }

  _irPara(destino, opcoes) {
    const pts = rota({ x: this.pessoa.pos.x, z: this.pessoa.pos.z, y: this.pessoa.pos.y }, { y: 0, ...destino });
    this.pessoa.irPara(pts, { vel: 1.3 + Math.random() * 0.15, ...opcoes });
  }

  // --- calçada ---
  _proximoPassoCalcada() {
    const atrasado = this.info?.atrasado;
    const dx = rnd(-30, 30) || 10;
    const x = clamp(this.pessoa.pos.x + dx, LIMITE_CALCADA[0], LIMITE_CALCADA[1]);
    const pts = [{ x: this.pessoa.pos.x, z: this.lane }];
    // sai do prédio / de outra zona antes de caminhar pela calçada
    const fora = this.pessoa.pos.z < 7;
    const caminho = fora ? rota({ x: this.pessoa.pos.x, z: this.pessoa.pos.z, y: this.pessoa.pos.y }, { x, z: this.lane, y: 0 }) : [...pts, { x, z: this.lane }];
    const parar = atrasado ? 0 : rnd(2.5, 6);
    this.pessoa.irPara(caminho, {
      vel: atrasado ? rnd(1.6, 1.9) : rnd(1.0, 1.4), poseFinal: 'esperar', rotFinal: Math.PI + rnd(-0.5, 0.5),
      aoChegar: () => { this.t = parar; },
    });
  }

  // --- showroom ---
  _proximoExplorar() {
    const id = pick(NOS_EXPLORAR); const n = N(id);
    const olhar = n.z < -8 ? -1 : n.z > 0 ? 1 : (Math.random() < 0.5 ? -1 : 1);
    this._irPara({ x: n.x + rnd(-1.5, 1.5), z: n.z }, {
      poseFinal: 'esperar', rotFinal: olhar < 0 ? Math.PI + rnd(-0.4, 0.4) : rnd(-0.4, 0.4),
      aoChegar: () => { this.t = rnd(6, 12); },
    });
  }

  // --- mesa de negociação ---
  _irParaMesa(inicial) {
    const idx = this.ag.reservarMesa(this.lead.id);
    if (idx < 0) { this.zona = 'showroom'; this.modo = 'explorar'; if (inicial) this._colocarInicial('showroom'); this._proximoExplorar(); return; }
    this.assento = { tipo: 'mesa', idx };
    const m = MESAS_NEGOCIACAO[idx]; const s = { x: m.x - 0.95, z: m.z };
    this.modo = 'mesa'; this.t = rnd(8, 16);
    if (inicial) this.pessoa.colocar(s.x, s.z, 0, Math.PI / 2);
    this._irPara(s, { poseFinal: 'sentado', rotFinal: Math.PI / 2 });
  }

  // --- escritório ---
  _irParaEscritorio(inicial) {
    const ass = this.ag.reservarAssentoEscritorio(this.lead.id, this.lead.etapa === 'assinatura');
    this.assento = { tipo: 'escritorio', ass };
    this.modo = 'escritorio'; this.t = rnd(6, 12);
    const alvo = { x: ass.x, z: ass.z, y: ESCRITORIO.y };
    if (inicial) this.pessoa.colocar(ass.x, ass.z, ESCRITORIO.y, ass.rot);
    const pts = rota({ x: this.pessoa.pos.x, z: this.pessoa.pos.z, y: this.pessoa.pos.y }, alvo);
    this.pessoa.irPara(pts, { vel: 1.35, poseFinal: this.lead.etapa === 'assinatura' ? 'assinar' : 'sentado', rotFinal: ass.rot });
    if (this.info?.destaque) { this.aura = criarAura(); this.aura.position.set(ass.x, ESCRITORIO.y + 0.04, ass.z); this.ag.raiz.add(this.aura); }
  }

  // --- test-drive ---
  _iniciarTestDrive() {
    this.ag.carros.setEmTestDrive(this.lead.carroPrincipal, true);
    this.carroTemp = this.ag.carros.criarTemporario(this.lead.carroPrincipal);
    this.carroTemp.visible = false; this.ag.raiz.add(this.carroTemp);
    this.fase = 'ir'; this.lapT = 0;
    const alvo = { x: 6, z: 6.4 };
    this._irPara(alvo, { poseFinal: 'esperar', aoChegar: () => { this.fase = 'dirigir'; this.lapT = 0; this.pessoa.grupo.visible = false; this.carroTemp.visible = true; } });
    if (this.pessoa.chegou && this.fase === 'ir') { this.fase = 'dirigir'; this.pessoa.grupo.visible = false; this.carroTemp.visible = true; }
  }
  _tickTestDrive(dt) {
    if (this.fase === 'dirigir' && this.carroTemp) {
      const c = CIRCUITO_TESTDRIVE; const vel = 8.5;
      this.lapT += dt * vel;
      let total = 0; const seg = [];
      for (let i = 0; i < c.length - 1; i++) { const l = Math.hypot(c[i + 1].x - c[i].x, c[i + 1].z - c[i].z); seg.push(l); total += l; }
      let s = this.lapT; if (s >= total) { this.fase = 'voltou'; this.t = rnd(5, 9); this.carroTemp.visible = false; this.pessoa.colocar(6, 6.6, 0, Math.PI); this.pessoa.grupo.visible = true; this.pessoa.definirPose('conversar'); return; }
      let i = 0; while (s > seg[i]) { s -= seg[i]; i++; }
      const k = s / seg[i]; const a = c[i], b = c[i + 1];
      const x = a.x + (b.x - a.x) * k, z = a.z + (b.z - a.z) * k;
      const alvoRot = Math.atan2(-(b.z - a.z), b.x - a.x);
      const g = this.carroTemp; g.position.set(x, 0.12, z);
      let d = alvoRot - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); g.rotation.y += d * Math.min(1, dt * 6);
    } else if (this.fase === 'voltou' && this.t <= 0) {
      // descansa um pouco e sai de novo (ciclo contínuo enquanto estiver em test-drive)
      this.fase = 'ir'; this.pessoa.parar('esperar'); this.pessoa.grupo.visible = true;
      this.carroTemp.visible = false; this.fase = 'dirigir'; this.lapT = 0; this.pessoa.grupo.visible = false; this.carroTemp.visible = true;
    }
  }
  _largarTestDrive() {
    if (this.carroTemp) { this.carroTemp.removeFromParent(); this.carroTemp = null; this.ag.carros.setEmTestDrive(this.lead.carroPrincipal, false); this.pessoa.grupo.visible = true; }
  }

  // --- venda: comemora e vai embora ---
  _celebrar() {
    this.modo = 'celebrar';
    this._irPara({ x: 6, z: 7.2 }, {
      poseFinal: 'comemorar', rotFinal: Math.PI,
      aoChegar: () => { this.ag.confete.explodir(6, 2.2, 6.4, 110); this.t = 4.5; },
    });
  }
  _sair() {
    this.modo = 'saindo';
    const x = this.pessoa.pos.x < 6 ? -96 : 88;
    this.pessoa.irPara([{ x: this.pessoa.pos.x, z: this.lane }, { x, z: this.lane }], { vel: 1.5, aoChegar: () => { this._ocultar(); this.modo = 'oculto'; } });
  }

  _largarAssento() {
    if (this.assento?.tipo === 'mesa') this.ag.liberarMesa(this.lead.id);
    if (this.assento?.tipo === 'escritorio') this.ag.liberarAssentoEscritorio(this.lead.id);
    this.assento = null;
    if (this.aura) { this.aura.removeFromParent(); this.aura = null; }
  }

  tick(dt, tempo) {
    this.t -= dt; const p = this.pessoa;
    switch (this.modo) {
      case 'calcada': if (p.chegou && this.t <= 0) this._proximoPassoCalcada(); break;
      case 'explorar':
        if (p.chegou && this.t <= 0) this._proximoExplorar();
        if (p.chegou) p.definirPose(this.vendedorPerto ? 'conversar' : 'esperar');
        break;
      case 'porta': if (p.chegou) p.definirPose(this.vendedorPerto ? 'conversar' : 'esperar'); break;
      case 'mesa':
        if (p.chegou && this.t <= 0) { p.definirPose(p.poseFinal === 'assinar' ? 'sentado' : 'assinar'); this.t = p.poseFinal === 'assinar' ? rnd(4, 6) : rnd(10, 18); }
        break;
      case 'escritorio':
        if (p.chegou && this.t <= 0 && this.lead.etapa === 'documentacao') { p.definirPose(p.poseFinal === 'assinar' ? 'sentado' : 'assinar'); this.t = p.poseFinal === 'assinar' ? rnd(4, 6) : rnd(8, 14); }
        break;
      case 'testdrive': this._tickTestDrive(dt); break;
      case 'celebrar': if (p.chegou && this.t <= 0 && this.t > -50) { this._sair(); } break;
      default: break;
    }
    if (this.aura) pulsarAura(this.aura, tempo);
    this.anel.scale.setScalar(this.destacado ? 1.7 + 0.25 * Math.sin(tempo * 5) : 1);
    if (this.icone) this.icone.position.y = 2.3 + Math.sin(tempo * 3 + this.pessoa.fase) * 0.06;
    p.atualizar(dt);
    this.anel.visible = this.modo !== 'testdrive' || this.fase === 'voltou';
    this.vendedorPerto = false; // o vendedor liga novamente no próprio tick
  }
}

// ----------------------------------------------------------------------------------------------
class Funcionario {
  constructor(ag, f, idx) {
    this.ag = ag; this.f = f; this.tipo = 'funcionario'; this.idx = idx;
    this.pessoa = new Pessoa(estiloFuncionario(f, hash(f.id)));
    this.pessoa.grupo.userData.agente = this; this.pessoa.grupo.userData.tipo = 'funcionario'; this.pessoa.grupo.userData.id = f.id;
    this.pessoa.grupo.traverse((o) => { o.userData.agente = this; });
    ag.raiz.add(this.pessoa.grupo);
    this.modo = 'inicio'; this.t = rnd(2, 8); this.re = 0; this.tarefa = null; this.alvoVisto = null; this.carroAlvo = null;
    this.mesaIdx = ag.funcionarios.length; // posição do vendedor na lista de mesas
    this.iniciar();
  }
  get pos() { return this.pessoa.pos; }

  iniciar() {
    const p = this.pessoa; const c = this.f.cargo;
    if (c === 'vendedor') { const s = this._mesaVendedor(); p.colocar(s.x, s.z, 0, 0); p.definirPose('digitar'); this.modo = 'mesa'; }
    if (c === 'recepcionista') { const r = RECEPCAO_PONTOS.recepcionista; p.colocar(r.x, r.z, 0, 0); p.definirPose('digitar'); this.modo = 'fixo'; }
    if (c === 'gerente') { p.colocar(EP.gerente.x, EP.gerente.z + 0.5, ESCRITORIO.y, Math.PI); p.definirPose('digitar'); this.modo = 'fixo'; this.t = rnd(15, 30); }
    if (c === 'financeiro') { p.colocar(EP.financeiro.x, EP.financeiro.z + 0.6, ESCRITORIO.y, Math.PI); p.definirPose('digitar'); this.modo = 'fixo'; }
    if (c === 'mecanico') { p.colocar(43.5, -13.2, 0, Math.PI); p.definirPose('esperar'); this.modo = 'oficina'; }
    if (c === 'lavador') { p.colocar(52.75, -10.5, 0, Math.PI); p.definirPose('esperar'); this.modo = 'lavajato'; }
    p.atualizar(0.016);
  }
  _mesaVendedor() { const m = MESAS_VENDEDOR[this.ag.indiceVendedor(this.f.id) % MESAS_VENDEDOR.length]; return { x: m.x, z: m.z - 0.9 }; }

  tick(dt, tempo) {
    this.t -= dt; this.re -= dt;
    switch (this.f.cargo) {
      case 'vendedor': this._tickVendedor(); break;
      case 'gerente': this._tickGerente(); break;
      case 'financeiro': this._tickFinanceiro(tempo); break;
      case 'mecanico': this._tickOficina('oficina', 'martelar'); break;
      case 'lavador': this._tickOficina('lavajato', 'lavar'); break;
      default: break;
    }
    this.pessoa.atualizar(dt);
  }

  // ---- vendedor ----
  _tarefasPossiveis() {
    return this.ag.listaClientes().filter((c) => c.lead.vendedorId === this.f.id && c.pessoa.grupo.visible && ['porta', 'explorar', 'mesa'].includes(c.modo) && c.zona !== 'testdrive');
  }
  _tickVendedor() {
    const p = this.pessoa;
    if (this.re <= 0) {
      this.re = 0.9;
      const tarefas = this._tarefasPossiveis();
      const valida = this.tarefa && tarefas.includes(this.tarefa);
      if (!valida || this.t <= 0) {
        if (tarefas.length) {
          const outros = tarefas.filter((c) => c !== this.tarefa);
          const proxima = (outros.length ? outros : tarefas).sort((a, b) => (a.modo === 'porta' ? -1 : 0) - (b.modo === 'porta' ? -1 : 0))[0];
          if (proxima !== this.tarefa || !valida) { this.tarefa = proxima; this.alvoVisto = null; }
          this.t = rnd(14, 22); this.modo = 'atender';
        } else if (this.modo === 'atender') { this.tarefa = null; this._voltarMesa(); }
      }
      if (this.modo === 'atender' && this.tarefa) this._guiarAteCliente();
      if (this.modo === 'mesa' && !this.tarefa && this.t <= 0 && p.chegou) { // passeio ocasional
        this.t = rnd(28, 55); const n = N(pick(NOS_EXPLORAR));
        const pts = rota({ x: p.pos.x, z: p.pos.z, y: 0 }, n); this.modo = 'passeio';
        p.irPara(pts, { vel: 1.3, poseFinal: 'esperar', rotFinal: Math.PI, aoChegar: () => { this.t = rnd(5, 9); } });
      }
    }
    if (this.modo === 'passeio' && p.chegou && this.t <= 0) { this._voltarMesa(); }
    if (this.tarefa && this.modo === 'atender') { // avisa o cliente que há vendedor por perto
      const c = this.tarefa;
      if (p.chegou && dist(p.pos, c.pos) < 2.4) c.vendedorPerto = true;
    }
  }
  _voltarMesa() {
    const s = this._mesaVendedor(); const p = this.pessoa;
    const pts = rota({ x: p.pos.x, z: p.pos.z, y: 0 }, s); this.modo = 'mesa'; this.t = rnd(10, 30);
    p.irPara(pts, { vel: 1.4, poseFinal: 'digitar', rotFinal: 0 });
  }
  _guiarAteCliente() {
    const c = this.tarefa; const p = this.pessoa;
    if (c.modo === 'mesa' && c.assento?.tipo === 'mesa') {
      const m = MESAS_NEGOCIACAO[c.assento.idx]; const s = { x: m.x + 0.95, z: m.z };
      if (!this.alvoVisto || dist(this.alvoVisto, s) > 0.3) { this.alvoVisto = s; p.irPara(rota({ x: p.pos.x, z: p.pos.z, y: 0 }, s), { vel: 1.5, poseFinal: 'sentado', rotFinal: -Math.PI / 2 }); }
      return;
    }
    const ac = c.alvoAtual();
    if (!c.pessoa.chegou) return; // espera o cliente parar
    const lado = (hash(this.f.id) % 2) ? 1 : -1;
    const s = c.modo === 'porta' ? { x: ac.x - 1.1, z: ac.z } : { x: ac.x + 1.0 * lado, z: ac.z + 0.1 };
    if (!this.alvoVisto || dist(this.alvoVisto, s) > 1.2) {
      this.alvoVisto = s;
      const rotF = Math.atan2(ac.x - s.x, ac.z - s.z);
      p.irPara(rota({ x: p.pos.x, z: p.pos.z, y: 0 }, s), { vel: 1.6, poseFinal: 'conversar', rotFinal: rotF });
    }
  }

  // ---- gerente / financeiro ----
  _tickGerente() {
    const p = this.pessoa;
    if (this.modo === 'fixo' && this.t <= 0 && p.chegou) {
      const m = EP.mesaReuniao; this.modo = 'reuniao';
      p.irPara(rota({ x: p.pos.x, z: p.pos.z, y: ESCRITORIO.y }, { x: m.x - 2, z: m.z + 0.3, y: ESCRITORIO.y }), { vel: 1.3, poseFinal: 'conversar', rotFinal: Math.PI / 2, aoChegar: () => { this.t = rnd(6, 10); } });
    } else if (this.modo === 'reuniao' && p.chegou && this.t <= 0) {
      this.modo = 'fixo'; this.t = rnd(25, 50);
      p.irPara(rota({ x: p.pos.x, z: p.pos.z, y: ESCRITORIO.y }, { x: EP.gerente.x, z: EP.gerente.z + 0.5, y: ESCRITORIO.y }), { vel: 1.3, poseFinal: 'digitar', rotFinal: Math.PI });
    }
  }
  _tickFinanceiro() {
    const p = this.pessoa;
    if (this.t <= 0 && p.chegou) {
      const alguem = this.ag.listaClientes().some((c) => c.modo === 'escritorio' && c.pessoa.chegou);
      p.definirPose(alguem && p.poseFinal === 'digitar' ? 'assinar' : 'digitar'); this.t = rnd(5, 10);
    }
  }

  // ---- mecânicos / lavador ----
  _tickOficina(zona, pose) {
    const p = this.pessoa; const loja = this.ag.loja;
    if (this.t > 0 && this.carroAlvo && loja.zonaDoCarro(this.carroAlvo) === zona) return;
    if (!p.chegou && this.t > 0) return;
    // escolhe um carro da zona (dentro do galpão) para trabalhar
    const lista = loja.carrosDaZona(zona).map((c) => ({ c, g: this.ag.carros.grupoDoCarro(c.id) })).filter((o) => o.g && o.g.position.z < 2 && !o.g.userData.emAnimacao);
    if (!lista.length) {
      if (this.modo !== 'ocioso') {
        this.modo = 'ocioso'; this.carroAlvo = null;
        const ref = zona === 'oficina' ? { x: 44.5, z: 1.5 } : { x: 52.75, z: 1.5 };
        p.irPara(rota({ x: p.pos.x, z: p.pos.z, y: 0 }, ref), { vel: 1.3, poseFinal: 'esperar', rotFinal: Math.PI });
      }
      this.t = 3; return;
    }
    const alvo = lista[(this.idx + Math.floor(performance.now() / 22000)) % lista.length];
    this.carroAlvo = alvo.c.id; this.modo = 'trabalhando'; this.t = rnd(18, 30);
    const gx = alvo.g.position.x, gz = alvo.g.position.z;
    const stand = { x: gx + (this.idx % 2 ? 0.7 : -0.7), z: gz + 2.0 };
    p.irPara(rota({ x: p.pos.x, z: p.pos.z, y: 0 }, stand), { vel: 1.4, poseFinal: pose, rotFinal: Math.PI });
  }
}

// ----------------------------------------------------------------------------------------------
export class Agentes {
  constructor(scene, loja, carros) {
    this.scene = scene; this.loja = loja; this.carros = carros;
    this.raiz = new THREE.Group(); scene.add(this.raiz);
    this.confete = new Confete(scene);
    this.clientes = new Map(); this.funcionarios = [];
    this.mesas = new Array(MESAS_NEGOCIACAO.length).fill(null);
    this.assentosEsc = [
      ...EP.financeiroVisitante.map((a) => ({ x: a.x, z: a.z, rot: Math.PI, tipo: 'assinatura', uso: null })),
      ...EP.assentosReuniao.map((a, i) => ({ x: a.x, z: a.z + (i < 2 ? -0.2 : 0.2), rot: i < 2 ? 0 : Math.PI, tipo: 'reuniao', uso: null })),
    ];
    this.vendedores = loja.funcionarios.filter((f) => f.cargo === 'vendedor').map((f) => f.id);
    for (const f of loja.funcionarios) this.funcionarios.push(new Funcionario(this, f, this.funcionarios.length));
    for (const l of loja.leads) { const c = new Cliente(this, l); this.clientes.set(l.id, c); }
    // ordem estável para reservar assentos
    for (const l of loja.leads) this.clientes.get(l.id).sincronizar(true);

    loja.on('leads', ({ id, todos, de, para }) => {
      if (todos) { for (const c of this.clientes.values()) c.sincronizar(false); return; }
      const c = this.clientes.get(id); if (!c) return;
      if (para === 'vendido' && c.modo !== 'oculto') c.zona = null; // força transição para "saída"
      c.sincronizar(false);
    });
    loja.on('carros', () => { for (const c of this.clientes.values()) c.info && c.sincronizar(false); });
    this.relogio = 0;
  }

  indiceVendedor(id) { return this.vendedores.indexOf(id); }
  listaClientes() { return [...this.clientes.values()]; }

  reservarMesa(leadId) { let i = this.mesas.indexOf(leadId); if (i >= 0) return i; i = this.mesas.indexOf(null); if (i < 0) return -1; this.mesas[i] = leadId; return i; }
  liberarMesa(leadId) { const i = this.mesas.indexOf(leadId); if (i >= 0) this.mesas[i] = null; }
  reservarAssentoEscritorio(leadId, assinatura) {
    let a = this.assentosEsc.find((s) => s.uso === leadId); if (a) return a;
    const ordem = assinatura ? ['assinatura', 'reuniao'] : ['reuniao', 'assinatura'];
    for (const tipo of ordem) { a = this.assentosEsc.find((s) => s.tipo === tipo && !s.uso); if (a) break; }
    if (!a) a = this.assentosEsc[this.assentosEsc.length - 1];
    a.uso = leadId; return a;
  }
  liberarAssentoEscritorio(leadId) { const a = this.assentosEsc.find((s) => s.uso === leadId); if (a) a.uso = null; }

  atualizar(dt) {
    this.relogio += dt;
    for (const f of this.funcionarios) f.tick(dt, this.relogio);
    for (const c of this.clientes.values()) c.tick(dt, this.relogio);
    this.confete.atualizar(dt);
    if (this.anelSel) {
      const g = this.selTipo ? this.posicaoDe(this.selTipo, this.selId) : null;
      this.anelSel.visible = !!g;
      if (g) { this.anelSel.position.set(g.x, g.y + 0.07, g.z); this.anelSel.material.opacity = 0.7 + 0.3 * Math.sin(this.relogio * 5); }
    }
  }

  /** Objetos clicáveis (grupos de pessoas visíveis). */
  picaveis() {
    const l = [];
    for (const f of this.funcionarios) l.push(f.pessoa.grupo);
    for (const c of this.clientes.values()) if (c.pessoa.grupo.visible) l.push(c.pessoa.grupo);
    return l;
  }
  clienteDoLead(id) { return this.clientes.get(id); }

  /** Posição atual (para focar a câmera) ou null se a pessoa não está visível. */
  posicaoDe(tipo, id) {
    const a = tipo === 'cliente' ? this.clientes.get(id) : this.funcionarioPorId(id);
    if (!a || !a.pessoa.grupo.visible) return null;
    return a.pessoa.grupo.position.clone();
  }
  /** Anel de seleção embaixo da pessoa escolhida. */
  selecionar(tipo, id) {
    if (!this.anelSel) {
      this.anelSel = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.86, 32), new THREE.MeshBasicMaterial({ color: 0x2f6fed, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }));
      this.anelSel.rotation.x = -Math.PI / 2; this.anelSel.renderOrder = 6; this.scene.add(this.anelSel);
    }
    this.selTipo = tipo; this.selId = id;
  }
  /** Realça (anel pulsante) um conjunto de leads; null limpa. */
  destacarClientes(ids) {
    for (const c of this.clientes.values()) c.destacado = !!ids && ids.has(c.lead.id);
  }
  funcionarioPorId(id) { return this.funcionarios.find((f) => f.f.id === id); }
}
