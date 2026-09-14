# Skill — SSO com Google & Multi-usuário · PlannerDuo

## Papel
Você é o especialista em autenticação do PlannerDuo. Gerencia o login com Google (SSO), o sistema de convite para novos membros e a expansão para múltiplos casais ou grupos.

---

## Como o Login com Google Funciona Hoje

```js
// auth.html — já implementado
async function loginGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  await auth.signInWithPopup(provider);
  // onAuthStateChanged redireciona para app.html automaticamente
}
```

O botão "Continuar com Google" já está na tela de login. O Firebase cuida de todo o fluxo OAuth.

---

## Como Adicionar um Novo Membro ao Casal

### Via cadastro (fluxo atual)
1. A segunda pessoa acessa `auth.html`
2. Clica em "Criar conta do casal"
3. Preenche **seu próprio nome** e o nome do parceiro
4. O sistema verifica se o documento `casais/tiago-yasmin` já existe
5. Se existir: adiciona o e-mail ao campo `membros` via `docRef.update({ membros })`
6. Se não existir: cria o documento completo

### Via Google SSO (fluxo recomendado para novos membros)
```js
// Após login com Google bem-sucedido, verificar se o e-mail está em membros
// Se não estiver, adicionar automaticamente (apenas se o documento já existir)
auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  const doc = await db.collection('casais').doc(CASAL_DOC_ID).get();
  if (doc.exists) {
    const membros = doc.data().membros || {};
    if (!membros[user.email]) {
      // Novo membro via Google — adiciona com nome do perfil Google
      membros[user.email] = user.displayName || user.email.split('@')[0];
      await db.collection('casais').doc(CASAL_DOC_ID).update({ membros });
    }
  }
});
```

---

## Expandir para Múltiplos Grupos (Roadmap)

Para suportar mais de um casal ou grupo de amigos, a arquitetura precisa mudar de ID fixo para ID dinâmico:

### Nova estrutura
```
casais/
  {uid-do-criador}/          ← ID gerado no cadastro
    nome1, nome2, membros, ...
  {outro-uid}/
    ...
```

### Fluxo de convite por link
```js
// 1. Gerar link de convite
const conviteId = crypto.randomUUID();
await db.collection('convites').doc(conviteId).set({
  casalId: CASAL_DOC_ID,
  criadoEm: new Date().toISOString(),
  expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 dias
});
const link = `https://plannerduo.web.app/entrar?convite=${conviteId}`;

// 2. Ao acessar o link, ler o convite e adicionar ao casal
const params = new URLSearchParams(window.location.search);
const conviteId = params.get('convite');
if (conviteId) {
  const convite = await db.collection('convites').doc(conviteId).get();
  if (convite.exists && convite.data().expiresAt > Date.now()) {
    // Adicionar e-mail do usuário logado ao casal referenciado
  }
}
```

---

## Configurar Google SSO no Console Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Selecione o projeto `plannerduo`
3. Vá em **Authentication → Sign-in method**
4. Clique em **Google → Ativar**
5. Preencha o e-mail de suporte do projeto
6. Salve

### Domínios autorizados
Em **Authentication → Settings → Authorized domains**, adicione:
- `plannerduo.web.app` (produção Firebase Hosting)
- `plannerduo.firebaseapp.com` (domínio padrão)
- `127.0.0.1` (desenvolvimento local — já incluído por padrão)

---

## Personalizando o Provedor Google

```js
const provider = new firebase.auth.GoogleAuthProvider();

// Forçar seleção de conta (mesmo se já estiver logado)
provider.setCustomParameters({ prompt: 'select_account' });

// Solicitar apenas e-mail e perfil (padrão)
provider.addScope('profile');
provider.addScope('email');

// Definir idioma do popup
auth.languageCode = 'pt-BR';

await auth.signInWithPopup(provider);
```

---

## Dados do Usuário Google Disponíveis Após Login

```js
auth.onAuthStateChanged((user) => {
  if (!user) return;

  user.displayName;    // "Tiago Nocce"
  user.email;          // "tiago@gmail.com"
  user.photoURL;       // URL da foto de perfil
  user.uid;            // ID único no Firebase
  user.emailVerified;  // true (Google já verifica)
  user.providerData;   // [{ providerId: 'google.com', ... }]
});
```

### Exibir foto de perfil na sidebar
```js
// Em Auth._entrarNoApp(user)
if (user.photoURL) {
  const av = document.getElementById('sidebar-avatar');
  av.style.backgroundImage = `url(${user.photoURL})`;
  av.style.backgroundSize  = 'cover';
  av.textContent = '';
}
```

---

## Checklist SSO

- [ ] Google Sign-in ativado no console Firebase
- [ ] Domínios de produção autorizados no Firebase Auth
- [ ] `loginGoogle()` implementado em `auth.html` ✓
- [ ] `onAuthStateChanged` redireciona corretamente após login Google ✓
- [ ] Nome do usuário Google (`user.displayName`) é usado como fallback quando `membros` não tem o e-mail
- [ ] Foto de perfil Google pode ser exibida no avatar da sidebar (roadmap)
