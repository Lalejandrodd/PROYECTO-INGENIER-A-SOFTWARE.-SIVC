import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginSIVC({ onLoginSubmit }) {
  const navigate = useNavigate();

  // Estado para controlar qué tipo de login se está mostrando
  const [esAdministrador, setEsAdministrador] = useState(false);
  
  // Estados para los campos del formulario
  const [credenciales, setCredenciales] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleInputChange = (e) => {
    setCredenciales({
      ...credenciales,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  // Función auxiliar para decodificar la información del JWT si el rol viene integrado en el payload
  const decodificarPayloadJWT = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    
    if (!credenciales.email || !credenciales.password) {
      setError('Error inmediato: Todos los campos son obligatorios para ingresar.');
      return;
    }

    setCargando(true);
    setError('');

    const payloadAutenticacion = {
      username: credenciales.email, // SimpleJWT recibe el identificador en la llave 'username'
      password: credenciales.password
    };

    try {
      const response = await fetch('http://localhost:8000/api/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadAutenticacion),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error('El servidor de Django no responde en formato JSON o el endpoint /api/token/ no está activo.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Credenciales inválidas en el sistema vecinal.');
      }

      // Intentamos extraer el rol o privilegios de los datos devueltos o desde el interior del token access
      const tokenDecodificado = decodificarPayloadJWT(data.access);
      
      // Buscamos 'role', 'is_staff' o 'is_superuser' para verificar si es administrador
      const esAdminEnBackend = data.role === 'admin' || (tokenDecodificado && (tokenDecodificado.is_staff || tokenDecodificado.is_superuser || tokenDecodificado.role === 'admin'));
      const rolDeterminado = esAdminEnBackend ? 'admin' : 'user';

      // Validación de concordancia con la pestaña seleccionada
      const rolEsperado = esAdministrador ? 'admin' : 'user';
      if (rolDeterminado !== rolEsperado) {
        // CORREGIDO: Línea 71 corregida usando backticks para la interpolación de variables
        throw new Error(`Acceso restringido: Tus credenciales corresponden al rol de ${esAdminEnBackend ? 'Administrador' : 'Vecino'}. cambia de pestaña arriba.`);
      }

      // Almacenamiento seguro de credenciales de sesión
      localStorage.setItem('sivc_access_token', data.access);
      localStorage.setItem('sivc_refresh_token', data.refresh);
      localStorage.setItem('sivc_user_role', rolDeterminado);
      
      if (typeof onLoginSubmit === 'function') {
        onLoginSubmit({ ...data, role: rolDeterminado });
      }

      // Redirección inteligente e interconexión de interfaces
      if (esAdministrador) {
        navigate('/matriz'); // Administrador va a Gestión de Compatibilidad
      } else {
        navigate('/catalogo'); // Vecino va a Búsqueda Inteligente
      }

    } catch (err) {
      console.error("Error en el Login:", err);
      setError(err.message || 'Error de comunicación o rechazo de red con el servidor de Django.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-xl shadow-lg border border-gray-100">
        
        {/* Pestañas de Roles */}
        <div className="flex border-b border-gray-200">
          <button
            type="button"

            className={`w-1/2 pb-3 text-sm font-bold border-b-2 transition-colors ${!esAdministrador ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            onClick={() => { setEsAdministrador(false); setError(''); }}
          >
            Ingreso Vecino
          </button>
          <button
            type="button"

            className={`w-1/2 pb-3 text-sm font-bold border-b-2 transition-colors ${esAdministrador ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            onClick={() => { setEsAdministrador(true); setError(''); }}
          >
            Panel Administrativo
          </button>
        </div>

        {/* Encabezado */}
        <div className="text-center">
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">
            SIVC {esAdministrador ? 'Control' : 'Comunidad'}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {esAdministrador 
              ? 'Área técnica para la gestión de matrices de compatibilidad.' 
              : 'Accede al catálogo de intercambio y revisa tus Puntos de Valor.'}
          </p>
        </div>

        {/* Alertas */}
        {error && (
          <div className={`p-3 text-xs font-semibold rounded-md border ${esAdministrador ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
            {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email-input" className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Correo Electrónico / Username
            </label>
            <input
              id="email-input"
              type="text"
              name="email"
              autoComplete="username"
              value={credenciales.email}
              onChange={handleInputChange}
              className="mt-1 block w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm"
              placeholder="Ej: vecino_juan o correo@dominio.com"
            />
          </div>

          <div>
            <label htmlFor="password-input" className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Contraseña de Acceso
            </label>
            <input
              id="password-input"
              type="password"
              name="password"
              autoComplete="current-password"
              value={credenciales.password}
              onChange={handleInputChange}
              className="mt-1 block w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className={`w-full font-bold py-2.5 px-4 rounded-lg text-sm text-white shadow transition duration-150 ${cargando ? 'bg-gray-400 cursor-not-allowed' : esAdministrador ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {cargando ? 'Validando con Django...' : esAdministrador ? 'Ingresar como Administrativo' : 'Ingresar al Sistema'}
          </button>
        </form>

        <div className="text-center">
          <p className="text-[10px] text-gray-400">
            Regla de Aprendizaje SIVC: Tiempo estimado de inducción menor a 5 minutos.
          </p>
        </div>
      </div>
    </div>
  );
}