'use client';

import { useState } from 'react';
import { CALLES, NUMEROS } from '@/lib/casas';
import { supabaseCliente } from '@/lib/supabaseCliente';

function traducir(error) {
  const m = error?.message || '';
  if (/invalid login/i.test(m)) return 'Email o contraseña incorrectos.';
  if (error?.status === 429 || /rate limit/i.test(m)) {
    return 'Se han pedido demasiados correos. Espera un rato e inténtalo de nuevo.';
  }
  if (/same password/i.test(m)) return 'Elige una contraseña distinta de la anterior.';
  if (/at least|weak/i.test(m)) return 'La contraseña es demasiado corta o fácil.';
  return 'No se pudo completar. Inténtalo de nuevo.';
}

export default function Auth() {
  const [modo, setModo] = useState('entrar'); // entrar | registro | olvido
  const [f, setF] = useState({
    nombre: '', email: '', password: '', calle: '', numero: '', codigo: '',
  });
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);

  const poner = (campo) => (e) => setF((x) => ({ ...x, [campo]: e.target.value }));
  const cambiar = (m) => { setModo(m); setError(''); setAviso(''); };

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setAviso('');
    setEnviando(true);
    const sb = supabaseCliente();
    try {
      if (modo === 'entrar') {
        const { error } = await sb.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
        if (error) throw error;
      } else if (modo === 'registro') {
        if (!f.nombre.trim()) throw new Error('Escribe tu nombre.');
        if (f.password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
        if (!f.calle) throw new Error('Elige tu calle.');
        if (!f.numero) throw new Error('Elige el número de tu casa.');
        if (!f.codigo.trim()) throw new Error('Escribe la contraseña de la urbanización.');
        const r = await fetch('/api/registro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...f, numero: Number(f.numero) }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'No se pudo crear la cuenta.');
        const { error } = await sb.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
        if (error) throw error;
      } else {
        const { error } = await sb.auth.resetPasswordForEmail(f.email.trim(), {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setAviso('Si ese email tiene cuenta, te hemos enviado un enlace para elegir una contraseña nueva. Mira también la carpeta de spam.');
      }
    } catch (err) {
      if (err?.__isAuthError) setError(traducir(err));
      else if (err instanceof TypeError) setError('Sin conexión. Inténtalo de nuevo.');
      else setError(err?.message || 'No se pudo completar. Inténtalo de nuevo.');
    }
    setEnviando(false);
  }

  const titulo = { entrar: 'Entrar', registro: 'Crear cuenta', olvido: 'Recuperar contraseña' }[modo];

  return (
    <main className="contenido">
      <form className="tarjeta" onSubmit={enviar}>
        <h2 className="titulo-form">{titulo}</h2>

        {modo === 'registro' && (
          <>
            <label htmlFor="nombre">Nombre</label>
            <input id="nombre" value={f.nombre} maxLength={40} onChange={poner('nombre')} autoComplete="given-name" />
          </>
        )}

        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={f.email} onChange={poner('email')} autoComplete="email" inputMode="email" />

        {modo !== 'olvido' && (
          <>
            <label htmlFor="password">Contraseña{modo === 'registro' ? ' (mínimo 8 caracteres)' : ''}</label>
            <input
              id="password"
              type="password"
              value={f.password}
              onChange={poner('password')}
              autoComplete={modo === 'registro' ? 'new-password' : 'current-password'}
            />
          </>
        )}

        {modo === 'registro' && (
          <>
            <label htmlFor="calle">Calle</label>
            <select
              id="calle"
              value={f.calle}
              onChange={(e) => setF((x) => ({ ...x, calle: e.target.value, numero: '' }))}
            >
              <option value="">Elige tu calle</option>
              {CALLES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <label htmlFor="numero">Número de casa</label>
            <select id="numero" value={f.numero} onChange={poner('numero')} disabled={!f.calle}>
              <option value="">{f.calle ? 'Elige tu número' : 'Primero elige la calle'}</option>
              {(NUMEROS[f.calle] || []).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>

            <label htmlFor="codigo">Contraseña de la urbanización</label>
            <input
              id="codigo"
              value={f.codigo}
              onChange={poner('codigo')}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <p className="ayuda">La conocen los vecinos. Si no la tienes, pídesela a un vecino.</p>
          </>
        )}

        {error && <p className="fila-error">{error}</p>}
        {aviso && <p className="fila-ok">{aviso}</p>}

        <button className="boton" type="submit" disabled={enviando}>
          {enviando ? 'Un momento…' : modo === 'entrar' ? 'Entrar' : modo === 'registro' ? 'Crear cuenta' : 'Enviar enlace'}
        </button>

        <div className="enlaces">
          {modo === 'entrar' && (
            <>
              <button type="button" className="enlace" onClick={() => cambiar('registro')}>Crear cuenta nueva</button>
              <button type="button" className="enlace" onClick={() => cambiar('olvido')}>He olvidado mi contraseña</button>
            </>
          )}
          {modo !== 'entrar' && (
            <button type="button" className="enlace" onClick={() => cambiar('entrar')}>Ya tengo cuenta: entrar</button>
          )}
        </div>
      </form>
    </main>
  );
}

// Pantalla que se abre desde el enlace del correo de "he olvidado mi contraseña"
export function NuevaContrasena({ terminado }) {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    if (p1.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (p1 !== p2) return setError('Las dos contraseñas no coinciden.');
    setError('');
    setEnviando(true);
    const { error } = await supabaseCliente().auth.updateUser({ password: p1 });
    if (error) {
      setError(traducir(error));
      setEnviando(false);
      return;
    }
    try { window.history.replaceState(null, '', window.location.pathname); } catch {}
    terminado();
  }

  return (
    <main className="contenido">
      <form className="tarjeta" onSubmit={enviar}>
        <h2 className="titulo-form">Elige una contraseña nueva</h2>
        <label htmlFor="p1">Contraseña nueva (mínimo 8 caracteres)</label>
        <input id="p1" type="password" value={p1} onChange={(e) => setP1(e.target.value)} autoComplete="new-password" />
        <label htmlFor="p2">Repítela</label>
        <input id="p2" type="password" value={p2} onChange={(e) => setP2(e.target.value)} autoComplete="new-password" />
        {error && <p className="fila-error">{error}</p>}
        <button className="boton" type="submit" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </main>
  );
}
