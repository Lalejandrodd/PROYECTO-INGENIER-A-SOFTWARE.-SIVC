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

// rutas de los favicons para el modo claro y oscuro
import faviconLight from './assets/favicon.ico';
import faviconDark from './assets/favicon2.ico';

function App() {
  const [usuario, setUsuario] = useState(null);
  const [vistaActual, setVistaActual] = useState('perfil');
  const [mostrarRegistro, setMostrarRegistro] = useState(false);
  const [verificandoSesion, setVerificandoSesion] = useState(true);

  // Verificar sesión al cargar
  useEffect(() => {
    document.title = APP_CONFIG.nombre;
    const verificarSesion = async () => {
      try {
        const sessionid = localStorage.getItem('sessionid');
        const response = await axios.get('http://127.0.0.1:8000/api/verificar/', {
          headers: { 'X-Session-ID': sessionid || '' },
          withCredentials: true,
        });
        if (response.data.authenticated) {
          setUsuario({
            id: response.data.user_id,
            username: response.data.username,
            is_superuser: response.data.is_superuser,
            is_authenticated: true,
          });
        }
      } catch (err) {
        console.log('No hay sesión activa');
      } finally {
        setVerificandoSesion(false);
      }
    };
    verificarSesion();
  }, []);

  // ⭐ Cambiar favicon según el tema del sistema (usando los imports de src/assets/)
  useEffect(() => {
    const updateFavicon = (isDark) => {
      const icon = isDark ? faviconDark : faviconLight;
      // Buscar cualquier link de favicon existente o crear uno nuevo
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

  const handleLogin = (userData) => {
    setUsuario(userData);
    setMostrarRegistro(false);
  };

  const handleLogout = async () => {
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
  };

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
      {/* Barra de navegación con nuevo diseño */}
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
            </button>
          ))}
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-400 transition-colors duration-200"
          >
            Salir
          </button>
        </div>
      </nav>

      {/* Fondo dinámico con parallax */}
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
    </div>
  );
}

export default App;