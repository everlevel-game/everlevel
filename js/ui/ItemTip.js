// v0.94 กล่องรายละเอียดไอเทมแบบลอย (ชี้เมาส์ดู · มือถือแตะไอคอน) — ใช้ในตลาดซื้อขาย
import { ITEMS, EQUIP_SLOTS, RARITY, describeBonus, canJobUse, itemMods, BASE_ITEMS } from '../data/items.js?v=0.93.0-p4.67';
import { weaponLines, rollLine } from './WeaponInfo.js?v=0.93.0-p4.67';
import { refineBonus } from '../data/refine.js?v=0.93.0-p4.67';
import { CARDS, cardSlotName } from '../data/cards.js?v=0.93.0-p4.67';
import { JOBS } from '../data/progression.js?v=0.93.0-p4.67';
import { iconURL } from '../render/ItemIcons.js?v=0.93.0-p4.67';
import { upgradeInfo } from '../data/gearScore.js?v=0.93.0-p4.67';

const TYPE = { usable: 'ของใช้', equip: 'อุปกรณ์', etc: 'ของสะสม', card: 'การ์ด', box: 'กล่อง' };
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function itemTipHTML(id, p) {
  const it = ITEMS[id]; if (!it) return '';
  const rar = RARITY[it.rarity || 'common'] || RARITY.common, lines = [];
  if (p && it.type === 'equip') {
    const up = upgradeInfo(p, id);
    if (up) lines.push(`<span class="it-up">▲ ดีกว่า${up.cur ? `${esc(ITEMS[up.cur].name)} ที่ใส่อยู่ (+${up.pct}%)` : 'ช่องที่ยังว่าง'}</span>`);
  }
  if (it.heal) { const h = []; if (it.heal.hp) h.push(`HP +${it.heal.hp[0]}~${it.heal.hp[1]}`); if (it.heal.sp) h.push(`SP +${it.heal.sp[0]}~${it.heal.sp[1]}`); lines.push(`ฟื้นฟู ${h.join(' · ')}`); }
  if (it.effect) lines.push(esc(it.effect));
  const mods = it.type === 'equip' ? itemMods(id) : null;
  if (it.form && p) {
    lines.push(...weaponLines(it, p));
    if (mods.refine) lines.push(`<span class="ref-line">ตีบวก +${mods.refine}: ${describeBonus(refineBonus(BASE_ITEMS[mods.base], mods.refine))}</span>`);
    for (const c of mods.cards) lines.push(`<span class="card-line">${esc(ITEMS[c].name)}: ${describeBonus(CARDS[c].bonus)}</span>`);
  } else if (mods && (mods.refine || mods.cards.length)) {
    if (Object.keys(it.baseBonus || {}).length) lines.push(describeBonus(it.baseBonus));
    if (mods.refine) lines.push(`<span class="ref-line">ตีบวก +${mods.refine}: ${describeBonus(refineBonus(BASE_ITEMS[mods.base], mods.refine))}</span>`);
    for (const c of mods.cards) lines.push(`<span class="card-line">${esc(ITEMS[c].name)}: ${describeBonus(CARDS[c].bonus)}</span>`);
  } else if (it.bonus) lines.push(it.type === 'card' ? `ใส่ได้กับ: ${cardSlotName(it.on)} · ${describeBonus(it.bonus)}` : describeBonus(it.rolled ? it.baseBonus : it.bonus));
  if (!it.form && it.rolls) lines.push(rollLine(it));
  if (mods && mods.slots) lines.push(`ช่องการ์ด: ${Array.from({ length: mods.slots }, (_, i) => (mods.cards[i] ? `[${esc(ITEMS[mods.cards[i]].name)}]` : '[ว่าง]')).join(' ')}`);
  if (it.reqLevel) lines.push(`<span class="${p && p.baseLevel < it.reqLevel ? 'bad' : ''}">ต้องการ Base Lv.${it.reqLevel}</span>`);
  if (it.jobs) lines.push(`<span class="${p && !canJobUse(it, p.jobId) ? 'bad' : ''}">อาชีพ: ${it.jobs.map((j) => (JOBS[j] ? JOBS[j].name : j)).join(', ')}</span>`);
  const slot = it.slot ? ' · ' + ((EQUIP_SLOTS.find((s) => s.id === it.slot) || {}).name || '') : '';
  return `<div class="it-head"><img alt="" src="${iconURL(id)}"><div><b style="color:${rar.color}">${esc(it.name)}</b><small>${TYPE[it.type] || ''}${slot} · ${esc(rar.name)}</small></div></div>`
    + (it.desc ? `<p class="it-desc">${esc(it.desc)}</p>` : '') + (lines.length ? `<p class="it-stats">${lines.join('<br>')}</p>` : '');
}

let tipEl = null;
function tip() {
  if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'item-tip'; tipEl.hidden = true; tipEl.setAttribute('role', 'tooltip'); document.body.append(tipEl); }
  return tipEl;
}
function place(x, y) {
  const t = tip(), w = t.offsetWidth, h = t.offsetHeight, pad = 14;
  let lx = x + pad, ly = y + pad;
  if (lx + w > innerWidth - 8) lx = Math.max(8, x - w - pad);
  if (ly + h > innerHeight - 8) ly = Math.max(8, innerHeight - h - 8);
  t.style.left = lx + 'px'; t.style.top = ly + 'px';
}
export function hideItemTip() { if (tipEl) tipEl.hidden = true; }

// ผูกกับ element: ชี้เมาส์ = แสดง · เลื่อนตามเมาส์ · ออก = ซ่อน · แตะ (จอสัมผัส) = สลับแสดง/ซ่อน
export function attachItemTip(el, id, getPlayer) {
  const show = (x, y) => { const t = tip(); t.innerHTML = itemTipHTML(id, getPlayer && getPlayer()); t.hidden = false; place(x, y); };
  el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(e.clientX, e.clientY); });
  el.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && tipEl && !tipEl.hidden) place(e.clientX, e.clientY); });
  el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hideItemTip(); });
  el.addEventListener('click', (e) => { if (e.pointerType && e.pointerType !== 'mouse') { if (tipEl && !tipEl.hidden) hideItemTip(); else { const r = el.getBoundingClientRect(); show(r.right, r.top); } } });
}
