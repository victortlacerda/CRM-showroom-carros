// Layout do cenário: medidas, zonas, vagas de carros e grafo de caminhos das pessoas.
// Módulo puro (sem Three.js) → testável em Node.
// Eixos: x = direita, z = em direção à rua (frente da loja), y = altura. Unidades ≈ metros.

export const PREDIO = { x0: -36, x1: 60, z0: -16, z1: 4, h1: 5.0, h2: 9.6 };
export const ESCRITORIO = { x0: -36, x1: -14, z0: -16, z1: 4, y: 5.2 };
export const CALCADA = { z0: 7, z1: 12.5, zCentro: 10 };
export const RUA = { z0: 12.5, z1: 25, faixaA: 16, faixaB: 21.5 }; // A: sentido -x, B: sentido +x
export const MUNDO = { x0: -100, x1: 90, z0: -64, z1: 34 };

// Retângulos das zonas (chão). 'y' = nível do piso.
export const ZONAS = {
  recepcao: { x0: -36, x1: -14, z0: -16, z1: 4, y: 0, nome: 'Recepção' },
  showroom: { x0: -14, x1: 26, z0: -16, z1: 4, y: 0, nome: 'Showroom' },
  oficina: { x0: 26, x1: 46, z0: -16, z1: 4, y: 0, nome: 'Oficina' },
  lavajato: { x0: 46, x1: 60, z0: -16, z1: 4, y: 0, nome: 'Lava-jato' },
  patio: { x0: -72, x1: -40, z0: -44, z1: 6.2, y: 0, nome: 'Pátio externo' },
  avaliacao: { x0: 63, x1: 77, z0: -8, z1: 8, y: 0, nome: 'Avaliação (trocas)' },
  escritorio: { x0: -36, x1: -14, z0: -16, z1: 4, y: 5.2, nome: 'Escritório' },
};

// Zonas que aceitam carros (alvo de arrastar) e sua ordem de prioridade na detecção
export const ZONAS_DE_CARRO = ['showroom', 'oficina', 'lavajato', 'avaliacao', 'patio'];

export function zonaNoPonto(x, z) {
  for (const nome of ZONAS_DE_CARRO) {
    const r = ZONAS[nome];
    if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return nome;
  }
  return null;
}

// ---------- Vagas de carros ----------
// Cada vaga: { x, z, rot } (rot = rotação em Y; o carro "olha" para +x quando rot = 0).
function grade({ xs, zs, rot = 0 }) {
  const out = [];
  for (const z of zs) for (const x of xs) out.push({ x, z, rot });
  return out;
}
const seq = (ini, passo, n) => Array.from({ length: n }, (_, i) => +(ini + i * passo).toFixed(2));

export function vagasDaZona(zona, minimo = 0) {
  let vagas;
  switch (zona) {
    case 'showroom': // 3 fileiras x 8 = 24
      vagas = grade({ xs: seq(-11.5, 5, 8), zs: [-12.5, -8, -3.5] });
      break;
    case 'oficina': // 4 colunas x 4 fileiras = 16 (+ transborda para a frente)
      vagas = grade({ xs: seq(28.5, 5, 4), zs: [-12.5, -8.5, -4.5, -0.5] });
      for (let k = 0; k < 8; k++) vagas.push({ x: 28.5 + (k % 4) * 5, z: 6 + Math.floor(k / 4) * 4 - 0, rot: 0 });
      break;
    case 'lavajato': // 2 colunas x 4 fileiras = 8 (+ fila na frente)
      vagas = grade({ xs: [49.5, 56], zs: [-12.5, -8.5, -4.5, -0.5] });
      for (let k = 0; k < 4; k++) vagas.push({ x: 49.5 + (k % 2) * 6.5, z: 6 + Math.floor(k / 2) * 4, rot: 0 });
      break;
    case 'avaliacao': // 2 x 4 = 8
      vagas = grade({ xs: [67, 73.5], zs: [-5.5, -1.5, 2.5, 6.5], rot: Math.PI / 2 });
      break;
    case 'patio': { // 6 colunas x 14 fileiras = 84; começa pela frente (mais visível)
      const zs = seq(4.5, -3.5, 14);
      vagas = grade({ xs: seq(-69.5, 5, 6), zs });
      break;
    }
    default:
      vagas = [];
  }
  // garante vagas suficientes: estende para trás (patio) ou para os lados (demais)
  let extra = 0;
  while (vagas.length < minimo) {
    if (zona === 'patio') vagas.push({ x: -69.5 + (extra % 6) * 5, z: -42.5 - Math.floor(extra / 6) * 3.5, rot: 0 });
    else vagas.push({ x: ZONAS[zona].x1 + 6 + (extra % 4) * 5, z: -12.5 + Math.floor(extra / 4) * 4, rot: 0 });
    extra++;
  }
  return vagas;
}

