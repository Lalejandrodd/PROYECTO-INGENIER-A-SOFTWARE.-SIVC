import uuid
from django.db import models
from apps.repuestos.models import Repuesto 
from apps.transacciones.services import TasacionService 

class MatrizCompatibilidad(models.Model):
    repuesto = models.ForeignKey('repuestos.Repuesto', on_delete=models.CASCADE)
    vehiculo = models.ForeignKey('vehiculos.Vehiculo', on_delete=models.CASCADE)
    
    class Meta:
        unique_together = ['repuesto', 'vehiculo']
    
    @classmethod
    def validar_match(cls, repuesto_id, vehiculo_id):
        return cls.objects.filter(
            repuesto_id=repuesto_id, 
            vehiculo_id=vehiculo_id
        ).exists()
    
    def __str__(self):
        return f"{self.repuesto.nombre_pieza} → {self.vehiculo.marca} {self.vehiculo.modelo}"

class Oferta(models.Model):
    """
    Representa la publicación de un repuesto en el mercado.
    Incluye lógica automatizada de tasación para evitar inflación.
    """
    id_inventario = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False
    )
    repuesto = models.ForeignKey(
        Repuesto, 
        on_delete=models.CASCADE,
        related_name='ofertas'
    )
    
    usuario = models.ForeignKey('usuarios.Usuario', on_delete=models.CASCADE, related_name='ofertas')
    
    # Escenario 1 HU 12: El usuario no puede modificar el valor
    valor_puntos = models.FloatField(default=0.0, editable=False)
    
    fecha_publicacion = models.DateTimeField(auto_now_add=True)
    estado_oferta = models.BooleanField(default=True) # True = Disponible
    
    # HU 5: Datos de contacto y logística
    rango_horario = models.CharField(
        max_length=200, 
        help_text="Ej: Lunes a Viernes 8am-4pm"
    )
    referencia_ubicacion = models.TextField(
        help_text="Indicaciones para el encuentro"
    )

    class Meta:
        verbose_name = "Oferta"
        verbose_name_plural = "Ofertas"

    def __str__(self):
        return f"Oferta: {self.repuesto.nombre_pieza} - {self.valor_puntos} pts"

    def save(self, *args, **kwargs):
        """
        Sobrescritura del método save para ejecutar la Tasación Algorítmica.
        Garantiza que el valor sea calculado por el sistema antes de guardar.
        """
        # Obtener el año del primer vehículo compatible
        vehiculo = self.repuesto.compatibilidad.first()
        anio_ref = vehiculo.anio if vehiculo else 2020
        
        datos_tecnicos = {
            'estado_fisico': self.repuesto.estado_fisico,
            'categoria': self.repuesto.nombre_pieza,
            'anio_vehiculo': anio_ref
        }
        
        self.valor_puntos = TasacionService.calcularPuntosAlgoritmicamente(datos_tecnicos)
        
        # Guardado final en la BD vía ORM
        super(Oferta, self).save(*args, **kwargs)

class Fotografia(models.Model):
    """
    Maneja las evidencias visuales del repuesto.
    """
    oferta = models.ForeignKey(
        Oferta, 
        related_name='fotos', 
        on_delete=models.CASCADE
    )
    url_imagen = models.URLField()
    fecha_carga = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Foto para {self.oferta.id_inventario}"