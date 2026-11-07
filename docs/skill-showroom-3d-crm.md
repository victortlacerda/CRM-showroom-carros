---
name: showroom-3d-crm
description: Construir um CRM + controle de estoque em que a própria loja (concessionária de carros ou negócio parecido) é uma cena 3D animada em Three.js, com funil de vendas virando posição de clientes, status do carro virando zona, roadmap em .md com checklist e entrega em arquivo único que abre por duplo clique. Use ao iniciar, retomar ou adaptar um projeto "loja em 3D", "showroom 3D", "CRM visual" ou "estoque 3D".
---

# Showroom 3D CRM — guia completo (aprendido no projeto original)

Este guia reúne decisões, arquitetura, regras, armadilhas e o jeito de conduzir o trabalho num projeto de **loja de carros em 3D que funciona como CRM e controle de estoque**. Serve para começar um projeto novo do mesmo tema, retomar um existente ou adaptar para outro negócio (motos, imobiliária, oficina, loja de bairro).

> **Ideia central:** *o 3D é uma visualização dos dados, não o banco de dados.* Cada carro, cliente e funcionário na cena reflete um registro. Mudou o dado → a cena reage. Nunca guarde estado "de verdade" só dentro de objetos 3D.

---

## 1. Como conduzir o trabalho com o usuário

### 1.1 Perfil esperado
- Normalmente é o **dono do negócio**, **não técnico**, fala **português do Brasil**. Escreva tudo (respostas, roadmap, README, textos da interface) em pt-BR simples, sem jargão. Se usar um termo técnico, explique em meia frase.
- Uso típico: **só o dono**, **no próprio computador**, 100+ carros em estoque, **sem login** e sem hospedagem online por ora.
- Ele quer **ver funcionando** cedo. Mostre a demo antes de discutir detalhes de backend.

### 1.2 Ordem de trabalho combinada (respeitar)
1. **Planejamento** → `roadmap.md` com decisões e checklist.
2. **Animação 3D** funcional com **dados de exemplo gerados**.
3. **Funcionalidade real** (CRUD, persistência, Google Sheets, relatórios).

Não comece a fase 3 sem o usuário responder as perguntas pendentes da fase 2.

### 1.3 O roadmap é o contrato (arquivo `.md` vivo)
- Mantenha `docs/roadmap.md` e **atualize a cada rodada**, com número de versão, data e uma linha no histórico.
- **Regra de ouro: nenhuma ideia se perde.** Ideia nova vai para o "Backlog de ideias" e depois é encaixada numa fase.
- Decisões numeradas **D01, D02…** em tabela (decisão · resposta · impacto). Nunca reutilize número.
- Perguntas pendentes ficam numa seção própria com **checkboxes**; a **minha recomendação vem marcada com ⭐** e vem primeiro. O usuário pode responder só **"ok com as estrelas"**. Isso funcionou muito bem: ele devolveu o arquivo marcado e eu atualizei.
- Convenção de checkbox: nas seções de decisão `[x]` = aprovado; no roadmap `[x]` = feito; `[~]` = parcial.
- **Honestidade no status:** registre o que não foi verificado (ex.: fps real, mobile) em vez de marcar como pronto.
- Guarde **uma cópia do roadmap dentro do projeto** (`docs/roadmap.md`) e outra na pasta de entrega. Já aconteceu de o arquivo sumir quando o ambiente foi trocado; o anexo devolvido pelo usuário salvou a versão.

Estrutura do roadmap que funcionou:
1. Visão e premissas · 2. Mapa da loja (zonas) · 3. Regras de negócio ↔ animação (tabelas status→zona e funil→posição) · 4. Personagens e animações · 5. UX/Design · 6. Arquitetura técnica · 7. Modelo de dados · 8. Decisões (8.A fechadas, 8.B respondidas, 8.C perguntas novas) · 9. Backlog de ideias · 10. Roadmap por fases com checklist · 11. Riscos e mitigações · 12. Histórico de versões.

