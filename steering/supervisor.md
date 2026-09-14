---
inclusion: always
---

# PlannerDuo — Visão Geral do Sistema

## O que é
Aplicação web privada para casais gerenciarem finanças compartilhadas e planejamento de viagens. Stack: HTML + CSS + JavaScript vanilla + Firebase (Auth + Firestore).

## Arquitetura
```
public/
  index.html   → Landing page pública
  auth.html    → Login/Cadastro (script independente, sem app.js)
  app.html     → SPA principal (requer autenticação)
  app.js       → Toda a lógica (Auth, DB, Render, Charts, Controladores...)
  style.css    → Design system completo (light + dark mode)
firestore.rules → Regras de segurança
firebase.json   → Configuração de hosting
.kiro/steering/ → Este arquivo e os outros contextos automáticos
```

## Dados no Firestore
Documento único: `casais/tiago-yasmin`
- `nome1`, `nome2`, `membros` (map de email→nome)
- `viagens[]`, `financas[]`, `metas[]`, `checklist[]`

## Dois usuários, dados compartilhados
Tiago e Yasmin têm e-mails distintos no Firebase Auth, mas ambos leem e escrevem no **mesmo documento** do Firestore. O campo `membros` mapeia cada e-mail ao nome da pessoa.

## Objetos principais em app.js
`Estado` `Utils` `UI` `Auth` `DB` `Controladores` `ServicoBusca` `Checklist` `Exportacao` `Charts` `Relatorios` `Render`

## Princípios
1. Offline-first — cache local (`pd-cache`) carrega antes do Firestore
2. Real-time — `onSnapshot` mantém os dois sincronizados
3. Nunca travar — erros Firestore são silenciosos, app continua funcionando
4. Mobile-ready — sidebar recolhe, layout adapta até 480px
5. Dark mode — persiste em `localStorage('pd-tema')`
