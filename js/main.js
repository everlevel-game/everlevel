// จุดเริ่มต้นของเกม — ตรวจว่าโหลด Three.js ได้ก่อน แล้วค่อยโหลดตัวเกม
// v0.11: หน้าเข้าเกม (เลือก/สร้างตัวละคร หรือเล่นออฟไลน์) ก่อนเริ่มโลก
// v0.12: ถ้าตั้งค่าเซิร์ฟเวอร์ Supabase ไว้ (js/net/server-config.js) → สมัคร/เข้าสู่ระบบด้วยอีเมล + รหัสผ่าน เล่นบนเบราว์เซอร์ไหนก็ได้
// v0.13: โหลดไฟล์ตั้งค่าแบบไม่บังคับ — ถ้าไม่มีไฟล์นี้ เกมยังเปิดได้ (โหมดออฟไลน์/บัญชี Claude)
import { hookErrors, report, attachReporter } from './net/ErrorReporter.js?v=0.93.0-p4.13';   // v0.93 fix15 รายงานปัญหาอัตโนมัติ
hookErrors();

async function serverConfig() {
  if(window.__contentPreview)return {};
  try { return await import('./net/server-config.js?v=0.93.0-p4.13'); } catch (e) { return {}; }
}

const root = document.getElementById('game');
const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

// v0.94 fix31 เบราว์เซอร์เปิด 3D (WebGL) ไม่ได้ → บอกวิธีแก้ที่ได้ผลจริงตามเครื่อง (รีเฟรช/ล้างแคชไม่ช่วย)
function fatalWebGL() {
  const ua = navigator.userAgent || '', ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua), safari = /Safari/.test(ua) && !/Chrome|CriOS|Edg|Firefox/.test(ua);
  const tips = ios ? [
    'ปิด "โหมดล็อกดาวน์" (การตั้งค่า → ความเป็นส่วนตัวและความปลอดภัย → โหมดล็อกดาวน์) หรือยกเว้นเว็บ everlevel.net',
    'ปิดแอป Safari/Chrome ให้หมด (ปัดทิ้ง) แล้วเปิดใหม่',
    'ปิดแท็บอื่นที่เปิดค้างไว้เยอะ ๆ',
  ] : android ? [
    'ปิดแอปเบราว์เซอร์ให้หมด (ปัดทิ้ง) แล้วเปิดใหม่',
    'ปิดแอป/แท็บอื่นที่เปิดค้าง ให้เครื่องมีหน่วยความจำว่าง',
    'ลองใช้ Chrome เวอร์ชันล่าสุด',
  ] : [
    'ปิด Chrome ให้หมดทุกหน้าต่าง (รวมไอคอนมุมขวาล่าง) แล้วเปิดใหม่ — กดรีเฟรชอย่างเดียวไม่หาย',
    'เปิด "ใช้การเร่งฮาร์ดแวร์เมื่อพร้อมใช้งาน" ที่ chrome://settings/system แล้วกดเปิดใหม่',
    'อัปเดตไดรเวอร์การ์ดจอ (NVIDIA / AMD / Intel) แล้วรีสตาร์ทเครื่อง',
  ];
  if (safari && !ios) tips.unshift('Safari: เมนู Safari → การตั้งค่า → ขั้นสูง → เปิด "แสดงคุณสมบัติสำหรับนักพัฒนาเว็บ" แล้วตรวจว่าไม่ได้ปิด WebGL');
  const el = document.createElement('div');
  el.className = 'fatal fatal-gl';
  const h = document.createElement('b'); h.textContent = 'เบราว์เซอร์ปิดกราฟิก 3D ของเครื่องนี้ไว้ชั่วคราว เกมจึงเปิดไม่ได้';
  const p = document.createElement('div'); p.style.cssText = 'margin:8px 0 6px;opacity:.85'; p.textContent = 'มักเกิดเมื่อการ์ดจอรีเซ็ตหลายครั้งติดกัน ลองทำตามนี้:';
  const ol = document.createElement('ol'); ol.style.cssText = 'text-align:left;margin:0 auto;max-width:520px;padding-left:22px;line-height:1.6';
  for (const t of tips) { const li = document.createElement('li'); li.textContent = t; ol.append(li); }
  const bt = document.createElement('button'); bt.className = 'btn'; bt.style.marginTop = '10px'; bt.textContent = 'ลองใหม่'; bt.onclick = () => location.reload();
  el.append(h, p, ol, bt);
  root.append(el);
  root.classList.add('ready');
}

function fatal(msg) {
  const el = document.createElement('div');
  el.className = 'fatal';
  el.textContent = msg;
  root.append(el);
  root.classList.add('ready');
}

