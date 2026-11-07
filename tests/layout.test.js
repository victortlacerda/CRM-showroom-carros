import test from 'node:test';
import assert from 'node:assert/strict';
import { GRAFO, caminhoEntreNos, rota, vagasDaZona, zonaNoPonto, ZONAS } from '../src/cena/layout.js';

test('grafo é totalmente conectado', () => {
  const ids = Object.keys(GRAFO.nos);
  const origem = ids[0];
  for (const id of ids) assert.ok(caminhoEntreNos(origem, id), `sem caminho até ${id}`);
});

test('rotas-chave existem: calçada → escritório, showroom → lava-jato, calçada → pátio', () => {
  assert.ok(rota({ x: -60, z: 10 }, { x: -22, z: -3.5, y: 5.2 }).length > 4);
  assert.ok(rota({ x: 0, z: -8 }, { x: 56, z: -6 }).length > 3);
  assert.ok(rota({ x: 40, z: 10 }, { x: -60, z: 4 }).length > 3);
});

test('rota até o escritório passa pela escada (sobe de nível)', () => {
  const r = rota({ x: 6, z: 10, y: 0 }, { x: -22, z: -3.5, y: 5.2 });
  const ys = r.map((p) => p.y);
  assert.ok(ys.some((y) => y > 0 && y < 5.2), 'deveria passar por degrau intermediário');
  assert.equal(ys[ys.length - 1], 5.2);
});

test('vagas: capacidade suficiente e sem sobreposição dentro da zona', () => {
  const alvo = { showroom: 24, oficina: 16, lavajato: 8, avaliacao: 8, patio: 81 };
  for (const [zona, min] of Object.entries(alvo)) {
    const v = vagasDaZona(zona, min);
    assert.ok(v.length >= min, `${zona}: ${v.length} < ${min}`);
    const chaves = new Set(v.map((p) => `${p.x}|${p.z}`));
    assert.equal(chaves.size, v.length, `${zona}: vagas repetidas`);
  }
});

test('vagas do showroom ficam dentro do showroom', () => {
  const r = ZONAS.showroom;
  for (const v of vagasDaZona('showroom', 24)) {
    assert.ok(v.x > r.x0 && v.x < r.x1 && v.z > r.z0 && v.z < r.z1);
  }
});

test('zonaNoPonto', () => {
  assert.equal(zonaNoPonto(0, -8), 'showroom');
  assert.equal(zonaNoPonto(35, -8), 'oficina');
  assert.equal(zonaNoPonto(-60, 0), 'patio');
  assert.equal(zonaNoPonto(0, 20), null);
});
