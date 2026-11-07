// Camada de dados: a cena e a UI só conhecem esta interface.
// Fase 2: JsonSource (arquivo de exemplo). Fase 3: SheetsSource (Google Sheets via backend Node).
//
// Contrato:
//   async carregar() -> { config, carros, leads, funcionarios }
//   async salvar(estado) -> void   (no JsonSource não grava nada: tudo fica em memória)

import dados from './dados-exemplo.json';

export class JsonSource {
  async carregar() {
    // cópia profunda: o app pode alterar à vontade sem mexer no arquivo original
    return structuredClone(dados);
  }
  async salvar() {
    /* Fase 2: só em memória */
  }
}
