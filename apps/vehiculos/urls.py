from django.urls import path
from apps.repuestos import views
from . import views 

urlpatterns = [
    path('', views.listar_vehiculos, name='listar-vehiculos'),
    path('marcas/', views.listar_marcas, name='listar-marcas'),
]