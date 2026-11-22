create extension if not exists btree_gist;

create table reservas (
  id          uuid primary key default gen_random_uuid(),
  inicio      timestamptz not null,
  fin         timestamptz not null,
  calle       text not null check (calle in ('Jumilla', 'San Javier')),
  numero      text not null,
  nombre      text not null,
  creada_en   timestamptz not null default now(),
  check (fin > inicio),
  exclude using gist (tstzrange(inicio, fin) with &&)
);

alter table reservas enable row level security;

-- Permisos para la clave service_role (la que usa la web en el servidor)
grant usage on schema public to service_role;
grant select, insert, update, delete on public.reservas to service_role;
