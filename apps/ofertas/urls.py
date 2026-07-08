from django.urls import path
from apps.ofertas.views import buscar_repuestos, crear_oferta, registrar_oferta, detalle_oferta

urlpatterns = [
    path('buscar/', buscar_repuestos, name='buscar-repuestos'),
    path('crear/', crear_oferta, name='crear-oferta'),
    path('registrar/', registrar_oferta, name='registrar-oferta'),
    path('oferta/<uuid:id_inventario>/', detalle_oferta, name='detalle-oferta'),
]