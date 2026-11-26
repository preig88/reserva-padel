import { CALLES } from '@/lib/casas';
import { json, manejar, sesionAdmin } from '@/lib/servidor';

export const dynamic = 'force-dynamic';

// Quién está registrado en cada casa (solo administrador)
export const GET = manejar(async (req) => {
  const { db } = await sesionAdmin(req);

  const { data: perfiles, error } = await db
    .from('perfiles')
    .select('id, nombre, calle, numero, creado_en')
    .order('numero');
  if (error) throw error;

  // Los emails están en el sistema de cuentas
  const emails = new Map();
  for (let pagina = 1; pagina <= 20; pagina++) {
    const { data, error: e2 } = await db.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    if (e2) throw e2;
    data.users.forEach((u) => emails.set(u.id, u.email));
    if (data.users.length < 1000) break;
  }

  const casas = new Map();
  for (const p of perfiles) {
    const clave = `${p.calle}|${p.numero}`;
    if (!casas.has(clave)) casas.set(clave, { calle: p.calle, numero: p.numero, vecinos: [] });
    casas.get(clave).vecinos.push({ id: p.id, nombre: p.nombre, email: emails.get(p.id) || '' });
  }
  const lista = [...casas.values()].sort(
    (a, b) => CALLES.indexOf(a.calle) - CALLES.indexOf(b.calle) || a.numero - b.numero,
  );

  return json({ casas: lista, total: perfiles.length });
});
