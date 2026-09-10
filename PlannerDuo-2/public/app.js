// ============================================================
// PLANNERDUO — app.js v3.0
// Dois usuários com logins próprios, dados 100% compartilhados
// ============================================================

// ── Firebase Config ──────────────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyAywzg4yDP0p15RpnFwPc2Y2MGoT2U5l4M",
    authDomain: "plannerduo.firebaseapp.com",
    projectId: "plannerduo",
    storageBucket: "plannerduo.firebasestorage.app",
    messagingSenderId: "355035332668",
    appId: "1:355035332668:web:9c91fb300c4b601dfc4339",
    measurementId: "G-GFCLFVXP4E"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

// ── ID fixo do documento compartilhado do casal ──────────────
// Ambos os usuários sempre leem/escrevem neste mesmo documento.
const CASAL_DOC_ID = 'tiago-yasmin';

// ── Estado Global ─────────────────────────────────────────────
const Estado = {
    usuarioUid:  null,
    usuarioEmail: null,
    nomeUsuario: null,   // nome da pessoa logada (lido do doc)
    nome1: 'Tiago',      // fallback enquanto não carrega
    nome2: 'Yasmin',
    viagens:    [],
    financas:   [],
    metas:      [],
    checklist:  [],
    unsubscribe: null    // listener ativo do Firestore
};

// ── Mapa de e-mails autorizados → pessoa ─────────────────────
// Adicione aqui os e-mails de vocês dois.
// Qualquer outro e-mail que tentar acessar será bloqueado.
const USUARIOS_AUTORIZADOS = {
    // 'email@exemplo.com': 'NomeDaPessoa'
    // Será preenchido dinamicamente via Firestore (campo 'membros')
};

// ============================================================
// UTILITÁRIOS
// ============================================================
const Utils = {
    id: () => crypto.randomUUID ? crypto.randomUUID() : '_' + Math.random().toString(36).substr(2, 9),

    moeda: (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0),

    data: (s) => {
        if (!s) return '';
        const [a, m, d] = s.split('-');
        return `${d}/${m}/${a}`;
    },

    hoje: () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    },

    diasAte: (dateStr) => {
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const alvo = new Date(dateStr + 'T12:00:00'); alvo.setHours(0,0,0,0);
        return Math.ceil((alvo - hoje) / 86400000);
    },

    slug: (t) => t.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-'),

    inicial: (nome) => (nome || '?')[0].toUpperCase(),

    catInfo: (cat) => {
        const mapa = {
            alimentacao: { emoji:'🍔', label:'Alimentação', cor:'#f97316' },
            transporte:  { emoji:'🚗', label:'Transporte',  cor:'#3b82f6' },
            moradia:     { emoji:'🏠', label:'Moradia',     cor:'#8b5cf6' },
            lazer:       { emoji:'🎟️', label:'Lazer',       cor:'#ec4899' },
            saude:       { emoji:'💊', label:'Saúde',       cor:'#10b981' },
            viagem:      { emoji:'✈️', label:'Viagem',      cor:'#06b6d4' },
            educacao:    { emoji:'📚', label:'Educação',    cor:'#f59e0b' },
            vestuario:   { emoji:'👗', label:'Vestuário',   cor:'#a855f7' },
            salario:     { emoji:'💼', label:'Salário',     cor:'#22c55e' },
            investimento:{ emoji:'📈', label:'Investimento',cor:'#14b8a6' },
            outros:      { emoji:'🏷️', label:'Outros',      cor:'#94a3b8' },
        };
        return mapa[cat] || mapa.outros;
    },

    inferirCat: (desc) => {
        const d = desc.toLowerCase();
        if (/(uber|99|onibus|passagem|gasolina|estac|voo|combustivel)/.test(d)) return 'transporte';
        if (/(ifood|burger|pizza|mercado|padaria|restaurante|lanche|açai|sushi|delivery)/.test(d)) return 'alimentacao';
        if (/(netflix|spotify|internet|luz|agua|aluguel|condominio|energia)/.test(d)) return 'moradia';
        if (/(cinema|festa|show|ingresso|cerveja|bar|balada|teatro)/.test(d)) return 'lazer';
        if (/(farmacia|remedio|médico|consulta|plano de saude|dentist)/.test(d)) return 'saude';
        if (/(viagem|hotel|hostel|airbnb|booking|passagem aerea)/.test(d)) return 'viagem';
        if (/(curso|faculdade|livro|escola|mensalidade)/.test(d)) return 'educacao';
        if (/(roupa|sapato|calca|camisa|vestido|tenis)/.test(d)) return 'vestuario';
        if (/(salario|pagamento|freelance|renda|comissao)/.test(d)) return 'salario';
        return 'outros';
    }
};

// ============================================================
// UI — HELPERS VISUAIS
// ============================================================
const UI = {
    abrirModal: (id) => {
        document.getElementById(id)?.classList.add('ativa');
    },
    fecharModal: (id) => {
        document.getElementById(id)?.classList.remove('ativa');
        document.querySelector(`#${id} form`)?.reset();
    },

    toast: (titulo, corpo = '', tipo = 'sucesso') => {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const icones = { sucesso: 'fa-check-circle', erro: 'fa-circle-exclamation', aviso: 'fa-triangle-exclamation', info: 'fa-circle-info' };
        const t = document.createElement('div');
        t.className = `toast ${tipo}`;
        t.innerHTML = `
            <div class="toast-icon"><i class="fa-solid ${icones[tipo] || icones.info}"></i></div>
            <div class="toast-msg">
                <div class="toast-title">${titulo}</div>
                ${corpo ? `<div class="toast-body">${corpo}</div>` : ''}
            </div>`;
        container.appendChild(t);
        setTimeout(() => {
            t.classList.add('saindo');
            setTimeout(() => t.remove(), 300);
        }, 3500);
    },

    // Alias para código legado
    mostrarToast: (msg, tipo = 'sucesso') => UI.toast(msg, '', tipo),

    setupNav: () => {
        document.querySelectorAll('.nav-item[data-alvo]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                navegarPara(item.getAttribute('data-alvo'));
                // fecha sidebar no mobile
                fecharSidebar();
            });
        });
    },

    atualizarNomes: () => {
        // Selectboxes de responsável nos modais
        const p1 = Estado.nome1, p2 = Estado.nome2;
        ['fin-resp-p1','edit-fin-resp-p1','rel-p1-opt'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = p1;
        });
        ['fin-resp-p2','edit-fin-resp-p2','rel-p2-opt'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = p2;
        });
        document.getElementById('rel-col-p1') && (document.getElementById('rel-col-p1').textContent = p1);
        document.getElementById('rel-col-p2') && (document.getElementById('rel-col-p2').textContent = p2);
        // Avatares do split
        document.getElementById('split-nome1') && (document.getElementById('split-nome1').textContent = p1);
        document.getElementById('split-nome2') && (document.getElementById('split-nome2').textContent = p2);
        document.getElementById('split-av1')   && (document.getElementById('split-av1').textContent   = Utils.inicial(p1));
        document.getElementById('split-av2')   && (document.getElementById('split-av2').textContent   = Utils.inicial(p2));
    }
};

// ============================================================
// NAVEGAÇÃO
// ============================================================
function navegarPara(alvo) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('ativo'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('ativa'));
    const navItem = document.querySelector(`.nav-item[data-alvo="${alvo}"]`);
    if (navItem) navItem.classList.add('ativo');
    const view = document.getElementById(alvo);
    if (view) view.classList.add('ativa');

    // Triggers específicos por view
    if (alvo === 'dashboard')  Render.dashboard();
    if (alvo === 'financas')   Render.financas();
    if (alvo === 'metas')      Render.metas();
    if (alvo === 'viagens')    Render.viagens();
    if (alvo === 'checklist')  Render.checklist();
    if (alvo === 'relatorios') Relatorios.atualizar();
}

function abrirSidebar() {
    document.getElementById('sidebar')?.classList.add('aberta');
    document.getElementById('sidebar-overlay')?.classList.add('ativo');
}
function fecharSidebar() {
    document.getElementById('sidebar')?.classList.remove('aberta');
    document.getElementById('sidebar-overlay')?.classList.remove('ativo');
}
function toggleTema() {
    const html  = document.documentElement;
    const atual = html.getAttribute('data-theme');
    const novo  = atual === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', novo);
    localStorage.setItem('pd-tema', novo);
    const icon = document.getElementById('btn-tema')?.querySelector('i');
    const mIcon = document.getElementById('mobile-tema-icon');
    if (icon)  icon.className  = novo === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    if (mIcon) mIcon.className = novo === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    Charts.destruirTodos();
    setTimeout(() => Charts.renderizarTodos(), 50);
}

