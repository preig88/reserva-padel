# Pádel Tikal III y IV

Web para reservar la pista de pádel de la urbanización. Next.js + Supabase + Vercel.

- Cuentas de vecinos (Supabase Auth), con la contraseña de la urbanización para registrarse.
- Máximo 2 cuentas por casa y 2 reservas por casa y semana (lunes a domingo).
- Se puede reservar hasta 14 días vista, de 8:00 a 21:30 de inicio (la reserva se muestra hasta las 22:00). Las reservas solo muestran calle y número, nunca el nombre.
- App instalable (PWA).

## Puesta en marcha

1. En Supabase, ejecuta `supabase/schema.sql` en el SQL Editor (**borra** las tablas `reservas` y `perfiles`).
2. En Supabase > Authentication: desactiva «Allow new users to sign up» y, en URL Configuration,
   pon la dirección de la web en «Site URL» y en «Redirect URLs».
3. Copia `.env.example` a `.env.local` y rellena las variables.
4. `npm install` y `npm run dev` → http://localhost:3000
5. En Vercel, importa este repositorio y añade las mismas variables de entorno.

Las claves secretas (`SUPABASE_SERVICE_ROLE_KEY`, `CODIGO_URBANIZACION`) solo se usan en el servidor
(`app/api/*`). No las subas a GitHub.
