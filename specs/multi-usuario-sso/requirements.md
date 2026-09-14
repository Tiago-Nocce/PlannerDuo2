# Requirements Document

## Introduction

Esta feature transforma o PlannerDuo de um sistema hard-coded para o casal "tiago-yasmin" em um sistema multi-usuário genérico. Qualquer pessoa poderá autenticar via SSO Google, obter um espaço de dados isolado (finanças, viagens, metas e checklist), e convidar um parceiro(a) para compartilhar esse mesmo espaço. O objetivo central é remover todas as referências fixas a "Tiago", "Yasmin" e ao documento único `casais/tiago-yasmin`, substituindo por espaços de dados isolados por casal, com regras de segurança que garantem que cada casal acesse apenas os próprios dados.

Esta transformação envolve três eixos: (1) isolamento de dados por espaço de casal identificado por um ID estável, (2) fluxo de convite e aceite de parceiro(a), e (3) regras de segurança no Firestore que substituem a verificação de autorização atualmente feita no cliente.

## Glossary

- **Sistema**: A aplicação web PlannerDuo (frontend em `app.js`/`auth.html`/`app.html` + backend Firestore + regras de segurança).
- **Usuario**: Uma pessoa autenticada no Firebase Auth via SSO Google, identificada por um UID e um e-mail.
- **Espaco_Casal**: Documento no Firestore que contém os dados compartilhados de um casal (viagens, financas, metas, checklist) e a lista de membros. Substitui o documento fixo `casais/tiago-yasmin`.
- **Membro**: Usuario cujo e-mail (ou UID) consta na lista de participantes de um Espaco_Casal e que possui permissão de leitura e escrita nesse espaço.
- **Criador**: Usuario que criou um Espaco_Casal em seu primeiro acesso e é o primeiro Membro desse espaço.
- **Parceiro**: Segundo Usuario que passa a compartilhar um Espaco_Casal por meio de um Convite aceito.
- **Convite**: Registro que autoriza um Parceiro a ingressar em um Espaco_Casal existente, identificado por um Codigo_Convite.
- **Codigo_Convite**: Identificador único e não adivinhável associado a um Convite, usado pelo Parceiro para ingressar no Espaco_Casal.
- **SSO_Google**: Mecanismo de autenticação por redirecionamento (`signInWithRedirect`) usando `GoogleAuthProvider` do Firebase Auth.
- **Regras_Firestore**: Arquivo `firestore.rules` que define as permissões de leitura e escrita server-side.
- **Cache_Local**: Armazenamento em `localStorage` sob a chave derivada do Espaco_Casal, usado para carregamento offline-first.

## Requirements

### Requirement 1: Autenticação exclusiva via SSO Google

**User Story:** Como uma pessoa que quer usar o PlannerDuo, quero entrar com minha conta Google, para acessar o Sistema sem criar senha específica.

#### Acceptance Criteria

1. WHEN um Usuario aciona o botão de login com Google, THE Sistema SHALL iniciar o fluxo de autenticação SSO_Google via redirecionamento.
2. WHEN o SSO_Google retorna uma autenticação bem-sucedida, THE Sistema SHALL registrar o UID e o e-mail do Usuario na sessão e redirecionar para a tela principal do aplicativo.
3. IF o SSO_Google retorna um erro de autenticação, THEN THE Sistema SHALL exibir uma mensagem de erro descritiva e permanecer na tela de login.
4. WHILE nenhum Usuario está autenticado e a tela principal do aplicativo é acessada, THE Sistema SHALL redirecionar o navegador para a tela de login.
5. WHEN um Usuario já autenticado acessa a tela de login ou a landing page, THE Sistema SHALL redirecionar o navegador para a tela principal do aplicativo.

### Requirement 2: Isolamento de dados por espaço de casal

**User Story:** Como Usuario, quero que meus dados fiquem separados dos dados de outras pessoas, para que ninguém além do meu parceiro(a) veja minhas finanças e viagens.