### 1.4 Quando perguntar e quando decidir
- Se o pedido está claro, **comece a construir**; pergunte junto com os primeiros resultados.
- Falta de identidade visual (nome, logo, cores) **não bloqueia**: faça genérico ("Sua Loja de Veículos", sem logo, azul `#2f6fed` como destaque) e deixe nome/logo/cores em `config` para trocar depois.
- Falta de dados reais **não bloqueia**: gere dados de exemplo brasileiros realistas (ver seção 7).
- Pergunte antes apenas o que é caro de refazer (formato de saída, banco de dados, escopo da fase seguinte).

### 1.5 Mensagem final de cada rodada (modelo)
Curta, em prosa, em pt-BR:
- O que foi entregue e **como abrir** (duplo clique no `.html`).
- **O que testar** (clicar carro/cliente/vendedor/zona, arrastar carro entre zonas, +1/+3 dias, busca/filtros, modo TV).
- **O que não foi verificado** (fps no computador dele, celular) e o que ficou de fora.
- As perguntas pendentes do roadmap (D-números), com a recomendação ⭐.
Entregue: demo `.html` único, `roadmap.md`, e `.zip` do projeto (sem `node_modules` nem `dist`).

---

## 2. Princípios de produto
- **3D bonito *e* prático.** Quem só quer resolver rápido não pode ser atrapalhado: busca/filtros sempre à mão, painel lateral para fichas, modo lista como plano B (fase 3).
- **Clicar em qualquer coisa abre painel lateral** sem sair da cena: carro → ficha; cliente → ficha do lead + ações; funcionário → tarefas e leads dele (+ botão "Destacar clientes na cena"); zona → lista de carros da zona.
- **Arrastar carro entre zonas muda o status** (alternativa à edição na ficha).
- **Alertas dentro do app** (follow-up vencendo, carro parado há X dias), HUD com contadores, "Modo TV" para um monitor na loja, simulação "+1 dia / +3 dias".
- **Não armazenar fotos, vídeos nem áudios.** Só **links** (Google Drive etc.). Validar o link e só aceitar `http(s)` (`linkSeguro`).
- **Acessibilidade:** não depender só de cor (ícones + texto junto do anel de urgência), contraste bom nos dois temas.
- **Poluição visual:** limitar pessoas visíveis e agrupar o excesso num marcador "+N" clicável (ex.: mostrar até 12 na calçada e agrupar o resto; ficou pendente de decisão no projeto original).

---

## 3. Stack e comandos

| Camada | Escolha | Observação |
|---|---|---|
| 3D | **Three.js** (usado: 0.186.1) | Importar de `three` e de `three/examples/jsm/...` (ex.: `BufferGeometryUtils`, `OrbitControls`) |
| Build/dev | **Vite** (usado: 8.3.5) + **`vite-plugin-singlefile`** | O build vira **um único `index.html`** que funciona por **duplo clique (`file://`)**, sem servidor. Sem o plugin, módulos ES não carregam por `file://` |
| Linguagem | JavaScript (módulos ES) | `"type":"module"` |
| Interface | HTML + CSS + JS puro | Sem framework |
| Testes | `node --test` | Regras e layout são módulos puros |
| Backend (fase 3) | Node + Express | Necessário para falar com Google Sheets sem expor credenciais |
| Node | 22 | |

`package.json` (scripts): `dev`, `build`, `preview`, `test`, `dados`.
- **Use glob no teste:** `"test": "node --test tests/*.test.js"`. Com `node --test tests/` dá `MODULE_NOT_FOUND`.
- `vite.config.js`: `plugins: [viteSingleFile()]`, `build.chunkSizeWarningLimit: 1500`.
- Após o build, copie `dist/index.html` como `showroom3d.html` na pasta de entrega (≈ 800 KB).
- Instalar o plugin pode **podar pacotes instalados com `--no-save`** (ex.: ferramentas de teste). Reinstale depois.

