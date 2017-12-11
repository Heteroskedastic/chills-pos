app.controller('PageContentController', function($scope) {

    $scope.$on('$includeContentLoaded', function() {
        Layout.fixContentHeight();
    });
});

app.controller("MainCtrl", function($scope, $rootScope, $http, $window, Utils, SessionService, ProfileService, CustomerService, ProductService, UnitService) {
    // load current user
    $rootScope.currentUser = {};
    $rootScope.pageLoaded = false;
    $rootScope.$global.Unit = {};
    $rootScope.$global.Customer = {};
    $rootScope.$global.Product = {
        typesComboData: [{title: 'Needs', value: 'needs'}, {title: 'Want', value: 'want'}]
    };
    $rootScope.$global.Order = {};
    $rootScope.$global.SalesReport = {};

    $scope.$on('$viewContentLoaded', function() {
        if ($rootScope.pageLoaded) {
            Index.initCharts();
        }
    });
    ProfileService.get(function(response) {
        $rootScope.currentUser = response;
        $rootScope.pageLoaded = true;
        $('body').css('background-image', 'none').removeClass('hide');
        Index.initCharts();
        if ($rootScope.isCheckoutOnlyUser()) {
            $rootScope.$state.go('order-new', undefined, {location: 'replace'});
        }
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
            CustomerService.query({page_size: 0, ordering: 'first_name,last_name', fields: 'id,first_name,last_name,uid,_unit,photo,needs_balance,want_balance'}, function(response) {
                $rootScope.$global.Customer.comboData = response.results;
            });
        }
    };

    $rootScope.loadProductCombo = function() {
        if (!$rootScope.$global.Product.comboData) {
            ProductService.query({page_size: 0, ordering: 'type,name', fields: 'id,name,quantity,upc,part_number,price,type', active:true}, function(response) {
                $rootScope.$global.Product.comboData = response.results;
            });
        }
    };

    $rootScope.loadUnitCombo = function() {
        if (!$rootScope.$global.Unit.comboData) {
            UnitService.query({page_size: 0, ordering: 'name', fields: 'id,name'}, function(response) {
                $rootScope.$global.Unit.comboData = response.results;
            });
        }
    };

});

app.controller("DashboardCtrl", function($scope, $rootScope) {
    // $scope.$on('$viewContentLoaded', function() {
    // });
});

