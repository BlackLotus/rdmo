# -*- coding: utf-8 -*-
# Generated by Django 1.11.18 on 2019-01-30 14:21
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0018_rename_de_to_lang2'),
    ]

    operations = [
        migrations.AlterField(
            model_name='task',
            name='text_lang1',
            field=models.TextField(help_text='The text for this task in the primary language.', verbose_name='Text (en)'),
        ),
        migrations.AlterField(
            model_name='task',
            name='text_lang2',
            field=models.TextField(help_text='The text for this task in the secondary language.', verbose_name='Text (de)'),
        ),
        migrations.AlterField(
            model_name='task',
            name='title_lang1',
            field=models.CharField(help_text='The title for this task in the primary language.', max_length=256, verbose_name='Title (en)'),
        ),
        migrations.AlterField(
            model_name='task',
            name='title_lang2',
            field=models.CharField(help_text='The title for this task in the secondary language.', max_length=256, verbose_name='Title (de)'),
        ),
    ]
