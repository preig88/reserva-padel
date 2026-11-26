'use client';

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
