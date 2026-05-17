from django.urls import path
from apps.ofertas.views import buscar_repuestos

urlpatterns = [
    # Registramos la función directamente
    path('buscar/', buscar_repuestos, name='buscar-repuestos'),
]