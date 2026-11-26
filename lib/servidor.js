// Ayudas comunes de las rutas del servidor
import { supabase } from './supabase';

export class ErrorApi extends Error {
  constructor(status, mensaje, codigo) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
  }
}

export const json = (data, status = 200) => Response.json(data, { status });

// Envuelve una ruta: los ErrorApi se devuelven tal cual; cualquier otro fallo es un error genérico
export function manejar(fn) {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ErrorApi) return json({ error: e.message, codigo: e.codigo }, e.status);
      console.error(e);
      return json({ error: 'Ha ocurrido un error. Inténtalo de nuevo.' }, 500);
    }
  };
}

// Comprueba la sesión (token en la cabecera Authorization) y carga el perfil del vecino
export async function sesion(req) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) throw new ErrorApi(401, 'Inicia sesión para continuar.');
  const db = supabase();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) throw new ErrorApi(401, 'Tu sesión ha caducado. Vuelve a entrar.');
  const { data: perfil, error: e2 } = await db
    .from('perfiles')
    .select('nombre, calle, numero')
    .eq('id', data.user.id)
    .maybeSingle();
  if (e2) throw e2;
  if (!perfil) throw new ErrorApi(403, 'Tu cuenta no tiene perfil de vecino.', 'SIN_PERFIL');
  return { db, user: data.user, perfil };
}

export const textoCasa = (calle, numero) => `calle ${calle}, nº ${numero}`;

// El administrador es la cuenta cuyo email está en la variable ADMIN_EMAIL (Vercel)
export const esAdmin = (user) =>
  !!process.env.ADMIN_EMAIL &&
  (user.email || '').trim().toLowerCase() === process.env.ADMIN_EMAIL.trim().toLowerCase();

export async function sesionAdmin(req) {
  const s = await sesion(req);
  if (!esAdmin(s.user)) throw new ErrorApi(403, 'Solo el administrador puede hacer esto.');
  return s;
}

// Borra una cuenta y sus reservas futuras (las pasadas se quedan, sin usuario)
export async function borrarCuenta(db, id) {
  const { error: eReservas } = await db
    .from('reservas')
    .delete()
    .eq('usuario_id', id)
    .gt('inicio', new Date().toISOString());
  if (eReservas) throw eReservas;
  const { error } = await db.auth.admin.deleteUser(id);
  if (error) throw new ErrorApi(500, 'No se pudo eliminar la cuenta. Inténtalo de nuevo.');
}
