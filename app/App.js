'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/cliente';
import { supabaseCliente } from '@/lib/supabaseCliente';
import Auth, { NuevaContrasena } from './Auth';
import TabReservar from './TabReservar';
import TabMis from './TabMis';
import TabPerfil from './TabPerfil';
import TabAdmin from './TabAdmin';

const PESTANAS = [
  ['reservar', 'Reservar'],
  ['mis', 'Mis reservas'],
  ['perfil', 'Perfil'],
];

export default function App() {
  const [estado, setEstado] = useState('cargando'); // cargando | fuera | recuperar | dentro | sinconfig
  const [pestana, setPestana] = useState('reservar');
  const [perfil, setPerfil] = useState(null);
  const [errorPerfil, setErrorPerfil] = useState('');
  const [instalar, setInstalar] = useState(null);
  const [mis, setMis] = useState(null);
  const [errorMis, setErrorMis] = useState('');

  // Sesión guardada en el móvil
  useEffect(() => {
    let sb;
    try {
      sb = supabaseCliente();
    } catch {
      setEstado('sinconfig');
      return;
    }
    sb.auth.getSession().then(({ data }) =>
      setEstado((p) => (p === 'recuperar' ? p : data.session ? 'dentro' : 'fuera')));
    const { data } = sb.auth.onAuthStateChange((evento, session) => {
      if (evento === 'PASSWORD_RECOVERY') setEstado('recuperar');
      else if (evento === 'SIGNED_OUT') { setEstado('fuera'); setPerfil(null); setMis(null); setPestana('reservar'); }
      else if (evento === 'SIGNED_IN') setEstado((p) => (p === 'recuperar' ? p : 'dentro'));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // App instalable
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    const antes = (e) => { e.preventDefault(); setInstalar(e); };
    const instalada = () => setInstalar(null);
    window.addEventListener('beforeinstallprompt', antes);
    window.addEventListener('appinstalled', instalada);
    return () => {
      window.removeEventListener('beforeinstallprompt', antes);
      window.removeEventListener('appinstalled', instalada);
    };
  }, []);

  const cargarPerfil = useCallback(async () => {
    try {
      setPerfil(await api('/api/perfil'));
      setErrorPerfil('');
    } catch (e) {
      setErrorPerfil(e.message);
    }
  }, []);

  // Mis reservas se carga nada más entrar (y se refresca al abrir la pestaña)
  const cargarMis = useCallback(async () => {
    try {
      setMis((await api('/api/mis-reservas')).reservas);
      setErrorMis('');
    } catch (e) {
      setErrorMis(e.message);
    }
  }, []);

  useEffect(() => {
    if (estado === 'dentro' && (pestana === 'perfil' || !perfil)) cargarPerfil();
  }, [estado, pestana, perfil, cargarPerfil]);

  useEffect(() => {
    if (estado === 'dentro') cargarMis();
  }, [estado, pestana, cargarMis]);

  async function pedirInstalar() {
    if (!instalar) return;
    instalar.prompt();
    await instalar.userChoice.catch(() => {});
    setInstalar(null);
  }

  let cuerpo;
  if (estado === 'cargando') cuerpo = null;
  else if (estado === 'sinconfig') {
    cuerpo = <main className="contenido"><p className="aviso error">La web todavía no está configurada.</p></main>;
  } else if (estado === 'fuera') cuerpo = <Auth instalar={instalar} alInstalar={pedirInstalar} />;
  else if (estado === 'recuperar') cuerpo = <NuevaContrasena terminado={() => setEstado('dentro')} />;
  else if (!perfil) {
    cuerpo = (
      <main className="contenido">
        {errorPerfil && (
          <>
            <p className="aviso error">{errorPerfil}</p>
            <button className="boton claro" onClick={() => supabaseCliente().auth.signOut()}>Cerrar sesión</button>
          </>
        )}
      </main>
    );
  } else {
    cuerpo = (
      <>
        <nav className={`pestanas${perfil.esAdmin ? ' cuatro' : ''}`}>
          {(perfil.esAdmin ? [...PESTANAS, ['admin', 'Admin']] : PESTANAS).map(([id, texto]) => (
            <button
              key={id}
              className={`pestana${pestana === id ? ' activa' : ''}`}
              onClick={() => setPestana(id)}
            >
              {texto}
            </button>
          ))}
        </nav>
        <TabReservar perfil={perfil} activa={pestana === 'reservar'} alReservar={cargarMis} />
        {pestana === 'mis' && (
          <TabMis
            lista={mis}
            error={errorMis}
            recargar={cargarMis}
            quitar={(id) => setMis((l) => (l ? l.filter((r) => r.id !== id) : l))}
          />
        )}
        {pestana === 'admin' && perfil.esAdmin && <TabAdmin />}
        {pestana === 'perfil' && (
          <TabPerfil perfil={perfil} error={errorPerfil} instalar={instalar} alInstalar={pedirInstalar} />
        )}
      </>
    );
  }

  return (
    <div className="app">
      <header className="cabecera"><h1>Pádel Tikal III y IV</h1></header>
      {cuerpo}
    </div>
  );
}
