'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/cliente';
import { supabaseCliente } from '@/lib/supabaseCliente';
import { Hoja } from './componentes';

export default function TabPerfil({ perfil, error, instalar, alInstalar }) {
  const [confirmar, setConfirmar] = useState(false);
  const [modoApp, setModoApp] = useState(null); // 'instalada' | 'ios' | 'otro'

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setModoApp(standalone ? 'instalada' : ios ? 'ios' : 'otro');
  }, []);

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

          <h2 className="titulo-seccion">Tus números</h2>
          <div className="cifras">
            <Cifra n={perfil.estadisticas.mias} texto="reservas hechas por ti" />
            <Cifra n={perfil.estadisticas.casa} texto="reservas hechas por tu casa" />
            <Cifra
              n={`${perfil.estadisticas.quedan}/${perfil.estadisticas.maximo}`}
              texto="te quedan esta semana"
            />
          </div>
          <p className="ayuda">Las reservas anuladas no cuentan. La semana va de lunes a domingo.</p>
        </>
      )}

      <h2 className="titulo-seccion">Instalar la app</h2>
      <div className="tarjeta">
        {modoApp === 'instalada' && <p className="ayuda sin-margen">La app ya está instalada en este dispositivo.</p>}
        {modoApp !== 'instalada' && instalar && (
          <button className="boton" onClick={alInstalar}>Instalar app</button>
        )}
        {modoApp === 'ios' && !instalar && (
          <p className="ayuda sin-margen">
            En iPhone o iPad: pulsa <b>Compartir</b> y luego <b>Añadir a pantalla de inicio</b>.
          </p>
        )}
        {modoApp === 'otro' && !instalar && (
          <p className="ayuda sin-margen">
            Abre el menú del navegador (⋮ o ⋯) y elige <b>Instalar aplicación</b> o{' '}
            <b>Añadir a pantalla de inicio</b>.
          </p>
        )}
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