---

## 4. Arquitetura (camadas e pastas)

```
Fonte de dados → Estado da loja (Loja + regras puras) → Cena 3D e UI
   (JSON/Sheets)    eventos: 'carros' 'leads' 'dia' '*'      ↑
        ↑                                                     │
        └────────── clique / arrastar / ações ────────────────┘
```

```
src/
  dados/    DataSource.js (JsonSource), dados-exemplo.json
  regras/   regras.js (funções PURAS), loja.js (estado + eventos)
  cena/     layout.js (PURO), util.js, cenario.js, modelosCarro.js, carros.js,
            pessoa.js, agentes.js, efeitos.js, transito.js, camaras.js, clima.js
  ui/       util.js (esc, brl, linkSeguro), filtros.js, paineis.js, ui.js,
            interacao.js, estilo.css
  main.js   monta renderer, cena, Loja, módulos e o loop
scripts/gerar-dados.mjs   gerador determinístico (semente fixa)
tests/    regras.test.js, layout.test.js
docs/roadmap.md
```

Regras de ouro da arquitetura:
1. **`DataSource` com interface única** (`carregar()` devolve cópia profunda; `salvar()`). Fase 2 usa `JsonSource` (salvar é no-op); fase 3 troca por arquivo local e depois `SheetsSource`. A cena nunca muda ao trocar a fonte.
2. **Toda lógica "dado → zona/posição/alerta" fica em `regras.js`**, pura, sem Three.js nem DOM. Assim é testável em Node e fácil de mudar.
3. **`Loja` guarda o estado e emite eventos**; cena e UI **reagem** (`carros`, `leads`, `dia`, `*`). Mudanças vêm só por métodos da `Loja` (`moverCarroParaZona`, `mudarEtapa`, `registrarContato`, `ajustarTemperatura`, `avancarDias`).
4. **`layout.js` é puro** (medidas, zonas, vagas, grafo de caminhos, pontos de interesse) e é testado em Node.
5. **Escape de HTML em tudo que vem de dado** (`esc()`) antes de ir ao `innerHTML`. Dados de cliente são entrada não confiável (também numa planilha editada à mão).
6. Exponha `window.__app = { scene, camera, renderer, camaras, clima, loja, carros, agentes, ui }` para depurar e para os testes ponta a ponta.

---

## 5. Regras de negócio (o coração do app)

### 5.1 Status do carro → zona 3D
| Status | Zona |
|---|---|
| disponível/reservado + **destaque** | **Showroom** (capacidade 24; os de maior `destaqueOrdem`, depois maior preço) |
| disponível/reservado sem destaque (ou showroom lotado) | **Pátio externo** (84 vagas) |
| preparação | **Lava-jato** (lavador trabalhando) |
| manutenção | **Oficina** (mecânico martelando) |
| avaliação (troca/trade-in) | **Entrada de avaliação** |
| vendido | sai da loja com o cliente; vai para histórico |

Reservado ganha placa/fita "RESERVADO". **Arrastar** um carro para uma zona grava atributos via `atributosParaZona(zona)` (soltar no showroom = `destaque: true` + `destaqueOrdem: Date.now()`). A **zona vem do ponto exato em que o botão foi solto**, não do último `pointermove`.

### 5.2 Funil → onde o cliente aparece
Funil: `lead_novo → contato_feito → visita_agendada → atendimento → test_drive → negociacao → documentacao → assinatura → vendido | perdido`.

