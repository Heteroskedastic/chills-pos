var app = angular.module("chillsPos", ['ui.router', 'ngResource', 'ngAnimate', 'ui.bootstrap', 'ui.grid', 'ui.grid.pagination', 'ui.select', 'ngSanitize', 'oc.lazyLoad']);

app.config(function($stateProvider, $urlRouterProvider) {
    // $urlRouterProvider.otherwise("/dashboard");
    $urlRouterProvider.otherwise(function ($injector, $location) {
        var $state = $injector.get('$state'),
            $rootScope = $injector.get('$rootScope');
        if ($rootScope.isCheckoutOnlyUser()) {
            $state.go('order-new', undefined, {location: 'replace'});
        } else {
            $state.go('dashboard', undefined, {location: 'replace'});
        }
    });
    $stateProvider
    .state('dashboard', {
        url: "/dashboard",
        templateUrl : 'app/partials/pages/dashboard.html',
        data: {
            pageInfo: {
                title: 'Dashboard',
                titleDesc: 'reports & statistics'
            }
        },
        controller  : 'DashboardCtrl'
    }).state('myprofile', {
        url: "/myprofile",
        templateUrl : 'app/partials/pages/myprofile.html',
        data: {
            pageInfo: {
                title: 'My Profile',
                titleDesc: 'user account info'
            }
        },
        controller  : 'MyProfileCtrl'
    }).state('product-list', {
        url: "/product/list",
        templateUrl : 'app/partials/pages/product/list.html',
        data: {
            pageInfo: {
                title: 'Products Inventory',
                titleDesc: 'list of products'
            }
        },
        controller  : 'ProductListCtrl'
    }).state('product-new', {
        url: "/product/new",
        templateUrl : 'app/partials/pages/product/new.html',
        data: {
            pageInfo: {
                title: 'New Product',
                titleDesc: 'add a new product',
                back: 'product-list'
            }
        },
        controller  : 'ProductNewCtrl'
    }).state('product-edit', {
        url: "/product/:id/edit",
        templateUrl : 'app/partials/pages/product/edit.html',
        data: {
            pageInfo: {
                title: 'Edit Product',
                titleDesc: 'edit an existing product',
                back: 'product-list'
            }
        },
        controller  : 'ProductEditCtrl'
    }).state('unit-list', {
        url: "/unit/list",
        templateUrl : 'app/partials/pages/unit/list.html',
        data: {
            pageInfo: {
                title: 'Units',
                titleDesc: 'list of units'
            }
        },
        controller  : 'UnitListCtrl'
    }).state('unit-new', {
        url: "/unit/new",
        templateUrl : 'app/partials/pages/unit/new.html',
        data: {
            pageInfo: {
                title: 'New Unit',
                titleDesc: 'add a new unit',
                back: 'unit-list'
            }
        },
        controller  : 'UnitNewCtrl'
    }).state('unit-edit', {
        url: "/unit/:id/edit",
        templateUrl : 'app/partials/pages/unit/edit.html',
        data: {
            pageInfo: {
                title: 'Edit Unit',
                titleDesc: 'edit an existing unit',
                back: 'unit-list'
            }
        },
        controller  : 'UnitEditCtrl'
    }).state('customer-list', {
        url: "/customer/list",
        templateUrl : 'app/partials/pages/customer/list.html',
        data: {
            pageInfo: {
                title: 'Customers',
                titleDesc: 'list of customers'
            }
        },
        controller  : 'CustomerListCtrl'
    }).state('customer-new', {
        url: "/customer/new",
        templateUrl : 'app/partials/pages/customer/new.html',
        data: {
            pageInfo: {
                title: 'New Customer',
                titleDesc: 'add a new customer',
                back: 'customer-list'
            }
        },
        controller: 'CustomerNewCtrl',
        resolve: {
            lazyLoad: ['$ocLazyLoad', function ($ocLazyLoad) {
                return $ocLazyLoad.load({
                    files: [
                        '/static/assets/global/plugins/qrcode.js',
                        '/static/assets/global/plugins/angular-qrcode.js'
                    ]
                });
            }]
        }
    }).state('customer-edit', {
        url: "/customer/:id/edit",
        templateUrl : 'app/partials/pages/customer/edit.html',
        data: {
            pageInfo: {
                title: 'Edit Customer',
                titleDesc: 'edit an existing customer',
                back: 'customer-list'
            }
        },
        controller  : 'CustomerEditCtrl',
        resolve: {
            lazyLoad: ['$ocLazyLoad', function ($ocLazyLoad) {
                return $ocLazyLoad.load({
                    files: [
                        'assets/global/plugins/qrcode.js',
                        'assets/global/plugins/angular-qrcode.js'
                    ]
                });
            }]
        }
    }).state('order-list', {
        url: "/order/list",
        templateUrl : 'app/partials/pages/order/list.html',
        data: {
            pageInfo: {
                title: 'Orders',
                titleDesc: 'list of orders'
            }
        },
        controller  : 'OrderListCtrl'
    }).state('order-new', {
        url: "/order/new",
        templateUrl : 'app/partials/pages/order/new.html',
        data: {
            pageInfo: {
                title: 'New Order',
                titleDesc: 'add a new order',
                back: 'order-list'
            }
        },
        controller  : 'OrderNewCtrl'
    }).state('order-edit', {
        url: "/order/:id/edit",
        templateUrl : 'app/partials/pages/order/edit.html',
        data: {
            pageInfo: {
                title: 'Edit Order',
                titleDesc: 'edit an existing order',
                back: 'order-list'
            }
        },
        controller  : 'OrderEditCtrl'
    }).state('report-sales', {
        url: "/reports/sales/",
        templateUrl : 'app/partials/pages/reports/sales.html',
        data: {
            pageInfo: {
                title: 'Sales Report',
                titleDesc: 'report of order item sales',
                back: 'dashboard'
            }
        },
        controller: 'SalesReportCtrl'
    });
});

