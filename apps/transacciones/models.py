import uuid
from django.db import models

class Transaccion(models.Model):
    id_transaccion = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    fecha_exito = models.DateTimeField(auto_now_add=True)
    puntos_transferidos = models.FloatField()
    id_ofertante = models.CharField(max_length=100)
    id_demandante = models.CharField(max_length=100)
    def __str__(self):
        return f"Transacción {self.id_transaccion} - {self.puntos_transferidos} pts"

class Historial(models.Model):
    total_intercambios = models.IntegerField(default=0)
    es_inalterable = models.BooleanField(default=True)
    def __str__(self):
        return f"Historial - {self.total_intercambios} intercambios"