// Personagem low-poly articulado (pernas com joelho, braços, cabeça) + movimento por caminho + poses.
// Frente do personagem = +z local. rotation.y = atan2(dx, dz) aponta para a direção do movimento.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { pisoExtra } from './layout.js';

const matPessoa = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true });

function caixaCor(x0, x1, y0, y1, z0, z1, cor) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).toNonIndexed();
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  g.deleteAttribute('uv');
  const c = new THREE.Color(cor); const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}
const juntar = (l) => mergeGeometries(l, false);
const malha = (g, sombra = true) => { const m = new THREE.Mesh(g, matPessoa); m.castShadow = sombra; m.receiveShadow = true; return m; };

const H_QUADRIL = 0.85;
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const lerp = (a, b, k) => a + (b - a) * k;

export const POSES = ['parado', 'andar', 'sentado', 'conversar', 'assinar', 'martelar', 'lavar', 'digitar', 'comemorar', 'esperar'];

export class Pessoa {
  /** estilo: { camisa, calca, pele, cabelo, cabeloTipo: 'curto'|'longo'|'bone'|'careca', colete?, escala } */
  constructor(estilo) {
    const e = { calca: 0x2b3340, pele: 0xe0ac86, cabelo: 0x2a1d14, cabeloTipo: 'curto', escala: 1, ...estilo };
    this.estilo = e;
    this.grupo = new THREE.Group();
    this.grupo.scale.setScalar(e.escala);
    this.corpo = new THREE.Group(); this.grupo.add(this.corpo);       // sobe/desce (sentar/agachar)
    this.tronco = new THREE.Group(); this.tronco.position.y = H_QUADRIL; this.corpo.add(this.tronco); // inclina

    // tronco + cabeça + cabelo (uma malha só)
    const partes = [caixaCor(-0.23, 0.23, 0, 0.6, -0.13, 0.13, e.camisa)];
    if (e.colete) partes.push(caixaCor(-0.235, 0.235, 0.05, 0.55, -0.135, 0.135, e.colete));
    partes.push(caixaCor(-0.06, 0.06, 0.6, 0.68, -0.06, 0.06, e.pele)); // pescoço
    partes.push(caixaCor(-0.15, 0.15, 0.68, 0.98, -0.14, 0.14, e.pele)); // cabeça
    partes.push(caixaCor(-0.03, 0.03, 0.79, 0.85, 0.14, 0.17, e.pele)); // nariz
    if (e.cabeloTipo === 'curto') partes.push(caixaCor(-0.16, 0.16, 0.92, 1.03, -0.15, 0.15, e.cabelo), caixaCor(-0.16, 0.16, 0.8, 1.0, -0.15, -0.1, e.cabelo));
    if (e.cabeloTipo === 'longo') partes.push(caixaCor(-0.16, 0.16, 0.92, 1.03, -0.15, 0.15, e.cabelo), caixaCor(-0.16, 0.16, 0.5, 1.0, -0.17, -0.09, e.cabelo));
    if (e.cabeloTipo === 'bone') partes.push(caixaCor(-0.16, 0.16, 0.92, 1.0, -0.15, 0.15, e.bone || 0xc9462c), caixaCor(-0.14, 0.14, 0.9, 0.95, 0.14, 0.3, e.bone || 0xc9462c));
    this.cabeca = new THREE.Group(); // o pescoço gira junto? mantemos tronco+cabeça fixos e giramos a cabeça pelo tronco
    const mTronco = malha(juntar(partes)); this.tronco.add(mTronco);

    // braços (pivô no ombro)
    const braco = (lado) => {
      const g = new THREE.Group(); g.position.set(lado * 0.3, 0.55, 0);
      g.add(malha(juntar([caixaCor(-0.065, 0.065, -0.3, 0, -0.065, 0.065, e.manga ?? e.camisa), caixaCor(-0.06, 0.06, -0.55, -0.3, -0.06, 0.06, e.pele)]), false));
      this.tronco.add(g); return g;
    };
    this.bracoE = braco(-1); this.bracoD = braco(1);

    // pernas: coxa (pivô no quadril) + canela (pivô no joelho)
    const perna = (lado) => {
      const coxa = new THREE.Group(); coxa.position.set(lado * 0.11, H_QUADRIL, 0);
      coxa.add(malha(juntar([caixaCor(-0.09, 0.09, -0.43, 0, -0.1, 0.1, e.calca)]), false));
      const canela = new THREE.Group(); canela.position.y = -0.43;
      canela.add(malha(juntar([caixaCor(-0.08, 0.08, -0.36, 0, -0.085, 0.085, e.calca), caixaCor(-0.09, 0.09, -0.42, -0.34, -0.09, 0.17, 0x1d1f23)]), false));
      coxa.add(canela); this.corpo.add(coxa);
      return { coxa, canela };
    };
    this.pernaE = perna(-1); this.pernaD = perna(1);

    // estado
    this.pos = new THREE.Vector3();
    this.rot = 0; this.rotAlvo = 0;
    this.caminho = []; this.vel = 1.5; this.seg = null;
    this.pose = 'parado'; this.poseFinal = 'parado'; this.fase = Math.random() * 10;
    this.chegou = true; this.aoChegar = null;
    this.yPiso = 0; this.ajusteSentarY = 0;
    this.j = { tE: 0, tD: 0, cE: 0, cD: 0, bE: 0, bD: 0, bEz: 0, bDz: 0, lean: 0, corpoY: 0, giro: 0, nod: 0 };
    this.grupo.userData.pessoa = this;
  }

