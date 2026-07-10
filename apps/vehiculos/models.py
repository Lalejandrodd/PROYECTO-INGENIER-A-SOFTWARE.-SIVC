from django.db import models

# ---------------------------------------------------------
# CLASE DEL DIAGRAMA: Marca (nueva entidad)
# ---------------------------------------------------------
class Marca(models.Model):
    nombre = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ['nombre']  # orden alfabético siempre

    def __str__(self):
        return self.nombre


# ---------------------------------------------------------
# CLASE DEL DIAGRAMA: Vehiculo (ahora con FK a Marca)
# ---------------------------------------------------------
class Vehiculo(models.Model):
    marca = models.ForeignKey(Marca, on_delete=models.PROTECT, related_name='vehiculos')
    modelo = models.CharField(max_length=100)
    anio = models.IntegerField()

    class Meta:
        ordering = ['marca__nombre', 'modelo', 'anio']  # orden compuesto

    def __str__(self):
        return f"{self.marca.nombre} {self.modelo} ({self.anio})"