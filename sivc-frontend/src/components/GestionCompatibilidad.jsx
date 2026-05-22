import React, { useState } from 'react';

// Interfaz de la HU 3

// Repuestos base registrados
const LISTADO_REPUESTOS_MAESTROS = [
  { id: 101, nombre: "Pastillas de Freno Delanteras Universales tipo A" },
  { id: 102, nombre: "Filtro de Aceite Genérico PH3614" },
  { id: 103, nombre: "Correa de Tiempos 117 Dientes" }
];

// Opciones de mapeo de vehículos
const VEHICULOS_DISPONIBLES = [
  { id: "v1", marca: "Toyota", modelo: "Corolla (2009-2014)" },
  { id: "v2", marca: "Toyota", modelo: "Yaris (2007-2018)" },
  { id: "v3", marca: "Chevrolet", modelo: "Aveo (2008-2015)" },
  { id: "v4", marca: "Chevrolet", modelo: "Optra (2006-2012)" },
  { id: "v5", marca: "Ford", modelo: "Fiesta Move (2011-2014)" }
];

export default function MatrizCompatibilidad() {
  const [repuestoSeleccionado, setRepuestoSeleccionado] = useState('');
  const [compatibilidades, setCompatibilidades] = useState({});
  const [guardado, setGuardado] = useState(false);

  const handleCheckboxChange = (vehiculoId) => {
    setCompatibilidades(prev => ({
      ...prev,
      [vehiculoId]: !prev[vehiculoId]
    }));
    setGuardado(false);
  };

  const handleSaveMatrix = (e) => {
    e.preventDefault();
    if (!repuestoSeleccionado) return;
    // Simula el almacenamiento persistente relacional de la ERS
    setGuardado(true);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-200">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800">Panel Técnico: Matriz de Compatibilidad Mecánica</h2>
        <p className="text-xs text-gray-400">Asocia piezas genéricas o específicas con múltiples líneas automotrices habilitadas.</p>
      </div>

      <form onSubmit={handleSaveMatrix} className="space-y-6">
        {/* Selector Maestro */}
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">1. Seleccionar Repuesto Maestro</label>
          <select value={repuestoSeleccionado} onChange={(e) => { setRepuestoSeleccionado(e.target.value); setGuardado(false); }} className="block w-full p-2.5 bg-gray-50 border border-gray-300 rounded-md text-sm">
            <option value="">-- Eliga un componente base del inventario --</option>
            {LISTADO_REPUESTOS_MAESTROS.map(r => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
        </div>

        {/* Bloque de Vinculación Múltiple con Checkboxes */}
        {repuestoSeleccionado && (
          <div className="space-y-3 animate-fadeIn">
            <label className="block text-xs font-bold text-gray-600 uppercase">2. Marcar Marcas y Modelos Compatibles</label>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 divide-y divide-gray-200">
              {VEHICULOS_DISPONIBLES.map((vehiculo) => (
                <div key={vehiculo.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center">
                    <input type="checkbox" id={vehiculo.id} checked={!!compatibilidades[vehiculo.id]} onChange={() => handleCheckboxChange(vehiculo.id)} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                    <label htmlFor={vehiculo.id} className="ml-3 text-sm text-gray-700 font-medium">
                      {vehiculo.marca} <span className="text-gray-400 text-xs">({vehiculo.modelo})</span>
                    </label>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${compatibilidades[vehiculo.id] ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-500'}`}>
                    {compatibilidades[vehiculo.id] ? 'Enlazado' : 'Inactivo'}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md text-sm transition">
                Actualizar e Indexar Relaciones de Compatibilidad
              </button>
            </div>
          </div>
        )}

        {guardado && (
          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-medium rounded border border-emerald-200 text-center">
            Matriz relacional actualizada con persistencia e integridad relacional.
          </div>
        )}
      </form>
    </div>
  );
}