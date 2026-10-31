// fix57 มือถือถือแนวตั้ง → จอแนะนำให้หมุนเป็นแนวนอน (เล่นสบายกว่า UI ไม่ทับกัน)
// Android (Chrome) กด "หมุนจออัตโนมัติ" = เต็มจอ + ล็อกแนวนอนให้ · iOS ล็อกเองไม่ได้ แสดงคำแนะนำ · กด "เล่นแนวตั้งต่อ" = ไม่ถามอีกในรอบนี้
const KEY = 'el_rotate_skip';
const isPhone = () => (matchMedia('(pointer: coarse)').matches || document.body.classList.contains('touch')) && Math.min(screen.width, screen.height) <= 600;
const portrait = () => innerHeight > innerWidth;
const skipped = () => { try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; } };

export class RotateHint {
  constructor() {
    const el = this.el = document.createElement('div');
    el.className = 'rotate-hint';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'แนะนำให้หมุนจอเป็นแนวนอน');
    const canLock = !!(screen.orientation && screen.orientation.lock && document.documentElement.requestFullscreen);
    el.innerHTML = `<svg viewBox="0 0 120 120" aria-hidden="true">
        <path d="M22 60a38 38 0 0 1 64-28" fill="none" stroke="#ffd774" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
        <path d="M80 22l7 10-12 2" fill="none" stroke="#ffd774" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
        <g class="rh-phone"><rect x="42" y="30" width="36" height="62" rx="7" fill="#1b2a55" stroke="#fff6e0" stroke-width="3.5"/>
        <rect x="47" y="38" width="26" height="44" rx="2" fill="#5fb0ff" opacity="0.55"/><circle cx="60" cy="86.5" r="2.2" fill="#fff6e0"/></g></svg>
      <h2>หมุนจอเป็นแนวนอน</h2>
      <p>Everlevel เล่นบนมือถือได้ดีที่สุดในแนวนอน เห็นแผนที่กว้างขึ้นและปุ่มไม่ทับกัน${canLock ? '' : '<br><small>ถ้าหมุนแล้วจอไม่เปลี่ยน ให้ปิด "ล็อกการหมุนหน้าจอ" ในแถบควบคุมของมือถือก่อน</small>'}</p>
      <div class="rh-btns">${canLock ? '<button type="button" class="rh-lock">หมุนจอให้อัตโนมัติ</button>' : ''}<button type="button" class="rh-skip">เล่นแนวตั้งต่อ</button></div>`;
    document.body.append(el);
    el.querySelector('.rh-skip').addEventListener('click', () => { try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* โหมดส่วนตัว */ } this.update(); });
    const lock = el.querySelector('.rh-lock');
    if (lock) lock.addEventListener('click', async () => {
      try {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        await screen.orientation.lock('landscape');
      } catch (e) { lock.textContent = 'หมุนเองไม่ได้ — กรุณาหมุนมือถือ'; lock.disabled = true; }
      this.update();
    });
    const up = () => setTimeout(() => this.update(), 80);
    addEventListener('resize', up);
    addEventListener('orientationchange', up);
    this.update();
  }

  update() { this.el.classList.toggle('show', isPhone() && portrait() && !skipped()); }
}
