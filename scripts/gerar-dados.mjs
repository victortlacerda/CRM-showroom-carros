// Gera src/dados/dados-exemplo.json (determinístico: mesma semente = mesmos dados).
// Uso: node scripts/gerar-dados.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const OUT = new URL('../src/dados/dados-exemplo.json', import.meta.url).pathname;
const DATA_REF = '2026-10-26';

// ---------- RNG com semente ----------
let seed = 20261026;
const rnd = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (a) => a[Math.floor(rnd() * a.length)];
const between = (a, b) => Math.round(a + rnd() * (b - a));
const round = (n, step) => Math.round(n / step) * step;
const addDias = (iso, d) => {
  const dt = new Date(iso + 'T12:00:00Z'); dt.setUTCDate(dt.getUTCDate() + d);
  return dt.toISOString().slice(0, 10);
};

// ---------- Catálogo (marca, modelo, categoria, carroceria 3D, combustível, preço 0km aprox., versões) ----------
const C = (marca, modelo, categoria, carroceria, combustivel, preco, versoes) =>
  ({ marca, modelo, categoria, carroceria, combustivel, preco, versoes });
const CATALOGO = [
  C('Fiat', 'Mobi', 'Popular', 'hatch', 'Flex', 72000, ['Like', 'Trekking']),
  C('Fiat', 'Argo', 'Popular', 'hatch', 'Flex', 90000, ['Drive', 'Trekking']),
  C('Fiat', 'Cronos', 'Popular', 'sedan', 'Flex', 98000, ['Drive', 'Precision']),
  C('Volkswagen', 'Polo', 'Popular', 'hatch', 'Flex', 105000, ['Track', 'Comfortline', 'Highline']),
  C('Volkswagen', 'Gol', 'Popular', 'hatch', 'Flex', 70000, ['1.0', 'Trendline']),
  C('Volkswagen', 'Virtus', 'Popular', 'sedan', 'Flex', 118000, ['Comfortline', 'Highline']),
  C('Chevrolet', 'Onix', 'Popular', 'hatch', 'Flex', 92000, ['LT', 'LTZ', 'Premier']),
  C('Chevrolet', 'Onix Plus', 'Popular', 'sedan', 'Flex', 102000, ['LT', 'Premier']),
  C('Hyundai', 'HB20', 'Popular', 'hatch', 'Flex', 95000, ['Sense', 'Vision', 'Platinum']),
  C('Renault', 'Kwid', 'Popular', 'hatch', 'Flex', 70000, ['Zen', 'Intense']),
  C('Toyota', 'Etios', 'Popular', 'hatch', 'Flex', 68000, ['X', 'Platinum']),
  C('Nissan', 'Versa', 'Popular', 'sedan', 'Flex', 108000, ['Sense', 'Exclusive']),
  C('Toyota', 'Corolla', 'Sedã', 'sedan', 'Flex', 160000, ['GLi', 'XEi', 'Altis']),
  C('Honda', 'Civic', 'Sedã', 'sedan', 'Flex', 175000, ['EX', 'EXL', 'Touring']),
  C('Honda', 'City', 'Sedã', 'sedan', 'Flex', 130000, ['LX', 'EXL']),
  C('Volkswagen', 'T-Cross', 'SUV', 'suv', 'Flex', 135000, ['200 TSI', 'Highline']),
  C('Chevrolet', 'Tracker', 'SUV', 'suv', 'Flex', 145000, ['LT', 'Premier']),
  C('Hyundai', 'Creta', 'SUV', 'suv', 'Flex', 140000, ['Comfort', 'Limited', 'Ultimate']),
  C('Jeep', 'Compass', 'SUV', 'suv', 'Flex', 185000, ['Sport', 'Longitude', 'Limited']),
  C('Jeep', 'Renegade', 'SUV', 'suv', 'Flex', 140000, ['Sport', 'Longitude']),
  C('Honda', 'HR-V', 'SUV', 'suv', 'Flex', 165000, ['EX', 'EXL', 'Touring']),
  C('Toyota', 'Corolla Cross', 'SUV', 'suv', 'Flex', 180000, ['XR', 'XRE']),
  C('Nissan', 'Kicks', 'SUV', 'suv', 'Flex', 125000, ['Sense', 'Advance', 'Exclusive']),
  C('Fiat', 'Pulse', 'SUV', 'suv', 'Flex', 115000, ['Drive', 'Audace', 'Impetus']),
  C('Toyota', 'SW4', 'SUV', 'suv', 'Diesel', 340000, ['SRX', 'Diamond']),
  C('Mitsubishi', 'Pajero Sport', 'SUV', 'suv', 'Diesel', 330000, ['HPE', 'HPE-S']),
  C('Toyota', 'Hilux', 'Picape', 'picape', 'Diesel', 280000, ['SR', 'SRV', 'SRX']),
  C('Chevrolet', 'S10', 'Picape', 'picape', 'Diesel', 270000, ['LT', 'High Country']),
  C('Ford', 'Ranger', 'Picape', 'picape', 'Diesel', 290000, ['XLS', 'Limited', 'Storm']),
  C('Fiat', 'Toro', 'Picape', 'picape', 'Flex', 175000, ['Freedom', 'Volcano', 'Ranch']),
  C('Fiat', 'Strada', 'Picape', 'picape', 'Flex', 105000, ['Freedom', 'Volcano']),
  C('Volkswagen', 'Amarok', 'Picape', 'picape', 'Diesel', 310000, ['Highline', 'Extreme']),
  C('Ford', 'Mustang', 'Esportivo', 'esportivo', 'Gasolina', 480000, ['GT', 'Mach 1']),
  C('Chevrolet', 'Camaro', 'Esportivo', 'esportivo', 'Gasolina', 450000, ['SS']),
  C('Porsche', '718 Cayman', 'Esportivo', 'esportivo', 'Gasolina', 560000, ['Base', 'S']),
  C('Porsche', '911 Carrera', 'Esportivo', 'esportivo', 'Gasolina', 950000, ['Carrera', 'S']),
  C('Nissan', 'GT-R', 'Esportivo', 'esportivo', 'Gasolina', 1100000, ['Premium']),
  C('BMW', 'Série 3', 'Luxo', 'sedan', 'Gasolina', 330000, ['320i', '330i M Sport']),
  C('Mercedes-Benz', 'Classe C', 'Luxo', 'sedan', 'Gasolina', 340000, ['C200', 'C300']),
  C('Audi', 'A4', 'Luxo', 'sedan', 'Gasolina', 320000, ['Prestige', 'Performance']),
  C('BMW', 'X5', 'Luxo', 'suv', 'Gasolina', 620000, ['xDrive40i', 'M Sport']),
  C('Mercedes-Benz', 'GLC', 'Luxo', 'suv', 'Gasolina', 480000, ['GLC 200', 'GLC 300']),
  C('Land Rover', 'Range Rover Evoque', 'Luxo', 'suv', 'Gasolina', 420000, ['S', 'SE']),
  C('Volvo', 'XC60', 'Luxo', 'suv', 'Gasolina', 380000, ['Momentum', 'Inscription']),
  C('Mercedes-Benz', 'Sprinter', 'Utilitário', 'van', 'Diesel', 330000, ['415', '516']),
  C('Renault', 'Master', 'Utilitário', 'van', 'Diesel', 260000, ['Furgão', 'Minibus']),
  C('Fiat', 'Ducato', 'Utilitário', 'van', 'Diesel', 250000, ['Cargo', 'Minibus']),
  C('BYD', 'Dolphin', 'Elétrico', 'hatch', 'Elétrico', 150000, ['GS', 'Plus']),
  C('BYD', 'Seal', 'Elétrico', 'sedan', 'Elétrico', 270000, ['Premium', 'Performance']),
  C('BYD', 'Song Plus', 'Elétrico', 'suv', 'Híbrido', 230000, ['DM-i', 'Premium']),
  C('GWM', 'Haval H6', 'Híbrido', 'suv', 'Híbrido', 270000, ['HEV', 'GT PHEV']),
  C('Toyota', 'Corolla Hybrid', 'Híbrido', 'sedan', 'Híbrido', 190000, ['Altis Hybrid']),
  C('Volvo', 'EX30', 'Elétrico', 'suv', 'Elétrico', 270000, ['Plus', 'Ultra']),
  C('Renault', 'Kwid E-Tech', 'Elétrico', 'hatch', 'Elétrico', 140000, ['Zen', 'Outsider']),
  C('Toyota', 'RAV4 Hybrid', 'Híbrido', 'suv', 'Híbrido', 380000, ['SX', 'SX Connect']),
];