// v0.93 fix13 หน้าเว็บ (index.html) ถูกแคชไว้ → กด "อัปเดตเลย" แล้วยังได้ไฟล์เก่า แถบแจ้งอัปเดตขึ้นซ้ำ
// เทียบเวอร์ชันของไฟล์ที่โหลดอยู่ (จาก ?v= ของ main.js) กับ version.json บนเซิร์ฟเวอร์ → เก่ากว่า = โหลดหน้าใหม่แบบข้ามแคช (สูงสุด 1 ครั้ง/10 นาที)
export async function freshReload() {
  try { await fetch('index.html', { cache: 'reload' }); } catch (e) { /* ออฟไลน์ */ }
  const u = new URL(location.href); u.searchParams.set('u', Date.now().toString(36));
  location.replace(u.toString());
}
// v0.93 fix14 กันมือถือ (Android) แท็บแครชวนซ้ำตอนเข้าเกม: จดเวลา "กำลังเข้าเกม" ไว้ ถ้าโหลดหน้าครั้งถัดไปยังเจอ (= ครั้งก่อนแครชก่อนเข้าเกมสำเร็จ)
// → เปิด "โหมดภาพประหยัด" อัตโนมัติ: ปิด HD/แสงเรือง · คุณภาพต่ำสุด · เอฟเฟกต์วาร์ป/เลเวลอัป/วงวาร์ปแบบเบา
const BOOT = 'everlevel.boot', SAFE = 'everlevel.safe';
function bootMark() {
  try {
    const prev = +localStorage.getItem(BOOT) || 0;
    if (prev && Date.now() - prev < 20 * 60000) report('boot_crash', `ครั้งก่อนเข้าเกมไม่สำเร็จ (แท็บปิด/แครชระหว่างโหลด)${localStorage.getItem(SAFE) === '1' ? ' · ขณะอยู่ในโหมดประหยัด' : ''}`, '', { at: new Date(prev).toISOString() });
    if (prev && Date.now() - prev < 20 * 60000 && localStorage.getItem(SAFE) !== '1') {
      localStorage.setItem(SAFE, '1');
      const k = 'asteria.settings', st = JSON.parse(localStorage.getItem(k) || '{}') || {};
      Object.assign(st, { hd: false, bloom: false, quality: '3' }); localStorage.setItem(k, JSON.stringify(st));
      window.__safeJustOn = true;
    }
    localStorage.setItem(BOOT, String(Date.now()));
  } catch (e) { /* ไม่มีที่เก็บ */ }
}
function bootOk() { setTimeout(() => { try { localStorage.removeItem(BOOT); } catch (e) { /* */ } }, 10000); }
// มือถือหน่วยความจำน้อย (≤ 4 GB) ที่ยังไม่เคยตั้งค่า → เริ่มที่ภาพพิกเซล (ปิด HD) เบาเครื่อง
function lowMemDefaults() {
  try {
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches, mem = navigator.deviceMemory || 8;
    if (coarse && mem <= 4 && !localStorage.getItem('asteria.settings')) localStorage.setItem('asteria.settings', JSON.stringify({ hd: false, quality: '3' }));
  } catch (e) { /* */ }
}
lowMemDefaults();

async function staleGuard() {
  try {
    const mine = new URL(import.meta.url).searchParams.get('v') || '', m = /^([\d.]+)-p(\d+)/.exec(mine); if (!m) return false;
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 2500);
    const j = await (await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store', signal: ctl.signal })).json(); clearTimeout(tm);
    const cmp = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; };
    const c = cmp(j.version, m[1]), stale = c > 0 || (c === 0 && (+j.patch || 0) > +m[2]);
    if (!stale) return false;
    const last = +sessionStorage.getItem('everlevel.fresh') || 0; if (Date.now() - last < 600000) return false;
    sessionStorage.setItem('everlevel.fresh', String(Date.now()));
    await freshReload(); return true;
  } catch (e) { return false; }
}

// v0.31.1: อัปเดตเกมแล้วเบราว์เซอร์ยังจำไฟล์เก่าบางไฟล์ (แคช ~10 นาทีของ GitHub Pages) → ไฟล์เก่า/ใหม่ปนกันจนเริ่มเกมไม่ได้
// เริ่มไม่สำเร็จครั้งแรก: โหลดไฟล์ .js/.css ของเกมใหม่จากเซิร์ฟเวอร์ (ข้ามแคช) แล้วรีเฟรชหน้า 1 ครั้ง
async function healCache() {
  try {
    if (sessionStorage.getItem('everlevel.heal')) return false;
    sessionStorage.setItem('everlevel.heal', '1');
  } catch (e) { return false; }
  const urls = [...new Set(performance.getEntriesByType('resource').map((e) => e.name)
    .filter((u) => u.startsWith(location.origin) && /\.(js|css)(\?|$)/.test(u)))];
  await Promise.all(urls.map((u) => fetch(u, { cache: 'reload' }).catch(() => null)));
  location.reload();
  return true;
}

function loadScript(src, ms = 15000) {
  return new Promise((resolve) => {
    const s = document.createElement('script');
    const t = setTimeout(() => resolve(false), ms);
    s.src = src; s.async = true;
    s.onload = () => { clearTimeout(t); resolve(true); };
    s.onerror = () => { clearTimeout(t); resolve(false); };
    document.head.append(s);
  });
}

