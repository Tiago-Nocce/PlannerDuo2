---
inclusion: auto
name: Frontend & Design System
description: Ativar quando o assunto for CSS, HTML, componentes visuais, design system, dark mode, animações, layout, responsividade ou Chart.js.
---

# Frontend Engineer — PlannerDuo

## Design Tokens (style.css)

### Cores de marca
```css
--brand-blue: #2563eb | --brand-orange: #f97316 | --brand-emerald: #10b981
--brand-rose: #f43f5e | --brand-purple: #7c3aed | --brand-amber: #f59e0b
```

### Superfícies (mudam no dark mode via `data-theme="dark"`)
```css
--bg / --surface / --surface-alt / --border / --text-primary / --text-muted
```

### Gradientes prontos
```css
--grad-brand: linear-gradient(135deg,#2563eb,#4f46e5)
--grad-warm:  linear-gradient(135deg,#f97316,#f43f5e)
--grad-success: linear-gradient(135deg,#10b981,#14b8a6)
```

## Componentes disponíveis

**Botões:** `.btn .btn-primary` `.btn-orange` `.btn-success` `.btn-danger` `.btn-ghost` `.btn-icon` + `.btn-sm` `.btn-lg` `.btn-block`

**Cards:** `.card` `.card-glass` `.stat-card.blue/.orange/.emerald/.rose/.purple/.amber`

**Modais:** `.modal-overlay` → `.modal` → `.modal-header` + `.modal-body` + `.modal-footer`
Abrir: `UI.abrirModal('id')` | Fechar: `UI.fecharModal('id')`

**Badges:** `.badge .badge-receita/.badge-despesa/.badge-viagem/.badge-success/.badge-alerta`

**Formulários:** `.form-group` → `.form-label` + `.input-wrap` → `.input-icon` + `input/select`

**Progress:** `.progress-wrap` → `.progress-bar` (estilizar width e background inline)

**Toasts:** `UI.toast('título', 'corpo', 'sucesso|erro|aviso|info')`

## Navegação
```js
navegarPara('dashboard'|'financas'|'viagens'|'metas'|'checklist'|'relatorios')
```

## Dark Mode
```js
toggleTema() // alterna e salva em localStorage('pd-tema')
```
Restaurado automaticamente em `Auth._entrarNoApp()`.

## Padrões
- `textContent` para dados do usuário, nunca `innerHTML` com input externo
- Destruir Chart.js antes de recriar: `Charts.destruirTodos()`
- Datas sempre `YYYY-MM-DD` internamente, exibir via `Utils.data(str)`
- Valores sempre via `Utils.moeda(valor)`