  colocar(x, z, y = 0, rot = 0) {
    this.pos.set(x, y, z); this.rot = this.rotAlvo = rot; this.grupo.position.set(x, y + pisoExtra(x, z, y), z); this.grupo.rotation.y = rot;
    this.caminho = []; this.seg = null; this.chegou = true;
  }

  /** Anda por uma lista de pontos {x,z,y}. poseFinal/rotFinal definem como termina. */
  irPara(pontos, { vel = 1.5, poseFinal = 'parado', rotFinal = null, aoChegar = null } = {}) {
    this.caminho = pontos.map((p) => ({ x: p.x, z: p.z, y: p.y ?? 0 }));
    this.vel = vel; this.poseFinal = poseFinal; this.rotFinal = rotFinal; this.aoChegar = aoChegar;
    this.chegou = this.caminho.length === 0; this.seg = null;
    if (this.chegou) this._terminou();
  }
  parar(poseFinal = 'parado') { this.caminho = []; this.seg = null; this.chegou = true; this.poseFinal = poseFinal; this.pose = poseFinal; }
  olharPara(x, z) { this.rotAlvo = Math.atan2(x - this.pos.x, z - this.pos.z); }
  definirPose(p) { this.poseFinal = p; if (this.chegou) this.pose = p; }
  get movendo() { return !this.chegou; }

  _terminou() {
    this.chegou = true; this.pose = this.poseFinal;
    if (this.rotFinal != null) this.rotAlvo = this.rotFinal;
    const f = this.aoChegar; this.aoChegar = null; if (f) f(this);
  }

