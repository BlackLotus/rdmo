# -*- coding: utf-8 -*-
# Generated by Django 1.11.18 on 2019-01-29 16:18
from __future__ import unicode_literals

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0016_remove_timeframe'),
    ]

    operations = [
        migrations.RenameField(
            model_name='task',
            old_name='text_en',
            new_name='text_lang1',
        ),
        migrations.RenameField(
            model_name='task',
            old_name='title_en',
            new_name='title_lang1',
        ),
    ]
