from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Game
from django.contrib.auth.models import User
from quickstart.serializer import UserSerializer, GameSerializer

@api_view(['GET'])
def get_users(request):
    users=User.objects.all()
    serializer=UserSerializer(users,many=True)
    return Response(serializer.data)


@api_view(['POST'])
def create_user(request):
    serializer=UserSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status= status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def get_games(request):
    games = Game.objects.all()
    serializer = GameSerializer(games, many=True)
    return Response(serializer.data)

@api_view(['POST'])
def create_game(request):
    serializer = GameSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)