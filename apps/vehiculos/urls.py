from django.urls import path
from apps.vehiculos.views import listar_vehiculos

urlpatterns = [
    path('', listar_vehiculos, name='listar-vehiculos'),
]