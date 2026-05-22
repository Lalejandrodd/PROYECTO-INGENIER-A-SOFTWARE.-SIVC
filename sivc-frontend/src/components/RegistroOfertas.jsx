import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function RegistroOfertas() {
  // Estado para el formulario de repuesto (izquierda)
  const [repuestoForm, setRepuestoForm] = useState({
    nombre_pieza: '',
    descripcion_tecnica: '',
    estado_fisico: '',
    marca: '',
    modelo: '',
    anio: ''
  });
  const [vehiculos, setVehiculos] = useState([]);
  const [repuestoCreado, setRepuestoCreado] = useState(null);
  const [creandoRepuesto, setCreandoRepuesto] = useState(false);
  const [errorRepuesto, setErrorRepuesto] = useState('');
  const [successRepuesto, setSuccessRepuesto] = useState('');

  // Estado para el formulario de oferta (derecha)
  const [ofertaForm, setOfertaForm] = useState({
    repuesto_id: '',
    rango_horario: '',
    referencia_ubicacion: ''
  });
  const [imagenes, setImagenes] = useState([]);
  const [errorOferta, setErrorOferta] = useState('');
  const [successOferta, setSuccessOferta] = useState(false);
  const [cargandoOferta, setCargandoOferta] = useState(false);
  const [valorCalculado, setValorCalculado] = useState(null);

  // Cargar vehículos disponibles para compatibilidad
  useEffect(() => {
    const cargarVehiculos = async () => {
      try {
        const response = await axios.get('/api/vehiculos/', {
          withCredentials: true
        });
        setVehiculos(response.data);
      } catch (err) {
        console.error('Error cargando vehículos:', err);
      }
    };
    cargarVehiculos();
  }, []);

  // Estados físicos disponibles
  const estadosFisicos = [
    'Nuevo',
    'Usado - Como nuevo',
    'Usado - Funcional',
    'Para repuesto'
  ];

  // Manejar cambios en formulario de repuesto
  const handleRepuestoChange = (e) => {
    setRepuestoForm({
      ...repuestoForm,
      [e.target.name]: e.target.value
    });
    setErrorRepuesto('');
  };

  // Crear nuevo repuesto
  const handleCrearRepuesto = async (e) => {
    e.preventDefault();
    setCreandoRepuesto(true);
    setErrorRepuesto('');
    setSuccessRepuesto('');

    try {
      const sessionid = localStorage.getItem('sessionid');
      
      const response = await axios.post('/api/repuestos/crear/', {
        nombre_pieza: repuestoForm.nombre_pieza,
        descripcion_tecnica: repuestoForm.descripcion_tecnica,
        estado_fisico: repuestoForm.estado_fisico,
        marca: repuestoForm.marca,
        modelo: repuestoForm.modelo,
        anio: repuestoForm.anio
      }, {
        headers: {
          'X-Session-ID': sessionid || ''
        },
        withCredentials: true
      });

      if (response.data.success) {
        setSuccessRepuesto('✓ Repuesto creado exitosamente');
        setRepuestoCreado(response.data.repuesto);
        setOfertaForm({
          ...ofertaForm,
          repuesto_id: response.data.repuesto.id_repuesto
        });
        // Limpiar formulario de repuesto
        setRepuestoForm({
          nombre_pieza: '',
          descripcion_tecnica: '',
          estado_fisico: '',
          marca: '',
          modelo: '',
          anio: ''
        });
        setTimeout(() => setSuccessRepuesto(''), 3000);
      } else {
        setErrorRepuesto(response.data.error || 'Error al crear repuesto');
      }
    } catch (err) {
      console.error('Error:', err);
      setErrorRepuesto(err.response?.data?.error || 'Error de conexión');
    } finally {
      setCreandoRepuesto(false);
    }
  };

  // Manejar cambios en formulario de oferta
  const handleOfertaChange = (e) => {
    setOfertaForm({
      ...ofertaForm,
      [e.target.name]: e.target.value
    });
    setErrorOferta('');
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length < 3 || files.length > 5) {
      setErrorOferta('Debes subir entre 3 y 5 fotografías.');
      return;
    }
    setImagenes(files);
    setErrorOferta('');
  };

  // Publicar oferta
  const handlePublicarOferta = async (e) => {
  e.preventDefault();
  
  if (imagenes.length < 3 || imagenes.length > 5) {
    setErrorOferta('Debes subir entre 3 y 5 fotografías.');
    return;
  }
  
  if (!repuestoCreado || !ofertaForm.rango_horario || !ofertaForm.referencia_ubicacion) {
    setErrorOferta('Todos los campos son obligatorios.');
    return;
  }
  
  setCargandoOferta(true);
  setErrorOferta('');

  try {
    const sessionid = localStorage.getItem('sessionid');
    
    const formPayload = new FormData();
    // ¡IMPORTANTE! Usar el ID del repuesto que acabas de crear
    formPayload.append('repuesto_id', repuestoCreado.id_repuesto);
    formPayload.append('rango_horario', ofertaForm.rango_horario);
    formPayload.append('referencia_ubicacion', ofertaForm.referencia_ubicacion);
    
    imagenes.forEach((imagen) => {
      formPayload.append('imagenes', imagen);
    });

    // Usar el endpoint correcto: /api/crear/ (no /api/registrar/)
    const response = await axios.post('/api/crear/', formPayload, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-Session-ID': sessionid || ''
      },
      withCredentials: true
    });

    if (response.data.success || response.data.status === 'success') {
      setSuccessOferta(true);
      setOfertaForm({
        rango_horario: '',
        referencia_ubicacion: ''
      });
      setImagenes([]);
      setRepuestoCreado(null);
      setValorCalculado(response.data.valor_puntos);
      
      setTimeout(() => setSuccessOferta(false), 3000);
    } else {
      setErrorOferta(response.data.error || 'Error al crear la oferta');
    }
  } catch (err) {
    console.error('Error:', err);
    if (err.response?.data?.error) {
      setErrorOferta(err.response.data.error);
    } else {
      setErrorOferta('Error de conexión');
    }
  } finally {
    setCargandoOferta(false);
  }
};

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Publicar Repuesto Automotriz</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* COLUMNA IZQUIERDA: Registrar Nuevo Repuesto */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
            Registrar Nuevo Repuesto
          </h2>
          <p className="text-xs text-gray-400 mb-4">Completa los datos técnicos del repuesto</p>

          {errorRepuesto && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
              {errorRepuesto}
            </div>
          )}
          
          {successRepuesto && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded">
              {successRepuesto}
            </div>
          )}

          <form onSubmit={handleCrearRepuesto} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                Nombre de la Pieza *
              </label>
              <input
                type="text"
                name="nombre_pieza"
                value={repuestoForm.nombre_pieza}
                onChange={handleRepuestoChange}
                placeholder="Ej: Alternador, Batería, Correa"
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                Descripción Técnica *
              </label>
              <textarea
                name="descripcion_tecnica"
                value={repuestoForm.descripcion_tecnica}
                onChange={handleRepuestoChange}
                rows="2"
                placeholder="Especificaciones técnicas del repuesto"
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                Estado Físico *
              </label>
              <select
                name="estado_fisico"
                value={repuestoForm.estado_fisico}
                onChange={handleRepuestoChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Seleccione un estado</option>
                {estadosFisicos.map(estado => (
                  <option key={estado} value={estado}>{estado}</option>
                ))}
              </select>
            </div>

            <div className="border-t pt-4">
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                Compatibilidad con Vehículo *
              </label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500">Marca</label>
                  <input
                    type="text"
                    name="marca"
                    value={repuestoForm.marca}
                    onChange={handleRepuestoChange}
                    placeholder="Toyota"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Modelo</label>
                  <input
                    type="text"
                    name="modelo"
                    value={repuestoForm.modelo}
                    onChange={handleRepuestoChange}
                    placeholder="Corolla"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Año</label>
                  <input
                    type="number"
                    name="anio"
                    value={repuestoForm.anio}
                    onChange={handleRepuestoChange}
                    placeholder="2020"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={creandoRepuesto}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition disabled:bg-gray-400"
            >
              {creandoRepuesto ? 'Registrando...' : 'Registrar Repuesto'}
            </button>
          </form>
        </div>

        {/* COLUMNA DERECHA: Publicar Oferta (se desbloquea después de crear repuesto) */}
        <div className={`bg-white rounded-xl shadow-md border p-6 transition-all ${!repuestoCreado ? 'opacity-50 bg-gray-50' : 'border-blue-200'}`}>
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
            Publicar Oferta
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            {!repuestoCreado 
              ? '🔒 Completa y guarda el repuesto para desbloquear este paso' 
              : '✓ Repuesto listo. Completa los datos de la oferta'}
          </p>

          {!repuestoCreado && (
            <div className="p-4 bg-gray-100 rounded-lg text-center text-gray-500 text-sm">
              ⚠️ Registra un repuesto primero
            </div>
          )}

          {repuestoCreado && (
            <>
              <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800">
                  Repuesto seleccionado: <strong>{repuestoCreado.nombre_pieza}</strong>
                </p>
                <p className="text-xs text-green-600">
                  {repuestoCreado.estado_fisico} • Compatible con {repuestoCreado.marca} {repuestoCreado.modelo} ({repuestoCreado.anio})
                </p>
              </div>

              {errorOferta && (
                <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
                  {errorOferta}
                </div>
              )}
              
              {successOferta && (
                <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded">
                  ✓ ¡Oferta publicada exitosamente!
                </div>
              )}

              <form onSubmit={handlePublicarOferta} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Rango Horario de Disponibilidad *
                  </label>
                  <input
                    type="text"
                    name="rango_horario"
                    value={ofertaForm.rango_horario}
                    onChange={handleOfertaChange}
                    placeholder="Ej: Lunes a Viernes de 9am a 6pm"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Ubicación para la Entrega *
                  </label>
                  <textarea
                    name="referencia_ubicacion"
                    value={ofertaForm.referencia_ubicacion}
                    onChange={handleOfertaChange}
                    rows="2"
                    placeholder="Ej: Estacionamiento del Bloque A, cerca del Farmatodo"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Fotografías del Repuesto (3 a 5) *
                  </label>
                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png"
                    onChange={handleImageChange}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700"
                    required
                  />
                  <span className="text-xs text-gray-400 mt-1 block">
                    {imagenes.length === 0 
                      ? 'Selecciona entre 3 y 5 imágenes (JPG/PNG)' 
                      : `${imagenes.length} archivo(s) seleccionado(s)`}
                  </span>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-blue-900 text-sm">Valor de Tasación</h4>
                    <p className="text-xs text-blue-700">Calculado automáticamente</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-blue-900">
                      {valorCalculado || '---'}
                    </span>
                    <span className="text-xs block text-blue-900">Puntos</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={cargandoOferta}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition disabled:bg-gray-400"
                >
                  {cargandoOferta ? 'Publicando...' : 'Publicar Oferta'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}