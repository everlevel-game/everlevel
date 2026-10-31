// v0.25.0: สเตตัสรอง (ค่าสุ่ม) · ธาตุ/เผ่า/ขนาดมอนสเตอร์ · แปลงอาวุธจาก weapons.js เป็นไอเทมในเกม
import { WEAPON_DEFS, WEAPON_FORMS } from './weapons.js?v=0.93.0-p4.89';
import { OFFHAND_BLOODMOON } from './offhand.js?v=0.93.0-p4.89';

// ชื่อสเตตัสในสเปก → คีย์โบนัสในเกม (scale = ตัวคูณตอนแปลง)
export const STAT_DEF = {
  STR: { key: 'str' }, AGI: { key: 'agi' }, VIT: { key: 'vit' }, INT: { key: 'int' }, DEX: { key: 'dex' }, LUK: { key: 'luk' },
  ATK: { key: 'atk' }, MATK: { key: 'matk' }, atk: { key: 'atk' }, matk: { key: 'matk' }, 'ATK%': { key: 'atkPct' }, 'MATK%': { key: 'matkPct' },
  HIT: { key: 'hit' }, FLEE: { key: 'flee' }, DEF: { key: 'def' }, CRIT: { key: 'crit', scale: 0.01 }, 'CRIT DMG%': { key: 'critDmgPct' },
  'ASPD%': { key: 'aspdPct' }, 'Cast Time -%': { key: 'castPct' }, 'After-cast Delay -%': { key: 'delayPct' },
  MaxHP: { key: 'maxHp' }, 'MaxHP%': { key: 'maxHpPct' }, MaxSP: { key: 'maxSp' }, 'MaxSP%': { key: 'maxSpPct' },
  'HP Regen%': { key: 'regenPct' }, 'SP Regen%': { key: 'spRegenPct' }, 'Heal Power%': { key: 'healPct' },
  'Ranged DMG%': { key: 'rangedPct' }, 'Melee DMG%': { key: 'meleePct' }, 'ลดดาเมจรับ%': { key: 'dmgReduce' },
  'ดูดเลือด%': { key: 'lifesteal' }, 'ดูด SP%': { key: 'spDrain' }, Range: { key: 'rangeTiles' },
  'เจาะเกราะ%': { key: 'defPierce' }, 'โอกาสสายฟ้า%': { key: 'procBolt' },   // fix60 สเตตัสระดับตำนาน
};
// fix60 ระดับของสเตตัสสุ่ม 5 ขั้น (ธรรมดา → ตำนาน) · ยิ่งขั้นสูงยิ่งสุ่มได้ยาก · ของหายากมีโอกาสได้ขั้นสูงมากขึ้น
export const ROLL_TIERS = [
  null,
  { name: 'ธรรมดา', cls: 't1' }, { name: 'ดี', cls: 't2' }, { name: 'หายาก', cls: 't3' }, { name: 'หายากมาก', cls: 't4' }, { name: 'ตำนาน', cls: 't5' },
];
const T1 = new Set(['STR', 'AGI', 'VIT', 'INT', 'DEX', 'LUK', 'DEF', 'MaxSP']);
const T2 = new Set(['ATK', 'MATK', 'atk', 'matk', 'HIT', 'FLEE', 'MaxHP', 'HP Regen%', 'SP Regen%']);
const T3 = new Set(['CRIT', 'ASPD%', 'Cast Time -%', 'CRIT DMG%', 'After-cast Delay -%', 'MaxHP%', 'MaxSP%', 'Heal Power%', 'Range']);
const T5 = new Set(['เจาะเกราะ%', 'โอกาสสายฟ้า%']);
export const statTier = (stat) => (T5.has(stat) ? 5 : T1.has(stat) ? 1 : T2.has(stat) ? 2 : T3.has(stat) ? 3 : 4);
// น้ำหนักสุ่มขั้น [ขั้น1..ขั้น5] ตามความหายากของไอเทม
const TIER_W = {
  common: [60, 30, 9, 1, 0], uncommon: [55, 30, 12, 3, 0], rare: [48, 30, 16, 5, 1], epic: [42, 30, 19, 7, 2],
  legend: [36, 30, 22, 9, 3], mythic: [30, 30, 24, 12, 4], celestial: [28, 29, 25, 13, 5], abyssal: [27, 29, 25, 13, 6], divine: [25, 28, 26, 14, 7],
};
export const TRAIT_TH = {
  beast: 'สัตว์', plant: 'พืช', insect: 'แมลง', formless: 'ไร้รูป', undead: 'อันเดด', demon: 'ปีศาจ', dragon: 'มังกร',
  neutral: 'ไร้ธาตุ', earth: 'ดิน', water: 'น้ำ', fire: 'ไฟ', wind: 'ลม', holy: 'ศักดิ์สิทธิ์', shadow: 'มืด',
  small: 'ขนาดเล็ก', medium: 'ขนาดกลาง', large: 'ขนาดใหญ่',
};
export const ELEMENT_COLOR = { neutral: '#d8dde4', earth: '#c8a060', water: '#6ac8ff', fire: '#ff7a3a', wind: '#8affb0', holy: '#ffe08a', shadow: '#b48cff' };
export function statToBonus(stat, v, out = {}) {
  let key, val = v;
  if (stat.startsWith('DMG vs ')) key = 'vs_' + stat.slice(7);
  else { const d = STAT_DEF[stat]; if (!d) return out; key = d.key; val = v * (d.scale || 1); }
  out[key] = +(((out[key] || 0) + val).toFixed(4));
  return out;
}
export const statsToBonus = (o, out = {}) => { for (const [k, v] of Object.entries(o || {})) statToBonus(k, v, out); return out; };

