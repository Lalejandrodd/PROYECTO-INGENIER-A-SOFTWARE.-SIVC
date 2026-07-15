import { useState, useEffect } from 'react';
import PerfilVecinal from './components/PerfilVecinal';
import PanelTransacciones from './components/PanelTransacciones';
import BusquedaInteligente from './components/BusquedaInteligente';
import RegistroOfertas from './components/RegistroOfertas';
import RegistroUsuario from './components/RegistroUsuario';
import LogIn from './components/LogIn';
import ModuloReputacion from './components/ModuloReputacion';
import axios from 'axios';
import APP_CONFIG from './config';
import logo from './assets/logo.svg';
import { UrgenciasModule } from './components/UrgenciasModule';
import fondoImg from './assets/fondo.jpg';
import fondo2Img from './assets/fondo2.jpg';
import Pusher from 'pusher-js';

// rutas de los favicons para el modo claro y oscuro
import faviconLight from './assets/favicon.ico';
import faviconDark from './assets/favicon2.ico';

// ------------------------------------------------------------------
// COMPONENTE TOAST DE NOTIFICACIÓN
// ------------------------------------------------------------------
function ToastNotificacion({ notificacion, onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 max-w-sm bg-white rounded-xl shadow-2xl border-l-4 border-blue-500 p-4 transform transition-all duration-300 hover:scale-105">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h4 className="text-sm font-bold text-gray-800">{notificacion.titulo}</h4>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notificacion.mensaje}</p>
          <p className="text-[10px] text-gray-400 mt-1">Repuesto: {notificacion.repuesto}</p>
          <button
            onClick={() => {
              setVisible(false);
              onClose();
            }}
            className="mt-2 text-xs text-blue-600 hover:underline font-medium"
          >
            Ver conversación →
          </button>
        </div>
        <button
          onClick={() => { setVisible(false); onClose(); }}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// COMPONENTE PRINCIPAL APP
// ------------------------------------------------------------------
function App() {
  const [usuario, setUsuario] = useState(null);
  const [vistaActual, setVistaActual] = useState('perfil');
  const [mostrarRegistro, setMostrarRegistro] = useState(false);
  const [verificandoSesion, setVerificandoSesion] = useState(true);
  const [notificacion, setNotificacion] = useState(null);
  const [nuevosMensajes, setNuevosMensajes] = useState(0);
  const [pusherInstance, setPusherInstance] = useState(null);

  // 1. VERIFICAR SESIÓN (se ejecuta una sola vez)
  useEffect(() => {
    document.title = APP_CONFIG.nombre;
    const verificarSesion = async () => {
      try {
        const sessionid = localStorage.getItem('sessionid');
        console.log('🔍 Verificando sesión con sessionid:', sessionid);
        const response = await axios.get('http://127.0.0.1:8000/api/verificar/', {
          headers: { 'X-Session-ID': sessionid || '' },
          withCredentials: true,
        });
        if (response.data.authenticated) {
          console.log('✅ Usuario autenticado:', response.data);
          setUsuario({
            id: response.data.user_id,
            username: response.data.username,
            is_superuser: response.data.is_superuser,
            is_authenticated: true,
          });
        }
      } catch (err) {
        console.log('❌ No hay sesión activa', err);
      } finally {
        setVerificandoSesion(false);
      }
    };
    verificarSesion();
  }, []);

  // 2. FAVICON (se ejecuta una sola vez)
  useEffect(() => {
    const updateFavicon = (isDark) => {
      const icon = isDark ? faviconDark : faviconLight;
      let link = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        link.type = 'image/x-icon';
        document.head.appendChild(link);
      }
      link.href = icon;
    };
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    updateFavicon(darkModeMediaQuery.matches);
    const handler = (e) => updateFavicon(e.matches);
    darkModeMediaQuery.addEventListener('change', handler);
    return () => {
      darkModeMediaQuery.removeEventListener('change', handler);
    };
  }, []);

  // 3. PUSHER (se ejecuta cada vez que usuario cambia)
  useEffect(() => {
    console.log('🔥 Efecto de Pusher se está ejecutando. Usuario:', usuario);

    if (!usuario?.id) {
      console.log('⏸️ No hay usuario, no se suscribe a Pusher');
      return;
    }

    const sessionid = localStorage.getItem('sessionid');
    console.log('🔑 SessionID para Pusher:', sessionid);
    console.log('👤 Usuario ID para canal:', usuario.id);
    console.log('📡 Creando conexión Pusher...');

    const pusher = new Pusher('a1b4e5e51a38a125b9e9', {
      cluster: 'us2',
      authEndpoint: 'http://127.0.0.1:8000/api/pusher/auth/',
      auth: {
        headers: {
          'X-Session-ID': sessionid || '',
        },
      },
    });

    // Eventos de conexión
    pusher.connection.bind('connected', () => {
      console.log('✅ Pusher conectado exitosamente');
    });

    pusher.connection.bind('error', (err) => {
      console.error('❌ Error de conexión Pusher:', err);
    });

    pusher.connection.bind('disconnected', () => {
      console.log('🔌 Pusher desconectado');
    });

    setPusherInstance(pusher);

    const channelName = `private-user-${usuario.id}`;
    console.log(`📢 Suscribiendo al canal: ${channelName}`);
    const channel = pusher.subscribe(channelName);

    channel.bind('pusher:subscription_succeeded', () => {
      console.log(`✅ Suscrito al canal ${channelName}`);
    });

    channel.bind('pusher:subscription_error', (err) => {
      console.error(`❌ Error de suscripción al canal ${channelName}:`, err);
    });

    // Evento de nuevo mensaje
    channel.bind('nuevo-mensaje', (data) => {
      console.log('📩 ¡Evento nuevo-mensaje recibido!', data);

      setNotificacion({
        titulo: `Nuevo mensaje de ${data.emisor_nombre || data.emisor}`,
        mensaje: data.texto,
        repuesto: data.repuesto,
        conversacionId: data.conversacion_id,
      });

      setNuevosMensajes(prev => prev + 1);
    });

    return () => {
      console.log(`🧹 Limpiando suscripción al canal ${channelName}`);
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [usuario]);  // <--- DEPENDENCIA CLAVE

  // 4. LIMPIAR BADGE al entrar a transacciones
  useEffect(() => {
    if (vistaActual === 'transacciones') {
      console.log('👀 Vista de transacciones, limpiando badge');
      setNuevosMensajes(0);
    }
  }, [vistaActual]);

  // Manejadores de login/logout
  const handleLogin = (userData) => {
    console.log('🔐 Login exitoso, userData:', userData);
    setUsuario(userData);
    setMostrarRegistro(false);
  };

  const handleLogout = async () => {
    console.log('🚪 Cerrando sesión...');
    try {
      const sessionid = localStorage.getItem('sessionid');
      await axios.post(
        'http://127.0.0.1:8000/api/logout/',
        {},
        {
          headers: { 'X-Session-ID': sessionid || '' },
          withCredentials: true,
        }
      );
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
    localStorage.removeItem('sessionid');
    localStorage.removeItem('user_id');
    setUsuario(null);
    setVistaActual('perfil');
    setNotificacion(null);
    setNuevosMensajes(0);
    if (pusherInstance) {
      pusherInstance.disconnect();
      setPusherInstance(null);
    }
    console.log('✅ Sesión cerrada');
  };

  // Renderizado condicional
  if (verificandoSesion) {
    return <div className="min-h-screen flex items-center justify-center">Verificando sesión...</div>;
  }

  if (!usuario) {
    if (mostrarRegistro) {
      return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
          <div className="p-4 text-right">
            <button onClick={() => setMostrarRegistro(false)} className="text-blue-600 hover:underline">
              ← Volver al Login
            </button>
          </div>
          <RegistroUsuario onRegistroExitoso={() => setMostrarRegistro(false)} />
        </div>
      );
    }
    return <LogIn onLoginSubmit={handleLogin} onRegistrarse={() => setMostrarRegistro(true)} />;
  }

  if (usuario.is_superuser) {
    window.location.href = 'http://127.0.0.1:8000/admin/';
    return null;
  }

  const fondoActual = vistaActual === 'registrar' ? fondo2Img : fondoImg;
  const navItems = [
    { id: 'perfil', label: 'Mi Perfil' },
    { id: 'buscar', label: 'Buscar Repuestos' },
    { id: 'registrar', label: 'Publicar Oferta' },
    { id: 'transacciones', label: 'Transacciones' },
    { id: 'reputacion', label: 'Reputación' },
    { id: 'urgencias', label: 'Urgencias Comunitaria' },
  ];

  return (
    <div className="min-h-screen">
      <nav className="fixed top-0 left-0 w-full z-50 bg-[#182234] shadow-sm border-b border-gray-700 px-6 py-3 flex flex-wrap items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Logo" className="h-10 w-auto" />
          <h1 className="text-xl font-bold text-white">{APP_CONFIG.nombre}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-300">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setVistaActual(item.id)}
              className={`relative px-1 py-1 transition-all duration-200 ${
                vistaActual === item.id
                  ? 'text-white after:absolute after:left-0 after:-bottom-1 after:w-full after:h-0.5 after:bg-blue-400 after:rounded-full'
                  : 'hover:text-white hover:after:absolute hover:after:left-0 hover:after:-bottom-1 hover:after:w-full hover:after:h-0.5 hover:after:bg-blue-400/50 hover:after:rounded-full'
              }`}
            >
              {item.label}
              {item.id === 'transacciones' && nuevosMensajes > 0 && (
                <span className="absolute -top-1 -right-3 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  {nuevosMensajes}
                </span>
              )}
            </button>
          ))}
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 transition-colors duration-200">
            Salir
          </button>
        </div>
      </nav>

      <div
        className="min-h-screen pt-[72px]"
        style={{
          backgroundImage: `url(${fondoActual})`,
          backgroundAttachment: 'fixed',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white/80 rounded-2xl shadow-lg p-6">
            {vistaActual === 'perfil' && <PerfilVecinal />}
            {vistaActual === 'buscar' && <BusquedaInteligente />}
            {vistaActual === 'registrar' && <RegistroOfertas />}
            {vistaActual === 'transacciones' && <PanelTransacciones />}
            {vistaActual === 'urgencias' && <UrgenciasModule miUsuarioId={usuario?.id} />}
            {vistaActual === 'reputacion' && <ModuloReputacion miUsuarioId={usuario?.id} />}
          </div>
        </div>
      </div>

      {notificacion && (
        <ToastNotificacion
          notificacion={notificacion}
          onClose={() => setNotificacion(null)}
        />
      )}
    </div>
  );
}

export default App;