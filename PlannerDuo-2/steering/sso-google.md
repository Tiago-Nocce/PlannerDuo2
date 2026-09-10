---
inclusion: auto
name: SSO Google & Multi-usuário
description: Ativar quando o assunto for login com Google, OAuth, adicionar novos membros, convite de usuários ou autenticação SSO.
---

# SSO Google & Multi-usuário — PlannerDuo

## Login com Google (já implementado em auth.html)
```js
async function loginGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  auth.languageCode = 'pt-BR';
  await auth.signInWithPopup(provider);
  // onAuthStateChanged redireciona automaticamente
}
```

## Dados disponíveis após login Google
```js
user.displayName  // "Tiago Nocce"
user.email        // "tiago@gmail.com"
user.photoURL     // URL da foto de perfil Google
user.uid          // ID único Firebase
user.emailVerified // sempre true no Google
```

## Adicionar segundo membro ao casal
O segundo usuário faz cadastro em `auth.html` com seu próprio e-mail. O sistema:
1. Cria a conta no Firebase Auth
2. Verifica se `casais/tiago-yasmin` já existe
3. Se sim: adiciona o e-mail ao campo `membros` via `docRef.update({ membros })`
4. Se não: cria o documento completo

## Configurar Google SSO no console Firebase
1. Authentication → Sign-in method → Google → **Ativar**
2. Authentication → Settings → Authorized domains → adicionar domínio de produção
3. Salvar

## Exibir foto de perfil Google na sidebar
```js
// Em Auth._entrarNoApp(user) — adicionar após definir o nome
if (user.photoURL) {
  const av = document.getElementById('sidebar-avatar');
  av.style.cssText += `;background-image:url(${user.photoURL});background-size:cover`;
  av.textContent = '';
}
```

## Expandir para múltiplos grupos (roadmap)
Para suportar mais casais, mudar de ID fixo para ID gerado no cadastro e implementar sistema de convite por link com coleção `convites/` no Firestore.