// ---------- มอนสเตอร์: เผ่า / ธาตุ / ขนาด ----------
const T = (race, element, size) => ({ race, element, size });
export const MOB_TRAITS = {
  bloblet: T('formless', 'water', 'small'), capling: T('plant', 'earth', 'small'), stinglet: T('insect', 'wind', 'small'),
  thornback: T('beast', 'earth', 'small'), wisp: T('formless', 'holy', 'medium'), barkwolf: T('beast', 'earth', 'medium'), gnarlroot: T('plant', 'earth', 'large'),
  frostfox: T('beast', 'water', 'small'), frostbat: T('beast', 'water', 'medium'), yeti: T('beast', 'water', 'large'), icegolem: T('formless', 'water', 'large'), glacia: T('demon', 'water', 'large'),
  magmaslime: T('formless', 'fire', 'small'), emberimp: T('demon', 'fire', 'medium'), salamander: T('dragon', 'fire', 'small'), obsidiangolem: T('formless', 'earth', 'large'), ignarok: T('dragon', 'fire', 'large'),
  ruin_scarab: T('insect', 'earth', 'small'), sand_basilisk: T('dragon', 'earth', 'medium'), rune_sentinel: T('formless', 'neutral', 'large'), astral_wisp: T('formless', 'holy', 'medium'), relic_knight: T('undead', 'shadow', 'large'), aurex: T('formless', 'holy', 'large'),
  haunt_spider: T('insect', 'shadow', 'small'), hollow_wolf: T('undead', 'shadow', 'medium'), mourning_shade: T('undead', 'shadow', 'medium'), cursed_stag: T('beast', 'shadow', 'large'), eclipse_reaper: T('demon', 'shadow', 'large'), bloodmoon_knight: T('undead', 'shadow', 'large'), nocthar: T('demon', 'shadow', 'large'),
};
MOB_TRAITS.world_aurex = MOB_TRAITS.aurex; MOB_TRAITS.world_nocthar = MOB_TRAITS.nocthar;
export function mobTraits(type, data = {}) {
  return MOB_TRAITS[type] || T('formless', 'neutral', (data.height || 1) < 1 ? 'small' : (data.height || 1) < 1.8 ? 'medium' : 'large');
}
// ธาตุโจมตี → ธาตุเป้า: แพ้ทาง ×1.25 · ธาตุเดียวกัน ×0.75
const STRONG = { fire: ['earth'], water: ['fire'], wind: ['water'], earth: ['wind'], holy: ['shadow'], shadow: ['holy'] };
export function elementMul(atk, def, race) {
  if (!atk || atk === 'neutral') return 1;
  if ((STRONG[atk] || []).includes(def) || (atk === 'holy' && race === 'undead')) return 1.25;
  if (atk === def) return 0.75;
  return 1;
}
// ธาตุของสกิลเวท/สกิลกายภาพ (จากชื่อสกิล)
export function skillElement(id = '') {
  if (/flame|fire|meteor|phoenix|inferno|blast_trap/.test(id)) return 'fire';
  if (/frost|glacial/.test(id)) return 'water';
  if (/thunder|gale|wind|lightning|talon|falcon/.test(id)) return 'wind';
  if (/ground/.test(id)) return 'earth';
  if (/holy|divine|sanct|radiant|purge|seraph|heavens/.test(id)) return 'holy';
  return null;
}