app.controller("MyProfileCtrl", function($scope, $rootScope, $http, Utils, ProfileService, $uibModal, $filter) {
    $scope.profileForm = {};
    ProfileService.get(function(response) {
        $rootScope.currentUser = response;
        $scope.profileForm = angular.copy(response);
        $scope.reform_data();
        // $scope.profileForm.first_name = $rootScope.currentUser.first_name;
        // $scope.profileForm.last_name = $rootScope.currentUser.last_name;
        // $scope.profileForm.email = $rootScope.currentUser.email;
    }, function(response) {
        Utils.showDefaultServerError(response);
    });
    $scope.profileSecretForm = {
    };
    $scope.reform_data = function () {
        if ($scope.profileForm.profile.birth_date) {
            $scope.profileForm.profile.birth_date = new Date($scope.profileForm.profile.birth_date);
        }
    };

    $scope.setProfileFile = function (element) {
        $scope.$apply(function ($scope) {
            if (element.files.length > 0) {
                $scope.profile_chosen_file = element.files[0];
            }
        });
    };

    $scope.clearChosenAvatar = function () {
        $scope.profile_chosen_file = null;
        angular.element('#profile_image').val('');
    };

    $scope.updateAvatar = function () {
        var profile_el = angular.element('#profile_image')[0];
        if (profile_el.files.length == 0) return;
        var f = profile_el.files[0],
            fileName = f.name,
            r = new FileReader();
        r.onloadend = function (e) {
            var data = e.target.result;
            /*
             * TODO: that was better to use ProfileService.uploadAvatar. but strange thing is that is so low. then I commented that and used native $http
             */
            // ProfileService.uploadAvatar(data, function (response) {
            //     $scope.clearChosenAvatar();
            //     $rootScope.currentUser.profile.avatar = response.avatar;
            //     Utils.showSuccess('Avatar uploaded successfully', 5000);
            // }, function (response) {
            //     Utils.showDefaultServerError(response);
            // }).$promise.finally(function () {
            //     $scope.uploadingAvatar = false;
            // });
            $http({
                method: 'PUT',
                url: '/api/v1/me/avatar',
                data: data,
                transformRequest: angular.identity,
                headers: {
                    'Content-Type': 'application/base64',
                    'Content-Disposition': 'attachment; filename='+fileName
                }
            }).success(function (response) {
                $scope.clearChosenAvatar();
                $rootScope.currentUser.profile.avatar = response.avatar;
                Utils.showSuccess('Avatar uploaded successfully', 5000);
            }).error(function (response) {
                Utils.showDefaultServerError(response);
            }).finally(function () {
                $scope.uploadingAvatar = false;
            });
        };
        $scope.uploadingAvatar = true;
        r.readAsDataURL(f);
    };

    $scope.showDeleteAvatarConfirm = function() {
        $scope.clearChosenAvatar();
        $uibModal.open({
            animation: true,
            templateUrl: 'app/partials/confirm-modal.html',
            controller: function($scope, $uibModalInstance, Utils) {
                $scope.deleting = false;
                $scope.removeRecord = function () {
                    $scope.deleting = true;
                    ProfileService.deleteAvatar(function (response) {
                        $rootScope.currentUser.profile.avatar = response.avatar;
                        Utils.showSuccess('Avatar deleted successfully', 5000);
                        $uibModalInstance.close();
                    }, function (response) {
                        Utils.showDefaultServerError(response);
                    }).$promise.finally(function () {
                        $scope.deleting = false;
                    });
                };
                $scope.cancelRemove = function () {
                    $uibModalInstance.dismiss('cancel');
                };
            }
        });
    };

    $scope.saveProfileInfo = function() {
        $scope.saving = true;
        var data = angular.copy($scope.profileForm);
        data.profile.birth_date = $filter('date')(data.profile.birth_date, "yyyy-MM-dd");
        ProfileService.update(data, function(response) {
            $rootScope.currentUser = response;
            $scope.profileForm = response;
            $scope.reform_data();
            Utils.showSuccess('Profile updated successfully', 5000);
        }, function(response) {
            Utils.showDefaultServerError(response);
        }).$promise.finally(function() {
            $scope.saving = false;
        });
    };

    $scope.changePassword = function() {
        $scope.changing = true;
        ProfileService.changePassword($scope.profileSecretForm, function(response) {
            $scope.profileSecretForm = {};
            Utils.showSuccess('Password changed successfully', 5000);
        }, function(response) {
            Utils.showDefaultServerError(response);
        }).$promise.finally(function() {
            $scope.changing = false;
        });
    };
});

/******************************************************************
********************* Product controllers *****************
*******************************************************************/

