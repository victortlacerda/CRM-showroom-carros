import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const cacheMat = new Map();
/** Material padrão (low-poly, sombreamento chapado). Cacheado por cor/opções. */
export function mat(cor, opts = {}) {
  const chave = cor + JSON.stringify(opts);
  if (!cacheMat.has(chave)) {
    cacheMat.set(chave, new THREE.MeshStandardMaterial({
      color: cor, roughness: opts.rough ?? 0.85, metalness: opts.metal ?? 0.0,
      flatShading: opts.flat ?? true, transparent: opts.opacity != null && opts.opacity < 1,
      opacity: opts.opacity ?? 1, emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissiveIntensity ?? 1,
      side: opts.side ?? THREE.FrontSide,
    }));
  }
  return cacheMat.get(chave);
}

/** Caixa com extremos (x0..x1, y0..y1, z0..z1) — mais natural para construir cenários. */
export function caixa(x0, x1, y0, y1, z0, z1, material, { sombra = true, receber = true } = {}) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  const m = new THREE.Mesh(g, material);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  m.castShadow = sombra; m.receiveShadow = receber;
  return m;
}

export function cilindro(r, h, material, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), material);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function grupo(...filhos) {
  const g = new THREE.Group();
  filhos.flat().forEach((f) => f && g.add(f));
  return g;
}

/** Placa com texto (canvas → textura). */
export function placaTexto(texto, { w = 512, h = 128, fundo = '#14213d', cor = '#ffffff', fonte = 'bold 64px system-ui, sans-serif', emissivo = 0 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = fundo; x.fillRect(0, 0, w, h);
  x.fillStyle = cor; x.font = fonte; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(texto, w / 2, h / 2 + 4);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: emissivo });
}

export const rand = (a, b) => a + Math.random() * (b - a);
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/**
 * Funde malhas estáticas que compartilham material em uma só malha (poucas chamadas de desenho).
 * Ignora InstancedMesh, materiais em array e objetos marcados com userData.manter.
 */
export function fundirEstatico(raiz) {
  raiz.updateMatrixWorld(true);
  const grupos = new Map(); const originais = [];
  raiz.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || o.userData.manter) return;
    const g = o.geometry; const a = g.attributes;
    if (!a.position || !a.normal || !a.uv) return;
    const chave = `${o.material.uuid}|${o.castShadow ? 1 : 0}|${o.receiveShadow ? 1 : 0}|${o.renderOrder}`;
    const c = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(c.attributes)) if (!['position', 'normal', 'uv'].includes(k)) c.deleteAttribute(k);
    c.applyMatrix4(o.matrixWorld);
    if (!grupos.has(chave)) grupos.set(chave, { material: o.material, cast: o.castShadow, receive: o.receiveShadow, ordem: o.renderOrder, lista: [] });
    grupos.get(chave).lista.push(c); originais.push(o);
  });
  for (const o of originais) o.removeFromParent();
  for (const g of grupos.values()) {
    const m = new THREE.Mesh(mergeGeometries(g.lista, false), g.material);
    m.castShadow = g.cast; m.receiveShadow = g.receive; m.renderOrder = g.ordem; raiz.add(m);
    g.lista.forEach((x) => x.dispose());
  }
  return grupos.size;
}