const CORES = [
  ['Branco', '#f2f2f0'], ['Prata', '#b9bec4'], ['Preto', '#1d1f23'], ['Cinza', '#6d737b'],
  ['Vermelho', '#c0262d'], ['Azul', '#2456a6'], ['Verde', '#2f6b4f'], ['Bege', '#c9b79c'],
  ['Laranja', '#d9701f'], ['Amarelo', '#e0b82a'], ['Vinho', '#6e1f33'], ['Azul Claro', '#5aa5d6'],
];
const CORES_ESPORTIVO = ['Vermelho', 'Amarelo', 'Laranja', 'Azul', 'Preto', 'Branco', 'Verde'];
const OPCIONAIS = ['Ar-condicionado', 'Direção elétrica', 'Central multimídia', 'Câmera de ré', 'Sensor de estacionamento',
  'Teto solar', 'Bancos de couro', 'Piloto automático', 'Faróis de LED', 'Rodas de liga leve', 'Airbags', 'ABS',
  'Controle de estabilidade', 'Carregamento por indução', 'Partida sem chave', 'Banco com ajuste elétrico'];
const MANUTENCOES = ['Troca de óleo e filtros', 'Revisão de freios', 'Alinhamento e balanceamento', 'Funilaria e pintura',
  'Troca de pneus', 'Revisão de suspensão', 'Troca de bateria', 'Reparo no ar-condicionado', 'Polimento técnico'];
