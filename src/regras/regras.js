// Regras de negócio puras (sem 3D, sem DOM) — fáceis de testar e de mudar.
// "Dados entram, posições/zonas/alertas saem."

export const ZONAS_CARRO = ['showroom', 'patio', 'oficina', 'lavajato', 'avaliacao'];

/** Diferença em dias inteiros entre duas datas ISO (YYYY-MM-DD). */
export function diffDias(deISO, ateISO) {
  const a = Date.parse(deISO + 'T12:00:00Z');
  const b = Date.parse(ateISO + 'T12:00:00Z');
  return Math.round((b - a) / 86400000);
}

export function addDiasISO(iso, d) {
  const dt = new Date(iso + 'T12:00:00Z');
  dt.setUTCDate(dt.getUTCDate() + d);
  return dt.toISOString().slice(0, 10);
}

export function diasEmEstoque(carro, hoje) {
  return Math.max(0, diffDias(carro.dataEntrada, hoje));
}

/**
 * Zona do carro. O showroom tem capacidade limitada: carros "destaque"
 * (disponíveis ou reservados) entram até lotar; o resto vai para o pátio.
 * Retorna Map(id -> zona) para a frota inteira, já respeitando a capacidade.
 */
export function zonasDosCarros(carros, capacidadeShowroom = 24) {
  const mapa = new Map();
  const candidatos = carros
    .filter((c) => (c.status === 'disponivel' || c.status === 'reservado') && c.destaque)
    .sort((a, b) => (b.destaqueOrdem || 0) - (a.destaqueOrdem || 0) || b.precoVenda - a.precoVenda);
  const noShowroom = new Set(candidatos.slice(0, capacidadeShowroom).map((c) => c.id));
  for (const c of carros) {
    switch (c.status) {
      case 'manutencao': mapa.set(c.id, 'oficina'); break;
      case 'preparacao': mapa.set(c.id, 'lavajato'); break;
      case 'avaliacao': mapa.set(c.id, 'avaliacao'); break;
      case 'vendido': mapa.set(c.id, 'vendido'); break;
      default: mapa.set(c.id, noShowroom.has(c.id) ? 'showroom' : 'patio');
    }
  }
  return mapa;
}

/** Atributos que uma zona imprime no carro ao arrastá-lo para lá (D20). */
export function atributosParaZona(zona) {
  switch (zona) {
    case 'showroom': return { status: 'disponivel', destaque: true, destaqueOrdem: Date.now() };
    case 'patio': return { status: 'disponivel', destaque: false, destaqueOrdem: 0 };
    case 'oficina': return { status: 'manutencao' };
    case 'lavajato': return { status: 'preparacao' };
    case 'avaliacao': return { status: 'avaliacao' };
    default: return null;
  }
}

export function etapaPorId(config, id) {
  return config.etapas.find((e) => e.id === id);
}

const ORDEM_ETAPAS = ['lead_novo', 'contato_feito', 'visita_agendada', 'atendimento', 'test_drive', 'negociacao', 'documentacao', 'assinatura', 'vendido', 'perdido'];
export const ordemEtapa = (id) => ORDEM_ETAPAS.indexOf(id);

/** Urgência do follow-up de um lead: ok | atencao | atrasado | nenhum (vendido/perdido). */
export function urgenciaLead(lead, config, hoje) {
  const etapa = etapaPorId(config, lead.etapa);
  if (!etapa || etapa.limiteDias == null) return { nivel: 'nenhum', dias: 0, limite: null };
  let dias = diffDias(lead.ultimoContato, hoje);
  let limite = etapa.limiteDias;
  if (lead.etapa === 'visita_agendada' && lead.dataVisita) {
    // Visita agendada: o relógio só corre depois da data marcada (D28).
    dias = diffDias(lead.dataVisita, hoje);
    if (dias <= 0) return { nivel: 'ok', dias: Math.max(0, dias), limite };
  }
  const nivel = dias > limite ? 'atrasado' : dias === limite ? 'atencao' : 'ok';
  return { nivel, dias, limite };
}

/**
 * Onde o cliente aparece na cena (D12/D13/D28).
 * zona: calcada | porta | showroom | testdrive | mesa | escritorio | saida | fora
 */
