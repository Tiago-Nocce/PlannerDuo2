# Skill — Supervisor de Produto · PlannerDuo

## Papel
Você é o supervisor do PlannerDuo. Conhece a visão completa do produto, as regras de negócio, a arquitetura geral e as decisões de design do sistema. Use este conhecimento para orientar mudanças de forma coerente com o produto.

---

## O que é o PlannerDuo

Aplicação web privada para casais gerenciarem juntos:
1. **Finanças compartilhadas** — receitas, despesas, acerto de contas automático
2. **Viagens** — planejamento, orçamento, motor de busca em plataformas externas
3. **Metas financeiras** — cofrinho com progresso visual
4. **Checklist de viagem** — itens por categoria com templates prontos
5. **Relatórios** — gráficos e exportação CSV/PDF

---

## Arquitetura Geral

```
public/
  index.html    ← Landing page pública
  auth.html     ← Login / Cadastro / Reset (script independente, sem app.js)
  app.html      ← SPA principal (requer autenticação)
  app.js        ← Toda a lógica da aplicação
  style.css     ← Design system completo (light + dark mode)

.kiro/
  skills/       ← Skills especializadas deste arquivo
  hooks/        ← Hooks de automação do Kiro

firebase.json   ← Configuração de hosting
firestore.rules ← Regras de segurança do banco
```

---

## Fluxo de Autenticação

```
index.html → auth.html → [Firebase Auth]
                              ↓
                      onAuthStateChanged
                              ↓
                    user logado? → app.html
                    não logado?  → auth.html
```

- `auth.html` é **100% independente** — não importa `app.js`
- `app.html` entra imediatamente ao detectar usuário, carrega Firestore em background
- Dados ficam em `casais/tiago-yasmin` (documento único compartilhado)
- Dois usuários com e-mails diferentes, mesmos dados

---

## Módulos e Responsabilidades em `app.js`

| Objeto | Responsabilidade |
|--------|-----------------|
| `Estado` | Estado global em memória |
| `Utils` | Formatação, datas, slugs, categorias |
| `UI` | Modais, toasts, navegação, nomes dinâmicos |
| `Auth` | onAuthStateChanged, entrar/sair, esconder loader |
| `DB` | Firestore: cache local, onSnapshot, salvar |
| `Controladores` | CRUD: finanças, viagens, metas, checklist |
| `ServicoBusca` | Gera URLs para plataformas externas de viagem |
| `Checklist` | Toggle, templates, limpeza |
| `Exportacao` | CSV e PDF |
| `Charts` | Chart.js: fluxo, categorias, responsável, relatórios |
| `Relatorios` | Tabela + gráficos por período/pessoa |
| `Render` | Renderização de cada view + dashboard |

---

## Regras de Negócio Principais

### Finanças
- Acerto de contas = `(totalP1 - totalP2) / 2` — quem gastou mais paga a diferença
- Categorias são inferidas automaticamente pela descrição (`Utils.inferirCat`)
- Filtros: por tipo (despesa/receita), por categoria, por busca textual, por mês
- Projeção de fim de mês = `(gastos_do_mês / dia_atual) × dias_no_mês`

### Viagens
- Status calculado por data: futura / em andamento / concluída
- Motor de busca: plataformas com deep-link recebem parâmetros; sem deep-link abrem a homepage
- Orçamento vs gastos mostrado com progress bar

### Metas
- Progresso = `atual / alvo × 100`
- Depósito inline direto no card (sem abrir modal)
- Prazo: atrasado (vermelho), vence hoje, faltam N dias

### Checklist
- 4 templates prontos: praia, internacional, mochilão, cruzeiro
- Progresso global = `itens_feitos / total_itens`

---

## Princípios do Produto

1. **Offline-first** — cache local sempre carrega antes do Firestore
2. **Real-time** — `onSnapshot` mantém os dois usuários sincronizados
3. **Nunca travar** — erros do Firestore são silenciosos, o app continua
4. **Mobile-ready** — sidebar recolhe, layout adapta até 480px
5. **Dark mode** — persiste no `localStorage`

---

## Roadmap Sugerido

- [ ] Notificações push (Firebase Cloud Messaging) para alertas de metas e viagens próximas
- [ ] Modo convidado (read-only) para compartilhar dashboard com família
- [ ] Importação de extrato bancário (OFX/CSV) para lançamento automático
- [ ] Integração com Google Calendar para datas de viagem
- [ ] PWA (manifest + service worker) para instalação no celular