app.controller("ProductListCtrl", function($scope, $rootScope, $state, $stateParams, ProductService, Utils, GeneralUiGrid) {
    $scope.loadingGrid = false;
    $scope.sortingOptions = null;
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
        $scope.filteringOptions = {};
        $global.gridOptions = {
            paginationPageSizes: [10, 20, 30, 50, 100, 200],
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
                {name: 'type', 'displayName': 'Type',
                    cellTemplate: '<div class="ui-grid-cell-contents ng-binding ng-scope" ng-bind-html="row.entity.type|productTypeFormat"></div>'
                },
                {name: 'upc', 'displayName': 'UPC'},
                {name: 'part_number', 'displayName': 'Part Number'},
                {name: 'reorder_limit', 'displayName': 'Re-order Limit'},
                {name: 'quantity', 'displayName': 'Quantity',
                    cellTemplate: '<div class="ui-grid-cell-contents ng-binding ng-scope text-bold" ng-class="{\'text-success\': row.entity.quantity>row.entity.reorder_limit , \'text-warning\' : row.entity.quantity==row.entity.reorder_limit, \'text-danger\' : row.entity.quantity<row.entity.reorder_limit}">{{row.entity.quantity}}</div>'
                },
                {name: 'price', 'displayName': 'Price', cellFilter: 'currency', cellClass: 'text-bold'},
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

    $scope.refreshData = function () {
        $scope.getPage();
    };
});

app.controller("ProductNewCtrl", function($scope, $rootScope, $state,$stateParams, ProductService, Utils) {
    var $global = $rootScope.$global.Product;
    $scope.selectedRecord = new ProductService({quantity: 0, reorder_limit: 0, active: true, type: 'needs'});
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
    $scope.updateMode = true;
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
        if ($scope.selectedRecord._iquantity) {
            $scope.selectedRecord.quantity = $scope.selectedRecord._orig_quantity + $scope.selectedRecord._iquantity;
        }
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
            $scope.selectedRecord.quantity = $scope.selectedRecord._orig_quantity;
        }).finally(function() {
            $scope.saving = false;
        });
    };
    $scope.loadRecord=function() {
        ProductService.get({id: $stateParams.id}, function(record) {
            $scope.selectedRecord = record;
            $scope.selectedRecord._orig_quantity = record.quantity;
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
        $scope.filteringOptions = {};
        $global.gridOptions = {
            paginationPageSizes: [10, 20, 30, 50, 100, 200],
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
                {name: 'needs_balance', 'displayName': 'Balance (Needs)', cellFilter: 'currency'},
                {name: 'want_balance', 'displayName': 'Balance (Want)', cellFilter: 'currency'},
                {name: 'unit', 'displayName': 'Unit',
                    cellTemplate: '<div class="ui-grid-cell-contents ng-binding ng-scope">{{row.entity._unit.name|default:"-"}}</div>'
                }
            ]
            // onRegisterApi: GeneralUiGrid.onRegisterApi($scope)
        };
    }
    $global.gridOptions.onRegisterApi = GeneralUiGrid.onRegisterApi($scope);
    $scope.getPage = GeneralUiGrid.getPage($scope, CustomerService, $global.gridOptions);
    if (!initialized) {
        $scope.getPage();
    }

    $scope.refreshData = function () {
        $scope.getPage();
    };
});

app.controller("CustomerNewCtrl", function($scope, $rootScope, $state,$stateParams, CustomerService, Utils, $http) {
    var $global = $rootScope.$global.Customer;
    $scope.selectedRecord = new CustomerService({quantity: 0, reorder_limit: 0, active: true});
    $rootScope.loadUnitCombo();

    $scope.setCustomerFile = function (element) {
        $scope.$apply(function ($scope) {
            if (element.files.length > 0) {
                $scope.customer_chosen_file = element.files[0];
            }
        });
    };

    $scope.clearChosenPhoto = function () {
        $scope.customer_chosen_file = null;
        angular.element('#customer_image').val('');
    };

    $scope.updatePhoto = function (callback, errCallback) {
        var customer_el = angular.element('#customer_image')[0];
        if (customer_el.files.length == 0) return;
        var f = customer_el.files[0],
            fileName = f.name,
            r = new FileReader(),
            recordId = $scope.selectedRecord.id;
        r.onloadend = function (e) {
            var data = e.target.result;
            /*
             * TODO: that was better to use CustomerService.uploadPhoto. but strange thing is that is so low.
             */
            $http({
                method: 'PUT',
                url: '/api/v1/customer/'+recordId+'/photo/',
                data: data,
                transformRequest: angular.identity,
                headers: {
                    'Content-Type': 'application/base64',
                    'Content-Disposition': 'attachment; filename='+fileName
                }
            }).success(function (response) {
                $scope.clearChosenPhoto();
                $scope.selectedRecord.photo = response.photo;
                callback && callback();
            }).error(function (response) {
                Utils.showDefaultServerError(response);
                errCallback && errCallback();
            }).finally(function () {
                $scope.uploadingPhoto = false;
            });
        };
        $scope.uploadingPhoto = true;
        r.readAsDataURL(f);
    };

    $scope.addRecord = function() {
        $scope.saving = true;
        $scope.selectedRecord.$save().then(function(response) {
            if ($global && $global.gridOptions) {
                $global.gridOptions.data.splice(0, 0, response);
            }
            $rootScope.$global.Customer.comboData = undefined;
            var photo_el = angular.element('#customer_image')[0];
            if (photo_el.files.length > 0) {
                $scope.updatePhoto(function () {
                    $scope.saving = false;
                    $state.go('customer-list');
                    Utils.showDefaultServerSuccess(response);
                }, function () {
                    $scope.saving = false;
                });
            } else {
                $scope.saving = false;
                $state.go('customer-list');
                Utils.showDefaultServerSuccess(response);
            }
        }, function(response) {
            $scope.saving = false;
            Utils.showDefaultServerError(response);
        });
    };
});

