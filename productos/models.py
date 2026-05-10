import uuid
from django.db import models
from .services import TasacionService

# CLASES DE MODELO PARA EL MVP DE LA PLATAFORMA DE INTERCAMBIO DE REPUESTOS AUTOMOTRICES

class Vehiculo(models.Model):
    marca = models.CharField(max_length=100)
    modelo = models.CharField(max_length=100)
    anio = models.IntegerField()

    def __str__(self):
        return f"{self.marca} {self.modelo} ({self.anio})"

class Repuesto(models.Model):
    id_repuesto = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre_pieza = models.CharField(max_length=100)
    descripcion_tecnica = models.TextField()
    estado_fisico = models.CharField(max_length=50)
    compatibilidad = models.ManyToManyField(Vehiculo, through='MatrizCompatibilidad')

    def __str__(self):
        return self.nombre_pieza

class MatrizCompatibilidad(models.Model):
    repuesto = models.ForeignKey(Repuesto, on_delete=models.CASCADE)
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.CASCADE)

    def validarMatch(self, id_repuesto, id_vehiculo):
        return MatrizCompatibilidad.objects.filter(
            repuesto_id=id_repuesto, 
            vehiculo_id=id_vehiculo
        ).exists()

class Oferta(models.Model):
    id_inventario = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    repuesto = models.ForeignKey(Repuesto, on_delete=models.CASCADE)
    
    # HU 12: editable=False asegura que no aparezca en formularios automáticos
    valor_puntos = models.FloatField(default=0.0, editable=False) 
    
    fecha_publicacion = models.DateTimeField(auto_now_add=True)
    estado_oferta = models.BooleanField(default=True)
    
    # HU 5: Disponibilidad
    rango_horario = models.CharField(max_length=200)
    referencia_ubicacion = models.TextField()

    def __str__(self):
        return f"Oferta {self.id_inventario} - {self.repuesto.nombre_pieza}"

    def save(self, *args, **kwargs):
        vehiculo_relacionado = self.repuesto.compatibilidad.first()
        anio_ref = vehiculo_relacionado.anio if vehiculo_relacionado else 2020
        
        datos_tecnicos = {
            'estado_fisico': self.repuesto.estado_fisico,
            'anio_vehiculo': anio_ref,
            'categoria': self.repuesto.nombre_pieza
        }

        self.valor_puntos = TasacionService.calcularPuntosAlgoritmicamente(datos_tecnicos)
        
        # Guardado persistente vía ORM
        super(Oferta, self).save(*args, **kwargs)

class Fotografia(models.Model):
    oferta = models.ForeignKey(Oferta, related_name='fotos', on_delete=models.CASCADE)
    url_imagen = models.URLField()
    orden = models.IntegerField()

class Tasacion:
    @staticmethod
    def calcularPuntosAlgoritmicamente(datos_repuesto):
        puntos = 100.0
        if "Nuevo" in datos_repuesto.get('estado_fisico', ''):
            puntos += 50
        return puntos