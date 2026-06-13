from django.db import models

# ---------------------------------------------------------
# CLASE DEL DIAGRAMA: Vehiculo
# ---------------------------------------------------------

class Vehiculo(models.Model):
    marca = models.CharField(max_length=100)
    modelo = models.CharField(max_length=100)
    anio = models.IntegerField()

    def __str__(self):
        return f"{self.marca} {self.modelo} ({self.anio})"
    
# ---------------------------------------------------------
# CLASE ASOCIACIÓN DEL DIAGRAMA: Compatibilidad (Reemplaza a Matriz Compatibilidad)
# Esta clase conecta Repuesto y Vehiculo.
# ---------------------------------------------------------
#class Compatibilidad(models.Model):
#    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.CASCADE)
#    repuesto = models.ForeignKey('repuestos.Repuesto', on_delete=models.CASCADE)
    
    # MÉTODO DEL DIAGRAMA: validarMatch(idRepuesto, idVehiculo)
    # En Django, esto se puede manejar como un método de clase o un property
#    @classmethod
#    def validar_match(cls, repuesto_id, vehiculo_id):
#        return cls.objects.filter(repuesto_id=repuesto_id, vehiculo_id=vehiculo_id).exists()