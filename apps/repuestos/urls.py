from django.urls import path
from . import views

urlpatterns = [
    path('', views.listar_repuestos, name='listar-repuestos'),
    path('crear/', views.crear_repuesto, name='crear-repuesto'),
]