// ---------- Grafo de caminhos ----------
// Nós: id -> [x, z, y]. Arestas ligam ids. Pessoas andam entre nós; trechos finais são em linha reta.
const N = {};
const E = [];
const no = (id, x, z, y = 0) => { N[id] = [x, z, y]; };
const liga = (...ids) => { for (let i = 0; i < ids.length - 1; i++) E.push([ids[i], ids[i + 1]]); };

// calçada
const xsCalcada = [-100, -80, -60, -40, -20, 0, 20, 40, 60, 80];
xsCalcada.forEach((x) => no(`calc_${x}`, x, CALCADA.zCentro));
no('calc_porta', 6, CALCADA.zCentro);
const ordemCalcada = [...xsCalcada.slice(0, 6).map((x) => `calc_${x}`), 'calc_porta', ...xsCalcada.slice(6).map((x) => `calc_${x}`)];
liga(...ordemCalcada);

// acesso à loja
no('porta_fora', 6, 6);
no('porta', 6, 3.2);
liga('calc_porta', 'porta_fora', 'porta');

// corredor da frente do showroom (z = 0.6) e conexões
const xsA0 = [-12, -4, 6, 14, 22];
xsA0.forEach((x) => no(`a0_${x}`, x, 0.6));
liga('porta', 'a0_6');
liga('a0_-12', 'a0_-4', 'a0_6', 'a0_14', 'a0_22');
// corredores internos entre fileiras (z = -6 e z = -10.25) ligados pelas laterais
no('a1_-13', -13, -6); no('a1_25', 25, -6);
no('a2_-13', -13, -10.25); no('a2_25', 25, -10.25);
no('a3_-13', -13, -1.5); no('a3_25', 25, -1.5);
liga('a0_-12', 'a3_-13', 'a1_-13', 'a2_-13');
liga('a0_22', 'a3_25', 'a1_25', 'a2_25');
const xsMeio = [-8, 0, 8, 16];
xsMeio.forEach((x) => { no(`a1_${x}`, x, -6); no(`a2_${x}`, x, -10.25); });
liga('a1_-13', 'a1_-8', 'a1_0', 'a1_8', 'a1_16', 'a1_25');
liga('a2_-13', 'a2_-8', 'a2_0', 'a2_8', 'a2_16', 'a2_25');

// recepção e escada externa até a sacada do escritório
no('recep', -24, 1.6); no('recep_sofa', -31, 0);
no('esc_base', -14, 5.4, 0);
no('esc_meio', -21, 5.4, 2.6);
no('esc_topo', -28, 5.4, ESCRITORIO.y);
liga('esc_base', 'esc_meio', 'esc_topo');
liga('a0_-12', 'recep', 'recep_sofa');
liga('calc_-20', 'esc_base');

