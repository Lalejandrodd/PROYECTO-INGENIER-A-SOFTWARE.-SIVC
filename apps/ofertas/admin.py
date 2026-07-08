from django.contrib import admin
from django.core.exceptions import ValidationError
from .models import Oferta, Fotografia
from .services import OfertaService


class FotografiaInline(admin.TabularInline):
    """
    HU 7: Permite ver y cargar fotografías directamente
    desde el formulario de la Oferta en el admin.
    """
    model = Fotografia
    extra = 3  # Muestra 3 formularios vacíos por defecto (mínimo obligatorio)
    min_num = 3
    max_num = 5
    fields = ['imagen', 'fecha_carga']
    readonly_fields = ['fecha_carga']


class OfertaAdmin(admin.ModelAdmin):
    list_display = ['id_inventario', 'repuesto', 'usuario', 'valor_puntos', 'estado_oferta', 'fecha_publicacion']
    readonly_fields = ['id_inventario', 'valor_puntos', 'fecha_publicacion']
    inlines = [FotografiaInline]
    
    def save_model(self, request, obj, form, change):
        """
        Validar límite diario también cuando se guarda desde el admin
        """
        if not change:  
            try:
                OfertaService.validar_limite_diario(obj.usuario)
            except ValidationError as e:
                from django.contrib import messages
                messages.error(request, str(e))
                return
        super().save_model(request, obj, form, change)

admin.site.register(Oferta, OfertaAdmin)
admin.site.register(Fotografia)
