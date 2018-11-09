DEBUG = False

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
HOSTNAME = 'store.cinnamonhills.org'
