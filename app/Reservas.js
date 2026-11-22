'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  APERTURA, CIERRE, DURACIONES, ahoraMadrid, hhmm, sumarDias,
} from '@/lib/fechas';

const SEMANA = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const SEMANA_LARGA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function trozos(fecha) {
  const [y, m, d] = fecha.split('-').map(Number);
  return { d, m: m - 1, dia: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

function textoFecha(fecha) {
  const t = trozos(fecha);
  return `${SEMANA_LARGA[t.dia]} ${t.d} ${MESES[t.m].toLowerCase()}`;
}

// Horas de inicio posibles: 9:00, 9:30 ... 21:30
const INICIOS = [];
for (let m = APERTURA; m < CIERRE; m += 30) INICIOS.push(m);

function leer(clave) {
  try { return JSON.parse(localStorage.getItem(clave)); } catch { return null; }
}
function guardar(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch {}
}

export default function Reservas() {
  const [ahora, setAhora] = useState(null);
  const [fecha, setFecha] = useState(null);
  const [duracion, setDuracion] = useState(90);
  const [reservas, setReservas] = useState([]);
  const [errorCarga, setErrorCarga] = useState('');
  const [hoja, setHoja] = useState(null); // {tipo:'info'|'reservar'|'ok', ...}
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

  // Cargar reservas del día elegido
  const cargar = useCallback(async () => {
    if (!fecha) return;
    try {
      const r = await fetch(`/api/reservas?fecha=${fecha}`, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setReservas(j.reservas);
      setErrorCarga('');
    } catch {
      setErrorCarga('No se pueden cargar las reservas. Inténtalo de nuevo en un momento.');
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

  // Colocar el día elegido al principio de la tira
  const primeraVez = useRef(true);
  useEffect(() => {
    if (!fecha || !tira.current || !primeraVez.current) return;
    const el = tira.current.querySelector('[data-sel="1"]');
    if (el) {
      tira.current.scrollLeft = el.offsetLeft - 15;
      primeraVez.current = false;
    }
  }, [fecha]);

  if (!hoy || !fecha) {
    return (
      <div className="app">
        <header className="cabecera"><h1>Pádel Tikal III y IV</h1></header>
      </div>
    );
  }

  const dias = [];
  for (let i = -30; i <= 120; i++) dias.push(sumarDias(hoy, i));

  function estado(inicio) {
    const pasada = fecha < hoy || (fecha === hoy && inicio <= ahora.minutos);
    const fuera = inicio + duracion > CIERRE;
    const reserva = reservas.find((r) => inicio < r.fin && inicio + duracion > r.ini);
    return { pasada, fuera, reserva };
  }

  function pulsar(inicio) {
    const { reserva } = estado(inicio);
    if (reserva) setHoja({ tipo: 'info', reserva });
    else setHoja({ tipo: 'reservar', inicio });
  }

  return (
    <div className="app">
      <header className="cabecera"><h1>Pádel Tikal III y IV</h1></header>

      <main className="contenido">
        <span className="etiqueta">Pádel</span>

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
            const { pasada, fuera, reserva } = estado(inicio);
            if (reserva) {
              return (
                <button key={inicio} className="hora ocupada" onClick={() => pulsar(inicio)}>
                  {hhmm(inicio)}
                </button>
              );
            }
            return (
              <button
                key={inicio}
                className="hora"
                disabled={pasada || fuera}
                onClick={() => pulsar(inicio)}
              >
                {hhmm(inicio)}
              </button>
            );
          })}
        </div>

        {errorCarga && <p className="aviso error">{errorCarga}</p>}
        <p className="aviso">
          Las horas tachadas no están disponibles. Pulsa una tachada reservada para ver quién la tiene.
        </p>
      </main>

      {hoja?.tipo === 'info' && (
        <Info reserva={hoja.reserva} fecha={fecha} cerrar={() => setHoja(null)} />
      )}
      {hoja?.tipo === 'reservar' && (
        <Formulario
          fecha={fecha}
          inicio={hoja.inicio}
          duracion={duracion}
          cerrar={() => setHoja(null)}
          hecho={() => { setHoja({ tipo: 'ok', inicio: hoja.inicio }); cargar(); }}
          conflicto={cargar}
        />
      )}
      {hoja?.tipo === 'ok' && (
        <Hoja cerrar={() => setHoja(null)}>
          <h2>¡Reserva confirmada!</h2>
          <p className="resumen">
            {textoFecha(fecha)} · {hhmm(hoja.inicio)}–{hhmm(hoja.inicio + duracion)}
          </p>
          <button className="boton" onClick={() => setHoja(null)}>Cerrar</button>
        </Hoja>
      )}
    </div>
  );
}

function Hoja({ children, cerrar }) {
  return (
    <div className="fondo-oscuro" onClick={cerrar}>
      <div className="hoja" role="dialog" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Info({ reserva, fecha, cerrar }) {
  return (
    <Hoja cerrar={cerrar}>
      <h2>Hora reservada</h2>
      <p className="resumen">
        {textoFecha(fecha)} · {hhmm(reserva.ini)}–{hhmm(reserva.fin)}
      </p>
      <p className="quien">{reserva.nombre}</p>
      <p className="resumen">Calle {reserva.calle}, nº {reserva.numero}</p>
      <button className="boton claro" onClick={cerrar}>Cerrar</button>
    </Hoja>
  );
}

function Formulario({ fecha, inicio, duracion, cerrar, hecho, conflicto }) {
  const [calle, setCalle] = useState('');
  const [numero, setNumero] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const g = leer('padel-datos');
    if (g) {
      setCalle(g.calle || '');
      setNumero(g.numero || '');
      setNombre(g.nombre || '');
    }
  }, []);

  async function enviar(e) {
    e.preventDefault();
    if (!calle) return setError('Elige tu calle.');
    if (!numero.trim()) return setError('Escribe el número de tu casa.');
    if (!nombre.trim()) return setError('Escribe tu nombre.');
    setError('');
    setEnviando(true);
    try {
      const r = await fetch('/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, ini: inicio, duracion, calle, numero, nombre }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(j.error || 'No se pudo reservar.');
        if (r.status === 409) conflicto();
        setEnviando(false);
        return;
      }
      guardar('padel-datos', { calle, numero: numero.trim(), nombre: nombre.trim() });
      hecho();
    } catch {
      setError('Sin conexión. Inténtalo de nuevo.');
      setEnviando(false);
    }
  }

  return (
    <Hoja cerrar={cerrar}>
      <form onSubmit={enviar}>
        <h2>Reservar pista</h2>
        <p className="resumen">
          {textoFecha(fecha)} · {hhmm(inicio)}–{hhmm(inicio + duracion)} ({duracion} min)
        </p>

        <label htmlFor="calle">Calle</label>
        <select id="calle" value={calle} onChange={(e) => setCalle(e.target.value)}>
          <option value="">Elige tu calle</option>
          <option value="Jumilla">Jumilla</option>
          <option value="San Javier">San Javier</option>
        </select>

        <label htmlFor="numero">Número de casa</label>
        <input
          id="numero"
          value={numero}
          maxLength={10}
          onChange={(e) => setNumero(e.target.value)}
          autoComplete="off"
        />

        <label htmlFor="nombre">Tu nombre</label>
        <input
          id="nombre"
          value={nombre}
          maxLength={40}
          onChange={(e) => setNombre(e.target.value)}
          autoComplete="given-name"
        />

        {error && <p className="fila-error">{error}</p>}

        <button className="boton" type="submit" disabled={enviando}>
          {enviando ? 'Reservando…' : 'Confirmar reserva'}
        </button>
        <button className="boton claro" type="button" onClick={cerrar}>Cancelar</button>
      </form>
    </Hoja>
  );
}
