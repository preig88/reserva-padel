'use client';

import { useEffect, useState } from 'react';
import { hhmm } from '@/lib/fechas';
import { textoFecha } from '@/lib/formato';

// Ventana que sube desde abajo
export function Hoja({ children, cerrar }) {
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
