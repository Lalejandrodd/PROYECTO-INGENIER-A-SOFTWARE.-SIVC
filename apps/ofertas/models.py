import uuid
from django.db import models
from apps.repuestos.models import Repuesto 
from apps.transacciones.services import TasacionService 
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.usuarios.models import Vecino, Admin
from apps.vehiculos.models import Vehiculo
try:
    import pusher
except ImportError:
    pusher = None
from django.conf import settings
import os
from io import BytesIO
from PIL import Image
from django.core.files.base import ContentFile
# Inicializamos el cliente de pusher solo si la librería está disponible
pusher_client = None
if pusher is not None:
    try:
        pusher_client = pusher.Pusher(
            app_id=getattr(settings, 'PUSHER_APP_ID', None),
            key=getattr(settings, 'PUSHER_KEY', None),
            secret=getattr(settings, 'PUSHER_SECRET', None),
            cluster=getattr(settings, 'PUSHER_CLUSTER', None)
        )
    except Exception:
        pusher_client = None

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

# class Oferta(models.Model):
#     """
#     Representa la publicación de un repuesto en el mercado.
#     Incluye lógica automatizada de tasación para evitar inflación.
#     """
#     id_inventario = models.UUIDField(
#         primary_key=True, 
#         default=uuid.uuid4, 
#         editable=False
#     )
#     repuesto = models.ForeignKey(
#         Repuesto, 
#         on_delete=models.CASCADE,
#         related_name='ofertas'
#     )
    
#     usuario = models.ForeignKey('usuarios.Usuario', on_delete=models.CASCADE, related_name='ofertas')
    
#     # Escenario 1 HU 12: El usuario no puede modificar el valor
#     valor_puntos = models.FloatField(default=0.0, editable=False)
    
#     fecha_publicacion = models.DateTimeField(auto_now_add=True)
#     estado_oferta = models.BooleanField(default=True) # True = Disponible
    
#     # HU 5: Datos de contacto y logística
#     rango_horario = models.CharField(
#         max_length=200, 
#         help_text="Ej: Lunes a Viernes 8am-4pm"
#     )
#     referencia_ubicacion = models.TextField(
#         help_text="Indicaciones para el encuentro"
#     )

#     class Meta:
#         verbose_name = "Oferta"
#         verbose_name_plural = "Ofertas"

#     def __str__(self):
#         return f"Oferta: {self.repuesto.nombre_pieza} - {self.valor_puntos} pts"

#     def save(self, *args, **kwargs):
#         """
#         Sobrescritura del método save para ejecutar la Tasación Algorítmica.
#         Garantiza que el valor sea calculado por el sistema antes de guardar.
#         """
        
#         # Validar el límite diario de publicaciones por usuario (HU 11)
#         from apps.ofertas.services import OfertaService  
#         OfertaService.validar_limite_diario(self.usuario)

#         # Obtener el año del primer vehículo compatible
#         vehiculo = self.repuesto.compatibilidad.first()
#         anio_ref = vehiculo.anio if vehiculo else 2020
        
#         datos_tecnicos = {
#             'estado_fisico': self.repuesto.estado_fisico,
#             'categoria': self.repuesto.nombre_pieza,
#             'anio_vehiculo': anio_ref
#         }
        
#         self.valor_puntos = TasacionService.calcularPuntosAlgoritmicamente(datos_tecnicos)
        
#         # Guardado final en la BD vía ORM
#         super(Oferta, self).save(*args, **kwargs)

