// fix62 หน้าต่างล้นจอ (มือถือแนวนอน · ขนาด UI ใหญ่ · เบราว์เซอร์ที่คิด zoom ต่างกัน เช่น Safari)
// วัดขนาดจริงของหน้าต่างที่เปิดอยู่ ถ้าล้นขอบจอ → ย่อทั้งหน้าต่างให้พอดี แล้วเลื่อนให้อยู่ในจอ
const SKIP = /\b(char|mini|chat|target|bossbar|hotbar|qtrack|party-row|pf-row|banner|buffs|help)\b/;
const M = 6;   // ระยะห่างขอบจอ (px)

export function setupFitWindows(root) {
  const hud = root.querySelector('.hud') || root;
  let raf = 0;
  const fitAll = () => { raf = 0; for (const el of hud.querySelectorAll('.panel, .dlg, .mapwin')) fit(el); };
  const later = () => { if (!raf) raf = requestAnimationFrame(fitAll); };
  const burst = () => { later(); setTimeout(later, 120); setTimeout(later, 500); };
  new MutationObserver((list) => {
    for (const m of list) {
      const t = m.target;
      if (m.type === 'childList' || (t.nodeType === 1 && (t.classList.contains('panel') || t.classList.contains('dlg') || t.classList.contains('mapwin')))) { burst(); return; }
    }
  }).observe(hud, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class'] });
  addEventListener('resize', burst);
  addEventListener('orientationchange', burst);
  return { refit: burst };
}

function fit(el) {
  if (el.hidden || !el.offsetParent || SKIP.test(el.className)) { if (el.dataset.fit) reset(el); return; }
  const cs = getComputedStyle(el);
  if (cs.position !== 'absolute' && cs.position !== 'fixed') return;
  reset(el);
  const W = innerWidth, H = innerHeight;
  let r = el.getBoundingClientRect();
  if (r.width < 200 || r.height < 80) return;
  const over = r.top < 0 || r.left < 0 || r.bottom > H || r.right > W;
  if (!over) return;
  el.dataset.fit = '1';
  const s = Math.min(1, (H - M * 2) / r.height, (W - M * 2) / r.width);
  if (s < 0.995) { el.style.zoom = String(+s.toFixed(3)); r = el.getBoundingClientRect(); }
  // เลื่อนกลับเข้าจอ (หน่วยของ translate ถูกคูณ zoom สะสม → หารกลับ)
  const k = r.width / (el.offsetWidth || r.width) || 1;
  let dx = 0, dy = 0;
  if (r.top < M) dy = M - r.top; else if (r.bottom > H - M) dy = H - M - r.bottom;
  if (r.left < M) dx = M - r.left; else if (r.right > W - M) dx = W - M - r.right;
  if (dx || dy) el.style.translate = `${Math.round(dx / k)}px ${Math.round(dy / k)}px`;
}

function reset(el) { el.style.zoom = ''; el.style.translate = ''; delete el.dataset.fit; }
