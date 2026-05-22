import React, { useState } from 'react';
import axios from 'axios';

export default function RegistroUsuario({ onRegistroExitoso }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    nombre_completo: '',
    id_usuario: '',
    residencia: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!formData.username || !formData.password || !formData.nombre_completo || !formData.residencia) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (formData.password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    setCargando(true);
    setError('');

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/registrar-usuario/', {
        username: formData.username,
        password: formData.password,
        nombre_completo: formData.nombre_completo,
        id_usuario: formData.id_usuario || formData.username.toUpperCase(),
        residencia: formData.residencia
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true
      });

      if (response.data.success) {
        setSuccess(true);
        setFormData({
          username: '',
          password: '',
          confirmPassword: '',
          nombre_completo: '',
          id_usuario: '',
          residencia: ''
        });
        
        if (onRegistroExitoso) {
          setTimeout(() => onRegistroExitoso(), 2000);
        }
      } else {
        setError(response.data.error || 'Error al registrar usuario');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.error || 'Error de conexión con el servidor');
    } finally {
      setCargando(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-200 text-center">
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <h2 className="text-xl font-bold text-green-800">¡Registro exitoso!</h2>
          <p className="text-green-600 mt-2">
            El usuario {formData.username} ha sido creado correctamente.
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md text-sm transition"
          >
            Registrar otro usuario
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Registro de Usuario</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
            Nombre de Usuario *
          </label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="ej: juanperez"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
            Contraseña *
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
            Confirmar Contraseña *
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
            Nombre Completo *
          </label>
          <input
            type="text"
            name="nombre_completo"
            value={formData.nombre_completo}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Juan Pérez"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
            ID Usuario (opcional)
          </label>
          <input
            type="text"
            name="id_usuario"
            value={formData.id_usuario}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Se generará automáticamente"
          />
          <p className="text-xs text-gray-400 mt-1">Dejar en blanco para generar automático</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
            Residencia *
          </label>
          <input
            type="text"
            name="residencia"
            value={formData.residencia}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ej: Bloque A, Piso 2"
          />
        </div>

        <button
          type="submit"
          disabled={cargando}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-150 disabled:bg-gray-400"
        >
          {cargando ? 'Registrando...' : 'Registrar Usuario'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-400">
          Al registrarte, aceptas las reglas de la comunidad SIVC.
        </p>
      </div>
    </div>
  );
}