// ============================================================
// AUTENTICAÇÃO
// ============================================================
const Auth = {
    iniciarObserver: () => {
        auth.onAuthStateChanged((user) => {
            const path      = window.location.pathname;
            const isApp     = path.includes('app.html');
            const isAuth    = path.includes('auth.html');
            const isLanding = !isApp && !isAuth;

            if (user) {
                Estado.usuarioUid   = user.uid;
                Estado.usuarioEmail = user.email;

                if (isAuth || isLanding) {
                    window.location.href = 'app.html';
                    return;
                }

                if (isApp) {
                    // Entra direto sem esperar Firestore — carrega dados em paralelo
                    Auth._entrarNoApp(user);
                }
            } else {
                if (isApp) {
                    window.location.href = 'auth.html';
                }
            }
        });
    },

    _entrarNoApp: (user) => {
        // Sidebar: nome + inicial
        const nome = Estado.nomeUsuario || user.displayName || user.email.split('@')[0];
        Estado.nomeUsuario = nome;
        document.getElementById('sidebar-user-name').textContent = nome;
        document.getElementById('sidebar-avatar').textContent    = Utils.inicial(nome);

        // Atualizar nomes nos selects
        UI.atualizarNomes();

        // Popular select de mês nas finanças
        Render.popularSelectMes();

        // Carregar cache local primeiro (offline-first)
        DB.carregarCache();

        // Ouvir Firestore em tempo real
        DB.ouvirNuvem();

        // Esconder loader
        Auth._esconderLoader();
        const app = document.getElementById('tela-app');
        if (app) app.style.opacity = '1';

        // Restaurar tema salvo
        const temaSalvo = localStorage.getItem('pd-tema');
        if (temaSalvo) {
            document.documentElement.setAttribute('data-theme', temaSalvo);
            const icon = document.getElementById('btn-tema')?.querySelector('i');
            if (icon) icon.className = temaSalvo === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        }

        // Iniciar navegação
        UI.setupNav();
        Render.tudo();
    },

    _esconderLoader: () => {
        const loader = document.getElementById('loader-tela');
        if (loader) {
            loader.classList.add('saindo');
            setTimeout(() => { loader.style.display = 'none'; }, 500);
        }
        const app = document.getElementById('tela-app');
        if (app) app.style.opacity = '1';
    },

    _bloquear: () => {
        auth.signOut();
        alert('Acesso não autorizado. Este sistema é exclusivo para Tiago & Yasmin.');
        window.location.href = 'auth.html';
    },

    _criarDocCasal: async (user) => {
        // Primeiro acesso — cria o documento compartilhado do casal.
        // O nome da pessoa 1 vem do e-mail (pode ser atualizado depois).
        const nomeInferido = user.displayName || user.email.split('@')[0];
        Estado.nomeUsuario = nomeInferido;
        Estado.nome1 = nomeInferido;
        Estado.nome2 = 'Parceiro(a)';
        await db.collection('casais').doc(CASAL_DOC_ID).set({
            nome1: Estado.nome1,
            nome2: Estado.nome2,
            membros: { [user.email]: Estado.nome1 },
            viagens: [], financas: [], metas: [], checklist: [],
            criadoEm: new Date().toISOString()
        });
    },

    logout: () => {
        if (!confirm('Deseja encerrar a sessão?')) return;
        if (Estado.unsubscribe) Estado.unsubscribe();
        localStorage.removeItem('pd-cache');
        auth.signOut().then(() => window.location.href = 'auth.html');
    }
};

// ============================================================
// BANCO DE DADOS (FIRESTORE)
// ============================================================
const DB = {
    carregarCache: () => {
        try {
            const raw = localStorage.getItem('pd-cache');
            if (!raw) return;
            const dados = JSON.parse(raw);
            Estado.viagens   = dados.viagens   || [];
            Estado.financas  = dados.financas  || [];
            Estado.metas     = dados.metas     || [];
            Estado.checklist = dados.checklist || [];
            if (dados.nome1) Estado.nome1 = dados.nome1;
            if (dados.nome2) Estado.nome2 = dados.nome2;
        } catch {}
    },

    ouvirNuvem: () => {
        if (Estado.unsubscribe) Estado.unsubscribe();
        Estado.unsubscribe = db.collection('casais').doc(CASAL_DOC_ID)
            .onSnapshot((doc) => {
                if (!doc.exists) {
                    // Documento não existe — cria automaticamente
                    DB._criarDocInicial();
                    return;
                }
                const dados = doc.data();
                Estado.viagens   = dados.viagens   || [];
                Estado.financas  = dados.financas  || [];
                Estado.metas     = dados.metas     || [];
                Estado.checklist = dados.checklist || [];
                if (dados.nome1) {
                    Estado.nome1 = dados.nome1;
                    // Atualiza nome do usuário logado pelo campo membros
                    if (dados.membros && dados.membros[Estado.usuarioEmail]) {
                        Estado.nomeUsuario = dados.membros[Estado.usuarioEmail];
                        const elNome = document.getElementById('sidebar-user-name');
                        const elAv   = document.getElementById('sidebar-avatar');
                        if (elNome) elNome.textContent = Estado.nomeUsuario;
                        if (elAv)   elAv.textContent   = Utils.inicial(Estado.nomeUsuario);
                    }
                }
                if (dados.nome2) Estado.nome2 = dados.nome2;
                UI.atualizarNomes();
                localStorage.setItem('pd-cache', JSON.stringify(dados));
                Render.tudo();
            }, (err) => {
                console.warn('Firestore onSnapshot erro:', err.code, err.message);
                // Não trava o app — continua com dados do cache
            });
    },

    _criarDocInicial: async () => {
        try {
            await db.collection('casais').doc(CASAL_DOC_ID).set({
                nome1: Estado.nome1,
                nome2: Estado.nome2,
                membros: { [Estado.usuarioEmail]: Estado.nomeUsuario },
                viagens: [], financas: [], metas: [], checklist: [],
                criadoEm: new Date().toISOString()
            });
        } catch (e) {
            console.warn('Não foi possível criar doc inicial:', e.message);
        }
    },

    salvar: async (campo) => {
        try {
            await db.collection('casais').doc(CASAL_DOC_ID)
                .set({ [campo]: Estado[campo] }, { merge: true });
        } catch (err) {
            UI.toast('Erro ao salvar', err.message, 'erro');
        }
    },

    salvarVarios: async (campos) => {
        const payload = {};
        campos.forEach(c => payload[c] = Estado[c]);
        try {
            await db.collection('casais').doc(CASAL_DOC_ID).set(payload, { merge: true });
        } catch (err) {
            UI.toast('Erro ao salvar', err.message, 'erro');
        }
    }
};