| Etapa | Cliente na cena |
|---|---|
| Lead novo | Calçada, passando e olhando a vitrine |
| Contato feito | Na porta, esperando |
| Visita agendada | Calçada com ícone de agenda; **no dia marcado entra** (porta) |
| Atendimento | Dentro do showroom, explorando |
| Test-drive | Sai dirigindo o carro e volta (circuito fechado) |
| Negociação | Sentado à mesa de negociação com o vendedor |
| Documentação / Assinatura | **Escritório do 2º andar**; assinatura com **aura dourada** e caneta |
| Vendido | Confete + retira o carro (carro some do estoque ativo) |
| Perdido | Some / vai embora (fica no histórico) |

### 5.3 Follow-up (configurável por etapa)
- `diasSemContato = hoje − ultimoContato`; **atrasado** se `> limite`, **atenção** se `== limite`, senão **ok**.
- Limites usados (dias): lead novo 2 · contato feito 3 · visita agendada 1 · atendimento 3 · test-drive 2 · negociação 2 · documentação 3 · assinatura 2.
- **Atrasado até a negociação → volta para a calçada, passando sem entrar**, com ícone de alerta e andando mais rápido.
- **Documentação e assinatura atrasadas ficam no escritório com alerta** (não voltam à calçada).
- Visita agendada: o relógio só começa a contar **depois** da data marcada.
- Cores de urgência: verde (em dia), amarelo (atenção), vermelho (atrasado), **sempre junto de ícone/texto**.

### 5.4 Temperatura
Automática pela etapa (frio/morno/quente), **rebaixada um nível se atrasado**; **ajuste manual prevalece** e é marcado como "ajustado".

### 5.5 Outras regras
- Carro "parado" > 90 dias = atenção; > 120 = alerta. Ponto colorido de dias em estoque na etiqueta de preço.
- Datas em ISO `YYYY-MM-DD`; calcule diferenças ao meio-dia UTC para evitar erro de fuso/horário de verão.
- Sub-etapas de documentação (fase 3): crédito aprovado → docs ok → contrato pronto → assinatura.
- Interesses: 1 carro principal + secundários por lead.

---

## 6. Cena 3D

### 6.1 Convenções (decidir logo e nunca misturar)
- Eixos: **x = direita, z = em direção à rua (frente da loja), y = altura**; unidade ≈ metro.
- **Carro olha para +x** com `rot = 0`. **Pessoa olha para +z** local; `rotation.y = atan2(dx, dz)` aponta para onde anda.
- Piso interior 0,2 · calçada 0,12 · escritório 0,04 acima da laje (`pisoExtra(x,z,y)` para o pé das pessoas).

### 6.2 Cenário (referência do original)
Prédio de 2 andares **em corte** (diorama) com: recepção, showroom, oficina e lava-jato no térreo; **escritório no 2º andar sobre a recepção**, com **escada externa** até a sacada; calçada, rua com 2 faixas e tráfego, **pátio externo** (cerca e placa), lote de avaliação, árvores e postes. Mundo ≈ 190 × 100 m.

Zonas (retângulos x0..x1, z0..z1, y): recepção, showroom (40×20, 24 vagas em 3 fileiras × 8), oficina (4×4 = 16 + transbordo na frente), lava-jato (2×4 = 8 + fila), pátio (6 colunas × 14 fileiras = 84, **começando pela frente** para ficar visível), avaliação (2×4 = 8, carros girados 90°).

### 6.3 Vagas e zonas
`vagasDaZona(zona, minimo)` devolve `{x,z,rot}`; se faltar vaga, **estende** (pátio para trás, demais para o lado). `zonaNoPonto(x,z)` decide a zona pelo ponto (prioridade: showroom, oficina, lavajato, avaliacao, patio).

### 6.4 Caminhos das pessoas
- **Grafo de waypoints** (`nos: id → [x,z,y]`, `arestas`) + **Dijkstra** (`caminhoEntreNos`), peso 3D (a altura pesa 3× para a escada não ser "atalho").
- `rota(de, para)` vai ao nó mais próximo, segue o grafo e termina em **linha reta**; depois `suavizar()` remove "vai e volta" colinear.
- Cubra **todas** as zonas com nós: calçada, porta, corredores do showroom, recepção, escada (base/meio/topo), escritório, oficina e lava-jato. Teste que existe rota entre os pontos principais.

