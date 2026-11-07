import { normalizar } from './util.js';

export const filtroVazio = () => ({ texto: '', categorias: new Set(), status: new Set(), precoMax: null, anoMin: null, kmMax: null });

export function filtroAtivo(f) {
  return !!(f.texto.trim() || f.categorias.size || f.status.size || f.precoMax != null || f.anoMin != null || f.kmMax != null);
}

export function textoDoCarro(c) {
  return normalizar([c.marca, c.modelo, c.versao, c.placa, c.cor, c.categoria, c.anoFab, c.anoModelo, c.combustivel, c.cambio, c.id].join(' '));
}

export function carroCombina(c, f) {
  if (f.categorias.size && !f.categorias.has(c.categoria)) return false;
  if (f.status.size && !f.status.has(c.status)) return false;
  if (f.precoMax != null && c.precoVenda > f.precoMax) return false;
  if (f.anoMin != null && c.anoModelo < f.anoMin) return false;
  if (f.kmMax != null && c.km > f.kmMax) return false;
  const t = normalizar(f.texto).trim();
  if (t) { const base = textoDoCarro(c); if (!t.split(/\s+/).every((p) => base.includes(p))) return false; }
  return true;
}

/** Set com os ids que combinam (carros vendidos ficam de fora). Retorna null se não há filtro. */
export function aplicarFiltro(carros, f) {
  if (!filtroAtivo(f)) return null;
  return new Set(carros.filter((c) => c.status !== 'vendido' && carroCombina(c, f)).map((c) => c.id));
}

/** Resultados da busca para o menu suspenso. */
export function buscar(loja, texto, limite = 6) {
  const t = normalizar(texto).trim(); if (!t) return { carros: [], clientes: [], equipe: [] };
  const partes = t.split(/\s+/);
  const casa = (base) => partes.every((p) => base.includes(p));
  return {
    carros: loja.carros.filter((c) => c.status !== 'vendido' && casa(textoDoCarro(c))).slice(0, limite),
    clientes: loja.leads.filter((l) => casa(normalizar([l.nome, l.telefone, l.email].join(' ')))).slice(0, limite),
    equipe: loja.funcionarios.filter((f) => casa(normalizar(f.nome + ' ' + f.cargo))).slice(0, 4),
  };
}