// ============================================================
// CONTROLADORES — CRUD
// ============================================================
const Controladores = {

    // ── Finanças ────────────────────────────────────────────
    adicionarFinanca: () => {
        const tipo  = document.getElementById('fin-tipo').value;
        const resp  = document.getElementById('fin-resp').value;
        const desc  = document.getElementById('fin-desc').value.trim();
        const valor = parseFloat(document.getElementById('fin-valor').value);
        const data  = document.getElementById('fin-data').value;
        const cat   = document.getElementById('fin-categoria').value || Utils.inferirCat(desc);
        const obs   = document.getElementById('fin-obs')?.value.trim() || '';

        if (!desc || !valor || !data) return UI.toast('Preencha todos os campos', '', 'aviso');

        Estado.financas.push({ id: Utils.id(), tipo, resp, desc, valor, data, cat, obs });
        DB.salvar('financas');
        UI.fecharModal('modal-financa');
        UI.toast('Transação registrada!', `${Utils.catInfo(cat).emoji} ${desc} — ${Utils.moeda(valor)}`);
        Render.financas();
        Render.dashboard();
    },

    editarFinanca: (id) => {
        const f = Estado.financas.find(f => f.id === id);
        if (!f) return;
        document.getElementById('edit-fin-id').value          = f.id;
        document.getElementById('edit-fin-tipo').value        = f.tipo;
        document.getElementById('edit-fin-resp').value        = f.resp;
        document.getElementById('edit-fin-desc').value        = f.desc;
        document.getElementById('edit-fin-valor').value       = f.valor;
        document.getElementById('edit-fin-data').value        = f.data;
        document.getElementById('edit-fin-categoria').value   = f.cat || 'outros';
        UI.abrirModal('modal-editar-financa');
    },

    salvarEdicaoFinanca: () => {
        const id  = document.getElementById('edit-fin-id').value;
        const idx = Estado.financas.findIndex(f => f.id === id);
        if (idx === -1) return;
        Estado.financas[idx] = {
            ...Estado.financas[idx],
            tipo:  document.getElementById('edit-fin-tipo').value,
            resp:  document.getElementById('edit-fin-resp').value,
            desc:  document.getElementById('edit-fin-desc').value.trim(),
            valor: parseFloat(document.getElementById('edit-fin-valor').value),
            data:  document.getElementById('edit-fin-data').value,
            cat:   document.getElementById('edit-fin-categoria').value,
        };
        DB.salvar('financas');
        UI.fecharModal('modal-editar-financa');
        UI.toast('Transação atualizada!', '', 'sucesso');
    },

    // ── Viagens ─────────────────────────────────────────────
    adicionarViagem: () => {
        const destino  = document.getElementById('v-destino').value.trim();
        const emoji    = document.getElementById('v-emoji').value.trim() || '✈️';
        const ida      = document.getElementById('v-ida').value;
        const volta    = document.getElementById('v-volta').value;
        const orcamento= parseFloat(document.getElementById('v-orcamento').value) || 0;
        const tipo     = document.getElementById('v-tipo').value;
        const link     = document.getElementById('v-link').value.trim();
        const notas    = document.getElementById('v-notas').value.trim();

        if (!destino || !ida || !volta) return UI.toast('Preencha destino e datas', '', 'aviso');

        Estado.viagens.push({ id: Utils.id(), destino, emoji, ida, volta, orcamento, tipo, link, notas, gastos: 0 });
        DB.salvar('viagens');
        UI.fecharModal('modal-viagem');
        UI.toast('Viagem salva!', `${emoji} ${destino}`, 'sucesso');
    },

    abrirDetalheViagem: (id) => {
        const v = Estado.viagens.find(v => v.id === id);
        if (!v) return;
        document.getElementById('detalhe-titulo').textContent = `${v.emoji || '✈️'} ${v.destino}`;
        document.getElementById('detalhe-datas').textContent  = `${Utils.data(v.ida)} → ${Utils.data(v.volta)}`;

        // Despesas desta viagem
        const gastosDaViagem = Estado.financas
            .filter(f => f.tipo === 'despesa' && f.cat === 'viagem')
            .reduce((s, f) => s + f.valor, 0);

        const pct = v.orcamento > 0 ? Math.min(100, Math.round((v.gastos || 0) / v.orcamento * 100)) : 0;

        document.getElementById('modal-viagem-detalhe-body').innerHTML = `
            <div class="form-group">
                <div class="form-row">
                    <div>
                        <div class="form-label">Tipo</div>
                        <span class="badge badge-viagem">${v.tipo || '—'}</span>
                    </div>
                    <div>
                        <div class="form-label">Orçamento</div>
                        <strong style="color:var(--brand-emerald)">${Utils.moeda(v.orcamento)}</strong>
                    </div>
                </div>
            </div>
            ${v.link ? `<div class="form-group"><a href="${v.link}" target="_blank" class="btn btn-ghost btn-sm"><i class="fa-solid fa-arrow-up-right-from-square"></i> Acessar Reserva</a></div>` : ''}
            ${v.notas ? `<div class="form-group"><div class="form-label">Notas / Roteiro</div><div style="background:var(--surface-alt);padding:14px;border-radius:var(--r-lg);font-size:.875rem;white-space:pre-wrap;border:1px solid var(--border)">${v.notas}</div></div>` : ''}
            <div style="margin-top:16px;display:flex;gap:10px;justify-content:flex-end">
                <button class="btn btn-danger btn-sm" onclick="Controladores.deletar('viagens','${v.id}');UI.fecharModal('modal-viagem-detalhe')">
                    <i class="fa-solid fa-trash"></i> Excluir
                </button>
            </div>`;
        UI.abrirModal('modal-viagem-detalhe');
    },

    // ── Metas ───────────────────────────────────────────────
    adicionarMeta: () => {
        const titulo = document.getElementById('meta-titulo').value.trim();
        const emoji  = document.getElementById('meta-emoji').value.trim() || '🎯';
        const cat    = document.getElementById('meta-cat').value;
        const alvo   = parseFloat(document.getElementById('meta-alvo').value);
        const atual  = parseFloat(document.getElementById('meta-atual').value) || 0;
        const prazo  = document.getElementById('meta-prazo').value;
        const desc   = document.getElementById('meta-desc')?.value.trim() || '';

        if (!titulo || !alvo) return UI.toast('Preencha título e valor alvo', '', 'aviso');

        Estado.metas.push({ id: Utils.id(), titulo, emoji, cat, alvo, atual, prazo, desc });
        DB.salvar('metas');
        UI.fecharModal('modal-meta');
        UI.toast('Meta criada!', `${emoji} ${titulo} — Alvo: ${Utils.moeda(alvo)}`, 'sucesso');
    },

    depositarMeta: () => {
        const id    = document.getElementById('deposito-meta-id').value;
        const valor = parseFloat(document.getElementById('deposito-valor').value);
        if (!valor || valor <= 0) return UI.toast('Informe um valor válido', '', 'aviso');

        const idx = Estado.metas.findIndex(m => m.id === id);
        if (idx === -1) return;
        Estado.metas[idx].atual = (Estado.metas[idx].atual || 0) + valor;
        if (Estado.metas[idx].atual >= Estado.metas[idx].alvo) {
            UI.toast('🎉 Meta concluída!', `${Estado.metas[idx].titulo} — Parabéns!`, 'sucesso');
        } else {
            UI.toast('Guardado no cofrinho!', `+${Utils.moeda(valor)}`, 'sucesso');
        }
        DB.salvar('metas');
        UI.fecharModal('modal-meta-deposito');
        Render.metas();
        Render.dashboard();
    },

    abrirDeposito: (id) => {
        const m = Estado.metas.find(m => m.id === id);
        if (!m) return;
        document.getElementById('deposito-meta-id').value    = id;
        document.getElementById('deposito-meta-nome').textContent = `${m.emoji} ${m.titulo}`;
        document.getElementById('deposito-valor').value = '';
        UI.abrirModal('modal-meta-deposito');
    },

    // ── Deletar genérico ─────────────────────────────────────
    deletar: (colecao, id) => {
        if (!confirm('Excluir permanentemente?')) return;
        Estado[colecao] = Estado[colecao].filter(i => i.id !== id);
        DB.salvar(colecao);
        Render.tudo();
        UI.toast('Item excluído.', '', 'info');
    }
};

