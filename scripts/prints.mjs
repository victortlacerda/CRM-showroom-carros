// Gera os prints do README em docs/screenshots/ a partir de demo/showroom3d.html.
// Uso: npm run demo && npm run prints
// Precisa do Playwright (uma vez): npm i --no-save playwright && npx playwright install chromium
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARQ = path.join(RAIZ, 'demo', 'showroom3d.html');
const OUT = path.join(RAIZ, 'docs', 'screenshots');

const { chromium } = await import('playwright').catch(() => {
  console.error('Playwright não encontrado. Rode: npm i --no-save playwright && npx playwright install chromium');
  process.exit(1);
});

fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 1600, height: 900 } });
const erros = [];
pg.on('pageerror', (e) => erros.push(e.message));
await pg.goto('file://' + ARQ, { waitUntil: 'domcontentloaded' });
await pg.waitForFunction(() => window.__app && window.__app.ui, null, { timeout: 90000 });
await pg.waitForTimeout(3000);

const print = async (nome, espera = 4000) => {
  await pg.waitForTimeout(espera);
  await pg.screenshot({ path: path.join(OUT, nome + '.jpg'), type: 'jpeg', quality: 85 });
  console.log('ok', nome);
};
const clicar = (s) => pg.evaluate((s) => document.querySelector(s).click(), s);
const selecionar = (tipo, id) => pg.evaluate(([t, i]) => window.__app.ui.selecionar(t, i), [tipo, id]);

// escolhe um carro de destaque do showroom, um cliente em atendimento e o primeiro vendedor
const alvo = await pg.evaluate(() => {
  const L = window.__app.loja;
  const carro = L.carrosDaZona('showroom').sort((a, b) => b.precoVenda - a.precoVenda)[2];
  const cliente = L.leads.filter((l) => ['negociacao', 'test_drive', 'atendimento'].includes(l.etapa))
    .sort((a, b) => b.ultimoContato.localeCompare(a.ultimoContato))[0];
  return { carro: carro.id, cliente: cliente.id, vendedor: L.funcionarios[0].id };
});

await clicar('[data-hor="dia"]'); await clicar('[data-tema="auto"]');
await clicar('[data-preset="loja"]'); await print('01-loja-dia', 6000);
await clicar('[data-hor="noite"]'); await print('02-loja-noite', 6000);
await clicar('[data-hor="dia"]');
await clicar('[data-preset="showroom"]'); await print('03-showroom', 5000);
await selecionar('carro', alvo.carro); await print('04-ficha-carro');
await selecionar('cliente', alvo.cliente); await print('05-ficha-cliente');
await selecionar('funcionario', alvo.vendedor); await print('06-vendedor');
await selecionar(null);
await clicar('[data-preset="escritorio"]'); await print('07-escritorio', 4500);
await clicar('[data-preset="showroom"]'); await clicar('#btnFiltros');
await pg.evaluate(() => { const c = document.querySelectorAll('[data-cat]'); c[0].click(); c[1].click(); });
await print('08-filtros', 3500);
await clicar('#limpaFiltros'); await clicar('#fechaFiltros');
await clicar('[data-preset="loja"]'); await clicar('#btnAlertas'); await print('09-alertas');
await clicar('#btnAlertas');
await clicar('[data-preset="geral"]'); await print('10-visao-geral', 5000);

await b.close();
if (erros.length) { console.error('Erros na página:\n' + erros.join('\n')); process.exit(1); }
