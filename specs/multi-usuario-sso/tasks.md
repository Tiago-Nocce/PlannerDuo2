# Implementation Plan: Multi-usuário SSO

## Overview

Este plano converte o PlannerDuo de documento fixo (`casais/tiago-yasmin`, nomes `Tiago`/`Yasmin` hard-coded) para um sistema multi-usuário genérico, seguindo o `design.md`. A abordagem é incremental e testável: primeiro extraímos a **lógica pura** (funções com store injetável) que sustenta as 12 propriedades de correção, depois integramos essa lógica ao `app.js` (Estado, Auth, DB, Convites), em seguida a UI (`app.html`) e a autorização server-side (`firestore.rules`), e por fim a migração do documento legado e a limpeza de textos fixos.

O código sob teste é escrito em **JavaScript** (mesmo runtime do `app.js`, Firebase SDK v8). As funções puras (`chaveCache`, `gerarCodigo`, `nomePadrao`, `resolverCasalId`, `aceitarConvite`) recebem um `store` injetável (objeto em memória que simula o Firestore), permitindo testes de propriedade com `fast-check` sem Firebase real. A autorização (Requisito 5) e o tempo real (7.2) são validados por testes de regras no Firebase Emulator, não por propriedades.

Cada tarefa referencia cláusulas de requisito e, quando aplicável, a propriedade de correção do `design.md`.

## Tasks

- [x] 1. Extrair funções puras com store injetável (fundação testável)
  - Criar `public/core.js` (módulo ES exportável, também consumível pelo `app.js` via `<script>` ou `window`) contendo a lógica pura desacoplada do Firebase
  - Definir a interface do `store` injetável: `getDoc(colecao, id)`, `setDoc(colecao, id, dados, {merge})`, `updateDoc(colecao, id, patch)` operando sobre um objeto em memória
  - _Requirements: 2.1, 2.3, 2.6, 3.3, 4.1, 4.2, 4.4, 4.6, 4.7, 4.8, 4.9_

  - [x] 1.1 Implementar `chaveCache(casalId)` e `nomePadrao(email)`
    - `chaveCache(casalId)` retorna `` `pd-cache:${casalId}` ``
    - `nomePadrao(email)` retorna a parte local (antes do `@`) do e-mail
    - _Requirements: 2.6, 3.3_

  - [ ]* 1.2 Escrever teste de propriedade para `chaveCache`
    - **Property 6: Chave de cache é derivada e injetora**
    - **Validates: Requirements 2.6**
    - Para dois casalId distintos, as chaves derivadas são distintas e cada chave contém seu casalId; mínimo 100 iterações
    - Comentário: `// Feature: multi-usuario-sso, Property 6`

  - [ ]* 1.3 Escrever teste de propriedade para `nomePadrao`
    - **Property 7: Nome padrão é a parte local do e-mail**
    - **Validates: Requirements 3.3**
    - Gerar e-mails `local@dominio` (incluindo caracteres não-ASCII); o resultado é exatamente `local`; mínimo 100 iterações
    - Comentário: `// Feature: multi-usuario-sso, Property 7`

  - [x] 1.4 Implementar `gerarCodigo()`
    - Gerar string de 8 caracteres do alfabeto `A-Z0-9` (36 símbolos)
    - _Requirements: 4.1_

  - [ ]* 1.5 Escrever teste de propriedade para `gerarCodigo`
    - **Property 8: Código de convite tem formato válido**
    - **Validates: Requirements 4.1**
    - Toda execução produz exatamente 8 caracteres, todos em `A-Z0-9`; mínimo 100 iterações
    - Comentário: `// Feature: multi-usuario-sso, Property 8`

