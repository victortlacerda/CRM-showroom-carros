# 🚗 Showroom 3D CRM — Planejamento e Roadmap

> Documento vivo. Regra de ouro: **nenhuma ideia se perde**. Tudo que surgir entra em "Backlog de ideias" (seção 9) e depois é encaixado numa fase.
> **Legenda:** `[x]` nas seções 4, 5, 8 e 9 = **decidido/aprovado**. Na seção 10 (Roadmap) `[x]` = **feito**.
> Como usar: abra a demo, navegue e responda as **perguntas da seção 8.C**. Devolva o arquivo e eu atualizo.

**Status atual:** 🟢 Fases 0 e 1 concluídas e Fase 2 quase toda pronta — demo 3D funcional e testada (aguardando sua revisão visual)
**Versão:** v3 · **Última atualização:** 27/10/2026

---

## 1. Visão do produto

Um CRM + controle de estoque para loja de carros **onde a própria loja em 3D é a interface**. Em vez de tabelas, você enxerga a operação acontecendo: carros no showroom, na oficina, no lava-jato; clientes entrando, esperando, assinando; vendedores circulando.

**Princípio central:** *o 3D é uma visualização dos dados, não o banco de dados.* Cada objeto/pessoa na cena é um reflexo de um registro (carro, lead, funcionário). Mudou o dado → a cena reage.

**Premissas já decididas:**
- Uso **só pelo dono**, **rodando no seu computador** (sem login, sem hospedagem online por ora).
- Estoque de **100+ carros**.
- **Não armazena** fotos, vídeos ou áudios. Só **links** (Google Drive etc.).
- Dados no futuro em **Google Sheets** (planilha como banco).

**Ordem de trabalho combinada:**
1. Planejamento (este documento)
2. Animação 3D funcional (com dados de exemplo)
3. Funcionalidade (CRM + estoque de verdade, ligado ao 3D)

---

## 2. Mapa da loja (cenário)

```
        ┌───────────────── 2º ANDAR ─────────────────┐
        │  Escritório: gerência, financeiro/         │
        │  documentação (assinaturas), sala de       │
        │  reunião                                   │
        └────────────────────────────────────────────┘
┌──────────────────────── 1º ANDAR ───────────────────────────┐
│ RECEPÇÃO / │       SHOWROOM        │  OFICINA  │ LAVA-JATO   │
│ ATENDIMENTO│  (carros destaque)    │ (manutenç)│ (preparação)│
└──────────────────────────────────────────────────────────────┘
   CALÇADA + RUA (clientes passando, carros passando)
   PÁTIO EXTERNO (restante do estoque — necessário com 100+ carros)
```

| Zona | Significado no sistema |
|---|---|
| Showroom | Carros **Disponíveis em destaque** (capacidade a definir, ver D25) |
| Pátio externo | Demais carros **Disponíveis** (estoque grande) |
| Oficina | Carros **Em manutenção / reparo** |
| Lava-jato | Carros **Em preparação / higienização** |
| Vaga "Reservado" (com placa) | Carros **Reservados** (cliente já deu sinal) |
| Entrada de avaliação | Carro de **troca (trade-in)** chegando para avaliação |
| Saída da loja | Carro **Vendido** sai com o cliente (animação de entrega) |
| Escritório 2º andar | Clientes em **documentação / assinatura** |
| Calçada | Leads **frios / sem follow-up** |
| Dentro da loja | Leads **quentes / em atendimento** |

---

## 3. Regras de negócio ↔ animação (o coração do app)

### 3.1 Status do carro → onde ele fica

| Status | Zona 3D | Observação |
|---|---|---|
| Disponível (destaque) | Showroom | Clicável, mostra ficha completa |
| Disponível (demais) | Pátio externo | Idem |
| Em preparação | Lava-jato | Funcionário lavando |
| Em manutenção | Oficina | Mecânico trabalhando; mostra o que está sendo feito |
| Reservado | Showroom/Pátio (placa "Reservado") | |
| Em avaliação (troca) | Entrada de avaliação | Depois de avaliado vira estoque (D16) |
| Vendido | Sai da loja | Some do estoque ativo, vai para histórico |