### 6.5 Carros low-poly
- **6 carrocerias** (hatch, sedã, SUV, picape, esportivo, van) feitas por código: caixas + polígonos extrudados + rodas (cilindros de 10 lados), cada tipo **mesclado em 2 geometrias**: **tinta** (cor do carro, material compartilhado por cor) e **detalhe** (cores por vértice: vidros/rodas escuros, faróis amarelos, lanternas vermelhas).
- Cada tipo é gerado uma vez (cache) e **reutilizado**; `dim {c,l,h}` serve para sombra, etiqueta e seleção.
- Etiqueta 3D de preço com ponto de dias em estoque, anel de seleção/hover, esmaecer o que não bate com o filtro.
- Carros passando na rua (≈ 8 em 2 faixas) e um carro temporário para o test-drive.

### 6.6 Pessoas low-poly articuladas
- Tronco+cabeça numa malha, braços com pivô no ombro, pernas com quadril e joelho. **Cor por vértice** e um único material para todos.
- Poses com mistura suave: `parado, andar, sentado, conversar, assinar, martelar, lavar, digitar, comemorar, esperar`.
- Variedade por **hash estável do id** (`estiloCliente(hash(lead.id))`) → o mesmo lead sempre parece a mesma pessoa. Funcionários têm uniforme por cargo (colete, boné).

### 6.7 Máquinas de estado
**Cliente** (`modo`): `calcada, porta, explorar, mesa, escritorio, testdrive, celebrar, saindo, oculto`. Método central `sincronizar(inicial)`: pega a posição pelo CRM (`loja.posicaoCliente`), atualiza ícone/anel, e **só muda de comportamento se a zona mudou**. `inicial = true` posiciona direto, sem caminhar (na abertura do app).
**Funcionário**: vendedor (rotina: mesa → atender → circular), gerente, financeiro, mecânico/lavador (trabalham nos carros da própria zona).
- **Reserva de assentos** (mesas de negociação, cadeiras do escritório) para ninguém sentar no mesmo lugar; se não houver mesa livre, cai para "explorar".
- Ao mudar de etapa, o cliente **caminha** até o novo lugar (entra pela ponta da calçada se estava oculto). Venda: confete + carro sai.

### 6.8 Câmeras
- **Duas câmeras com botão**: **diorama** (isométrica com corte, vê os 2 andares) e **orbital livre** (OrbitControls).
- **Presets** com transição suavizada: geral, loja, showroom, escritório, oficina, lava-jato, pátio, avaliação, calçada. Duplo clique no chão foca no ponto.
- Ao arrastar um carro, **desabilite o OrbitControls** e reabilite no `pointerup`.

### 6.9 Dia/noite e tema
- Segue o **relógio real** do computador (botões Auto/Dia/Noite); keyframes de cor do céu/luz/névoa; à noite acendem ~6 luzes pontuais, postes e letreiro.
- O tema claro/escuro da interface acompanha, com opção de travar.
- **Letreiro/emissivo:** sempre defina `emissiveMap` junto com `emissive`; sem mapa a placa fica **toda branca** à noite.

---

## 7. Dados de exemplo (gerador determinístico)

