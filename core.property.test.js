// core.property.test.js — Testes de propriedade (fast-check + vitest) para a
// lógica pura da feature multi-usuario-sso (public/core.js).
//
// Cada teste implementa exatamente UMA propriedade de correção do design
// (.kiro/specs/multi-usuario-sso/design.md, seção "Correctness Properties").
// A Property 12 (remoção de cache no logout) é validada em integração, não aqui.
//
// Store injetável: tests/helpers/memStore.js (simula o Firestore em memória).

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// Módulos-fonte usam CommonJS (module.exports). Vite/Vitest fazem a interop:
// o `default` da importação expõe o objeto de exports.
import core from '../public/core.js';
import memStore from './helpers/memStore.js';

const {
  chaveCache,
  nomePadrao,
  gerarCodigo,
  criarEspacoCasal,
  resolverCasalId,
  salvarCampo,
  lerCampo,
  criarConvite,
  aceitarConvite,
} = core;

const { criarMemStore } = memStore;

const NUM_RUNS = { numRuns: 100 };

// --- Geradores auxiliares -------------------------------------------------

// Parte local de e-mail: inclui caracteres não-ASCII (Req 3.3/3.7). Evita '@'
// e caracteres de controle; garante ao menos 1 caractere.
const localArb = fc
  .stringOf(
    fc.char().filter((c) => c !== '@' && c.charCodeAt(0) >= 32),
    { minLength: 1, maxLength: 20 }
  )
  .filter((s) => s.length > 0);

// Domínio: rótulos alfanuméricos separados por ponto.
const dominioArb = fc
  .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789.'), {
    minLength: 3,
    maxLength: 20,
  })
  .filter((s) => s.length > 0 && !s.startsWith('.') && !s.endsWith('.'));

const emailArb = fc.record({ local: localArb, dominio: dominioArb });

// UID arbitrário não vazio.
const uidArb = fc.string({ minLength: 1, maxLength: 24 }).filter((s) => s.length > 0);

// displayName possivelmente nulo/vazio.
const displayNameArb = fc.oneof(
  fc.constant(null),
  fc.string({ minLength: 1, maxLength: 30 })
);

// Item genérico de lista (JSON-serializável).
const itemArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 8 }),
  valor: fc.oneof(fc.integer(), fc.string(), fc.boolean()),
});

const campoArb = fc.constantFrom('viagens', 'financas', 'metas', 'checklist');

