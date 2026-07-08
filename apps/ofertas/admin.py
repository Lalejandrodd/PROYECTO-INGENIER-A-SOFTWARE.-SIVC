from django.contrib import admin
from django.core.exceptions import ValidationError
from .models import Oferta, Fotografia
from .services import OfertaService

class FotografiaInline(admin.TabularInline):
    model = Fotografia
    extra = 1

class OfertaAdmin(admin.ModelAdmin):
    inlines = [FotografiaInline]
    list_display = ['id_inventario', 'repuesto', 'usuario', 'valor_puntos', 'estado_oferta', 'fecha_publicacion']
    readonly_fields = ['id_inventario', 'valor_puntos', 'fecha_publicacion']
    
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

# from django.contrib import admin
# from .models import Urgencia

# @admin.register(Urgencia)
# class UrgenciaAdmin(admin.ModelAdmin):
#     list_display = ('id_urgencia', 'vecino', 'nombre_pieza_requerida', 'puntos_recompensa_extra', 'activa', 'fecha_hora_publicacion')
#     list_filter = ('activa', 'fecha_hora_publicacion')
#     search_fields = ('nombre_pieza_requerida', 'vecino__username')
