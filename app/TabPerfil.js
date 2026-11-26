'use client';

import { useState } from 'react';
import { api } from '@/lib/cliente';
import { supabaseCliente } from '@/lib/supabaseCliente';
import { Hoja, InstalarApp } from './componentes';

export default function TabPerfil({ perfil, error, instalar, alInstalar }) {
  const [confirmar, setConfirmar] = useState(false);
  const [avisoCompartir, setAvisoCompartir] = useState('');

  // Abre el menú de compartir del móvil (WhatsApp, etc.); si no existe, copia el enlace
  async function compartir() {
    setAvisoCompartir('');
    // Dirección corta oficial (si se abre desde otra dirección de Vercel, se comparte esta igualmente)
    const url = window.location.hostname.endsWith('vercel.app')
      ? 'https://padeltikal.vercel.app'
      : window.location.origin;
    const texto =
      'Reserva la pista de pádel de Tikal III y IV desde esta app. ' +
      'Para crear tu cuenta necesitarás la contraseña de la urbanización.';
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Pádel Tikal III y IV', text: texto, url });
        return;
      } catch (e) {
        if (e?.name === 'AbortError') return; // el usuario cerró el menú
      }
    }
    try {
      await navigator.clipboard.writeText(`${texto} ${url}`);
      setAvisoCompartir('Enlace copiado. Pégalo en WhatsApp o donde quieras.');
    } catch {
      setAvisoCompartir(`Copia este enlace: ${url}`);
    }
  }

  const salir = () => supabaseCliente().auth.signOut();

  return (
    <main className="contenido">
      {error && <p className="aviso error">{error}</p>}

      {perfil && (
        <>
          <div className="tarjeta">
            <Dato etiqueta="Nombre" valor={perfil.nombre} />
            <Dato etiqueta="Email" valor={perfil.email} />
            <Dato etiqueta="Calle" valor={perfil.calle} />
            <Dato etiqueta="Número" valor={perfil.numero} />
          </div>

          <h2 className="titulo-seccion">Reservas</h2>
          <div className="cifras una">
            <Cifra n={perfil.reservasCasa} texto="reservas hechas por tu casa" />
          </div>
          <p className="ayuda">Cuentan las reservas de tu casa, sumando sus dos cuentas. Las anuladas no cuentan.</p>
        </>
      )}

      <h2 className="titulo-seccion">Instalar la app</h2>
      <InstalarApp instalar={instalar} alInstalar={alInstalar} />

      <h2 className="titulo-seccion">Compartir la app</h2>
      <div className="tarjeta">
        <p className="ayuda sin-margen">Envía el enlace a tus vecinos para que se registren.</p>
        <button className="boton" style={{ marginTop: 14 }} onClick={compartir}>Compartir la app</button>
        {avisoCompartir && <p className="fila-ok">{avisoCompartir}</p>}
      </div>

      <button className="boton claro grande" onClick={salir}>Cerrar sesión</button>
      <button className="boton rojo-borde" onClick={() => setConfirmar(true)}>Eliminar perfil</button>

      {confirmar && <ConfirmarEliminar cerrar={() => setConfirmar(false)} />}
    </main>
  );
}

const Dato = ({ etiqueta, valor }) => (
  <div className="dato">
    <span>{etiqueta}</span>
    <b>{valor}</b>
  </div>
);

const Cifra = ({ n, texto }) => (
  <div className="cifra">
    <b>{n}</b>
    <span>{texto}</span>
  </div>
);

function ConfirmarEliminar({ cerrar }) {
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function eliminar() {
    setError('');
    setEnviando(true);
    try {
      await api('/api/perfil', { method: 'DELETE' });
      await supabaseCliente().auth.signOut().catch(() => {});
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  }

  return (
    <Hoja cerrar={cerrar}>
      <h2>¿Eliminar tu perfil?</h2>
      <p className="resumen">
        Se borrarán tu cuenta y tus reservas futuras. Esta acción no se puede deshacer.
      </p>
      {error && <p className="fila-error">{error}</p>}
      <button className="boton rojo" onClick={eliminar} disabled={enviando}>
        {enviando ? 'Eliminando…' : 'Sí, eliminar mi perfil'}
      </button>
      <button className="boton claro" onClick={cerrar}>No, volver</button>
    </Hoja>
  );
}
