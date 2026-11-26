import {
  MAX_RESERVAS_SEMANA, ahoraMadrid, lunesDe, madridAUtc, sumarDias,
} from '@/lib/fechas';
import { ErrorApi, json, manejar, sesion } from '@/lib/servidor';

export const dynamic = 'force-dynamic';

const contar = async (consulta) => {
  const { count, error } = await consulta;
  if (error) throw error;
  return count ?? 0;
};

// Datos del vecino y algunas estadísticas
export const GET = manejar(async (req) => {
  const { db, user, perfil } = await sesion(req);
  const lunes = lunesDe(ahoraMadrid().fecha);
  const base = () => db.from('reservas').select('id', { count: 'exact', head: true });

  const [mias, casa, semana] = await Promise.all([
    contar(base().eq('usuario_id', user.id)),
    contar(base().eq('calle', perfil.calle).eq('numero', perfil.numero)),
    contar(
      base()
        .eq('calle', perfil.calle)
        .eq('numero', perfil.numero)
        .gte('inicio', madridAUtc(lunes, 0).toISOString())
        .lt('inicio', madridAUtc(sumarDias(lunes, 7), 0).toISOString()),
    ),
  ]);

  return json({
    nombre: perfil.nombre,
    email: user.email,
    calle: perfil.calle,
    numero: perfil.numero,
    estadisticas: {
      mias,
      casa,
      quedan: Math.max(0, MAX_RESERVAS_SEMANA - semana),
      maximo: MAX_RESERVAS_SEMANA,
    },
  });
});

// Eliminar el perfil: se borran la cuenta y sus reservas futuras
export const DELETE = manejar(async (req) => {
  const { db, user } = await sesion(req);
  const { error: eReservas } = await db
    .from('reservas')
    .delete()
    .eq('usuario_id', user.id)
    .gt('inicio', new Date().toISOString());
  if (eReservas) throw eReservas;

  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) throw new ErrorApi(500, 'No se pudo eliminar la cuenta. Inténtalo de nuevo.');
  return json({ ok: true });
});
