import { supabaseCliente } from './supabaseCliente';

// Llama a la API de la web añadiendo la sesión del vecino
export async function api(ruta, opciones = {}) {
  const sb = supabaseCliente();
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  const r = await fetch(ruta, {
    ...opciones,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401) sb.auth.signOut().catch(() => {});
    const e = new Error(j.error || 'Ha ocurrido un error. Inténtalo de nuevo.');
    e.status = r.status;
    e.codigo = j.codigo;
    throw e;
  }
  return j;
}