### 3.2 Funil (D12) → onde o cliente aparece

Funil: `Lead novo → Contato feito → Visita agendada → Atendimento na loja → Test-drive → Proposta/Negociação → Documentação/Crédito → Aguardando assinatura → Vendido | Perdido`

| Etapa | Cliente na cena | Comportamento |
|---|---|---|
| Lead novo | Calçada | Passa andando, olha a vitrine |
| Contato feito | Porta da loja | Para na porta, vendedor vai ao encontro |
| Visita agendada | Calçada, com ícone de agenda 📅 | *(proposta, ver D28)* No dia marcado ele entra |
| Atendimento na loja | Dentro do showroom | Anda com vendedor, olha carros |
| Test-drive | Sai com o carro e volta | |
| Proposta / Negociação | Mesa de negociação no showroom | |
| Documentação / Crédito | Escritório 2º andar | Sentado com financeiro; sub-etapas abaixo |
| **Aguardando assinatura** | Escritório 2º andar | Destaque visual (aura/brilho, caneta) |
| Vendido | Retira o carro | Animação de entrega + comemoração 🎉 |
| Perdido | Vai embora / some | Fica no histórico |

**Sub-etapas de documentação (D17):** `crédito aprovado → docs ok → contrato pronto → assinatura`

**Temperatura (D14):** calculada automaticamente pela etapa **com ajuste manual** do vendedor (o manual prevalece e é marcado como "ajustado").

**Interesses (D15):** 1 carro principal + carros secundários por lead.

### 3.3 Regra de follow-up (D13: configurável por etapa)
- `diasSemContato = hoje − dataUltimoContato`
- `diasSemContato > limite da etapa` → cliente volta para a **calçada** passando sem entrar, com alerta.
- Cores de urgência: 🟢 em dia · 🟡 atenção · 🔴 atrasado.
- Valores sugeridos e comportamento em etapas avançadas: ver **D28**.

---

## 4. Personagens e animações (aprovados)

**Funcionários:**
- [x] Vendedores — andam pelo showroom, atendem clientes, voltam à mesa
- [x] Recepcionista
- [x] Gerente (escritório)
- [x] Financeiro / documentação (escritório)
- [x] Mecânicos (oficina)
- [x] Lavador (lava-jato)

**Clientes:**
- [x] Caminhando na calçada (passando)
- [x] Entrando na loja
- [x] Olhando carros no showroom
- [x] Conversando com vendedor
- [x] Subindo para o escritório (escada/elevador)
- [x] Assinando
- [x] Saindo com carro (venda) / indo embora (perdido)

**Ambiente vivo:**
- [x] Carros passando na rua
- [x] Ciclo dia/noite (D10)
- [x] Letreiro da loja, iluminação do showroom

---

## 5. UX / Design

**Objetivo:** bonito *e* prático. O 3D não pode atrapalhar quem só quer resolver rápido.

Princípios:
1. **Duas câmeras (D09)**, com botão para alternar: **diorama/isométrica** com corte do prédio (vê os 2 andares) e **orbital livre** (girar e dar zoom).
2. **Clicar em qualquer coisa abre um painel lateral** (não sai da cena): carro → ficha; cliente → ficha do lead + ações rápidas; funcionário → tarefas/leads dele (D19); zona → lista de carros da zona *(pendente, D19b)*.
3. **Busca e filtros sempre acessíveis** (placa, marca, modelo, cliente) — o 3D destaca/foca o resultado. Com 100+ carros isso é essencial.
4. **Modo "Lista"** alternativo (tabela clássica). O 3D é o principal, a lista é o plano B.
5. **Estilo low-poly estilizado (D08)**: cores limpas, sombras suaves.
6. **Tema claro e escuro (D11)** na interface; ciclo dia/noite na cena (ver D29).
7. **HUD:** carros em estoque, leads quentes, follow-ups atrasados, vendas do mês.
8. **Desktop primeiro (D07)**, mobile depois. Desempenho: 60 fps em notebook comum.
9. **Arrastar carro** entre zonas para mudar o status, além de editar na ficha (D20).
10. **Alertas dentro do app (D21)**: follow-up vencendo, carro parado há X dias.

