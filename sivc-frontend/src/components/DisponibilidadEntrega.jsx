import React, { useState } from 'react';

// Interfaz de la HU 5 mejorada con edición

export default function Disponibilidad() {
  // Inicializamos el estado con los datos por defecto
  const [perfil, setPerfil] = useState({
    nombre: "Cisor Quijada",
    horasDisponibles: "2:00pm a 4:30pm",
    residencia: ["Torre/Bloque X", "Apto/Nro_Casa"]
  });

  // Estado para saber si estamos editando o solo viendo
  const [editando, setEditando] = useState(false);

  // Manejadores para actualizar el estado
  const manejarCambioTexto = (e) => {
    const { name, value } = e.target;
    setPerfil({
      ...perfil,
      [name]: value
    });
  };

  const manejarCambioResidencia = (index, value) => {
    const nuevaResidencia = [...perfil.residencia];
    nuevaResidencia[index] = value;
    setPerfil({
      ...perfil,
      residencia: nuevaResidencia
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl p-5 shadow-sm space-y-4 relative">
        
        <div>
          <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Usuario Comunitario</p>
          <h3 className="text-xl font-bold">{perfil.nombre}</h3>
        </div>

        <div className="border-t border-slate-700 pt-1"></div>

        {/* Sección de Horas Disponibles */}
        <div>
          <label className="text-xs text-slate-400 font-semibold tracking-wider uppercase block mb-1">
            Horas Disponibles
          </label>
          {editando ? (
            <input
              type="text"
              name="horasDisponibles"
              value={perfil.horasDisponibles}
              onChange={manejarCambioTexto}
              className="w-full bg-slate-700 text-amber-400 font-bold px-3 py-2 rounded border border-slate-600 focus:outline-none focus:border-amber-400"
              placeholder="Ej. 2:00pm a 4:30pm"
            />
          ) : (
            <span className="text-2xl font-black text-amber-400 block">{perfil.horasDisponibles}</span>
          )}
        </div>

        <div className="border-t border-slate-700 pt-1"></div>

        {/* Sección de Ubicación */}
        <div>
          <label className="text-xs text-slate-400 font-semibold tracking-wider uppercase block mb-1">
            Ubicación en la Residencia
          </label>
          {editando ? (
            <div className="space-y-2">
              <input
                type="text"
                value={perfil.residencia[0]}
                onChange={(e) => manejarCambioResidencia(0, e.target.value)}
                className="w-full bg-slate-700 text-amber-400 font-bold px-3 py-2 rounded border border-slate-600 focus:outline-none focus:border-amber-400"
                placeholder="Torre/Bloque"
              />
              <input
                type="text"
                value={perfil.residencia[1]}
                onChange={(e) => manejarCambioResidencia(1, e.target.value)}
                className="w-full bg-slate-700 text-amber-400 font-bold px-3 py-2 rounded border border-slate-600 focus:outline-none focus:border-amber-400"
                placeholder="Apto/Nro_Casa"
              />
            </div>
          ) : (
            <span className="text-xl font-black text-amber-400 block">
              {perfil.residencia[0]} <span className="text-white font-normal">-</span> {perfil.residencia[1]}
            </span>
          )}
        </div>

        <div className="border-t border-slate-700 pt-2"></div>

        {/* Botón para los cambios */}
        <div className="flex justify-end">
          <button
            onClick={() => setEditando(!editando)}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors duration-200 ${
              editando 
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                : 'bg-amber-400 hover:bg-amber-500 text-slate-900'
            }`}
          >
            {editando ? 'Guardar Cambios' : 'Editar Disponibilidad'}
          </button>
        </div>

      </div>
    </div>
  );
}