const PREPARACOES = ['Lavagem completa', 'Higienização interna', 'Polimento', 'Vitrificação', 'Lavagem do motor'];

// ---------- Carros ----------
const LETRAS = 'ABCDEFGHJKLMNPRSTUVWXYZ';
const placa = () => pick([...LETRAS]) + pick([...LETRAS]) + pick([...LETRAS]) + between(0, 9) + pick([...LETRAS]) + between(0, 9) + between(0, 9);
const placas = new Set();
const placaUnica = () => { let p; do { p = placa(); } while (placas.has(p)); placas.add(p); return p; };

// Distribuição de status (120 no total)
const STATUS = [
  ...Array(80).fill('disponivel'), ...Array(8).fill('reservado'), ...Array(8).fill('preparacao'),
  ...Array(10).fill('manutencao'), ...Array(5).fill('avaliacao'), ...Array(9).fill('vendido'),
];
// embaralha
for (let i = STATUS.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [STATUS[i], STATUS[j]] = [STATUS[j], STATUS[i]]; }

// Garante variedade: percorre o catálogo em ciclo e depois sorteia
const carros = [];
for (let i = 0; i < 120; i++) {
  const m = i < CATALOGO.length ? CATALOGO[i] : pick(CATALOGO);
  const ano = between(2015, 2026);
  const anoModelo = Math.min(2027, ano + (rnd() < 0.5 ? 1 : 0));
  const idade = 2026 - ano;
  const km = ano >= 2026 ? between(0, 9000) : Math.max(1500, round(idade * between(8000, 17000) + between(0, 8000), 100));
  const deprec = Math.max(0.45, 1 - idade * 0.055 - km / 900000);
  const versao = pick(m.versoes);
  const precoVenda = round(m.preco * deprec * (0.97 + rnd() * 0.08), 500);
  const precoCompra = round(precoVenda * (0.86 + rnd() * 0.07), 500);
  const fipe = round(precoVenda * (0.96 + rnd() * 0.08), 500);
  const corNome = m.categoria === 'Esportivo' && rnd() < 0.8 ? pick(CORES_ESPORTIVO) : pick(CORES)[0];
  const cor = CORES.find((c) => c[0] === corNome) || CORES[0];
  const status = STATUS[i];
  const diasEstoque = status === 'vendido' ? between(10, 120) : Math.round(2 + Math.pow(rnd(), 1.7) * 150);
  const entrada = addDias(DATA_REF, -diasEstoque);
  const trocaOrigem = rnd() < 0.22;
  const id = 'C' + String(i + 1).padStart(3, '0');
  const eletrico = m.combustivel === 'Elétrico';
  const carro = {
    id, marca: m.marca, modelo: m.modelo, versao, categoria: m.categoria, carroceria: m.carroceria,
    anoFab: ano, anoModelo, km, cor: cor[0], corHex: cor[1],
    cambio: m.carroceria === 'esportivo' || eletrico || m.categoria === 'Luxo' || rnd() < 0.55 ? 'Automático' : 'Manual',
    combustivel: m.combustivel, placa: placaUnica(), chassi: '9BW' + between(10000000, 99999999) + id,
    precoVenda, precoCompra, fipe, status,
    destaque: false, origem: trocaOrigem ? 'troca' : 'compra',
    dataEntrada: entrada,
    linkFotos: `https://drive.google.com/drive/folders/exemplo-${id}`,
    linkVideo: rnd() < 0.3 ? `https://drive.google.com/file/d/exemplo-video-${id}` : '',
    opcionais: Array.from(new Set(Array.from({ length: between(4, 9) }, () => pick(OPCIONAIS)))),
    observacoes: pick(['Único dono.', 'Revisões em dia.', 'Aceita troca.', 'Laudo cautelar aprovado.', 'Pneus novos.', 'Garantia de fábrica.', '']),
    docs: { ipva: rnd() < 0.8 ? 'ok' : 'pendente', vistoria: rnd() < 0.85 ? 'ok' : 'pendente', multas: rnd() < 0.9 ? 'ok' : 'pendente', dut: rnd() < 0.92 ? 'ok' : 'pendente' },
  };
  if (status === 'manutencao') carro.servico = pick(MANUTENCOES);
  if (status === 'preparacao') carro.servico = pick(PREPARACOES);
  if (status === 'avaliacao') { carro.origem = 'troca'; carro.diasEstoque = undefined; }
  carros.push(carro);
}