Pontos de atenção de UX (aprovados):
- [x] Muita gente na cena = poluição. Agrupar quando houver muitos leads (ex.: "+23 na calçada").
- [x] Acessibilidade: contraste, tamanho de fonte, não depender só de cor.
- [x] Mobile: toque, zoom, painel em tela cheia (fase posterior).

---

## 6. Arquitetura técnica

### 6.1 Stack (decidida)

| Camada | Escolha | Observação |
|---|---|---|
| 3D | **Three.js** | |
| Build / dev | **Vite** (Node.js) | |
| Linguagem | **JavaScript** (D03) | Pode migrar para TypeScript depois |
| Interface | **HTML + CSS + JS puro** (D04) | |
| Backend (Fase 3) | **Node.js + Express** | Necessário para falar com o Google Sheets sem expor credenciais no navegador |
| Banco (Fase 3) | **Google Sheets** (D05) | Ver 6.6 |
| Onde roda | **Seu computador** (D06) | Sem hospedagem; `npm start` abre o app |

### 6.2 Princípio de arquitetura
```
 Fonte de dados  →  Estado da loja  →  Cena 3D
 (JSON/Sheets)      (módulo de regras:  (posiciona carros
                     onde cada coisa     e pessoas)
                     fica)
        ↑                                      │
        └─────── clique / arrastar / ações ←───┘
```
- **Camada de dados com interface única** (`DataSource`): `JsonSource` na Fase 2, `SheetsSource` na Fase 3. Se um dia quiser trocar por SQLite, só troca a fonte; a cena não muda.
- Toda a lógica "status → zona" e "funil → posição do cliente" fica num **módulo de regras** separado do 3D.

### 6.3 Ativos 3D
- **Carros:** 4–6 carrocerias low-poly (hatch, sedã, SUV, picape, esportivo, van), **pintadas pela cor** do cadastro. Marca/modelo na etiqueta/ficha.
- **Pessoas:** low-poly com variações de roupa/cabelo e animações básicas. Por código ou bibliotecas gratuitas (Kenney, Quaternius, Mixamo — checar licença).
- **Prédio/ambiente:** modelado por código → leve e ajustável.

### 6.4 Movimentação das pessoas
- Rede de **waypoints** por zona; **máquina de estados** por pessoa (`passando → entrando → atendimento → escritório → saindo`).

### 6.5 Escala: 100+ carros (D02)
- **Instancing** (um desenho para vários carros iguais), geometria simples, sombras só onde importa.
- Carros distantes com menos detalhe (LOD) e etiquetas só quando perto/selecionado.
- Pessoas limitadas na cena (agrupamento "+N").
- Meta de teste na Fase 1: **120 carros + 40 pessoas a 60 fps**.

### 6.6 Google Sheets como banco (D05) — como vamos fazer funcionar bem
**Estrutura:** uma planilha com abas: `Carros · Leads · Interações · Funcionários · Vendas · Config`. Cada linha tem **ID próprio** (nunca usar o número da linha como identificador).

**Como o app acessa:** o backend Node usa a API do Google Sheets com uma **conta de serviço** (credencial fica só no seu PC).

**Limites e como contornar:**
| Limite | Solução |
|---|---|
| API é mais lenta que um banco | Ler tudo de uma vez ao abrir e manter **cache em memória** |
| Há limite de requisições por minuto | Gravar **em lote**; atualização otimista na tela |
| Você pode editar a planilha à mão com o app aberto | Botão **"Recarregar"** + recarga automática a cada X minutos |
| Precisa de internet | Aceitável (uso local com internet); avisar na tela se cair |
| Colunas/formatos quebrarem | Validação ao ler e aba `Config` com versão do esquema |

