import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ModuloReputacionYCalificacion() {
  // --- ESTADOS DE CARGA Y PARAMETRIZACIÓN ---
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // --- ESTADOS DE LA HU 11 (Datos Reales de Reputación e Historial) ---
  const [datosUsuario, setDatosUsuario] = useState(null);
  const [comentariosComunidad, setComentariosComunidad] = useState([]);

  // --- ESTADOS DE LA HU 10 (Formulario de Calificación) ---
  const [transaccionesPendientes, setTransaccionesPendientes] = useState([]);
  const [txSeleccionada, setTxSeleccionada] = useState('');
  const [estrellasSeleccionadas, setEstrellasSeleccionadas] = useState(0);
  const [comentarioTexto, setComentarioTexto] = useState('');
  const [hoverEstrellas, setHoverEstrellas] = useState(0);

  // Mapeo de niveles basados en el saldo
  const nivelesRanking = {
    1: 'Novato',
    2: 'Aprendiz',
    3: 'Colaborador',
    4: 'Experto',
    5: 'Leyenda'
  };

  // --- CARGA DE DATOS DESDE EL BACKEND ---
  useEffect(() => {
    const cargarModulo = async () => {
      try {
        const sessionid = localStorage.getItem('sessionid');
        const headers = { 'X-Session-ID': sessionid || '' };

        const resHistorial = await axios.get('/api/historial/', { headers, withCredentials: true });
        setDatosUsuario(resHistorial.data);

        const resPendientes = await axios.get('/api/transacciones-para-calificar/', { headers, withCredentials: true });
        setTransaccionesPendientes(resPendientes.data);

        // Nota opcional: Si quieres cargar las reseñas de la comunidad recibidas por el usuario logueado, 
        // necesitarías enviar su ID a /api/reputacion/<user_id>/. Por ahora simularemos con las de la comunidad.
        // Aquí dejamos lista la estructura de las transacciones recientes para la auditoría.

      } catch (err) {
        console.error('Error al cargar datos de reputación:', err);
        setError(err.response?.status === 401 ? 'Debes iniciar sesión primero' : 'Error al sincronizar datos');
      } finally {
        setCargando(false);
      }
    };

    cargarModulo();
  }, []);

  // --- LOGICA DE ENVÍO DE CALIFICACIÓN (HU10 conectada al backend) ---
  const handleEnviarCalificacion = async (e) => {
    e.preventDefault();

    if (!txSeleccionada) {
      alert("Por favor, selecciona una transacción para calificar.");
      return;
    }
    if (estrellasSeleccionadas === 0) {
      alert("Por favor, selecciona una puntuación en estrellas.");
      return;
    }

    // Buscar la transacción elegida para identificar al calificado
    const tx = transaccionesPendientes.find(t => t.id_transaccion === txSeleccionada);

    const calificadoId = tx.ofertante_id; // Ajustar dinámicamente según lógica de tu vista

    try {
      const sessionid = localStorage.getItem('sessionid');
      const payload = {
        transaccion_id: tx.id_transaccion,
        calificado_id: calificadoId,
        puntuacion: estrellasSeleccionadas,
        comentario: comentarioTexto || "Sin comentarios adicionales."
      };

      await axios.post('/api/calificar/', payload, {
        headers: { 'X-Session-ID': sessionid || '' },
        withCredentials: true
      });

      alert("Calificación registrada con éxito en el sistema.");
      
      // Limpiar formulario y remover la transacción ya calificada de la lista
      setTransaccionesPendientes(prev => prev.filter(t => t.id_transaccion !== txSeleccionada));
      setTxSeleccionada('');
      setEstrellasSeleccionadas(0);
      setComentarioTexto('');

      // Recargar datos del usuario para reflejar el impacto algorítmico inmediato
      const resHistorial = await axios.get('/api/historial/', {
        headers: { 'X-Session-ID': sessionid || '' },
        withCredentials: true
      });
      setDatosUsuario(resHistorial.data);

    } catch (err) {
      alert(err.response?.data?.error || "Error al procesar la calificación");
    }
  };

  if (cargando) return <div style={{ padding: '2rem', textAlign: 'center' }}>Sincronizando reputación con la red vecinal...</div>;
  if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: '#DC2626' }}>{error}</div>;

  // --- DISEÑO VISUAL ---
  const gridLayout = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '1.5rem',
    fontFamily: "'Inter', sans-serif",
    backgroundColor: '#F8F9FA',
    padding: '1.5rem',
    borderRadius: '8px'
  };

  const cardStyle = {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  };

  return (
    <div style={gridLayout}>
      
      {/* ================= SECCIÓN DE LA HU 11: SISTEMA DE REPUTACIÓN REAL ================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Widget de Métricas de Reputación */}
        <div style={cardStyle}>
          <h2 style={{ color: '#1E3A8A', fontSize: '18px', margin: '0 0 1.25rem 0', fontWeight: '600' }}>
            Tu Reputación Inmutable
          </h2>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>SALDO ACTUAL</p>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#0D9488' }}>
                {datosUsuario.saldo_actual} <span style={{ fontSize: '14px', fontWeight: 'normal' }}>Pts</span>
              </p>
            </div>
            
            {/* ================= NUEVO: CALIFICACIÓN EN ESTRELLAS DEL USUARIO ================= */}
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>TU CALIFICACIÓN</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                {[1, 2, 3, 4, 5].map((estrella) => {
                  // Si el backend no envía 'calificacion_promedio', por defecto usamos 5.0
                  const promedio = datosUsuario.calificacion_promedio || 5.0; 
                  return (
                    <span 
                      key={estrella} 
                      style={{ 
                        fontSize: '18px', 
                        color: estrella <= Math.round(promedio) ? '#F59E0B' : '#D1D5DB' 
                      }}
                    >
                      ★
                    </span>
                  );
                })}
              </div>
              <span style={{ fontSize: '11px', color: '#4B5563', fontWeight: '600' }}>
                {datosUsuario.calificacion_promedio?.toFixed(1) || "5.0"} / 5.0
              </span>
            </div>
            {/* ============================================================================== */}

            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>NIVEL DE RANGO</p>
              <span style={{
                display: 'inline-block',
                backgroundColor: '#E0F2FE',
                color: '#0369A1',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold',
                marginTop: '0.25rem'
              }}>
                {nivelesRanking[datosUsuario.ranking] || 'Novato'}
              </span>
            </div>
          </div>

          {/* Barra de Confiabilidad basada en las estrellas */}
          <div style={{ marginTop: '1rem', borderTop: '1px solid #F3F4F6', paddingTop: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#4B5563', marginBottom: '0.25rem' }}>
              <span>Confiabilidad Comunitaria</span>
              <strong>{((datosUsuario.calificacion_promedio || 5.0) * 20)}%</strong>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${(datosUsuario.calificacion_promedio || 5.0) * 20}%`, 
                height: '100%', 
                backgroundColor: (datosUsuario.calificacion_promedio || 5.0) >= 4 ? '#10B981' : '#F59E0B',
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>

          <p style={{ fontSize: '12px', color: '#4B5563', margin: '1rem 0 0 0' }}>
            <strong>Intercambios totales realizados:</strong> {datosUsuario.total_intercambios} veces.
          </p>
        </div>

        {/* Panel de Auditoría de Puntos (Conectado a la Base de Datos) */}
        <div style={cardStyle}>
          <h3 style={{ color: '#1E3A8A', fontSize: '14px', margin: '0 0 0.75rem 0', fontWeight: '600' }}>
            Historial de Auditoría Real (Últimos 10)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
            {datosUsuario.transacciones_recientes?.map((tx, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid #F3F4F6', fontSize: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: '#374151', fontWeight: '500' }}>{tx.repuesto}</span>
                  <span style={{ fontSize: '10px', color: '#9CA3AF' }}>Con: {tx.contraparte} ({tx.fecha})</span>
                </div>
                <strong style={{ color: tx.tipo === 'Recibido' ? '#0D9488' : '#EA580C', alignSelf: 'center' }}>
                  {tx.tipo === 'Recibido' ? `+${tx.puntos}` : `-${tx.puntos}`} pts
                </strong>
              </div>
            ))}
            {datosUsuario.transacciones_recientes?.length === 0 && (
              <p style={{ fontSize: '12px', color: '#9CA3AF', textAlign: 'center' }}>No posees registros auditados.</p>
            )}
          </div>
        </div>
      </div>

      {/* ================= SECCIÓN DE LA HU 10: CALIFICACIÓN DINÁMICA ================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Formulario de Calificación Activo */}
        <div style={cardStyle}>
          <h2 style={{ color: '#1E3A8A', fontSize: '18px', margin: '0 0 1rem 0', fontWeight: '600' }}>
            Calificar Vecino de Intercambio
          </h2>
          
          <form onSubmit={handleEnviarCalificacion}>
            {/* Selector de Transacción Pendiente */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#374151', marginBottom: '0.25rem' }}>
                Selecciona el intercambio a evaluar:
              </label>
              <select
                value={txSeleccionada}
                onChange={(e) => setTxSeleccionada(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #E5E7EB',
                  fontSize: '13px'
                }}
              >
                <option value="">-- Selecciona un intercambio pendiente --</option>
                {transaccionesPendientes.map((tx) => (
                  <option key={tx.id_transaccion} value={tx.id_transaccion}>
                    {tx.repuesto} ({tx.fecha})
                  </option>
                ))}
              </select>
            </div>

            {/* Control de Estrellas Interactivo */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#374151', marginBottom: '0.25rem' }}>
                ¿Cómo califica la experiencia y el componente?
              </label>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {[1, 2, 3, 4, 5].map((estrella) => (
                  <button
                    key={estrella}
                    type="button"
                    onClick={() => setEstrellasSeleccionadas(estrella)}
                    onMouseEnter={() => setHoverEstrellas(estrella)}
                    onMouseLeave={() => setHoverEstrellas(0)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '24px',
                      padding: 0,
                      color: estrella <= (hoverEstrellas || estrellasSeleccionadas) ? '#F59E0B' : '#D1D5DB',
                      transition: 'color 0.1s ease'
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Input de Comentarios */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#374151', marginBottom: '0.25rem' }}>
                Comentarios adicionales
              </label>
              <textarea
                value={comentarioTexto}
                onChange={(e) => setComentarioTexto(e.target.value)}
                placeholder="Indica si la pieza cumplía con lo acordado y la puntualidad."
                style={{
                  width: '100%',
                  height: '65px',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #E5E7EB',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={transaccionesPendientes.length === 0}
              style={{
                backgroundColor: transaccionesPendientes.length === 0 ? '#9CA3AF' : '#0D9488',
                color: '#FFFFFF',
                width: '100%',
                padding: '0.6rem',
                borderRadius: '4px',
                border: 'none',
                fontWeight: '600',
                fontSize: '13px',
                cursor: transaccionesPendientes.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {transaccionesPendientes.length === 0 ? "No hay intercambios por calificar" : "Registrar Calificación"}
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}