`scripts/gerar-dados.mjs` com **RNG de semente fixa** (mesma semente = mesmos dados) gera `src/dados/dados-exemplo.json`. Regenerar: `npm run dados`.
- **120 carros brasileiros genéricos** em 9 categorias: populares (Fiat Mobi/Argo, VW Gol/Polo, Chevrolet Onix, Hyundai HB20, Renault Kwid…), sedãs, SUVs, picapes (Hilux, S10, Ranger, Toro, Strada, Amarok), esportivos, luxo, elétricos, híbridos e utilitários. Catálogo com marca, modelo, categoria, carroceria 3D, combustível, preço 0 km e versões. Preço varia por ano/km; **dias em estoque com distribuição enviesada** (`2 + rnd^1.7 × 150`) para existirem poucos carros parados.
- **Exatamente 24 destaques** (`.slice(0, 24)`) para casar com a capacidade do showroom.
- **40 leads** distribuídos por **todas** as etapas, com atrasados e não atrasados, visita agendada com data, vendas e perdidos.
- **Equipe (9):** 3 vendedores, 1 recepcionista, 1 gerente, 1 financeiro, 2 mecânicos, 1 lavador.
- `config`: `nomeLoja`, `capacidadeShowroom`, `etapas` com `limiteDias`, e a data de referência `hoje`.
- Atenção a **inconsistências de categoria × combustível** (ex.: um carro de categoria "Elétrico" com combustível "Híbrido"): teste os filtros contra os dados reais, não contra suposições.

---

## 8. Interação (raycast, clique, arrasto)

- Pontos do mouse: **`pointerdown` (capture) no canvas; `pointermove` e `pointerup` na `window`**.
- **Clique** = pouco movimento (≤ 6 px) e rápido (≤ 600 ms). **Arrasto** começa após 7 px. Meça tempo com **`e.timeStamp`**, não `performance.now()` (em máquina lenta o atraso quebra o clique).
- Antes de projetar/raycast, chame **`camera.updateMatrixWorld()`**; senão `matrixWorldInverse` fica desatualizado após mover a câmera e o raio erra o alvo.
- Alvo do raycast: carros + pessoas (`picaveis()`); suba pela hierarquia até achar `userData.carroId` ou `userData.agente`. Marque **todos os descendentes** das pessoas com `userData.agente`.
- Ponto no chão: raycast contra um plano `y = 0.2`.
- Throttle do hover (~35 ms). Realce de zona com um quadrado translúcido (cor por zona) em hover e durante o arrasto.
- Hover sobre elementos de UI não deve acionar o 3D (`e.target !== canvas`).

---

## 9. UI / UX
- Tokens de CSS para **claro e escuro**; painéis de **vidro com blur**; destaque azul `#2f6fed`; fontes do sistema.
- Barra superior: nome da loja, busca (carros por marca/modelo/placa/cor/combustível/câmbio, clientes por nome/telefone/e-mail, equipe), filtros (categoria, status, preço máximo, ano mínimo, km máximo), alternar câmera, tema, Auto/Dia/Noite, Modo TV, sino de alertas e +1/+3 dias.
- **HUD** com KPIs (carros em estoque, leads quentes, follow-ups atrasados, vendas), contador de carros por zona, legenda das cores e sino de alertas (com selo de quantos estão atrasados). Alerta de carros parados destaca na cena os carros com mais de 90 dias.
- **Filtros esmaecem** na cena o que não combina (não removem), e a busca foca o resultado.
- Painel lateral para ficha de carro (preço, ano, km, cor, câmbio, combustível, placa, dias em estoque, links do Drive com `linkSeguro`), cliente, funcionário e zona.
- **Mobile básico** (≤ 760 px): esconder hora/tema, HUD horizontal, painel como "bottom sheet". Polimento fica para fase posterior.
- Toasts para confirmar ações (ex.: "carro movido para a oficina").

---

## 10. Desempenho (100+ carros)
- **Funda malhas estáticas** do cenário por material (`fundirEstatico(raiz)`): ignora `InstancedMesh`, materiais em array e `userData.manter`; exige atributos `position/normal/uv`. Resultado medido: **1.970 → 824 chamadas de desenho, ≈ 72 mil triângulos**.
- Materiais **cacheados** (`mat(cor, opts)`), `flatShading` para o visual low-poly, geometria compartilhada por tipo de carro.
- Sombra direcional com mapa de 4096 (PCFSoft) cobrindo o mundo todo; só o essencial projeta sombra.
- `pixelRatio` limitado a 2; `dt` limitado a 0,1 s no loop.
- Se precisar de mais folga: `InstancedMesh` para os carros, LOD, etiquetas só perto/selecionado, limitar pessoas visíveis ("+N").
- **Meta:** 60 fps com 120 carros + ~50 pessoas em notebook comum. **fps real só se mede na máquina do usuário**; no ambiente de teste (render por software) os números não valem. Diga isso com todas as letras no roadmap.

