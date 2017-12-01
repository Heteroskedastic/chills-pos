DEBUG = False

ALLOWED_HOSTS = ['*']

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': 'chills_pos',
        'HOST': 'heteroskedasticprod.c704tm2jtvlo.us-west-2.rds.amazonaws.com',
        'PORT': '5432',
        'USER': 'appuser',
        'PASSWORD': 'kHVNCq4koRp3jjN'
    }
}
HOSTNAME = 'store.cinnamonhills.org'
