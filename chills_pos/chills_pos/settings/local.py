from .base import *

DEBUG = True

ALLOWED_HOSTS = ['*']

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': 'chills_pos',
        'HOST': 'localhost',
        'PORT': '5432',
        'USER': 'postgres',
        'PASSWORD': 'a'
    }
}

EMAIL_MOCK_SENDING = True
SMS_MOCK_SENDING = True
HOSTNAME = 'localhost:8000'