- [x] 2. Implementar resolução de casalId (lógica pura sobre store)
  - [x] 2.1 Implementar `resolverCasalId(store, user)` e `criarEspacoCasal(store, user)`
    - `resolverCasalId`: lê `casais/{uid}`; se não existe, chama `criarEspacoCasal` e retorna `uid`; se tem `casalIdRef`, retorna o ref; senão retorna `uid` (Decisão D1)
    - `criarEspacoCasal`: cria `casais/{uid}` com `membros:{ [email]: displayName }`, `nome1 = displayName`, `nome2 = null`, listas vazias (`viagens/financas/metas/checklist`) e `criadoEm`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.2, 6.2_

  - [ ]* 2.2 Escrever teste de propriedade para criação de espaço
    - **Property 1: Criação de espaço usa o UID como identificador**
    - **Validates: Requirements 2.1, 5.4**
    - Comentário: `// Feature: multi-usuario-sso, Property 1`

  - [ ]* 2.3 Escrever teste de propriedade para registro do criador como membro
    - **Property 2: Criador é registrado como membro com email → nome**
    - **Validates: Requirements 2.2, 3.2, 4.5**
    - Comentário: `// Feature: multi-usuario-sso, Property 2`

  - [ ]* 2.4 Escrever teste de propriedade para resolução do espaço do membro
    - **Property 3: Resolução carrega o espaço correto do membro**
    - **Validates: Requirements 2.3**
    - Gerar espaços com mapas de membros disjuntos; membro pertence a exatamente um; mínimo 100 iterações
    - Comentário: `// Feature: multi-usuario-sso, Property 3`

  - [ ]* 2.5 Escrever teste de propriedade para o ponteiro de associação
    - **Property 4: Resolução segue o ponteiro de associação**
    - **Validates: Requirements 6.2**
    - Comentário: `// Feature: multi-usuario-sso, Property 4`

- [x] 3. Implementar aceite de convite (lógica pura sobre store)
  - [x] 3.1 Implementar `aceitarConvite(store, codigo, user, agora)`
    - Validar na ordem de curto-circuito: inexistente (`invalido`) → expirado (`expirou`) → 2 membros (`cheio`) → e-mail já membro (`ja_membro`) → sucesso
    - No sucesso: adicionar `membros[email] = displayName` no espaço alvo e gravar ponteiro `casais/{uid} = { casalIdRef }`
    - Cada ramo de erro retorna sem escrever no store
    - _Requirements: 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [ ]* 3.2 Escrever teste de propriedade para aceite válido
    - **Property 10: Aceite válido registra o parceiro como membro**
    - **Validates: Requirements 4.4, 4.5**
    - Comentário: `// Feature: multi-usuario-sso, Property 10`

  - [ ]* 3.3 Escrever teste de propriedade para aceite rejeitado
    - **Property 11: Aceite rejeitado preserva o mapa de membros**
    - **Validates: Requirements 4.6, 4.7, 4.8, 4.9**
    - Cobrir os quatro ramos de rejeição; `membros` idêntico ao estado anterior e erro corresponde à condição; mínimo 100 iterações
    - Comentário: `// Feature: multi-usuario-sso, Property 11`

  - [x] 3.4 Implementar `criarConvite(store, casalId, criadoPor, agora)`
    - Gerar código via `gerarCodigo`, gravar `convites/{codigo}` com `casalId`, `criadoPor`, `criadoEm`, `expiraEm = criadoEm + 72h`
    - _Requirements: 4.1, 4.2_

  - [ ]* 3.5 Escrever teste de propriedade para expiração do convite
    - **Property 9: Expiração é exatamente 72 horas após a geração**
    - **Validates: Requirements 4.2**
    - Gerar instantes base variados (incluindo bordas); `expiraEm == t + 72h`; mínimo 100 iterações
    - Comentário: `// Feature: multi-usuario-sso, Property 9`

  - [x] 3.6 Implementar persistência round-trip de campos no store
    - Garantir que gravar e ler `viagens/financas/metas/checklist` de um mesmo `casalId` retorna lista igual
    - _Requirements: 2.5_

  - [ ]* 3.7 Escrever teste de propriedade para persistência round-trip
    - **Property 5: Persistência é round-trip dentro do espaço**
    - **Validates: Requirements 2.5**
    - Comentário: `// Feature: multi-usuario-sso, Property 5`

- [ ] 4. Configurar ambiente de testes
  - Criar `package.json` com devDependencies `fast-check`, `vitest`, `@firebase/rules-unit-testing`
  - Configurar script de teste em modo single-run (`vitest --run`), nunca watch
  - Criar helper de store em memória compartilhado pelos testes de propriedade
  - _Requirements: (infraestrutura de testes; suporta Propriedades 1–12)_

