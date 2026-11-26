'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/cliente';
import { Hoja } from './componentes';

export default function TabAdmin() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [borrar, setBorrar] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setDatos(await api('/api/admin/vecinos'));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <main className="contenido">
      <h2 className="titulo-seccion">Vecinos registrados</h2>
      {error && <p className="aviso error">{error}</p>}
      {datos && (
        <p className="ayuda">
          {datos.total} {datos.total === 1 ? 'vecino' : 'vecinos'} en {datos.casas.length}{' '}
          {datos.casas.length === 1 ? 'casa' : 'casas'}.
        </p>
      )}
      {datos?.casas.length === 0 && <p className="vacio">Todavía no hay nadie registrado.</p>}

      {datos?.casas.map((c) => (
        <div className="tarjeta casa" key={`${c.calle}-${c.numero}`}>
          <div className="casa-titulo">
            Calle {c.calle}, nº {c.numero}
            <span className="casa-cuenta">{c.vecinos.length}/2</span>
          </div>
          {c.vecinos.map((v) => (
            <div className="vecino" key={v.id}>
              <div className="vecino-datos">
                <b>{v.nombre}</b>
                <span>{v.email}</span>
              </div>
              <button className="boton rojo pequeno" onClick={() => setBorrar({ ...v, calle: c.calle, numero: c.numero })}>
                Eliminar perfil
              </button>
            </div>
          ))}
        </div>
      ))}

      {borrar && (
        <ConfirmarBorrar
          vecino={borrar}
          cerrar={() => setBorrar(null)}
          hecho={() => { setBorrar(null); cargar(); }}
        />
      )}
    </main>
  );
}

function ConfirmarBorrar({ vecino, cerrar, hecho }) {
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function eliminar() {
    setError('');
    setEnviando(true);
    try {
      await api(`/api/admin/vecinos/${vecino.id}`, { method: 'DELETE' });
      hecho();
    } catch (e) {
      if (e.status === 404) return hecho();
      setError(e.message);
      setEnviando(false);
    }
  }

  return (
    <Hoja cerrar={cerrar}>
      <h2>¿Eliminar este perfil?</h2>
      <p className="quien">{vecino.nombre}</p>
      <p className="resumen">{vecino.email}</p>
      <p className="resumen">Calle {vecino.calle}, nº {vecino.numero}</p>
      <p className="resumen">Se borrarán su cuenta y sus reservas futuras. No se puede deshacer.</p>
      {error && <p className="fila-error">{error}</p>}
      <button className="boton rojo" onClick={eliminar} disabled={enviando}>
        {enviando ? 'Eliminando…' : 'Sí, eliminar perfil'}
      </button>
      <button className="boton claro" onClick={cerrar}>No, volver</button>
    </Hoja>
  );
}
