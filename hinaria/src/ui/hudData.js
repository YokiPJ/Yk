/** Pure, bounded HUD projection. Never mutates the authoritative RPG state. */
export const CLASS_SIGILS = Object.freeze({ kn: '⚔', pa: '➶', so: '✦', dr: '❧', yo: 'ᛉ' });
export const ratio = (value, maximum) => Number.isFinite(value) && Number.isFinite(maximum) && maximum > 0
  ? Math.max(0, Math.min(1, value / maximum)) : 0;
const amount = value => Number.isFinite(value) ? Math.max(0, value) : 0;
const STATUS = { guard: 'Proteção', rage: 'Fúria', haste: 'Velocidade', burn: 'Queimadura', slow: 'Lentidão', stun: 'Atordoado' };

export function deriveHudState(player, { classes = {}, armors = [], powers = {}, skins = [], weapon = null } = {}, zone = '') {
  if (!player) return null;
  const P = player, level = Math.max(1, Math.floor(amount(P.lv))), hp = amount(P.hp), mana = amount(P.mana);
  const maxHP = amount(P.max), maxMP = amount(P.mm), xpMax = level * 50;
  const armor = armors[P.ar] || armors[0] || { n: 'Sem armadura', def: 0 };
  const face = skins[P.sk]?.f;
  return {
    classId: P.cls, className: classes[P.cls]?.n || 'Aventureiro', sigil: CLASS_SIGILS[P.cls] || '✦',
    // Only appearance portraits already used by the character creator are valid matches.
    portrait: Number.isInteger(face) && face >= 0 && face < 8 ? `assets/ui/portrait_${String(face + 1).padStart(2, '0')}.jpg` : null,
    level, hp: Math.ceil(hp), maxHP, mana: Math.floor(mana), maxMP, xp: Math.floor(amount(P.xp)), xpMax,
    hpRatio: ratio(hp, maxHP), mpRatio: ratio(mana, maxMP), xpRatio: ratio(amount(P.xp), xpMax),
    lowHealth: hp > 0 && ratio(hp, maxHP) < .3,
    gold: Math.floor(amount(P.gold)), armor: armor.n, defense: amount(armor.def), weapon: weapon?.name || '', zone,
    status: Object.entries({ ...P.b, ...P.st }).filter(([, seconds]) => Number.isFinite(seconds) && seconds > 0)
      .map(([id, seconds]) => ({ id, label: STATUS[id] || id, seconds: Math.ceil(seconds) })),
    skills: (powers[P.cls] || []).map((power, i) => {
      const cooldown = amount(P.cds?.[i]);
      const skillLevel = Math.max(0, Math.min(3, P.skillLevels?.[P.cls]?.[i] ?? (i === 3 ? 0 : 1)));
      return { id: i === 3 ? 's4' : `s${i}`, key: i === 3 ? '5' : String(i + 1), name: power.n,
        manaCost: amount(power.mp), cooldown, cooldownRatio: ratio(cooldown, power.cd),
        level: skillLevel, locked: skillLevel === 0, disabled: skillLevel === 0 || cooldown > 0 || mana < power.mp || hp <= 0 };
    })
  };
}

/** Encounter presentation only. Does not choose an attack target or mutate combat. */
export function deriveBossEncounter(state, radius = 15) {
  const player = state?.P;
  if (!player || player.hp <= 0 || state.flow !== 'PLAYING' || state.insideHouse || state.cutsceneActive || state.dialogueOpen || state.arsenalOpen || state.pauseRequested) return null;
  let boss = null, distance = radius;
  for (const entity of state.ents || []) {
    if (!entity.isBoss || entity.hp <= 0 || !Number.isFinite(entity.max) || entity.max <= 0) continue;
    const d = Math.hypot(entity.x - player.x, entity.z - player.z);
    if (d <= distance) { boss = entity; distance = d; }
  }
  if (!boss) return null;
  const adjacent = Math.max(Math.abs(boss.tx - player.tx), Math.abs(boss.tz - player.tz)) <= 1;
  const stationary = Math.hypot(boss.tx - boss.x, boss.tz - boss.z) < .05;
  const safe = state.ZN?.[boss.tx]?.[boss.tz] === 0;
  return { name: boss.name || boss.K?.name || 'Chefe', hp: Math.ceil(Math.max(0, boss.hp)), max: boss.max,
    ratio: ratio(boss.hp, boss.max), imminent: adjacent && stationary && !safe && !(boss.st?.stun > 0) && Number.isFinite(boss.cd) && boss.cd <= .45 };
}
