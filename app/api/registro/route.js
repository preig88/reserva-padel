import { createHash, timingSafeEqual } from 'node:crypto';
import { supabase } from '@/lib/supabase';
import { casaValida } from '@/lib/casas';
import { ErrorApi, json, manejar, textoCasa } from '@/lib/servidor';

export const dynamic = 'force-dynamic';

const huella = (s) => createHash('sha256').update(String(s).trim().toLowerCase()).digest();
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const casaLlena = (calle, numero) =>
  new ErrorApi(
    409,
    `La casa de la ${textoCasa(calle, numero)} ya tiene 2 cuentas registradas, que es el máximo. ` +
      'Si crees que es un error, habla con los vecinos de esa casa.',
    'CASA_LLENA',
  );

export const POST = manejar(async (req) => {
  const b = await req.json().catch(() => ({}));

  // 1. Contraseña de la urbanización (se guarda en Vercel, nunca llega al móvil)
  const correcto = process.env.CODIGO_URBANIZACION;
  if (!correcto) throw new ErrorApi(500, 'El registro todavía no está configurado.');
  if (!timingSafeEqual(huella(b.codigo ?? ''), huella(correcto))) {
    await espera(1000);
    throw new ErrorApi(403, 'La contraseña de la urbanización no es correcta.', 'CODIGO');
  }

  // 2. Datos
  const nombre = String(b.nombre ?? '').trim();
  const email = String(b.email ?? '').trim().toLowerCase();
  const password = String(b.password ?? '');
  const calle = String(b.calle ?? '');
  const numero = Number(b.numero);

  if (!nombre || nombre.length > 40) throw new ErrorApi(400, 'Escribe tu nombre (máximo 40 letras).');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
    throw new ErrorApi(400, 'Escribe un email válido.');
  }
  if (password.length < 8 || password.length > 72) {
    throw new ErrorApi(400, 'La contraseña debe tener entre 8 y 72 caracteres.');
  }
  if (!casaValida(calle, numero)) throw new ErrorApi(400, 'Elige una calle y un número de casa válidos.');

  // 3. Máximo 2 cuentas por casa (la base de datos lo vuelve a comprobar)
  const db = supabase();
  const { count, error: eCuenta } = await db
    .from('perfiles')
    .select('id', { count: 'exact', head: true })
    .eq('calle', calle)
    .eq('numero', numero);
  if (eCuenta) throw eCuenta;
  if (count >= 2) throw casaLlena(calle, numero);

  // 4. Crear la cuenta (ya confirmada, sin correo de verificación) y su perfil
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    if (error.code === 'email_exists' || /already|registered/i.test(error.message)) {
      throw new ErrorApi(
        409,
        'Ya existe una cuenta con ese email. Entra con ella o usa «He olvidado mi contraseña».',
        'EMAIL_EXISTE',
      );
    }
    if (error.code === 'weak_password') throw new ErrorApi(400, 'Esa contraseña es demasiado fácil. Prueba otra.');
    throw error;
  }

  const { error: ePerfil } = await db.from('perfiles').insert({ id: data.user.id, nombre, calle, numero });
  if (ePerfil) {
    await db.auth.admin.deleteUser(data.user.id); // no dejar cuentas sin perfil
    if (/CASA_LLENA/.test(ePerfil.message)) throw casaLlena(calle, numero);
    throw ePerfil;
  }

  return json({ ok: true }, 201);
});
