import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';

// Importación de todo el ecosistema de interfaces del Sprint 1 con sus nombres reales
import LogIn from './components/LogIn'; 
import BusquedaInteligente from './components/BusquedaInteligente'; 
import RegistroOfertas from './components/RegistroOfertas';
import GestionCompatibilidad from './components/GestionCompatibilidad';

// Vista de Inicio (Home) - Panel de Bienvenida Comunitario
function Home() {
  return (
    <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100 text-center max-w-2xl mx-auto mt-6">
      <h1 className="text-3xl font-black text-gray-800 mb-2">¡Bienvenido al SIVC!</h1>
      <p className="text-gray-500 text-sm mb-6">
        Sistema de Intercambio Vecinal de Componentes. Una plataforma diseñada para el trueque solidario y seguro de repuestos automotrices dentro de la comunidad.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <Link to="/catalogo" className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 text-blue-700 font-bold text-sm transition text-center block">
          🔍 Buscar Repuestos Compatibles
        </Link>
        <Link to="/crear" className="p-4 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 text-emerald-700 font-bold text-sm transition text-center block">
          📦 Publicar Nueva Oferta
        </Link>
      </div>
    </div>
  );
}

// Vista de Perfil Vecinal - Historial inalterable de Puntos de Valor
function PerfilVecinal() {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 max-w-2xl mx-auto mt-6">
      <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Mi Perfil Comunitario</h2>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">ID de Vecino: #V-24890</p>
        </div>
        <div className="text-right bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
          <span className="text-xs block text-blue-600 font-bold uppercase tracking-wide">Saldo Actual</span>
          <span className="text-2xl font-black text-blue-900">140 pts</span>
        </div>
      </div>
      <p className="text-sm text-gray-500 italic">
        Tu registro histórico y balance relacional de trueques se encuentra indexado con integridad referencial.
      </p>
    </div>
  );
}

export default function App() {
  // Estado local para saber en tiempo real el rol del usuario conectado
  const [usuarioRol, setUsuarioRol] = useState(localStorage.getItem('sivc_user_role') || null);

  // Sincronizar el estado del rol si el usuario inicia sesión con éxito
  const handleLoginSuccess = (data) => {
    setUsuarioRol(data.role);
  };

  // Función para limpiar la sesión y actualizar la interfaz inmediatamente
  const handleLogout = () => {
    localStorage.removeItem('sivc_access_token');
    localStorage.removeItem('sivc_refresh_token');
    localStorage.removeItem('sivc_user_role');
    setUsuarioRol(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans antialiased">
        
        {/* Menú de Navegación Global Superior */}
        <nav className="bg-gray-900 text-white p-4 shadow-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            {/* Logotipo Raíz */}
            <Link to="/" className="font-black text-xl text-blue-400 tracking-wider hover:text-blue-300 transition">
              SIVC AUTOMOTRIZ
            </Link>
            
            {/* Hipervínculos de Interconexión de Módulos */}
            <div className="flex space-x-6 text-sm font-medium items-center">
              {/* Opciones visibles para cualquier usuario logueado */}
              <Link to="/catalogo" className="hover:text-blue-300 transition">Buscar Repuestos</Link>
              <Link to="/crear" className="hover:text-blue-300 transition">Publicar Oferta</Link>
              
              {/* INTERCONEXIÓN INTELIGENTE: Mostrar Matriz solo si es Administrador */}
              {usuarioRol === 'admin' && (
                <Link to="/matriz" className="text-red-400 border border-red-500/30 px-2 py-0.5 rounded bg-red-950/20 hover:text-red-300 transition">
                  Gestión Compatibilidad (Admin)
                </Link>
              )}
              
              <Link to="/perfil" className="hover:text-blue-300 transition bg-gray-800 px-3 py-1 rounded">Mi Perfil</Link>
              
              {/* Control visual de Sesión */}
              {usuarioRol ? (
                <button 
                  onClick={handleLogout}
                  className="text-red-400 hover:text-red-300 text-xs font-bold border border-red-900/50 px-2 py-1 rounded transition bg-red-950/30"
                >
                  Salir
                </button>
              ) : (
                <Link to="/login" className="text-blue-400 hover:text-blue-300 text-xs font-bold border border-blue-900/50 px-2 py-1 rounded transition bg-blue-950/30">
                  Ingresar
                </Link>
              )}
            </div>
          </div>
        </nav>

        {/* Enrutador Dinámico e Inyección de Pantallas */}
        <main className="max-w-6xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            {/* Pasamos el prop onLoginSubmit corregido para capturar la sesión de Django */}
            <Route path="/login" element={<LogIn onLoginSubmit={handleLoginSuccess} />} />
            <Route path="/catalogo" element={<BusquedaInteligente saldoUsuario={140} />} />
            <Route path="/crear" element={<RegistroOfertas />} />
            <Route path="/matriz" element={<GestionCompatibilidad />} />
            <Route path="/perfil" element={<PerfilVecinal />} />
          </Routes>
        </main>

      </div>
    </Router>
  );
}