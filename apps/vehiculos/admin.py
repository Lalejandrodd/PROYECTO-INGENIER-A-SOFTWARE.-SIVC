from django.contrib import admin
from .models import Marca, Vehiculo

@admin.register(Marca)
class MarcaAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre')
    search_fields = ('nombre',)
    ordering = ('nombre',)

@admin.register(Vehiculo)
class VehiculoAdmin(admin.ModelAdmin):
    list_display = ('id', 'marca', 'modelo', 'anio')
    list_filter = ('marca',)
    search_fields = ('marca__nombre', 'modelo')
    ordering = ('marca__nombre', 'modelo', 'anio')