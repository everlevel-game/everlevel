-- fix59 ปรับสมดุลเกม (ฝั่งเซิร์ฟเวอร์) — รันทั้งไฟล์ครั้งเดียวใน Supabase SQL Editor
-- 1) อีเวนต์ EXP ×2 ที่ไม่มีวันจบ → ตั้งวันจบ (3 พ.ย. 2026 23:59 เวลาไทย)
update public.game_events
   set ends_at = timestamptz '2026-11-03 23:59:00+07'
 where kind = 'exp' and ends_at is null;

-- 2) MVP เลเวลต่ำกว่า 60 เลือดลดครึ่ง (ให้ตรงกับ monsters.js: เลือด ×5 แทน ×10)
update public.mvp_config set hp = 113250 where mob = 'gnarlroot';
update public.mvp_config set hp = 447000 where mob = 'glacia';

-- 3) ยาใหม่ Lv.100+ (ราคากลางสำหรับตลาดซื้อขาย)
insert into public.item_catalog (id, price, kind, tradable)
values ('grand_elixir', 8000, 'usable', true)
on conflict (id) do update set price = excluded.price, kind = excluded.kind;

-- 4) บอสโลก: เลือดตามจำนวนคนที่มาร่วมตี (1.5 ล้านต่อคน · ไม่เกินเลือดเต็มเดิม 40M / 70M)
create or replace function public.world_boss_hit(p_id text, p_damage integer, p_slot integer)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare b world_boss_runs; p world_boss_participants; c record; v_damage integer; mail bigint; w record; items jsonb; z bigint;
        v_n integer; v_dealt bigint; v_cap integer;
begin
 if auth.uid() is null then raise exception 'Login required' using errcode='42501';end if;
 if p_damage is null or p_damage<=0 then raise exception 'Invalid damage';end if;
 select * into c from characters where user_id=auth.uid() and slot=p_slot;
 if not found then raise exception 'Character not found' using errcode='42501';end if;
 perform public.event_tick();
 select * into b from world_boss_runs where id=p_id for update;
 if not found then raise exception 'Boss round not found';end if;
 if b.status<>'active' or b.ends_at<=now() then return jsonb_build_object('hp',b.hp,'status',b.status,'damage',0);end if;
 if c.lv<60 then raise exception 'World bosses require Base Lv.60';end if;
 insert into world_boss_participants(run_id,user_id,slot) values(p_id,auth.uid(),p_slot) on conflict do nothing;
 -- fix59 เลือดสูงสุด = 1.5M × จำนวนผู้ร่วม (ไม่เกินเลือดเต็มของบอส) · คนมาเพิ่ม = เลือดเพิ่ม
 select count(*), coalesce(sum(damage),0) into v_n, v_dealt from world_boss_participants where run_id=p_id;
 v_cap := least(case b.type when 'world_nocthar' then 70000000 else 40000000 end, greatest(1,v_n)*1500000);
 if b.max_hp <> v_cap then
  update world_boss_runs set max_hp=v_cap, hp=greatest(1, v_cap - v_dealt) where id=p_id returning * into b;
 end if;
 select * into p from world_boss_participants where run_id=p_id and user_id=auth.uid() for update;
 if p.last_hit>now()-interval '200 milliseconds' then return jsonb_build_object('hp',b.hp,'status',b.status,'damage',0);end if;
 v_damage:=least(p_damage,15000,b.hp);
 update world_boss_participants set damage=damage+v_damage,last_hit=now(),slot=p_slot where run_id=p_id and user_id=auth.uid();
 update world_boss_runs set hp=hp-v_damage,defeated_at=case when hp-v_damage<=0 then now() else null end,status=case when hp-v_damage<=0 then 'defeated' else 'active' end where id=p_id returning * into b;
 if b.status='defeated' then
  insert into event_notices(message) values('บอสโลก '||(case b.type when 'world_aurex' then 'ออเร็กซ์ จอมทัพโลก' else 'น็อคธาร์ ราชันคราสโลก' end)||' ถูกกำจัดแล้ว! ผู้ร่วมต่อสู้รับรางวัลทางจดหมาย');
  for w in select wp.user_id,ch.name,row_number() over (order by wp.damage desc) as rk
           from world_boss_participants wp join characters ch on ch.user_id=wp.user_id and ch.slot=wp.slot
           where wp.run_id=p_id and wp.damage>0 loop
   insert into world_boss_rewards(run_id,user_id) values(p_id,w.user_id) on conflict do nothing;
   if found then
    if b.type='world_nocthar' then
     items:='[["royal_jelly",4],["refine_w",2],["refine_a",2],["refine_guard",1],["dread_crown",1]]'::jsonb; z:=18000;
     if random()<0.15 then items:=items||jsonb_build_array(jsonb_build_array((array['bloodmoon_sword','bloodmoon_staff','bloodmoon_bow','bloodmoon_mace','bloodmoon_knife'])[1+floor(random()*5)::int],1)); end if;
    else
     items:='[["royal_jelly",3],["refine_w",2],["refine_a",2],["guardian_core",1]]'::jsonb; z:=12000;
     if random()<0.15 then items:=items||jsonb_build_array(jsonb_build_array((array['spectral_sword','spectral_staff','spectral_bow','spectral_mace','spectral_knife'])[1+floor(random()*5)::int],1)); end if;
    end if;
    if w.rk<=3 then items:=items||'[["refine_guard",1]]'::jsonb; z:=z+(4-w.rk)*7000; end if;
    if w.rk=1 then items:=items||'[["refine_luck",1]]'::jsonb; end if;
    select jsonb_agg(jsonb_build_array(k,q)) into items from (select e->>0 k,sum((e->>1)::int) q from jsonb_array_elements(items) e group by 1) t;
    insert into mails(to_name,sender,title,body,items,zeny,per)
    values(w.name,'World Event',case when w.rk<=3 then 'รางวัลบอสโลก · ดาเมจอันดับ '||w.rk else 'รางวัลบอสโลก' end,
           'ขอบคุณที่ร่วมพิชิต '||(case b.type when 'world_aurex' then 'ออเร็กซ์ จอมทัพโลก' else 'น็อคธาร์ ราชันคราสโลก' end)||' · รอบ '||p_id||case when w.rk<=3 then ' · คุณทำดาเมจอันดับ '||w.rk||' ได้โบนัสเพิ่ม' else '' end,
           items,z,'account') returning id into mail;
    update world_boss_rewards set mail_id=mail where run_id=p_id and user_id=w.user_id;
   end if;
  end loop;
 end if;
 return jsonb_build_object('hp',b.hp,'status',b.status,'damage',v_damage,'defeated_at',b.defeated_at);
end $function$;

-- ตรวจผล
select kind, rate, ends_at from public.game_events where kind = 'exp';
select mob, hp from public.mvp_config order by hp;
