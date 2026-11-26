'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/cliente';
import { Hoja, Horario } from './componentes';

export default function TabMis() {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');
  const [anular, setAnular] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const j = await api('/api/mis-reservas');
      setLista(j.reservas);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <main className="contenido">
      <h2 className="titulo-seccion">Reservas de tu casa</h2>
      {error && <p className="aviso error">{error}</p>}
      {lista && lista.length === 0 && <p className="vacio">Todavía no tienes reservas.</p>}

      {lista?.map((r) => (
        <div className="tarjeta reserva" key={r.id}>
          <Horario fecha={r.fecha} ini={r.ini} fin={r.ini + r.duracion} pequeno />
          <button className="boton rojo" onClick={() => setAnular(r)}>Anular reserva</button>
        </div>
      ))}

      {anular && (
        <ConfirmarAnular
          reserva={anular}
          cerrar={() => setAnular(null)}
          hecho={() => { setAnular(null); cargar(); }}
        />
      )}
    </main>
  );
}

function ConfirmarAnular({ reserva, cerrar, hecho }) {
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function anular() {
    setError('');
    setEnviando(true);
    try {
      await api(`/api/reservas/${reserva.id}`, { method: 'DELETE' });
      hecho();
    } catch (e) {
      if (e.status === 404) return hecho(); // ya no existía
      setError(e.message);
      setEnviando(false);
    }
  }

  return (
    <Hoja cerrar={cerrar}>
      <h2>¿Anular esta reserva?</h2>
      <Horario fecha={reserva.fecha} ini={reserva.ini} fin={reserva.ini + reserva.duracion} />
      <p className="resumen">La hora quedará libre para otros vecinos.</p>
      {error && <p className="fila-error">{error}</p>}
      <button className="boton rojo" onClick={anular} disabled={enviando}>
        {enviando ? 'Anulando…' : 'Sí, anular reserva'}
      </button>
      <button className="boton claro" onClick={cerrar}>No, mantenerla</button>
    </Hoja>
  );
}