# Modificada Para el video
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
    
    # El valor final en puntos calculado por el intermediario
    valor_puntos = models.FloatField(default=0.0, editable=False)
    
    # --- NUEVO CAMPO PARA SOPORTAR LA TÁCTICA DE MODIFICABILIDAD ---
    TIPO_TASACION_CHOICES = [
        ('algoritmico', 'Tasación Automática'),
        ('directo', 'Intercambio Directo'),
        ('tiempo', 'Banco de Tiempo'),
    ]
    tipo_tasacion = models.CharField(
        max_length=20,
        choices=TIPO_TASACION_CHOICES,
        default='algoritmico'
    )
    # ---------------------------------------------------------------

    fecha_publicacion = models.DateTimeField(auto_now_add=True)
    estado_oferta = models.BooleanField(default=True) 
    
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
        return f"Oferta: {self.repuesto.nombre_pieza} - {self.valor_puntos} pts ({self.get_tipo_tasacion_display()})"

    def save(self, *args, **kwargs):
        # 1. Forzar validaciones de negocio primero
        self.full_clean()
        
        # 2. Guardar físicamente el registro en la base de datos de Django
        es_nuevo = self.pk is None  # Verificamos si se está creando por primera vez
        super().save(*args, **kwargs)
        
        # 3. Disparador de Pusher: Solo notificamos si es una urgencia NUEVA y ACTIVA
        if es_nuevo and self.activa:
            try:
                pusher_client = pusher.Pusher(
                    app_id=settings.PUSHER_APP_ID,
                    key=settings.PUSHER_KEY,
                    secret=settings.PUSHER_SECRET,
                    cluster=settings.PUSHER_CLUSTER,
                    ssl=True
                )
                
                # Lanzamos el evento al canal de la comunidad
                pusher_client.trigger('canal-comunidad', 'nueva-urgencia', {
                    'id_urgencia': self.id_urgencia,
                    'pieza': self.nombre_pieza_requerida,
                    'vehiculo': f"{self.vehiculo.marca} {self.vehiculo.modelo}",
                    'recompensa': self.puntos_recompensa_extra,
                    'vecino': self.vecino.username
                })
            except Exception as e:
                # Usamos un try/except para que si no hay internet o fallan las llaves de Pusher,
                # el sistema no le tire un error 500 al usuario y al menos guarde el registro.
                print(f"Advertencia de Pusher (No interrumpe el flujo): {e}")


def validar_extension_imagen(value):
    """
    HU 7 - Escenario 2: Restricción de formatos de archivo.
    Solo se admiten archivos con extensión .jpg, .jpeg o .png.
    """
    ext = os.path.splitext(value.name)[1].lower()
    extensiones_permitidas = ['.jpg', '.jpeg', '.png']
    if ext not in extensiones_permitidas:
        raise ValidationError(
            'Formato no permitido. Solo se admiten archivos JPG o PNG.'
        )

def validar_tamanio_imagen(value):
    """
    HU 7: Restricción de tamaño máximo por archivo (10 MB).
    """
    limite_mb = 10
    if value.size > limite_mb * 1024 * 1024:
        raise ValidationError(
            f'El archivo "{value.name}" excede el límite de {limite_mb} MB.'
        )

class Fotografia(models.Model):
    """
    Maneja las evidencias visuales del repuesto.
    """
    oferta = models.ForeignKey(
        Oferta, 
        related_name='fotos', 
        on_delete=models.CASCADE
    )
    imagen = models.FileField(
        upload_to='ofertas/fotografias/',
        validators=[validar_extension_imagen, validar_tamanio_imagen],
        help_text='Solo se admiten archivos JPG o PNG, máximo 10MB.',
        null=True, blank=True
    )
    fecha_carga = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # HU 7 - Procesamiento a baja resolución
        # Lo hacemos antes de invocar a super().save()
        if self.imagen:
            # Abrimos la imagen con Pillow
            img = Image.open(self.imagen)
            
            # Forzamos conversión a RGB para evitar problemas con PNG transparentes al guardar como JPEG
            if img.mode != 'RGB':
                img = img.convert('RGB')
                
            # Reducimos las dimensiones (ej. a 800x800 manteniendo proporciones)
            max_size = (800, 800)
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Guardamos la imagen en memoria con baja calidad (70%)
            output = BytesIO()
            img.save(output, format='JPEG', quality=70)
            output.seek(0)
            
            # Reemplazamos el archivo original por la versión comprimida
            nombre_base = os.path.splitext(os.path.basename(self.imagen.name))[0]
            nuevo_nombre = f"{nombre_base}_comprimida.jpg"
            
            self.imagen = ContentFile(output.read(), name=nuevo_nombre)
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Foto para {self.oferta.id_inventario}"
    