// เลือกระบบออนไลน์: เซิร์ฟเวอร์ของเกมเอง (Supabase) → บัญชี Claude (เปิดผ่าน claude.ai) → ออฟไลน์
async function createOnline({ Online }) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = await serverConfig();
  // รับได้ทั้ง Project URL และลิงก์ที่มี /rest/v1/ ต่อท้าย (ตัดเหลือแค่ https://xxxx.supabase.co)
  let url = String(SUPABASE_URL || '').trim();
  try { url = new URL(url).origin; } catch (e) { url = ''; }
  const key = String(SUPABASE_ANON_KEY || '').trim();
  const configured = /^https:\/\/.+/.test(url) && key.length > 20;
  if (configured && !window.__noServer) {
    if (window.supabase || await loadScript(SUPABASE_JS)) {
      try {
        const { SupabaseOnline } = await import('./net/SupabaseOnline.js?v=0.93.0-p4.13');
        const client = window.supabase.createClient(url, key, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        });
        return new SupabaseOnline(client);
      } catch (e) { console.warn('เริ่มระบบออนไลน์ไม่สำเร็จ', e); }
    }
    const o = new Online();
    o.serverDown = true;   // หน้าเข้าเกมจะบอกว่าต่อเซิร์ฟเวอร์ไม่ได้
    return o;
  }
  return new Online();
}

if (!window.THREE) {
  fatal('โหลดกราฟิก 3 มิติ (Three.js) ไม่สำเร็จ — ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วรีเฟรชหน้า');
} else {
  staleGuard().then((went) => { if (went) return new Promise(() => {}); }).then(() => Promise.all([import('./core/Game.js?v=0.93.0-p4.13'), import('./net/Online.js?v=0.93.0-p4.13'), import('./audio/AudioEngine.js?v=0.93.0-p4.13'), import('./ui/TitleScreen.js?v=0.93.0-p4.13'), import('./core/Save.js?v=0.93.0-p4.13'), import('./render/CardPortraits.js?v=0.93.0-p4.13')])
    .then(async ([{ Game }, OnlineMod, { AudioEngine }, { TitleScreen }, { SaveManager }, Portraits]) => {
      const step = (v, t) => { try { if (window.__loadStep) window.__loadStep(v, t); } catch (e) { /* หน้าโหลดไม่มีก็ได้ */ } };
      step(30, 'กำลังวาดตัวละครและมอนสเตอร์…');
      await Portraits.preloadMonsterPortraits();
      step(48, 'กำลังเชื่อมต่อเซิร์ฟเวอร์…');   // v0.24.2: ไอคอนอุปกรณ์วาดสดแล้ว ไม่ต้องโหลดภาพ
      const online = await createOnline(OnlineMod);
      let gameRef = null;
      if (online && online.sb) attachReporter(online.sb, () => { const g = gameRef; return g && g.player ? { char: g.player.name, map: g.map && g.map.id, fps: g.lastFps || 0 } : {}; });
      const audio = new AudioEngine();
      step(66, 'กำลังสร้างโลก…');
      const game = new Game(root, { online, audio });
      gameRef = game;
      window.asteria = game; // ไว้ดีบักผ่านคอนโซล
      // ทดสอบอัตโนมัติ: ข้ามหน้าเข้าเกม
      if (window.__autostart) return game.start(window.__autostart === true ? null : window.__autostart);   // (ทดสอบ: ไม่จดเวลาเข้าเกม)
      root.classList.add('ready', 'title');
      const localSave = await new SaveManager().load();
      const choice = await new TitleScreen(root, { online, audio, localSave }).run();
      root.classList.remove('title', 'ready');
      void root.offsetWidth;
      bootMark();
      return Promise.resolve(game.start(choice)).then((r) => { bootOk(); return r; });
    })
    .then(() => { try { sessionStorage.removeItem('everlevel.heal'); } catch (e) { /* ไม่มีที่เก็บ */ } })
    .catch(async (err) => {
      console.error(err);
      report('start_fail', err && err.message ? err.message : String(err), err && err.stack);
      if ((err && err.webgl) || /WebGL/i.test(String(err && err.message))) {   // v0.94 fix31 ล้างแคช/โหลดวนไม่ช่วย → บอกวิธีแก้ · ครั้งหน้าเริ่มแบบภาพประหยัด
        try { localStorage.setItem(SAFE, '1'); const k = 'asteria.settings', st = JSON.parse(localStorage.getItem(k) || '{}') || {}; Object.assign(st, { hd: false, bloom: false, quality: '3' }); localStorage.setItem(k, JSON.stringify(st)); } catch (e) { /* */ }
        return fatalWebGL();
      }
      if (await healCache()) return;   // กำลังโหลดไฟล์ใหม่แล้วรีเฟรช
      fatal('เริ่มเกมไม่สำเร็จ: ' + (err && err.message ? err.message : err) + ' — ลองกด Ctrl+Shift+R (มือถือ: ล้างแคชเบราว์เซอร์) แล้วเปิดใหม่');
    }));
}
