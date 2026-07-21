begin;

insert into barbers (name, slug, bio, specialties, active)
values (
  'Pablo',
  'pablo',
  'Corte personalizado e acabamento preciso.',
  array['corte masculino', 'barba'],
  true
)
on conflict (slug) do update set
  name = excluded.name,
  bio = excluded.bio,
  specialties = excluded.specialties,
  active = true,
  updated_at = now();

update barbers
set active = false, updated_at = now()
where slug in ('vitinho', 'profissional-3');

insert into barber_services (barber_id, service_id)
select barbers.id, services.id
from barbers
cross join services
where barbers.slug = 'pablo'
on conflict do nothing;

commit;
