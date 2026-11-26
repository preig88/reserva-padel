// Utilidades de fechas. Todo se calcula en hora de Madrid.
export const TZ = 'Europe/Madrid';
export const APERTURA = 8 * 60; // 8:00: primera hora de inicio
export const CIERRE = 22 * 60; // 22:00: las reservas se muestran (y se guardan) hasta esta hora
export const ULTIMO_INICIO = CIERRE - 30; // 21:30: última hora de inicio
// Se puede jugar pasadas las 22:00, pero la reserva solo llega hasta las 22:00
export const finReserva = (ini, duracion) => Math.min(ini + duracion, CIERRE);
export const DURACIONES = [30, 60, 90, 120];

export const pad = (n) => String(n).padStart(2, '0');
export const hhmm = (min) => `${Math.floor((min % 1440) / 60)}:${pad(min % 60)}`;

function partes(ts) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const o = {};
  for (const p of f.formatToParts(new Date(ts))) o[p.type] = p.value;
  return {
    y: +o.year,
    m: +o.month,
    d: +o.day,
    h: +o.hour,
    mi: +o.minute,
    s: +o.second,
  };
}

// Fecha ("2025-11-21") y minutos desde medianoche, ahora mismo en Madrid
export function ahoraMadrid(ts = Date.now()) {
  const p = partes(ts);
  return { fecha: `${p.y}-${pad(p.m)}-${pad(p.d)}`, minutos: p.h * 60 + p.mi };
}

function desfaseMs(ts) {
  const p = partes(ts);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(ts / 1000) * 1000;
}

// "2025-11-21" + minutos desde medianoche (hora de Madrid) -> Date en UTC
export function madridAUtc(fecha, minutos) {
  const [y, m, d] = fecha.split('-').map(Number);
  const ingenuo = Date.UTC(y, m - 1, d, 0, minutos);
  let t = ingenuo - desfaseMs(ingenuo);
  t = ingenuo - desfaseMs(t);
  return new Date(t);
}

// Suma días a una fecha "YYYY-MM-DD"
export function sumarDias(fecha, n) {
  const [y, m, d] = fecha.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export const esFecha = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

// Lunes de la semana a la que pertenece una fecha "YYYY-MM-DD"
export function lunesDe(fecha) {
  const [y, m, d] = fecha.split('-').map(Number);
  const dia = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domingo
  return sumarDias(fecha, -((dia + 6) % 7));
}

export const MAX_DIAS_ADELANTE = 14;
export const MAX_RESERVAS_SEMANA = 2;
