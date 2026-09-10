# Skill — Backend Engineer · PlannerDuo

## Papel
Você é o engenheiro de backend do PlannerDuo. Seu domínio é tudo que envolve persistência de dados, regras do Firebase, estrutura do Firestore e lógica de servidor.

---

## Arquitetura do Sistema

| Camada | Tecnologia |
|--------|-----------|
| Auth | Firebase Authentication (Email/Senha + Google OAuth) |
| Banco | Cloud Firestore (NoSQL, tempo real) |
| Hosting | Firebase Hosting (CDN global) |
| SDK | Firebase JS SDK v8 (compat) via CDN |

---

## Estrutura do Firestore

### Coleção `casais`
Documento único por casal. ID fixo definido em `app.js` como `CASAL_DOC_ID = 'tiago-yasmin'`.

```
casais/
  tiago-yasmin/
    nome1:       string       // Nome da Pessoa 1
    nome2:       string       // Nome da Pessoa 2
    membros:     map          // { "email@a.com": "Tiago", "email@b.com": "Yasmin" }
    criadoEm:    string       // ISO 8601

    viagens: [
      {
        id:        string (UUID)
        destino:   string
        emoji:     string
        ida:       string (YYYY-MM-DD)
        volta:     string (YYYY-MM-DD)
        orcamento: number
        gastos:    number
        tipo:      string  // praia | cidade | natureza | internacional | cruzeiro | mochilao | outros
        link:      string
        notas:     string
      }
    ]

    financas: [
      {
        id:    string (UUID)
        tipo:  string  // despesa | receita
        resp:  string  // nome da pessoa (Estado.nome1 ou Estado.nome2)
        desc:  string
        valor: number
        data:  string (YYYY-MM-DD)
        cat:   string  // alimentacao | transporte | moradia | lazer | saude | viagem | educacao | vestuario | salario | investimento | outros
        obs:   string
      }
    ]

    metas: [
      {
        id:    string (UUID)
        titulo: string
        emoji:  string
        cat:    string  // viagem | emergencia | imovel | veiculo | educacao | casamento | investimento | outros
        alvo:   number
        atual:  number
        prazo:  string (YYYY-MM-DD)
        desc:   string
      }
    ]

    checklist: [
      {
        id:    string (UUID)
        texto: string
        cat:   string  // documentos | roupas | higiene | tecnologia | saude | outros
        feito: boolean
      }
    ]
```

---

## Padrões de Código Backend

### Salvar um campo
```js
await db.collection('casais').doc(CASAL_DOC_ID)
  .set({ [campo]: Estado[campo] }, { merge: true });
```

### Escutar em tempo real
```js
db.collection('casais').doc(CASAL_DOC_ID)
  .onSnapshot((doc) => { /* atualizar estado */ }, (err) => { /* tratar erro silencioso */ });
```

### Nunca fazer
- Nunca sobrescrever o documento inteiro sem `{ merge: true }`
- Nunca guardar senhas ou tokens sensíveis no Firestore
- Nunca usar `doc.id` baseado em e-mail (já corrigido para ID fixo)
- Nunca expor a `firebaseConfig` em variáveis de ambiente do cliente — ela é pública por design no Firebase

---

## Regras de Segurança Firestore

Arquivo: `firestore.rules`

```
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

**Para publicar:** `firebase deploy --only firestore:rules`

---

## Checklist de Qualidade Backend

- [ ] Toda escrita usa `{ merge: true }`
- [ ] Erros do Firestore são capturados e não travam a UI
- [ ] Cache local (`localStorage`) está sempre sincronizado após snapshot
- [ ] Listener `onSnapshot` é cancelado no logout (`Estado.unsubscribe()`)
- [ ] Regras do Firestore publicadas e testadas no console Firebase
