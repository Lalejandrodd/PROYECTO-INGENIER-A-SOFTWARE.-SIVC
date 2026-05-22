import { useState } from 'react'
import PerfilVecinal from './components/PerfilVecinal'
import RegistroOfertas from './components/RegistroOfertas'
import BusquedaInteligente from './components/BusquedaInteligente'
import GestionCompatibilidad from './components/GestionCompatibilidad'
import DisponibilidadEntrega from './components/DisponibilidadEntrega'
import LogIn from './components/LogIn'
import PanelTransacciones from './components/PanelTransacciones'

function App() {
    const loginHaciaDjango = async (datosDeLogin) => {
    console.log("Enviando estos datos agrupados al backend en Django:", datosDeLogin);
    // Aquí puedes meter tu lógica customizada de Axios o Redux
  };
  return <LogIn onLoginSubmit={loginHaciaDjango} />;
   //prueba de Log in :D
   /*
    return (
    <div className="min-h-screen bg-gray-50">
      <LogIn />
    </div>
  );
  */
     //prueba del panel transacciones
  /*
    return (
    <div className="min-h-screen bg-gray-50">
      <PanelTransacciones />
    </div>
  );
  */
  // Prueba individual de la Interfaz de la HU 8
  /*
  return (
    <div className="min-h-screen bg-gray-50">
      <PerfilVecinal />
    </div>
  );
  */
  // Prueba individual de la Interfaz de la HU 1, 7, 12
  /*
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="container mx-auto">
        <h1 className="text-center text-3xl font-black text-gray-900 my-6">Sistema SIVC - Entorno de Pruebas</h1>
        <RegistroOfertas />
      </div>
    </div>
  );
  */
  // Prueba individual de la Interfaz de la HU 2, 9
  /*
  return (
    <div className="min-h-screen bg-gray-50">
      <BusquedaInteligente />
    </div>
  );
*/
  // Prueba individual de la Interfaz de la HU 3
/*
  return (
    <div className="min-h-screen bg-gray-50">
      <GestionCompatibilidad />
    </div>
  );
*/

// Prueba individual de la Interfaz de la HU 5
/*
  return (
    <div className="min-h-screen bg-gray-50">
      <DisponibilidadEntrega />
    </div>
  );
*/
}

export default App
