# Pádel Tikal III y IV

Web para reservar la pista de pádel de la urbanización. Next.js + Supabase + Vercel.

## Puesta en marcha

1. En Supabase, ejecuta `supabase/schema.sql` en el SQL Editor.
2. Copia `.env.example` a `.env.local` y rellena `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.
3. `npm install` y `npm run dev` → http://localhost:3000
4. En Vercel, importa este repositorio y añade las mismas dos variables de entorno.

La clave `service_role` solo se usa en el servidor (`app/api/reservas/route.js`). No la subas a GitHub.
