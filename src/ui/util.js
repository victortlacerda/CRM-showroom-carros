// Utilidades de interface: escape de HTML (obrigatório com dados de usuário), formatação pt-BR, rótulos.
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const brl = (n) => (n == null ? '—' : 'R$ ' + Math.round(n).toLocaleString('pt-BR'));
export const num = (n) => (n == null ? '—' : Math.round(n).toLocaleString('pt-BR'));
export const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');
export const normalizar = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const STATUS_CARRO = {
  disponivel: { nome: 'Disponível', tom: 'ok' },
  reservado: { nome: 'Reservado', tom: 'warn' },
  preparacao: { nome: 'Em preparação', tom: 'info' },
  manutencao: { nome: 'Em manutenção', tom: 'bad' },
  avaliacao: { nome: 'Em avaliação', tom: 'neutro' },
  vendido: { nome: 'Vendido', tom: 'ok' },
};
export const ZONA_NOME = {
  showroom: 'Showroom', patio: 'Pátio externo', oficina: 'Oficina', lavajato: 'Lava-jato', avaliacao: 'Avaliação (trocas)',
  vendido: 'Vendido', escritorio: 'Escritório', recepcao: 'Recepção', calcada: 'Calçada', porta: 'Porta da loja', mesa: 'Mesa de negociação',
  testdrive: 'Test-drive', saida: 'Saída', fora: 'Fora',
};
export const CARGO_NOME = { vendedor: 'Vendedor(a)', recepcionista: 'Recepcionista', gerente: 'Gerente', financeiro: 'Financeiro', mecanico: 'Mecânico', lavador: 'Lavador' };
export const TEMP_NOME = { frio: 'Frio', morno: 'Morno', quente: 'Quente' };
export const URGENCIA_NOME = { ok: 'Em dia', atencao: 'Vence hoje', atrasado: 'Atrasado', nenhum: '—' };
export const SUB_ETAPA_NOME = { credito_aprovado: 'Crédito aprovado', docs_ok: 'Documentos OK', contrato_pronto: 'Contrato pronto', assinatura: 'Assinatura' };
export const DOC_NOME = { ipva: 'IPVA', vistoria: 'Vistoria', multas: 'Multas', dut: 'DUT' };

/** Cria elemento a partir de HTML. */
export function html(str) { const t = document.createElement('template'); t.innerHTML = str.trim(); return t.content.firstElementChild; }

/** Só aceita links http(s) (os links de fotos/vídeo vêm do Drive e são dados do usuário). */
export function linkSeguro(url) { try { const u = new URL(url); return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null; } catch { return null; } }

/** Leitura/escrita segura de preferências (pode falhar em janela privada). */
export const pref = {
  ler(k, padrao) { try { const v = localStorage.getItem('showroom3d.' + k); return v == null ? padrao : v; } catch { return padrao; } },
  gravar(k, v) { try { localStorage.setItem('showroom3d.' + k, v); } catch { /* ignora */ } },
};
