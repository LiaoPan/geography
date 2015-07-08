# -*- coding: utf-8 -*-
import os
import dj_database_url

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

DATA_DIR = os.environ.get('PROSO_DATA_DIR', os.path.join(BASE_DIR, 'data'))
MEDIA_DIR = os.environ.get('PROSO_MEDIA_DIR', DATA_DIR)
MEDIA_URL = '/media/'

SECRET_KEY = os.getenv('PROSO_SECRET_KEY', 'really secret key')

ON_PRODUCTION = False
ON_STAGING = False

if os.environ.get('PROSO_ON_PRODUCTION', False):
    ON_PRODUCTION = True
if os.environ.get('PROSO_ON_STAGING', False):
    ON_STAGING = True

if ON_PRODUCTION:
    DEBUG = False
else:
    DEBUG = True

TEMPLATE_DEBUG = DEBUG

ALLOWED_HOSTS = ['anatom.cz']


# Application definition

INSTALLED_APPS = (
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'flatblocks',
    'lazysignup',
    'proso_ab',
    'proso_common',
    'proso_models',
    'proso_questions',
    'proso_user',
    'proso_feedback',
    'proso_flashcards',
    'social_auth',
    'geography',
)

MIDDLEWARE_CLASSES = (
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.auth.middleware.SessionAuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'proso.django.request.RequestMiddleware',
    'proso_ab.models.ABMiddleware',
    'proso.django.cache.RequestCacheMiddleware',
    'proso.django.log.RequestLogMiddleware',
    'debug_toolbar.middleware.DebugToolbarMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'geography.middleware.LanguageInPathMiddleware',
)

ROOT_URLCONF = 'geography.urls'

WSGI_APPLICATION = 'geography.wsgi.application'


# Database
# https://docs.djangoproject.com/en/1.7/ref/settings/#databases
if ON_PRODUCTION or ON_STAGING:
    DATABASES = {
        'default': {
            'ENGINE': os.environ.get('PROSO_DATABASE_ENGINE', 'django.db.backends.postgresql_psycopg2'),
            'OPTIONS': {
                'options': "-c search_path=%s" % os.environ.get('PROSO_DATABASE_SCHEMA', 'public')
            },
            'NAME': os.environ['PROSO_DATABASE_NAME'],
            'USER': os.environ['PROSO_DATABASE_USER'],
            'PASSWORD': os.environ['PROSO_DATABASE_PASSWORD'],
            'HOST': os.environ['PROSO_DATABASE_HOST'],
            'PORT': os.environ['PROSO_DATABASE_PORT'],
        },
        'old': {
            'ENGINE': os.environ.get('GEOGRAPHY_DATABASE_ENGINE', 'django.db.backends.mysql'),
            'NAME': os.environ.get('GEOGRAPHY_DATABASE_NAME', 'geography'),
            'USER': os.environ.get('GEOGRAPHY_DATABASE_USER', 'geography'),
            'PASSWORD': os.environ.get('GEOGRAPHY_DATABASE_PASSWORD', 'geography'),
            'HOST': os.environ.get('GEOGRAPHY_DATABASE_HOST', 'localhost'),
            'PORT': os.environ.get('GEOGRAPHY_DATABASE_PORT', None),
        }
    }
else:
    DATABASES = {
        'default': dj_database_url.config(),
    }

# Internationalization
# https://docs.djangoproject.com/en/1.7/topics/i18n/

LANGUAGE_CODE = 'cs'

LANGUAGES = (
    ('cs', 'Česky'),
    ('en', 'English'),
    ('es', 'Español'),
)

LOCALE_PATHS = (
    os.path.join(BASE_DIR, 'conf', 'locale'),
)

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.7/howto/static-files/

STATIC_ROOT = os.path.join(BASE_DIR, 'static')
STATIC_URL = '/static/'

STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
)

STATICFILES_DIRS = (
    os.path.join(BASE_DIR, 'geography', 'static'),
    os.path.join(BASE_DIR, 'proso_mnemonics', 'static'),
)

AUTHENTICATION_BACKENDS = (
    'django.contrib.auth.backends.ModelBackend',
    'lazysignup.backends.LazySignupBackend',
    'social_auth.backends.facebook.FacebookBackend',
    'social_auth.backends.google.GoogleOAuth2Backend',
)

FACEBOOK_APP_ID = os.getenv('PROSO_FACEBOOK_APP_ID', '')
FACEBOOK_API_SECRET = os.getenv('PROSO_FACEBOOK_API_SECRET', '')
FACEBOOK_EXTENDED_PERMISSIONS = ['email']

SOCIAL_AUTH_CREATE_USERS = True
SOCIAL_AUTH_FORCE_RANDOM_USERNAME = False
SOCIAL_AUTH_DEFAULT_USERNAME = 'socialauth_user'
LOGIN_ERROR_URL = '/login/error/'
SOCIAL_AUTH_ERROR_KEY = 'socialauth_error'
SOCIAL_AUTH_RAISE_EXCEPTIONS = False
GOOGLE_OAUTH2_CLIENT_ID = os.getenv('PROSO_GOOGLE_OAUTH2_CLIENT_ID', '')
GOOGLE_OAUTH2_CLIENT_SECRET = os.getenv('PROSO_GOOGLE_OAUTH2_CLIENT_SECRET', '')

# http://stackoverflow.com/questions/22005841/is-not-json-serializable-django-social-auth-facebook-login
SESSION_SERIALIZER='django.contrib.sessions.serializers.PickleSerializer'

LOGIN_REDIRECT_URL = '/'

SOCIAL_AUTH_DEFAULT_USERNAME = 'new_social_auth_user'

SOCIAL_AUTH_UID_LENGTH = 222
SOCIAL_AUTH_NONCE_SERVER_URL_LENGTH = 200
SOCIAL_AUTH_ASSOCIATION_SERVER_URL_LENGTH = 135
SOCIAL_AUTH_ASSOCIATION_HANDLE_LENGTH = 125

EMAIL_HOST = 'localhost'
EMAIL_PORT = 25

LOGGING = {
    'version': 1,
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'filters': ['require_debug_true'],
            'formatter': 'simple'
        },
        'request': {
            'level': 'DEBUG',
            'class': 'proso.django.log.RequestHandler',
            'formatter': 'simple'
        }
    },
    'formatters': {
        'simple': {
            'format': '[%(asctime)s] %(levelname)s "%(message)s"'
        }
    },
    'loggers': {
        'django.request': {
            'handlers': ['console', 'request'],
            'propagate': True,
            'level': 'DEBUG'
        },
        'django.db.backends': {
            'level': 'DEBUG',
            'handlers': ['console'],
        }
    },
    'filters': {
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        }
    },
}

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.filebased.FileBasedCache',
        'LOCATION': os.path.join(DATA_DIR, '.django_cache'),
    }
}

PROSO_CONFIG = {
    'path': os.path.join(BASE_DIR, 'geography', 'proso_config.yaml'),
}
PROSO_FLASHCARDS = {}

TEMPLATE_DIRS = (
    # Put strings here, like "/home/html/django_templates" or "C:/www/django/templates".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    os.path.join(BASE_DIR, 'geography', 'templates'),
)

try:
    from hashes import HASHES
except ImportError:
    HASHES = {}
except SyntaxError:
    HASHES = {}