**Bônus:** como é planilha, você consegue ver, filtrar e corrigir dados direto no Google Sheets, e a importação (D22) vira natural.

---

## 7. Modelo de dados (rascunho atualizado)

**Carro**
`id · marca · modelo · versão · ano fab/modelo · km · cor · câmbio · combustível · placa · chassi · preço de venda · preço de compra · FIPE · status · zona · destaque (sim/não) · origem (compra/troca) · data entrada no estoque · dias em estoque · link fotos (Drive) · link vídeo · observações · opcionais/itens · docs (IPVA, vistoria, multas, DUT)`

**Cliente / Lead**
`id · nome · telefone · e-mail · origem · carro principal · carros secundários · etapa do funil · sub-etapa de documentação · vendedor responsável · data do último contato · próximo follow-up · temperatura automática · temperatura manual (ajuste) · tem troca? (carro de troca) · forma de pagamento · observações · motivo da perda`

**Interação (histórico)**
`id · lead · vendedor · tipo (ligação, WhatsApp, visita, test-drive) · data · resumo`

**Funcionário**
`id · nome · cargo · zona de trabalho · aparência do avatar · % de comissão · meta mensal`

**Venda**
`id · carro · cliente · vendedor · valor · forma de pagamento · data · comissão`

**Manutenção do carro** *(do backlog: histórico de oficina com custos)*
`id · carro · data · descrição · custo · fornecedor`

**Configurações**
`limites de follow-up por etapa · etapas do funil · nome/logo da loja · cores · tema`

---

## 8. 🧭 DECISÕES

### 8.A ✅ Decisões fechadas (registro)

| # | Decisão | Resposta | Impacto |
|---|---|---|---|
| D01 | Quem usa | **Só o dono** | Sem logins/perfis. "Vendedor" é um cadastro/personagem, não um usuário |
| D02 | Estoque | **100+ carros** | Pátio externo + destaque no showroom + instancing |
| D03 | Linguagem | JavaScript | |
| D04 | Interface | HTML/CSS/JS puro | |
| D05 | Banco | **Google Sheets** | Backend Node + camada de dados + cache (6.6) |
| D06 | Onde roda | **Só no seu computador** | Sem hospedagem; Fase 5 simplificada |
| D07 | Dispositivos | Desktop primeiro | |
| D08 | Estilo | Low-poly estilizado | |
| D09 | Câmera | **As duas**, com botão | Dois modos de controle |
| D10 | Dia/noite | **Sim** | Ver D29 |
| D11 | Tema | **Claro e escuro** | Nome, logo e cores **ainda em branco** → pendente |
| D12 | Funil | Proposta usada | |
| D13 | Follow-up | Configurável por etapa | Valores em D28 |
| D14 | Temperatura | **Automática + ajuste manual** | |
| D15 | Interesses | 1 principal + secundários | |
| D16 | Trade-in | Sim | |
| D17 | Documentação | Sub-etapas | |
| D18 | Comissão/metas | **Sim, Fase 3** | Campos em Funcionário/Venda |
| D19 | Cliques | Cliente: ficha + ações rápidas · **Funcionário: tarefas/leads dele** · Zona: **não respondido** | Ver D19b |
| D20 | Arrastar | Sim | Na Fase 2 em memória; salva na Fase 3 |
| D21 | Alertas | Sim, dentro do app | |
| D22 | Entrada de dados | **Cadastro manual + importar planilha** | |
| D23 | Integrações futuras | **FIPE, portais, Google Drive** | Fase 4 |
| D24 | Segurança | Depois | Coerente com D01/D06; LGPD segue como item de atenção |

### 8.B ✅ Pendências respondidas ("ok com as estrelas")

