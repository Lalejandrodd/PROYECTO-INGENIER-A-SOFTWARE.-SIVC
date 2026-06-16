import uuid
from django.db import models
from apps.usuarios.models import Vecino
from apps.transacciones.models import AcuerdoIntercambio

class Conversacion(models.Model):
    id_conversacion = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    acuerdo = models.OneToOneField(AcuerdoIntercambio, on_delete=models.CASCADE, related_name='conversacion')
    fecha_inicio = models.DateTimeField(auto_now_add=True)
    activa = models.BooleanField(default=True)

    def __str__(self):
        return f"Chat para {self.acuerdo.oferta.repuesto.nombre_pieza}"

class Mensaje(models.Model):
    ESTADO_CHOICES = (
        ('sent', 'Enviado'),
        ('read', 'Leído'),
        ('error', 'Error'),
    )
    id_mensaje = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversacion = models.ForeignKey(Conversacion, on_delete=models.CASCADE, related_name='mensajes')
    emisor = models.ForeignKey(Vecino, on_delete=models.PROTECT)
    texto = models.TextField(max_length=500)
    fecha_envio = models.DateTimeField(auto_now_add=True)
    leido = models.BooleanField(default=False)
    estado = models.CharField(max_length=10, choices=ESTADO_CHOICES, default='sent')

    class Meta:
        ordering = ['fecha_envio']

    def __str__(self):
        return f"Mensaje de {self.emisor.usuario.username} - {self.fecha_envio}"

    def marcar_leido(self):
        if not self.leido:
            self.leido = True
            self.estado = 'read'
            self.save(update_fields=['leido', 'estado'])