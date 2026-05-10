import uuid
from django.db import models
from apps.vehiculos.models import Vehiculo

class Repuesto(models.Model):
    id_repuesto = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre_pieza = models.CharField(max_length=100)
    descripcion_tecnica = models.TextField()
    estado_fisico = models.CharField(max_length=50)
    
    # Muchos a muchos con Vehiculo
    compatibilidad = models.ManyToManyField(Vehiculo, related_name="repuestos")

    def __str__(self):
        return self.nombre_pieza