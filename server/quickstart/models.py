from django.db import models

# Create your models here.
class Game(models.Model):
    player = models.ForeignKey('auth.User', on_delete=models.CASCADE)
    time_ms = models.IntegerField()
    rounds_to_play = models.IntegerField()
    score = models.FloatField(default=10000.0)

    def __str__(self):
        return self.player.username + " - " + str(self.time_ms) + "ms in " + str(self.rounds_to_play) + " rounds"
    