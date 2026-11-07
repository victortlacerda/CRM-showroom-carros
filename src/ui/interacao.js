// Interação com o 3D: hover, clique (carro/pessoa/zona) e arrastar carro entre zonas.
import * as THREE from 'three';
import { ZONAS, ZONAS_DE_CARRO, zonaNoPonto } from '../cena/layout.js';

const COR_ZONA = { showroom: 0x2f6fed, patio: 0x6b7280, oficina: 0xc9462c, lavajato: 0x1c7fb8, avaliacao: 0xb7791f };

export class Interacao {
  constructor({ canvas, camera, scene, carros, agentes, loja, camaras, aoSelecionar, aoHover, aoZona, aoMover }) {
    Object.assign(this, { canvas, camera, scene, carros, agentes, loja, camaras, aoSelecionar, aoHover, aoZona, aoMover });
    this.ray = new THREE.Raycaster();
    this.ponteiro = new THREE.Vector2();
    this.chao = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.2);
    this.estado = null; // { tipo:'carro'|..., id, x0, y0, arrastando }
    this.hover = null;
    this.ultimoHover = 0;
    this.desativado = false;

    // retângulo de destaque da zona (hover / alvo do arraste)
    this.zonaMalha = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 1), new THREE.MeshBasicMaterial({ color: 0x2f6fed, transparent: true, opacity: 0.22, depthWrite: false }));
    this.zonaMalha.visible = false; this.zonaMalha.renderOrder = 2; scene.add(this.zonaMalha);

    canvas.addEventListener('pointerdown', (e) => this._down(e), { capture: true });
    addEventListener('pointermove', (e) => this._move(e));
    addEventListener('pointerup', (e) => this._up(e));
    canvas.addEventListener('pointerleave', () => { if (!this.estado) this._setHover(null, 0, 0); });
    canvas.addEventListener('dblclick', (e) => this._dbl(e));
  }

  _ndc(e) {
    const r = this.canvas.getBoundingClientRect();
    this.ponteiro.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.camera.updateMatrixWorld();
    this.ray.setFromCamera(this.ponteiro, this.camera);
  }

  /** Objeto sob o ponteiro: { tipo:'carro'|'cliente'|'funcionario', id } ou null. */
  _alvo(e) {
    this._ndc(e);
    const lista = [...this.carros.carrosPicaveis(), ...this.agentes.picaveis()];
    const hits = this.ray.intersectObjects(lista, true);
    for (const h of hits) {
      let o = h.object;
      while (o) {
        if (o.userData.carroId) return { tipo: 'carro', id: o.userData.carroId };
        if (o.userData.agente) { const a = o.userData.agente; return { tipo: a.tipo, id: a.tipo === 'cliente' ? a.lead.id : a.f.id }; }
        o = o.parent;
      }
    }
    return null;
  }
  _pontoNoChao(e) { this._ndc(e); const p = new THREE.Vector3(); return this.ray.ray.intersectPlane(this.chao, p) ? p : null; }

  _setHover(alvo, x, y) {
    const chave = alvo ? alvo.tipo + alvo.id : null;
    const antes = this.hover ? this.hover.tipo + this.hover.id : null;
    this.hover = alvo;
    if (chave !== antes) this.carros.hover(alvo?.tipo === 'carro' ? alvo.id : null);
    this.canvas.style.cursor = alvo ? (alvo.tipo === 'carro' ? 'grab' : 'pointer') : '';
    this.aoHover?.(alvo, x, y);
  }

  _mostrarZona(nome, cor) {
    if (!nome) { this.zonaMalha.visible = false; return; }
    const z = ZONAS[nome];
    this.zonaMalha.visible = true;
    this.zonaMalha.scale.set(z.x1 - z.x0, 1, z.z1 - z.z0);
    this.zonaMalha.position.set((z.x0 + z.x1) / 2, 0.22, (z.z0 + z.z1) / 2);
    this.zonaMalha.material.color.setHex(cor ?? COR_ZONA[nome] ?? 0x2f6fed);
  }

  _down(e) {
    if (this.desativado || e.button !== 0) return;
    const alvo = this._alvo(e);
    this.estado = { alvo, x0: e.clientX, y0: e.clientY, arrastando: false, t0: e.timeStamp };
    if (alvo?.tipo === 'carro') { this.camaras.controls.enabled = false; } // não gira a câmera ao arrastar um carro
  }

  _move(e) {
    if (this.desativado) return;
    const s = this.estado;
    if (s && s.alvo?.tipo === 'carro') {
      const d = Math.hypot(e.clientX - s.x0, e.clientY - s.y0);
      if (!s.arrastando && d > 7) {
        s.arrastando = true; this.carros.iniciarArraste(s.alvo.id); this.canvas.style.cursor = 'grabbing'; this.camaras.interromper();
        this.aoMover?.('inicio', s.alvo.id);
      }
      if (s.arrastando) {
        const p = this._pontoNoChao(e);
        if (p) {
          this.carros.arrastar(s.alvo.id, p.x, p.z);
          const zona = zonaNoPonto(p.x, p.z);
          s.zonaAlvo = zona;
          this._mostrarZona(zona);
        }
        return;
      }
    }
    if (s) return; // ponteiro pressionado (orbitando): sem hover
    if (e.target !== this.canvas) { this._setHover(null, 0, 0); this._mostrarZona(null); return; }
    const agora = performance.now();
    if (agora - this.ultimoHover < 35) return;
    this.ultimoHover = agora;
    const alvo = this._alvo(e);
    this._setHover(alvo, e.clientX, e.clientY);
    if (!alvo) { const p = this._pontoNoChao(e); const z = p && zonaNoPonto(p.x, p.z); this._mostrarZona(z || null); this.zonaHover = z || null; this.canvas.style.cursor = z ? 'pointer' : ''; }
    else { this._mostrarZona(null); this.zonaHover = null; }
  }

  _up(e) {
    const s = this.estado; if (!s) return;
    this.estado = null; this.camaras.controls.enabled = true;
    if (s.arrastando) {
      const id = s.alvo.id; const atual = this.loja.zonaDoCarro(id);
      const pSolta = this._pontoNoChao(e); // zona definida pelo ponto exato em que o botão foi solto
      const zona = pSolta ? zonaNoPonto(pSolta.x, pSolta.z) : s.zonaAlvo;
      this._mostrarZona(null);
      let mudou = false;
      if (zona && zona !== atual) mudou = this.loja.moverCarroParaZona(id, zona);
      this.carros.finalizarArraste(id, mudou);
      this.aoMover?.('fim', id, { de: atual, para: mudou ? zona : atual, mudou });
      return;
    }
    // clique simples (pouco movimento e rápido)
    const d = Math.hypot(e.clientX - s.x0, e.clientY - s.y0);
    if (d > 6 || e.timeStamp - s.t0 > 600) return;
    if (e.target !== this.canvas) return;
    if (s.alvo) { this.aoSelecionar?.(s.alvo.tipo, s.alvo.id); return; }
    const p = this._pontoNoChao(e); const z = p && zonaNoPonto(p.x, p.z);
    if (z) this.aoZona?.(z); else this.aoSelecionar?.(null, null);
  }

  _dbl(e) { // duplo clique no chão: foca naquele ponto
    if (this._alvo(e)) return;
    const p = this._pontoNoChao(e); if (p) this.camaras.focarEm(p, null, null, null);
  }
}

export const ZONAS_ARRASTAVEIS = ZONAS_DE_CARRO;
