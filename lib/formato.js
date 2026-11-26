export const SEMANA = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
export const SEMANA_LARGA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function trozos(fecha) {
  const [y, m, d] = fecha.split('-').map(Number);
  return { d, m: m - 1, dia: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

export function textoFecha(fecha) {
  const t = trozos(fecha);
  return `${SEMANA_LARGA[t.dia]} ${t.d} ${MESES[t.m].toLowerCase()}`;
}
