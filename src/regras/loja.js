// Estado da loja + ações. Emite eventos para a cena e a UI reagirem.
import {
  atributosParaZona, addDiasISO, zonasDosCarros, posicaoDoCliente, urgenciaLead,
  temperaturaLead, resumo, alertas, diasEmEstoque,
} from './regras.js';

export class Loja {
  constructor(dados) {
    this.config = dados.config;
    this.carros = dados.carros;
    this.leads = dados.leads;
    this.funcionarios = dados.funcionarios;
    this.hoje = dados.config.dataReferencia;
    this.ouvintes = new Map();
    this.recalcular();
  }

  // ----- eventos -----
  on(evento, fn) {
    if (!this.ouvintes.has(evento)) this.ouvintes.set(evento, new Set());
    this.ouvintes.get(evento).add(fn);
    return () => this.ouvintes.get(evento).delete(fn);
  }
  emitir(evento, payload) {
    this.ouvintes.get(evento)?.forEach((fn) => fn(payload));
    this.ouvintes.get('*')?.forEach((fn) => fn(evento, payload));
  }

  // ----- leitura -----
  carro(id) { return this.carros.find((c) => c.id === id); }
  lead(id) { return this.leads.find((l) => l.id === id); }
  funcionario(id) { return this.funcionarios.find((f) => f.id === id); }
  zonaDoCarro(id) { return this.zonas.get(id); }
  posicaoCliente(lead) { return posicaoDoCliente(lead, this.config, this.hoje); }
  urgencia(lead) { return urgenciaLead(lead, this.config, this.hoje); }
  temperatura(lead) { return temperaturaLead(lead, this.config, this.hoje); }
  diasEstoque(carro) { return diasEmEstoque(carro, this.hoje); }
  get estado() { return { carros: this.carros, leads: this.leads, config: this.config, hoje: this.hoje }; }
  resumo() { return resumo(this.estado); }
  alertas() { return alertas(this.estado); }
  carrosDaZona(zona) { return this.carros.filter((c) => this.zonas.get(c.id) === zona); }
  leadsDoVendedor(id) { return this.leads.filter((l) => l.vendedorId === id && !['vendido', 'perdido'].includes(l.etapa)); }

  recalcular() {
    this.zonas = zonasDosCarros(this.carros, this.config.capacidadeShowroom);
  }

  // ----- ações (em memória na Fase 2) -----
  moverCarroParaZona(id, zona) {
    const c = this.carro(id);
    const attrs = atributosParaZona(zona);
    if (!c || !attrs) return false;
    Object.assign(c, attrs);
    if (zona === 'oficina' && !c.servico) c.servico = 'Revisão geral';
    if (zona === 'lavajato' && !c.servico) c.servico = 'Lavagem completa';
    if (zona !== 'oficina' && zona !== 'lavajato') delete c.servico;
    this.recalcular();
    this.emitir('carros', { id });
    return true;
  }

  mudarEtapa(leadId, etapa) {
    const l = this.lead(leadId);
    if (!l) return false;
    const anterior = l.etapa;
    l.etapa = etapa;
    l.ultimoContato = this.hoje;
    if (etapa === 'documentacao') l.subEtapa = 'credito_aprovado';
    else if (etapa === 'assinatura') l.subEtapa = 'assinatura';
    else delete l.subEtapa;
    if (etapa === 'vendido') {
      const c = this.carro(l.carroPrincipal);
      if (c) { c.status = 'vendido'; this.recalcular(); this.emitir('carros', { id: c.id }); }
    }
    this.emitir('leads', { id: leadId, de: anterior, para: etapa });
    return true;
  }

  registrarContato(leadId) {
    const l = this.lead(leadId);
    if (!l) return false;
    l.ultimoContato = this.hoje;
    this.emitir('leads', { id: leadId, contato: true });
    return true;
  }

  ajustarTemperatura(leadId, valor) {
    const l = this.lead(leadId);
    if (!l) return false;
    l.temperaturaManual = valor || null;
    this.emitir('leads', { id: leadId });
    return true;
  }

  avancarDias(n = 1) {
    this.hoje = addDiasISO(this.hoje, n);
    this.emitir('dia', { hoje: this.hoje });
    this.emitir('leads', { todos: true });
  }
}
