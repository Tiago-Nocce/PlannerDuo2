---
inclusion: auto
name: Backend & Firestore
description: Ativar quando o assunto for Firestore, banco de dados, regras de segurança, estrutura de dados, autenticação Firebase ou persistência.
---

# Backend Engineer — PlannerDuo

## Estrutura do documento Firestore

```
casais/tiago-yasmin
  nome1: string
  nome2: string
  membros: { "email@a.com": "Tiago", "email@b.com": "Yasmin" }
  criadoEm: string (ISO 8601)
  viagens:   [{ id, destino, emoji, ida, volta, orcamento, gastos, tipo, link, notas }]
  financas:  [{ id, tipo, resp, desc, valor, data, cat, obs }]
  metas:     [{ id, titulo, emoji, cat, alvo, atual, prazo, desc }]
  checklist: [{ id, texto, cat, feito }]
```

## Padrões de escrita
```js
// Sempre usar merge para não sobrescrever outros campos
await db.collection('casais').doc(CASAL_DOC_ID)
  .set({ [campo]: Estado[campo] }, { merge: true });

// Listener em tempo real com erro silencioso
db.collection('casais').doc(CASAL_DOC_ID)
  .onSnapshot((doc) => { /* atualizar */ }, (err) => { console.warn(err); });
```

## Regras Firestore (`firestore.rules`)
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /casais/{docId} {
      allow read, write: if request.auth != null;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```
Publicar: `firebase deploy --only firestore:rules`

## Checklist backend
- Toda escrita usa `{ merge: true }`
- Erros Firestore capturados e não travam a UI
- Cache local sincronizado após cada snapshot
- Listener cancelado no logout (`Estado.unsubscribe()`)
- Regras publicadas (não em modo de teste)
