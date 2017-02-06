app.controller('PageContentController', function($scope) {

    $scope.$on('$includeContentLoaded', function() {
        Layout.fixContentHeight();
    });
});

app.controller("MainCtrl", function($scope, $rootScope, $http, $window, Utils, SessionService, CustomerService, ProductService) {
    // load current user
    $rootScope.currentUser = {};
    $rootScope.pageLoaded = false;
    $rootScope.$global.Customer = {};
    $rootScope.$global.Product = {};
    $rootScope.$global.Order = {};

    $scope.$on('$viewContentLoaded', function() {
        if ($rootScope.pageLoaded) {
            Index.initCharts();
        }
    });
    SessionService.get(function(response) {
        $rootScope.currentUser = response;
        $rootScope.pageLoaded = true;
        $('body').css('background-image', 'none').removeClass('hide');
        Index.initCharts();
    }, function(response) {
        Utils.showDefaultServerError(response);
    });

    // logout function
    $scope.logout = function() {
        SessionService.delete(function(response) {
            window.location = '/?next=' + window.location.pathname;
        }, function(response) {
            Utils.showDefaultServerError(response)
        });
    };

    $scope.menuActiveIf = function(pageName) {
        return Array.from(arguments).indexOf($rootScope.$state.current.name)>=0? 'active': '';
    };

    $rootScope.loadCustomerCombo = function() {
        if (!$rootScope.$global.Customer.comboData) {
            CustomerService.query({page_size: 0, ordering: 'first_name,last_name', fields: 'id,first_name,last_name,uid,points'}, function(response) {
                $rootScope.$global.Customer.comboData = response.results;
            });
        }
    };

    $rootScope.loadProductCombo = function() {
        if (!$rootScope.$global.Product.comboData) {
            ProductService.query({page_size: 0, ordering: 'name', fields: 'id,name,quantity,upc,part_number,price', active:true}, function(response) {
                $rootScope.$global.Product.comboData = response.results;
            });
        }
    };

});

app.controller("DashboardCtrl", function($scope, $rootScope) {
    // $scope.$on('$viewContentLoaded', function() {
    // });
});

app.controller("MyProfileCtrl", function($scope, $rootScope, $http, Utils, SessionService) {
    $scope.profileForm = {};
    SessionService.get(function(response) {
        $rootScope.currentUser = response;
        $scope.profileForm.first_name = $rootScope.currentUser.first_name;
        $scope.profileForm.last_name = $rootScope.currentUser.last_name;
        $scope.profileForm.email = $rootScope.currentUser.email;
    }, function(response) {
        Utils.showDefaultServerError(response);
    });
    $scope.profileSecretForm = {
    };

    $scope.saveProfileInfo = function(form) {
        var jform = $("form[name="+form.$name+"]");
        if (!jform.valid()) {
            return;
        }
        $('[name=submitBtn]', jform).button('loading')
        $http.put("/api/v1/user/", $scope.profileForm).
        then(function(response) {
            $rootScope.currentUser = response.data.user;
            Utils.showDefaultServerSuccess(response);
        }, function(response) {
            Utils.showDefaultServerError(response);
        }).finally(function() {
            $('[name=submitBtn]', jform).button('reset')
        });
    };
    $scope.changePassword = function(form) {
        var jform = $("form[name="+form.$name+"]");
        if (!jform.valid()) {
            return;
        }
        $('[name=submitBtn]', jform).button('loading');
        var data = {
            old_password: $scope.profileSecretForm.old_password,
            password: $scope.profileSecretForm.password
        };
        $http.put("/api/v1/user/", data).
        then(function(response) {
            $scope.profileSecretForm = {};
            Utils.showDefaultServerSuccess(response);
        }, function(response) {
            Utils.showDefaultServerError(response);
        }).finally(function() {
            $('[name=submitBtn]', jform).button('reset')
        });

    };
});

/******************************************************************
********************* Product controllers *****************
*******************************************************************/

