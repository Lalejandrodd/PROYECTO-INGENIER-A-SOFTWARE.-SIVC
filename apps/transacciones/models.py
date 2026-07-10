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

    completada = models.BooleanField(default=False)

    acuerdo = models.ForeignKey(
        'AcuerdoIntercambio',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
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

    cancelacion_solicitada_por = models.ForeignKey(
        Vecino, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='cancelaciones_solicitadas'
    )

    estado_anterior = models.CharField(max_length=20, blank=True, null=True)

    def clean(self):
        """
        VALIDACIÓN DEL BACKEND: Evita la creación o actualización de un acuerdo
        si el demandante no tiene saldo_puntos suficiente para cubrir el costo.
        """
        super().clean()
        
        # 🎯 CORRECCIÓN: El campo real en Oferta se llama 'puntos'
        puntos_requeridos = self.oferta.puntos if hasattr(self.oferta, 'puntos') else 0

        if self.demandante.saldo_puntos < puntos_requeridos:
            raise ValidationError(
                f"Transacción inválida: El vecino @{self.demandante.usuario.username} "
                f"no tiene saldo suficiente. Requiere {puntos_requeridos} y posee {self.demandante.saldo_puntos}."
            )

    def save(self, *args, **kwargs):
        """
        Controla el ciclo de vida del acuerdo. Al guardarse en estado 'completado',
        realiza la transferencia atómica de 'saldo_puntos' en la base de datos.
        """
        # Ejecutamos la validación antes de realizar cualquier persistencia
        if self.estado == 'completado':
            self.full_clean()
            
            puntos_a_transferir = self.oferta.puntos if hasattr(self.oferta, 'puntos') else 0
            
            if puntos_a_transferir > 0:
                # Modificación de saldos
                self.demandante.saldo_puntos -= puntos_a_transferir
                self.ofertante.saldo_puntos += puntos_a_transferir
                
                # Guardado persistente de los perfiles de vecinos modificados
                self.demandante.save()
                self.ofertante.save()
                
                print(f"💰 Trueque Exitoso: Se dedujeron e intercambiaron {puntos_a_transferir} puntos.")

        super().save(*args, **kwargs)

    class Meta:
        unique_together = ['oferta', 'ofertante', 'demandante']
        verbose_name = "Acuerdo de Intercambio"
        verbose_name_plural = "Acuerdos de Intercambio"

    def __str__(self):
        return f"Acuerdo {self.oferta.repuesto.nombre_pieza} - {self.estado}"
    
class Calificacion(models.Model):
    id_calificacion = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaccion = models.ForeignKey(Transaccion, on_delete=models.CASCADE, related_name='calificaciones')
    calificador = models.ForeignKey(Vecino, on_delete=models.PROTECT, related_name='calificaciones_hechas')
    calificado = models.ForeignKey(Vecino, on_delete=models.PROTECT, related_name='calificaciones_recibidas')
    puntuacion = models.IntegerField(choices=[(i, str(i)) for i in range(1, 6)])
    comentario = models.TextField(blank=True)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['transaccion', 'calificador']  # Un usuario solo califica una vez por transacción