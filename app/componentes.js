'use client';

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
