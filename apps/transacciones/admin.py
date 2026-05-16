# apps/transacciones/admin.py
from django.contrib import admin
from .models import Transaccion, Historial


class TransaccionAdmin(admin.ModelAdmin):
    list_display = ['id_transaccion', 'fecha_exito', 'puntos_transferidos', 'ofertante', 'demandante']
    list_filter = ['fecha_exito']
    search_fields = ['ofertante__usuario__nombre_completo', 'demandante__usuario__nombre_completo']
    readonly_fields = ['id_transaccion', 'fecha_exito']


class HistorialAdmin(admin.ModelAdmin):
    list_display = ['vecino', 'total_intercambios', 'es_inalterable']
    search_fields = ['vecino__usuario__nombre_completo']
    filter_horizontal = ['transacciones']


admin.site.register(Transaccion, TransaccionAdmin)
admin.site.register(Historial, HistorialAdmin)