describe('multi-usuario-sso — propriedades da lógica pura (core.js)', () => {
  // Feature: multi-usuario-sso, Property 1: Criação de espaço usa o UID como identificador
  it('Property 1: resolver espaço inexistente cria casais/{uid} e retorna uid', () => {
    fc.assert(
      fc.property(uidArb, emailArb, displayNameArb, (uid, email, displayName) => {
        const store = criarMemStore();
        const user = { uid, email: `${email.local}@${email.dominio}`, displayName };

        const casalId = resolverCasalId(store, user);

        expect(casalId).toBe(uid);
        const doc = store.getDoc('casais', uid);
        expect(doc).not.toBeNull();
        // Documento criado é um Espaço_Casal completo (não um ponteiro).
        expect(doc.membros).toBeTypeOf('object');
        expect(doc.casalIdRef).toBeUndefined();
      }),
      NUM_RUNS
    );
  });

  // Feature: multi-usuario-sso, Property 2: Criador é registrado como membro com email → nome
  it('Property 2: criarEspacoCasal registra membros[email] = displayName ou nomePadrao', () => {
    fc.assert(
      fc.property(uidArb, emailArb, displayNameArb, (uid, email, displayName) => {
        const store = criarMemStore();
        const emailStr = `${email.local}@${email.dominio}`;
        const user = { uid, email: emailStr, displayName };

        criarEspacoCasal(store, user);

        const doc = store.getDoc('casais', uid);
        const nomeEsperado = displayName || nomePadrao(emailStr);
        expect(doc.membros[emailStr]).toBe(nomeEsperado);
      }),
      NUM_RUNS
    );
  });

  // Feature: multi-usuario-sso, Property 3: Resolução carrega o espaço correto do membro
  it('Property 3: N criadores com uids/emails únicos resolvem cada um para seu próprio uid', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.record({ uid: uidArb, email: emailArb, displayName: displayNameArb }), {
          minLength: 1,
          maxLength: 6,
          selector: (u) => u.uid,
        }),
        (usuariosRaw) => {
          // Garante uids E emails únicos.
          const vistos = new Set();
          const usuarios = usuariosRaw.filter((u) => {
            const e = `${u.email.local}@${u.email.dominio}`;
            if (vistos.has(u.uid) || vistos.has(e)) return false;
            vistos.add(u.uid);
            vistos.add(e);
            return true;
          });
          fc.pre(usuarios.length >= 1);

          const store = criarMemStore();
          // Cada usuário cria seu próprio espaço.
          usuarios.forEach((u) => {
            criarEspacoCasal(store, {
              uid: u.uid,
              email: `${u.email.local}@${u.email.dominio}`,
              displayName: u.displayName,
            });
          });

          // Cada um resolve para seu próprio uid e nenhum outro.
          usuarios.forEach((u) => {
            const casalId = resolverCasalId(store, {
              uid: u.uid,
              email: `${u.email.local}@${u.email.dominio}`,
              displayName: u.displayName,
            });
            expect(casalId).toBe(u.uid);
          });
        }
      ),
      NUM_RUNS
    );
  });

  // Feature: multi-usuario-sso, Property 4: Resolução segue o ponteiro de associação
  it('Property 4: doc {casalIdRef: x} resolve para x', () => {
    fc.assert(
      fc.property(uidArb, uidArb, emailArb, displayNameArb, (uid, ref, email, displayName) => {
        fc.pre(uid !== ref);
        const store = criarMemStore();
        store.seed('casais', uid, { casalIdRef: ref });
        const user = { uid, email: `${email.local}@${email.dominio}`, displayName };

        const casalId = resolverCasalId(store, user);

        expect(casalId).toBe(ref);
      }),
      NUM_RUNS
    );
  });

  // Feature: multi-usuario-sso, Property 5: Persistência é round-trip dentro do espaço
  it('Property 5: salvarCampo seguido de lerCampo retorna a lista gravada', () => {
    fc.assert(
      fc.property(uidArb, campoArb, fc.array(itemArb, { maxLength: 15 }), (casalId, campo, lista) => {
        const store = criarMemStore();
        salvarCampo(store, casalId, campo, lista);
        const lida = lerCampo(store, casalId, campo);
        expect(lida).toEqual(lista);
      }),
      NUM_RUNS
    );
  });

  // Feature: multi-usuario-sso, Property 6: Chave de cache é derivada e injetora
  it('Property 6: dois casalId distintos geram chaves distintas contendo cada casalId', () => {
    fc.assert(
      fc.property(uidArb, uidArb, (a, b) => {
        fc.pre(a !== b);
        const chaveA = chaveCache(a);
        const chaveB = chaveCache(b);
        expect(chaveA).not.toBe(chaveB);
        expect(chaveA).toContain(a);
        expect(chaveB).toContain(b);
      }),
      NUM_RUNS
    );
  });

  // Feature: multi-usuario-sso, Property 7: Nome padrão é a parte local do e-mail
  it('Property 7: nomePadrao(local@dominio) === local (inclui não-ASCII no local)', () => {
    fc.assert(
      fc.property(localArb, dominioArb, (local, dominio) => {
        const email = `${local}@${dominio}`;
        expect(nomePadrao(email)).toBe(local);
      }),
      NUM_RUNS
    );
  });

  // Feature: multi-usuario-sso, Property 8: Código de convite tem formato válido
  it('Property 8: gerarCodigo produz 8 caracteres em A-Z0-9', () => {
    fc.assert(
      fc.property(fc.integer(), () => {
        const codigo = gerarCodigo();
        expect(codigo).toMatch(/^[A-Z0-9]{8}$/);
      }),
      NUM_RUNS
    );
  });

  // Feature: multi-usuario-sso, Property 9: Expiração é exatamente 72 horas após a geração
  it('Property 9: criarConvite grava expiraEm === ISO(t + 72h)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4102444800000 }), // até ~ano 2100
        uidArb,
        emailArb,
        (t, casalId, email) => {
          const store = criarMemStore();
          const criadoPor = `${email.local}@${email.dominio}`;
          const codigo = criarConvite(store, casalId, criadoPor, t);
          const convite = store.getDoc('convites', codigo);
          const esperado = new Date(t + 72 * 60 * 60 * 1000).toISOString();
          expect(convite.expiraEm).toBe(esperado);
        }
      ),
      NUM_RUNS
    );
  });

  // Feature: multi-usuario-sso, Property 10: Aceite válido registra o parceiro como membro
  it('Property 10: aceite válido resulta em membros[emailParceiro] = nome esperado e res.ok', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4102444800000 }),
        uidArb, // uid criador
        uidArb, // uid parceiro
        emailArb, // email criador
        emailArb, // email parceiro
        displayNameArb, // displayName parceiro
        (t, uidCriador, uidParceiro, emailC, emailP, nomeParceiro) => {
          const emailCriador = `c_${emailC.local}@${emailC.dominio}`;
          const emailParceiro = `p_${emailP.local}@${emailP.dominio}`;
          fc.pre(uidCriador !== uidParceiro);
          fc.pre(emailCriador !== emailParceiro);

          const store = criarMemStore();
          // Criador cria seu espaço (1 membro).
          criarEspacoCasal(store, { uid: uidCriador, email: emailCriador, displayName: 'Criador' });
          // Convite criado em t, aceito em t (não expirado).
          const codigo = criarConvite(store, uidCriador, emailCriador, t);

          const userParceiro = { uid: uidParceiro, email: emailParceiro, displayName: nomeParceiro };
          const res = aceitarConvite(store, codigo, userParceiro, t);

          expect(res.ok).toBe(true);
          expect(res.casalId).toBe(uidCriador);
          const espaco = store.getDoc('casais', uidCriador);
          const nomeEsperado = nomeParceiro || nomePadrao(emailParceiro);
          expect(espaco.membros[emailParceiro]).toBe(nomeEsperado);
        }
      ),
      NUM_RUNS
    );
  });

  // Feature: multi-usuario-sso, Property 11: Aceite rejeitado preserva o mapa de membros
  it('Property 11: aceite rejeitado (invalido/expirou/cheio/ja_membro) preserva membros e sinaliza erro correto', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('invalido', 'expirou', 'cheio', 'ja_membro'),
        fc.integer({ min: 1000000000000, max: 4102444800000 }),
        uidArb, // uid criador
        uidArb, // uid parceiro
        emailArb, // email criador
        emailArb, // email parceiro
        (ramo, t, uidCriador, uidParceiro, emailC, emailP) => {
          const emailCriador = `c_${emailC.local}@${emailC.dominio}`;
          const emailParceiro = `p_${emailP.local}@${emailP.dominio}`;
          fc.pre(uidCriador !== uidParceiro);
          fc.pre(emailCriador !== emailParceiro);

          const store = criarMemStore();
          const userParceiro = { uid: uidParceiro, email: emailParceiro, displayName: 'Parceiro' };
          let codigo;
          let agoraAceite = t;

          if (ramo === 'invalido') {
            // Espaço com 1 membro (criador); nenhum convite gravado sob este código.
            criarEspacoCasal(store, { uid: uidCriador, email: emailCriador, displayName: 'Criador' });
            codigo = 'NAOEXIST';
          } else if (ramo === 'expirou') {
            criarEspacoCasal(store, { uid: uidCriador, email: emailCriador, displayName: 'Criador' });
            codigo = criarConvite(store, uidCriador, emailCriador, t);
            // Aceite após +72h + 1ms => expirado.
            agoraAceite = t + 72 * 60 * 60 * 1000 + 1;
          } else if (ramo === 'cheio') {
            // Espaço lotado: 2 membros distintos, nenhum deles o parceiro.
            criarEspacoCasal(store, { uid: uidCriador, email: emailCriador, displayName: 'Criador' });
            const espaco = store.getDoc('casais', uidCriador);
            espaco.membros['outro@x.com'] = 'Outro';
            store.setDoc('casais', uidCriador, espaco);
            codigo = criarConvite(store, uidCriador, emailCriador, t);
          } else {
            // ja_membro: espaço NÃO lotado (1 membro) e esse único membro é o
            // próprio parceiro. Assim a validação de lotação não dispara antes,
            // e a de duplicidade é alcançada.
            criarEspacoCasal(store, { uid: uidCriador, email: emailParceiro, displayName: 'Parceiro' });
            codigo = criarConvite(store, uidCriador, emailParceiro, t);
          }

          const membrosAntes = store.getDoc('casais', uidCriador).membros;
          const res = aceitarConvite(store, codigo, userParceiro, agoraAceite);
          const membrosDepois = store.getDoc('casais', uidCriador).membros;

          expect(res.ok).toBe(false);
          expect(res.erro).toBe(ramo);
          expect(membrosDepois).toEqual(membrosAntes);
        }
      ),
      NUM_RUNS
    );
  });
});