---

## 11. Testes e verificação

### 11.1 Unitários (`node --test`)
Cobrir, no mínimo: `diffDias/addDiasISO`, `zonasDosCarros` (capacidade, ordem), `atributosParaZona`, `urgenciaLead` (limites, visita agendada), `posicaoDoCliente` (cada etapa, atrasado, doc/assinatura), `temperaturaLead` (manual prevalece), `resumo`, `alertas`, filtros/busca, `esc()`, `linkSeguro`, vagas suficientes por zona, rotas existentes entre pontos-chave, `zonaNoPonto`. O projeto original chegou a **21 testes**.

### 11.2 Verificação visual e ponta a ponta (navegador sem tela)
1. Use o **Chromium/Playwright já instalado** no ambiente (não rode `playwright install`). Se não houver, `@sparticuz/chromium` + `puppeteer-core` funcionou (importar de `.../build/index.js` e `.../lib/puppeteer/puppeteer-core.js`).
2. Argumentos para WebGL por software: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist` (+ `--allow-file-access-from-files` para testar `file://`), `headless: 'shell'`.
3. Suba o dev server (`createServer` do Vite) numa porta livre, abra a página, **capture `console` error/warning e `pageerror`**, espere ~1,5–3,5 s e tire screenshots.
4. Para testar clique/arrasto, **projete** o ponto 3D para pixels (`vector.project(camera)` após `camera.updateMatrixWorld()`) e use `page.mouse.move/down/up` com `steps`.
5. Roteiro e2e que pegou erros reais: clicar carro → painel abre · arrastar para a oficina → `loja.zonaDoCarro` muda · busca/filtro esmaece · +3 dias → alguém vai para a calçada · fechar venda → confete e carro sai · modo TV · tema escuro · **abrir o build único por `file://`** em desktop (1440×860) e celular (390×844).
6. **Olhe os screenshots** de visão geral, showroom, escritório, noite e mobile. Foi assim que apareceram: placa do showroom escondendo carros, faixas de luz flutuando, letreiro branco à noite, barra superior apertada no celular.
7. Rode `npm test` e o build antes de entregar; confira `file://` sem erros no console.

---

## 12. Armadilhas já encontradas (e a correção)
| Problema | Causa | Correção |
|---|---|---|
| `npm test` → MODULE_NOT_FOUND | `node --test tests/` | usar glob `tests/*.test.js` |
| Teste esperava 24 carros no showroom e havia 22 | gerador marcava menos destaques | gerar exatamente 24 destaques e regenerar |
| Filtro "Elétrico" não achava o carro | categoria ≠ combustível no dado | testar com o dado real; aceitar ambos |
| Clique/arrasto instável no teste | `matrixWorldInverse` velho; tempo medido com `performance.now()` | `updateMatrixWorld()` no `_ndc` e no helper; usar `e.timeStamp`; zona pelo ponto de soltura |
| Letreiro todo branco à noite | `emissive` sem `emissiveMap` | sempre `emissiveMap`, intensidade controlada pelo clima |
| Placa grande escondia carros da frente | tamanho/posição | reduzir e subir para a linha do telhado |
| Faixas de luz "voando" | faixas decorativas soltas | remover |
| Barra superior apertada no celular | sem regras mobile | bloco `@media (max-width:760px)` |
| Playwright não baixou navegador | rede restrita | usar Chromium já instalado ou `@sparticuz/chromium` |
| Plugin singlefile "sumiu" pacotes de teste | `npm install` poda `--no-save` | reinstalar ou adicionar como devDependency |
| Roadmap sumiu ao trocar de ambiente | só havia cópia fora do projeto | cópia em `docs/` + cópia em `outputs/`; usar anexo do usuário |
| Resposta cortada por limite de saída | arquivos grandes de uma vez | construir em etapas (esqueleto → seções), retomar sem recapitular |