// ============================================================
// BUSCA DE VIAGENS
// ============================================================
const ServicoBusca = {
    redirecionar: (plataforma) => {
        const origem    = document.getElementById('busca-origem').value.trim();
        const destino   = document.getElementById('busca-destino').value.trim();
        const dataIda   = document.getElementById('busca-data-ida').value;
        const dataVolta = document.getElementById('busca-data-volta').value;
        const pax       = document.getElementById('busca-passageiros').value;

        if (!destino) return UI.toast('Informe o destino', '', 'aviso');

        const oE = encodeURIComponent(origem);
        const dE = encodeURIComponent(destino);
        const oS = Utils.slug(origem);
        const dS = Utils.slug(destino);
        let url  = '';

        // Converte YYYY-MM-DD → DD-MM-YYYY (para plataformas que exigem)
        const toddmmyyyy = (s) => { if (!s) return ''; const [a,m,d] = s.split('-'); return `${d}-${m}-${a}`; };

        switch (plataforma) {

            /* ── Voos ────────────────────────────────────────────────
               Google Flights: motor completo com origem + destino.
               Azul / GOL / LATAM: não expõem deep-link público estável
               por cidade — abrem a homepage de cada companhia para que
               o usuário complete a busca lá. ─────────────────────── */

            case 'googleflights':
                // Motor completo: origem, destino, ida, volta, passageiros
                url = `https://www.google.com/travel/flights/search?q=voos+de+${oE}+para+${dE}`;
                break;

            case 'azul':
                // Abre a Azul diretamente — sem deep-link público por cidade
                url = `https://www.voeazul.com.br`;
                break;

            case 'gol':
                // Abre a GOL diretamente — sem deep-link público por cidade
                url = `https://www.voegol.com.br`;
                break;

            case 'latam':
                // LATAM aceita parâmetros origin/destination/datas na URL
                url = `https://www.latamairlines.com/br/pt/oferta-voos`
                    + `?origin=${oE}&destination=${dE}`
                    + `&outbound=${dataIda || ''}&inbound=${dataVolta || ''}`
                    + `&adt=${pax}&chd=0&inf=0&trip=RT&cabin=Y&redemption=false`;
                break;

            /* ── Hospedagem ──────────────────────────────────────────
               Airbnb e Booking: motor completo com destino + datas. ── */

            case 'airbnb':
                url = `https://www.airbnb.com.br/s/${dE}/homes?adults=${pax}`;
                if (dataIda)   url += `&checkin=${dataIda}`;
                if (dataVolta) url += `&checkout=${dataVolta}`;
                break;

            case 'booking':
                url = `https://www.booking.com/searchresults.pt-br.html?ss=${dE}&group_adults=${pax}`;
                if (dataIda)   url += `&checkin=${dataIda}`;
                if (dataVolta) url += `&checkout=${dataVolta}`;
                break;

            /* ── Ônibus ──────────────────────────────────────────────
               Buser: rota via slug, data YYYY-MM-DD.
               ClickBus: rota via slug, data DD-MM-YYYY. ──────────── */

            case 'buser':
                url = `https://www.buser.com.br/onibus/${oS}/${dS}`;
                if (dataIda) url += `?data=${dataIda}`;
                break;

            case 'clickbus':
                url = `https://www.clickbus.com.br/passagem-de-onibus/${oS}/${dS}`;
                if (dataIda) url += `?departureDate=${toddmmyyyy(dataIda)}`;
                if (dataVolta) url += `&returnDate=${toddmmyyyy(dataVolta)}`;
                break;

            /* ── Descoberta ──────────────────────────────────────────
               Maps e TripAdvisor: busca por nome do destino. ─────── */

            case 'maps':
                url = `https://www.google.com/maps/search/${dE}`;
                break;

            case 'tripadvisor':
                url = `https://www.tripadvisor.com.br/Search?q=${dE}`;
                break;
        }
        if (url) window.open(url, '_blank');
    }
};

// ============================================================
// CHECKLIST
// ============================================================
const TEMPLATES = {
    praia: [
        { texto:'Passaporte / RG',      cat:'documentos' },
        { texto:'Passagens',             cat:'documentos' },
        { texto:'Reserva do hotel',      cat:'documentos' },
        { texto:'Protetor solar',        cat:'higiene' },
        { texto:'Óculos de sol',         cat:'outros' },
        { texto:'Biquíni / Sunga',       cat:'roupas' },
        { texto:'Toalha de praia',       cat:'roupas' },
        { texto:'Chinelo',               cat:'roupas' },
        { texto:'Câmera / carregador',   cat:'tecnologia' },
        { texto:'Repelente',             cat:'saude' },
    ],
    internacional: [
        { texto:'Passaporte válido',        cat:'documentos' },
        { texto:'Visto (se necessário)',     cat:'documentos' },
        { texto:'Seguro viagem',             cat:'documentos' },
        { texto:'Cartão de crédito internacional', cat:'documentos' },
        { texto:'Adaptador de tomada',       cat:'tecnologia' },
        { texto:'Celular desbloqueado',      cat:'tecnologia' },
        { texto:'Carregadores',              cat:'tecnologia' },
        { texto:'Remédios essenciais',       cat:'saude' },
        { texto:'Roupas para o frio/calor',  cat:'roupas' },
        { texto:'Mala pesada ≤ 23kg',        cat:'outros' },
    ],
    mochilao: [
        { texto:'Mochila 40-60L',            cat:'outros' },
        { texto:'Documentos + cópias',       cat:'documentos' },
        { texto:'Roupas leves e versáteis',  cat:'roupas' },
        { texto:'Kit primeiros socorros',    cat:'saude' },
        { texto:'Canivete / faca (no bagageiro)', cat:'outros' },
        { texto:'Cabo universal',            cat:'tecnologia' },
        { texto:'Powerbank',                 cat:'tecnologia' },
        { texto:'Cadeado p/ mochila',        cat:'outros' },
        { texto:'Sandália de borracha',      cat:'roupas' },
        { texto:'Saco de dormir leve',       cat:'outros' },
    ],
    cruzeiro: [
        { texto:'Passaporte',                cat:'documentos' },
        { texto:'Voucher do cruzeiro',       cat:'documentos' },
        { texto:'Cartão do plano de saúde',  cat:'documentos' },
        { texto:'Roupas formais (jantar)',    cat:'roupas' },
        { texto:'Fantasia (festa temática)',  cat:'roupas' },
        { texto:'Protetor solar SPF 50+',    cat:'higiene' },
        { texto:'Remédio para enjoo',        cat:'saude' },
        { texto:'Câmera à prova d`água',     cat:'tecnologia' },
        { texto:'Óculos de sol',             cat:'outros' },
        { texto:'Dinheiro em espécie',       cat:'documentos' },
    ]
};

const Checklist = {
    adicionar: () => {
        const texto = document.getElementById('check-item-texto').value.trim();
        const cat   = document.getElementById('check-item-cat').value;
        if (!texto) return UI.toast('Digite o item', '', 'aviso');
        Estado.checklist.push({ id: Utils.id(), texto, cat, feito: false });
        DB.salvar('checklist');
        UI.fecharModal('modal-checklist-item');
        UI.toast('Item adicionado!', '', 'sucesso');
        Render.checklist();
    },

    toggle: (id) => {
        const idx = Estado.checklist.findIndex(c => c.id === id);
        if (idx === -1) return;
        Estado.checklist[idx].feito = !Estado.checklist[idx].feito;
        DB.salvar('checklist');
        Render.checklist();
    },

    remover: (id) => {
        Estado.checklist = Estado.checklist.filter(c => c.id !== id);
        DB.salvar('checklist');
        Render.checklist();
    },

    marcarTodos: () => {
        Estado.checklist.forEach(c => c.feito = true);
        DB.salvar('checklist');
        Render.checklist();
    },

    desmarcarTodos: () => {
        Estado.checklist.forEach(c => c.feito = false);
        DB.salvar('checklist');
        Render.checklist();
    },

    limpar: () => {
        if (!confirm('Limpar todo o checklist?')) return;
        Estado.checklist = [];
        DB.salvar('checklist');
        Render.checklist();
    },

    aplicarTemplate: (nome) => {
        if (!confirm(`Adicionar template "${nome}" ao checklist atual?`)) return;
        const itens = TEMPLATES[nome] || [];
        itens.forEach(i => Estado.checklist.push({ id: Utils.id(), texto: i.texto, cat: i.cat, feito: false }));
        DB.salvar('checklist');
        Render.checklist();
        UI.toast(`Template "${nome}" aplicado!`, `${itens.length} itens adicionados`, 'sucesso');
    }
};

