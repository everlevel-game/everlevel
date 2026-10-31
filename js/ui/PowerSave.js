// fix61 โหมดประหยัดพลังงาน — ไม่แตะจอตามเวลาที่ตั้ง → จอดำแสดงสรุปตัวละคร · เกมเดินต่อ (ตีออโต้/เก็บของ/เซฟ) แต่ไม่วาดภาพ 3D
// ตั้งค่า: powerSave (เปิด/ปิด) · powerSaveMin (นาที) · ปุ่ม "เปิดเลย" ในหน้าตั้งค่า · กลับเข้าเกม = เลื่อนปุ่ม (มือถือ) หรือกดปุ่มใดก็ได้ (คอม)
import { HP_POTS, SP_POTS } from '../systems/AutoHunt.js?v=0.93.0-p4.90';

const pad = (n) => String(n).padStart(2, '0');
const fmt = (n) => Math.round(n).toLocaleString('en-US');

export class PowerSave {
  constructor(root, game) {
    this.g = game; this.on = false; this.lastInput = performance.now();
    const el = this.el = document.createElement('div');
    el.className = 'psave'; el.hidden = true;
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'โหมดประหยัดพลังงาน');
    el.innerHTML = `
      <div class="ps-left">
        <div class="ps-brand"><img src="assets/brand/logo.png" alt="Everlevel"><small>พักสายตาสักครู่ · ตัวละครยังผจญภัยต่อ</small></div>
        <div class="ps-slide" role="slider" aria-label="เลื่อนเพื่อกลับเข้าเกม" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0">
          <span class="ps-knob" aria-hidden="true">›</span><b>เลื่อนเพื่อกลับเข้าเกม</b>
        </div>
        <div class="ps-scene" aria-hidden="true"><i class="ps-moon"></i><i class="ps-hill"></i><i class="ps-fire"></i></div>
      </div>
      <div class="ps-right">
        <div class="ps-clock"></div>
        <div class="ps-name"></div>
        <div class="ps-map"></div>
        <div class="ps-bar hp"><i></i><span></span></div>
        <div class="ps-bar sp"><i></i><span></span></div>
        <div class="ps-bar ex"><i></i><span></span></div>
        <div class="ps-info"></div>
        <div class="ps-auto"></div>
        <div class="ps-stat"></div>
      </div>`;
    root.append(el);
    this.$ = (s) => el.querySelector(s);

    // จับการแตะ/กดปุ่ม = รีเซ็ตเวลาไม่ได้ใช้งาน
    const poke = () => { this.lastInput = performance.now(); };
    for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart']) addEventListener(ev, poke, { capture: true, passive: true });
    addEventListener('keydown', (e) => { if (this.on && !e.repeat) { e.preventDefault(); this.close(); } }, { capture: true });
    addEventListener('el-powersave', () => this.open());

    // เลื่อนปุ่มเพื่อกลับเข้าเกม
    const slide = this.$('.ps-slide'), knob = this.$('.ps-knob');
    let drag = null;
    const max = () => slide.clientWidth - knob.offsetWidth - 8;
    slide.addEventListener('pointerdown', (e) => { drag = { x: e.clientX }; slide.setPointerCapture(e.pointerId); });
    slide.addEventListener('pointermove', (e) => { if (!drag) return; const d = Math.max(0, Math.min(max(), e.clientX - drag.x)); knob.style.transform = `translateX(${d}px)`; slide.setAttribute('aria-valuenow', String(Math.round(d / max() * 100))); });
    const end = (e) => { if (!drag) return; const d = e.clientX - drag.x; drag = null; knob.style.transform = ''; if (d >= max() * 0.8) this.close(); };
    slide.addEventListener('pointerup', end); slide.addEventListener('pointercancel', () => { drag = null; knob.style.transform = ''; });
    slide.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') this.close(); });
    // คอม: คลิกปุ่มก็กลับได้
    slide.addEventListener('dblclick', () => this.close());

