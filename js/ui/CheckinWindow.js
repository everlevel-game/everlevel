// fix52 ปฏิทินเช็กอิน 30 วัน — ตารางรางวัล 6×5 · วันพิเศษ 7/14/21/28 · วันที่ 30 รางวัลใหญ่ · กดรับรางวัลวันนี้ที่แถบล่าง
import { ITEMS } from '../data/items.js?v=0.93.0-p4.83';
import { iconURL } from '../render/ItemIcons.js?v=0.93.0-p4.83';
import { loginReward, LOGIN_DAYS, LOGIN_MILESTONES } from '../data/collection.js?v=0.93.0-p4.83';
import { localDay } from '../systems/Collection.js?v=0.93.0-p4.83';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const short = (n) => (n >= 1e6 ? +(n / 1e6).toFixed(1) + 'M' : n >= 1000 ? +(n / 1000).toFixed(1) + 'k' : String(n));
const coin = '<i class="ci-coin" aria-hidden="true"></i>';

function rewardIcons(r, max = 4) {
  const out = [];
  if (r.zeny) out.push(`<span class="ci-it" title="${r.zeny.toLocaleString('en-US')} Zeny">${coin}<small>${short(r.zeny)}</small></span>`);
  for (const [id, q] of r.items) if (ITEMS[id]) out.push(`<span class="ci-it" title="${esc(ITEMS[id].name)} ×${q}"><img alt="" src="${iconURL(id)}"><small>×${q}</small></span>`);
  return out.slice(0, max).join('');
}

export class CheckinWindow {
  constructor(root, game) {
    this.g = game;
    const el = this.el = document.createElement('section');
    el.className = 'panel tm checkinw'; el.hidden = true;
    el.setAttribute('aria-label', 'ปฏิทินเช็กอิน');
    el.innerHTML = `<header class="st-head"><div><h2>ปฏิทินเช็กอิน</h2><p>เข้าเกมวันละครั้ง รับรางวัลทุกวัน</p></div><button type="button" class="st-close" aria-label="ปิด">✕</button></header>
      <div class="ci-info"><span class="ci-count"></span><span class="ci-reset">รีเซ็ตทุกวันเวลา 00:00 น. (เวลาเครื่อง)</span></div>
      <div class="ci-grid"></div>
      <footer class="ci-foot"><div class="ci-today"></div><div class="ci-prog"><b>เช็กอินครบ ${LOGIN_DAYS} วัน รับรางวัลใหญ่!</b><div class="ci-bar"><i></i></div><small class="ci-n"></small></div><button type="button" class="ci-claim">รับรางวัล</button></footer>`;
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    (root.querySelector('.hud') || root).append(el);
    el.querySelector('.st-close').addEventListener('click', () => this.toggle(false));
    el.querySelector('.ci-claim').addEventListener('click', () => {
      const r = this.g.collection.claimDay();
      if (!r.ok) this.g.hud.log(r.msg, 'sys');
      this.render(); this.badge();
    });
  }

  get open() { return !this.el.hidden; }
  toggle(on = !this.open) { this.el.hidden = !on; if (on) this.render(); }

  // จุดแดงบนปุ่มด้านบน = ยังไม่ได้กดรับวันนี้
  badge() {
    const b = document.querySelector('#checkinBadge'); if (!b) return;
    const col = this.g.collection; b.hidden = !col || !col.c || col.claimed();
  }

  render() {
    this.badge();
    if (!this.open) return;
    const col = this.g.collection, ci = col.c.ci, lv = this.g.player.baseLevel;
    const today = localDay(), checked = ci.last === today, claimed = col.claimed();
    const cur = ci.day || 0;
    this.compact = innerHeight <= 820;
    const cells = [];
    for (let d = 1; d <= LOGIN_DAYS; d++) {
      const r = loginReward(d, lv);
      const done = d < cur || (d === cur && claimed);
      const now = d === cur && !claimed;
      const cls = ['ci-day', done && 'done', now && 'now', LOGIN_MILESTONES.includes(d) && 'mile', d === LOGIN_DAYS && 'grand'].filter(Boolean).join(' ');
      cells.push(`<div class="${cls}"><b>วันที่ ${d}${d === LOGIN_DAYS ? ' <em>รางวัลใหญ่!</em>' : ''}</b><div class="ci-rw">${rewardIcons(r, d === LOGIN_DAYS ? (this.compact ? 3 : 6) : 3)}</div>${done ? '<span class="ci-ok" aria-label="รับแล้ว">✔<small>รับแล้ว</small></span>' : now ? '<span class="ci-now">รับได้เลย!</span>' : ''}</div>`);
    }
    this.el.querySelector('.ci-grid').innerHTML = cells.join('');
    this.el.querySelector('.ci-count').textContent = `เช็กอินรอบนี้ ${cur}/${LOGIN_DAYS} วัน · รวมทั้งหมด ${ci.count} วัน — ไม่ต้องเข้าติดกัน วันที่ขาดไม่ทำให้นับใหม่`;
    const showDay = claimed ? Math.min(LOGIN_DAYS, (cur % LOGIN_DAYS) + 1) : cur || 1;
    this.el.querySelector('.ci-today').innerHTML = `<i class="ci-gift" aria-hidden="true"></i><div><small>${claimed ? `พรุ่งนี้ (วันที่ ${showDay})` : `รางวัลวันนี้ (วันที่ ${showDay})`}</small><div class="ci-rw">${rewardIcons(loginReward(showDay, lv), 6)}</div></div>`;
    this.el.querySelector('.ci-bar > i').style.width = `${(cur / LOGIN_DAYS) * 100}%`;
    this.el.querySelector('.ci-n').textContent = `${cur} / ${LOGIN_DAYS} วัน`;
    const btn = this.el.querySelector('.ci-claim');
    btn.disabled = !checked || claimed;
    btn.textContent = !checked ? 'ยังไม่ถึงเวลา' : claimed ? 'รับแล้ว · พรุ่งนี้มาใหม่' : 'รับรางวัล';
  }
}
