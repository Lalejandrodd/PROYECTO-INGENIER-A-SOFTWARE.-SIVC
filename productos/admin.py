from django.contrib import admin
from .models import Vehiculo, Repuesto, MatrizCompatibilidad, Oferta

admin.site.register(Vehiculo)
admin.site.register(Repuesto)
admin.site.register(MatrizCompatibilidad)
admin.site.register(Oferta)