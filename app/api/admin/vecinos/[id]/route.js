import { ErrorApi, borrarCuenta, json, manejar, sesionAdmin } from '@/lib/servidor';

export const dynamic = 'force-dynamic';

// Eliminar el perfil de un vecino (solo administrador)
export const DELETE = manejar(async (req, { params }) => {
  const { db, user } = await sesionAdmin(req);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ErrorApi(400, 'Vecino no válido');
  if (id === user.id) {
    throw new ErrorApi(400, 'No puedes eliminar tu propio perfil desde aquí. Usa la pestaña Perfil.');
  }

  const { data, error } = await db.from('perfiles').select('id').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw new ErrorApi(404, 'Ese vecino ya no existe.');

  await borrarCuenta(db, id);
  return json({ ok: true });
});