    setInterval(() => this.tick(), 1000);
  }

  idleMs() { return Math.max(1, +(this.g.settings && this.g.settings.powerSaveMin) || 3) * 60000; }

  tick() {
    const g = this.g;
    if (this.on) { this.render(); return; }
    if (!g.started || !g.settings || !g.settings.powerSave || document.hidden) return;
    if (performance.now() - this.lastInput >= this.idleMs()) this.open();
  }

  open() {
    const g = this.g; if (this.on || !g.started || !g.player) return;
    this.on = true; g.powerSaving = true;
    const p = g.player;
    this.start = { t: Date.now(), exp: this.totalExp(), kills: g.killCount || 0 };
    this.el.hidden = false;
    g.root.classList.add('ps-on');
    try { g.audio && g.audio.duck && g.audio.duck(true); } catch (e) { /* ไม่มีระบบลดเสียง */ }
    this.render();
    void p;
  }

  close() {
    if (!this.on) return;
    this.on = false; this.g.powerSaving = false;
    this.el.hidden = true; this.g.root.classList.remove('ps-on');
    try { this.g.audio && this.g.audio.duck && this.g.audio.duck(false); } catch (e) { /* ไม่มีระบบลดเสียง */ }
    this.lastInput = performance.now();
  }

  // EXP สะสมรวม (นับข้ามเลเวล) ไว้คำนวณ EXP/นาที
  totalExp() {
    const p = this.g.player; let sum = p.baseExp;
    this._lv = this._lv || {};
    return { lv: p.baseLevel, exp: sum, next: p.baseNext };
  }

  render() {
    const g = this.g, p = g.player; if (!p) return;
    const d = new Date();
    this.$('.ps-clock').textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    this.$('.ps-name').textContent = `${p.name} · Lv.${p.baseLevel}`;
    this.$('.ps-map').textContent = (g.map && (g.map.def.subtitle ? `${g.map.name} · ${g.map.def.subtitle}` : g.map.name)) || '';
    const bar = (cls, cur, max, label) => { const b = this.$('.ps-bar.' + cls); b.querySelector('i').style.width = `${Math.max(0, Math.min(100, (cur / max) * 100))}%`; b.querySelector('span').textContent = label; };
    bar('hp', p.hp, p.maxHp, `HP ${fmt(p.hp)} / ${fmt(p.maxHp)}`);
    bar('sp', p.sp, p.maxSp, `SP ${fmt(p.sp)} / ${fmt(p.maxSp)}`);
    const ek = p.baseNext === Infinity ? 1 : p.baseExp / p.baseNext;
    bar('ex', ek, 1, p.baseNext === Infinity ? 'EXP MAX' : `EXP ${(ek * 100).toFixed(2)}%`);
    const inv = p.inventory, hp = HP_POTS.reduce((a, id) => a + inv.count(id), 0), sp = SP_POTS.reduce((a, id) => a + inv.count(id), 0);
    this.$('.ps-info').innerHTML = `<span>กระเป๋า ${inv.stacks.length} / ${inv.capacity} ช่อง</span><span>ยาฟื้น HP <b class="h">${fmt(hp)}</b> · ยาฟื้น SP <b class="s">${fmt(sp)}</b></span>`;
    const on = !!(g.auto && g.auto.on);
    this.$('.ps-auto').innerHTML = on ? '<b class="on">⚔ ออโต้กำลังทำงาน</b>' : '<b>⏸ ออโต้หยุดอยู่</b>';
    // สรุประหว่างพัก
    const s = this.start, mins = (Date.now() - s.t) / 60000;
    const now = this.totalExp();
    let gained = now.lv === s.exp.lv ? now.exp - s.exp.exp : (s.exp.next - s.exp.exp) + now.exp;   // ข้ามเลเวล (ประมาณ)
    gained = Math.max(0, gained);
    const per = mins > 0.05 ? gained / mins : 0, pct = p.baseNext && p.baseNext !== Infinity ? (per / p.baseNext) * 100 : 0;
    const kills = Math.max(0, (g.killCount || 0) - s.kills);
    this.$('.ps-stat').innerHTML = `ระหว่างพัก ${Math.floor(mins)} นาที · ล้มมอน ${fmt(kills)} ตัว<br>EXP/นาที ${fmt(per)} <small>(${pct.toFixed(2)}%)</small>`;
  }
}