// Destaques: os 22 disponíveis mais "vitrine" (esportivos/luxo/elétricos primeiro, depois SUV/picapes)
const peso = { Esportivo: 0, Luxo: 1, Elétrico: 2, Híbrido: 3, SUV: 4, Picape: 5, Sedã: 6, Popular: 7, Utilitário: 8 };
carros.filter((c) => c.status === 'disponivel' || c.status === 'reservado')
  .sort((a, b) => (peso[a.categoria] ?? 9) - (peso[b.categoria] ?? 9) || b.precoVenda - a.precoVenda)
  .slice(0, 24).forEach((c) => { c.destaque = true; });

// ---------- Funcionários ----------
const funcionarios = [
  { id: 'F01', nome: 'Rafael Moura', cargo: 'vendedor', zona: 'showroom', cor: '#2f6fed', comissao: 1.5, meta: 8 },
  { id: 'F02', nome: 'Camila Duarte', cargo: 'vendedor', zona: 'showroom', cor: '#e0507a', comissao: 1.5, meta: 8 },
  { id: 'F03', nome: 'Bruno Teixeira', cargo: 'vendedor', zona: 'showroom', cor: '#2aa876', comissao: 1.5, meta: 8 },
  { id: 'F04', nome: 'Patrícia Lemos', cargo: 'recepcionista', zona: 'recepcao', cor: '#9b5de5', comissao: 0, meta: 0 },
  { id: 'F05', nome: 'Henrique Alves', cargo: 'gerente', zona: 'escritorio', cor: '#f4a261', comissao: 0.5, meta: 0 },
  { id: 'F06', nome: 'Larissa Prado', cargo: 'financeiro', zona: 'escritorio', cor: '#00a6a6', comissao: 0, meta: 0 },
  { id: 'F07', nome: 'José Ferreira', cargo: 'mecanico', zona: 'oficina', cor: '#e76f51', comissao: 0, meta: 0 },
  { id: 'F08', nome: 'Davi Nogueira', cargo: 'mecanico', zona: 'oficina', cor: '#e76f51', comissao: 0, meta: 0 },
  { id: 'F09', nome: 'Marcos Pinto', cargo: 'lavador', zona: 'lavajato', cor: '#4cc9f0', comissao: 0, meta: 0 },
];
const vendedores = funcionarios.filter((f) => f.cargo === 'vendedor');

// ---------- Leads ----------
const NOMES = ['Ana', 'Carlos', 'Mariana', 'João', 'Fernanda', 'Pedro', 'Juliana', 'Lucas', 'Beatriz', 'Gustavo', 'Aline', 'Rodrigo',
  'Camila', 'Thiago', 'Larissa', 'Felipe', 'Vanessa', 'Diego', 'Renata', 'Marcelo', 'Paula', 'André', 'Tatiana', 'Ricardo', 'Letícia', 'Eduardo'];
const SOBRENOMES = ['Silva', 'Souza', 'Oliveira', 'Santos', 'Pereira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Lima', 'Araújo',
  'Ribeiro', 'Carvalho', 'Gomes', 'Martins', 'Rocha', 'Barbosa', 'Cardoso', 'Freitas', 'Mendes'];
const ORIGENS = ['Site', 'Indicação', 'Instagram', 'Passou na loja', 'Portal de anúncios', 'WhatsApp'];
const ETAPAS = ['lead_novo', 'contato_feito', 'visita_agendada', 'atendimento', 'test_drive', 'negociacao', 'documentacao', 'assinatura'];
// Distribuição de 40 leads por etapa (2 perdidos + 2 vendidos além dos 40 ativos? mantemos 40 no total)
const DIST = { lead_novo: 8, contato_feito: 6, visita_agendada: 4, atendimento: 6, test_drive: 3, negociacao: 5, documentacao: 3, assinatura: 2, vendido: 2, perdido: 1 };
const SUBETAPA_DOC = ['credito_aprovado', 'docs_ok', 'contrato_pronto'];
const disponiveis = carros.filter((c) => ['disponivel', 'reservado'].includes(c.status));
const vendidos = carros.filter((c) => c.status === 'vendido');