// escritório (2º andar)
no('of_porta', -28, 2.6, ESCRITORIO.y);
no('of_c1', -28, -1, ESCRITORIO.y);
no('of_c2', -28, -8, ESCRITORIO.y);
no('of_mesa', -22, -3.5, ESCRITORIO.y);
no('of_fin', -31.5, -6, ESCRITORIO.y);
no('of_ger', -19.5, -11, ESCRITORIO.y);
liga('esc_topo', 'of_porta', 'of_c1', 'of_c2');
liga('of_c1', 'of_mesa', 'of_ger');
liga('of_c2', 'of_fin');

// oficina e lava-jato
no('ofi_0', 28, 1); no('ofi_1', 36, 1); no('ofi_2', 44, 1);
liga('a0_22', 'ofi_0', 'ofi_1', 'ofi_2');
[-10.5, -6.5, -2.5].forEach((z, i) => {
  no(`ofi_g${i}a`, 26.2, z); no(`ofi_g${i}b`, 46.6, z);
});
liga('ofi_0', 'ofi_g2a', 'ofi_g1a', 'ofi_g0a');
liga('ofi_2', 'ofi_g2b', 'ofi_g1b', 'ofi_g0b');
const gapsLava = [1.5, -2.5, -6.5, -10.5];
gapsLava.forEach((z, i) => no(`lg_${i}`, 52.75, z));
no('lg_ent', 50, 1);
liga('ofi_2', 'lg_ent', 'lg_0', 'lg_1', 'lg_2', 'lg_3');

// saída/entrega e pátio
no('saida', 6, 8);
liga('porta_fora', 'saida');
no('pat_0', -56, 10); liga('calc_-60', 'pat_0');

export const GRAFO = { nos: N, arestas: E };

// ---------- Busca de caminho ----------
const dist3 = (a, b) => Math.hypot(a[0] - b[0], (a[1] - b[1]), (a[2] - b[2]) * 3);
const vizinhos = new Map();
for (const [a, b] of E) {
  if (!vizinhos.has(a)) vizinhos.set(a, []);
  if (!vizinhos.has(b)) vizinhos.set(b, []);
  vizinhos.get(a).push(b); vizinhos.get(b).push(a);
}

export function noMaisProximo(x, z, y = 0) {
  let melhor = null; let d = Infinity;
  for (const [id, p] of Object.entries(N)) {
    const dd = Math.hypot(p[0] - x, p[1] - z) + Math.abs(p[2] - y) * 40;
    if (dd < d) { d = dd; melhor = id; }
  }
  return melhor;
}

/** Menor caminho (Dijkstra) entre dois nós do grafo. Retorna lista de ids ou null. */
export function caminhoEntreNos(de, para) {
  if (de === para) return [de];
  const dist = new Map([[de, 0]]); const prev = new Map(); const aberto = new Set([de]);
  while (aberto.size) {
    let u = null; let best = Infinity;
    for (const id of aberto) if (dist.get(id) < best) { best = dist.get(id); u = id; }
    aberto.delete(u);
    if (u === para) break;
    for (const v of vizinhos.get(u) || []) {
      const nd = best + dist3(N[u], N[v]);
      if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); prev.set(v, u); aberto.add(v); }
    }
  }
  if (!prev.has(para)) return null;
  const rota = [para];
  while (rota[0] !== de) rota.unshift(prev.get(rota[0]));
  return rota;
}

/**
 * Rota livre entre dois pontos {x,z,y}: vai ao nó mais próximo, segue o grafo e termina em linha reta.
 * Retorna lista de pontos [{x,z,y}].
 */
export function rota(de, para) {
  const a = noMaisProximo(de.x, de.z, de.y ?? 0);
  const b = noMaisProximo(para.x, para.z, para.y ?? 0);
  const ids = caminhoEntreNos(a, b) || [a];
  const pts = [{ x: de.x, z: de.z, y: de.y ?? 0 }];
  for (const id of ids) pts.push({ x: N[id][0], z: N[id][1], y: N[id][2] });
  pts.push({ x: para.x, z: para.z, y: para.y ?? 0 });
  return suavizar(pts);
}