#### Acceptance Criteria

1. WHEN um Usuario autenticado acessa a tela principal e não é Membro de nenhum Espaco_Casal, THE Sistema SHALL criar um novo Espaco_Casal identificado por um ID estável derivado do UID do Criador.
2. WHEN um Espaco_Casal é criado, THE Sistema SHALL registrar o Criador como primeiro Membro, associando o e-mail do Criador ao nome obtido do perfil Google.
3. WHEN um Usuario autenticado que já é Membro de um Espaco_Casal acessa a tela principal, THE Sistema SHALL carregar os dados desse Espaco_Casal e não de qualquer outro.
4. THE Sistema SHALL armazenar viagens, financas, metas e checklist dentro do Espaco_Casal ao qual o Usuario pertence.
5. WHEN um Usuario grava uma alteração em viagens, financas, metas ou checklist, THE Sistema SHALL persistir a alteração no Espaco_Casal do qual o Usuario é Membro.
6. THE Sistema SHALL derivar a chave do Cache_Local a partir do identificador do Espaco_Casal do Usuario autenticado.

### Requirement 3: Remoção de referências hard-coded

**User Story:** Como mantenedor do Sistema, quero remover os nomes e o documento fixos "Tiago", "Yasmin" e "tiago-yasmin", para que o Sistema funcione para qualquer pessoa.

#### Acceptance Criteria

1. THE Sistema SHALL determinar o identificador do Espaco_Casal a partir da identidade do Usuario autenticado, sem referência ao valor literal "tiago-yasmin".
2. WHEN um Espaco_Casal recém-criado ainda não possui nomes definidos, THE Sistema SHALL usar o nome do perfil Google do Criador como nome do primeiro Membro.
3. WHERE o nome de um Membro ainda não foi informado, THE Sistema SHALL usar como valor padrão a parte local do e-mail desse Membro em vez de um nome fixo.
4. WHEN um acesso é negado por falta de permissão, THE Sistema SHALL exibir uma mensagem de acesso não autorizado que não contenha nomes próprios fixos de pessoas.

### Requirement 4: Convite de parceiro(a)

**User Story:** Como Criador de um Espaco_Casal, quero convidar meu parceiro(a) por meio de um Codigo_Convite, para que nós dois compartilhemos os mesmos dados.

#### Acceptance Criteria

1. WHEN um Membro solicita gerar um Convite, THE Sistema SHALL gerar um Codigo_Convite alfanumérico de exatamente 8 caracteres (letras maiúsculas A-Z e dígitos 0-9) associado ao Espaco_Casal do Membro.
2. WHEN um Convite é gerado, THE Sistema SHALL registrar um instante de expiração igual ao momento da geração acrescido de 72 horas.
3. WHEN um Convite é gerado, THE Sistema SHALL apresentar ao Membro o Codigo_Convite de forma que possa ser compartilhado com o Parceiro.
4. WHEN um Usuario autenticado submete um Codigo_Convite existente e não expirado, THE Sistema SHALL adicionar o e-mail desse Usuario ao mapeamento de Membros do Espaco_Casal associado e conceder acesso de leitura e escrita a esse espaço.
5. WHEN um Usuario é adicionado como Membro por um Convite, THE Sistema SHALL associar o e-mail desse Membro ao nome obtido do perfil Google e carregar os dados do Espaco_Casal correspondente.
6. IF o Codigo_Convite submetido não corresponde a nenhum Convite existente, THEN THE Sistema SHALL rejeitar o ingresso e exibir uma mensagem indicando que o código é inválido, preservando o mapeamento de Membros atual.
7. IF o Codigo_Convite submetido tem instante de expiração anterior ao momento atual, THEN THE Sistema SHALL rejeitar o ingresso e exibir uma mensagem indicando que o código expirou, preservando o mapeamento de Membros atual.
8. IF o Espaco_Casal já possui 2 Membros distintos no momento do ingresso, THEN THE Sistema SHALL rejeitar o ingresso e exibir uma mensagem indicando que o espaço do casal está cheio, preservando o mapeamento de Membros atual.
9. IF o e-mail do Usuario que submete o Codigo_Convite já consta no mapeamento de Membros, THEN THE Sistema SHALL rejeitar o ingresso e exibir uma mensagem indicando que o Usuario já é Membro, preservando o mapeamento de Membros atual.

