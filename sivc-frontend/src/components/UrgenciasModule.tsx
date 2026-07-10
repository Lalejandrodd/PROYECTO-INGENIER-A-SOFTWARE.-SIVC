import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Pusher from 'pusher-js';
// Importamos los iconos exactos que requiere el diseño de Figma
import { Plus, AlertTriangle, Clock, Car, MapPin, Package } from 'lucide-react';


// Declaramos la interfaz para que TypeScript conozca la estructura de la Urgencia
interface Urgencia {
  id_urgencia: number;
  nombre_pieza_requerida: string;
  descripcion_contexto: string;
  vehiculo_str: string;
  puntos_recompensa_extra: number;
  vecino_username: string;
  direccion?: string; // Por si tus compañeros manejan dirección
  resaltar_urgencia: boolean;
  estado_tramite: 'libre' | 'revision' | 'completada';
  id_vecino_creador: number;
}

interface UrgenciasModuleProps {
  miUsuarioId: number | undefined;
}


export function UrgenciasModule({ miUsuarioId }: UrgenciasModuleProps) {
  const [showModal, setShowModal] = useState(false);
  const [urgencias, setUrgencias] = useState<Urgencia[]>([]);
  
  // Estado para los temporizadores individuales de cada tarjeta (Figma)
  const [timers, setTimers] = useState<Record<number, number>>({});

  // Estados para controlar los campos del formulario de creación
  const [pieza, setPieza] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [puntos, setPuntos] = useState(0);
  const [vehiculoId, setVehiculoId] = useState('');

  // 1. EFECTO: Cuenta regresiva segundo a segundo (Extraído de Figma) [cite: 3]
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => { 
          if (next[Number(id)] > 0) next[Number(id)]--; 
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. EFECTO: Conectar con Django y Pusher en Tiempo Real
  useEffect(() => {
    obtenerUrgencias();

    // Coloca aquí tu KEY pública y CLUSTER de Pusher
    const pusher = new Pusher('a1b4e5e51a38a125b9e9', {
      cluster: 'us2',
    });

    const channel = pusher.subscribe('tablon-urgencias');
    
    // Escuchar cuando el backend anuncia una nueva urgencia o un cambio de estado
    channel.bind('nueva-urgencia', (data: any) => {
      console.log("📡 ¡Pusher acaba de recibir un cambio en el tablón! Datos:", data);
      
      // 🚨 CASO 1: Si la urgencia fue COMPLETADA, la eliminamos del tablón en tiempo real
      if (data.estado_tramite === 'completada') {
        console.log(`🧹 Eliminando la urgencia ${data.id_urgencia} porque ya fue resuelta.`);
        
        // Filtramos el arreglo para sacar la urgencia completada del mapa visual
        setUrgencias(prev => prev.filter(u => u.id_urgencia !== data.id_urgencia));
        
        // Sincronizamos con el servidor por si acaso
        return; // Cortamos la ejecución aquí
      }

      // CASO 2: Si es una urgencia nueva o libre (Lógica normal que ya tenías)
      const nombreVecino = data.vecino_username || data.vecino || "Comunitario";
      const piezaVehiculo = data.nombre_pieza_requerida || data.pieza || "un repuesto";

      alert(`🚨 ¡Nueva Urgencia Comunitaria! El vecino @${nombreVecino} ha solicitado ayuda`);
      
      const nuevaUrgencia: Urgencia = {
        id_urgencia: data.id_urgencia,
        nombre_pieza_requerida: piezaVehiculo,
        descripcion_contexto: data.descripcion_contexto || '¡Publicado ahora mismo en la comunidad!',
        vehiculo_str: data.vehiculo_str || data.vehiculo,
        puntos_recompensa_extra: data.puntos_recompensa_extra || data.recompensa,
        vecino_username: nombreVecino,
        resaltar_urgencia: true,
        estado_tramite: data.estado_tramite || 'libre',
        id_vecino_creador: data.id_vecino_creador || data.vecino_id
      };

      setTimers(prev => ({ ...prev, [data.id_urgencia]: 120 * 60 }));
      setUrgencias(prev => [nuevaUrgencia, ...prev]);
      obtenerUrgencias();
    });

    
    let privateChannel: any = null;
    if (miUsuarioId) {
      console.log(`🔌 Suscribiéndose con éxito al canal privado del usuario: notificaciones-vecino-${miUsuarioId}`);
      privateChannel = pusher.subscribe(`notificaciones-vecino-${miUsuarioId}`); 
      
      privateChannel.bind('notificacion-ayuda', (data: any) => { 
        // 1. Lanzamos un alert simple primero para avisar, rompiendo cualquier supresión estricta
        alert(`🚨 ¡Un vecino se ha postulado para ayudarte con el repuesto!`);

        // 2. Ejecutamos la confirmación nativa asegurando la interacción activa
        const aceptar = window.confirm(
          `🚨 ¡Detalles de la Postulación!\n\n` +
          `${data.message}\n` +
          `Postulado por: @${data.nombre_colaborador}\n\n` +
          `¿Deseas aceptar el repuesto y transferir los puntos ahora mismo?`
        ); 
        
        // 🎯 CORRECCIÓN: Si el usuario cancela (o el navegador suprime), simplemente NO HACEMOS NADA.
        // Solo enviamos el rechazo si la ventana de verdad existió y el flujo es consciente.
        if (aceptar) { 
          resolverUrgencia(data.urgencia_id, 'aceptar'); 
        } else {
          obtenerUrgencias();
          console.log("Se canceló o suprimió la ventana de confirmación, mantendremos la postulación intacta.");
          // Removimos la ejecución obligatoria del resolverUrgencia con 'rechazar' para que no se borre sola.
        } 
      });
    }

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      if (privateChannel) {
        privateChannel.unbind_all();
        privateChannel.unsubscribe();
      }
    };

  }, [miUsuarioId]); 

  // Función para traer los datos desde Django
  const obtenerUrgencias = async () => {
    try {
      const sessionid = localStorage.getItem('sessionid');
      
      const response = await axios.get('http://127.0.0.1:8000/api/urgencias/', {
        headers: {
          'X-Session-ID': sessionid || ''
        }
      });

      if (response.data.status === 'success') {
        // 🚨 FILTRADO MAESTRO: Filtramos para ignorar cualquier urgencia completada que venga del servidor
        const urgenciasActivas = response.data.urgencias.filter(
          (u: Urgencia) => u.estado_tramite !== 'completada'
        );

        setUrgencias(urgenciasActivas); // Guardamos solo las activas
        
        const initTimers: Record<number, number> = {};
        urgenciasActivas.forEach((u: Urgencia) => {
          initTimers[u.id_urgencia] = 120 * 60; 
        });
        setTimers(initTimers);
      }
    } catch (error) {
      console.error("Error al cargar urgencias:", error);
    }
  };

  const handleCrearUrgencia = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sessionid = localStorage.getItem('sessionid');
      
      const response = await axios.post('http://127.0.0.1:8000/api/urgencias/', {
        pieza: pieza,                 
        descripcion: descripcion,      
        puntos: Number(puntos),         
        vehiculoId: Number(vehiculoId)  
      }, {
        headers: {
          'X-Session-ID': sessionid || ''
        }
      });

      if (response.data.status === 'success') {
        setPieza('');
        setDescripcion('');
        setPuntos(0);
        setVehiculoId('');
        setShowModal(false);
        obtenerUrgencias(); 
      }
    } catch (error: any) {
      alert(error.response?.data?.error || "Error al crear la urgencia");
    }
  };

  const resolverUrgencia = async (urgenciaId: number, accion: 'aceptar' | 'rechazar') => {
    try {
      const sessionid = localStorage.getItem('sessionid');
      
      const response = await axios.post(`http://127.0.0.1:8000/api/urgencias/${accion}-ayuda/${urgenciaId}/`, {}, {
        headers: {
          'X-Session-ID': sessionid || ''
        }
      });

      if (response.data.success) {
        alert(`Éxito: ${response.data.message}`);
        obtenerUrgencias();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || "Error al procesar la resolución");
    }
  };

 const handleOfrecerAyuda = async (urgenciaId: number) => {
  try {
    // 1. Intentamos leer 'sessionid' o 'access_token' del localStorage
    let token = localStorage.getItem('sessionid') || localStorage.getItem('access');

    if (!token) {
      alert("No se encontró ningún token de sesión. Por favor, inicia sesión de nuevo.");
      return;
    }

    // 🚨 LIMPIEZA ABSOLUTA EN EL FRONTEND:
    token = token.trim();
    // Remover comillas si se guardó con JSON.stringify por error
    token = token.replace(/^["']|["']$/g, ''); 
    // Remover el prefijo Bearer si ya viene incluido en la cadena
    if (token.startsWith('Bearer ')) {
      token = token.split(' ')[1];
    }

    console.log("🎫 Token real que se va a enviar a Django:", token);

    // 2. Ejecutamos el POST inyectando la configuración obligatoria
    const response = await axios.post(
      `http://127.0.0.1:8000/api/urgencias/postular-ayuda/${urgenciaId}/`,
      {}, // Cuerpo vacío
      {
        headers: { 
          // 🚨 Enviamos el token limpio
          'X-Session-ID': token 
        },
        withCredentials: true 
      }
    );

    if (response.data.success) {
      alert("🤝 ¡Postulación enviada a revisión con éxito!");
      obtenerUrgencias();
    }

  } catch (error: any) {
    const mensajeError = error.response?.data?.error || "Error al procesar la postulación";
    alert(mensajeError);
  }
};

  // Convierte los segundos en formato HH:MM:SS (Figma)
  const formatTimer = (totalSeconds: number) => {
    if (totalSeconds <= 0) return "Expirado";
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Elige el color de la tarjeta según el tiempo restante (Figma) [cite: 6]
  const urgencyColor = (totalSeconds: number) => {
    if (totalSeconds <= 1800) { // Menos de 30 minutos: Alerta crítica
      return {
        border: "border-red-500",
        bar: "bg-red-500",
        btn: "bg-red-600 hover:bg-red-700"
      };
    }

    // Tiempo normal (Menos de 2 horas) [cite: 6]
    return {
      border: "border-orange-500",
      bar: "bg-orange-500",
      btn: "bg-orange-600 hover:bg-orange-700"
    };
  };

  return (
    <div className="space-y-6 bg-background text-foreground p-6">
      {/* 1. Cabecera principal y botón de publicar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tablón de Urgencias Comunitarias</h1>
          <p className="text-muted-foreground text-sm mt-1">Solicitudes urgentes — expiran automáticamente en menos de 2 horas</p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="flex items-center gap-2 bg-red-600 text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Publicar Urgencia en el Tablón
        </button>
      </div>

      {/* 2. Barra de estado superior */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <p className="text-sm text-red-700 font-medium">
          <span className="font-bold">{urgencias.length} solicitudes active</span> en tu área. Las urgencias expiran en menos de 2 horas.
        </p>
      </div>

      {/* 3. El Tablón con las tarjetas reales mapeadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {urgencias.map((urgencia) => {
          const segundosRestantes = timers[urgencia.id_urgencia] || 0;
          const colors = urgencyColor(segundosRestantes);

          return (
            <div 
              key={urgencia.id_urgencia || (urgencia as any).id} 
              className={`bg-card rounded-2xl border-2 shadow-sm overflow-hidden transition-all ${colors.border}`}
              >
              <div className={`px-5 py-3 flex items-center justify-between ${colors.bar}`}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-white" />
                  <span className="text-white font-bold text-sm">URGENTE · Expira en menos de 2 horas</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1">
                  <Clock className="w-3.5 h-3.5 text-white" />
                  <span className="text-white font-mono font-bold text-sm">
                    {formatTimer(segundosRestantes)}
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-3">
                <div>
                  <h3 className="font-bold text-foreground text-lg">{urgencia.nombre_pieza_requerida}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    {urgencia.descripcion_contexto}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Car className="w-3.5 h-3.5" /> {urgencia.vehiculo_str}
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" /> {urgencia.direccion || "Zona de Emergencia"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Vecino</p>
                    <p className="text-sm font-semibold text-foreground">@{urgencia.vecino_username}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Ofrece</p>
                    <p className="text-lg font-bold text-primary">
                      {urgencia.puntos_recompensa_extra} <span className="text-xs font-normal text-muted-foreground">pts</span>
                    </p>
                  </div>
                </div>

<div className="bg-blue-900 text-white p-2 text-xs rounded mb-2">
  Mío: {miUsuarioId} (tipo: {typeof miUsuarioId}) | 
  Creador Card: {urgencia.id_vecino_creador} (tipo: {typeof urgencia.id_vecino_creador})
</div>

            {/* 1. ESTADO LIBRE */}
            {urgencia.estado_tramite === 'libre' && (
              // 🚨 Forzamos conversión a Number en la comparación:
              Number(miUsuarioId) !== Number(urgencia.id_vecino_creador) ? (
                <button 
                  onClick={() => handleOfrecerAyuda(urgencia.id_urgencia)}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white transition-colors ${colors.btn}`}
                >
                  <Package className="w-4 h-4" /> Ofrecer Repuesto Compatible
                </button>
              ) : (
                <p className="text-center text-xs text-muted-foreground bg-gray-100 py-2 rounded-xl font-medium">
                  Tu solicitud está publicada esperando colaboradores
                </p>
              )
            )}

          
            {/* 2. ESTADO REVISIÓN */}
            {urgencia.estado_tramite === 'revision' && (
              Number(miUsuarioId) === Number(urgencia.id_vecino_creador) ? (
                <div className="flex flex-col gap-2 w-full mt-2">
                  <p className="text-center text-xs font-medium text-amber-800 mb-1">¡Un vecino te ha ofrecido ayuda!</p>
                  <div className="flex gap-2">
                    {/* ✨ CORREGIDO: Se mantiene la sintaxis flecha correcta */}
                    <button 
                      onClick={() => resolverUrgencia(urgencia.id_urgencia, 'aceptar')}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl font-semibold text-xs"
                    >
                      Aceptar Ayuda
                    </button>
                    <button 
                      onClick={() => resolverUrgencia(urgencia.id_urgencia, 'rechazar')}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl font-semibold text-xs"
                    >
                      Rechazar Ayuda
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full text-center bg-amber-50 border border-amber-200 text-amber-800 py-2.5 rounded-xl font-semibold text-sm animate-pulse">
                  ⏳ En revisión por el creador...
                </div>
              )
            )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Botón flotante móvil */}
      <button 
        onClick={() => setShowModal(true)} 
        className="fixed bottom-6 right-6 md:hidden w-14 h-14 rounded-full bg-destructive text-white shadow-lg flex items-center justify-center hover:bg-orange-700 z-30"
      >
        <Plus className="w-6 h-6" />
      </button>

{/* 5. Formulario Modal Rediseñado (Estilo Unificado con la App) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl border border-gray-200 max-w-md w-full space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            
            {/* Cabecera del Formulario */}
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold">1</div>
                <h2 className="text-lg font-bold text-gray-800">Publicar Nueva Urgencia</h2>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="text-gray-400 hover:text-gray-600 text-lg font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* Formulario */}
            <form onSubmit={handleCrearUrgencia} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">
                  Nombre de la Pieza *
                </label>
                <input 
                  type="text" 
                  placeholder="Ej: Motor, Alternador, Batería" 
                  value={pieza} 
                  onChange={e => setPieza(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">
                  Descripción de la Emergencia *
                </label>
                <textarea 
                  placeholder="Especificaciones de la situación o contexto de la urgencia..." 
                  value={descripcion} 
                  onChange={e => setDescripcion(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-800 placeholder-gray-400 h-24 resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">
                    ID Vehículo *
                  </label>
                  <input 
                    type="number" 
                    placeholder="Ej: 1" 
                    value={vehiculoId} 
                    onChange={e => setVehiculoId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5 uppercase tracking-wide">
                    Puntos Extra *
                  </label>
                  <input 
                    type="number" 
                    placeholder="Ej: 50" 
                    value={puntos === 0 ? '' : puntos} 
                    onChange={e => setPuntos(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
                    required
                  />
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 p-2.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="w-2/3 bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm text-center"
                >
                  Publicar Urgencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

