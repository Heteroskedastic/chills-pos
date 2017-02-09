# -*- coding: utf-8 -*-
# Generated by Django 1.9.9 on 2017-02-08 10:46
from __future__ import unicode_literals

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import phonenumber_field.modelfields
import pos.models


def forwards_func(apps, schema_editor):
    db_alias = schema_editor.connection.alias
    User = apps.get_model("auth", "User")
    UserProfile = apps.get_model("pos", "UserProfile")
    for user in User.objects.using(db_alias).all():
        try:
            profile = user.profile
        except UserProfile.DoesNotExist:
            UserProfile.objects.create(user=user)


def reverse_func(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('auth', '0007_alter_validators_add_error_messages'),
        ('pos', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserProfile',
            fields=[
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, primary_key=True, related_name='profile', serialize=False, to=settings.AUTH_USER_MODEL)),
                ('birth_date', models.DateField(blank=True, null=True, verbose_name='Date of birth')),
                ('phone_number', phonenumber_field.modelfields.PhoneNumberField(blank=True, max_length=128, null=True, verbose_name='Phone number')),
                ('gender', models.CharField(choices=[('u', 'Unknown'), ('m', 'Male'), ('f', 'Female')], default='u', max_length=1, verbose_name='Gender')),
                ('avatar', models.ImageField(blank=True, null=True, upload_to=pos.models.avatar_file_path_func, verbose_name='Avatar')),
            ],
        ),
        migrations.AlterField(
            model_name='order',
            name='total_price',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=8, verbose_name='Price'),
        ),
        migrations.AlterField(
            model_name='orderitem',
            name='price',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=8, verbose_name='Price'),
        ),
        migrations.RunPython(forwards_func, reverse_func),
    ]