---

## 13. Fase 3 — funcionalidade real (planejada, aguardar aprovação)
Ordem recomendada (⭐): **1º CRUD salvando em arquivo local** (funciona já, sem credencial) → **2º trocar para Google Sheets** via `SheetsSource`.
- Backend Node/Express com **conta de serviço** do Google (credencial só no PC dele); **ler tudo ao abrir e manter cache em memória**; **gravar em lote**; atualização otimista na tela.
- Planilha com abas `Carros · Leads · Interações · Funcionários · Vendas · Config`; **ID próprio por linha** (nunca o número da linha); versão do esquema na `Config`; validar colunas ao ler.
- Botão **"Recarregar"** + recarga automática a cada X min, e aviso se a planilha mudou (o usuário pode editar à mão com o app aberto). Avisar se a internet cair.
- Itens: CRUD de carros e leads, importar planilha/CSV, configurações (limites, etapas, identidade visual), comissão e metas, painel "Hoje", linha do tempo, histórico de oficina com custos, checklist de documentos (IPVA, vistoria, multas, DUT), comparar 2–3 carros, **modo lista**, lista "Vendidos".
- Fase 4: relatórios (funil, tempo médio de venda, lucro por carro), PDF/link da ficha, FIPE, portais, Drive, sons ambiente (desligados por padrão), mobile.
- Fase 5: atalho para abrir com um clique, backup da planilha, cuidados com **LGPD** (poucos dados, conta Google com verificação em duas etapas).
- Fotos/vídeos/áudios continuam **só como link**; validar que o link do Drive está como "qualquer pessoa com o link".

---

## 14. Adaptando a outro negócio
O padrão é **"registro → zona/posição na cena"**:
1. Liste as **entidades** (o que é estoque, quem é cliente, quem é funcionário).
2. Liste as **zonas** do lugar e o **status** que cada uma representa.
3. Desenhe o **funil** e diga para cada etapa **onde a pessoa fica** e **o que acontece com atraso**.
4. Troque as carrocerias por outros modelos low-poly (motos, casas, equipamentos) mantendo `modeloDoTipo(tipo)` → `{tinta, detalhe, dim}`.
5. Reaproveite sem mudança: `DataSource`, `Loja`+eventos, grafo/Dijkstra, `Pessoa`, câmeras, clima, UI de painéis/filtros, gerador de dados, testes.

---

## 15. Checklist para um projeto novo
- [ ] Criar `docs/roadmap.md` v1 (visão, mapa de zonas, tabelas status→zona e funil→posição, decisões D01…, perguntas com ⭐).
- [ ] Projeto Vite + Three + singlefile; scripts `dev/build/test/dados`; estrutura de pastas da seção 4.
- [ ] Gerador de dados determinístico (120 itens, 40 leads, 9 funcionários, 24 destaques).
- [ ] `regras.js` + `layout.js` puros e testados **antes** da cena.
- [ ] Cena base → cenário → carros → pessoas/agentes → câmeras/clima → interação → UI.
- [ ] Fundir malhas estáticas e medir chamadas de desenho.
- [ ] Testes unitários + e2e headless + screenshots + `file://` desktop/mobile.
- [ ] README (como abrir, scripts, estrutura) e roadmap atualizado com **o que não foi verificado**.
- [ ] Entregar `.html` único, `roadmap.md` e `.zip` do projeto; mensagem final curta com as perguntas pendentes.
