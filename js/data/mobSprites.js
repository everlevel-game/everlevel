// fix36 มอนสเตอร์ภาพพิกเซล (PixelLab) — แผ่น 8 ทิศ แทนโมเดล 3 มิติ (ระบบเดียวกับ NPC)
// แผ่นภาพ: แถว = ทิศ N · NE · E · SE · S · SW · W · NW · คอลัมน์ = idle ต่อด้วย walk ต่อด้วย attack
// cell = ขนาดช่อง · foot = แถวพิกเซลฐานตัว · ขนาดในเกม = พิกเซล × MOB_PX (ความหนาแน่นพิกเซลเท่าตัวละคร)
// มอนที่ไม่มีในรายการ = ใช้โมเดลเดิม
const R = (a, n) => Array.from({ length: n }, (_, i) => a + i);
export const MOB_PX = 3.55 / 96;
export const MOB_SHEETS = {
  // map1 (แผ่นรวม assets/mobs/map1.png)
  bloblet: { src: 'assets/mobs/map1.png', W: 2860, H: 608, x0: 0, y0: 0, cell: 76, foot: 62, head: 19, walk: 6, attack: 6 },
  capling: { src: 'assets/mobs/map1.png', W: 2860, H: 608, x0: 988, y0: 0, cell: 76, foot: 62, head: 12, walk: 6, attack: 6 },
  stinglet: { src: 'assets/mobs/map1.png', W: 2860, H: 608, x0: 1976, y0: 0, cell: 68, foot: 55, head: 13, walk: 6, attack: 6 },
  // map2 (แผ่นรวม assets/mobs/map2.png)
  thornback: { src: 'assets/mobs/map2.png', W: 3432, H: 2016, x0: 1040, y0: 1376, cell: 76, foot: 63, head: 11, walk: 6, attack: 6 },
  wisp: { src: 'assets/mobs/map2.png', W: 3432, H: 2016, x0: 0, y0: 1376, cell: 80, foot: 65, head: 13, walk: 6, attack: 6 },
  barkwolf: { src: 'assets/mobs/map2.png', W: 3432, H: 2016, x0: 2236, y0: 0, cell: 92, foot: 72, head: 16, walk: 6, attack: 6 },
  gnarlroot: { src: 'assets/mobs/map2.png', W: 3432, H: 2016, x0: 0, y0: 0, cell: 172, foot: 143, head: 25, walk: 6, attack: 6 },
  // map3 (แผ่นรวม assets/mobs/map3.png)
  frostfox: { src: 'assets/mobs/map3.png', W: 3692, H: 2016, x0: 2704, y0: 1024, cell: 76, foot: 63, head: 11, walk: 6, attack: 6 },
  frostbat: { src: 'assets/mobs/map3.png', W: 3692, H: 2016, x0: 1612, y0: 1024, cell: 84, foot: 60, head: 21, walk: 6, attack: 6 },
  yeti: { src: 'assets/mobs/map3.png', W: 3692, H: 2016, x0: 1664, y0: 0, cell: 124, foot: 104, head: 25, walk: 6, attack: 6 },
  icegolem: { src: 'assets/mobs/map3.png', W: 3692, H: 2016, x0: 0, y0: 1024, cell: 124, foot: 104, head: 20, walk: 6, attack: 6 },
  glacia: { src: 'assets/mobs/map3.png', W: 3692, H: 2016, x0: 0, y0: 0, cell: 128, foot: 104, head: 20, walk: 6, attack: 6, k: 1.25 },
  // map4 (แผ่นรวม assets/mobs/map4.png)
  magmaslime: { src: 'assets/mobs/map4.png', W: 4056, H: 2080, x0: 1040, y0: 1440, cell: 76, foot: 64, head: 11, walk: 6, attack: 6 },
  emberimp: { src: 'assets/mobs/map4.png', W: 4056, H: 2080, x0: 2028, y0: 1440, cell: 76, foot: 63, head: 12, walk: 6, attack: 6 },
  salamander: { src: 'assets/mobs/map4.png', W: 4056, H: 2080, x0: 0, y0: 1440, cell: 80, foot: 62, head: 12, walk: 6, attack: 6 },
  obsidiangolem: { src: 'assets/mobs/map4.png', W: 4056, H: 2080, x0: 2340, y0: 0, cell: 132, foot: 110, head: 21, walk: 6, attack: 6 },
  ignarok: { src: 'assets/mobs/map4.png', W: 4056, H: 2080, x0: 0, y0: 0, cell: 180, foot: 151, head: 29, walk: 6, attack: 6 },
  // map5 (แผ่นรวม assets/mobs/map5.png)
  ruin_scarab: { src: 'assets/mobs/map5.png', W: 3692, H: 2784, x0: 1560, y0: 1216, cell: 84, foot: 70, head: 13, walk: 6, attack: 6 },
  sand_basilisk: { src: 'assets/mobs/map5.png', W: 3692, H: 2784, x0: 2652, y0: 1216, cell: 80, foot: 65, head: 12, walk: 6, attack: 6 },
  rune_sentinel: { src: 'assets/mobs/map5.png', W: 3692, H: 2784, x0: 0, y0: 1216, cell: 120, foot: 98, head: 21, walk: 6, attack: 6 },
  astral_wisp: { src: 'assets/mobs/map5.png', W: 3692, H: 2784, x0: 0, y0: 2176, cell: 76, foot: 58, head: 11, walk: 6, attack: 6 },
  relic_knight: { src: 'assets/mobs/map5.png', W: 3692, H: 2784, x0: 1976, y0: 0, cell: 128, foot: 109, head: 19, walk: 6, attack: 6 },
  aurex: { src: 'assets/mobs/map5.png', W: 3692, H: 2784, x0: 0, y0: 0, cell: 152, foot: 129, head: 28, walk: 6, attack: 6, k: 1.3 },
  // map6 (แผ่นรวม assets/mobs/map6.png)
  haunt_spider: { src: 'assets/mobs/map6.png', W: 4004, H: 3136, x0: 1144, y0: 2432, cell: 84, foot: 66, head: 22, walk: 6, attack: 6 },
  hollow_wolf: { src: 'assets/mobs/map6.png', W: 4004, H: 3136, x0: 0, y0: 2432, cell: 88, foot: 71, head: 13, walk: 6, attack: 6 },
  mourning_shade: { src: 'assets/mobs/map6.png', W: 4004, H: 3136, x0: 2236, y0: 2432, cell: 80, foot: 68, head: 12, walk: 6, attack: 6 },
  cursed_stag: { src: 'assets/mobs/map6.png', W: 4004, H: 3136, x0: 0, y0: 1408, cell: 128, foot: 108, head: 19, walk: 6, attack: 6 },
  eclipse_reaper: { src: 'assets/mobs/map6.png', W: 4004, H: 3136, x0: 2288, y0: 0, cell: 132, foot: 107, head: 29, walk: 6, attack: 6 },
  bloodmoon_knight: { src: 'assets/mobs/map6.png', W: 4004, H: 3136, x0: 1664, y0: 1408, cell: 124, foot: 105, head: 18, walk: 6, attack: 6 },
  nocthar: { src: 'assets/mobs/map6.png', W: 4004, H: 3136, x0: 0, y0: 0, cell: 176, foot: 148, head: 27, walk: 6, attack: 6, k: 1.25 },
  // map7 (แผ่นรวม assets/mobs/map7.png)
  reef_crab: { src: 'assets/mobs/map7.png', W: 3744, H: 1888, x0: 0, y0: 1280, cell: 76, foot: 62, head: 14, walk: 6, attack: 6 },
  shell_turtle: { src: 'assets/mobs/map7.png', W: 3744, H: 1888, x0: 1976, y0: 1280, cell: 68, foot: 54, head: 13, walk: 6, attack: 6 },
  abyss_jelly: { src: 'assets/mobs/map7.png', W: 3744, H: 1888, x0: 988, y0: 1280, cell: 76, foot: 65, head: 12, walk: 6, attack: 6 },
  drowned_knight: { src: 'assets/mobs/map7.png', W: 3744, H: 1888, x0: 2080, y0: 0, cell: 128, foot: 102, head: 20, walk: 6, attack: 6 },
  siren_eel: { src: 'assets/mobs/map7.png', W: 3744, H: 1888, x0: 2860, y0: 1280, cell: 68, foot: 53, head: 10, walk: 6, attack: 6 },
  tidalos: { src: 'assets/mobs/map7.png', W: 3744, H: 1888, x0: 0, y0: 0, cell: 160, foot: 137, head: 23, walk: 6, attack: 6, k: 1.25 },
  // map8 (แผ่นรวม assets/mobs/map8.png)
  shard_beetle: { src: 'assets/mobs/map8.png', W: 3744, H: 2816, x0: 0, y0: 2272, cell: 68, foot: 55, head: 13, walk: 6, attack: 6 },
  prism_golem: { src: 'assets/mobs/map8.png', W: 3744, H: 2816, x0: 0, y0: 1312, cell: 120, foot: 96, head: 18, walk: 6, attack: 6 },
  geode_wolf: { src: 'assets/mobs/map8.png', W: 3744, H: 2816, x0: 1560, y0: 1312, cell: 84, foot: 68, head: 14, walk: 6, attack: 6 },
  crystal_drake: { src: 'assets/mobs/map8.png', W: 3744, H: 2816, x0: 2132, y0: 0, cell: 124, foot: 104, head: 20, walk: 6, attack: 6 },
  prism_wisp: { src: 'assets/mobs/map8.png', W: 3744, H: 2816, x0: 2652, y0: 1312, cell: 76, foot: 61, head: 12, walk: 6, attack: 6 },
  crysthar: { src: 'assets/mobs/map8.png', W: 3744, H: 2816, x0: 0, y0: 0, cell: 164, foot: 139, head: 26, walk: 6, attack: 6, k: 1.25 },
  // map9 (แผ่นรวม assets/mobs/map9.png)
  cloud_sentinel: { src: 'assets/mobs/map9.png', W: 3900, H: 2848, x0: 0, y0: 2304, cell: 68, foot: 57, head: 11, walk: 6, attack: 6 },
  storm_griffin: { src: 'assets/mobs/map9.png', W: 3900, H: 2848, x0: 2184, y0: 0, cell: 132, foot: 112, head: 20, walk: 6, attack: 6 },
  seraph_knight: { src: 'assets/mobs/map9.png', W: 3900, H: 2848, x0: 2704, y0: 1344, cell: 84, foot: 70, head: 14, walk: 6, attack: 6 },
  tempest_shade: { src: 'assets/mobs/map9.png', W: 3900, H: 2848, x0: 1560, y0: 1344, cell: 88, foot: 75, head: 20, walk: 6, attack: 6 },
  celestial_titan: { src: 'assets/mobs/map9.png', W: 3900, H: 2848, x0: 0, y0: 1344, cell: 120, foot: 99, head: 23, walk: 6, attack: 6 },
  aurelion: { src: 'assets/mobs/map9.png', W: 3900, H: 2848, x0: 0, y0: 0, cell: 168, foot: 142, head: 24, walk: 6, attack: 6, k: 1.25 },
};

export function mobSheetDef(d) {
  const i = d.idle || 1, w = d.walk || 0, a = d.attack || 0;
  const k = d.k || 1;
  return {
    src: d.src, cols: i + w + a, rows: 8, cell: d.cell, x0: d.x0 || 0, y0: d.y0 || 0, W: d.W || d.cell * (i + w + a), H: d.H || d.cell * 8, rowsPerDir: 1, pixel: true, anch: null, npc: true, mob: true,
    size: d.cell * MOB_PX * k, foot: d.foot / d.cell, head: d.head / d.cell,
    anim: { idle: R(0, i), walk: w ? R(i, w) : R(0, i), attack: a ? R(i + w, a) : R(0, i), skill: a ? R(i + w, a) : R(0, i) }, row: {},
    fps: { idle: { fps: 8, loop: true }, walk: { fps: 10, loop: true }, attack: { fps: 14, loop: false }, skill: { fps: 12, loop: false } },
  };
}