// ============================================================
// EXPORTAÇÃO
// ============================================================
const Exportacao = {
    gerarCSV: () => {
        if (!Estado.financas.length) return UI.toast('Sem dados para exportar', '', 'aviso');
        const cab  = 'Data,Descrição,Responsável,Tipo,Categoria,Valor\n';
        const rows = Estado.financas
            .sort((a,b) => new Date(b.data) - new Date(a.data))
            .map(f => `${f.data},"${f.desc}",${f.resp},${f.tipo},${f.cat || ''},${f.valor}`)
            .join('\n');
        const blob = new Blob([cab + rows], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `plannerduo_${Date.now()}.csv`;
        a.click();
        UI.toast('CSV exportado!', '', 'sucesso');
    },

    gerarPDF: () => {
        window.print();
    }
};

// ============================================================
// CHARTS
// ============================================================
const _charts = {};
const Charts = {
    destruirTodos: () => {
        Object.keys(_charts).forEach(k => { try { _charts[k].destroy(); delete _charts[k]; } catch {} });
    },

    renderizarTodos: () => {
        Charts.fluxo();
        Charts.categorias();
        Charts.responsavel();
        Charts.catFin();
        Relatorios.atualizar();
    },

    _cores: (n) => {
        const paleta = ['#2563eb','#f97316','#10b981','#f43f5e','#8b5cf6','#f59e0b','#06b6d4','#ec4899','#14b8a6','#a855f7','#22c55e','#94a3b8'];
        return Array.from({ length: n }, (_, i) => paleta[i % paleta.length]);
    },

    _dark: () => document.documentElement.getAttribute('data-theme') === 'dark',

    _gridColor: () => Charts._dark() ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    _textColor: () => Charts._dark() ? '#94a3b8' : '#64748b',

    _ultimos6Meses: () => {
        const meses = [];
        const hoje  = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
            meses.push({ mes: d.getMonth(), ano: d.getFullYear(), label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }) });
        }
        return meses;
    },

    fluxo: () => {
        const ctx = document.getElementById('chart-fluxo')?.getContext('2d');
        if (!ctx) return;
        if (_charts.fluxo) _charts.fluxo.destroy();

        const meses = Charts._ultimos6Meses();
        const receitas  = meses.map(m => Estado.financas.filter(f => { const d = new Date(f.data+'T12:00:00'); return f.tipo==='receita' && d.getMonth()===m.mes && d.getFullYear()===m.ano; }).reduce((s,f)=>s+f.valor,0));
        const despesas  = meses.map(m => Estado.financas.filter(f => { const d = new Date(f.data+'T12:00:00'); return f.tipo==='despesa' && d.getMonth()===m.mes && d.getFullYear()===m.ano; }).reduce((s,f)=>s+f.valor,0));

        _charts.fluxo = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: meses.map(m => m.label),
                datasets: [
                    { label:'Receitas', data: receitas, backgroundColor: 'rgba(16,185,129,.75)', borderRadius: 6, borderSkipped: false },
                    { label:'Despesas', data: despesas, backgroundColor: 'rgba(244,63,94,.75)',  borderRadius: 6, borderSkipped: false }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { color: Charts._textColor(), font: { size: 11 } } } },
                scales: {
                    x: { grid: { color: Charts._gridColor() }, ticks: { color: Charts._textColor() } },
                    y: { grid: { color: Charts._gridColor() }, ticks: { color: Charts._textColor(), callback: v => 'R$' + (v/1000).toFixed(1)+'k' } }
                }
            }
        });
    },

    categorias: () => {
        const ctx = document.getElementById('chart-categorias')?.getContext('2d');
        if (!ctx) return;
        if (_charts.categorias) _charts.categorias.destroy();

        const agrupado = {};
        Estado.financas.filter(f => f.tipo === 'despesa').forEach(f => {
            const c = f.cat || Utils.inferirCat(f.desc);
            agrupado[c] = (agrupado[c] || 0) + f.valor;
        });
        const labels = Object.keys(agrupado).map(c => Utils.catInfo(c).emoji + ' ' + Utils.catInfo(c).label);
        const data   = Object.values(agrupado);

        _charts.categorias = new Chart(ctx, {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: Charts._cores(data.length), borderWidth: 2, borderColor: Charts._dark() ? '#1a2235' : '#fff' }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { color: Charts._textColor(), font: { size: 11 }, padding: 10 } } }
            }
        });
    },

    responsavel: () => {
        const ctx = document.getElementById('chart-responsavel')?.getContext('2d');
        if (!ctx) return;
        if (_charts.responsavel) _charts.responsavel.destroy();

        const mes   = new Date().getMonth();
        const ano   = new Date().getFullYear();
        const f1    = Estado.financas.filter(f => { const d=new Date(f.data+'T12:00:00'); return f.tipo==='despesa' && f.resp===Estado.nome1 && d.getMonth()===mes && d.getFullYear()===ano; }).reduce((s,f)=>s+f.valor,0);
        const f2    = Estado.financas.filter(f => { const d=new Date(f.data+'T12:00:00'); return f.tipo==='despesa' && f.resp===Estado.nome2 && d.getMonth()===mes && d.getFullYear()===ano; }).reduce((s,f)=>s+f.valor,0);

        _charts.responsavel = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [Estado.nome1, Estado.nome2],
                datasets: [{ data: [f1, f2], backgroundColor: ['rgba(37,99,235,.8)', 'rgba(249,115,22,.8)'], borderRadius: 8, borderSkipped: false }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: Charts._gridColor() }, ticks: { color: Charts._textColor(), callback: v => 'R$'+v } },
                    y: { grid: { display: false }, ticks: { color: Charts._textColor(), font: { weight: '600' } } }
                }
            }
        });
    },

    catFin: () => {
        const ctx = document.getElementById('chart-cat-fin')?.getContext('2d');
        if (!ctx) return;
        if (_charts.catFin) _charts.catFin.destroy();

        const mes = new Date().getMonth(), ano = new Date().getFullYear();
        const agrupado = {};
        Estado.financas.filter(f => { const d=new Date(f.data+'T12:00:00'); return f.tipo==='despesa' && d.getMonth()===mes && d.getFullYear()===ano; }).forEach(f => {
            const c = f.cat || Utils.inferirCat(f.desc);
            agrupado[c] = (agrupado[c] || 0) + f.valor;
        });
        const labels = Object.keys(agrupado).map(c => Utils.catInfo(c).emoji + ' ' + Utils.catInfo(c).label);
        const data   = Object.values(agrupado);

        _charts.catFin = new Chart(ctx, {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: Charts._cores(data.length), borderWidth: 2, borderColor: Charts._dark() ? '#1a2235' : '#fff' }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { color: Charts._textColor(), font: { size: 11 }, padding: 8 } } }
            }
        });
    }
};

// ============================================================
// RELATÓRIOS
// ============================================================
const Relatorios = {
    atualizar: () => {
        const periodo = parseInt(document.getElementById('rel-periodo')?.value || 6);
        const pessoa  = document.getElementById('rel-pessoa')?.value || 'todos';

        // Gera meses
        const meses = [];
        const hoje  = new Date();
        for (let i = periodo - 1; i >= 0; i--) {
            const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
            meses.push({ mes: d.getMonth(), ano: d.getFullYear(), label: d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) });
        }

        const filtrarF = (f) => {
            if (pessoa === 'p1' && f.resp !== Estado.nome1) return false;
            if (pessoa === 'p2' && f.resp !== Estado.nome2) return false;
            return true;
        };

        // Tabela
        const tbody = document.getElementById('rel-tbody');
        if (tbody) {
            tbody.innerHTML = meses.map(m => {
                const fin = Estado.financas.filter(f => { const d=new Date(f.data+'T12:00:00'); return d.getMonth()===m.mes && d.getFullYear()===m.ano && filtrarF(f); });
                const rec = fin.filter(f=>f.tipo==='receita').reduce((s,f)=>s+f.valor,0);
                const dep = fin.filter(f=>f.tipo==='despesa').reduce((s,f)=>s+f.valor,0);
                const sal = rec - dep;
                const p1  = fin.filter(f=>f.tipo==='despesa'&&f.resp===Estado.nome1).reduce((s,f)=>s+f.valor,0);
                const p2  = fin.filter(f=>f.tipo==='despesa'&&f.resp===Estado.nome2).reduce((s,f)=>s+f.valor,0);
                return `<tr>
                    <td><strong>${m.label}</strong></td>
                    <td class="text-success fw-600">${Utils.moeda(rec)}</td>
                    <td class="text-danger  fw-600">${Utils.moeda(dep)}</td>
                    <td class="${sal>=0?'text-success':'text-danger'} fw-bold">${Utils.moeda(sal)}</td>
                    <td>${Utils.moeda(p1)}</td>
                    <td>${Utils.moeda(p2)}</td>
                </tr>`;
            }).join('');
        }

        // Gráfico evolução
        const ctxEv = document.getElementById('chart-rel-evolucao')?.getContext('2d');
        if (ctxEv) {
            if (_charts.relEvolucao) _charts.relEvolucao.destroy();
            const deps = meses.map(m => Estado.financas.filter(f=>{ const d=new Date(f.data+'T12:00:00'); return f.tipo==='despesa' && d.getMonth()===m.mes && d.getFullYear()===m.ano && filtrarF(f); }).reduce((s,f)=>s+f.valor,0));
            const recs = meses.map(m => Estado.financas.filter(f=>{ const d=new Date(f.data+'T12:00:00'); return f.tipo==='receita' && d.getMonth()===m.mes && d.getFullYear()===m.ano && filtrarF(f); }).reduce((s,f)=>s+f.valor,0));
            _charts.relEvolucao = new Chart(ctxEv, {
                type: 'line',
                data: {
                    labels: meses.map(m=>m.label),
                    datasets: [
                        { label:'Receitas', data:recs, borderColor:'#10b981', backgroundColor:'rgba(16,185,129,.1)', tension:.4, fill:true, pointRadius:4 },
                        { label:'Despesas', data:deps, borderColor:'#f43f5e', backgroundColor:'rgba(244,63,94,.1)',  tension:.4, fill:true, pointRadius:4 }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: Charts._textColor(), font:{size:11} } } },
                    scales: {
                        x: { grid:{color:Charts._gridColor()}, ticks:{color:Charts._textColor()} },
                        y: { grid:{color:Charts._gridColor()}, ticks:{color:Charts._textColor(), callback:v=>'R$'+(v/1000).toFixed(1)+'k'} }
                    }
                }
            });
        }

        // Gráfico categorias
        const ctxCat = document.getElementById('chart-rel-categorias')?.getContext('2d');
        if (ctxCat) {
            if (_charts.relCat) _charts.relCat.destroy();
            const agrupado = {};
            Estado.financas.filter(f => {
                const d = new Date(f.data+'T12:00:00');
                const limit = new Date(hoje.getFullYear(), hoje.getMonth() - periodo + 1, 1);
                return f.tipo==='despesa' && d >= limit && filtrarF(f);
            }).forEach(f => {
                const c = f.cat || Utils.inferirCat(f.desc);
                agrupado[c] = (agrupado[c]||0) + f.valor;
            });
            const labels = Object.keys(agrupado).map(c => Utils.catInfo(c).emoji+' '+Utils.catInfo(c).label);
            const data   = Object.values(agrupado);
            _charts.relCat = new Chart(ctxCat, {
                type: 'doughnut',
                data: { labels, datasets: [{ data, backgroundColor: Charts._cores(data.length), borderWidth:2, borderColor: Charts._dark()?'#1a2235':'#fff' }] },
                options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'right', labels:{ color:Charts._textColor(), font:{size:11}, padding:8 } } } }
            });
        }
    }
};

