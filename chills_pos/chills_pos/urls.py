"""chills_pos URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.9/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls import url, include
from django.contrib import admin
from djoser.views import SetPasswordView
from rest_framework import routers
from rest_framework_jwt.views import obtain_jwt_token, refresh_jwt_token, \
    verify_jwt_token
from django.views.static import serve

from pos.rest_api.views import SessionView, ProductView, CustomerView, OrderView, ProfileView, UnitView, SalesReportView

# register all rest views here
from pos.views import IndexView, LoginView, CustomerCardsView

rest_router = routers.DefaultRouter()
rest_router.trailing_slash = "/?"  # added to support both / and slashless
rest_router.register(r'session', SessionView, base_name='session')
rest_router.register(r'me', ProfileView, base_name='profile')
rest_router.register(r'product', ProductView, base_name='product')
rest_router.register(r'unit', UnitView, base_name='unit')
rest_router.register(r'customer', CustomerView, base_name='customer')
rest_router.register(r'order', OrderView, base_name='order')
rest_router.register(r'report/sales',SalesReportView, base_name='report')

urlpatterns = [
    # url(r'^$', RedirectView.as_view(url='/api/v1/')),
    url(r'^admin/', admin.site.urls),
    url(r'^api-auth/', include('rest_framework.urls',
                               namespace='rest_framework')),
    url(r'^api/v1/me/password', SetPasswordView.as_view()),
    url(r'^api/v1/', include(rest_router.urls, namespace='rest_api')),
    url(r'^token/auth/', obtain_jwt_token),
    url(r'^token/refresh/', refresh_jwt_token),
    url(r'^token/verify/', verify_jwt_token),
    url(r'^$', IndexView.as_view(), name='index'),
    url(r'^login/$', LoginView.as_view(), name="login"),
    url(r'^customer-cards/$', CustomerCardsView.as_view(), name="customer-cards"),
]

if settings.DEBUG:
    urlpatterns.append(
        url(r'^media/(.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    )

