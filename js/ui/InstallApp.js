// fix55 ติดตั้งเกมเป็นแอป (PWA) — Android/คอม: ปุ่มติดตั้งของเบราว์เซอร์ · iPhone/iPad: บอกวิธีเพิ่มลงหน้าจอโฮม
const isStandalone = () => matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export class InstallApp {
  constructor(root, game) {
    this.g = game; this.prompt = null;
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
    addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); this.prompt = e; });
    // แนะนำครั้งเดียวบนมือถือ (ยังไม่ได้ติดตั้ง)
    setTimeout(() => { try { if (isStandalone() || !document.body.classList.contains('touch') || localStorage.getItem('el_app_hint')) return; localStorage.setItem('el_app_hint', '1'); this.g.hud?.log('📲 ติดตั้ง Everlevel เป็นแอปได้ฟรี เล่นเต็มจอเหมือนแอปจริง — เมนู ☰ › ติดตั้งแอป', 'lv'); } catch (e) { /* โหมดส่วนตัว */ } }, 20000);
    addEventListener('appinstalled', () => { this.prompt = null; this.g.hud?.log('📲 ติดตั้ง Everlevel เป็นแอปแล้ว · เปิดจากไอคอนบนหน้าจอได้เลย', 'lv'); });
    const el = this.el = document.createElement('section');
    el.className = 'panel tm appw'; el.hidden = true;
    el.setAttribute('aria-label', 'ติดตั้งแอป');
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    (root.querySelector('.hud') || root).append(el);
    el.addEventListener('click', (e) => {
      if (e.target.closest('.st-close')) this.toggle(false);
      if (e.target.closest('[data-install]')) this.install();
    });
  }
  get installed() { return isStandalone(); }
  get open() { return !this.el.hidden; }
  toggle(on = !this.open) { this.el.hidden = !on; if (on) this.render(); }
  async install() {
    if (!this.prompt) return;
    this.prompt.prompt();
    const r = await this.prompt.userChoice.catch(() => null);
    this.prompt = null;
    if (r && r.outcome === 'accepted') this.toggle(false); else this.render();
  }
  render() {
    const ios = isIOS();
    let body;
    if (this.installed) body = '<p class="app-ok">✔ คุณกำลังเล่นจากแอปอยู่แล้ว</p>';
    else if (this.prompt) body = `<p>ติดตั้ง Everlevel ไว้บนหน้าจอ เปิดเล่นเต็มจอได้ทันทีเหมือนแอปทั่วไป ไม่กินพื้นที่เครื่อง และอัปเดตเองอัตโนมัติ</p><button type="button" class="app-btn" data-install="1">📲 ติดตั้งแอป</button>`;
    else if (ios) body = `<p>บน iPhone / iPad ติดตั้งได้ 3 ขั้นตอน (ใช้ Safari):</p>
      <ol class="app-steps"><li>แตะปุ่ม <b>แชร์</b> <span class="app-ic">⬆︎</span> ด้านล่างหรือด้านบนของ Safari</li><li>เลื่อนลงแล้วเลือก <b>เพิ่มไปยังหน้าจอโฮม</b> <span class="app-ic">＋</span></li><li>แตะ <b>เพิ่ม</b> — ไอคอน Everlevel จะอยู่บนหน้าจอโฮม เปิดแล้วเล่นเต็มจอ</li></ol>`;
    else body = `<p>เปิดเมนูของเบราว์เซอร์ <b>⋮</b> แล้วเลือก <b>ติดตั้งแอป</b> หรือ <b>เพิ่มลงในหน้าจอหลัก</b></p><p class="app-hint">ถ้าไม่เห็นตัวเลือกนี้ ให้เปิด everlevel.net ด้วย Chrome หรือ Edge</p>`;
    this.el.innerHTML = `<header class="st-head"><div><h2>ติดตั้งเป็นแอป</h2><p>ฟรี · ไม่ต้องผ่าน App Store / Play Store</p></div><button type="button" class="st-close" aria-label="ปิด">✕</button></header>
      <div class="app-body"><img class="app-logo" src="assets/app/icon-192.png" alt="">${body}</div>`;
  }
}
