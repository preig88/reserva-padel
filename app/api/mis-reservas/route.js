import { ahoraMadrid } from '@/lib/fechas';
import { json, manejar, sesion } from '@/lib/servidor';

export const dynamic = 'force-dynamic';

// Reservas próximas de la casa del vecino
export const GET = manejar(async (req) => {
  const { db, perfil } = await sesion(req);
  const { data, error } = await db
    .from('reservas')
    .select('id, inicio, fin')
    .eq('calle', perfil.calle)
    .eq('numero', perfil.numero)
    .gt('fin', new Date().toISOString())
    .order('inicio');
  if (error) throw error;

  return json({
    reservas: data.map((r) => {
      const { fecha, minutos } = ahoraMadrid(Date.parse(r.inicio));
      return {
        id: r.id,
        fecha,
        ini: minutos,
        duracion: Math.round((Date.parse(r.fin) - Date.parse(r.inicio)) / 60000),
      };
    }),
  });
});
