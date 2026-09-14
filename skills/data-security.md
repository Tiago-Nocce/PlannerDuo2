# Skill — Segurança de Dados · PlannerDuo

## Papel
Você é o responsável pela segurança de dados do PlannerDuo. Garanta que dados financeiros e pessoais do casal estejam protegidos em todas as camadas.

---

## Modelo de Ameaças

| Ameaça | Mitigação |
|--------|-----------|
| Acesso não autenticado ao Firestore | Regras exigem `request.auth != null` |
| Leitura de dados de outro casal | ID do documento é fixo; acesso verificado por membros no app |
| Vazamento de dados no frontend | `firebaseConfig` é pública por design; não há dados sensíveis nela |
| XSS via `innerHTML` | Nunca inserir input do usuário sem sanitização |
| Sessão de terceiro logada | `onAuthStateChanged` verifica se e-mail está em `membros` |
| Ataques de força bruta no login | Firebase limita tentativas automaticamente |

---

## Regras do Firestore (obrigatórias)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Apenas usuários autenticados acessam dados do casal
    match /casais/{docId} {
      allow read, write: if request.auth != null;
    }

    // Tudo mais é bloqueado por padrão
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Publicar com:** `firebase deploy --only firestore:rules`

**Regra mais restritiva (recomendada para produção):**
```javascript
match /casais/{docId} {
  // Apenas e-mails na lista de membros podem acessar
  allow read, write: if request.auth != null
    && (request.auth.token.email == resource.data.membros.keys()[0]
     || request.auth.token.email == resource.data.membros.keys()[1]);
}
```

---

## Boas Práticas de Código

### ✅ Fazer
```js
// Sanitizar texto antes de inserir no DOM
const safe = texto.replace(/</g, '&lt;').replace(/>/g, '&gt;');
elemento.textContent = safe;   // textContent é seguro

// Validar no frontend antes de salvar
if (!valor || isNaN(valor) || valor <= 0) return UI.toast('Valor inválido', '', 'aviso');

// Logout limpa o cache local
localStorage.removeItem('pd-cache');
auth.signOut();
```

### ❌ Nunca fazer
```js
// PERIGO: XSS se 'desc' vier de input do usuário
elemento.innerHTML = `<b>${f.desc}</b>`;

// PERIGO: dados sensíveis no localStorage (senhas, tokens)
localStorage.setItem('senha', senha);

// PERIGO: salvar sem validação
Estado.financas.push({ valor: document.getElementById('val').value }); // NaN, string
```

---

## Dados Sensíveis — O que NÃO guardar no Firestore

| ❌ Nunca guardar | ✅ Guardar |
|-----------------|-----------|
| Senhas | Nomes, valores, datas |
| Tokens de acesso | Categorias, notas |
| Números completos de cartão | IDs gerados localmente |
| CPF / RG | Emojis, links públicos |
| Dados bancários | Status de viagem |

---

## Checklist de Segurança

- [ ] Regras do Firestore publicadas (não estão em modo de teste)
- [ ] Regras de teste (permitem tudo) não estão ativas em produção
- [ ] `localStorage` contém apenas dados não sensíveis (cache de viagens/finanças)
- [ ] Inputs de valor são parseados com `parseFloat()` e validados antes de salvar
- [ ] `innerHTML` só é usado com conteúdo construído internamente (não com input do usuário)
- [ ] Logout remove o cache local
- [ ] Firebase Authentication está com e-mail/senha + Google habilitados no console
- [ ] Domínios autorizados no Firebase Auth incluem o domínio de produção

---

## Configuração no Console Firebase

1. **Authentication → Sign-in method**: ativar "E-mail/senha" e "Google"
2. **Authentication → Authorized domains**: adicionar domínio de produção (ex: `plannerduo.web.app`)
3. **Firestore → Rules**: publicar as regras acima
4. **Firestore → Indexes**: não são necessários para o modelo atual (queries simples em arrays)
5. **Project Settings → General**: verificar que o plano Spark (gratuito) suporta o uso atual

---

## Resposta a Incidentes

Se um e-mail não autorizado acessar o sistema:
1. No console Firebase → Authentication → encontrar o usuário → desabilitar
2. No Firestore → `casais/tiago-yasmin` → remover o e-mail do campo `membros`
3. Revisar o histórico de acessos em Authentication → Users
