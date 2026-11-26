'use client';

import { useEffect, useRef, useState } from 'react';
import { hhmm } from '@/lib/fechas';
import { textoFecha } from '@/lib/formato';

// Ventanas abiertas (la última es la de arriba) y control del botón «atrás» del móvil.
// Al abrir una ventana se añade una entrada al historial: si se pulsa «atrás», se cierra la
// ventana en lugar de salir de la app. Si se cierra con un botón, se quita esa entrada.
const pila = [];
let entrada = false;

function alAtras() {
  window.removeEventListener('popstate', alAtras);
  if (!entrada) return;
  entrada = false;
  pila[pila.length - 1]?.cerrar();
}

// Ventana que sube desde abajo
export function Hoja({ children, cerrar }) {
  const cerrarRef = useRef(cerrar);
  cerrarRef.current = cerrar;

  useEffect(() => {
    const ventana = { cerrar: () => cerrarRef.current() };
    pila.push(ventana);
    if (!entrada) {
      window.history.pushState({ hoja: true }, '');
      entrada = true;
      window.addEventListener('popstate', alAtras);
    }
    return () => {
      pila.splice(pila.indexOf(ventana), 1);
      // Si se cambia de una ventana a otra, no se toca el historial
      setTimeout(() => {
        if (pila.length === 0 && entrada) {
          entrada = false;
          window.removeEventListener('popstate', alAtras);
          window.history.back();
        }
      }, 0);
    };
  }, []);

  return (
    <div className="fondo-oscuro" onClick={cerrar}>
      <div className="hoja" role="dialog" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// Día y horas bien grandes (lo más importante de una reserva)
export function Horario({ fecha, ini, fin, pequeno }) {
  return (
    <div className={`horario${pequeno ? ' pequeno' : ''}`}>
      <div className="h-fecha">{textoFecha(fecha)}</div>
      <div className="h-horas">{hhmm(ini)}–{hhmm(fin)}</div>
    </div>
  );
}

// Instalar la app: botón automático si el navegador lo permite; si no, instrucciones cortas
export function InstalarApp({ instalar, alInstalar }) {
  const [modo, setModo] = useState(null); // 'instalada' | 'ios' | 'otro'

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setModo(standalone ? 'instalada' : ios ? 'ios' : 'otro');
  }, []);

  return (
    <div className="tarjeta">
      {modo === 'instalada' && <p className="ayuda sin-margen">La app ya está instalada en este dispositivo.</p>}
      {modo !== 'instalada' && instalar && (
        <button className="boton" onClick={alInstalar}>Instalar app</button>
      )}
      {modo === 'ios' && !instalar && (
        <p className="ayuda sin-margen">
          En iPhone o iPad: pulsa <b>Compartir</b> y luego <b>Añadir a pantalla de inicio</b>.
        </p>
      )}
      {modo === 'otro' && !instalar && (
        <p className="ayuda sin-margen">
          Abre el menú del navegador (⋮ o ⋯) y elige <b>Instalar aplicación</b> o{' '}
          <b>Añadir a pantalla de inicio</b>.
        </p>
      )}
    </div>
  );
}
