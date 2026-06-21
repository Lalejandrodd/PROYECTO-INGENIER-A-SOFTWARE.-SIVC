from abc import ABC, abstractmethod
from apps.transacciones.services import TasacionService

class EstrategiaValor(ABC):
    """Interfaz base para todas las formas de valuar"""
    @abstractmethod
    def calcular_valor(self, datos):
        pass

class EstrategiaTasacionAlgoritmica(EstrategiaValor):
    """Tasación por algoritmo (Original del proyecto)"""
    def calcular_valor(self, datos):
        # Mapea directamente al servicio técnico desarrollado por el grupo
        return TasacionService.calcularPuntosAlgoritmicamente(datos)

class EstrategiaIntercambioDirecto(EstrategiaValor):
    """Intercambio directo: Los vecinos acuerdan un valor manual"""
    def calcular_valor(self, datos):
        valor_propuesto = datos.get('valor_manual', 0.0)
        try:
            valor_float = float(valor_propuesto)
        except (ValueError, TypeError):
            raise ValueError("El valor propuesto debe ser un número válido")
            
        if valor_float <= 0:
            raise ValueError("El valor acordado debe ser mayor a cero")
        return round(valor_float, 2)

class EstrategiaBancoTiempo(EstrategiaValor):
    """Banco de Tiempo (Modificabilidad Futura): Valúa en horas de favores"""
    def calcular_valor(self, datos):
        # 1 hora de servicio comunitario = 50 puntos del sistema
        horas = float(datos.get('horas', 0))
        puntos_por_hora = 50.0
        return round(horas * puntos_por_hora, 2)


class IntermediarioDeValor:
    """
    Broker / Mediador Centralizado.
    Desacopla el origen de la tasación del guardado o procesamiento.
    """
    def __init__(self):
        self._estrategias = {
            'algoritmico': EstrategiaTasacionAlgoritmica(),
            'directo': EstrategiaIntercambioDirecto(),
            'tiempo': EstrategiaBancoTiempo(),
        }

    def registrar_estrategia(self, nombre, estrategia):
        """Permite inyectar nuevas estrategias en caliente (Open/Closed Principle)"""
        self._estrategias[nombre] = estrategia

    def procesar_valor(self, tipo_tasacion, datos):
        if tipo_tasacion not in self._estrategias:
            raise ValueError(f"La estrategia de valoración '{tipo_tasacion}' no está registrada.")
        
        estrategia = self._estrategias[tipo_tasacion]
        return estrategia.calcular_valor(datos)

# Instancia única (Singleton) para consumir en todo el proyecto
gestor_valor = IntermediarioDeValor()