// ---------- แปลงอาวุธเป็นไอเทม ----------
const ICON = { sword_1h: 'sword', sword_2h: 'sword', spear: 'sword', rod: 'staff', staff: 'staff', orb: 'staff', mace: 'mace', scepter: 'mace', book: 'mace', shortbow: 'bow', longbow: 'bow', crossbow: 'bow' };
export const FORM_TH = { sword_1h: 'ดาบมือเดียว', sword_2h: 'ดาบสองมือ', spear: 'หอก', rod: 'คทา', staff: 'ไม้เท้า', orb: 'ออร์บ', mace: 'กระบอง', scepter: 'คทาศักดิ์สิทธิ์', book: 'หนังสือ', shortbow: 'ธนูสั้น', longbow: 'ธนูยาว', crossbow: 'หน้าไม้', knife: 'มีด', sword: 'ดาบ', bow: 'ธนู' };
const TIERMUL = { common: 1, uncommon: 1.15, rare: 1.35, epic: 1.6, legend: 1.8, mythic: 2, celestial: 2.5 };
export const WEAPON_ITEMS = {};
for (const d of WEAPON_DEFS) if (d.set && d.set.id === 'bloodmoon') for (const id of OFFHAND_BLOODMOON) if (!d.set.pieces.includes(id)) d.set.pieces.push(id);   // v0.25.2: ของมือรองจันทร์โลหิตนับเป็นชิ้นเซ็ต
for (const d of WEAPON_DEFS) {
  const F = WEAPON_FORMS[d.type];
  const bonus = statsToBonus(d.fixed_stats, { atk: d.base.atk, ...(d.base.matk ? { matk: d.base.matk } : {}) });
  const jobs = [...d.class];
  if (d.req_level <= 5 && F.wtype === 'sword') jobs.unshift('novice');
  WEAPON_ITEMS[d.id] = {
    name: d.name_th, en: d.name_en, type: 'equip', slot: 'weapon', wtype: F.wtype, form: d.type, twoHand: F.twoHand, reach: F.reach,
    jobs, icon: [ICON[d.type], d.look.c1, d.look.c2], look: d.look, visual: { weapon: F.wtype },
    bonus, element: d.base.element, weight: d.base.weight, reqLevel: d.req_level, rarity: d.rarity, slots: d.slots,
    price: Math.round((60 + d.req_level * d.req_level * 14) * TIERMUL[d.rarity]),
    rolls: { pool: d.random_stats, count: d.random_count }, passive: d.passive, set: d.set, drops: d.drop,
    refinePer: statsToBonus(d.refine_per_level), refineSpec: d.refine_per_level, style: d.style, tradeoff: d.tradeoff, hybrid: d.hybrid,
    desc: d.description,
  };
}

