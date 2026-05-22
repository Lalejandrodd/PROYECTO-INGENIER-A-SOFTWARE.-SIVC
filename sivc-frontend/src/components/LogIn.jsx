import React, { useState } from 'react';

//Log in :p

export default function LoginSIVC({ onLoginSubmit }) {
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

const handleSubmit = async (e) => {
  e.preventDefault(); 
  
  if (!credenciales.email || !credenciales.password) {
    setError('Error inmediato: Todos los campos son obligatorios para ingresar.');
    return;
  }

  setCargando(true);
  setError('');

  // Formateamos los datos para que coincidan con lo que Simple JWT espera (username y password)
  const payloadAutenticacion = {
    username: credenciales.email, // Django SimpleJWT busca por defecto el identificador en la llave "username"
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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'Credenciales inválidas en el sistema vecinal.');
  }

  // Si tu backend personalizado devuelve el rol en data.role, lo validamos
  const rolEsperado = esAdministrador ? 'admin' : 'user';
  if (data.role && data.role !== rolEsperado) {
    throw new Error(`No tienes permisos para ingresar como ${esAdministrador ? 'Administrador' : 'Vecino'}.`);
  }

  localStorage.setItem('sivc_access_token', data.access);
  localStorage.setItem('sivc_refresh_token', data.refresh);
  if (data.role) localStorage.setItem('sivc_user_role', data.role);
  
  alert(`¡Ingreso exitoso como ${esAdministrador ? 'Administrador' : 'Vecino'}!`);

} catch (err) {
  setError(err.message || 'Error de comunicación con el servidor de Django.');
} finally {
  setCargando(false);
}
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-xl shadow-lg border border-gray-100">
        
        {/* Selector de Rol / Pestañas de Navegación Cortas */}
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            // CORRECCIÓN AQUÍ: className con llaves y backticks
            className={`w-1/2 pb-3 text-sm font-bold border-b-2 transition-colors ${!esAdministrador ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            onClick={() => { setEsAdministrador(false); setError(''); }}
          >
            Ingreso Vecino
          </button>
          <button
            type="button"
            // CORRECCIÓN AQUÍ: className con llaves y backticks
            className={`w-1/2 pb-3 text-sm font-bold border-b-2 transition-colors ${esAdministrador ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            onClick={() => { setEsAdministrador(true); setError(''); }}
          >
            Panel Administrativo
          </button>
        </div>

        {/* Encabezado Dinámico */}
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

        {/* Alertas de Error Inmediatas */}
        {error && (
          <div className={`p-3 text-xs font-semibold rounded-md border ${esAdministrador ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
            {error}
          </div>
        )}

        {/* Formulario de Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
  <label htmlFor="email-input" className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
    Correo Electrónico
  </label>
  <input
    id="email-input" // <-- AGREGAR ESTO
    type="email"
    name="email"
    autoComplete="email" // <-- SOLUCIONA EL OTRO AVISO DE AUTOCOMPLETE
    value={credenciales.email}
    onChange={handleInputChange}
    className="mt-1 block w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm"
    placeholder="ejemplo@urbanizacion.com"
  />
</div>

{/* Bloque de la Contraseña */}
<div>
  <label htmlFor="password-input" className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
    Contraseña de Acceso
  </label>
  <input
    id="password-input" // <-- AGREGAR ESTO
    type="password"
    name="password"
    autoComplete="current-password" // <-- SOLUCIONA EL OTRO AVISO DE AUTOCOMPLETE
    value={credenciales.password}
    onChange={handleInputChange}
    className="mt-1 block w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm"
    placeholder="••••••••"
  />
</div>

          {/* Botón de Envío Adaptativo */}
          <button
            type="submit"
            disabled={cargando}
            
            className={`w-full font-bold py-2.5 px-4 rounded-lg text-sm text-white shadow transition duration-150 ${cargando ? 'bg-gray-400 cursor-not-allowed' : esAdministrador ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {cargando ? 'Validando con Django...' : esAdministrador ? 'Ingresar como Administrador' : 'Ingresar al Sistema'}
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