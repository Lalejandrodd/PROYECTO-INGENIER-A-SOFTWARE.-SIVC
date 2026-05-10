from django.contrib import admin
from .models import Transaccion, Historial

admin.site.register(Transaccion)
admin.site.register(Historial)