import React, { useState, useEffect } from 'react';

// Mapeo de los IDs de ranking del Backend a Etiquetas Visuales del ERS
const RANKING_LABELS = {
  1: { name: "Novato", color: "bg-gray-100 text-gray-800 border-gray-300" },
  2: { name: "Aprendiz", color: "bg-blue-100 text-blue-800 border-blue-300" },
  3: { name: "Colaborador", color: "bg-purple-100 text-purple-800 border-purple-300" },
  4: { name: "Experto", color: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  5: { name: "Leyenda", color: "bg-amber-100 text-amber-800 border-amber-300 animate-pulse" }
};

export default function PanelTransacciones() {
  // 1. ESTADO DEL HISTORIAL: Estructura idéntica al método calcular_resumen_puntos() del Backend
  const [datosHistorial, setDatosHistorial] = useState({
    vecino: "Caroline Corniells",
    ranking: 3, // Viene como entero (1-5) desde el backend
    saldo_actual: 450.00,
    total_intercambios: 3,
    puntos_acumulados_historicos: 380.00,
    transacciones_recientes : [
      { id_transaccion: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d", fecha: "21/05/2026 14:30", puntos: 120.00, tipo: "Recibido", contraparte: "Carlos Mendoza", repuesto: "Pastillas de Freno Delanteras" },
      { id_transaccion: "f8e7d6c5-b4a3-2f1e-0d9c-8b7a6f5e4d3c", fecha: "18/05/2026 09:15", puntos: 150.00, tipo: "Entregado", contraparte: "José Castillo", repuesto: "Alternador 12V Toyota" },
      { id_transaccion: "9f8e7d6c-5b4a-3f2e-1d0c-9b8a7f6e5d4c", fecha: "10/05/2026 18:00", puntos: 260.00, tipo: "Recibido", contraparte: "Ana Rodríguez", repuesto: "Bomba de Agua Fiesta" }
    ]
  });

  // 2. ESTADO DEL SIMULADOR DE TASACIÓN: Conecta con las reglas de TasacionService
  const [datosRepuesto, setDatosRepuesto] = useState({
    categoria: 'Frenos',
    estado_fisico: 'Usado - Como nuevo',
    anio_vehiculo: 2022
  });
  const [puntosSimulados, setPuntosSimulados] = useState(100);

  // HU 12: Replicación exacta en Frontend de la lógica de TasacionService del Backend
  useEffect(() => {
    const puntos_base = 100.0;
    
    const multiplicadores_estado = {
      'Nuevo': 1.5,
      'Usado - Como nuevo': 1.2,
      'Usado - Funcional': 1.0,
      'Para repuesto': 0.5
    };
    
    const multiplicadores_cat = {
      'Motor': 1.3,
      'Transmisión': 1.2,
      'Carrocería': 1.0,
      'Frenos': 1.1
    };
    
    const anio_actual = 2026;
    const antiguedad = anio_actual - parseInt(datosRepuesto.anio_vehiculo || 2026);
    const depreciacion = Math.max(0.5, 1 - (antiguedad * 0.05));
    
    const m_estado = multiplicadores_estado[datosRepuesto.estado_fisico] || 1.0;
    const m_cat = multiplicadores_cat[datosRepuesto.categoria] || 1.0;
    
    const resultado = puntos_base * m_estado * m_cat * depreciacion;
    setPuntosSimulados(resultado.toFixed(2));
  }, [datosRepuesto]);

  const rankingActual = RANKING_LABELS[datosHistorial.ranking] || { name: "Indefinido", color: "bg-gray-100" };

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-8 font-sans">
      
      {/* CABECERA DE PERFIL VECINAL (HU8 - Gamificación y Reconocimiento) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Perfil del Vecino</span>
          <h1 className="text-2xl font-black text-gray-800">{datosHistorial.vecino}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-gray-500">Nivel del Reconocimiento:</span>
            {/* CORRECCIÓN AQUÍ: className estructurado correctamente con llaves y backticks */}
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${rankingActual.color}`}>
              {rankingActual.name}
            </span>
          </div>
        </div>
        
        {/* INDICADORES FINANCIEROS (CONECTADO AL MODELO VECINO / HISTORIAL) */}
        <div className="grid grid-cols-3 gap-6 bg-gray-50 p-4 rounded-lg border border-gray-100 w-full md:w-auto">
          <div className="text-center px-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase block">Saldo Actual</span>
            <span className="text-xl font-extrabold text-blue-600">{datosHistorial.saldo_actual} <span className="text-xs font-normal text-gray-500">pts</span></span>
          </div>
          <div className="text-center px-2 border-x border-gray-200">
            <span className="text-[10px] font-bold text-gray-400 uppercase block">Intercambios</span>
            <span className="text-xl font-extrabold text-gray-700">{datosHistorial.total_intercambios}</span>
          </div>
          <div className="text-center px-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase block">Acumulado</span>
            <span className="text-xl font-extrabold text-emerald-600">+{datosHistorial.puntos_acumulados_historicos} <span className="text-xs font-normal text-gray-500">pts</span></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LISTADO DE TRANSACCIONES (HU8 - Inalterable por Diseño) */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Historial de Transacciones</h2>
              <p className="text-xs text-gray-400">Listado inmutable indexado bajo protección de datos.</p>
            </div>
            <span className="bg-lock-red text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded uppercase tracking-wider">
              🔒 Inalterable
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Repuesto</th>
                  <th className="p-3">Asociado</th>
                  <th className="p-3">Operación</th>
                  <th className="p-3 text-right">Puntos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {datosHistorial.transacciones_recientes.map((tx) => (
                  <tr key={tx.id_transaccion} className="hover:bg-gray-50/70 transition-colors">
                    <td className="p-3 text-gray-400 whitespace-nowrap">{tx.fecha}</td>
                    <td className="p-3 font-semibold text-gray-700">{tx.repuesto}</td>
                    <td className="p-3 text-gray-600">{tx.contraparte}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tx.tipo === 'Recibido' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-orange-50 text-orange-700 border border-orange-100'
                      }`}>
                        {tx.tipo === 'Recibido' ? 'Ofertante' : 'Demandante'}
                      </span>
                    </td>
                    {/* CORRECCIÓN AQUÍ: Se corrigió la interpolación de texto con el símbolo positivo/negativo */}
                    <td className={`p-3 text-right font-black text-sm ${
                      tx.tipo === 'Recibido' ? 'text-emerald-600' : 'text-orange-600'
                    }`}>
                      {tx.tipo === 'Recibido' ? `+${tx.puntos}` : `-${tx.puntos}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CALCULADORA DE TASACIÓN AUTOMÁTICA EN TIEMPO REAL (HU12) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">Algoritmo de Tasación</h2>
            <p className="text-xs text-gray-400 mb-4">Simula la asignación automática basada en criterios objetivos de la comunidad.</p>
            
            <div className="space-y-4">
              {/* Categorías */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">Categoría del Repuesto</label>
                <select 
                  value={datosRepuesto.categoria} 
                  onChange={(e) => setDatosRepuesto({...datosRepuesto, categoria: e.target.value})}
                  className="mt-1 block w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-xs focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Motor">Motor (x1.3)</option>
                  <option value="Transmisión">Transmisión (x1.2)</option>
                  <option value="Frenos">Frenos (x1.1)</option>
                  <option value="Carrocería">Carrocería (x1.0)</option>
                </select>
              </div>

              {/* Estado Físico */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">Estado Físico</label>
                <select 
                  value={datosRepuesto.estado_fisico} 
                  onChange={(e) => setDatosRepuesto({...datosRepuesto, estado_fisico: e.target.value})}
                  className="mt-1 block w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-xs focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Nuevo">Nuevo (x1.5)</option>
                  <option value="Usado - Como nuevo">Usado - Como nuevo (x1.2)</option>
                  <option value="Usado - Funcional">Usado - Funcional (x1.0)</option>
                  <option value="Para repuesto">Para repuesto (x0.5)</option>
                </select>
              </div>

              {/* Año de Fabricación */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">Año del Vehículo Origen</label>
                <input 
                  type="number" 
                  min="2000" 
                  max="2026"
                  value={datosRepuesto.anio_vehiculo} 
                  onChange={(e) => setDatosRepuesto({...datosRepuesto, anio_vehiculo: e.target.value})}
                  className="mt-1 block w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-xs focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">Afecta con depreciación acumulada del 5% anual (año base 2026).</span>
              </div>
            </div>
          </div>

          {/* Bloque de Visualización de Puntos Calculados */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block mb-1">Valor Calculado por Tasación</span>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl font-black text-blue-900">{puntosSimulados}</span>
              <span className="text-xs font-bold text-blue-800">Puntos</span>
            </div>
            <p className="text-[10px] text-blue-500 mt-2">Valor regulado ineditable para evitar sobreprecio e inflación comunitaria.</p>
          </div>
        </div>

      </div>
    </div>
  );
}