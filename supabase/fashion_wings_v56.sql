-- fix56 ปีกมารทมิฬ (Demon Darkness Wings) — ขายในร้านเพชร 120 เพชร (แก้ได้ที่คอลัมน์ price)
-- วิธีใช้: Supabase → SQL Editor → วางทั้งไฟล์ → Run (รันซ้ำได้)
insert into public.cash_products (id, kind, ref, qty, price, cat, tag, sort) values
  ('f_dx_demon', 'fashion', 'w_dx_demon', 1, 120, 'fashion', 'ใหม่', -11)
on conflict (id) do update set kind = excluded.kind, ref = excluded.ref, qty = excluded.qty, price = excluded.price,
  cat = excluded.cat, tag = excluded.tag, sort = excluded.sort, active = true;

-- ชุดแฟชั่นที่หาได้จากร้านเพชรเท่านั้น (ระบบกันโกงตรวจว่ามีประวัติซื้อ) — รายการเดิมบนเซิร์ฟเวอร์ (รวมออร่า 12 แบบ) + ปีกใหม่
create or replace function public._cash_only_fashion()
returns text[] language sql immutable as $$
  select array['a_wx_iron', 'a_wx_jade', 'a_wx_qi', 'a_wx_soulscythe', 'a_wx_sunfire', 'a_wx_bloodscythe', 'a_wx_heaven', 'a_wx_ascend', 'o_px_dragon',
               'a_cs_galaxy', 'a_cs_nebula', 'a_cs_blackhole', 'a_cs_solar', 'a_cs_guardian',
               'a_rp_reaper', 'w_lw_seraph', 'w_lw_abyss',
               'w_dx_phoenix', 'w_dx_infernal', 'w_dx_sakura', 'w_dx_void', 'w_dx_prism', 'w_dx_storm',
               'a_la_inferno', 'a_la_divine', 'a_la_sakura', 'a_la_abyss', 'a_la_frost', 'a_la_thunder', 'a_la_celestial', 'a_la_lotus',
               'a_la_bloodmoon', 'a_la_bloom', 'a_la_tide', 'a_la_chrono',
               'w_dx_solar', 'w_dx_demon']
$$;
revoke all on function public._cash_only_fashion() from public, anon, authenticated;
