import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  diffDias, addDiasISO, zonasDosCarros, urgenciaLead, posicaoDoCliente, temperaturaLead, atributosParaZona,
} from '../src/regras/regras.js';
import { Loja } from '../src/regras/loja.js';

const dados = JSON.parse(readFileSync(new URL('../src/dados/dados-exemplo.json', import.meta.url)));
const config = dados.config;
const HOJE = '2026-10-26';
const lead = (o) => ({ id: 'T', etapa: 'lead_novo', ultimoContato: HOJE, ...o });

test('datas', () => {
  assert.equal(diffDias('2026-10-20', '2026-10-26'), 6);
  assert.equal(addDiasISO('2026-10-31', 1), '2026-11-01');
});

test('showroom respeita a capacidade e manda o resto ao pátio', () => {
  const zonas = zonasDosCarros(dados.carros, 10);
  const noShowroom = [...zonas.values()].filter((z) => z === 'showroom').length;
  assert.equal(noShowroom, 10);
  const c = dados.carros.find((x) => x.status === 'manutencao');
  assert.equal(zonas.get(c.id), 'oficina');
  const v = dados.carros.find((x) => x.status === 'vendido');
  assert.equal(zonas.get(v.id), 'vendido');
});

test('follow-up: dentro do limite não alerta; passou do limite = atrasado', () => {
  assert.equal(urgenciaLead(lead({ ultimoContato: '2026-10-25' }), config, HOJE).nivel, 'ok');
  assert.equal(urgenciaLead(lead({ ultimoContato: '2026-10-24' }), config, HOJE).nivel, 'atencao'); // limite 2
  assert.equal(urgenciaLead(lead({ ultimoContato: '2026-10-23' }), config, HOJE).nivel, 'atrasado');
});

test('cliente atrasado até a negociação volta para a calçada com alerta', () => {
  for (const etapa of ['contato_feito', 'atendimento', 'test_drive', 'negociacao']) {
    const p = posicaoDoCliente(lead({ etapa, ultimoContato: '2026-10-10' }), config, HOJE);
    assert.equal(p.zona, 'calcada', etapa);
    assert.equal(p.icone, 'alerta', etapa);
  }
});

test('cliente em documentação/assinatura atrasado continua no escritório com alerta', () => {
  const d = posicaoDoCliente(lead({ etapa: 'documentacao', ultimoContato: '2026-10-10' }), config, HOJE);
  assert.equal(d.zona, 'escritorio');
  assert.equal(d.icone, 'alerta');
  const a = posicaoDoCliente(lead({ etapa: 'assinatura' }), config, HOJE);
  assert.equal(a.zona, 'escritorio');
  assert.equal(a.destaque, true);
});

test('posições por etapa (em dia)', () => {
  const z = (etapa, extra) => posicaoDoCliente(lead({ etapa, ...extra }), config, HOJE).zona;
  assert.equal(z('lead_novo'), 'calcada');
  assert.equal(z('contato_feito'), 'porta');
  assert.equal(z('atendimento'), 'showroom');
  assert.equal(z('test_drive'), 'testdrive');
  assert.equal(z('negociacao'), 'mesa');
  assert.equal(z('vendido'), 'saida');
  assert.equal(z('perdido'), 'fora');
});

test('visita agendada: futuro = calçada com agenda; no dia = porta; faltou = calçada com alerta', () => {
  const futuro = posicaoDoCliente(lead({ etapa: 'visita_agendada', dataVisita: '2026-10-28' }), config, HOJE);
  assert.equal(futuro.zona, 'calcada'); assert.equal(futuro.icone, 'agenda');
  const hoje = posicaoDoCliente(lead({ etapa: 'visita_agendada', dataVisita: HOJE }), config, HOJE);
  assert.equal(hoje.zona, 'porta');
  const faltou = posicaoDoCliente(lead({ etapa: 'visita_agendada', dataVisita: '2026-10-22' }), config, HOJE);
  assert.equal(faltou.zona, 'calcada'); assert.equal(faltou.icone, 'alerta');
});

test('temperatura: automática pela etapa, ajuste manual prevalece', () => {
  assert.equal(temperaturaLead(lead({ etapa: 'negociacao' }), config, HOJE).valor, 'quente');
  assert.equal(temperaturaLead(lead({ etapa: 'negociacao', ultimoContato: '2026-10-10' }), config, HOJE).valor, 'morno');
  const m = temperaturaLead(lead({ etapa: 'lead_novo', temperaturaManual: 'quente' }), config, HOJE);
  assert.deepEqual(m, { valor: 'quente', manual: true });
});

