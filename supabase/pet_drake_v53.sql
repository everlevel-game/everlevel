-- fix53 สัตว์เลี้ยงเก็บของ: มังกรนิลอัคคี "อัคนิส" — ขายในร้านเพชร (ราคาเป็นเพชร แก้ได้ที่คอลัมน์ price)
-- วิธีใช้: Supabase → SQL Editor → วางทั้งไฟล์ → Run (รันซ้ำได้)
insert into public.item_catalog (id, price, kind) values
  ('pet_drake', 0, 'usable')
on conflict (id) do update set price = excluded.price, kind = excluded.kind;

insert into public.cash_products (id, kind, ref, qty, price, cat, tag, sort) values
  ('p_drake', 'item', 'pet_drake', 1, 249, 'pet', 'ใหม่', 0)
on conflict (id) do update set kind = excluded.kind, ref = excluded.ref, qty = excluded.qty, price = excluded.price,
  cat = excluded.cat, tag = excluded.tag, sort = excluded.sort, active = true;
