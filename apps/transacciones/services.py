class TasacionService:
    @staticmethod
    def calcularPuntosAlgoritmicamente(datos_repuesto):
        """
        HU 12: Lógica central para calcular el valor del repuesto
        basado en criterios técnicos objetivos.
        """
        # 1. Regla de Integridad: Validar que los campos técnicos existan
        estado = datos_repuesto.get('estado_fisico', 'Usado - Funcional')
        categoria = datos_repuesto.get('categoria', 'Genérico')
        anio = datos_repuesto.get('anio_vehiculo', 2020)  
        
        # 2. Definición de métrica base (Regla del Admin)
        puntos_base = 100.0
        
        # 3. Multiplicadores por Estado Físico
        multiplicadores_estado = {
            'Nuevo': 1.5,
            'Usado - Como nuevo': 1.2,
            'Usado - Funcional': 1.0,
            'Para repuesto': 0.5
        }
        
        # 4. Multiplicador por Categoría (Ejemplo: piezas de motor valen más)
        multiplicadores_cat = {
            'Motor': 1.3,
            'Transmisión': 1.2,
            'Carrocería': 1.0,
            'Frenos': 1.1
        }
        
        # 5. Depreciación por año
        anio_actual = 2026
        antiguedad = anio_actual - int(anio)
        depreciacion = max(0.5, 1 - (antiguedad * 0.05))  
        
        # Buscamos el multiplicador, si no existe usamos 1.0
        m_estado = multiplicadores_estado.get(estado, 1.0)
        m_cat = multiplicadores_cat.get(categoria, 1.0)
        
        # Cálculo Final con depreciación
        resultado = puntos_base * m_estado * m_cat * depreciacion  
        
        return round(resultado, 2)