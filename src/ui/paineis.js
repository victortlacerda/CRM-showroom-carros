// Gera o HTML dos painéis laterais (carro, cliente, funcionário, zona). Todo dado passa por esc().
import {
  esc, brl, num, dataBR, STATUS_CARRO, ZONA_NOME, CARGO_NOME, TEMP_NOME, URGENCIA_NOME, SUB_ETAPA_NOME, DOC_NOME, linkSeguro,
} from './util.js';

const icone = (d) => `<svg class="icone" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
export const ICONES = {
  fechar: icone('<path d="M18 6 6 18M6 6l12 12"/>'),
  busca: icone('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
  filtro: icone('<path d="M3 5h18l-7 8v6l-4 2v-8z"/>'),
  sino: icone('<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>'),
  sol: icone('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  lua: icone('<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>'),
  tv: icone('<rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 21h8"/>'),
  camera: icone('<path d="M3 8h4l2-3h6l2 3h4v11H3z"/><circle cx="12" cy="13" r="3.5"/>'),
  carro: icone('<path d="M5 16l1.5-5.5A2 2 0 0 1 8.4 9h7.2a2 2 0 0 1 1.9 1.5L19 16"/><path d="M3 16h18v3H3z"/><circle cx="7.5" cy="19" r="1.5"/><circle cx="16.5" cy="19" r="1.5"/>'),
  ajuda: icone('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"/><path d="M12 17h.01"/>'),
  link: icone('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
};

const dado = (rotulo, valor, largo = false) => `<div class="dado${largo ? ' largo' : ''}"><span>${esc(rotulo)}</span><b title="${esc(valor)}">${esc(valor)}</b></div>`;
const badge = (txt, tom) => `<span class="badge ${tom}">${esc(txt)}</span>`;

// ---------------------------------------------------------------- carro
export function painelCarro(loja, c) {
  const st = STATUS_CARRO[c.status] || { nome: c.status, tom: 'neutro' };
  const zona = loja.zonaDoCarro(c.id);
  const dias = loja.diasEstoque(c);
  const margem = c.precoVenda - c.precoCompra;
  const diasTom = dias > 120 ? 'bad' : dias > 90 ? 'warn' : 'ok';
  const fotos = linkSeguro(c.linkFotos); const video = linkSeguro(c.linkVideo);
  const donos = loja.leads.filter((l) => l.carroPrincipal === c.id && !['vendido', 'perdido'].includes(l.etapa));
  const zonasMover = ['showroom', 'patio', 'oficina', 'lavajato', 'avaliacao'];
  return {
    titulo: `${c.marca} ${c.modelo}`,
    subtitulo: `${c.versao} · ${c.anoFab}/${c.anoModelo} · ${c.categoria}`,
    html: `
    <div class="secao">
      <div class="linha-preco"><span class="preco">${brl(c.precoVenda)}</span>${badge(st.nome, st.tom)}</div>
      <div class="mini">FIPE ${brl(c.fipe)} · ${c.precoVenda <= c.fipe ? 'abaixo' : 'acima'} da tabela em ${brl(Math.abs(c.precoVenda - c.fipe))}</div>
    </div>
    <div class="secao"><h3>Ficha</h3><div class="grade">
      ${dado('Km', num(c.km) + ' km')}${dado('Cor', c.cor)}${dado('Câmbio', c.cambio)}${dado('Combustível', c.combustivel)}
      ${dado('Placa', c.placa)}${dado('Localização', ZONA_NOME[zona] || zona)}${dado('Chassi', c.chassi, true)}
    </div></div>
    <div class="secao"><h3>Estoque e margem</h3><div class="grade">
      ${dado('Preço de compra', brl(c.precoCompra))}${dado('Margem bruta', brl(margem))}
      ${dado('Entrada', dataBR(c.dataEntrada))}${dado('Dias em estoque', dias + ' dias')}
    </div><div style="margin-top:8px">${badge(dias > 90 ? `Parado há ${dias} dias` : `${dias} dias em estoque`, diasTom)} ${c.origem === 'troca' ? badge('Veio de troca', 'info') : ''}</div></div>
    <div class="secao"><h3>Documentação</h3><div class="chips">${Object.entries(c.docs || {}).map(([k, v]) => `<span class="chip ${v === 'ok' ? 'ok' : 'bad'}">${esc(DOC_NOME[k] || k)}: ${v === 'ok' ? 'OK' : 'pendente'}</span>`).join('')}</div></div>
    ${c.servico ? `<div class="secao"><h3>Serviço em andamento</h3><div class="dado largo"><b>${esc(c.servico)}</b></div></div>` : ''}
    <div class="secao"><h3>Opcionais</h3><div class="chips">${(c.opcionais || []).map((o) => `<span class="chip">${esc(o)}</span>`).join('') || '<span class="mini">—</span>'}</div></div>
    ${c.observacoes ? `<div class="secao"><h3>Observações</h3><div class="mini" style="font-size:13px;color:var(--texto)">${esc(c.observacoes)}</div></div>` : ''}
    <div class="secao"><h3>Mídia (Google Drive)</h3><div class="acoes">
      ${fotos ? `<a class="btn pequeno" href="${esc(fotos)}" target="_blank" rel="noopener noreferrer">${ICONES.link}Fotos</a>` : '<span class="mini">Sem link de fotos</span>'}
      ${video ? `<a class="btn pequeno" href="${esc(video)}" target="_blank" rel="noopener noreferrer">${ICONES.link}Vídeo</a>` : ''}
    </div></div>
    ${donos.length ? `<div class="secao"><h3>Clientes interessados</h3><div class="lista">${donos.map((l) => `<button class="item" data-acao="sel-lead" data-id="${esc(l.id)}"><div class="corpo-item"><b>${esc(l.nome)}</b><small>${esc(loja.config.etapas.find((e) => e.id === l.etapa)?.nome)}</small></div></button>`).join('')}</div></div>` : ''}
    <div class="secao"><h3>Mover para</h3>
      <select class="sel" data-acao="mover-carro" data-id="${esc(c.id)}" aria-label="Mover carro para">
        ${zonasMover.map((z) => `<option value="${z}" ${z === zona ? 'selected' : ''}>${esc(ZONA_NOME[z])}</option>`).join('')}
      </select>
      <p class="mini" style="margin:6px 0 0">Também dá para arrastar o carro até a zona desejada no 3D.</p>
    </div>`,
  };
}

// ---------------------------------------------------------------- cliente
export function painelCliente(loja, l) {
  const pc = loja.posicaoCliente(l); const urg = pc.urgencia; const temp = loja.temperatura(l);
  const carro = loja.carro(l.carroPrincipal); const vend = loja.funcionario(l.vendedorId);
  const etapas = loja.config.etapas.filter((e) => !['vendido', 'perdido'].includes(e.id));
  const idxAtual = etapas.findIndex((e) => e.id === l.etapa);
  const etapaAtual = loja.config.etapas.find((e) => e.id === l.etapa);
  const tomUrg = { ok: 'ok', atencao: 'warn', atrasado: 'bad', nenhum: 'neutro' }[urg.nivel];
  const tomTemp = { quente: 'bad', morno: 'warn', frio: 'info' }[temp.valor];
  const encerrado = ['vendido', 'perdido'].includes(l.etapa);
  return {
    titulo: l.nome,
    subtitulo: `${etapaAtual?.nome}${l.subEtapa ? ' · ' + (SUB_ETAPA_NOME[l.subEtapa] || l.subEtapa) : ''}`,
    html: `
    <div class="secao"><div class="chips">
      ${badge(`Temperatura: ${TEMP_NOME[temp.valor]}${temp.manual ? ' (ajustada)' : ''}`, tomTemp)}
      ${urg.nivel !== 'nenhum' ? badge(`${URGENCIA_NOME[urg.nivel]} · ${urg.dias}d sem contato (limite ${urg.limite}d)`, tomUrg) : ''}
    </div>
    <p class="mini" style="margin:8px 0 0">Na cena: <b>${esc(ZONA_NOME[pc.zona] || pc.zona)}</b>${pc.atrasado ? ' — voltou para a calçada por falta de follow-up.' : ''}</p></div>
    <div class="secao"><h3>Ações rápidas</h3><div class="acoes">
      <button class="btn pequeno primario" data-acao="contato" data-id="${esc(l.id)}" ${encerrado ? 'disabled' : ''}>Registrar contato hoje</button>
      <button class="btn pequeno" data-acao="foco-cliente" data-id="${esc(l.id)}">Ver na cena</button>
    </div></div>
    <div class="secao"><h3>Funil de vendas</h3><div class="funil">
      ${etapas.map((e, i) => `<button class="passo ${i < idxAtual ? 'feito' : ''} ${i === idxAtual ? 'atual' : ''}" data-acao="etapa" data-id="${esc(l.id)}" data-etapa="${esc(e.id)}"><i></i>${esc(e.nome)}<span class="lim">${e.limiteDias != null ? 'follow-up ' + e.limiteDias + 'd' : ''}</span></button>`).join('')}
    </div>
    <div class="acoes" style="margin-top:8px">
      <button class="btn pequeno" data-acao="etapa" data-id="${esc(l.id)}" data-etapa="vendido">Marcar como vendido</button>
      <button class="btn pequeno perigo" data-acao="etapa" data-id="${esc(l.id)}" data-etapa="perdido">Marcar como perdido</button>
    </div></div>
    <div class="secao"><h3>Temperatura</h3><div class="chips">
      ${['', 'frio', 'morno', 'quente'].map((v) => `<button class="chip" aria-pressed="${(l.temperaturaManual || '') === v}" data-acao="temp" data-id="${esc(l.id)}" data-valor="${v}">${v ? TEMP_NOME[v] : 'Automática'}</button>`).join('')}
    </div></div>
    <div class="secao"><h3>Contato</h3><div class="grade">
      ${dado('Telefone', l.telefone)}${dado('Origem', l.origem)}${dado('E-mail', l.email, true)}
      ${dado('Último contato', dataBR(l.ultimoContato))}${dado('Próximo follow-up', dataBR(l.proximoFollowUp))}
      ${dado('Pagamento', l.formaPagamento)}${dado('Tem troca?', l.temTroca ? 'Sim' : 'Não')}
      ${l.dataVisita ? dado('Visita agendada', dataBR(l.dataVisita), true) : ''}
    </div></div>
    ${carro ? `<div class="secao"><h3>Carro de interesse</h3><button class="item" data-acao="sel-carro" data-id="${esc(carro.id)}"><span class="amostra" style="background:${esc(carro.corHex)}"></span><div class="corpo-item"><b>${esc(carro.marca)} ${esc(carro.modelo)}</b><small>${esc(carro.versao)} · ${brl(carro.precoVenda)}</small></div></button>
      ${(l.carrosSecundarios || []).length ? `<div class="lista" style="margin-top:6px">${l.carrosSecundarios.map((id) => loja.carro(id)).filter(Boolean).map((s) => `<button class="item" data-acao="sel-carro" data-id="${esc(s.id)}"><span class="amostra" style="background:${esc(s.corHex)}"></span><div class="corpo-item"><b>${esc(s.marca)} ${esc(s.modelo)}</b><small>Secundário · ${brl(s.precoVenda)}</small></div></button>`).join('')}</div>` : ''}</div>` : ''}
    ${vend ? `<div class="secao"><h3>Vendedor responsável</h3><button class="item" data-acao="sel-func" data-id="${esc(vend.id)}"><span class="amostra" style="background:${esc(vend.cor)}"></span><div class="corpo-item"><b>${esc(vend.nome)}</b><small>${CARGO_NOME[vend.cargo]}</small></div></button></div>` : ''}
    ${l.observacoes ? `<div class="secao"><h3>Observações</h3><div style="font-size:13px">${esc(l.observacoes)}</div></div>` : ''}`,
  };
}

// ---------------------------------------------------------------- funcionário
export function painelFuncionario(loja, f) {
  const leads = f.cargo === 'vendedor' ? loja.leadsDoVendedor(f.id) : [];
  const vendas = loja.leads.filter((l) => l.vendedorId === f.id && l.etapa === 'vendido').length;
  const pend = leads.filter((l) => loja.urgencia(l).nivel === 'atrasado');
  const ordenados = [...leads].sort((a, b) => (loja.urgencia(b).nivel === 'atrasado') - (loja.urgencia(a).nivel === 'atrasado'));
  return {
    titulo: f.nome, subtitulo: CARGO_NOME[f.cargo] + ' · ' + (ZONA_NOME[f.zona] || f.zona),
    html: f.cargo === 'vendedor' ? `
      <div class="secao"><div class="grade">${dado('Leads ativos', leads.length)}${dado('Follow-ups atrasados', pend.length)}${dado('Vendas fechadas', vendas)}${dado('Meta mensal', f.meta + ' vendas')}${dado('Comissão', f.comissao + '%')}</div></div>
      <div class="secao"><h3>Tarefas — leads deste vendedor</h3><div class="lista">
        ${ordenados.map((l) => { const u = loja.urgencia(l); return `<button class="item" data-acao="sel-lead" data-id="${esc(l.id)}"><span class="pt ${u.nivel}"></span><div class="corpo-item"><b>${esc(l.nome)}</b><small>${esc(loja.config.etapas.find((e) => e.id === l.etapa)?.nome)} · ${u.dias}d sem contato</small></div></button>`; }).join('') || '<span class="mini">Nenhum lead ativo.</span>'}
      </div></div>
      <div class="acoes"><button class="btn pequeno" data-acao="destacar-vendedor" data-id="${esc(f.id)}">Destacar clientes na cena</button></div>`
      : `<div class="secao"><div class="grade">${dado('Cargo', CARGO_NOME[f.cargo])}${dado('Setor', ZONA_NOME[f.zona] || f.zona)}</div></div>
         <p class="mini">Esta pessoa faz parte da equipe e aparece na rotina da loja.</p>`,
  };
}

// ---------------------------------------------------------------- zona
export function painelZona(loja, zona) {
  const carros = loja.carrosDaZona(zona).sort((a, b) => b.precoVenda - a.precoVenda);
  const total = carros.reduce((s, c) => s + c.precoVenda, 0);
  return {
    titulo: ZONA_NOME[zona] || zona, subtitulo: `${carros.length} carro(s) · ${brl(total)} em estoque`,
    html: `<div class="lista">${carros.map((c) => `<button class="item" data-acao="sel-carro" data-id="${esc(c.id)}"><span class="amostra" style="background:${esc(c.corHex)}"></span><div class="corpo-item"><b>${esc(c.marca)} ${esc(c.modelo)} ${esc(c.versao)}</b><small>${c.anoModelo} · ${num(c.km)} km · ${esc(c.placa)}${c.servico ? ' · ' + esc(c.servico) : ''}</small></div><span class="mini">${brl(c.precoVenda)}</span></button>`).join('') || '<span class="mini">Nenhum carro nesta zona.</span>'}</div>`,
  };
}
