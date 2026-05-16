# apps/transacciones/models.py
import uuid
from django.db import models
from django.core.exceptions import ValidationError


class Transaccion(models.Model):
    """
    Representa un intercambio completado entre dos vecinos.
    Cumple con HU8 y los requisitos de integridad referencial del ERS.
    """
    id_transaccion = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False
    )
    fecha_exito = models.DateTimeField(auto_now_add=True)
    puntos_transferidos = models.FloatField()
    
    # CORREGIDO: ForeignKey en lugar de CharField
    ofertante = models.ForeignKey(
        'usuarios.Vecino',
        on_delete=models.PROTECT,  # ERS: "On Delete Protect/Restrict"
        related_name='transacciones_como_ofertante'
    )
    demandante = models.ForeignKey(
        'usuarios.Vecino',
        on_delete=models.PROTECT,
        related_name='transacciones_como_demandante'
    )
    
    # Relación con la oferta que originó la transacción
    oferta = models.ForeignKey(
        'ofertas.Oferta',
        on_delete=models.PROTECT,
        related_name='transacciones'
    )

    class Meta:
        verbose_name = "Transacción"
        verbose_name_plural = "Transacciones"
        # Garantizar que no haya transacciones duplicadas para la misma oferta
        unique_together = ['oferta', 'ofertante', 'demandante']

    def __str__(self):
        return f"Transacción {self.id_transaccion} - {self.puntos_transferidos} pts"

    def save(self, *args, **kwargs):
        """
        Validaciones antes de guardar (ERS: integridad de datos)
        """
        # Validar que ofertante y demandante sean diferentes
        if self.ofertante == self.demandante:
            raise ValidationError("El ofertante y el demandante no pueden ser la misma persona")
        
        # Validar que los puntos sean positivos
        if self.puntos_transferidos <= 0:
            raise ValidationError("Los puntos transferidos deben ser mayores a cero")
        
        super().save(*args, **kwargs)


class Historial(models.Model):
    """
    Historial de transacciones de un vecino. Es inalterable por diseño.
    Cumple con HU8: permite ver listado detallado de puntos y ranking.
    """
    # CORREGIDO: Vinculado a un Vecino específico
    vecino = models.OneToOneField(
        'usuarios.Vecino',
        on_delete=models.CASCADE,
        related_name='historial'
    )
    
    # Lista de todas las transacciones del vecino (como ofertante o demandante)
    transacciones = models.ManyToManyField(
        Transaccion,
        related_name='historiales'
    )
    
    # El ERS exige inmutabilidad (artículo 2.4.3)
    es_inalterable = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Historial"
        verbose_name_plural = "Historiales"

    def __str__(self):
        return f"Historial de {self.vecino.usuario.nombre_completo} - {self.total_intercambios} intercambios"

    # ============================================
    # MÉTODOS REQUERIDOS POR EL DIAGRAMA DE CLASES
    # ============================================

    @property
    def total_intercambios(self):
        """Retorna el número total de transacciones del vecino"""
        return self.transacciones.count()

    @property
    def puntos_acumulados(self):
        """
        Calcula el total de puntos acumulados.
        Como ofertante: GANA puntos (recibe)
        Como demandante: GASTA puntos (no se suman al historial propio)
        """
        total = 0
        for t in self.transacciones.all():
            # Si el vecino es el ofertante, recibe los puntos
            if t.ofertante == self.vecino:
                total += t.puntos_transferidos
            # Si es demandante, no suma (gastó puntos)
            # El saldo real está en Vecino.saldo_puntos
        return total

    def agregar_transaccion(self, transaccion):
        """
        Método del diagrama de clases.
        Agrega una transacción al historial si está involucrado.
        """
        # Verificar que el vecino esté involucrado en la transacción
        if transaccion.ofertante == self.vecino or transaccion.demandante == self.vecino:
            self.transacciones.add(transaccion)
            self._actualizar_saldo_vecino(transaccion)
        else:
            raise ValidationError("Esta transacción no involucra al vecino")

    def _actualizar_saldo_vecino(self, transaccion):
        """
        Método interno para actualizar el saldo de puntos del vecino
        según la transacción completada.
        """
        if transaccion.ofertante == self.vecino:
            # El ofertante GANA puntos
            self.vecino.saldo_puntos += transaccion.puntos_transferidos
        elif transaccion.demandante == self.vecino:
            # El demandante PIERDE puntos
            self.vecino.saldo_puntos -= transaccion.puntos_transferidos
        
        self.vecino.save()
        self._actualizar_ranking()

    def _actualizar_ranking(self):
        """
        Actualiza el ranking del vecino basado en su saldo de puntos.
        ERS: "El cambio de nivel de reconocimiento es automático"
        """
        saldo = self.vecino.saldo_puntos
        
        if saldo >= 1000:
            self.vecino.ranking = 5  # Leyenda
        elif saldo >= 500:
            self.vecino.ranking = 4  # Experto
        elif saldo >= 200:
            self.vecino.ranking = 3  # Colaborador
        elif saldo >= 50:
            self.vecino.ranking = 2  # Aprendiz
        else:
            self.vecino.ranking = 1  # Novato
        
        self.vecino.save()

    def calcular_resumen_puntos(self):
        """
        Método del diagrama de clases.
        Retorna un resumen completo del historial para mostrar en UI.
        """
        transacciones_list = []
        for t in self.transacciones.all().order_by('-fecha_exito'):
            transacciones_list.append({
                'id_transaccion': str(t.id_transaccion),
                'fecha': t.fecha_exito.strftime('%d/%m/%Y %H:%M'),
                'puntos': t.puntos_transferidos,
                'tipo': 'Recibido' if t.ofertante == self.vecino else 'Entregado',
                'contraparte': t.demandante.usuario.nombre_completo if t.ofertante == self.vecino else t.ofertante.usuario.nombre_completo,
                'repuesto': t.oferta.repuesto.nombre_pieza
            })
        
        return {
            'vecino': self.vecino.usuario.nombre_completo,
            'ranking': self.vecino.ranking,
            'saldo_actual': self.vecino.saldo_puntos,
            'total_intercambios': self.total_intercambios,
            'puntos_acumulados_historicos': self.puntos_acumulados,
            'transacciones_recientes': transacciones_list[:10]  # Últimas 10
        }

    def get_historial_detallado(self):
        """
        Método adicional para cumplir con HU8:
        "listado cronológico inverso de todas sus interacciones"
        """
        return self.transacciones.all().order_by('-fecha_exito')