test('arrastar carro para zona define status', () => {
  assert.deepEqual(atributosParaZona('oficina'), { status: 'manutencao' });
  assert.equal(atributosParaZona('showroom').destaque, true);
  assert.equal(atributosParaZona('vendido'), null);
});

test('Loja: mover carro, mudar etapa, avançar dias e eventos', () => {
  const loja = new Loja(structuredClone(dados));
  const eventos = [];
  loja.on('*', (e) => eventos.push(e));
  const c = loja.carros.find((x) => x.status === 'disponivel');
  loja.moverCarroParaZona(c.id, 'lavajato');
  assert.equal(loja.zonaDoCarro(c.id), 'lavajato');
  const l = loja.leads.find((x) => x.etapa === 'negociacao');
  loja.mudarEtapa(l.id, 'vendido');
  assert.equal(loja.carro(l.carroPrincipal).status, 'vendido');
  const antes = loja.resumo().followUpsAtrasados;
  loja.avancarDias(5);
  assert.equal(loja.hoje, '2026-10-31');
  assert.ok(loja.resumo().followUpsAtrasados >= antes);
  assert.ok(eventos.includes('carros') && eventos.includes('leads') && eventos.includes('dia'));
});

test('dados de exemplo: 120 carros, 40 leads, 9 funcionários, categorias variadas', () => {
  assert.equal(dados.carros.length, 120);
  assert.equal(dados.leads.length, 40);
  assert.equal(dados.funcionarios.length, 9);
  const cats = new Set(dados.carros.map((c) => c.categoria));
  for (const k of ['Popular', 'SUV', 'Esportivo', 'Luxo', 'Elétrico', 'Híbrido', 'Picape']) assert.ok(cats.has(k), k);
  const placas = new Set(dados.carros.map((c) => c.placa));
  assert.equal(placas.size, 120);
});

test('carro arrastado para o showroom lotado entra e desloca outro para o pátio', () => {
  const loja = new Loja(structuredClone(dados));
  const cap = loja.config.capacidadeShowroom;
  const antes = loja.carrosDaZona('showroom');
  assert.equal(antes.length, cap);
  const novo = loja.carros.find((c) => c.status === 'disponivel' && loja.zonaDoCarro(c.id) === 'patio');
  loja.moverCarroParaZona(novo.id, 'showroom');
  assert.equal(loja.zonaDoCarro(novo.id), 'showroom');
  assert.equal(loja.carrosDaZona('showroom').length, cap);
});

import { filtroVazio, aplicarFiltro, buscar, carroCombina } from '../src/ui/filtros.js';
import { normalizar, esc, linkSeguro } from '../src/ui/util.js';

test('filtros: categoria, preço máximo, texto sem acento', () => {
  const f = filtroVazio();
  assert.equal(aplicarFiltro(dados.carros, f), null);
  f.categorias.add('SUV'); f.precoMax = 150000;
  const ids = aplicarFiltro(dados.carros, f);
  assert.ok(ids.size > 0);
  for (const id of ids) { const c = dados.carros.find((x) => x.id === id); assert.equal(c.categoria, 'SUV'); assert.ok(c.precoVenda <= 150000); }
  const f2 = filtroVazio(); f2.texto = 'eletrico';
  const e = aplicarFiltro(dados.carros, f2);
  assert.ok(e.size > 0);
  for (const id of e) { const c = dados.carros.find((x) => x.id === id); assert.ok(c.combustivel === 'Elétrico' || c.categoria === 'Elétrico'); }
});

test('busca encontra carro por placa, cliente por nome e funcionário por cargo', () => {
  const loja = new Loja(structuredClone(dados));
  const c = loja.carros.find((x) => x.status !== 'vendido');
  assert.ok(buscar(loja, c.placa.toLowerCase()).carros.some((x) => x.id === c.id));
  assert.ok(buscar(loja, loja.leads[0].nome.split(' ')[0]).clientes.length > 0);
  assert.ok(buscar(loja, 'mecanico').equipe.length === 2);
});

test('util: escape de HTML e links seguros', () => {
  assert.equal(esc('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(linkSeguro('javascript:alert(1)'), null);
  assert.ok(linkSeguro('https://drive.google.com/x'));
  assert.equal(normalizar('Elétrico ÇÃO'), 'eletrico cao');
});