const leads = [];
let n = 0;
for (const [etapa, qtd] of Object.entries(DIST)) {
  for (let k = 0; k < qtd; k++) {
    n++;
    const id = 'L' + String(n).padStart(3, '0');
    const nome = `${pick(NOMES)} ${pick(SOBRENOMES)}`;
    // ~40% dos leads têm contato atrasado (para ver clientes na calçada)
    const atrasado = rnd() < 0.4 && !['vendido', 'perdido'].includes(etapa);
    const dias = atrasado ? between(4, 9) : between(0, 2);
    const principal = etapa === 'vendido' ? pick(vendidos) : pick(disponiveis);
    const secundarios = rnd() < 0.5 ? [pick(disponiveis).id].filter((x) => x !== principal.id) : [];
    const lead = {
      id, nome,
      telefone: `(31) 9${between(1000, 9999)}-${between(1000, 9999)}`,
      email: `${nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ /g, '.')}@exemplo.com`,
      origem: pick(ORIGENS), carroPrincipal: principal.id, carrosSecundarios: secundarios,
      etapa, vendedorId: pick(vendedores).id,
      ultimoContato: addDias(DATA_REF, -dias),
      proximoFollowUp: addDias(DATA_REF, between(0, 3)),
      temperaturaManual: null,
      temTroca: rnd() < 0.35, formaPagamento: pick(['À vista', 'Financiado', 'Financiado', 'Consórcio contemplado']),
      observacoes: pick(['Prefere contato por WhatsApp.', 'Quer entrada baixa.', 'Aguarda aprovação de crédito.', 'Compara com outro carro.', '']),
    };
    if (etapa === 'documentacao') lead.subEtapa = SUBETAPA_DOC[k % SUBETAPA_DOC.length];
    if (etapa === 'assinatura') lead.subEtapa = 'assinatura';
    if (etapa === 'visita_agendada') lead.dataVisita = addDias(DATA_REF, between(-2, 3));
    if (etapa === 'perdido') lead.motivoPerda = 'Comprou em outra loja';
    leads.push(lead);
  }
}

// Carros reservados/negociação coerentes: o principal de leads em documentação/assinatura fica reservado
for (const l of leads.filter((x) => ['documentacao', 'assinatura'].includes(x.etapa))) {
  const c = carros.find((x) => x.id === l.carroPrincipal);
  if (c && c.status === 'disponivel') c.status = 'reservado';
}

const config = {
  nomeLoja: 'Sua Loja de Veículos',
  logo: '',
  dataReferencia: DATA_REF,
  etapas: [
    { id: 'lead_novo', nome: 'Lead novo', limiteDias: 2 },
    { id: 'contato_feito', nome: 'Contato feito', limiteDias: 3 },
    { id: 'visita_agendada', nome: 'Visita agendada', limiteDias: 1 },
    { id: 'atendimento', nome: 'Atendimento na loja', limiteDias: 3 },
    { id: 'test_drive', nome: 'Test-drive', limiteDias: 2 },
    { id: 'negociacao', nome: 'Proposta / Negociação', limiteDias: 2 },
    { id: 'documentacao', nome: 'Documentação / Crédito', limiteDias: 3 },
    { id: 'assinatura', nome: 'Aguardando assinatura', limiteDias: 2 },
    { id: 'vendido', nome: 'Vendido', limiteDias: null },
    { id: 'perdido', nome: 'Perdido', limiteDias: null },
  ],
  subEtapasDoc: SUBETAPA_DOC.concat(['assinatura']),
  capacidadeShowroom: 24,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ config, carros, leads, funcionarios }, null, 1));
const cont = (arr, f) => arr.reduce((a, x) => ((a[f(x)] = (a[f(x)] || 0) + 1), a), {});
console.log('carros:', carros.length, cont(carros, (c) => c.status));
console.log('categorias:', cont(carros, (c) => c.categoria));
console.log('carrocerias:', cont(carros, (c) => c.carroceria));
console.log('destaques:', carros.filter((c) => c.destaque).length);
console.log('leads:', leads.length, cont(leads, (l) => l.etapa));
