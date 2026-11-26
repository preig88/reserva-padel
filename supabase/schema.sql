-- ============================================================
-- Pádel Tikal III y IV · base de datos
-- ATENCIÓN: este archivo BORRA las tablas "reservas" y "perfiles"
-- (y todo lo que contienen) y las vuelve a crear desde cero.
-- Las cuentas de Authentication no se tocan.
-- ============================================================

create extension if not exists btree_gist;

drop table if exists reservas;
drop table if exists perfiles;
drop function if exists limitar_cuentas_por_casa();
drop function if exists limitar_reservas_por_semana();
drop function if exists casa_valida(text, int);

-- Números de casa válidos de cada calle
create function casa_valida(c text, n int) returns boolean
language sql immutable as $$
  select case c
    when 'Jumilla' then
      (n % 2 = 1 and n between 1 and 41) or (n % 2 = 0 and n between 2 and 50)
    when 'San Javier' then
      (n % 2 = 1 and n between 1 and 49) or (n % 2 = 0 and n between 2 and 14)
    else false
  end
$$;

-- Un perfil por cada cuenta de vecino
create table perfiles (
  id        uuid primary key references auth.users (id) on delete cascade,
  nombre    text not null check (char_length(nombre) between 1 and 40),
  calle     text not null,
  numero    int  not null,
  creado_en timestamptz not null default now(),
  check (casa_valida(calle, numero))
);

-- Máximo 3 cuentas por casa
create function limitar_cuentas_por_casa() returns trigger
language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtext('cuentas:' || new.calle || ':' || new.numero));
  if (select count(*) from perfiles where calle = new.calle and numero = new.numero) >= 3 then
    raise exception 'CASA_LLENA';
  end if;
  return new;
end $$;

create trigger perfiles_limite_por_casa
  before insert on perfiles
  for each row execute function limitar_cuentas_por_casa();

-- Reservas (pertenecen a una casa; el usuario solo se guarda para las estadísticas)
create table reservas (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users (id) on delete set null,
  calle      text not null,
  numero     int  not null,
  inicio     timestamptz not null,
  fin        timestamptz not null,
  creada_en  timestamptz not null default now(),
  check (fin > inicio),
  check (casa_valida(calle, numero)),
  -- impide que dos reservas se pisen
  exclude using gist (tstzrange(inicio, fin) with &&)
);

create index reservas_casa_idx on reservas (calle, numero, inicio);

-- Máximo 4 h 30 min (270 minutos) reservados por casa y semana (lunes a domingo, hora de Madrid)
create function limitar_reservas_por_semana() returns trigger
language plpgsql as $$
declare usados numeric; nuevos numeric;
begin
  perform pg_advisory_xact_lock(hashtext('reservas:' || new.calle || ':' || new.numero));
  select coalesce(sum(extract(epoch from (fin - inicio)) / 60), 0) into usados
    from reservas
   where calle = new.calle
     and numero = new.numero
     and date_trunc('week', inicio at time zone 'Europe/Madrid')
       = date_trunc('week', new.inicio at time zone 'Europe/Madrid');
  nuevos := extract(epoch from (new.fin - new.inicio)) / 60;
  if usados + nuevos > 270 then
    raise exception 'LIMITE_SEMANAL';
  end if;
  return new;
end $$;

create trigger reservas_limite_semanal
  before insert on reservas
  for each row execute function limitar_reservas_por_semana();

-- Solo la web (con su clave secreta, desde el servidor) puede leer y escribir
alter table perfiles enable row level security;
alter table reservas  enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.perfiles to service_role;
grant select, insert, update, delete on public.reservas to service_role;