| # | Decisão | Resultado |
|---|---|---|
| D11 | Identidade visual | **Genérica**: nome "Sua Loja de Veículos", sem logo, azul `#2f6fed` como cor de destaque. Nome/logo/cores ficam em `config` para trocar depois |
| D19b | Clique em zona | **Abre a lista de carros da zona** ✅ implementado |
| D25 | 100+ carros | **Showroom com 24 destaques + pátio externo (84 vagas)** ✅ implementado |
| D26 | Google Sheets | Sem planilha atual → **dados de exemplo gerados**. O modelo da planilha será desenhado na Fase 3 |
| D27 | Equipe | 3 vendedores, 1 recepcionista, 1 gerente, 1 financeiro, 2 mecânicos, 1 lavador ✅ |
| D28 | Follow-up | Limites por etapa (2/3/1/3/2/2/3/2 dias). Documentação e assinatura atrasadas **ficam no escritório com alerta**. Visita agendada espera na calçada com ícone de agenda ✅ implementado e testado |
| D29 | Dia/noite e tema | Segue o **horário real** do computador (botões Auto/Dia/Noite); o tema acompanha, com opção de travar claro/escuro ✅ |
| D30 | Dados de exemplo | **120 carros** (populares, sedãs, SUVs, picapes, esportivos, luxo, elétricos, híbridos, utilitários), **40 leads** em todas as etapas, equipe da D27 ✅ (`npm run dados` regenera) |
| D31 | Escopo da Fase 2 | Aprovado como proposto |

### 8.C 🔶 PERGUNTAS NOVAS (depois de ver a demo)

> Marque `[x]` ou escreva. ⭐ = minha recomendação.

**D32 — Revisão visual.** Abra a demo e diga o que mudaria:
- Tamanho das pessoas e dos carros: [ ] ⭐ está bom · [ ] pessoas maiores · [ ] carros maiores
- Ângulo padrão da câmera: [ ] ⭐ está bom · [ ] mais de cima · [ ] mais baixo
- Cores do cenário: [ ] ⭐ ok · [ ] quero mudar: ______
- Obs: ______

**D33 — Calçada cheia (agrupamento "+N")**: com 15+ leads na calçada a cena fica poluída.
- [ ] ⭐ Mostrar até 12 pessoas e agrupar o resto em um marcador "+N" clicável (abre a lista)
- [ ] Mostrar todos sempre

**D34 — Ordem da Fase 3 (CRM de verdade)**
- [ ] ⭐ 1º cadastro/edição de carros e leads salvando em **arquivo local** (funciona já, sem Google) → 2º trocar para Google Sheets
- [ ] Ir direto para o Google Sheets (exige criar a credencial no Google Cloud antes)

**D35 — Carros vendidos saem do estoque ativo.** Onde ver as vendas?
- [ ] ⭐ Lista "Vendidos" na Fase 3 (histórico com data, valor e vendedor)
- [ ] Mostrar o carro vendido parado num "pátio de entrega" por alguns dias

**D36 — Surgiu mais alguma ideia ao navegar?** (cada uma vira item do backlog) ______

---

## 9. 💡 Backlog de ideias (nada se perde)

**Suas ideias**
- [x] Showroom 3D com todos os carros do estoque
- [x] Clicar no carro → informações (preço, ano, km, nome, modelo, marca, etc.)
- [x] Oficina com carros e lava-jato (cada lugar = situação do carro)
- [x] Segundo andar com escritório
- [x] Vendedores andando pela loja; funcionários no escritório e outros ambientes
- [x] Clientes animados conforme funil: quente = dentro da loja
- [x] Follow-up atrasado = cliente passa na calçada
- [x] Falta só assinar = cliente no escritório
- [x] Fotos/vídeos/áudios só como link (Drive)
- [x] Uso como CRM + controle de estoque
- [x] Design ótimo + UX ótima
- [x] Roadmap em .md com checklist, atualizado a cada rodada