app.controller("ProductListCtrl", function($scope, $rootScope, $state, $stateParams, ProductService, Utils, GeneralUiGrid) {
    $scope.loadingGrid = false;
    $scope.sortingOptions = null;
    $scope.filteringOptions = [];
    $scope.paginationOptions = {
        page: 1
    };
    if (!$rootScope.$global.Product) {
        $rootScope.$global.Product = {}
    }

    var initialized = true,
        $global = $rootScope.$global.Product;
    if (!$global.gridOptions) {
        initialized = false;
        $global.gridOptions = {
            paginationPageSizes: [10],
            paginationPageSize: 10,
            useExternalPagination: true,
            useExternalSorting: true,
            rowHeight: 35,
            columnDefs: [
                {name: 'id', 'displayName': 'ID', width: 60,
                    cellTemplate: '<div class="ui-grid-cell-contents ng-binding ng-scope"><a class="text text-primary" href="{{grid.appScope.$state.href(\'product-edit\', {id: row.entity.id})}}">{{row.entity.id}}</a></div>'
                },
                {name: 'name', 'displayName': 'Name',
                    cellTemplate: '<div class="ui-grid-cell-contents ng-binding ng-scope"><a class="text text-primary" href="{{grid.appScope.$state.href(\'product-edit\', {id: row.entity.id})}}">{{row.entity.name}}</a></div>'
                },
                {name: 'upc', 'displayName': 'UPC'},
                {name: 'part_number', 'displayName': 'Part Number'},
                {name: 'reorder_limit', 'displayName': 'Re-order Limit'},
                {name: 'quantity', 'displayName': 'Quantity'},
                {name: 'price', 'displayName': 'Price', cellFilter: 'currency'},
                {name: 'purchase_price', 'displayName': 'Purchase Price', cellFilter: 'currency'},
                {name: 'active', 'displayName': 'Enabled?',
                    cellTemplate: '<div class="ui-grid-cell-contents ng-binding ng-scope fa" ng-class="{true:\'fa-check text-success\', false:\'fa-close text-danger\'}[row.entity.active==true]"></div>'
                }
            ]
            // onRegisterApi: GeneralUiGrid.onRegisterApi($scope)
        };
    }
    $global.gridOptions.onRegisterApi = GeneralUiGrid.onRegisterApi($scope);
    $scope.getPage = GeneralUiGrid.getPage($scope, ProductService, $global.gridOptions);
    if (!initialized) {
        $scope.getPage();
    }

    $scope.getDisplayType = function(type) {
        var choice = $global.typeChoices.filter(function(v) {
            return v.value==type
        })[0];
        return choice? choice.display_name: type;
    };
});

app.controller("ProductNewCtrl", function($scope, $rootScope, $state,$stateParams, ProductService, Utils) {
    var $global = $rootScope.$global.Product;
    $scope.selectedRecord = new ProductService({quantity: 0, reorder_limit: 0, active: true});
    $scope.addRecord = function() {
        $scope.saving = true;
        $scope.selectedRecord.$save().then(function(response) {
            if ($global && $global.gridOptions) {
                $global.gridOptions.data.splice(0, 0, response);
            }
            $rootScope.$global.Product.comboData = undefined;
            $state.go('product-list');
            Utils.showDefaultServerSuccess(response);
        }, function(response) {
            Utils.showDefaultServerError(response);
        }).finally(function() {
            $scope.saving = false;
        });
    };
});

app.controller("ProductEditCtrl", function($scope, $rootScope, $state,$stateParams, ProductService, Utils, $uibModal) {
    var $global = $rootScope.$global.Product;

    $scope.showDeleteConfirm = function() {
        if (!$scope.selectedRecord) {
            return;
        }
        var id = $scope.selectedRecord.id;
        var data = $global.gridOptions? $global.gridOptions.data: [];
        var idx = Utils.findByProperty(data, 'id', id),
            gridOptions = $global.gridOptions;

        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: 'app/partials/confirm-modal.html',
            controller: function($scope, $uibModalInstance, Utils) {
                $scope.selectedId = id;
                $scope.deleting = false;
                $scope.removeRecord = function () {
                    $scope.deleting = true;
                    ProductService.delete({id: $scope.selectedId}, function(response) {
                        if (idx >= 0) {
                            gridOptions.data.splice(idx, 1);
                        }
                        $rootScope.$global.Product.comboData = undefined;
                        Utils.showDefaultServerSuccess(response);
                        $uibModalInstance.close();
                        $state.go('product-list');
                    }, function(response) {
                        Utils.showDefaultServerError(response);
                    }).$promise.finally(function() {
                        $scope.deleting = false;
                    })

                };
                $scope.cancelRemove = function () {
                    $uibModalInstance.dismiss('cancel');
                };
            }
        });
    };

    $scope.updateRecord = function() {
        if (!$scope.selectedRecord) {
            return;
        }
        $scope.saving = true;
        $scope.selectedRecord.$update().then(function(response) {
            var data = $global.gridOptions? $global.gridOptions.data: [];
            var idx = Utils.findByProperty(data, 'id', response.id);
            if (idx >= 0) {
                $global.gridOptions.data[idx] = response;
            }
            $rootScope.$global.Product.comboData = undefined;
            $state.go('product-list');
            Utils.showDefaultServerSuccess(response);
        }, function(response) {
            Utils.showDefaultServerError(response);
        }).finally(function() {
            $scope.saving = false;
        });
    };
    $scope.loadRecord=function() {
        ProductService.get({id: $stateParams.id}, function(record) {
            $scope.selectedRecord = record;
        }, function(response) {
            Utils.showDefaultServerError(response);
            $state.go('product-list');
        });
    };
    $scope.loadRecord();
});

