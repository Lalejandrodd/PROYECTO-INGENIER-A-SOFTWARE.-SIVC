from django.db import models
from django.contrib.auth.models import AbstractUser

class Usuario(AbstractUser):
    id_usuario = models.CharField(max_length=50, unique=True)
    nombre_completo = models.CharField(max_length=255)

class Vecino(models.Model):
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE)
    residencia = models.CharField(max_length=255)
    saldo_puntos = models.FloatField(default=0.0)
    ranking = models.IntegerField(default=0)

class Admin(models.Model):
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE)
    nivel_acceso = models.IntegerField(default=1)