**Sugestões 🆕 (aprovadas) → fase prevista**
- [x] Placas flutuantes com preço sobre cada carro ✅
- [x] Indicador de "dias em estoque" ✅
- [x] Carro vendido sai da loja com o cliente ✅
- [x] Comemoração ao fechar venda ✅
- [x] Filtro que destaca na cena ✅
- [x] Modo TV ✅
- [x] Painel "Hoje" (follow-ups do dia, visitas, aniversariantes) → **Fase 3**
- [x] Comparar 2–3 carros lado a lado → **Fase 3**
- [x] Linha do tempo do carro e do lead → **Fase 3**
- [x] Histórico de oficina com custos → **Fase 3**
- [x] Checklist de documentação por carro (IPVA, vistoria, multas, DUT) → **Fase 3**
- [x] Relatórios: funil de conversão, tempo médio de venda, lucro por carro → **Fase 4**
- [x] Exportar ficha do carro em PDF / link compartilhável → **Fase 4**
- [x] Sons ambiente opcionais (desligado por padrão) → **Fase 4**
- [x] Vendedor "dono" do cliente: clicar no vendedor → lista de leads dele + botão **Destacar clientes na cena** ✅

**Ideias novas surgidas nesta rodada 🆕 (aprovar ou descartar)**
- [x] 🆕 Marcar carros como "destaque" arrastando para dentro do showroom ✅ (falta o botão na ficha → Fase 3)
- [ ] 🆕 Placa no pátio/vagas numeradas (ex.: "A-12") para achar o carro físico rápido
- [ ] 🆕 Botão "Recarregar da planilha" + aviso visual quando a planilha mudou *(Fase 3)*
- [x] 🆕 Contador de carros por zona na lateral ✅

---

## 10. 🗺️ ROADMAP

### Fase 0 — Planejamento ✅ concluída
- [x] Primeira versão do planejamento
- [x] Respostas D01–D24
- [x] Funil fechado (D12)
- [x] Identidade visual (D11)
- [x] Pendências D19b, D25–D31
- [x] Congelar escopo da Fase 2 (D31)
- **Entrega:** roadmap v3 ✅

### Fase 1 — Fundação técnica ✅ concluída
- [x] Criar projeto (Node + Vite + Three.js)
- [x] Estrutura de pastas e padrões (`cena/`, `regras/`, `dados/`, `ui/`)
- [x] `dados-exemplo.json` (120 carros, 40 leads, equipe)
- [x] Interface `DataSource` com `JsonSource`
- [x] Módulo de regras (status → zona, funil → posição, follow-up → calçada)
- [x] Cena base: câmera dupla, luz, chão
- [~] Prova de desempenho: medido **824 chamadas de desenho / 72 mil triângulos** (eram 1.970 antes da otimização). O **fps real precisa ser conferido no seu computador** (testei só com renderização por software)
- **Entrega:** projeto rodando com cena básica

### Fase 2 — Animação 3D 🟢 quase concluída (falta sua revisão visual e o item "+N")
**2.1 Cenário**
- [x] Prédio com 2 andares em corte (diorama)
- [x] Showroom, **pátio externo**, oficina, lava-jato, escritório, recepção
- [x] Calçada, rua, fachada com letreiro
- [x] Escada/elevador
- [x] Iluminação, sombras e ciclo dia/noite

**2.2 Carros**
- [x] 4–6 carrocerias low-poly com instancing
- [x] Pintura pela cor do cadastro
- [x] Posicionamento automático por status/zona (showroom x pátio)
- [x] Etiquetas de preço, placa "Reservado", indicador de dias em estoque
- [x] Carros passando na rua

**2.3 Pessoas e animações**
- [x] Personagens + animações (andar, parado, sentado, assinar)
- [x] Waypoints e movimentação
- [x] Máquinas de estados: funcionários
- [x] Máquinas de estados: clientes (calçada → loja → escritório → saída)
- [x] Alertas visuais de follow-up (anel verde/amarelo/vermelho + ícones)
- [ ] Agrupamento "+N" na calçada (aguarda D33)

