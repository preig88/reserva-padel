import { borrarCuenta, esAdmin, json, manejar, sesion } from '@/lib/servidor';

export const dynamic = 'force-dynamic';

const contar = async (consulta) => {
  const { count, error } = await consulta;
  if (error) throw error;
  return count ?? 0;
};

// Datos del vecino y algunas estadísticas
export const GET = manejar(async (req) => {
  const { db, user, perfil } = await sesion(req);
  const casa = await contar(
    db
      .from('reservas')
      .select('id', { count: 'exact', head: true })
      .eq('calle', perfil.calle)
      .eq('numero', perfil.numero),
  );

  return json({
    nombre: perfil.nombre,
    email: user.email,
    calle: perfil.calle,
    numero: perfil.numero,
    reservasCasa: casa,
    esAdmin: esAdmin(user),
  });
});

// Eliminar el perfil: se borran la cuenta y sus reservas futuras
export const DELETE = manejar(async (req) => {
  const { db, user } = await sesion(req);
  await borrarCuenta(db, user.id);
  return json({ ok: true });
});
