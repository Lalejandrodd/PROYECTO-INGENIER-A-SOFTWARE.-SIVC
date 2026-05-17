from django.urls import path
from apps.transacciones.views import mi_historial, ranking_general

urlpatterns = [
    path('historial/', mi_historial, name='mi-historial'),
    path('ranking/', ranking_general, name='ranking-general'),
]