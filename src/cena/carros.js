// Gerencia os carros na cena: criação, vagas por zona, animação de mudança de zona, destaque/filtros e etiquetas.
import * as THREE from 'three';
import { modeloDoTipo } from './modelosCarro.js';
import { vagasDaZona, ZONAS, MUNDO, RUA } from './layout.js';
import { clamp } from './util.js';

const matDetalhe = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.3, flatShading: true });
const matDim = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.9, flatShading: true, transparent: true, opacity: 0.35 });
const tintas = new Map();
export function matTinta(hex) {
  if (!tintas.has(hex)) tintas.set(hex, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.32, metalness: 0.25, flatShading: true }));
  return tintas.get(hex);
}

/** Cria um carro (grupo com 4 malhas mescladas). */
export function criarCarro(carroceria, corHex) {
  const m = modeloDoTipo(carroceria);
  const g = new THREE.Group();
  const tinta = new THREE.Mesh(m.tinta, matTinta(corHex)); tinta.castShadow = true; tinta.receiveShadow = true; tinta.name = 'tinta';
  const detalhe = new THREE.Mesh(m.detalhe, matDetalhe); detalhe.castShadow = true;
  g.add(tinta, detalhe);
  g.userData.dim = m.dim;
  g.userData.tinta = tinta;
  g.userData.corHex = corHex;
  return g;
}

const COR_DIAS = (d) => (d > 120 ? '#e5484d' : d > 90 ? '#f5a524' : d > 45 ? '#c6d134' : '#2ec27e');

