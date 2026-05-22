from django.urls import path
from apps.ofertas.views import buscar_repuestos, crear_oferta 

urlpatterns = [
    path('buscar/', buscar_repuestos, name='buscar-repuestos'),
    path('crear/', crear_oferta, name='crear-oferta'),
]