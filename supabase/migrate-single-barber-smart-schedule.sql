begin;

-- Preserva clientes, agendamentos e valores históricos, mas impede novas reservas.
update barbers
set active = false, updated_at = now()
where slug = 'pablo';

delete from barber_services
where barber_id in (select id from barbers where slug = 'pablo');

-- Remove grades duplicadas antes de tornar cada dia único por profissional.
delete from working_hours older
using working_hours newer
where older.barber_id = newer.barber_id
  and older.weekday = newer.weekday
  and older.id < newer.id;

create unique index if not exists working_hours_barber_weekday_unique
on working_hours(barber_id, weekday);

-- A grade passa a ficar salva no banco: segunda 14h–20h; terça a sábado 9h–20h.
insert into working_hours(barber_id,weekday,start_time,end_time,active)
select barber.id,hours.weekday,hours.start_time::time,hours.end_time::time,true
from barbers barber
cross join (
  values
    (1,'14:00','20:00'),
    (2,'09:00','20:00'),
    (3,'09:00','20:00'),
    (4,'09:00','20:00'),
    (5,'09:00','20:00'),
    (6,'09:00','20:00')
) as hours(weekday,start_time,end_time)
where barber.slug = 'vitinho-ofc'
on conflict(barber_id,weekday) do update set
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  active = true;

update working_hours
set active = false
where barber_id in (select id from barbers where slug = 'vitinho-ofc')
  and weekday = 0;

commit;
