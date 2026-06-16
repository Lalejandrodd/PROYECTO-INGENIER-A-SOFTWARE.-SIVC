import uuid
from django.db import models
from django.core.exceptions import ValidationError
from apps.usuarios.models import Vecino
from apps.ofertas.models import Oferta

class Transaccion(models.Model):
    """
    Representa un intercambio completado entre dos vecinos.
    """
    id_transaccion = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False
    )
    fecha_exito = models.DateTimeField(auto_now_add=True)
    puntos_transferidos = models.FloatField()
    
    ofertante = models.ForeignKey(
        'usuarios.Vecino',
        on_delete=models.PROTECT,  
        related_name='transacciones_como_ofertante'
    )
    demandante = models.ForeignKey(
        'usuarios.Vecino',
        on_delete=models.PROTECT,
        related_name='transacciones_como_demandante'
    )
    
    oferta = models.ForeignKey(
        'ofertas.Oferta',
        on_delete=models.PROTECT,
        related_name='transacciones'
    )

    class Meta:
        verbose_name = "Transacción"
        verbose_name_plural = "Transacciones"
        unique_together = ['oferta', 'ofertante', 'demandante']

    def __str__(self):
        return f"Transacción {self.id_transaccion} - {self.puntos_transferidos} pts"

    def save(self, *args, **kwargs):
        if self.ofertante == self.demandante:
            raise ValidationError("El ofertante y el demandante no pueden ser la misma persona")
        if self.puntos_transferidos <= 0:
            raise ValidationError("Los puntos transferidos deben ser mayores a cero")
        super().save(*args, **kwargs)


class Historial(models.Model):
    """
    Historial de transacciones de un vecino. Es inalterable por diseño.
    """
    vecino = models.OneToOneField(
        'usuarios.Vecino',
        on_delete=models.CASCADE,
        related_name='historial'
    )
    transacciones = models.ManyToManyField(
        Transaccion,
        related_name='historiales'
    )
    es_inalterable = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Historial"
        verbose_name_plural = "Historiales"

    def __str__(self):
        return f"Historial de {self.vecino.usuario.nombre_completo} - {self.total_intercambios} intercambios"

    @property
    def total_intercambios(self):
        return self.transacciones.count()

    @property
    def puntos_acumulados(self):
        total = 0
        for t in self.transacciones.all():
            if t.ofertante == self.vecino:
                total += t.puntos_transferidos
        return total

    def agregar_transaccion(self, transaccion):
        if transaccion.ofertante == self.vecino or transaccion.demandante == self.vecino:
            self.transacciones.add(transaccion)
            self._actualizar_saldo_vecino(transaccion)
        else:
            raise ValidationError("Esta transacción no involucra al vecino")

    def _actualizar_saldo_vecino(self, transaccion):
        if transaccion.ofertante == self.vecino:
            self.vecino.saldo_puntos += transaccion.puntos_transferidos
        elif transaccion.demandante == self.vecino:
            self.vecino.saldo_puntos -= transaccion.puntos_transferidos
        self.vecino.save()
        self._actualizar_ranking()

    def _actualizar_ranking(self):
        saldo = self.vecino.saldo_puntos
        if saldo >= 1000:
            self.vecino.ranking = 5
        elif saldo >= 500:
            self.vecino.ranking = 4
        elif saldo >= 200:
            self.vecino.ranking = 3
        elif saldo >= 50:
            self.vecino.ranking = 2
        else:
            self.vecino.ranking = 1
        self.vecino.save()

    def calcular_resumen_puntos(self):
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
            'transacciones_recientes': transacciones_list[:10]
        }

    def get_historial_detallado(self):
        return self.transacciones.all().order_by('-fecha_exito')


class AcuerdoIntercambio(models.Model):
    """
    Representa el interés mutuo entre ofertante y demandante por una oferta.
    """
    ESTADOS = (
        ('pendiente', 'Pendiente'),
        ('aceptado', 'Aceptado'),
        ('rechazado', 'Rechazado'),
        ('completado', 'Completado'),
    )
    oferta = models.ForeignKey(Oferta, on_delete=models.PROTECT, related_name='acuerdos')
    ofertante = models.ForeignKey(Vecino, on_delete=models.PROTECT, related_name='acuerdos_como_ofertante')
    demandante = models.ForeignKey(Vecino, on_delete=models.PROTECT, related_name='acuerdos_como_demandante')
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['oferta', 'ofertante', 'demandante']
        verbose_name = "Acuerdo de Intercambio"
        verbose_name_plural = "Acuerdos de Intercambio"

    def __str__(self):
        return f"Acuerdo {self.oferta.repuesto.nombre_pieza} - {self.estado}"