- [ ] 5. Checkpoint - lógica pura e testes de propriedade
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Refatorar `Estado` e remover constantes fixas em `app.js`
  - [ ] 6.1 Remover `CASAL_DOC_ID` e os fallbacks `nome1:'Tiago'`/`nome2:'Yasmin'`; adicionar `Estado.casalId`
    - `nome1`/`nome2` iniciam `null` até carregar; adicionar `usuarioNome`
    - _Requirements: 3.1_

- [ ] 7. Integrar `Auth` à resolução de casalId
  - [ ] 7.1 Implementar `Auth.resolverCasalId(user)` e `Auth._criarEspacoCasal(user)`
    - Envolver as funções puras `resolverCasalId`/`criarEspacoCasal` com um `store` adaptador do Firestore v8 (`db.collection('casais').doc(...)`)
    - Gravar `Estado.casalId` e `localStorage['pd-casalId']`; chamar antes de `_entrarNoApp`
    - Remover `_criarDocCasal`/`_criarDocInicial` antigos
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 6.2_

  - [ ]* 7.2 Escrever testes por exemplo de roteamento de sessão
    - user=null em app.html redireciona para auth.html (1.4); user!=null em auth.html redireciona para app.html (1.5)
    - Shape do documento criado contém `viagens/financas/metas/checklist` (2.4)
    - _Requirements: 1.4, 1.5, 2.4_

- [ ] 8. Refatorar `DB` para usar `Estado.casalId`
  - [ ] 8.1 Trocar `CASAL_DOC_ID` por `Estado.casalId` e derivar cache com `chaveCache()`
    - `carregarCache` lê de `chaveCache()`; `ouvirNuvem` usa `onSnapshot(casais/{Estado.casalId})` e grava cache em `chaveCache()`; `salvar`/`salvarVarios` usam `set(casais/{Estado.casalId}, ..., {merge:true})`
    - Manter tratamento silencioso de erro (`console.warn` no snapshot, `toast` no save) sem interromper navegação
    - _Requirements: 2.5, 2.6, 7.1, 7.2, 7.3_

  - [ ]* 8.2 Escrever testes por exemplo de offline-first e erro
    - `carregarCache` é invocado antes de `ouvirNuvem` resolver (7.1); erro no `onSnapshot` mantém dados do cache e não interrompe (7.3)
    - `erroFirebase(code)` mapeia códigos conhecidos e fallback (1.3)
    - _Requirements: 1.3, 7.1, 7.3_

  - [ ] 8.3 Atualizar `logout` para remover cache e ponteiro do usuário
    - Remover `pd-cache:{casalId}` (via `chaveCache()`) e `pd-casalId`; redirecionar para auth.html
    - _Requirements: 7.4_

  - [ ]* 8.4 Escrever teste de propriedade para limpeza de cache no logout
    - **Property 12: Logout remove o cache do espaço atual**
    - **Validates: Requirements 7.4**
    - Comentário: `// Feature: multi-usuario-sso, Property 12`

- [ ] 9. Criar objeto `Convites` em `app.js`
  - [ ] 9.1 Implementar `Convites.gerarCodigo/criar/abrirModal/aceitar`
    - `criar` chama `criarConvite` com store adaptador para `Estado.casalId`; `aceitar` chama `aceitarConvite`, re-resolve `Estado.casalId` e recarrega dados
    - Mapear os erros (`invalido/expirou/cheio/ja_membro`) para `toast` com as mensagens do design
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

- [ ] 10. Adicionar UI de convite em `app.html`
  - [ ] 10.1 Adicionar modais `modal-convite-gerar` e `modal-convite-aceitar` e item de sidebar "Convidar parceiro(a)"
    - Gerar: exibe código de 8 chars + botão copiar + validade; Aceitar: input de 8 chars + botão "Entrar no espaço"
    - Sidebar abre o modal apropriado conforme o número de membros atuais
    - _Requirements: 4.3, 4.4_

  - [ ]* 10.2 Escrever teste por exemplo de exibição do código no modal
    - O modal de gerar exibe o código produzido (4.3)
    - _Requirements: 4.3_

