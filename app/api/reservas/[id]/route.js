import { ErrorApi, json, manejar, sesion } from '@/lib/servidor';

export const dynamic = 'force-dynamic';

// Anular una reserva (solo las de tu propia casa y que no hayan terminado)
export const DELETE = manejar(async (req, { params }) => {
  const { db, perfil } = await sesion(req);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ErrorApi(400, 'Reserva no válida');

  const { data: r, error } = await db
    .from('reservas')
    .select('id, calle, numero, fin')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!r) throw new ErrorApi(404, 'Esa reserva ya no existe.');
  if (r.calle !== perfil.calle || r.numero !== perfil.numero) {
    throw new ErrorApi(403, 'Solo puedes anular las reservas de tu casa.');
  }
  if (new Date(r.fin) <= new Date()) throw new ErrorApi(400, 'Esa reserva ya ha pasado.');

  const { error: eBorrar } = await db.from('reservas').delete().eq('id', id);
  if (eBorrar) throw eBorrar;
  return json({ ok: true });
});
