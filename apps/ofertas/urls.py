from django.urls import path
from apps.ofertas.views import buscar_repuestos, crear_oferta, postular_ayuda, aceptar_ayuda, rechazar_ayuda
from django.urls import path
from .views import buscar_repuestos, crear_oferta, listar_urgencias_tablon, resolver_emergencia

urlpatterns = [
    path('buscar/', buscar_repuestos, name='buscar-repuestos'),
    path('crear/', crear_oferta, name='crear-oferta'),
    path('urgencias/', listar_urgencias_tablon, name='listar-urgencias-tablon'),
    path('resolver-emergencia/<int:id_urgencia>/', resolver_emergencia  , name='resolver-emergencia'),
    path('urgencias/postular-ayuda/<int:urgencia_id>/', postular_ayuda, name='postular-ayuda'),
    path('urgencias/aceptar-ayuda/<int:urgencia_id>/', aceptar_ayuda, name='aceptar-ayuda'),
    path('urgencias/rechazar-ayuda/<int:urgencia_id>/', rechazar_ayuda, name='rechazar-ayuda'),  

]