/******************************************************************
********************* Customer controllers *****************
*******************************************************************/

app.controller("CustomerListCtrl", function($scope, $rootScope, $state, $stateParams, CustomerService, Utils, GeneralUiGrid) {
    $scope.loadingGrid = false;
    $scope.sortingOptions = null;
    $scope.filteringOptions = [];
    $scope.paginationOptions = {
        page: 1
    };
    if (!$rootScope.$global.Customer) {
        $rootScope.$global.Customer = {}
    }

    var initialized = true,
        $global = $rootScope.$global.Customer;
    if (!$global.gridOptions) {
        initialized = false;
        $global.gridOptions = {
            paginationPageSizes: [10],
            paginationPageSize: 10,
            useExternalPagination: true,
            useExternalSorting: true,
            rowHeight: 35,
            columnDefs: [
                {name: 'id', 'displayName': 'ID', width: 60,
                    cellTemplate: '<div class="ui-grid-cell-contents ng-binding ng-scope"><a class="text text-primary" href="{{grid.appScope.$state.href(\'customer-edit\', {id: row.entity.id})}}">{{row.entity.id}}</a></div>'
                },
                {name: 'first_name', 'displayName': 'First Name',
                    cellTemplate: '<div class="ui-grid-cell-contents ng-binding ng-scope"><a class="text text-primary" href="{{grid.appScope.$state.href(\'customer-edit\', {id: row.entity.id})}}">{{row.entity.first_name}}</a></div>'
                },
                {name: 'last_name', 'displayName': 'Last Name',
                    cellTemplate: '<div class="ui-grid-cell-contents ng-binding ng-scope"><a class="text text-primary" href="{{grid.appScope.$state.href(\'customer-edit\', {id: row.entity.id})}}">{{row.entity.last_name}}</a></div>'
                },
                {name: 'uid', 'displayName': 'UID'},
                {name: 'points', 'displayName': 'Points'},
            ]
            // onRegisterApi: GeneralUiGrid.onRegisterApi($scope)
        };
    }
    $global.gridOptions.onRegisterApi = GeneralUiGrid.onRegisterApi($scope);
    $scope.getPage = GeneralUiGrid.getPage($scope, CustomerService, $global.gridOptions);
    if (!initialized) {
        $scope.getPage();
    }

    $scope.getDisplayType = function(type) {
        var choice = $global.typeChoices.filter(function(v) {
            return v.value==type
        })[0];
        return choice? choice.display_name: type;
    };
});

app.controller("CustomerNewCtrl", function($scope, $rootScope, $state,$stateParams, CustomerService, Utils) {
    var $global = $rootScope.$global.Customer;
    $scope.selectedRecord = new CustomerService({quantity: 0, reorder_limit: 0, active: true});
    $scope.addRecord = function() {
        $scope.saving = true;
        $scope.selectedRecord.$save().then(function(response) {
            if ($global && $global.gridOptions) {
                $global.gridOptions.data.splice(0, 0, response);
            }
            $rootScope.$global.Customer.comboData = undefined;
            $state.go('customer-list');
            Utils.showDefaultServerSuccess(response);
        }, function(response) {
            Utils.showDefaultServerError(response);
        }).finally(function() {
            $scope.saving = false;
        });
    };
});