### Requirement 5: Segurança de acesso aos dados

**User Story:** Como Usuario, quero que o servidor garanta que apenas os membros do meu casal acessem nossos dados, para que a proteção não dependa apenas do código do navegador.

#### Acceptance Criteria

1. IF uma requisição de leitura ou escrita a um Espaco_Casal é feita por um Usuario autenticado cuja identidade não consta no mapeamento de Membros desse Espaco_Casal, THEN THE Regras_Firestore SHALL rejeitar a requisição sem ler nem alterar qualquer dado do Espaco_Casal, mantendo os dados existentes inalterados.
2. IF uma requisição de leitura ou escrita a um Espaco_Casal é feita sem autenticação, THEN THE Regras_Firestore SHALL rejeitar a requisição sem ler nem alterar qualquer dado, mantendo os dados existentes inalterados.
3. WHEN um Usuario autenticado cuja identidade consta no mapeamento de Membros de um Espaco_Casal realiza uma leitura ou escrita nesse Espaco_Casal, THE Regras_Firestore SHALL permitir a requisição.
4. WHEN um Usuario autenticado cria um novo Espaco_Casal cujo identificador corresponde ao próprio identificador de autenticação, THE Regras_Firestore SHALL permitir a criação registrando esse Usuario como Membro no mapeamento de Membros do novo Espaco_Casal.
5. THE Regras_Firestore SHALL rejeitar toda leitura e escrita direcionada a qualquer documento que não pertença às coleções de Espaco_Casal e de Convite definidas, sem ler nem alterar dados, mantendo os dados existentes inalterados.
6. IF uma requisição de leitura ou escrita a um Espaco_Casal é feita quando o mapeamento de Membros está ausente ou vazio, THEN THE Regras_Firestore SHALL rejeitar a requisição sem ler nem alterar qualquer dado.

### Requirement 6: Compatibilidade com o documento existente

**User Story:** Como Criador atual do documento "tiago-yasmin", quero que os dados existentes não sejam perdidos, para continuar usando meu histórico após a mudança.

#### Acceptance Criteria

1. WHEN o Sistema é implantado com a nova estrutura, THE Sistema SHALL preservar o documento `casais/tiago-yasmin` existente sem apagá-lo.
2. WHERE existe um procedimento de migração, THE Sistema SHALL permitir associar os dados do documento `casais/tiago-yasmin` a um Espaco_Casal identificado pelo UID do Criador atual.
3. WHEN um Membro do documento legado acessa o Sistema após a migração, THE Sistema SHALL exibir as viagens, financas, metas e checklist migrados desse documento.

### Requirement 7: Continuidade offline-first e tempo real

**User Story:** Como Usuario, quero que o app continue rápido e sincronizado, para não perder a experiência offline-first e de tempo real ao mudar para o modelo multi-usuário.

#### Acceptance Criteria

1. WHEN a tela principal é carregada, THE Sistema SHALL exibir os dados do Cache_Local do Espaco_Casal antes de concluir a leitura do Firestore.
2. WHILE um Membro está com a tela principal aberta, THE Sistema SHALL atualizar a interface em tempo real quando o Espaco_Casal for alterado por outro Membro.
3. IF uma operação de leitura ou escrita no Firestore falha, THEN THE Sistema SHALL manter o aplicativo operante usando os dados do Cache_Local e registrar o erro sem interromper a navegação.
4. WHEN um Usuario encerra a sessão, THE Sistema SHALL remover o Cache_Local associado ao Espaco_Casal desse Usuario e redirecionar para a tela de login.
