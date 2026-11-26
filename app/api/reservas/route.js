import {
  APERTURA, ULTIMO_INICIO, DURACIONES, MAX_DIAS_ADELANTE, MAX_RESERVAS_SEMANA, TZ,
  ahoraMadrid, esFecha, lunesDe, madridAUtc, sumarDias,
} from '@/lib/fechas';
import { ErrorApi, json, manejar, sesion } from '@/lib/servidor';

export const dynamic = 'force-dynamic';

function minutosDelDia(iso) {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const [h, m] = f.format(new Date(iso)).split(':').map(Number);
  return h * 60 + m;
}

// Reservas de un día. Nunca se envía el nombre: solo calle y número.
export const GET = manejar(async (req) => {
  const { db, perfil } = await sesion(req);
  const fecha = new URL(req.url).searchParams.get('fecha');
  if (!esFecha(fecha || '')) throw new ErrorApi(400, 'Fecha no válida');

  const desde = madridAUtc(fecha, 0).toISOString();
  const hasta = madridAUtc(sumarDias(fecha, 1), 0).toISOString();
  const { data, error } = await db
    .from('reservas')
    .select('inicio, fin, calle, numero')
    .lt('inicio', hasta)
    .gt('fin', desde)
    .order('inicio');
  if (error) throw error;

  return json({
    reservas: data.map((r) => {
      // minutos desde las 0:00 del día pedido (negativo si empezó el día anterior)
      const ini = r.inicio < desde
        ? Math.round((Date.parse(r.inicio) - Date.parse(desde)) / 60000)
        : minutosDelDia(r.inicio);
      const fin = ini + Math.round((Date.parse(r.fin) - Date.parse(r.inicio)) / 60000);
      return {
      ini,
      fin,
      calle: r.calle,
      numero: r.numero,
      propia: r.calle === perfil.calle && r.numero === perfil.numero,
      };
    }),
  });
});

// Crear una reserva (la casa sale del perfil, no de lo que envíe el móvil)
export const POST = manejar(async (req) => {
  const { db, user, perfil } = await sesion(req);
  const b = await req.json().catch(() => ({}));
  const ini = Number(b.ini);
  const duracion = Number(b.duracion);

  if (!esFecha(String(b.fecha || ''))) throw new ErrorApi(400, 'Fecha no válida');
  if (!DURACIONES.includes(duracion)) throw new ErrorApi(400, 'Duración no válida');
  if (!Number.isInteger(ini) || ini % 30 !== 0 || ini < APERTURA || ini > ULTIMO_INICIO) {
    throw new ErrorApi(400, 'Esa hora no está disponible');
  }

  const ahora = ahoraMadrid();
  if (b.fecha < ahora.fecha || (b.fecha === ahora.fecha && ini <= ahora.minutos)) {
    throw new ErrorApi(400, 'Esa hora ya ha pasado.');
  }
  if (b.fecha > sumarDias(ahora.fecha, MAX_DIAS_ADELANTE)) {
    throw new ErrorApi(400, `Solo se puede reservar con un máximo de ${MAX_DIAS_ADELANTE} días de antelación.`);
  }

  // Máximo 2 reservas por casa y semana (lunes a domingo)
  const limite = new ErrorApi(
    409,
    `Tu casa ya tiene ${MAX_RESERVAS_SEMANA} reservas esa semana (de lunes a domingo), que es el máximo. ` +
      'Anula una desde «Mis reservas» o elige otra semana.',
    'LIMITE_SEMANAL',
  );
  const lunes = lunesDe(b.fecha);
  const { count, error: eCuenta } = await db
    .from('reservas')
    .select('id', { count: 'exact', head: true })
    .eq('calle', perfil.calle)
    .eq('numero', perfil.numero)
    .gte('inicio', madridAUtc(lunes, 0).toISOString())
    .lt('inicio', madridAUtc(sumarDias(lunes, 7), 0).toISOString());
  if (eCuenta) throw eCuenta;
  if (count >= MAX_RESERVAS_SEMANA) throw limite;

  const { error } = await db.from('reservas').insert({
    usuario_id: user.id,
    calle: perfil.calle,
    numero: perfil.numero,
    inicio: madridAUtc(b.fecha, ini).toISOString(),
    fin: madridAUtc(b.fecha, ini + duracion).toISOString(),
  });
  if (error) {
    if (error.code === '23P01') {
      throw new ErrorApi(409, 'Alguien acaba de reservar esa hora. Elige otra.', 'OCUPADA');
    }
    if (/LIMITE_SEMANAL/.test(error.message)) throw limite;
    throw error;
  }
  return json({ ok: true }, 201);
});
