from django.conf.urls import patterns, include, url
from django.conf import settings
from django.contrib import admin
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

admin.autodiscover()

js_info_dict = {
    'domain': 'djangojs',
    'packages': ('geography',),
}


urlpatterns = patterns(
    '',
    url(
        r'^media/(?P<path>image/.*)$', 'django.views.static.serve',
        {
            'document_root': settings.MEDIA_ROOT
        }
    ),
    url(r'^$', 'geography.views.home', name='home'),
    url(r'^(about|overview|mistakes|goals|view/\w+|u/\w+|practice/\w+/\w*)',
        'geography.views.home', name='home'),
    url(r'^jsi18n/$', 'geography.views.cached_javascript_catalog', js_info_dict),

    url(r'^user/', include('proso_user.urls')),
    url(r'^questions/', include('proso_questions.urls')),
    url(r'^models/', include('proso_models.urls')),
    url(r'^ab/', include('proso_ab.urls')),
    url(r'^common/', include('proso_common.urls')),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^convert/', include('lazysignup.urls')),
    url(r'^feedback/', include('proso_feedback.urls')),
    url(r'^flashcards/', include('proso_flashcards.urls')),
    url(r'', include('social_auth.urls')),
)
urlpatterns += staticfiles_urlpatterns()
