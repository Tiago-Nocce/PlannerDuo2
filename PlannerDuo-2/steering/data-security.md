---
inclusion: auto
name: Segurança de Dados
description: Ativar quando o assunto for segurança, autenticação, proteção de dados, XSS, regras Firestore, privacidade ou acesso não autorizado.
---

# Segurança de Dados — PlannerDuo

## Modelo de ameaças e mitigações

| Ameaça | Mitigação |
|--------|-----------|
| Acesso não autenticado | Regras Firestore exigem `request.auth != null` |
| Outro usuário lendo dados | Verificação por e-mail no campo `membros` (app.js) |
| XSS via input do usuário | Usar `textContent`, nunca `innerHTML` com dados externos |
| Sessão de terceiro | `onAuthStateChanged` verifica membros antes de entrar |
| Força bruta no login | Firebase limita tentativas automaticamente |
| Dados sensíveis no cache | localStorage contém apenas dados não sensíveis |

## O que NUNCA guardar no Firestore
❌ Senhas · tokens de acesso · números de cartão · CPF/RG · dados bancários

## Código seguro
```js
// ✅ Seguro
elemento.textContent = f.desc;
const valor = parseFloat(input.value); if (isNaN(valor)) return;

// ❌ Perigoso
elemento.innerHTML = `<b>${f.desc}</b>`; // XSS se desc vier de input
localStorage.setItem('senha', senha);    // nunca armazenar credenciais
```

## Checklist de segurança
- [ ] Regras Firestore publicadas (não em modo teste)
- [ ] `innerHTML` só com conteúdo construído internamente
- [ ] Inputs de valor parseados com `parseFloat()` e validados
- [ ] Logout remove o cache local (`localStorage.removeItem('pd-cache')`)
- [ ] Firebase Auth: E-mail/senha e Google ativados no console
- [ ] Domínio de produção autorizado no Firebase Auth
