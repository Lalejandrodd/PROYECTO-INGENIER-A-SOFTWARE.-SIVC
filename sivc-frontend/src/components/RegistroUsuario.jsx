import React, { useState } from 'react';
import axios from 'axios';

export default function RegistroUsuario({ onRegistroExitoso }) {
  const [formData, setFormData] = useState({
    username: '',
    nombre_completo: '',
    residencia: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones de formato
    const usernameRegex = /^[a-zA-Z0-9_.-]{3,30}$/;
    if (!usernameRegex.test(formData.username)) {
      setError('Username debe tener 3-30 caracteres (letras, números, . _ -)');
      return;
    }

    if (!formData.nombre_completo || formData.nombre_completo.length < 3) {
      setError('Nombre completo debe tener al menos 3 caracteres');
      return;
    }

    if (!formData.residencia || formData.residencia.length < 3) {
      setError('Residencia debe tener al menos 3 caracteres');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setCargando(true);
    setError('');

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/registrar-usuario/', {
        username: formData.username,
        password: formData.password,
        nombre_completo: formData.nombre_completo,
        residencia: formData.residencia
        // 🔥 id_usuario se genera automáticamente en el backend (username en mayúsculas)
      }, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true
      });

      if (response.data.success) {
        setSuccess(true);
        setFormData({ username: '', nombre_completo: '', residencia: '', password: '', confirmPassword: '' });
        if (onRegistroExitoso) setTimeout(onRegistroExitoso, 2000);
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error de conexión');
    } finally {
      setCargando(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-200 text-center">
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <h2 className="text-xl font-bold text-green-800">¡Registro exitoso!</h2>
          <p className="text-green-600 mt-2">Usuario <strong>{formData.username}</strong> creado correctamente.</p>
          <button onClick={() => setSuccess(false)} className="mt-4 bg-blue-600 text-white font-bold py-2 px-4 rounded-md">Registrar otro</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Registro de Usuario</h2>
      {error && <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Username *</label>
          <input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md" placeholder="ej: juanperez" required />
          <p className="text-[10px] text-gray-400 mt-1">3-30 caracteres (letras, números, . _ -)</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Nombre Completo *</label>
          <input type="text" name="nombre_completo" value={formData.nombre_completo} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md" placeholder="Juan Pérez" required />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Residencia *</label>
          <input type="text" name="residencia" value={formData.residencia} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md" placeholder="Ej: Bloque A, Piso 2" required />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Contraseña *</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md" placeholder="Mínimo 6 caracteres" required />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Confirmar Contraseña *</label>
          <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md" placeholder="••••••••" required />
        </div>

        <button type="submit" disabled={cargando} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition disabled:bg-gray-400">
          {cargando ? 'Registrando...' : 'Registrar Usuario'}
        </button>
      </form>
    </div>
  );
}