# apps/usuarios/admin.py
from django.contrib import admin
from .models import Usuario, Vecino, Admin

admin.site.register(Usuario)
admin.site.register(Vecino)
admin.site.register(Admin)

