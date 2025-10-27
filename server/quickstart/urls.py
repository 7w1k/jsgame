from django.urls import include, path

from quickstart.views import get_users, create_user, get_games, create_game



# Wire up our API using automatic URL routing.
# Additionally, we include login URLs for the browsable API.
urlpatterns = [
    path('users/',get_users,name='get_user'),
    path('users/create/',create_user,name='create_user'),
    path('games/',get_games,name='get_games'),
    path('games/create/',create_game,name='create_game'),
]