-- fix42 ถอดชุดเกราะมังกร (o_px_dragon) ออกจากร้านเพชร — ตัวละครชุดใหม่ไม่มีแผ่นชุดมังกรแล้ว
-- ปิดการขายเท่านั้น (ไม่ลบประวัติการซื้อของผู้เล่น)
update public.cash_products set active = false where id = 'f_dragon' or ref = 'o_px_dragon';
