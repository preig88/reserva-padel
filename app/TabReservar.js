'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  APERTURA, ULTIMO_INICIO, DURACIONES, MAX_DIAS_ADELANTE, ahoraMadrid, finReserva, hhmm, sumarDias,
} from '@/lib/fechas';
import { MESES, SEMANA, textoFecha, trozos } from '@/lib/formato';
import { api } from '@/lib/cliente';
import { Hoja, Horario } from './componentes';

// Horas de inicio posibles: 8:00, 8:30 ... 21:30
const INICIOS = [];
for (let m = APERTURA; m <= ULTIMO_INICIO; m += 30) INICIOS.push(m);

export default function TabReservar({ perfil, activa, alReservar }) {
  const [ahora, setAhora] = useState(null);
  const [fecha, setFecha] = useState(null);
  const [duracion, setDuracion] = useState(90);
  const [reservas, setReservas] = useState([]);
  const [errorCarga, setErrorCarga] = useState('');
  const [hoja, setHoja] = useState(null); // info | reservar | ok
  const tira = useRef(null);

  // Hora actual (se refresca cada minuto)
  useEffect(() => {
    const poner = () => setAhora(ahoraMadrid());
    poner();
    const id = setInterval(poner, 60000);
    return () => clearInterval(id);
  }, []);

  const hoy = ahora?.fecha;
  useEffect(() => {
    if (hoy && !fecha) setFecha(hoy);
  }, [hoy, fecha]);

  const cargar = useCallback(async () => {
    if (!fecha) return;
    try {
      const j = await api(`/api/reservas?fecha=${fecha}`);
      setReservas(j.reservas);
      setErrorCarga('');
    } catch (e) {
      setErrorCarga(e.message || 'No se pueden cargar las reservas. Inténtalo de nuevo en un momento.');
    }
  }, [fecha]);

  useEffect(() => {
    setReservas([]);
    cargar();
    const id = setInterval(cargar, 30000);
    const alVolver = () => document.visibilityState === 'visible' && cargar();
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [cargar]);

  // Al volver a esta pestaña, refrescar (por si se ha anulado algo)
  useEffect(() => { if (activa) cargar(); }, [activa, cargar]);

  // Colocar el día de hoy al principio de la tira
  const primeraVez = useRef(true);
  useEffect(() => {
    if (!fecha || !tira.current || !primeraVez.current) return;
    const el = tira.current.querySelector('[data-sel="1"]');
    if (el) {
      tira.current.scrollLeft = el.offsetLeft - 15;
      primeraVez.current = false;
    }
  }, [fecha]);

  if (!hoy || !fecha) return null;

  // Semana pasada y las dos semanas siguientes
  const dias = [];
  for (let i = -7; i <= MAX_DIAS_ADELANTE; i++) dias.push(sumarDias(hoy, i));

  function estado(inicio) {
    const pasada = fecha < hoy || (fecha === hoy && inicio <= ahora.minutos);
    const reserva = reservas.find((r) => inicio < r.fin && inicio + duracion > r.ini);
    return { pasada, reserva };
  }

  function pulsar(inicio) {
    const { reserva } = estado(inicio);
    setHoja(reserva ? { tipo: 'info', reserva } : { tipo: 'reservar', inicio });
  }

  return (
    <main className="contenido" hidden={!activa}>
      <div className="dias" ref={tira}>
        {dias.map((f) => {
          const t = trozos(f);
          const sel = f === fecha;
          return (
            <button
              key={f}
              data-sel={sel ? '1' : '0'}
              className={`dia${sel ? ' sel' : ''}${f < hoy ? ' pasado' : ''}`}
              onClick={() => setFecha(f)}
              aria-label={textoFecha(f)}
              aria-pressed={sel}
            >
              <span className="sem">{SEMANA[t.dia]}</span>
              <span className="num">{t.d}</span>
              <span className="mes">{MESES[t.m]}</span>
            </button>
          );
        })}
      </div>

      <div className="duraciones">
        {DURACIONES.map((d) => (
          <button
            key={d}
            className={`duracion${d === duracion ? ' sel' : ''}`}
            onClick={() => setDuracion(d)}
          >
            {d} min
          </button>
        ))}
      </div>

      <div className="horas">
        {INICIOS.map((inicio) => {
          const { pasada, reserva } = estado(inicio);
          if (reserva) {
            return (
              <button key={inicio} className="hora ocupada" onClick={() => pulsar(inicio)}>
                {hhmm(inicio)}
              </button>
            );
          }
          return (
            <button key={inicio} className="hora" disabled={pasada} onClick={() => pulsar(inicio)}>
              {hhmm(inicio)}
            </button>
          );
        })}
      </div>

      {errorCarga && <p className="aviso error">{errorCarga}</p>}
      <p className="aviso">
        Las horas tachadas ya están reservadas: púlsalas para ver qué casa las tiene. Las horas en gris claro ya han pasado.
      </p>

      {hoja?.tipo === 'info' && (
        <Hoja cerrar={() => setHoja(null)}>
          <h2>Hora reservada</h2>
          <Horario fecha={fecha} ini={hoja.reserva.ini} fin={hoja.reserva.fin} />
          <p className="quien">Calle {hoja.reserva.calle}, nº {hoja.reserva.numero}</p>
          {hoja.reserva.propia && <p className="resumen">Es de tu casa.</p>}
          <button className="boton claro" onClick={() => setHoja(null)}>Cerrar</button>
        </Hoja>
      )}

      {hoja?.tipo === 'reservar' && (
        <Confirmar
          perfil={perfil}
          fecha={fecha}
          inicio={hoja.inicio}
          duracion={duracion}
          cerrar={() => setHoja(null)}
          hecho={() => { setHoja({ tipo: 'ok', inicio: hoja.inicio }); cargar(); alReservar?.(); }}
          conflicto={cargar}
        />
      )}

      {hoja?.tipo === 'ok' && (
        <Hoja cerrar={() => setHoja(null)}>
          <h2 className="confirmada">¡Reserva confirmada!</h2>
          <Horario fecha={fecha} ini={hoja.inicio} fin={finReserva(hoja.inicio, duracion)} />
          <p className="resumen">Puedes verla o anularla en «Mis reservas».</p>
          <button className="boton" onClick={() => setHoja(null)}>Cerrar</button>
        </Hoja>
      )}
    </main>
  );
}

function Confirmar({ perfil, fecha, inicio, duracion, cerrar, hecho, conflicto }) {
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function reservar() {
    setError('');
    setEnviando(true);
    try {
      await api('/api/reservas', {
        method: 'POST',
        body: JSON.stringify({ fecha, ini: inicio, duracion }),
      });
      hecho();
    } catch (e) {
      setError(e.message);
      if (e.status === 409) conflicto();
      setEnviando(false);
    }
  }

  return (
    <Hoja cerrar={cerrar}>
      <h2>Reservar pista</h2>
      <Horario fecha={fecha} ini={inicio} fin={finReserva(inicio, duracion)} />
      <p className="resumen">Se reserva para tu casa: calle {perfil.calle}, nº {perfil.numero}.</p>
      {error && <p className="fila-error">{error}</p>}
      <button className="boton verde" onClick={reservar} disabled={enviando}>
        {enviando ? 'Reservando…' : 'Confirmar reserva'}
      </button>
      <button className="boton claro" onClick={cerrar}>Cancelar</button>
    </Hoja>
  );
}
