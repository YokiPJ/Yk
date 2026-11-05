/**
 * HINÁRIA — motor de missões (puro: sem THREE/DOM, testável em Node).
 * Estado serializável: { v, q:{id:{s,step,n}}, items, flags, pending }.
 */
export function createQuestSystem(DATA, hooks = {}) {
  const H = { say() {}, reward() {}, banner() {}, changed() {}, discovered: () => false, level: () => 1, ...hooks };
  let S = fresh();
  function fresh() { return { v: 1, q: {}, items: {}, flags: {}, pending: null }; }
  const def = id => DATA.find(d => d.id === id);
  const status = id => {
    const r = S.q[id];
    if (r) return r.s;
    const d=def(id);
    return (d.pre || []).every(p => S.q[p] && S.q[p].s === 'done') && H.level() >= (d.minLevel || 1) ? 'available' : 'locked';
  };
  const cur = d => d.steps[S.q[d.id].step];

  function enter(d) {
    const r = S.q[d.id];
    while (r.s === 'active') {
      const stp = d.steps[r.step];
      if (stp.type === 'discover' && H.discovered(stp.target)) { advance(d, true); continue; }
      H.say(`<b>Objetivo:</b> ${stp.text}`, 'sys');
      break;
    }
  }
  function start(d) {
    S.q[d.id] = { s: 'active', step: 0, n: 0 };
    H.say(`<b>Missão aceita:</b> ${d.title}`, 'npc');
    H.banner(d.main ? 'Missão principal' : 'Missão secundária', d.title);
    enter(d);
    H.changed();
  }
  function advance(d, quiet) {
    const r = S.q[d.id], stp = d.steps[r.step];
    if (stp.give) S.items[stp.give] = 1;
    if (stp.say && stp.type !== 'talk') H.say(stp.say, 'npc');
    r.step++; r.n = 0;
    if (r.step >= d.steps.length) { complete(d); return; }
    if (!quiet) enter(d);
    H.changed();
  }
  function complete(d) {
    const before = DATA.filter(x => status(x.id) === 'available').map(x => x.id);
    S.q[d.id].s = 'done';
    if (d.takes) delete S.items[d.takes];
    H.reward(d.reward || {});
    const r = d.reward || {};
    H.say(`<b>Missão concluída:</b> ${d.title}${r.gold || r.xp ? ` (+${r.gold || 0} de ouro, +${r.xp || 0} de exp)` : ''}`, 'npc');
    if (d.after) H.say(d.after, 'npc');
    H.banner('Missão concluída', d.title);
    for (const x of DATA) if (status(x.id) === 'available' && !before.includes(x.id))
      H.say(`<b>Nova missão disponível:</b> ${x.title} — fale com ${x.giver === 'bram' ? 'Bram' : 'Yoki'}.`, 'sys');
    H.changed();
  }

  function emit(type, data) {
    for (const d of DATA) {
      if (status(d.id) !== 'active') continue;
      const stp = cur(d), r = S.q[d.id];
      if (stp.type !== type) continue;
      const hit = type === 'kill' ? (stp.target.startsWith('boss:')
          ? stp.target.slice(5) === data.bossId : stp.target === data.k)
          : type === 'discover' ? stp.target === data.n : false;
      if (!hit) continue;
      r.n++;
      if (r.n >= (stp.count || 1)) advance(d);
      else { H.say(`${d.title}: ${stp.text} (${r.n}/${stp.count})`, 'sys'); H.changed(); }
    }
  }

  /** Diálogo: devolve o texto do NPC ou null (cai no diálogo padrão). q já normalizado. */
  function talk(npc, q) {
    const yes = /^(sim|yes|s|aceito|aceitar|ok)$/.test(q), no = /^(nao|no|n)$/.test(q),
      hi = /^(hi|oi|ola|salve|hello)\b/.test(q), ask = /missao|missoes|quest|ajuda|tarefa/.test(q);
    const p = S.pending;
    if (p && p.npc === npc) {
      if (yes) { S.pending = null; const d = def(p.id); start(d); return d.accept; }
      if (no) { S.pending = null; return 'Sem pressa. Volte quando quiser.'; }
      if (!hi && !ask) S.pending = null;
    }
    if (!(hi || ask || yes)) return null;
    for (const d of DATA) if (status(d.id) === 'active') {
      const stp = cur(d);
      if (stp.type === 'talk' && stp.npc === npc) { advance(d); return stp.say; }
    }
    if (hi || ask) {
      for (const d of DATA) if (d.giver === npc && status(d.id) === 'available') { S.pending = { npc, id: d.id }; return d.offer; }
      if (ask) {
        for (const d of DATA) if (d.giver === npc && status(d.id) === 'active') return `Ainda conto com você em <b>${d.title}</b>: ${cur(d).text}.`;
        return 'Por ora não tenho mais pedidos. Fique atento: coisas estranhas estão acontecendo.';
      }
    }
    return null;
  }

  /** Alvos para minimapa/marcadores: {npc}|{lm}, k = new|turn|go */
  function markers() {
    const out = [];
    for (const d of DATA) {
      const s = status(d.id);
      if (s === 'active') {
        const stp = cur(d);
        if (stp.type === 'talk') out.push({ npc: stp.npc, k: 'turn' });
        else if (stp.type === 'discover') out.push({ lm: stp.target, k: 'go' });
      } else if (s === 'available' && d.giver) out.push({ npc: d.giver, k: 'new', hint: d.featured ? d.hint : null });
    }
    return out;
  }

  /** Linhas do rastreador (missões ativas + dica da próxima missão em destaque). */
  function tracker() {
    const out = [];
    for (const d of DATA) {
      const s = status(d.id);
      if (s === 'active') { const stp = cur(d), r = S.q[d.id]; out.push({ title: d.title, main: !!d.main, text: stp.text, prog: stp.count > 1 ? `${r.n}/${stp.count}` : '' }); }
      else if (s === 'available' && d.featured) out.push({ title: d.title, main: !!d.main, text: d.hint, prog: '', isNew: true });
    }
    return out;
  }

  /** Dados completos para o diário. */
  function journal() {
    return DATA.filter(d => status(d.id) !== 'locked').map(d => {
      const s = status(d.id), r = S.q[d.id];
      return { id: d.id, title: d.title, main: !!d.main, desc: d.desc, s, reward: d.reward || null,
        steps: d.steps.map((st, i) => ({ text: st.text, done: s === 'done' || (r && i < r.step), cur: s === 'active' && i === r.step, prog: s === 'active' && i === r.step && st.count > 1 ? `${r.n}/${st.count}` : '' })) };
    });
  }

  return {
    emit, talk, markers, tracker, journal, status, start: id => start(def(id)),
    setHooks: h => Object.assign(H, h),
    has: it => !!S.items[it], items: () => Object.keys(S.items),
    flag: (k, v) => (v === undefined ? S.flags[k] : (S.flags[k] = v)),
    serialize: () => JSON.stringify(S),
    restore(json) {
      try {
        const o = JSON.parse(json);
        if (!o || o.v !== 1 || typeof o.q !== 'object') return false;
        const q = {};
        for (const id in o.q) { const d = def(id), r = o.q[id]; if (d && (r.s === 'active' || r.s === 'done') && Number.isInteger(r.step) && r.step >= 0 && (r.s === 'done' ? r.step <= d.steps.length : r.step < d.steps.length)) q[id] = { s: r.s, step: r.step, n: Math.max(0, r.n | 0) }; }
        S = { v: 1, q, items: o.items && typeof o.items === 'object' ? o.items : {}, flags: o.flags || {}, pending: null };
        H.changed(); return true;
      } catch (e) { return false; }
    },
    reset() { S = fresh(); H.changed(); },
  };
}
