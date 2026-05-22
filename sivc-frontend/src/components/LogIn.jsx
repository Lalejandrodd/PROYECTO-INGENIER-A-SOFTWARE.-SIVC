import React, { useState } from 'react';

export default function LoginSIVC({ onLoginSubmit, onRegistrarse }) {
  const [esAdministrador, setEsAdministrador] = useState(false);
  const [credenciales, setCredenciales] = useState({ username: '', password: '' });
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
    
    if (!credenciales.username || !credenciales.password) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    setCargando(true);
    setError('');

    try {
      const response = await fetch('http://127.0.0.1:8000/api/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: credenciales.username,
          password: credenciales.password,
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // GUARDAR EL SESSIONID EN LOCALSTORAGE
        if (data.sessionid) {
          localStorage.setItem('sessionid', data.sessionid);
          console.log('SessionID guardado:', data.sessionid);
        }
        
        if (onLoginSubmit) {
          onLoginSubmit({
            username: data.username,
            is_superuser: data.is_superuser,
            is_authenticated: true
          });
        }
      } else {
        setError(data.error || 'Credenciales inválidas');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error de conexión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-xl shadow-lg border border-gray-100">
        
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

        {error && (
          <div className="p-3 text-xs font-semibold rounded-md border bg-red-50 text-red-700 border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Nombre de Usuario
            </label>
            <input
              type="text"
              name="username"
              value={credenciales.username}
              onChange={handleInputChange}
              className="mt-1 block w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm"
              placeholder="JuanPerez"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Contraseña
            </label>
            <input
              type="password"
              name="password"
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
            {cargando ? 'Validando...' : esAdministrador ? 'Ingresar como Administrador' : 'Ingresar al Sistema'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            ¿No tienes cuenta?{' '}
            <button
              onClick={onRegistrarse}
              className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
            >
              Regístrate aquí
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}