class Urgencia(models.Model):
    id_urgencia = models.AutoField(primary_key=True)
    
    # Relaciones (Llaves Foráneas)
    
    vecino = models.ForeignKey(Vecino, on_delete=models.CASCADE, verbose_name="Vecino Afectado")
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.CASCADE, verbose_name="Vehículo Accidentado")
    
    # Campos solicitados por el plan
    nombre_pieza_requerida = models.CharField(max_length=150, verbose_name="Pieza Necesitada")
    descripcion_contexto = models.TextField(verbose_name="Descripción del Contexto / Situación")
    fecha_hora_publicacion = models.DateTimeField(default=timezone.now, verbose_name="Fecha y Hora de Publicación")
    puntos_recompensa_extra = models.FloatField(verbose_name="Puntos de Recompensa Extra")
    activa = models.BooleanField(default=True, verbose_name="¿Sigue Activa?")

    vecino_postulado = models.ForeignKey(
        'usuarios.Vecino', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='urgencias_postuladas'
    )

    estado_tramite = models.CharField(
        max_length=20,
        choices=[
            ('libre', 'Libre'),               
            ('revision', 'En Revisión'),      
            ('completada', 'Completada'),    
        ],
        default='libre'
    )
    
    def clean(self):
        super().clean()
        
        # 1. Validación de la Regla de Negocio: Cuota Máxima de 1 Urgencia Activa
        # Si es un registro nuevo (self.pk es None) y ya tiene otra urgencia activa, lanzamos error.
        if self.pk is None and self.activa:
            urgencias_activas = Urgencia.objects.filter(vecino=self.vecino, activa=True).exists()
            if urgencias_activas:
                raise ValidationError({
                    'activa': "Regla de Negocio Incumplida: Solo puedes tener un anuncio de emergencia activo a la vez."
                })
        
        # 2. Validación del Incentivo (Teoría de Juegos)
        if self.puntos_recompensa_extra is not None and self.puntos_recompensa_extra <= 0:
            raise ValidationError({
                'puntos_recompensa_extra': "Para publicar una urgencia debes ofrecer un incentivo de puntos extra mayor a cero."
            })

    def save(self, *args, **kwargs):
        # Obligamos a ejecutar la lógica de validación de clean() antes de guardar en la BD
        self.full_clean()
        super().save(*args, **kwargs)

    def postular_colaborador(self, vecino_b):
        """El Vecino B se ofrece a ayudar"""
        if self.estado_tramite != 'libre' or not self.activa:
            raise ValidationError("Esta urgencia ya no está disponible.")
        # 👇 CORREGIDO: Se cambia self.vecino_creador por self.vecino
        if self.vecino == vecino_b:
            raise ValidationError("No puedes postularte a tu propia urgencia.")
            
        self.vecino_postulado = vecino_b
        self.estado_tramite = 'revision'
        self.save()

    def aceptar_solucion(self):
        """El Vecino A acepta la ayuda y se transfieren los puntos"""
        if self.estado_tramite != 'revision' or not self.vecino_postulado:
            raise ValidationError("No hay ninguna postulación pendiente para aceptar.")
        
        # 👇 CORREGIDO: Se cambia self.vecino_creador por self.vecino
        vecino_a = self.vecino
        vecino_b = self.vecino_postulado
        
        # 👇 CORREGIDO: Se cambia self.valor_puntos por self.puntos_recompensa_extra
        puntos_a_transferir = self.puntos_recompensa_extra 

        # Validación de saldo
        if vecino_a.puntos < puntos_a_transferir:
            raise ValidationError("No tienes puntos suficientes para cerrar esta urgencia.")

        # Transferencia de puntos
        vecino_a.puntos -= puntos_a_transferir
        vecino_b.puntos += puntos_a_transferir
        
        # Guardar saldos de los vecinos
        vecino_a.save()
        vecino_b.save()

        # Cerrar trámite de la urgencia
        self.estado_tramite = 'completada'
        self.activa = False
        self.save()

    def rechazar_solucion(self):
        """El Vecino A rechaza la ayuda y la urgencia vuelve a estar libre"""
        if self.estado_tramite != 'revision':
            raise ValidationError("No hay ninguna postulación activa para rechazar.")
            
        self.vecino_postulado = None
        self.estado_tramite = 'libre'
        self.save()

    def __str__(self):
        return f"URGENCIA: {self.nombre_pieza_requerida} - {self.vecino.username} ({'ACTIVA' if self.activa else 'RESUELTA'})"