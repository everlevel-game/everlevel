// Everlevel PWA service worker (fix55) — ทำให้ติดตั้งเป็นแอปได้ · ไม่แคชไฟล์เกม (โหลดจากเว็บทุกครั้ง อัปเดตแล้วเห็นทันที ไม่ค้างเวอร์ชันเก่า)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  // ออฟไลน์ตอนเปิดแอป → หน้าแจ้งเตือนสั้น ๆ แทนหน้าข้อผิดพลาดของเบราว์เซอร์
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Everlevel</title>' +
    '<body style="margin:0;display:grid;place-items:center;height:100vh;background:#0b1632;color:#fff6d8;font-family:system-ui,sans-serif;text-align:center">' +
    '<div><h2>ไม่ได้เชื่อมต่ออินเทอร์เน็ต</h2><p>Everlevel ต้องออนไลน์เพื่อเล่น · ต่อเน็ตแล้วลองใหม่</p><button onclick="location.reload()" style="font:inherit;padding:10px 24px;border-radius:8px;border:2px solid #d9b45e;background:#2a4ea6;color:#fff">ลองใหม่</button></div>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});
