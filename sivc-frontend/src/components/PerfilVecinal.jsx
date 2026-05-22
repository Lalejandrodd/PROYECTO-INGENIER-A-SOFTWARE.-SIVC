import React from 'react';

// Interfaz de la HU 8

export default function PerfilVecinal() {
  // Datos estructurales estáticos para cumplir con la restricción de datos inalterables
  const perfil = {
    nombre: "Caroline Corniells",
    puntosActuales: 450,
    posicionRanking: 12,
    totalVecinos: 140,
    historicoIntercambios: [
      { id: "TX-9021", pieza: "Kit de Pastillas de Freno", fecha: "10/05/2026", puntos: -120, tipo: "Demanda" },
      { id: "TX-8841", pieza: "Radiador usado de aluminio", fecha: "28/04/2026", puntos: 300, tipo: "Oferta" },
      { id: "TX-8110", pieza: "Sensor de Oxígeno Ox-22", fecha: "15/03/2026", puntos: 80, tipo: "Oferta" }
    ]
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Tarjeta de Métricas de Gamificación */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Usuario Comunitario</p>
          <h3 className="text-xl font-bold">{perfil.nombre}</h3>
        </div>
        <div className="border-t border-slate-700 pt-3 flex justify-between items-center">
          <div>
            <span className="text-xs text-slate-400 block">Saldo Disponible</span>
            <span className="text-3xl font-black text-amber-400">{perfil.puntosActuales} <span className="text-sm font-normal text-white">pts</span></span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Ranking Local</span>
            <span className="text-xl font-bold text-emerald-400">#{perfil.posicionRanking} <span className="text-xs font-normal text-slate-400">de {perfil.totalVecinos}</span></span>
          </div>
        </div>
      </div>

      {/* Tabla del Historial Inalterable (Diseño no editable) */}
      <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-gray-800 text-base">Historial de Transacciones Inalterable</h3>
          <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded uppercase tracking-wider">Lectura Protegida</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">Registro criptográfico y transparente de transacciones dentro del sistema.</p>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                <th className="p-2">ID Operación</th>
                <th className="p-2">Repuesto / Componente</th>
                <th className="p-2">Fecha</th>
                <th className="p-2 text-right">Variación de Puntos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {perfil.historicoIntercambios.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50/50">
                  <td className="p-2 font-mono text-gray-400">{tx.id}</td>
                  <td className="p-2 font-medium text-gray-700">{tx.pieza}</td>
                  <td className="p-2 text-gray-500">{tx.fecha}</td>
                  <td className={`p-2 text-right font-bold ${tx.puntos > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.puntos > 0 ? `+${tx.puntos}` : tx.puntos} pts
                  </td>
                </tr>
              ))}
            </tbody >
          </table>
        </div>
      </div>
    </div>
  );
}