/** Remove "vai e volta" ao longo de uma mesma linha (ex.: nó mais próximo ficou para trás). */
function suavizar(pts) {
  const colinear = (a, b, c) => {
    const ux = b.x - a.x, uz = b.z - a.z, vx = c.x - b.x, vz = c.z - b.z;
    const nu = Math.hypot(ux, uz), nv = Math.hypot(vx, vz);
    if (nu < 1e-6 || nv < 1e-6) return true;
    const dot = ux * vx + uz * vz;
    const cruz = Math.abs(ux * vz - uz * vx);
    return dot < 0 && cruz < 0.2 * nu * nv && Math.abs(a.y - c.y) < 0.5;
  };
  let mudou = true;
  while (mudou && pts.length >= 3) {
    mudou = false;
    for (let i = 0; i + 2 < pts.length; i++) {
      if (colinear(pts[i], pts[i + 1], pts[i + 2])) { pts.splice(i + 1, 1); mudou = true; break; }
    }
  }
  return pts;
}

// ---------- Pontos de interesse (assentos, mesas, etc.) ----------
export const MESAS_NEGOCIACAO = [-12, -4, 4, 12, 20].map((x) => ({ x, z: -1.3 })); // mesa em (x,z); cliente em x-0.9, vendedor em x+0.9
export const ESCRITORIO_PONTOS = {
  financeiro: { x: -31.5, z: -9.2, y: ESCRITORIO.y },          // mesa do financeiro (funcionário senta aqui)
  financeiroVisitante: [{ x: -32.4, z: -7.4, y: ESCRITORIO.y }, { x: -30.2, z: -7.4, y: ESCRITORIO.y }], // cadeiras viradas para -z
  gerente: { x: -19.5, z: -13, y: ESCRITORIO.y },
  mesaReuniao: { x: -22, z: -3.5, y: ESCRITORIO.y },
  assentosReuniao: [
    { x: -23.2, z: -4.6, y: ESCRITORIO.y }, { x: -20.8, z: -4.6, y: ESCRITORIO.y },
    { x: -23.2, z: -2.4, y: ESCRITORIO.y }, { x: -20.8, z: -2.4, y: ESCRITORIO.y },
  ],
};
export const RECEPCAO_PONTOS = { balcao: { x: -24, z: -1.5 }, recepcionista: { x: -24, z: -3.1 }, sofa: { x: -32, z: 0 } };
export const MESAS_VENDEDOR = [-12, -4, 4, 12, 20].map((x) => ({ x, z: 3.4 })); // vendedor senta em (x, z-0.9) olhando +z
export const PORTA = { x: 6, z: 4 };

// Circuito do test-drive e do tráfego (polilinha fechada)
export const CIRCUITO_TESTDRIVE = [
  { x: 6, z: 3 }, { x: 6, z: 14 }, { x: 6, z: RUA.faixaA }, { x: -55, z: RUA.faixaA },
  { x: -62, z: 18.7 }, { x: -55, z: RUA.faixaB }, { x: 20, z: RUA.faixaB },
  { x: 24, z: 18.7 }, { x: 20, z: RUA.faixaA }, { x: 8, z: RUA.faixaA }, { x: 6, z: 12 }, { x: 6, z: 3 },
];

/** Altura do piso sob um ponto (para pés de pessoas): interior 0.2, calçada 0.12, escritório 0.04 acima da laje. */
export function pisoExtra(x, z, y = 0) {
  if (y > 3) return 0.04;
  if (x >= PREDIO.x0 && x <= PREDIO.x1 && z >= PREDIO.z0 && z <= PREDIO.z1 + 0.2) return 0.2;
  if (z >= CALCADA.z0 && z <= CALCADA.z1) return 0.12;
  if (z > CALCADA.z1) return 0.06;
  return 0.1;
}
