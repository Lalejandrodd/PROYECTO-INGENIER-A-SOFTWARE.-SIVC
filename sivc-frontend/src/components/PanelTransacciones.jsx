import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RANKING_LABELS = {
  1: { name: "Novato", color: "bg-gray-100 text-gray-800 border-gray-300" },
  2: { name: "Aprendiz", color: "bg-blue-100 text-blue-800 border-blue-300" },
  3: { name: "Colaborador", color: "bg-purple-100 text-purple-800 border-purple-300" },
  4: { name: "Experto", color: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  5: { name: "Leyenda", color: "bg-amber-100 text-amber-800 border-amber-300" }
};

export default function PanelTransacciones() {
  const [historial, setHistorial] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const sessionid = localStorage.getItem('sessionid');
        const headers = { 'X-Session-ID': sessionid || '' };
        
        const [historialRes, rankingRes] = await Promise.all([
          axios.get('/api/historial/', { headers, withCredentials: true }),
          axios.get('/api/ranking/', { withCredentials: true })
        ]);
        
        setHistorial(historialRes.data);
        setRanking(rankingRes.data.ranking || []);
      } catch (err) {
        console.error('Error:', err);
        if (err.response?.status === 401) {
          setError('Debes iniciar sesión primero');
        } else {
          setError('Error al cargar los datos');
        }
      } finally {
        setCargando(false);
      }
    };
    cargarDatos();
  }, []);

  if (cargando) return <div className="p-6 text-center">Cargando...</div>;
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>;
  if (!historial) return <div className="p-6 text-center">No hay datos disponibles</div>;

  const rankingActual = RANKING_LABELS[historial.ranking] || RANKING_LABELS[1];

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-8 font-sans">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Perfil del Vecino</span>
          <h1 className="text-2xl font-black text-gray-800">{historial.vecino}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-gray-500">Nivel del Reconocimiento:</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${rankingActual.color}`}>
              {rankingActual.name}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-6 bg-gray-50 p-4 rounded-lg border border-gray-100 w-full md:w-auto">
          <div className="text-center px-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase block">Saldo Actual</span>
            <span className="text-xl font-extrabold text-blue-600">{historial.saldo_actual} pts</span>
          </div>
          <div className="text-center px-2 border-x border-gray-200">
            <span className="text-[10px] font-bold text-gray-400 uppercase block">Intercambios</span>
            <span className="text-xl font-extrabold text-gray-700">{historial.total_intercambios}</span>
          </div>
          <div className="text-center px-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase block">Acumulado</span>
            <span className="text-xl font-extrabold text-emerald-600">+{historial.puntos_acumulados_historicos} pts</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Historial de Transacciones</h2>
              <p className="text-xs text-gray-400">Listado inmutable indexado bajo protección de datos.</p>
            </div>
            <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded uppercase">🔒 Inalterable</span>
          </div>

          {historial.transacciones_recientes?.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No hay transacciones aún</p>
          ) : (
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
                  {historial.transacciones_recientes.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-3 text-gray-400 whitespace-nowrap">{tx.fecha}</td>
                      <td className="p-3 font-semibold text-gray-700">{tx.repuesto}</td>
                      <td className="p-3 text-gray-600">{tx.contraparte}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tx.tipo === 'Recibido' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                          {tx.tipo === 'Recibido' ? 'Ofertante' : 'Demandante'}
                        </span>
                      </td>
                      <td className={`p-3 text-right font-black text-sm ${tx.tipo === 'Recibido' ? 'text-emerald-600' : 'text-orange-600'}`}>
                        {tx.tipo === 'Recibido' ? `+${tx.puntos}` : `-${tx.puntos}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Ranking Comunitario</h2>
          <div className="space-y-2">
            {ranking.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No hay usuarios registrados</p>
            ) : (
              ranking.map((user, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-500 w-6">#{user.posicion}</span>
                    <span className="text-sm font-medium text-gray-800">{user.nombre}</span>
                  </div>
                  <span className="text-sm font-bold text-blue-600">{user.puntos} pts</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}