- [ ] 11. Checkpoint - integração cliente
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Reescrever `firestore.rules` com autorização por e-mail do token
  - [ ] 12.1 Implementar regras para `casais/{casalId}` e `convites/{codigo}`
    - `souMembro()` exige `request.auth.token.email in resource.data.membros`; `create` só se `casalId == request.auth.uid`; dono lê/escreve o próprio ponteiro; `convites`: `get`/`create`/`delete` para autenticados; bloquear `/{document=**}`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 12.2 Escrever testes de regras no emulador (autorização)
    - Não-membro autenticado negado e dados inalterados (5.1); sem auth negado (5.2); membro permitido (5.3); create com `casalId==uid` permitido e id diferente negado (5.4); coleção arbitrária negada (5.5); `membros` ausente/vazio negado (5.6)
    - Ponteiro: dono lê/escreve o próprio ponteiro (D1); `convites` `get` autenticado permitido / não autenticado negado
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 12.3 Escrever teste de regras de tempo real no emulador
    - Alteração por um membro dispara `onSnapshot` no cliente do outro (7.2)
    - _Requirements: 7.2_

- [ ] 13. Migração do documento legado `tiago-yasmin`
  - [ ] 13.1 Escrever script de migração por ponteiro (sem cópia de dados)
    - Criar `scripts/migrar-tiago-yasmin.js`: garante `casais/tiago-yasmin.membros` com ambos os e-mails; cria ponteiros `casais/{uidTiago}` e `casais/{uidYasmin}` com `{ casalIdRef: 'tiago-yasmin' }`; não apaga o documento legado (Decisão D5)
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 13.2 Escrever teste de integração (smoke) da migração no emulador
    - Procedimento não deleta `casais/tiago-yasmin` (6.1); após criar ponteiros, ambos resolvem `casalId = 'tiago-yasmin'` e enxergam os dados (6.3)
    - _Requirements: 6.1, 6.3_

- [ ] 14. Remover textos fixos e mensagens de bloqueio
  - [ ] 14.1 Limpar `auth.html` e `Auth._bloquear`
    - Remover literais `Tiago`/`Yasmin` de `auth.html`; `_bloquear` usa mensagem genérica de "Acesso não autorizado" sem nomes próprios; confirmar ausência do literal `tiago-yasmin` no código-fonte novo do cliente
    - _Requirements: 3.1, 3.4_

  - [ ]* 14.2 Escrever teste por exemplo de ausência de nomes fixos
    - Texto de bloqueio não contém `Tiago`/`Yasmin`; código do cliente não contém o literal `tiago-yasmin` (exceto no script de migração)
    - _Requirements: 3.1, 3.4_

- [ ] 15. Checkpoint final - toda a suíte de testes
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tarefas marcadas com `*` são opcionais (testes) e podem ser puladas para um MVP mais rápido.
- Cada tarefa referencia requisitos específicos para rastreabilidade; tarefas de teste referenciam a propriedade de correção do `design.md`.
- Testes de propriedade usam `fast-check` sobre um store em memória injetável, mínimo de 100 iterações cada, um teste por propriedade (1–12).
- Autorização (Req 5) e tempo real (7.2) são validados por testes de regras no Firebase Emulator, não por propriedades.
- Executar `vitest` sempre em modo single-run (`--run`), nunca em watch, para não bloquear a automação. O Firebase Emulator deve ser iniciado manualmente pelo usuário antes dos testes de regras.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.4", "4.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.5", "2.1", "3.6"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "3.1", "3.4", "3.7"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.5", "6.1"] },
    { "id": 4, "tasks": ["7.1", "10.1", "12.1", "13.1"] },
    { "id": 5, "tasks": ["8.1", "9.1", "12.2", "12.3", "13.2"] },
    { "id": 6, "tasks": ["8.3", "7.2", "10.2", "14.1"] },
    { "id": 7, "tasks": ["8.2", "8.4", "14.2"] }
  ]
}
```
