import React, { useState } from 'react';

export default function ModuloReputacionYCalificacion() {
  // --- ESTADOS PARA LA HU 11 (Sistema de Reputación - Solo Lectura / Historial Inmutable) ---
  const [reputacion, setReputacion] = useState({
    puntosBalance: 450,
    calificacionPromedio: 4.8,
    totalReseñas: 14,
    nivelConfianza: "Excelente",
    // Historial inmutable de auditoría de transacciones de puntos
    historialPuntos: [
      { id: 101, operacion: "Intercambio Exitoso: Alternador", puntos: +120, fecha: "05/07/2026" },
      { id: 102, operacion: "Penalización: Cancelación tardía", puntos: -30, fecha: "29/06/2026" },
      { id: 103, operacion: "Intercambio Exitoso: Filtro Aceite", puntos: +50, fecha: "20/06/2026" }
    ]
  });

  // Lista de calificaciones recibidas por otros vecinos (HU11 - Visualización)
  const [comentariosComunidad, setComentariosComunidad] = useState([
    { id: 1, autor: "Carlos M.", estrellas: 5, comentario: "El repuesto estaba en óptimas condiciones mecánicas, tal como se describió.", fecha: "04/07/2026" },
    { id: 2, autor: "Elena R.", estrellas: 4, comentario: "Entrega puntual en el punto de encuentro de San José del Ávila.", fecha: "28/06/2026" }
  ]);

  // --- ESTADOS PARA LA HU 10 (Formulario de Calificación de Usuarios) ---
  const [estrellasSeleccionadas, setEstrellasSeleccionadas] = useState(0);
  const [comentarioTexto, setComentarioTexto] = useState('');
  const [hoverEstrellas, setHoverEstrellas] = useState(0);

  // --- LOGICA DE INTEGRACIÓN (HU10 impacta algorítmicamente a la HU11) ---
  const handleEnviarCalificacion = (e) => {
    e.preventDefault();
    
    if (estrellasSeleccionadas === 0) {
      alert("Por favor, selecciona una puntuación en estrellas para el vecino.");
      return;
    }

    // 1. Simular la adición del nuevo feedback en el feed
    const nuevoFeedback = {
      id: comentariosComunidad.length + 1,
      autor: "Vecino (Último Intercambio)",
      estrellas: estrellasSeleccionadas,
      comentario: comentarioTexto || "Sin comentarios adicionales.",
      fecha: "Hoy"
    };

    // 2. Actualizar el algoritmo de reputación de forma automática
    const nuevoTotalReseñas = reputacion.totalReseñas + 1;
    const nuevaNotaPromedio = parseFloat(
      ((reputacion.calificacionPromedio * reputacion.totalReseñas + estrellasSeleccionadas) / nuevoTotalReseñas).toFixed(1)
    );
    
    // Bonificación inmutable de puntos por completar la evaluación del flujo logístico
    const nuevosPuntosTransaccion = {
      id: Date.now(),
      operacion: "Feedback enviado: Recompensa participativa",
      puntos: +15,
      fecha: "Hoy"
    };

    setComentariosComunidad([nuevoFeedback, ...comentariosComunidad]);
    setReputacion(prev => ({
      ...prev,
      totalReseñas: nuevoTotalReseñas,
      calificacionPromedio: nuevaNotaPromedio,
      puntosBalance: prev.puntosBalance + 15,
      historialPuntos: [nuevosPuntosTransaccion, ...prev.historialPuntos],
      nivelConfianza: nuevaNotaPromedio >= 4.5 ? "Excelente" : nuevaNotaPromedio >= 3.5 ? "Regular" : "Bajo Reporte"
    }));

    // Limpiar formulario
    setEstrellasSeleccionadas(0);
    setComentarioTexto('');
    alert("Calificación procesada. El Sistema de Reputación ha recalculado los índices métricos del vecino.");
  };

  // --- DISEÑO VISUAL (Ajustado a la paleta SIVC: Navy, Teal, Gris #F8F9FA) ---
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
      
      {/* ================= SECCIÓN DE LA HU 11: SISTEMA DE REPUTACIÓN ================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Widget de Métricas de Reputación */}
        <div style={cardStyle}>
          <h2 style={{ color: '#1E3A8A', fontSize: '18px', margin: '0 0 1.25rem 0', fontWeight: '600' }}>
            Sistema de Reputación Inmutable
          </h2>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>BALANCE DE PUNTOS</p>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#0D9488' }}>
                {reputacion.puntosBalance} <span style={{ fontSize: '14px', fontWeight: 'normal' }}>Pts</span>
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>CONFIABILIDAD VECINAL</p>
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
                {reputacion.nivelConfianza} ({reputacion.calificacionPromedio} / 5)
              </span>
            </div>
          </div>

          <p style={{ fontSize: '12px', color: '#4B5563', margin: '0 0 0.5rem 0' }}>
            <strong>Transacciones Evaluadas:</strong> {reputacion.totalReseñas} intercambios exitosos.
          </p>
        </div>

        {/* Panel de Auditoría de Puntos (Solo Lectura) */}
        <div style={cardStyle}>
          <h3 style={{ color: '#1E3A8A', fontSize: '14px', margin: '0 0 0.75rem 0', fontWeight: '600' }}>
            Auditoría del Historial de Puntos
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
            {reputacion.historialPuntos.map((log) => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid #F3F4F6', fontSize: '12px' }}>
                <span style={{ color: '#374151' }}>{log.operacion}</span>
                <strong style={{ color: log.puntos > 0 ? '#0D9488' : '#EA580C' }}>
                    {log.puntos > 0 ? `+${log.puntos}` : log.puntos} pts
                </strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================= SECCIÓN DE LA HU 10: CALIFICACIÓN DE USUARIOS ================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Formulario de Calificación Activo */}
        <div style={cardStyle}>
          <h2 style={{ color: '#1E3A8A', fontSize: '18px', margin: '0 0 1rem 0', fontWeight: '600' }}>
            Calificar Vecino 
          </h2>
          
          <form onSubmit={handleEnviarCalificacion}>
            {/* Control de Estrellas Interactivo */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#374151', marginBottom: '0.25rem' }}>
                ¿Cómo califica el estado del componente y la logística?
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
                Comentarios sobre el intercambio
              </label>
              <textarea
                value={comentarioTexto}
                onChange={(e) => setComentarioTexto(e.target.value)}
                placeholder="Ej. Puntual en la entrega cerca de San José del Ávila y la pieza cumplía con la compatibilidad técnica."
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
              style={{
                backgroundColor: '#0D9488',
                color: '#FFFFFF',
                width: '100%',
                padding: '0.6rem',
                borderRadius: '4px',
                border: 'none',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Registrar Calificación
            </button>
          </form>
        </div>

        {/* Feed de Reseñas / Feedback Histórico Recibido */}
        <div style={cardStyle}>
          <h3 style={{ color: '#1E3A8A', fontSize: '14px', margin: '0 0 0.75rem 0', fontWeight: '600' }}>
            Feedback Reciente de la Comunidad
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '180px', overflowY: 'auto' }}>
            {comentariosComunidad.map((item) => (
              <div key={item.id} style={{ padding: '0.6rem', border: '1px solid #F3F4F6', borderRadius: '6px', backgroundColor: '#F9FAFB' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 'bold', color: '#4B5563' }}>{item.autor}</span>
                  <span style={{ color: '#F59E0B', letterSpacing: '1px' }}>{"★".repeat(item.estrellas)}</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#374151', lineHeight: '1.4' }}>{item.comentario}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}