// ---------- ค่าสุ่ม: เก็บในคีย์ไอเทมช่องที่ 4 เช่น 'wpn_sword_002*0**0a.3c' ('~' = สุ่มแล้วไม่ได้สักค่า) ----------
const b36 = (n) => n.toString(36);
// ---------- v0.52 ค่าสุ่มพิเศษของอาวุธทุกชิ้น (ดี/ไม่ดี · ตรงสาย/ไม่ตรงสาย) ----------
// ต่อท้าย pool เดิมของอาวุธ (คีย์เก่ายังอ่านได้) · ค่าติดลบได้ = ค่าสุ่มไม่ดี · สเกลตามเลเวลและระดับความหายาก
const RMUL = { common: 1, uncommon: 1.1, rare: 1.25, epic: 1.4, legend: 1.6, mythic: 1.8, celestial: 2, abyssal: 2.1, divine: 2.3 };
export function extraRollPool(it) {
  const L = it.reqLevel || 1, k = Math.max(1, Math.round((1 + L / 20) * (RMUL[it.rarity] || 1)));
  const h = Math.ceil(k / 2), P = (stat, min, max) => ({ stat, min, max, extra: true });
  return [
    P('STR', -h, k), P('AGI', -h, k), P('VIT', -h, k), P('INT', -h, k), P('DEX', -h, k), P('LUK', -h, k),
    P('ATK', -k * 2, k * 4), P('MATK', -k * 2, k * 4), P('HIT', -k, k * 2), P('FLEE', -k, k * 2), P('DEF', -h, k),
    P('CRIT', -1, Math.max(1, Math.ceil(k / 3))), P('MaxHP', -k * 15, k * 30), P('MaxSP', -k * 5, k * 10),
    P('ASPD%', -2, Math.max(2, h)), P('Cast Time -%', -2, Math.max(2, h)),
    ...rarePool(it, k, 'weapon'),
  ];
}
// fix60 สเตตัสขั้นหายาก–ตำนาน (ต่อท้าย pool เท่านั้น → รหัสค่าสุ่มของของเก่ายังอ่านได้ตรง)
const RACES = ['beast', 'plant', 'insect', 'formless', 'undead', 'demon', 'dragon'], ELEMS = ['earth', 'water', 'fire', 'wind', 'holy', 'shadow'], SIZES = ['small', 'medium', 'large'];
const hashId = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
function rarePool(it, k, kind) {
  const P = (stat, min, max) => ({ stat, min, max: Math.max(min, Math.round(max)), extra: true, tier: statTier(stat) });
  const h = hashId(it.id || it.name), cap = (v, c) => Math.min(c, v);
  const race = RACES[h % RACES.length], el = ELEMS[(h >> 3) % ELEMS.length], size = SIZES[(h >> 6) % SIZES.length];
  if (kind === 'weapon') {
    const staff = it.wtype === 'staff', bow = it.wtype === 'bow';
    return [
      P('CRIT DMG%', 1, Math.max(3, cap(k * 2, 30))), P('After-cast Delay -%', 1, Math.max(2, cap(Math.ceil(k / 2), 8))), P('MaxHP%', 1, Math.max(2, cap(Math.ceil(k / 2), 8))),
      P('DMG vs ' + race, 1, Math.max(3, cap(k + 2, 15))), P('DMG vs ' + el, 1, Math.max(3, cap(k + 2, 15))), P('DMG vs ' + size, 1, Math.max(3, cap(k + 2, 15))),
      P(staff ? 'MATK%' : 'ATK%', 1, Math.max(2, cap(Math.ceil(k / 2.5), 8))), P(staff ? 'Heal Power%' : bow ? 'Ranged DMG%' : 'Melee DMG%', 1, Math.max(2, cap(Math.ceil(k / 2), 10))),
      P(staff ? 'ดูด SP%' : 'ดูดเลือด%', 1, Math.max(1, cap(Math.ceil(k / 6), 3))),
      P('เจาะเกราะ%', 2, Math.max(5, cap(k * 1.5, 25))), P('โอกาสสายฟ้า%', 1, Math.max(2, cap(Math.ceil(k / 3), 6))),
    ];
  }
  return [
    P('MaxHP%', 1, Math.max(2, cap(Math.ceil(k / 2), 6))), P('MaxSP%', 1, Math.max(2, cap(Math.ceil(k / 2), 6))), P('CRIT DMG%', 1, Math.max(2, cap(k, 15))),
    P('After-cast Delay -%', 1, Math.max(1, cap(Math.ceil(k / 3), 5))), P('Heal Power%', 1, Math.max(2, cap(k, 10))),
    P('ลดดาเมจรับ%', 1, Math.max(1, cap(Math.ceil(k / 4), 6))), P('DMG vs ' + race, 1, Math.max(2, cap(k, 10))),
    P('ATK%', 1, Math.max(1, cap(Math.ceil(k / 4), 4))), P('MATK%', 1, Math.max(1, cap(Math.ceil(k / 4), 4))),
    P('เจาะเกราะ%', 1, Math.max(2, cap(Math.ceil(k / 2), 10))),
  ];
}
// ---------- v0.58 ค่าสุ่มพิเศษของอุปกรณ์สวมใส่ทุกชิ้น (หัว ชุด มือรอง ผ้าคลุม รองเท้า เครื่องประดับ) ----------
// ค่าเล็กกว่าอาวุธ (×0.7) · เน้นสายป้องกัน แต่มีค่าโจมตีเล็ก ๆ ด้วย · ติดลบได้เหมือนอาวุธ
export const GEAR_ROLL_SLOTS = ['head', 'body', 'shield', 'garment', 'shoes', 'accessory'];
export function gearRollPool(it) {
  const L = it.reqLevel || 1, k = Math.max(1, Math.round((1 + L / 20) * (RMUL[it.rarity] || 1) * 0.7));
  const h = Math.ceil(k / 2), P = (stat, min, max) => ({ stat, min, max, extra: true }), sm = Math.max(1, Math.ceil(h / 2));
  return [
    P('STR', -h, k), P('AGI', -h, k), P('VIT', -h, k), P('INT', -h, k), P('DEX', -h, k), P('LUK', -h, k),
    P('DEF', -h, k + 1), P('FLEE', -k, k * 2), P('MaxHP', -k * 12, k * 25), P('MaxSP', -k * 4, k * 8),
    P('ATK', -k, k * 2), P('MATK', -k, k * 2), P('HIT', -k, k), P('CRIT', -1, Math.max(1, Math.ceil(k / 4))),
    P('ASPD%', -1, sm), P('Cast Time -%', -1, sm), P('HP Regen%', -2, Math.max(2, k)), P('SP Regen%', -2, Math.max(2, k)),
    ...rarePool(it, k, 'gear'),
  ];
}
const GEAR_FIT = {
  head: ['INT', 'DEX', 'VIT', 'DEF', 'MaxSP', 'HIT', 'MaxHP', 'SP Regen%', 'Cast Time -%'],
  body: ['VIT', 'STR', 'INT', 'DEF', 'MaxHP', 'MaxSP', 'FLEE', 'HP Regen%'],
  shield: ['VIT', 'STR', 'DEF', 'MaxHP', 'FLEE', 'HP Regen%', 'MATK', 'INT'],
  garment: ['AGI', 'LUK', 'FLEE', 'DEF', 'MaxHP', 'CRIT', 'ASPD%'],
  shoes: ['AGI', 'DEX', 'FLEE', 'MaxHP', 'MaxSP', 'ASPD%', 'HIT'],
};
// สเตตัสที่ "ตรงสาย" กับอาวุธแต่ละประเภท
const FIT = {
  melee: ['STR', 'AGI', 'DEX', 'VIT', 'LUK', 'ATK', 'HIT', 'CRIT', 'ASPD%', 'MaxHP', 'DEF', 'FLEE'],
  staff: ['INT', 'DEX', 'VIT', 'MATK', 'Cast Time -%', 'MaxSP', 'MaxHP', 'DEF'],
  bow: ['DEX', 'AGI', 'LUK', 'STR', 'ATK', 'HIT', 'CRIT', 'ASPD%', 'FLEE'],
};
export const rollFits = (it, stat) => {
  if (!STAT_DEF[stat] || statTier(stat) >= 4) return true;   // fix60 ขั้นหายากมาก/ตำนาน ใช้ได้ทุกสาย
  if (it && it.slot && it.slot !== 'weapon') return it.slot === 'accessory' || (GEAR_FIT[it.slot] || []).includes(stat);
  return (FIT[it && it.wtype === 'staff' ? 'staff' : it && it.wtype === 'bow' ? 'bow' : 'melee'] || []).includes(stat);
};
// คะแนนค่าสุ่ม: ค่าบวกเต็ม = +1 ต่อบรรทัด · ค่าลบเต็ม = −1 · ไม่ตรงสายนับครึ่ง
export function rollScore(it, rolled) {
  let s = 0;
  for (const r of rolled || []) {
    const f = r.value >= 0 ? (r.max > 0 ? r.value / r.max : 0) : (r.min < 0 ? -r.value / r.min : 0);
    const tw = r.value > 0 ? [1, 1, 1.15, 1.5, 2, 2.6][statTier(r.stat)] : 1;   // fix60 ขั้นสูง = คะแนนสูงขึ้น
    s += f * tw * (rollFits(it, r.stat) ? 1 : 0.5);
  }
  return s;
}
export const rollGrade = (s) => (s >= 4.5 ? ['ในตำนาน', 'g5'] : s >= 2 ? ['ยอดเยี่ยม', 'g4'] : s >= 1.1 ? ['ดีมาก', 'g3'] : s >= 0.4 ? ['ดี', 'g2'] : s >= 0 ? ['ธรรมดา', 'g1'] : ['แย่', 'g0']);

