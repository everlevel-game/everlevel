-- fix43 ปีกแฟชั่นสองชั้น 8 ทิศ — ขายในร้านเพชร (ราคาเป็นเพชร แก้ได้ที่คอลัมน์ price)
insert into public.cash_products (id, kind, ref, qty, price, cat, tag, sort) values
  ('f_lw_seraph', 'fashion', 'w_lw_seraph', 1, 100, 'fashion', 'ใหม่', -4),
  ('f_lw_abyss',  'fashion', 'w_lw_abyss',  1, 100, 'fashion', 'ใหม่', -3)
on conflict (id) do update set kind = excluded.kind, ref = excluded.ref, qty = excluded.qty, price = excluded.price,
  cat = excluded.cat, tag = excluded.tag, sort = excluded.sort, active = true;

-- ชุดเกราะมังกรถอดออกจากเกมแล้ว → ปิดการขาย (ประวัติการซื้อยังอยู่)
update public.cash_products set active = false where id = 'f_dragon' or ref = 'o_px_dragon';

-- ชุดแฟชั่นที่หาได้จากร้านเพชรเท่านั้น (ระบบกันโกงตรวจว่ามีประวัติซื้อ)
create or replace function public._cash_only_fashion()
returns text[] language sql immutable as $$
  select array['a_wx_iron', 'a_wx_jade', 'a_wx_qi', 'a_wx_soulscythe', 'a_wx_sunfire', 'a_wx_bloodscythe', 'a_wx_heaven', 'a_wx_ascend', 'o_px_dragon',
               'a_cs_galaxy', 'a_cs_nebula', 'a_cs_blackhole', 'a_cs_solar', 'a_cs_guardian',
               'a_rp_reaper', 'w_lw_seraph', 'w_lw_abyss']
$$;
revoke all on function public._cash_only_fashion() from public, anon, authenticated;
