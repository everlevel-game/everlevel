// fix36 มอนสเตอร์ภาพพิกเซล (PixelLab) — แผ่น 8 ทิศ แทนโมเดล 3 มิติ (ระบบเดียวกับ NPC)
// แผ่นภาพ: แถว = ทิศ N · NE · E · SE · S · SW · W · NW · คอลัมน์ = idle ต่อด้วย walk ต่อด้วย attack
// cell = ขนาดช่อง · foot = แถวพิกเซลฐานตัว · ขนาดในเกม = พิกเซล × MOB_PX (ความหนาแน่นพิกเซลเท่าตัวละคร)
// มอนที่ไม่มีในรายการ = ใช้โมเดลเดิม
const R = (a, n) => Array.from({ length: n }, (_, i) => a + i);
export const MOB_PX = 3.55 / 96;
export const MOB_SHEETS = {
  bloblet: { src: 'assets/mobs/bloblet.png', cell: 76, foot: 62, head: 19, walk: 6, attack: 6 },
  capling: { src: 'assets/mobs/capling.png', cell: 76, foot: 62, head: 12, walk: 6, attack: 6 },
  stinglet: { src: 'assets/mobs/stinglet.png', cell: 68, foot: 55, head: 13, walk: 6, attack: 6 },
  thornback: { src: 'assets/mobs/thornback.png', cell: 76, foot: 63, head: 11, walk: 6, attack: 6 },
  wisp: { src: 'assets/mobs/wisp.png', cell: 80, foot: 65, head: 13, walk: 6, attack: 6 },
  barkwolf: { src: 'assets/mobs/barkwolf.png', cell: 92, foot: 72, head: 16, walk: 6, attack: 6 },
  gnarlroot: { src: 'assets/mobs/gnarlroot.png', cell: 172, foot: 143, head: 25, walk: 6, attack: 6 },   // บอส MVP
  frostfox: { src: 'assets/mobs/frostfox.png', cell: 76, foot: 63, head: 11, walk: 6, attack: 6 },
  frostbat: { src: 'assets/mobs/frostbat.png', cell: 84, foot: 60, head: 21, walk: 6, attack: 6 },
  yeti: { src: 'assets/mobs/yeti.png', cell: 124, foot: 104, head: 25, walk: 6, attack: 6 },
  icegolem: { src: 'assets/mobs/icegolem.png', cell: 124, foot: 104, head: 20, walk: 6, attack: 6 },
  glacia: { src: 'assets/mobs/glacia.png', cell: 128, foot: 104, head: 20, walk: 6, attack: 6, k: 1.25 },   // บอส MVP
  magmaslime: { src: 'assets/mobs/magmaslime.png', cell: 76, foot: 64, head: 11, walk: 6, attack: 6 },
  emberimp: { src: 'assets/mobs/emberimp.png', cell: 76, foot: 63, head: 12, walk: 6, attack: 6 },
  salamander: { src: 'assets/mobs/salamander.png', cell: 80, foot: 62, head: 12, walk: 6, attack: 6 },
  obsidiangolem: { src: 'assets/mobs/obsidiangolem.png', cell: 132, foot: 110, head: 21, walk: 6, attack: 6 },
  ignarok: { src: 'assets/mobs/ignarok.png', cell: 180, foot: 151, head: 29, walk: 6, attack: 6 },   // บอส MVP
};

export function mobSheetDef(d) {
  const i = d.idle || 1, w = d.walk || 0, a = d.attack || 0;
  const k = d.k || 1;
  return {
    src: d.src, cols: i + w + a, rows: 8, rowsPerDir: 1, pixel: true, anch: null, npc: true, mob: true,
    size: d.cell * MOB_PX * k, foot: d.foot / d.cell, head: d.head / d.cell,
    anim: { idle: R(0, i), walk: w ? R(i, w) : R(0, i), attack: a ? R(i + w, a) : R(0, i), skill: a ? R(i + w, a) : R(0, i) }, row: {},
    fps: { idle: { fps: 8, loop: true }, walk: { fps: 10, loop: true }, attack: { fps: 14, loop: false }, skill: { fps: 12, loop: false } },
  };
}