**2.4 Interação (dados de exemplo, em memória)**
- [x] Clique: carro, cliente, funcionário, zona → painel lateral
- [x] Hover/destaque e foco de câmera
- [x] HUD com contadores
- [x] Busca/filtros destacando na cena
- [x] Arrastar carro entre zonas / mudar etapa do cliente
- [x] Botão "avançar dias" (simulação de follow-up)
- [x] Comemoração de venda e saída do carro
- [x] Modo TV
- [x] Alertas dentro do app

**2.5 Polimento**
- [x] Design (tipografia, vidro/blur, transições, tema claro/escuro) — ajustes finos conforme D32
- [~] Desempenho (ver Fase 1) · mobile com layout básico (polimento na Fase 4)
- **Entrega:** demo 3D completa e bonita, reagindo ao JSON ✅ (`dist/index.html`)

### Fase 3 — Funcionalidade (CRM + Estoque de verdade)
- [ ] Backend Node + `SheetsSource` (Google Sheets) com cache e gravação em lote
- [ ] Modelo da planilha + guia de credencial Google
- [ ] CRUD de carros (cadastro/edição/status/links do Drive)
- [ ] CRUD de leads + funil + sub-etapas + histórico de interações
- [ ] Importar planilha/CSV (D22)
- [ ] Cena lendo dados reais (atualiza ao salvar / recarregar)
- [ ] Configurações (limites de follow-up, etapas, identidade visual)
- [ ] Comissão e metas
- [ ] Painel "Hoje", linha do tempo, histórico de oficina, checklist de docs, comparar carros
- [ ] Modo lista (alternativa ao 3D)
- **Entrega:** sistema utilizável no dia a dia

### Fase 4 — Evolução
- [ ] Relatórios
- [ ] PDF / link da ficha
- [ ] Integrações: FIPE, portais, Drive
- [ ] Notificações externas (se quiser)
- [ ] Sons ambiente
- [ ] Mobile (polimento: gestos, painel em tela cheia, desempenho)

### Fase 5 — Uso diário no seu computador
- [ ] Atalho/script para abrir o app com um clique
- [ ] Rotina de backup da planilha
- [ ] Cuidados com dados de clientes (LGPD)
- [ ] (Se um dia quiser acessar de fora) avaliar hospedagem e login

---

## 11. ⚠️ Riscos e como evitar

| Risco | Mitigação |
|---|---|
| Escopo crescer antes de ver algo funcionando | Escopo da Fase 2 congelado (D31); ideias novas → backlog |
| 100+ carros pesam no 3D | Instancing, LOD, pátio, meta de 60 fps testada na Fase 1 |
| Poluição visual com muitos carros/pessoas | Destaque no showroom, agrupamento "+N", filtros que destacam |
| Google Sheets lento/limitado | Cache + gravação em lote + camada `DataSource` (dá para trocar depois) |
| Editar planilha à mão com o app aberto gera conflito | Botão/rotina de recarregar; IDs próprios por linha |
| Configurar credencial do Google é chato | Guia passo a passo na Fase 3 |
| 3D bonito mas CRM ruim de usar | Modo lista, atalhos, painéis rápidos |
| Modelos 3D difíceis de conseguir | Gerar por código + bibliotecas gratuitas, checar licença |
| Dados de clientes (LGPD) | Poucos dados, backup, conta Google protegida (verificação em 2 etapas) |
| Link do Drive quebrar/privado | Validar link no cadastro; compartilhamento "qualquer pessoa com o link" |

---

## 12. Histórico de versões

| Versão | Data | O que mudou |
|---|---|---|
| v1 | 26/10/2026 | Documento inicial |
| v2 | 26/10/2026 | Decisões D01–D24 registradas; pátio externo e escala 100+; Google Sheets (6.6); uso local; escopo da Fase 2 por fase; pendências D11, D19b, D25–D31; backlog com fases |
| v3 | 27/10/2026 | Pendências D11–D31 respondidas; **Fases 1 e 2 implementadas** (cenário, 120 carros, 49 pessoas animadas, regras do funil, painéis, busca/filtros, arrastar carros, simulação, modo TV, dia/noite, tema); 21 testes automáticos; build em arquivo único; novas perguntas D32–D36 |