app.controller("CustomerEditCtrl", function($scope, $rootScope, $state,$stateParams, CustomerService, Utils, $uibModal) {
    var $global = $rootScope.$global.Customer;

    $scope.showDeleteConfirm = function() {
        if (!$scope.selectedRecord) {
            return;
        }
        var id = $scope.selectedRecord.id;
        var data = $global.gridOptions? $global.gridOptions.data: [];
        var idx = Utils.findByProperty(data, 'id', id),
            gridOptions = $global.gridOptions;

        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: 'app/partials/confirm-modal.html',
            controller: function($scope, $uibModalInstance, Utils) {
                $scope.selectedId = id;
                $scope.deleting = false;
                $scope.removeRecord = function () {
                    $scope.deleting = true;
                    CustomerService.delete({id: $scope.selectedId}, function(response) {
                        if (idx >= 0) {
                            gridOptions.data.splice(idx, 1);
                        }
                        $rootScope.$global.Customer.comboData = undefined;
                        Utils.showDefaultServerSuccess(response);
                        $uibModalInstance.close();
                        $state.go('customer-list');
                    }, function(response) {
                        Utils.showDefaultServerError(response);
                    }).$promise.finally(function() {
                        $scope.deleting = false;
                    })

                };
                $scope.cancelRemove = function () {
                    $uibModalInstance.dismiss('cancel');
                };
            }
        });
    };

    $scope.updateRecord = function() {
        if (!$scope.selectedRecord) {
            return;
        }
        $scope.saving = true;
        $scope.selectedRecord.$update().then(function(response) {
            var data = $global.gridOptions? $global.gridOptions.data: [];
            var idx = Utils.findByProperty(data, 'id', response.id);
            if (idx >= 0) {
                $global.gridOptions.data[idx] = response;
            }
            $rootScope.$global.Customer.comboData = undefined;
            $state.go('customer-list');
            Utils.showDefaultServerSuccess(response);
        }, function(response) {
            Utils.showDefaultServerError(response);
        }).finally(function() {
            $scope.saving = false;
        });
    };
    $scope.loadRecord=function() {
        CustomerService.get({id: $stateParams.id}, function(record) {
            $scope.selectedRecord = record;
        }, function(response) {
            Utils.showDefaultServerError(response);
            $state.go('customer-list');
        });
    };
    $scope.loadRecord();
});

/******************************************************************
********************* Order controllers *****************
*******************************************************************/

app.controller("OrderListCtrl", function($scope, $rootScope, $state, $stateParams, OrderService, Utils, GeneralUiGrid) {
    $scope.loadingGrid = false;
    $scope.sortingOptions = null;
    $scope.filteringOptions = [];
    $scope.paginationOptions = {
        page: 1
    };
    if (!$rootScope.$global.Order) {
        $rootScope.$global.Order = {}
    }

    var initialized = true,
        $global = $rootScope.$global.Order;
    if (!$global.gridOptions) {
        initialized = false;
        $global.gridOptions = {
            paginationPageSizes: [10],
            paginationPageSize: 10,
            useExternalPagination: true,
            useExternalSorting: true,
            rowHeight: 35,
            columnDefs: [
                {name: 'id', 'displayName': 'ID', width: 60,
                    cellTemplate: '<div class="ui-grid-cell-contents ng-binding ng-scope"><a class="text text-primary" href="{{grid.appScope.$state.href(\'order-edit\', {id: row.entity.id})}}">{{row.entity.id}}</a></div>'
                },
                {name: 'customer', 'displayName': 'Customer',
                    cellTemplate: '<div class="ui-grid-cell-contents ng-binding ng-scope"><a class="text text-primary" href="{{grid.appScope.$state.href(\'order-edit\', {id: row.entity.id})}}">{{row.entity._customer.first_name + " " + row.entity._customer.first_name }}</a></div>'
                },
                {name: 'total_items', 'displayName': 'Total Items'},
                {name: 'total_quantity', 'displayName': 'Total Quantity'},
                {name: 'total_price', 'displayName': 'Total Price', cellFilter: 'currency'},
                {name: 'create_datetime', 'displayName': 'Created At', cellFilter: 'date: "MMM dd yyyy hh:mm a"'},
                {name: 'status', 'displayName': 'Status'}

            ]
            // onRegisterApi: GeneralUiGrid.onRegisterApi($scope)
        };
    }
    $global.gridOptions.onRegisterApi = GeneralUiGrid.onRegisterApi($scope);
    $scope.getPage = GeneralUiGrid.getPage($scope, OrderService, $global.gridOptions);
    if (!initialized) {
        $scope.getPage();
    }

    $scope.getDisplayType = function(type) {
        var choice = $global.typeChoices.filter(function(v) {
            return v.value==type
        })[0];
        return choice? choice.display_name: type;
    };
});