// ============================================================
// RENDERIZAÇÃO
// ============================================================
const Render = {
    tudo: () => {
        Render.dashboard();
        // Renderiza a view ativa atual também
        const ativa = document.querySelector('.view.ativa')?.id;
        if (ativa === 'financas')   Render.financas();
        if (ativa === 'viagens')    Render.viagens();
        if (ativa === 'metas')      Render.metas();
        if (ativa === 'checklist')  Render.checklist();
        if (ativa === 'relatorios') Relatorios.atualizar();
    },

    dashboard: () => {
        const hoje  = new Date(); hoje.setHours(0,0,0,0);
        const mes   = hoje.getMonth(), ano = hoje.getFullYear();

        // Próxima viagem
        const futuras = Estado.viagens
            .filter(v => new Date(v.ida+'T12:00:00') >= hoje)
            .sort((a,b) => new Date(a.ida) - new Date(b.ida));
        const prox = futuras[0];
        const elViagem = document.getElementById('stat-proxima-viagem');
        const elDelta  = document.getElementById('stat-proxima-delta');
        if (elViagem) elViagem.textContent = prox ? `${prox.emoji||'✈️'} ${prox.destino}` : '—';
        if (elDelta)  {
            if (prox) {
                const dias = Utils.diasAte(prox.ida);
                elDelta.textContent = dias > 0 ? `Faltam ${dias} dias` : dias === 0 ? 'Hoje!' : 'Em andamento';
                elDelta.className = 'stat-delta ' + (dias <= 7 ? 'up' : 'neu');
            } else {
                elDelta.textContent = 'nenhuma planejada';
                elDelta.className = 'stat-delta neu';
            }
        }

        // Finanças do mês
        const finMes = Estado.financas.filter(f => {
            const d = new Date(f.data+'T12:00:00');
            return d.getMonth()===mes && d.getFullYear()===ano;
        });
        const rec = finMes.filter(f=>f.tipo==='receita').reduce((s,f)=>s+f.valor,0);
        const dep = finMes.filter(f=>f.tipo==='despesa').reduce((s,f)=>s+f.valor,0);
        const sal = rec - dep;

        const set = (id, txt) => { const e=document.getElementById(id); if(e) e.textContent=txt; };
        set('stat-despesas', Utils.moeda(dep));
        set('stat-receitas', Utils.moeda(rec));
        set('stat-saldo',    Utils.moeda(sal));

        const elSaldoDelta = document.getElementById('stat-saldo-delta');
        if (elSaldoDelta) {
            elSaldoDelta.textContent = sal >= 0 ? 'Saldo positivo ✓' : 'Saldo negativo';
            elSaldoDelta.className   = 'stat-delta ' + (sal >= 0 ? 'up' : 'down');
        }

        // Projeção do mês
        const diaAtual   = new Date().getDate();
        const diasNoMes  = new Date(ano, mes+1, 0).getDate();
        const projecao   = diaAtual > 0 ? (dep / diaAtual) * diasNoMes : 0;
        const elDep = document.getElementById('stat-despesas');
        if (elDep) elDep.setAttribute('data-tip', `Projeção p/ fim do mês: ${Utils.moeda(projecao)}`);

        const elDepDelta = document.getElementById('stat-despesas-delta');
        if (elDepDelta) { elDepDelta.textContent = `Projeção: ${Utils.moeda(projecao)}`; elDepDelta.className = 'stat-delta down'; }

        // Metas ativas
        const metasAtivas = Estado.metas.filter(m => m.atual < m.alvo).length;
        set('stat-metas', metasAtivas);
        const elMetaDelta = document.getElementById('stat-metas-delta');
        if (elMetaDelta) { elMetaDelta.textContent = `${Estado.metas.filter(m=>m.atual>=m.alvo).length} concluídas`; elMetaDelta.className='stat-delta neu'; }

        // Acerto de contas
        const p1total = Estado.financas.filter(f=>f.tipo==='despesa'&&f.resp===Estado.nome1).reduce((s,f)=>s+f.valor,0);
        const p2total = Estado.financas.filter(f=>f.tipo==='despesa'&&f.resp===Estado.nome2).reduce((s,f)=>s+f.valor,0);
        const dif     = Math.abs(p1total - p2total) / 2;
        const elAcerto = document.getElementById('stat-acerto');
        const elAcertoDelta = document.getElementById('stat-acerto-delta');
        if (elAcerto) {
            if (dif < 0.01) {
                elAcerto.textContent = 'Quite! ✓';
                if (elAcertoDelta) { elAcertoDelta.textContent = 'Tudo equilibrado'; elAcertoDelta.className='stat-delta up'; }
            } else if (p1total > p2total) {
                elAcerto.textContent = `${Estado.nome2} deve ${Utils.moeda(dif)}`;
                if (elAcertoDelta) { elAcertoDelta.textContent = `a ${Estado.nome1}`; elAcertoDelta.className='stat-delta down'; }
            } else {
                elAcerto.textContent = `${Estado.nome1} deve ${Utils.moeda(dif)}`;
                if (elAcertoDelta) { elAcertoDelta.textContent = `a ${Estado.nome2}`; elAcertoDelta.className='stat-delta down'; }
            }
        }

        // Split visual
        const totalGlobal = p1total + p2total;
        set('split-valor1', Utils.moeda(p1total));
        set('split-valor2', Utils.moeda(p2total));
        set('split-pct1', totalGlobal > 0 ? Math.round(p1total/totalGlobal*100)+'% do total' : '0%');
        set('split-pct2', totalGlobal > 0 ? Math.round(p2total/totalGlobal*100)+'% do total' : '0%');
        const elSplit = document.getElementById('split-resultado');
        if (elSplit) {
            if (dif < 0.01) { elSplit.textContent = '✓ Tudo quite entre vocês!'; elSplit.className='split-result quite'; }
            else if (p1total > p2total) { elSplit.textContent = `${Estado.nome2} deve pagar ${Utils.moeda(dif)} para ${Estado.nome1}`; elSplit.className='split-result deve'; }
            else { elSplit.textContent = `${Estado.nome1} deve pagar ${Utils.moeda(dif)} para ${Estado.nome2}`; elSplit.className='split-result deve'; }
        }

        // Preview viagens no dashboard
        Render.dashViagensPreview();

        // Welcome banner
        const elWelcome = document.getElementById('welcome-msg');
        if (elWelcome && Estado.nomeUsuario) {
            const hr = new Date().getHours();
            const saudacao = hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite';
            elWelcome.textContent = `${saudacao}, ${Estado.nomeUsuario}! 👋`;
        }

        // Atualiza gráficos do dashboard
        Charts.fluxo();
        Charts.categorias();
    },

    dashViagensPreview: () => {
        const el = document.getElementById('dash-viagens-preview');
        if (!el) return;
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const proximas = Estado.viagens
            .filter(v => new Date(v.volta+'T12:00:00') >= hoje)
            .sort((a,b) => new Date(a.ida) - new Date(b.ida))
            .slice(0, 3);

        if (!proximas.length) {
            el.innerHTML = `<div class="empty-state" style="padding:24px">
                <div class="empty-state-icon">🗺️</div>
                <h3>Nenhuma viagem planejada</h3>
                <p>Planeje sua próxima aventura!</p>
            </div>`;
            return;
        }

        el.innerHTML = proximas.map(v => {
            const dias = Utils.diasAte(v.ida);
            const statusTxt = dias > 0 ? `Faltam ${dias} dias` : dias === 0 ? 'Hoje!' : 'Em andamento';
            return `<div style="display:flex;align-items:center;gap:16px;padding:12px 0;border-bottom:1px solid var(--border)">
                <div style="width:42px;height:42px;border-radius:12px;background:var(--grad-cool);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">${v.emoji||'✈️'}</div>
                <div style="flex:1">
                    <div style="font-weight:700">${v.destino}</div>
                    <div style="font-size:.78rem;color:var(--text-muted)">${Utils.data(v.ida)} → ${Utils.data(v.volta)}</div>
                </div>
                <span class="badge ${dias <= 0 ? 'badge-success' : dias <= 30 ? 'badge-alerta' : 'badge-viagem'}">${statusTxt}</span>
            </div>`;
        }).join('');
    },

    financas: () => {
        const tbody = document.getElementById('tbody-financas');
        if (!tbody) return;

        // Filtro ativo
        const filtroAtivo = document.querySelector('.filter-tab.ativo')?.dataset.filtro || 'todos';
        const busca       = (document.getElementById('fin-busca')?.value || '').toLowerCase();
        const mesFiltro   = document.getElementById('fin-mes')?.value || '';

        let lista = [...Estado.financas].sort((a,b) => new Date(b.data) - new Date(a.data));

        if (filtroAtivo !== 'todos') {
            if (filtroAtivo === 'despesa' || filtroAtivo === 'receita') {
                lista = lista.filter(f => f.tipo === filtroAtivo);
            } else {
                lista = lista.filter(f => (f.cat || Utils.inferirCat(f.desc)) === filtroAtivo);
            }
        }
        if (busca)     lista = lista.filter(f => f.desc.toLowerCase().includes(busca) || f.resp.toLowerCase().includes(busca));
        if (mesFiltro) lista = lista.filter(f => f.data.startsWith(mesFiltro));

        // Totais do mês vigente (independente do filtro)
        const mes = new Date().getMonth(), ano = new Date().getFullYear();
        const finMes = Estado.financas.filter(f => { const d=new Date(f.data+'T12:00:00'); return d.getMonth()===mes && d.getFullYear()===ano; });
        const totalRec = finMes.filter(f=>f.tipo==='receita').reduce((s,f)=>s+f.valor,0);
        const totalDep = finMes.filter(f=>f.tipo==='despesa').reduce((s,f)=>s+f.valor,0);
        const saldo    = totalRec - totalDep;

        const set = (id,txt,extra='') => { const e=document.getElementById(id); if(e){e.textContent=txt; if(extra) e.className=extra;} };
        set('fin-total-receitas', Utils.moeda(totalRec));
        set('fin-total-despesas', Utils.moeda(totalDep));
        set('fin-saldo', Utils.moeda(saldo), 'balance-value ' + (saldo >= 0 ? 'saldo' : 'negativo'));

        if (!lista.length) {
            tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">💳</div><h3>Sem resultados</h3></div></td></tr>`;
            Charts.responsavel(); Charts.catFin();
            return;
        }

        tbody.innerHTML = lista.map(f => {
            const cat = f.cat || Utils.inferirCat(f.desc);
            const ci  = Utils.catInfo(cat);
            return `<tr>
                <td style="white-space:nowrap">${Utils.data(f.data)}</td>
                <td><strong>${f.desc}</strong></td>
                <td><span class="cat-pill">${ci.emoji} ${ci.label}</span></td>
                <td>${f.resp}</td>
                <td><span class="badge ${f.tipo==='receita'?'badge-receita':'badge-despesa'}">${f.tipo==='receita'?'Receita':'Despesa'}</span></td>
                <td><strong style="color:${f.tipo==='receita'?'var(--brand-emerald)':'var(--brand-rose)'}">${f.tipo==='receita'?'+':'-'} ${Utils.moeda(f.valor)}</strong></td>
                <td class="td-actions">
                    <div class="btn-group">
                        <button class="btn-icon" onclick="Controladores.editarFinanca('${f.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon danger" onclick="Controladores.deletar('financas','${f.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('');

        Charts.responsavel();
        Charts.catFin();
    },

    popularSelectMes: () => {
        const sel = document.getElementById('fin-mes');
        if (!sel) return;
        const meses = new Set(Estado.financas.map(f => f.data.slice(0,7)));
        sel.innerHTML = '<option value="">Todos os meses</option>';
        [...meses].sort().reverse().forEach(m => {
            const [a, mo] = m.split('-');
            const label = new Date(parseInt(a), parseInt(mo)-1, 1).toLocaleDateString('pt-BR', {month:'long', year:'numeric'});
            sel.innerHTML += `<option value="${m}">${label}</option>`;
        });
    },

    viagens: () => {
        const grid = document.getElementById('trip-grid');
        if (!grid) return;

        const filtroTab  = document.querySelector('[data-filtro-viagem].ativo')?.dataset.filtroViagem || 'todas';
        const busca      = (document.getElementById('viagem-busca')?.value || '').toLowerCase();
        const hoje       = new Date(); hoje.setHours(0,0,0,0);

        let lista = [...Estado.viagens].sort((a,b) => new Date(a.ida) - new Date(b.ida));

        lista = lista.filter(v => {
            const ida   = new Date(v.ida+'T12:00:00');   ida.setHours(0,0,0,0);
            const volta = new Date(v.volta+'T12:00:00'); volta.setHours(0,0,0,0);
            if (filtroTab === 'futura')    return ida > hoje;
            if (filtroTab === 'andamento') return ida <= hoje && volta >= hoje;
            if (filtroTab === 'concluida') return volta < hoje;
            return true;
        });

        if (busca) lista = lista.filter(v => v.destino.toLowerCase().includes(busca));

        if (!lista.length) {
            grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
                <div class="empty-state-icon">🗺️</div>
                <h3>Nenhuma viagem encontrada</h3>
                <p>Experimente outro filtro ou adicione uma nova viagem.</p>
            </div>`;
            return;
        }

        // Gradients por tipo
        const gradMap = {
            praia:         'linear-gradient(135deg, #0891b2, #06b6d4)',
            cidade:        'linear-gradient(135deg, #4f46e5, #7c3aed)',
            natureza:      'linear-gradient(135deg, #16a34a, #15803d)',
            internacional: 'linear-gradient(135deg, #2563eb, #4f46e5)',
            cruzeiro:      'linear-gradient(135deg, #0e7490, #0891b2)',
            mochilao:      'linear-gradient(135deg, #b45309, #d97706)',
            outros:        'linear-gradient(135deg, #475569, #64748b)',
        };

        grid.innerHTML = lista.map(v => {
            const ida   = new Date(v.ida+'T12:00:00');   ida.setHours(0,0,0,0);
            const volta = new Date(v.volta+'T12:00:00'); volta.setHours(0,0,0,0);
            const dias  = Utils.diasAte(v.ida);
            let statusTxt, statusCls;
            if (volta < hoje)         { statusTxt = 'Concluída';     statusCls = 'concluida'; }
            else if (ida <= hoje)     { statusTxt = 'Em andamento';  statusCls = 'andamento'; }
            else if (dias <= 30)      { statusTxt = `${dias}d`;      statusCls = 'futura'; }
            else                      { statusTxt = `${dias} dias`;  statusCls = 'futura'; }

            const grad  = gradMap[v.tipo] || gradMap.outros;
            const pct   = v.orcamento > 0 ? Math.min(100, Math.round((v.gastos||0)/v.orcamento*100)) : 0;

            return `<div class="trip-card" onclick="Controladores.abrirDetalheViagem('${v.id}')">
                <div class="trip-card-hero" style="background:${grad}" data-emoji="${v.emoji||'✈️'}">
                    <span class="trip-status-badge ${statusCls}">${statusTxt}</span>
                    <div class="trip-destination">${v.destino}</div>
                </div>
                <div class="trip-card-body">
                    <div class="trip-dates">
                        <i class="fa-regular fa-calendar"></i>
                        ${Utils.data(v.ida)} → ${Utils.data(v.volta)}
                    </div>
                    <div class="trip-budget-row">
                        <span class="trip-budget-label">Orçamento</span>
                        <span class="trip-budget-value">${Utils.moeda(v.orcamento)}</span>
                    </div>
                    ${v.orcamento > 0 ? `<div class="progress-wrap"><div class="progress-bar" style="width:${pct}%;background:var(--grad-brand)"></div></div><div style="font-size:.7rem;color:var(--text-muted);margin-top:4px">${pct}% usado</div>` : ''}
                </div>
                <div class="trip-card-footer">
                    ${v.link ? `<a href="${v.link}" target="_blank" onclick="event.stopPropagation()" class="btn btn-ghost btn-sm"><i class="fa-solid fa-link"></i> Reserva</a>` : ''}
                    <button class="btn btn-icon danger" onclick="event.stopPropagation();Controladores.deletar('viagens','${v.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    },

    metas: () => {
        const grid = document.getElementById('goals-grid');
        if (!grid) return;

        const hoje = new Date(); hoje.setHours(0,0,0,0);
        let total = Estado.metas.length;
        let concluidas = Estado.metas.filter(m => m.atual >= m.alvo).length;
        let emProgresso = total - concluidas;
        let guardado = Estado.metas.reduce((s,m) => s + (m.atual||0), 0);

        const set = (id,txt) => { const e=document.getElementById(id); if(e) e.textContent=txt; };
        set('meta-total',       total);
        set('meta-concluidas',  concluidas);
        set('meta-em-progresso',emProgresso);
        set('meta-guardado',    Utils.moeda(guardado));

        if (!Estado.metas.length) {
            grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
                <div class="empty-state-icon">🌟</div>
                <h3>Nenhuma meta ainda</h3>
                <p>Crie metas para transformar sonhos em realidade!</p>
            </div>`;
            return;
        }

        const catCores = { viagem:'var(--brand-blue)', emergencia:'var(--brand-emerald)', imovel:'var(--brand-purple)', veiculo:'var(--brand-orange)', educacao:'var(--brand-amber)', casamento:'var(--brand-rose)', investimento:'var(--brand-teal)', outros:'var(--text-muted)' };

        grid.innerHTML = Estado.metas.sort((a,b)=>new Date(a.prazo)-new Date(b.prazo)).map(m => {
            const pct      = Math.min(100, Math.round((m.atual||0) / m.alvo * 100));
            const concluida= m.atual >= m.alvo;
            const diasPrazo= m.prazo ? Utils.diasAte(m.prazo) : null;
            const atrasado = diasPrazo !== null && diasPrazo < 0 && !concluida;
            const cor      = catCores[m.cat] || catCores.outros;
            const barGrad  = concluida ? 'var(--grad-success)' : `linear-gradient(90deg, ${cor}, ${cor}99)`;

            let prazoHtml = '';
            if (m.prazo) {
                if (concluida)       prazoHtml = `<div class="goal-deadline"><i class="fa-solid fa-check-circle"></i> Meta concluída! 🎉</div>`;
                else if (atrasado)   prazoHtml = `<div class="goal-deadline goal-atrasado"><i class="fa-solid fa-circle-exclamation"></i> Atrasado — ${Utils.data(m.prazo)}</div>`;
                else if (diasPrazo === 0) prazoHtml = `<div class="goal-deadline"><i class="fa-regular fa-clock"></i> Vence hoje!</div>`;
                else                 prazoHtml = `<div class="goal-deadline"><i class="fa-regular fa-calendar"></i> ${Utils.data(m.prazo)} — faltam ${diasPrazo}d</div>`;
            }

            return `<div class="goal-card">
                <div class="goal-card-header">
                    <div style="display:flex;align-items:center;gap:10px">
                        <div class="goal-icon" style="background:${cor}20;color:${cor};font-size:1.2rem">${m.emoji||'🎯'}</div>
                        <div>
                            <div class="goal-title">${m.titulo}</div>
                            ${m.desc ? `<div class="goal-desc">${m.desc}</div>` : ''}
                        </div>
                    </div>
                    <button class="btn-icon danger" onclick="Controladores.deletar('metas','${m.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
                <div class="goal-amounts">
                    <div class="goal-current">${Utils.moeda(m.atual||0)}</div>
                    <div class="goal-target">de ${Utils.moeda(m.alvo)}</div>
                    <div class="goal-pct">${pct}%</div>
                </div>
                <div class="progress-wrap">
                    <div class="progress-bar" style="width:${pct}%;background:${barGrad}"></div>
                </div>
                ${prazoHtml}
                ${!concluida ? `<div class="savings-row"><input type="number" placeholder="Guardar R$..." min="0.01" step="0.01" id="dep-inline-${m.id}"><button class="btn btn-success btn-sm" onclick="Controladores._depositoInline('${m.id}')"><i class="fa-solid fa-piggy-bank"></i></button></div>` : `<div style="margin-top:10px"><span class="badge badge-success"><i class="fa-solid fa-check"></i> Concluída!</span></div>`}
            </div>`;
        }).join('');

        // Deposito inline rápido
        Controladores._depositoInline = (id) => {
            const val = parseFloat(document.getElementById(`dep-inline-${id}`)?.value);
            if (!val || val <= 0) return UI.toast('Informe um valor', '', 'aviso');
            document.getElementById('deposito-meta-id').value = id;
            document.getElementById('deposito-valor').value   = val;
            Controladores.depositarMeta();
        };
    },

    checklist: () => {
        const wrap = document.getElementById('checklist-wrap');
        if (!wrap) return;

        const catAtiva = document.querySelector('[data-check-cat].ativo')?.dataset.checkCat || 'todos';
        let lista = Estado.checklist;
        if (catAtiva !== 'todos') lista = lista.filter(c => c.cat === catAtiva);

        const total   = Estado.checklist.length;
        const feitos  = Estado.checklist.filter(c => c.feito).length;
        const pct     = total > 0 ? Math.round(feitos / total * 100) : 0;

        const set = (id, txt) => { const e=document.getElementById(id); if(e) e.textContent=txt; };
        set('check-progresso-txt', `${feitos} / ${total} itens`);
        const bar = document.getElementById('check-progress-bar');
        if (bar) bar.style.width = pct + '%';

        if (!lista.length) {
            wrap.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📋</div><h3>Nenhum item nesta categoria</h3></div>`;
            return;
        }

        wrap.innerHTML = lista.map(c => `
            <div class="checklist-item ${c.feito ? 'concluido' : ''}">
                <div class="check-toggle" onclick="Checklist.toggle('${c.id}')">
                    ${c.feito ? '<i class="fa-solid fa-check"></i>' : ''}
                </div>
                <span class="check-text">${c.texto}</span>
                <span class="check-category">${c.cat}</span>
                <button class="btn-icon danger" style="width:28px;height:28px;font-size:.75rem" onclick="Checklist.remover('${c.id}')"><i class="fa-solid fa-xmark"></i></button>
            </div>`).join('');
    }
};

// ============================================================
// INICIALIZAÇÃO
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    Auth.iniciarObserver();

    // Filtros de finanças
    document.querySelectorAll('.filter-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('ativo'));
            btn.classList.add('ativo');
            Render.financas();
        });
    });

    // Busca finanças
    document.getElementById('fin-busca')?.addEventListener('input', Render.financas);
    document.getElementById('fin-mes')?.addEventListener('change', Render.financas);

    // Filtros viagens (tabs)
    document.querySelectorAll('[data-filtro-viagem]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-filtro-viagem]').forEach(b => b.classList.remove('ativo'));
            btn.classList.add('ativo');
            Render.viagens();
        });
    });
    document.getElementById('viagem-busca')?.addEventListener('input', Render.viagens);

    // Tabs do checklist
    document.querySelectorAll('[data-check-cat]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-check-cat]').forEach(b => b.classList.remove('ativo'));
            btn.classList.add('ativo');
            Render.checklist();
        });
    });

    // Data padrão de hoje no modal de finança
    const finData = document.getElementById('fin-data');
    if (finData) finData.value = Utils.hoje();
});
