// 6 carrocerias low-poly (hatch, sedan, suv, picape, esportivo, van). Frente = +x.
// Cada tipo vira 3 geometrias mescladas: tinta (pintada pela cor do carro), escura (vidros/rodas) e luzes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const poli = (pts, largura) => {
  const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: largura, bevelEnabled: false });
  g.translate(0, 0, -largura / 2);
  return g;
};
const caixa = (x0, x1, y0, y1, z0, z1) => {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
};
const roda = (x, z, r = 0.36, larg = 0.24) => {
  const g = new THREE.CylinderGeometry(r, r, larg, 10);
  g.rotateX(Math.PI / 2);
  g.translate(x, r, z);
  return g;
};
const limpa = (g) => {
  const n = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'color'].includes(k)) n.deleteAttribute(k);
  return n;
};
const colorir = (g, hex) => {
  const n = g.index ? g.toNonIndexed() : g; const c = new THREE.Color(hex); const cnt = n.attributes.position.count; const arr = new Float32Array(cnt * 3);
  for (let i = 0; i < cnt; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  n.setAttribute('color', new THREE.BufferAttribute(arr, 3)); return n;
};
const juntar = (lista) => {
  const m = mergeGeometries(lista.map(limpa), false);
  m.computeBoundingSphere();
  return m;
};

// Dimensões {c: comprimento, l: largura, h: altura} servem para sombra, etiqueta e seleção.
const TIPOS = {
  hatch: { c: 3.9, l: 1.7, h: 1.45, rodas: [1.15, 0.84] },
  sedan: { c: 4.6, l: 1.8, h: 1.4, rodas: [1.45, 0.88] },
  suv: { c: 4.5, l: 1.85, h: 1.7, rodas: [1.4, 0.92], r: 0.42 },
  picape: { c: 5.2, l: 1.9, h: 1.75, rodas: [1.7, 0.94], r: 0.44 },
  esportivo: { c: 4.4, l: 1.9, h: 1.2, rodas: [1.35, 0.94], r: 0.34 },
  van: { c: 5.4, l: 2.0, h: 2.3, rodas: [1.7, 0.98], r: 0.4 },
};

function montar(tipo) {
  const t = TIPOS[tipo];
  const w = t.l;
  const tinta = []; const escura = []; const luz = []; const luzTras = [];
  const meia = t.c / 2;
  const R = t.r ?? 0.36;
  const wi = w * 0.92; // largura da cabine

  switch (tipo) {
    case 'hatch':
      tinta.push(caixa(-meia, meia, 0.3, 0.95, -w / 2, w / 2));
      tinta.push(poli([[-1.5, 0.95], [-1.4, 1.45], [0.75, 1.45], [1.2, 0.95]], wi));
      escura.push(poli([[-1.38, 0.98], [-1.3, 1.38], [0.7, 1.38], [1.08, 0.98]], wi + 0.04));
      break;
    case 'sedan':
      tinta.push(caixa(-meia, meia, 0.3, 0.9, -w / 2, w / 2));
      tinta.push(poli([[-1.2, 0.9], [-0.8, 1.4], [0.65, 1.4], [1.25, 0.9]], wi));
      escura.push(poli([[-1.1, 0.93], [-0.75, 1.33], [0.6, 1.33], [1.12, 0.93]], wi + 0.04));
      break;
    case 'suv':
      tinta.push(caixa(-meia, meia, 0.4, 1.05, -w / 2, w / 2));
      tinta.push(poli([[-2.0, 1.05], [-1.92, 1.7], [0.95, 1.7], [1.45, 1.05]], wi));
      escura.push(poli([[-1.85, 1.08], [-1.8, 1.6], [0.9, 1.6], [1.3, 1.08]], wi + 0.04));
      tinta.push(caixa(-1.9, 0.8, 1.7, 1.78, -0.7, 0.7)); // rack
      break;
    case 'picape':
      tinta.push(caixa(-meia, meia, 0.4, 1.0, -w / 2, w / 2));
      tinta.push(poli([[0.0, 1.0], [0.1, 1.75], [1.3, 1.75], [1.75, 1.0]], wi));
      escura.push(poli([[0.12, 1.03], [0.2, 1.65], [1.25, 1.65], [1.62, 1.03]], wi + 0.04));
      tinta.push(caixa(-meia, -0.1, 1.0, 1.35, -w / 2, -w / 2 + 0.1), caixa(-meia, -0.1, 1.0, 1.35, w / 2 - 0.1, w / 2), caixa(-meia, -meia + 0.1, 1.0, 1.35, -w / 2, w / 2));
      escura.push(caixa(-meia + 0.1, -0.1, 1.0, 1.04, -w / 2 + 0.1, w / 2 - 0.1)); // fundo da caçamba
      break;
    case 'esportivo':
      tinta.push(caixa(-meia, meia, 0.25, 0.7, -w / 2, w / 2));
      tinta.push(poli([[-0.9, 0.7], [-0.35, 1.18], [0.55, 1.18], [1.25, 0.7]], wi * 0.95));
      escura.push(poli([[-0.78, 0.73], [-0.32, 1.1], [0.5, 1.1], [1.1, 0.73]], wi * 0.95 + 0.04));
      tinta.push(caixa(-meia, -meia + 0.5, 0.95, 1.02, -w / 2 + 0.1, w / 2 - 0.1)); // aerofólio
      escura.push(caixa(-meia + 0.15, -meia + 0.25, 0.7, 0.95, -0.6, -0.5), caixa(-meia + 0.15, -meia + 0.25, 0.7, 0.95, 0.5, 0.6));
      break;
    case 'van':
      tinta.push(poli([[-meia, 0.35], [-meia, 2.3], [1.7, 2.3], [meia, 1.35], [meia, 0.35]], w));
      escura.push(poli([[1.75, 1.45], [1.75, 2.1], [2.2, 1.45]], w + 0.04));
      escura.push(caixa(1.0, 1.72, 1.45, 2.1, -w / 2 - 0.02, w / 2 + 0.02));
      escura.push(caixa(-1.2, 0.6, 1.45, 2.05, -w / 2 - 0.02, w / 2 + 0.02));
      break;
    default: break;
  }
  // rodas e para-choques (escuro) + faróis
  const [rx, rz] = t.rodas;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) escura.push(roda(sx * rx, sz * rz, R));
  const yFar = tipo === 'van' ? 0.75 : tipo === 'esportivo' ? 0.5 : 0.75;
  luz.push(caixa(meia - 0.05, meia + 0.04, yFar, yFar + 0.15, -w / 2 + 0.15, -w / 2 + 0.5), caixa(meia - 0.05, meia + 0.04, yFar, yFar + 0.15, w / 2 - 0.5, w / 2 - 0.15));
  luzTras.push(caixa(-meia - 0.04, -meia + 0.05, yFar, yFar + 0.14, -w / 2 + 0.12, -w / 2 + 0.45), caixa(-meia - 0.04, -meia + 0.05, yFar, yFar + 0.14, w / 2 - 0.45, w / 2 - 0.12));
  escura.push(caixa(meia - 0.1, meia + 0.06, 0.28, 0.45, -w / 2 + 0.1, w / 2 - 0.1), caixa(-meia - 0.06, -meia + 0.1, 0.28, 0.45, -w / 2 + 0.1, w / 2 - 0.1));

  const detalhe = juntar([...escura.map((g) => colorir(limpa(g), 0x1a1e26)), ...luz.map((g) => colorir(limpa(g), 0xfff2c4)), ...luzTras.map((g) => colorir(limpa(g), 0xd62828))]);
  // a tinta também precisa do atributo "color"? não: usa material próprio sem vertexColors
  return {
    tinta: juntar(tinta.map((g) => limpa(g))), detalhe,
    dim: { c: t.c, l: t.l, h: t.h },
  };
}

const cache = new Map();
export function modeloDoTipo(tipo) {
  const t = TIPOS[tipo] ? tipo : 'sedan';
  if (!cache.has(t)) cache.set(t, montar(t));
  return cache.get(t);
}
export const TIPOS_CARRO = Object.keys(TIPOS);