app.controller("OrderNewCtrl", function($scope, $rootScope, $state,$stateParams, OrderService, Utils, UiUtils, $timeout) {
    var $global = $rootScope.$global.Order;
    $scope.selectedRecord = new OrderService({order_items: [{quantity: 1}]});
    $scope.getPriceSum = UiUtils.getOrderItemPriceSum($scope, $rootScope);
    $scope.insertAfter = function (idx) {
        if (idx == undefined) {
            $scope.selectedRecord.order_items.push({quantity: 1});
        } else {
            $scope.selectedRecord.order_items.splice(idx+1, 0, {quantity: 1});
        }
    };
    $scope.focusFirstProduct = function() {
        $timeout(function () {
            angular.element('table [name=order_item_product]:first input.ui-select-focusser').focus();
        });
    };
    $scope.focusQuantity = function($event) {
        $timeout(function () {
            angular.element($event.target).parents('tr').find('input[name=order_item_quantity]').focus();
        });
    };
    $rootScope.loadProductCombo();
    $rootScope.loadCustomerCombo();
    $scope.$broadcast('OrderCustomerFocus');
    $scope.addRecord = function() {
        $scope.saving = true;
        $scope.selectedRecord.$save().then(function(response) {
            if ($global && $global.gridOptions) {
                $global.gridOptions.data.splice(0, 0, response);
            }
            $rootScope.$global.Order.comboData = undefined;
            $state.go('order-list');
            Utils.showDefaultServerSuccess(response);
        }, function(response) {
            Utils.showDefaultServerError(response);
        }).finally(function() {
            $scope.saving = false;
        });
    };
});

app.controller("OrderEditCtrl", function($scope, $rootScope, $state,$stateParams, OrderService, Utils, UiUtils, $uibModal, $timeout) {
    var $global = $rootScope.$global.Order;
    $rootScope.loadProductCombo();
    $rootScope.loadCustomerCombo();
    $scope.getPriceSum = UiUtils.getOrderItemPriceSum($scope, $rootScope);
    $scope.insertAfter = function (idx) {
        if (idx == undefined) {
            $scope.selectedRecord.order_items.push({quantity: 1});
        } else {
            $scope.selectedRecord.order_items.splice(idx+1, 0, {quantity: 1});
        }
    };
    $scope.focusFirstProduct = function() {
        $timeout(function () {
            angular.element('table [name=order_item_product]:first input.ui-select-focusser').focus();
        });
    };
    $scope.focusQuantity = function($event) {
        $timeout(function () {
            angular.element($event.target).parents('tr').find('input[name=order_item_quantity]').focus();
        });
    };
    $scope.showDeleteConfirm = function() {
        if (!$scope.selectedRecord) {
            return;
        }
        var id = $scope.selectedRecord.id;
        var data = $global.gridOptions? $global.gridOptions.data: [];
        var idx = Utils.findByProperty(data, 'id', id),
            gridOptions = $global.gridOptions;

        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: 'app/partials/confirm-modal.html',
            controller: function($scope, $uibModalInstance, Utils) {
                $scope.selectedId = id;
                $scope.deleting = false;
                $scope.removeRecord = function () {
                    $scope.deleting = true;
                    OrderService.delete({id: $scope.selectedId}, function(response) {
                        if (idx >= 0) {
                            gridOptions.data.splice(idx, 1);
                        }
                        $rootScope.$global.Order.comboData = undefined;
                        Utils.showDefaultServerSuccess(response);
                        $uibModalInstance.close();
                        $state.go('order-list');
                    }, function(response) {
                        Utils.showDefaultServerError(response);
                    }).$promise.finally(function() {
                        $scope.deleting = false;
                    })

                };
                $scope.cancelRemove = function () {
                    $uibModalInstance.dismiss('cancel');
                };
            }
        });
    };

    $scope.updateRecord = function() {
        if (!$scope.selectedRecord) {
            return;
        }
        $scope.saving = true;
        $scope.selectedRecord.$update().then(function(response) {
            var data = $global.gridOptions? $global.gridOptions.data: [];
            var idx = Utils.findByProperty(data, 'id', response.id);
            if (idx >= 0) {
                $global.gridOptions.data[idx] = response;
            }
            $rootScope.$global.Order.comboData = undefined;
            $state.go('order-list');
            Utils.showDefaultServerSuccess(response);
        }, function(response) {
            Utils.showDefaultServerError(response);
        }).finally(function() {
            $scope.saving = false;
        });
    };
    $scope.loadRecord=function() {
        OrderService.get({id: $stateParams.id}, function(record) {
            $scope.selectedRecord = record;
        }, function(response) {
            Utils.showDefaultServerError(response);
            $state.go('order-list');
        });
    };
    $scope.loadRecord();
});