  atualizar(dt) {
    // --- movimento ---
    if (!this.chegou) {
      if (!this.seg) {
        const alvo = this.caminho[0];
        if (!alvo) { this._terminou(); }
        else {
          this.seg = { x0: this.pos.x, z0: this.pos.z, y0: this.pos.y, alvo, len: Math.hypot(alvo.x - this.pos.x, alvo.z - this.pos.z), prog: 0 };
          if (this.seg.len < 0.02) { this.pos.set(alvo.x, alvo.y, alvo.z); this.caminho.shift(); this.seg = null; }
          else this.rotAlvo = Math.atan2(alvo.x - this.pos.x, alvo.z - this.pos.z);
        }
      }
      if (this.seg) {
        const s = this.seg; s.prog = Math.min(s.len, s.prog + this.vel * dt);
        const k = s.prog / s.len;
        this.pos.x = lerp(s.x0, s.alvo.x, k); this.pos.z = lerp(s.z0, s.alvo.z, k); this.pos.y = lerp(s.y0, s.alvo.y, k);
        this.pose = 'andar';
        if (s.prog >= s.len) { this.caminho.shift(); this.seg = null; if (!this.caminho.length) this._terminou(); }
      }
    }
    // --- orientação suave ---
    this.rot += angDiff(this.rot, this.rotAlvo) * Math.min(1, dt * 9);
    this.grupo.position.set(this.pos.x, this.pos.y + pisoExtra(this.pos.x, this.pos.z, this.pos.y), this.pos.z); this.grupo.rotation.y = this.rot;

    // --- pose → ângulos alvo ---
    this.fase += dt * (this.pose === 'andar' ? this.vel * 3.4 : 1);
    const t = performance.now() / 1000 + this.fase;
    const a = { tE: 0, tD: 0, cE: 0, cD: 0, bE: 0, bD: 0, bEz: 0, bDz: 0, lean: 0, corpoY: 0, giro: 0, nod: 0 };
    switch (this.pose) {
      case 'andar': {
        const s = Math.sin(this.fase), c = Math.cos(this.fase);
        a.tE = s * 0.75; a.tD = -s * 0.75; a.cE = Math.max(0, -c) * 0.9 * (s < 0 ? 1 : 0.3); a.cD = Math.max(0, c) * 0.9 * (s > 0 ? 1 : 0.3);
        a.bE = -s * 0.65; a.bD = s * 0.65; a.corpoY = Math.abs(Math.cos(this.fase)) * 0.04; a.lean = 0.05; break;
      }
      case 'sentado':
      case 'digitar':
      case 'assinar':
        a.tE = a.tD = -1.5; a.cE = a.cD = 1.5; a.corpoY = -0.33 + this.ajusteSentarY; a.lean = 0.05;
        a.bE = a.bD = -0.25;
        if (this.pose === 'digitar') { a.bE = -1.0 + Math.sin(t * 9) * 0.06; a.bD = -1.0 + Math.cos(t * 11) * 0.06; a.lean = 0.12; a.nod = Math.sin(t * 0.7) * 0.15; }
        if (this.pose === 'assinar') { a.bE = -0.9; a.bD = -1.15 + Math.sin(t * 7) * 0.08; a.bDz = Math.sin(t * 5) * 0.12; a.lean = 0.3; }
        break;
      case 'conversar':
        a.bD = -0.5 + Math.sin(t * 2.6) * 0.45; a.bDz = -0.15; a.bE = -0.25 + Math.sin(t * 2.1 + 1) * 0.25; a.nod = Math.sin(t * 1.4) * 0.25; a.giro = Math.sin(t * 0.6) * 0.2; break;
      case 'martelar':
        a.corpoY = -0.3; a.tE = a.tD = -1.0; a.cE = a.cD = 1.35; a.lean = 0.35;
        a.bD = -1.5 + Math.sin(t * 6) * 0.8; a.bE = -0.5; break;
      case 'lavar':
        a.lean = 0.28; a.bD = -1.0 + Math.sin(t * 4.2) * 0.35; a.bDz = Math.sin(t * 4.2) * 0.35; a.bE = -0.4; a.tE = 0.15; a.tD = -0.15; break;
      case 'comemorar':
        a.bE = a.bD = -2.9 + Math.sin(t * 9) * 0.25; a.bEz = 0.2; a.bDz = -0.2; a.corpoY = Math.abs(Math.sin(t * 6)) * 0.18; a.nod = -0.1; break;
      case 'esperar':
        a.nod = Math.sin(t * 0.8) * 0.25; a.giro = Math.sin(t * 0.5) * 0.35; a.bE = -0.05; a.bD = -0.05; a.corpoY = Math.sin(t * 1.6) * 0.008; break;
      default: // parado
        a.corpoY = Math.sin(t * 1.6) * 0.01; a.bE = Math.sin(t * 1.6) * 0.04; a.bD = -Math.sin(t * 1.6) * 0.04; break;
    }
    const k = Math.min(1, dt * 12); const j = this.j;
    for (const key of Object.keys(a)) j[key] = lerp(j[key], a[key], k);
    this.pernaE.coxa.rotation.x = j.tE; this.pernaD.coxa.rotation.x = j.tD;
    this.pernaE.canela.rotation.x = j.cE; this.pernaD.canela.rotation.x = j.cD;
    this.bracoE.rotation.x = j.bE; this.bracoD.rotation.x = j.bD;
    this.bracoE.rotation.z = j.bEz - 0.05; this.bracoD.rotation.z = j.bDz + 0.05;
    this.corpo.position.y = j.corpoY; this.tronco.rotation.x = j.lean; this.tronco.rotation.y = j.giro;
  }

  dispose() { this.grupo.removeFromParent(); }
}

// ---- estilos prontos ----
const PELES = [0xf1c9a5, 0xe0ac86, 0xc68642, 0x8d5a3a, 0x6b4129, 0xffdbb4];
const CABELOS = [0x1a1410, 0x2a1d14, 0x4a2f1b, 0x7a5230, 0xb88a4e, 0x9a9a9a, 0xc9462c];
const CAMISAS = [0xe76f51, 0x2a9d8f, 0xe9c46a, 0x6d6875, 0x4361ee, 0xf72585, 0x90be6d, 0xf4a261, 0x577590, 0xb5838d, 0x43aa8b, 0xff9f1c];
const CALCAS = [0x2b3340, 0x3d405b, 0x1d3557, 0x5c5470, 0x6b705c, 0x264653];

export function estiloCliente(seed) {
  const r = (n) => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed % n; };
  return {
    camisa: CAMISAS[r(CAMISAS.length)], calca: CALCAS[r(CALCAS.length)], pele: PELES[r(PELES.length)], cabelo: CABELOS[r(CABELOS.length)],
    cabeloTipo: ['curto', 'longo', 'curto', 'bone', 'longo', 'careca'][r(6)], escala: 0.94 + r(12) / 100, bone: CAMISAS[r(CAMISAS.length)],
  };
}
export function estiloFuncionario(f, seed) {
  const base = estiloCliente(seed);
  const hex = parseInt(f.cor.slice(1), 16);
  const colete = ['mecanico', 'lavador'].includes(f.cargo) ? hex : null;
  return { ...base, camisa: f.cargo === 'mecanico' || f.cargo === 'lavador' ? 0xf4efe6 : hex, colete, escala: 1, bone: hex, cabeloTipo: f.cargo === 'lavador' ? 'bone' : base.cabeloTipo === 'bone' ? 'curto' : base.cabeloTipo };
}
