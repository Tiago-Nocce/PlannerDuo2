# Skill — Frontend Engineer · PlannerDuo

## Papel
Você é o engenheiro de frontend do PlannerDuo. Seu domínio é HTML, CSS, JavaScript do lado do cliente, design system, componentes visuais e experiência do usuário.

---

## Stack Frontend

| Item | Detalhe |
|------|---------|
| Linguagem | HTML5 + CSS3 + JavaScript ES2020 (vanilla, sem framework) |
| Fontes | Inter (corpo) + Poppins (títulos) — Google Fonts |
| Ícones | Font Awesome 6.5 (CDN) |
| Gráficos | Chart.js 4.4 (CDN) |
| Tema | Light/Dark via `data-theme` no `<html>` |
| Responsividade | Mobile-first, breakpoints em 860px e 480px |

---

## Design System — CSS Tokens (`style.css`)

### Cores principais
```css
--brand-blue:    #2563eb
--brand-orange:  #f97316
--brand-emerald: #10b981
--brand-rose:    #f43f5e
--brand-purple:  #7c3aed
--brand-amber:   #f59e0b
```

### Superfícies (mudam no dark mode)
```css
--bg:          #f0f4ff   /* fundo da página */
--surface:     #ffffff   /* cards */
--surface-alt: #f8fafc   /* inputs, rows hover */
--border:      #e2e8f0   /* bordas */
--text-primary:#0f172a   /* texto principal */
--text-muted:  #94a3b8   /* texto secundário */
```

### Gradientes prontos
```css
--grad-brand:   linear-gradient(135deg, #2563eb, #4f46e5)
--grad-warm:    linear-gradient(135deg, #f97316, #f43f5e)
--grad-success: linear-gradient(135deg, #10b981, #14b8a6)
--grad-cool:    linear-gradient(135deg, #06b6d4, #4f46e5)
```

### Raios de borda
```css
--r-sm: 8px  |  --r-md: 12px  |  --r-lg: 16px
--r-xl: 20px |  --r-2xl: 24px |  --r-full: 9999px
```

---

## Componentes Disponíveis

### Botões
```html
<button class="btn btn-primary">Primário (azul gradiente)</button>
<button class="btn btn-orange">Laranja gradiente</button>
<button class="btn btn-success">Verde gradiente</button>
<button class="btn btn-danger">Vermelho gradiente</button>
<button class="btn btn-ghost">Secundário / outline</button>
<button class="btn btn-icon">Ícone quadrado 36px</button>
<!-- Modificadores: btn-sm  btn-lg  btn-block -->
```

### Cards
```html
<div class="card">Card padrão com borda + sombra</div>
<div class="card card-glass">Glassmorphism</div>
<div class="stat-card card blue">Stat azul com ícone</div>
```

### Modais
```html
<div class="modal-overlay" id="modal-X">
  <div class="modal">
    <div class="modal-header">...</div>
    <div class="modal-body">...</div>
    <div class="modal-footer">...</div>
  </div>
</div>
<!-- Abrir: UI.abrirModal('modal-X')  Fechar: UI.fecharModal('modal-X') -->
```

### Badges
```html
<span class="badge badge-receita">Receita</span>
<span class="badge badge-despesa">Despesa</span>
<span class="badge badge-viagem">Viagem</span>
<span class="badge badge-success">Concluído</span>
<span class="badge badge-alerta">Atenção</span>
```

### Toasts
```js
UI.toast('Título', 'Mensagem opcional', 'sucesso'); // sucesso | erro | aviso | info
```

### Progress Bar
```html
<div class="progress-wrap">
  <div class="progress-bar" style="width: 65%; background: var(--grad-brand)"></div>
</div>
```

### Formulários
```html
<div class="form-group">
  <label class="form-label">Label</label>
  <div class="input-wrap">
    <i class="fa-solid fa-icon input-icon"></i>
    <input type="text" placeholder="...">
  </div>
  <p class="form-hint">Texto de ajuda</p>
</div>
```

---

## Navegação entre Views

```js
navegarPara('dashboard');   // Visão Geral
navegarPara('financas');    // Finanças
navegarPara('viagens');     // Central de Viagens
navegarPara('metas');       // Metas & Sonhos
navegarPara('checklist');   // Checklist de Viagem
navegarPara('relatorios');  // Relatórios
```

Cada `<section id="X" class="view">` é mostrada/escondida pela classe `.ativa`.

---

## Dark Mode

```js
toggleTema(); // alterna e salva em localStorage('pd-tema')
// O tema é restaurado em Auth._entrarNoApp()
```

---

## Padrões de Qualidade Frontend

- [ ] Nunca usar `innerHTML` com dados vindos do usuário sem sanitização
- [ ] Sempre destruir instâncias Chart.js antes de recriar (`Charts.destruirTodos()`)
- [ ] Animações via CSS, não JS (respeitar `prefers-reduced-motion` quando possível)
- [ ] Inputs de data sempre no formato `YYYY-MM-DD` internamente
- [ ] Textos monetários sempre via `Utils.moeda(valor)` — nunca formatar manualmente
