# HU 12: Servicio de Tasación Algorítmica para Repuestos
class TasacionService:
    @staticmethod
    def calcularPuntosAlgoritmicamente(datos_repuesto):
        # 1. Regla de Integridad: Validar que todos los campos existan
        campos_obligatorios = ['estado_fisico', 'anio_vehiculo', 'categoria']
        if not all(k in datos_repuesto for k in campos_obligatorios):
            raise ValueError("Integridad fallida: Faltan campos técnicos para tasar.")

        # 2. Definición de métrica (Regla de Dependencia del Admin)
        puntos_base = 100.0
        
        # Ajuste por estado físico
        multiplicadores_estado = {
            'Nuevo': 1.5,
            'Usado - Como nuevo': 1.2,
            'Usado - Funcional': 1.0,
            'Para repuesto': 0.5
        }
        
        # Cálculo de depreciación
        anio_actual = 2026
        antiguedad = anio_actual - int(datos_repuesto['anio_vehiculo'])
        depreciacion = max(0.5, 1 - (antiguedad * 0.05))
        
        # Cálculo Final
        resultado = puntos_base * multiplicadores_estado.get(datos_repuesto['estado_fisico'], 1.0) * depreciacion
        
        return round(resultado, 2)