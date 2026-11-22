import { supabase } from '@/lib/supabase';
import {
  APERTURA, CIERRE, DURACIONES, TZ, ahoraMadrid, esFecha, madridAUtc, sumarDias,
} from '@/lib/fechas';

export const dynamic = 'force-dynamic';

const CALLES = ['Jumilla', 'San Javier'];

function minutosDelDia(iso) {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const [h, m] = f.format(new Date(iso)).split(':').map(Number);
  return h * 60 + m;
}

const json = (data, status = 200) => Response.json(data, { status });

// Reservas de un día
export async function GET(req) {
  const fecha = new URL(req.url).searchParams.get('fecha');
  if (!esFecha(fecha || '')) return json({ error: 'Fecha no válida' }, 400);
  try {
    const desde = madridAUtc(fecha, 0).toISOString();
    const hasta = madridAUtc(sumarDias(fecha, 1), 0).toISOString();
    const { data, error } = await supabase()
      .from('reservas')
      .select('inicio, fin, calle, numero, nombre')
      .lt('inicio', hasta)
      .gt('fin', desde)
      .order('inicio');
    if (error) throw error;
    const reservas = data.map((r) => ({
      ini: minutosDelDia(r.inicio),
      fin: minutosDelDia(r.fin),
      calle: r.calle,
      numero: r.numero,
      nombre: r.nombre,
    }));
    return json({ reservas });
  } catch (e) {
    console.error(e);
    return json({ error: 'No se pudo cargar las reservas' }, 500);
  }
}

// Crear una reserva
export async function POST(req) {
  let b;
  try { b = await req.json(); } catch { return json({ error: 'Datos no válidos' }, 400); }

  const calle = String(b.calle || '');
  const numero = String(b.numero || '').trim();
  const nombre = String(b.nombre || '').trim();
  const ini = Number(b.ini);
  const duracion = Number(b.duracion);

  if (!esFecha(String(b.fecha || ''))) return json({ error: 'Fecha no válida' }, 400);
  if (!CALLES.includes(calle)) return json({ error: 'Elige una calle' }, 400);
  if (!numero || numero.length > 10) return json({ error: 'Escribe el número de casa' }, 400);
  if (!nombre || nombre.length > 40) return json({ error: 'Escribe tu nombre' }, 400);
  if (!DURACIONES.includes(duracion)) return json({ error: 'Duración no válida' }, 400);
  if (!Number.isInteger(ini) || ini % 30 !== 0 || ini < APERTURA || ini + duracion > CIERRE) {
    return json({ error: 'Esa hora no está disponible' }, 400);
  }

  const ahora = ahoraMadrid();
  if (b.fecha < ahora.fecha || (b.fecha === ahora.fecha && ini <= ahora.minutos)) {
    return json({ error: 'Esa hora ya ha pasado' }, 400);
  }
  if (b.fecha > sumarDias(ahora.fecha, 180)) return json({ error: 'Fecha demasiado lejana' }, 400);

  try {
    const { error } = await supabase().from('reservas').insert({
      inicio: madridAUtc(b.fecha, ini).toISOString(),
      fin: madridAUtc(b.fecha, ini + duracion).toISOString(),
      calle, numero, nombre,
    });
    if (error) {
      if (error.code === '23P01') {
        return json({ error: 'Alguien acaba de reservar esa hora. Elige otra.' }, 409);
      }
      throw error;
    }
    return json({ ok: true }, 201);
  } catch (e) {
    console.error(e);
    return json({ error: 'No se pudo guardar la reserva' }, 500);
  }
}
