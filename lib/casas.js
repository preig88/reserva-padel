// Calles y números de casa válidos (el mismo reparto está en supabase/schema.sql)
export const CALLES = ['Jumilla', 'San Javier'];

const rango = (desde, hasta) => {
  const r = [];
  for (let n = desde; n <= hasta; n += 2) r.push(n);
  return r;
};
const ordenados = (a) => a.sort((x, y) => x - y);

export const NUMEROS = {
  Jumilla: ordenados([...rango(1, 41), ...rango(2, 50)]),
  'San Javier': ordenados([...rango(1, 49), ...rango(2, 14)]),
};

export const casaValida = (calle, numero) =>
  Object.hasOwn(NUMEROS, calle) && NUMEROS[calle].includes(numero);

// Máximo de cuentas de vecino por casa
export const MAX_CUENTAS_CASA = 3;