function desenharEtiqueta(canvas, carro, dias, selecionado) {
  const x = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  x.clearRect(0, 0, w, h);
  const r = 22;
  x.fillStyle = selecionado ? '#2f6fed' : 'rgba(16,24,40,0.92)';
  x.beginPath(); x.roundRect(4, 4, w - 8, h - 8, r); x.fill();
  x.fillStyle = '#ffffff'; x.textBaseline = 'middle';
  x.font = '600 30px system-ui, sans-serif'; x.textAlign = 'left';
  const nome = `${carro.marca} ${carro.modelo}`;
  x.fillText(nome.length > 22 ? nome.slice(0, 21) + '…' : nome, 20, 38);
  x.font = '700 42px system-ui, sans-serif';
  x.fillStyle = '#ffd166';
  x.fillText(`R$ ${carro.precoVenda.toLocaleString('pt-BR')}`, 20, 86);
  // indicador de dias em estoque
  x.fillStyle = COR_DIAS(dias);
  x.beginPath(); x.arc(w - 40, 36, 14, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#fff'; x.font = '600 22px system-ui, sans-serif'; x.textAlign = 'right';
  x.fillText(`${dias}d`, w - 22, 80);
  if (carro.status === 'reservado') {
    x.fillStyle = '#f5a524'; x.beginPath(); x.roundRect(w - 190, h - 34, 170, 28, 8); x.fill();
    x.fillStyle = '#1a1e26'; x.font = '700 20px system-ui, sans-serif'; x.textAlign = 'center';
    x.fillText('RESERVADO', w - 105, h - 19);
  }
}

export class Carros {
  constructor(scene, loja) {
    this.scene = scene;
    this.loja = loja;
    this.raiz = new THREE.Group(); scene.add(this.raiz);
    this.objetos = new Map(); // id -> { grupo, tag, zona, anim }
    this.slots = {};          // zona -> array de ids|null
    this.zonaAtual = new Map();
    this.destaqueIds = null;  // Set | null (filtro)
    this.selecionadoId = null;
    this.animando = new Set();
    this.mostrarTags = true;
    this.vendaSaindo = [];

    this.anel = new THREE.Mesh(new THREE.RingGeometry(1, 1.12, 40), new THREE.MeshBasicMaterial({ color: 0x2f6fed, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }));
    this.anel.rotation.x = -Math.PI / 2; this.anel.visible = false; this.anel.renderOrder = 5; scene.add(this.anel);
    this.anelHover = this.anel.clone(); this.anelHover.material = this.anel.material.clone(); this.anelHover.material.color.set(0xffffff); this.anelHover.material.opacity = 0.7; scene.add(this.anelHover);

    for (const c of loja.carros) this._criar(c);
    this.reorganizar(false);
    loja.on('carros', ({ id }) => this.reorganizar(true, id));
    loja.on('dia', () => this.atualizarTags());
  }

  _criar(c) {
    const g = criarCarro(c.carroceria, new THREE.Color(c.corHex).getHex());
    g.userData.carroId = c.id; g.userData.tipo = 'carro';
    g.traverse((o) => { o.userData.carroId = c.id; });
    this.raiz.add(g);
    const canvas = document.createElement('canvas'); canvas.width = 420; canvas.height = 120;
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: true }));
    tag.scale.set(4.2, 1.2, 1); tag.renderOrder = 10; tag.visible = false;
    tag.userData.carroId = c.id; tag.userData.canvas = canvas; tag.userData.tex = tex;
    this.raiz.add(tag);
    this.objetos.set(c.id, { grupo: g, tag, anim: null });
    this._desenharTag(c.id);
  }

  _desenharTag(id) {
    const o = this.objetos.get(id); const c = this.loja.carro(id);
    desenharEtiqueta(o.tag.userData.canvas, c, this.loja.diasEstoque(c), id === this.selecionadoId);
    o.tag.userData.tex.needsUpdate = true;
  }
  atualizarTags() { for (const id of this.objetos.keys()) this._desenharTag(id); }

  // ----- vagas -----
  _slotsDaZona(zona) {
    if (!this.slots[zona]) {
      const qtd = this.loja.carrosDaZona(zona).length;
      this.slots[zona] = new Array(Math.max(vagasDaZona(zona, qtd).length, qtd)).fill(null);
      this.vagas = this.vagas || {};
      this.vagas[zona] = vagasDaZona(zona, this.slots[zona].length);
    }
    return this.slots[zona];
  }
  _vaga(zona, i) { return this.vagas[zona][i]; }

  /** Atribui vagas respeitando posições já ocupadas; anima quem mudou de zona. */
  reorganizar(animar, idMovido = null) {
    const zonasNovas = new Map(); // id -> zona
    for (const c of this.loja.carros) zonasNovas.set(c.id, this.loja.zonaDoCarro(c.id));
    // 1) libera vagas de quem saiu da zona
    for (const [zona, arr] of Object.entries(this.slots)) {
      arr.forEach((id, i) => { if (id && zonasNovas.get(id) !== zona) arr[i] = null; });
    }
    // 2) ordem de ocupação: preço desc (showroom/pátio) ou id
    const lista = this.loja.carros.slice().sort((a, b) => b.precoVenda - a.precoVenda);
    for (const c of lista) {
      const zona = zonasNovas.get(c.id);
      const o = this.objetos.get(c.id);
      if (zona === 'vendido') { this._removerVendido(c.id, animar && c.id === idMovido); continue; }
      const arr = this._slotsDaZona(zona);
      let idx = arr.indexOf(c.id);
      if (idx < 0) {
        idx = arr.indexOf(null);
        if (idx < 0) { arr.push(null); this.vagas[zona] = vagasDaZona(zona, arr.length); idx = arr.length - 1; }
        arr[idx] = c.id;
      }
      const v = this._vaga(zona, idx);
      const alvo = new THREE.Vector3(v.x, 0.2, v.z);
      const mudou = this.zonaAtual.get(c.id) !== zona;
      this.zonaAtual.set(c.id, zona);
      o.grupo.visible = !o.emTestDrive;
      if (!animar || !mudou || o.grupo.userData.posIni == null) {
        o.grupo.position.copy(alvo); o.grupo.rotation.y = v.rot; o.grupo.userData.posIni = true; o.anim = null;
      } else {
        o.anim = { de: o.grupo.position.clone(), para: alvo, rotDe: o.grupo.rotation.y, rotPara: v.rot, t: 0, dur: 1.6 };
        this.animando.add(c.id);
      }
      o.zona = zona;
      this._desenharTag(c.id);
    }
    this.atualizarVisibilidadeTags();
    this.aplicarDestaque();
  }

  _removerVendido(id, animar) {
    const o = this.objetos.get(id);
    this.zonaAtual.set(id, 'vendido');
    if (animar && o.grupo.visible) {
      const p = o.grupo.position;
      o.anim = { de: p.clone(), para: new THREE.Vector3(6, 0.2, RUA.faixaB), rotDe: o.grupo.rotation.y, rotPara: 0, t: 0, dur: 3.2, sair: true };
      this.animando.add(id);
    } else { o.grupo.visible = false; o.tag.visible = false; }
  }

  /** Atualiza animações; chame a cada frame. */
  atualizar(dt, camera) {
    for (const id of [...this.animando]) {
      const o = this.objetos.get(id); const a = o.anim;
      if (!a) { this.animando.delete(id); continue; }
      a.t += dt; const k = clamp(a.t / a.dur, 0, 1);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      o.grupo.position.lerpVectors(a.de, a.para, e);
      o.grupo.position.y = 0.2 + Math.sin(k * Math.PI) * 0.8; // "levanta" para mostrar o movimento
      let dr = a.rotPara - a.rotDe; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
      o.grupo.rotation.y = a.rotDe + dr * e;
      o.tag.visible = false;
      if (k >= 1) {
        o.grupo.position.y = 0.2; o.anim = null; this.animando.delete(id);
        if (a.sair) { o.grupo.visible = false; } else this.atualizarVisibilidadeTags();
      }
    }
    // etiquetas seguem o carro
    for (const [id, o] of this.objetos) {
      if ((!o.tag.visible && !o.anim) || o.arrastando) continue;
      const h = o.grupo.userData.dim.h;
      o.tag.position.set(o.grupo.position.x, h + 1.5, o.grupo.position.z);
    }
    // anéis de seleção
    this._posAnel(this.anel, this.selecionadoId);
    this._posAnel(this.anelHover, this.hoverId && this.hoverId !== this.selecionadoId ? this.hoverId : null);
    if (this.anel.visible) this.anel.material.opacity = 0.65 + Math.sin(performance.now() / 260) * 0.3;
  }
  _posAnel(anel, id) {
    if (!id) { anel.visible = false; return; }
    const o = this.objetos.get(id);
    if (!o || !o.grupo.visible) { anel.visible = false; return; }
    const d = o.grupo.userData.dim;
    anel.visible = true; anel.position.set(o.grupo.position.x, 0.25, o.grupo.position.z);
    anel.scale.setScalar(Math.max(d.c, d.l) * 0.62); anel.rotation.z = -o.grupo.rotation.y;
  }

  // ----- visibilidade / seleção / filtro -----
  atualizarVisibilidadeTags() {
    for (const [id, o] of this.objetos) {
      const zona = this.zonaAtual.get(id);
      const ehFiltro = this.destaqueIds && this.destaqueIds.has(id);
      o.tag.visible = !o.anim && o.grupo.visible && !o.emTestDrive && this.mostrarTags && (zona === 'showroom' || id === this.selecionadoId || ehFiltro || id === this.hoverId);
    }
  }
  selecionar(id) { this.selecionadoId = id; this.atualizarTags(); this.atualizarVisibilidadeTags(); }
  hover(id) { if (this.hoverId === id) return; this.hoverId = id; this.atualizarVisibilidadeTags(); }
  setMostrarTags(v) { this.mostrarTags = v; this.atualizarVisibilidadeTags(); }

  /** ids = Set de carros que combinam com o filtro; null = sem filtro. */
  setDestaque(ids) { this.destaqueIds = ids; this.aplicarDestaque(); this.atualizarVisibilidadeTags(); }
  aplicarDestaque() {
    for (const [id, o] of this.objetos) {
      const tinta = o.grupo.userData.tinta;
      const apagar = this.destaqueIds && !this.destaqueIds.has(id);
      tinta.material = apagar ? matDim : matTinta(o.grupo.userData.corHex);
      tinta.castShadow = !apagar;
    }
  }

  // ----- arrastar (D20) -----
  iniciarArraste(id) {
    const o = this.objetos.get(id); if (!o) return;
    o.anim = null; this.animando.delete(id); o.arrastando = true; o.tag.visible = false;
  }
  arrastar(id, x, z) { const o = this.objetos.get(id); if (o) o.grupo.position.set(x, 1.5, z); }
  /** Termina o arraste; se não mudou de zona, devolve o carro à vaga com animação. */
  finalizarArraste(id, mudou) {
    const o = this.objetos.get(id); if (!o) return; o.arrastando = false;
    if (mudou) return; // a loja emite 'carros' e reorganizar() anima
    const zona = this.zonaAtual.get(id); const idx = this.slots[zona]?.indexOf(id);
    if (idx == null || idx < 0) return;
    const v = this._vaga(zona, idx);
    o.anim = { de: o.grupo.position.clone(), para: new THREE.Vector3(v.x, 0.2, v.z), rotDe: o.grupo.rotation.y, rotPara: v.rot, t: 0, dur: 0.7 };
    this.animando.add(id);
  }

  /** Esconde o carro de estoque enquanto ele está em test-drive. */
  setEmTestDrive(id, v) {
    const o = this.objetos.get(id); if (!o) return;
    o.emTestDrive = v; o.grupo.visible = !v && this.zonaAtual.get(id) !== 'vendido';
    this.atualizarVisibilidadeTags();
  }

  carrosPicaveis() { return [...this.objetos.values()].filter((o) => o.grupo.visible && !o.anim).map((o) => o.grupo); }
  posicaoDoCarro(id) { return this.objetos.get(id)?.grupo.position; }
  grupoDoCarro(id) { return this.objetos.get(id)?.grupo; }

  /** Carro temporário (test-drive, entrega, tráfego) que compartilha geometria/material. */
  criarTemporario(carroId) {
    const c = this.loja.carro(carroId);
    return criarCarro(c.carroceria, new THREE.Color(c.corHex).getHex());
  }
}

export const LIMITES_MUNDO = MUNDO; export const ZONAS_REF = ZONAS;
