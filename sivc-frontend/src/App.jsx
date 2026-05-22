import { useState, useEffect } from 'react';
import PerfilVecinal from './components/PerfilVecinal';
import PanelTransacciones from './components/PanelTransacciones';
import BusquedaInteligente from './components/BusquedaInteligente';
import RegistroOfertas from './components/RegistroOfertas';
import RegistroUsuario from './components/RegistroUsuario';
import LogIn from './components/LogIn';
import axios from 'axios';

function App() {
  const [usuario, setUsuario] = useState(null);
  const [vistaActual, setVistaActual] = useState('perfil');
  const [mostrarRegistro, setMostrarRegistro] = useState(false);
  const [verificandoSesion, setVerificandoSesion] = useState(true);

  // Verificar si ya hay una sesión activa al cargar la página
  useEffect(() => {
    const verificarSesion = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:8000/api/verificar/', {
          withCredentials: true
        });
        if (response.data.authenticated) {
          setUsuario({
            username: response.data.username,
            is_superuser: response.data.is_superuser,
            is_authenticated: true
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

  const handleLogin = (userData) => {
    setUsuario(userData);
    setMostrarRegistro(false);
  };

  const handleLogout = async () => {
    try {
      await axios.post('http://127.0.0.1:8000/api/logout/', {}, {
        withCredentials: true
      });
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
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

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md p-4 flex justify-between items-center flex-wrap gap-2">
        <h1 className="text-xl font-bold text-blue-600">SIVC - Comunidad</h1>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setVistaActual('perfil')} className={`px-4 py-2 rounded transition ${vistaActual === 'perfil' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>
            Mi Perfil
          </button>
          <button onClick={() => setVistaActual('buscar')} className={`px-4 py-2 rounded transition ${vistaActual === 'buscar' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>
            Buscar Repuestos
          </button>
          <button onClick={() => setVistaActual('registrar')} className={`px-4 py-2 rounded transition ${vistaActual === 'registrar' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>
            Publicar Oferta
          </button>
          <button onClick={() => setVistaActual('transacciones')} className={`px-4 py-2 rounded transition ${vistaActual === 'transacciones' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>
            Transacciones
          </button>
          <button onClick={handleLogout} className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white transition">
            Salir
          </button>
        </div>
      </nav>
      
      <div className="p-6">
        {vistaActual === 'perfil' && <PerfilVecinal />}
        {vistaActual === 'buscar' && <BusquedaInteligente />}
        {vistaActual === 'registrar' && <RegistroOfertas />}
        {vistaActual === 'transacciones' && <PanelTransacciones />}
      </div>
    </div>
  );
}

export default App;