export function posicaoDoCliente(lead, config, hoje) {
  const urg = urgenciaLead(lead, config, hoje);
  const atrasado = urg.nivel === 'atrasado';
  const base = { urgencia: urg, atrasado, icone: null, destaque: false };

  switch (lead.etapa) {
    case 'vendido': return { ...base, zona: 'saida', icone: 'venda' };
    case 'perdido': return { ...base, zona: 'fora', icone: null };
    case 'documentacao':
      return { ...base, zona: 'escritorio', icone: atrasado ? 'alerta' : 'docs' };
    case 'assinatura':
      return { ...base, zona: 'escritorio', icone: atrasado ? 'alerta' : 'assinar', destaque: true };
    default: break;
  }
  // Até a negociação: atrasou → volta para a calçada, passando sem entrar.
  if (atrasado) return { ...base, zona: 'calcada', icone: 'alerta' };

  switch (lead.etapa) {
    case 'lead_novo': return { ...base, zona: 'calcada', icone: null };
    case 'contato_feito': return { ...base, zona: 'porta', icone: null };
    case 'visita_agendada':
      if (lead.dataVisita && diffDias(lead.dataVisita, hoje) >= 0) return { ...base, zona: 'porta', icone: 'agenda' };
      return { ...base, zona: 'calcada', icone: 'agenda' };
    case 'atendimento': return { ...base, zona: 'showroom', icone: null };
    case 'test_drive': return { ...base, zona: 'testdrive', icone: null };
    case 'negociacao': return { ...base, zona: 'mesa', icone: null };
    default: return { ...base, zona: 'calcada', icone: null };
  }
}

/** Temperatura (D14): automática pela etapa, rebaixada se atrasado; ajuste manual prevalece. */
export function temperaturaLead(lead, config, hoje) {
  if (lead.temperaturaManual) return { valor: lead.temperaturaManual, manual: true };
  const nivelBase = {
    lead_novo: 0, contato_feito: 1, visita_agendada: 1, atendimento: 2, test_drive: 2,
    negociacao: 2, documentacao: 2, assinatura: 2, vendido: 2, perdido: 0,
  }[lead.etapa] ?? 0;
  const atrasado = urgenciaLead(lead, config, hoje).nivel === 'atrasado';
  const n = Math.max(0, nivelBase - (atrasado ? 1 : 0));
  return { valor: ['frio', 'morno', 'quente'][n], manual: false };
}

/** Números do HUD. */
export function resumo(estado) {
  const { carros, leads, config, hoje } = estado;
  const ativos = carros.filter((c) => c.status !== 'vendido');
  const porStatus = (s) => carros.filter((c) => c.status === s).length;
  const ativosLeads = leads.filter((l) => !['vendido', 'perdido'].includes(l.etapa));
  const atrasados = ativosLeads.filter((l) => urgenciaLead(l, config, hoje).nivel === 'atrasado');
  const quentes = ativosLeads.filter((l) => temperaturaLead(l, config, hoje).valor === 'quente');
  const parados = ativos.filter((c) => diasEmEstoque(c, hoje) > 90);
  return {
    estoque: ativos.length,
    disponiveis: porStatus('disponivel') + porStatus('reservado'),
    oficina: porStatus('manutencao'),
    lavajato: porStatus('preparacao'),
    avaliacao: porStatus('avaliacao'),
    leadsAtivos: ativosLeads.length,
    leadsQuentes: quentes.length,
    followUpsAtrasados: atrasados.length,
    carrosParados: parados.length,
    vendas: leads.filter((l) => l.etapa === 'vendido').length,
  };
}

/** Alertas do app (D21), ordenados por gravidade. */
export function alertas(estado) {
  const { carros, leads, config, hoje } = estado;
  const lista = [];
  for (const l of leads) {
    const u = urgenciaLead(l, config, hoje);
    if (u.nivel === 'atrasado') lista.push({ tipo: 'lead', nivel: 'atrasado', id: l.id, texto: `${l.nome}: ${u.dias} dias sem contato (limite ${u.limite})` });
    else if (u.nivel === 'atencao') lista.push({ tipo: 'lead', nivel: 'atencao', id: l.id, texto: `${l.nome}: follow-up vence hoje` });
  }
  for (const c of carros) {
    if (c.status === 'vendido') continue;
    const d = diasEmEstoque(c, hoje);
    if (d > 120) lista.push({ tipo: 'carro', nivel: 'atrasado', id: c.id, texto: `${c.marca} ${c.modelo} parado há ${d} dias` });
    else if (d > 90) lista.push({ tipo: 'carro', nivel: 'atencao', id: c.id, texto: `${c.marca} ${c.modelo} parado há ${d} dias` });
  }
  const peso = { atrasado: 0, atencao: 1 };
  return lista.sort((a, b) => peso[a.nivel] - peso[b.nivel]);
}
