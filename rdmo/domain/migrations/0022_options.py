# -*- coding: utf-8 -*-
# Generated by Django 1.9 on 2016-10-25 11:32
from __future__ import unicode_literals

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('domain', '0021_options'),
        ('options', '0003_data_migration'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='option',
            name='attribute',
        ),
        migrations.DeleteModel(
            name='Option',
        ),
    ]