export function rollCode(it, rnd = Math.random) {
  const R = it && it.rolls; if (!R) return '';
  if (R.v2) {   // v0.52: 1–3 ค่าเสมอ (หายากขึ้นได้หลายค่าบ่อยขึ้น)
    const up = { epic: 0.08, legend: 0.12, mythic: 0.16, celestial: 0.2, abyssal: 0.22, divine: 0.25 }[it.rarity] || 0;
    const x = rnd(), n = Math.min(R.pool.length, x < 0.15 + up ? 3 : x < 0.5 + up ? 2 : 1);
    // fix60 สุ่มขั้นก่อน (ธรรมดา → ตำนาน ตามความหายากของไอเทม) แล้วสุ่มสเตตัสในขั้นนั้น · ค่าเป็นบวกเสมอ
    const W = TIER_W[it.rarity] || TIER_W.common, used = new Set(), idx = [];
    const byTier = (t) => R.pool.map((p, i) => [p, i]).filter(([p, i]) => !used.has(i) && statTier(p.stat) === t && p.max > 0);
    for (let c = 0; c < n; c++) {
      let r = rnd() * W.reduce((a, b) => a + b, 0), t = 1;
      for (let j = 0; j < 5; j++) { r -= W[j]; if (r < 0) { t = j + 1; break; } }
      let opts = byTier(t);
      for (let d = t - 1; !opts.length && d >= 1; d--) opts = byTier(d);
      for (let d = t + 1; !opts.length && d <= 5; d++) opts = byTier(d);
      if (!opts.length) break;
      const [, i] = opts[Math.floor(rnd() * opts.length)]; used.add(i); idx.push(i);
    }
    idx.sort((a, b) => a - b);
    const pick = (p) => { const lo = Math.max(1, p.min); return lo + Math.floor(rnd() * (p.max - lo + 1)); };
    return idx.map((i) => b36(i) + b36(pick(R.pool[i]))).join('.');
  }
  const [lo, hi] = R.count;
  // ได้จำนวนน้อยบ่อยกว่า: ค่าสูงสุดของช่วงโอกาส 35%
  const n = Math.min(R.pool.length, lo + (hi > lo && rnd() < 0.35 ? hi - lo : 0));
  const idx = R.pool.map((_, i) => i).sort(() => rnd() - 0.5).slice(0, n).sort((a, b) => a - b);
  const parts = idx.map((i) => { const p = R.pool[i]; return b36(i) + b36(p.min + Math.floor(rnd() * (p.max - p.min + 1))); });
  return parts.length ? parts.join('.') : '~';
}
export function decodeRoll(it, code) {
  const out = [];
  if (!code || code === '~' || !it || !it.rolls) return out;
  for (const s of code.split('.')) {
    const p = it.rolls.pool[parseInt(s[0], 36)], v = parseInt(s.slice(1), 36);
    if (!p || !Number.isFinite(v) || v < p.min || v > p.max) return null;
    out.push({ stat: p.stat, value: v, min: v < 0 ? p.min : Math.max(1, p.min), max: p.max, tier: statTier(p.stat) });
  }
  return out;
}
export const rollBonus = (rolls) => { const o = {}; for (const r of rolls || []) statToBonus(r.stat, r.value, o); return o; };

// ---------- โบนัสเซ็ต (อาวุธแดง + ชุดจันทร์โลหิต) ----------
export function setInfo(weapon, equip) {
  const s = weapon && weapon.set; if (!s) return null;
  const worn = Object.values(equip || {}).filter(Boolean).map((k) => String(k).split('*')[0]);
  const have = s.pieces.filter((p) => worn.includes(p)).length;
  const bonus = {};
  for (const [need, b] of Object.entries(s.bonus)) if (have >= +need) statsToBonus(b, bonus);
  return { name: s.name, have, total: s.pieces.length, tiers: s.bonus, bonus };
}
