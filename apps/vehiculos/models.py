from django.db import models

class Vehiculo(models.Model):
    marca = models.CharField(max_length=100)
    modelo = models.CharField(max_length=100)
    anio = models.IntegerField()

    def __str__(self):
        return f"{self.marca} {self.modelo} ({self.anio})"