app.controller("CustomerEditCtrl", function($scope, $rootScope, $state,$stateParams, CustomerService, Utils, $uibModal, $http) {
    var $global = $rootScope.$global.Customer;
    $scope.deleting_photo = false;
    $rootScope.loadUnitCombo();

    $scope.setCustomerFile = function (element) {
        $scope.$apply(function ($scope) {
            if (element.files.length > 0) {
                $scope.customer_chosen_file = element.files[0];
            }
        });
    };

    $scope.clearChosenPhoto = function () {
        $scope.customer_chosen_file = null;
        angular.element('#customer_image').val('');
    };

    $scope.deleteCurrentPhoto = function () {
        $scope.selectedRecord.photo = null;
        $scope.deleting_photo = true;
    };

    $scope.updatePhoto = function (callback, errCallback) {
        var customer_el = angular.element('#customer_image')[0];
        if (customer_el.files.length == 0) return;
        var f = customer_el.files[0],
            fileName = f.name,
            r = new FileReader(),
            recordId = $scope.selectedRecord.id;
        r.onloadend = function (e) {
            var data = e.target.result;
            /*
             * TODO: that was better to use CustomerService.uploadPhoto. but strange thing is that is so low.
             */
            $http({
                method: 'PUT',
                url: '/api/v1/customer/'+recordId+'/photo/',
                data: data,
                transformRequest: angular.identity,
                headers: {
                    'Content-Type': 'application/base64',
                    'Content-Disposition': 'attachment; filename='+fileName
                }
            }).success(function (response) {
                $scope.clearChosenPhoto();
                $scope.selectedRecord.photo = response.photo;
                callback && callback();
            }).error(function (response) {
                Utils.showDefaultServerError(response);
                errCallback && errCallback();
            }).finally(function () {
                $scope.uploadingPhoto = false;
            });
        };
        $scope.uploadingPhoto = true;
        r.readAsDataURL(f);
    };

    $scope.deletePhoto = function (callback, errCallback) {
        CustomerService.deletePhoto({id: $scope.selectedRecord.id}, function (response) {
            $scope.selectedRecord.photo = response.photo;
            callback && callback();
        }, function (response) {
            Utils.showDefaultServerError(response);
            errCallback && errCallback();
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
            if ($scope.deleting_photo) {
                $scope.selectedRecord.photo = null;
            }
            var data = $global.gridOptions? $global.gridOptions.data: [];
            var idx = Utils.findByProperty(data, 'id', response.id);
            if (idx >= 0) {
                $global.gridOptions.data[idx] = response;
            }
            $rootScope.$global.Customer.comboData = undefined;
            var photo_el = angular.element('#customer_image')[0];
            if (photo_el.files.length > 0) {
                $scope.updatePhoto(function () {
                    $scope.saving = false;
                    $state.go('customer-list');
                    Utils.showDefaultServerSuccess(response);
                }, function () {
                    $scope.saving = false;
                });
            } else if($scope.deleting_photo) {
                $scope.deletePhoto(function () {
                    $scope.saving = false;
                    $scope.deleting_photo = false;
                    $state.go('customer-list');
                    Utils.showDefaultServerSuccess(response);
                }, function () {
                    $scope.saving = false;
                });
            } else {
                $scope.saving = false;
                $state.go('customer-list');
                Utils.showDefaultServerSuccess(response);
            }
        }, function(response) {
            Utils.showDefaultServerError(response);
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
********************* Unit controllers *****************
*******************************************************************/

app.controller("UnitListCtrl", function($scope, $rootScope, $state, $stateParams, UnitService, Utils, GeneralUiGrid) {
    $scope.loadingGrid = false;
    $scope.sortingOptions = null;
    $scope.paginationOptions = {
        page: 1
    };
    if (!$rootScope.$global.Unit) {
        $rootScope.$global.Unit = {}
    }

    var initialized = true,
        $global = $rootScope.$global.Unit;
    if (!$global.gridOptions) {
        initialized = false;
        $scope.filteringOptions = {};
        $global.gridOptions = {
            paginationPageSizes: [10, 20, 30, 50, 100, 200],
            paginationPageSize: 10,
            useExternalPagination: true,
            useExternalSorting: true,
            rowHeight: 35,
            columnDefs: [
                {name: 'id', 'displayName': 'ID', width: 60,
                    cellTemplate: '<div class="ui-grid-cell-contents ng-binding ng-scope"><a class="text text-primary" href="{{grid.appScope.$state.href(\'unit-edit\', {id: row.entity.id})}}">{{row.entity.id}}</a></div>'
                },
                {name: 'name', 'displayName': 'Name',
                    cellTemplate: '<div class="ui-grid-cell-contents ng-binding ng-scope"><a class="text text-primary" href="{{grid.appScope.$state.href(\'unit-edit\', {id: row.entity.id})}}">{{row.entity.name}}</a></div>'
                },
                {name: 'description', 'displayName': 'Description', cellFilter: 'default:"-"'}
            ]
            // onRegisterApi: GeneralUiGrid.onRegisterApi($scope)
        };
    }
    $global.gridOptions.onRegisterApi = GeneralUiGrid.onRegisterApi($scope);
    $scope.getPage = GeneralUiGrid.getPage($scope, UnitService, $global.gridOptions);
    if (!initialized) {
        $scope.getPage();
    }

    $scope.refreshData = function () {
        $scope.getPage();
    };
});

app.controller("UnitNewCtrl", function($scope, $rootScope, $state,$stateParams, UnitService, Utils) {
    var $global = $rootScope.$global.Unit;
    $scope.selectedRecord = new UnitService({quantity: 0, reorder_limit: 0, active: true});
    $scope.addRecord = function() {
        $scope.saving = true;
        $scope.selectedRecord.$save().then(function(response) {
            if ($global && $global.gridOptions) {
                $global.gridOptions.data.splice(0, 0, response);
            }
            $rootScope.$global.Unit.comboData = undefined;
            $state.go('unit-list');
            Utils.showDefaultServerSuccess(response);
        }, function(response) {
            Utils.showDefaultServerError(response);
        }).finally(function() {
            $scope.saving = false;
        });
    };

});

app.controller("UnitEditCtrl", function($scope, $rootScope, $state,$stateParams, UnitService, Utils, $uibModal) {
    var $global = $rootScope.$global.Unit;

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
                    UnitService.delete({id: $scope.selectedId}, function(response) {
                        if (idx >= 0) {
                            gridOptions.data.splice(idx, 1);
                        }
                        $rootScope.$global.Unit.comboData = undefined;
                        Utils.showDefaultServerSuccess(response);
                        $uibModalInstance.close();
                        $state.go('unit-list');
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
            $rootScope.$global.Unit.comboData = undefined;
            $state.go('unit-list');
            Utils.showDefaultServerSuccess(response);
        }, function(response) {
            Utils.showDefaultServerError(response);
        }).finally(function() {
            $scope.saving = false;
        });
    };
    $scope.loadRecord=function() {
        UnitService.get({id: $stateParams.id}, function(record) {
            $scope.selectedRecord = record;
        }, function(response) {
            Utils.showDefaultServerError(response);
            $state.go('unit-list');
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
        $scope.filteringOptions = {};
        $global.gridOptions = {
            paginationPageSizes: [10, 20, 30, 50, 100, 200],
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
                {name: 'total_items', 'displayName': 'Total Items',
                    cellTemplate: '<div class="ui-grid-cell-contents ng-binding ng-scope"><strong>{{row.entity.needs_total_items + row.entity.want_total_items }}</strong> <sub><span class="text-danger"><strong>{{row.entity.needs_total_items}}</strong> needs</span> + <span class="text-success"><strong>{{row.entity.want_total_items}}</strong> want</span></sub></div>'
                },
                {name: 'total_quantity', 'displayName': 'Total Quantity',
                    cellTemplate: '<div class="ui-grid-cell-contents ng-binding ng-scope"><strong>{{row.entity.needs_total_quantity + row.entity.want_total_quantity }}</strong> <sub><span class="text-danger"><strong>{{row.entity.needs_total_quantity}}</strong> needs</span> + <span class="text-success"><strong>{{row.entity.want_total_quantity}}</strong> want</span></sub></div>'
                },
                {name: 'total_price', 'displayName': 'Total Price',
                    cellTemplate: '<div class="ui-grid-cell-contents ng-binding ng-scope">$<strong>{{row.entity.needs_total_price + row.entity.want_total_price }}</strong> <sub><span class="text-danger">$<strong>{{row.entity.needs_total_price}}</strong> needs</span> + <span class="text-success">$<strong>{{row.entity.want_total_price}}</strong> want</span></sub></div>'
                },
                {name: 'create_datetime', 'displayName': 'Created At', cellFilter: 'date: "MMM dd yyyy hh:mm a"'},
                {name: 'status', 'displayName': 'Status', width: 70}

            ]
            // onRegisterApi: GeneralUiGrid.onRegisterApi($scope)
        };
    }
    $global.gridOptions.onRegisterApi = GeneralUiGrid.onRegisterApi($scope);
    $scope.getPage = GeneralUiGrid.getPage($scope, OrderService, $global.gridOptions);
    if (!initialized) {
        $scope.getPage();
    }

    $scope.refreshData = function () {
        $scope.getPage();
    };
});

app.controller("OrderNewCtrl", function($scope, $rootScope, $state,$stateParams, OrderService, Utils, UiUtils, $timeout) {
    var $global = $rootScope.$global.Order;
    $scope.selectedRecord = new OrderService({order_items: [{quantity: 1}]});
    $scope.getPriceSum = UiUtils.getOrderItemPriceSum($scope, $rootScope);
    $scope.getQuantitySum = UiUtils.getOrderItemQuantitySum($scope, $rootScope);
    $scope.getItemsCount = UiUtils.getOrderItemCount($scope, $rootScope);
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
            $rootScope.$global.Customer.comboData = undefined;
            $rootScope.$global.Customer.gridOptions = undefined;
            $rootScope.$global.Product.comboData = undefined;
            $rootScope.$global.Product.gridOptions = undefined;
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
    $scope.getQuantitySum = UiUtils.getOrderItemQuantitySum($scope, $rootScope);
    $scope.getItemsCount = UiUtils.getOrderItemCount($scope, $rootScope);
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
                        $rootScope.$global.Customer.comboData = undefined;
                        $rootScope.$global.Customer.gridOptions = undefined;
                        $rootScope.$global.Product.comboData = undefined;
                        $rootScope.$global.Product.gridOptions = undefined;
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
            $rootScope.$global.Customer.comboData = undefined;
            $rootScope.$global.Customer.gridOptions = undefined;
            $rootScope.$global.Product.comboData = undefined;
            $rootScope.$global.Product.gridOptions = undefined;
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

/******************************************************************
********************* SalesReport controllers *****************
*******************************************************************/

app.controller("SalesReportCtrl", function($scope, $rootScope, $state, $stateParams, $httpParamSerializer, SalesReportService, Utils, GeneralUiGrid) {
    $scope.loadingGrid = false;
    $scope.sortingOptions = null;
    $scope.paginationOptions = {
        page: 1
    };
    if (!$rootScope.$global.SalesReport) {
        $rootScope.$global.SalesReport = {}
    }
    $rootScope.loadProductCombo();
    $rootScope.loadCustomerCombo();
    $rootScope.loadUnitCombo();

    var initialized = false,
        $global = $rootScope.$global.SalesReport;
    $scope.filteringOptions = {};
    $global.gridOptions = {
        paginationPageSizes: [10, 20, 30, 50, 100, 200],
        paginationPageSize: 10,
        useExternalPagination: true,
        useExternalSorting: false,
        enableSorting: false,
        enableColumnMenus: false,
        rowHeight: 35,
        columnDefs: [
            {name: 'order_id', 'displayName': 'Order#', width: 60},
            {name: 'clerk', 'displayName': 'Clerk'},
            {name: 'customer_name', 'displayName': 'Customer'},
            {name: 'customer_unit', 'displayName': 'Unit'},
            {name: 'product_name', 'displayName': 'Product'},
            {name: 'product_upc', 'displayName': 'UPC'},
            {name: 'product_part_number', 'displayName': 'Part#'},
            {name: 'quantity', 'displayName': 'Quantity', width: 70},
            {name: 'item_price', 'displayName': 'Sale Price',
                cellTemplate: '<div class="ui-grid-cell-contents ng-binding ng-scope"><strong>${{row.entity.quantity * row.entity.item_price}}</strong> = {{row.entity.quantity}} * <strong>{{row.entity.item_price}}</strong></div>'
            },
            {name: 'create_datetime', 'displayName': 'Created At', cellFilter: 'date: "MMM dd yyyy hh:mm a"', width: 150},

        ]
        // onRegisterApi: GeneralUiGrid.onRegisterApi($scope)
    };

    $global.gridOptions.onRegisterApi = GeneralUiGrid.onRegisterApi($scope);
    $scope.getPage = GeneralUiGrid.getPage($scope, SalesReportService, $global.gridOptions);
    if (!initialized) {
        $scope.getPage();
    }

    $scope.getSerializedFiltering = function () {
        if (!$scope.filteringOptions) {
            return {};
        }
        var data = angular.copy($scope.filteringOptions);
        if (data.min_create_date) {
            data.min_create_date = moment(data.min_create_date).format('YYYY-MM-DD');
        }
        if (data.max_create_date) {
            data.max_create_date = moment(data.max_create_date).format('YYYY-MM-DD');
        }
        return data;
    };

    $scope.refreshData = function () {
        $scope.getPage();
    };

    $scope.export = function (format) {
        params = {_format: format};
        if ($scope.sortingOptions) {
            params.ordering=$scope.sortingOptions;
        }
        if ($scope.filteringOptions) {
            var filteringData = $scope.getSerializedFiltering();
            angular.extend(params, filteringData);
        }
        var encodedParams = $httpParamSerializer(params);
        Utils.download('/api/v1/report/sales/export?'+encodedParams);
    };

});