app.config(['$controllerProvider', '$httpProvider', function($controllerProvider, $httpProvider) {
    $controllerProvider.allowGlobals();

    $.ajaxSetup({
        headers: { "X-CSRFToken": getCookie("csrftoken") }
    });
    function getCookie(c_name) {
        if (document.cookie.length > 0)
        {
            c_start = document.cookie.indexOf(c_name + "=");
            if (c_start != -1)
            {
                c_start = c_start + c_name.length + 1;
                c_end = document.cookie.indexOf(";", c_start);
                if (c_end == -1) c_end = document.cookie.length;
                return unescape(document.cookie.substring(c_start,c_end));
            }
        }
        return "";
    }
    $httpProvider.defaults.xsrfCookieName = 'csrftoken';
    $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
}]);


/* Init global settings and run the app */
app.run(["$rootScope", "$state", function($rootScope, $state) {
    $rootScope.$state = $state; // state to be accessed from view
    $rootScope.$global = {};
    $rootScope.$on('$stateChangeStart', function(evt, to, params) {
        if (to.redirectTo) {
            evt.preventDefault();
            $state.go(to.redirectTo, params, {location: 'replace'})
        }
    });
    $rootScope.isCheckoutOnlyUser = function () {
        if (!$rootScope.currentUser.groups) {
            return false;
        }
        if ($rootScope.__isCheckoutOnlyUser === undefined) {
            var CHECKOUT_ONLY_GROUP = "checkout only";
            $rootScope.__isCheckoutOnlyUser = $rootScope.currentUser.groups.find(function(g) {
                return g.name.toLowerCase() === CHECKOUT_ONLY_GROUP;
            }) !== undefined;
        }
        return $rootScope.__isCheckoutOnlyUser;

    };
    $rootScope.hasAuthority = function(auth) {
        if ($rootScope.isCheckoutOnlyUser()) {
            return auth === 'view_order';
        }
        return true;
    }
}]);
