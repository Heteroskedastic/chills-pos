String.prototype.format = String.prototype.f = function() {
    var s = this,
        i = arguments.length;

    while (i--) {
        s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
    }
    return s;
};


app.service('Utils', [function() {
    this.showMessage = function(msg, type, delay) {
        $.bootstrapGrowl(msg, {
          ele: 'body', // which element to append to
          type: type || 'info', // (null, 'info', 'danger', 'success')
          offset: {from: 'top', amount: 20}, // 'top', or 'bottom'
          align: 'center', // ('left', 'right', or 'center')
          width: 'auto', // (integer, or 'auto')
          delay: delay != undefined? delay: 5000, // Time while the message will be displayed. It's not equivalent to the *demo* timeOut!
          allow_dismiss: true, // If true then will display a cross to close the popup.
          stackup_spacing: 10 // spacing between consecutively stacked growls.
        });
    };
    this.showSuccess = function(msg, delay) {
        this.showMessage(msg, 'success', delay)
    };
    this.showError = function(msg, delay) {
        this.showMessage(msg, 'danger', delay)
    };
    this.showWarn = function(msg, delay) {
        this.showMessage(msg, 'warning', delay)
    };
    this.showDefaultServerSuccess = function(response, delay) {
        var delay = delay != undefined? delay: 5000,
            defaultMsg = 'Operation done successfully';
        this.showSuccess(response.statusText || defaultMsg, delay);
    };
    this.safeFromJson = function(s, nullIfFail) {
        nullIfFail = nullIfFail==undefined? true: false;
        try {
            return angular.fromJson(s);
        } catch(e) {
            return nullIfFail? null: s;
        }
    };
    this.showDefaultServerError = function(response, showReason, delay, extra_message) {
        var msg;
        delay = delay != undefined? delay: 5000;
        showReason = showReason != undefined? showReason: true;
        if (response.status <= 0) {
            msg = "<strong>Server Connection Error</strong>";
        } else if(response.status == 401) {
            msg = "<strong>Session is expired.</strong> <br>You are redirecting to login page ...";
            var next = window.location.pathname+window.location.hash;
            setTimeout(function() {
                window.location = '/?next=' + next;
            }, 2000)
        } else {
            msg = "<strong>"+response.status + ": " + response.statusText + "</strong>";
            var jData = this.safeFromJson(response.data);
            if (showReason && jData) {
                msg += '<p>'+ this.prettify_error(response.data) + '</p>';
            }
            if (extra_message) {
                msg += '<p>'+extra_message+'</p>';
            }
        }
        this.showError(msg, delay);
    };
    this.prettify_error = function(data) {
        return JSON.stringify(data).replace(",", "<br>").replace(/\[|\]|\}|\{/g, "");
    };
    this.random_id = function(n) {
        n = n || 10;
        return Math.floor((Math.random() * Math.pow(10, n)) + 1);
    };
    this.addQSParm = function(url, name, value) {
        var re = new RegExp("([?&]" + name + "=)[^&]+", "");

        function add(sep) {
            url += sep + name + "=" + encodeURIComponent(value);
        }

        function change() {
            url = url.replace(re, "$1" + encodeURIComponent(value));
        }
        if (url.indexOf("?") === -1) {
            add("?");
        } else {
            if (re.test(url)) {
                change();
            } else {
                add("&");
            }
        }
        return url;
    };
    this.noCacheUrl = function(url) {
        var r = this.random_id();
        return this.addQSParm(url, 'nc', r);
    };
    this.findByProperty = function(array, property, value) {
        for (var i = 0; i < array.length; i++) {
            if (array[i][property] == value) {
                return i;
            }
        }
        return -1;
    };
}]);

app.factory('UiUtils', ['uiGridConstants', 'Utils', function(uiGridConstants, Utils) {
    return {
        getOrderItemPriceSum: function ($scope, $rootScope) {
            return function() {
                if (!$scope.selectedRecord || !$rootScope.$global.Product.comboData) {
                    return 0;
                }
                var sum = 0, product, productId, orderItem;
                for (var i=0; i<$scope.selectedRecord.order_items.length; i++) {
                    orderItem = $scope.selectedRecord.order_items[i];
                    if (!orderItem.product) {
                        continue;
                    }
                    product = $rootScope.$global.Product.comboData.filter(function(p) {
                        return p.id==orderItem.product;
                    })[0];
                    sum += (orderItem.quantity || 0) * product.price;
                }
                return sum;
            }
        }
    }
}]);

app.factory('GeneralUiGrid', ['uiGridConstants', 'Utils', function(uiGridConstants, Utils) {
    return {
        onRegisterApi: function($scope) {
            return function(gridApi) {
                $scope.gridApi = gridApi;
                gridApi.core.on.sortChanged($scope, function(grid, sortColumns) {
                    if ($scope.loadingGrid) {
                        return;
                    }
                    if (sortColumns.length == 0) {
                        $scope.sortingOptions = null;
                    } else {
                        var col = sortColumns[0];
                        $scope.sortingOptions = (col.sort.direction==uiGridConstants.DESC?"-":"") + col.field;
                    }
                    $scope.getPage();
                });
                gridApi.pagination.on.paginationChanged($scope, function (newPage, pageSize) {
                    if ($scope.loadingGrid) {
                        return;
                    }
                    $scope.paginationOptions.page = newPage;
                    // $scope.paginationOptions.pageSize = pageSize;
                    $scope.getPage();
                });

            }
        },
        getPage: function($scope, queryService, gridOpt) {
            return function() {
                $scope.loadingGrid = true;
                var params = {
                    page: $scope.paginationOptions.page,
                    page_size: gridOpt.paginationPageSize
                };
                if ($scope.sortingOptions) {
                    params.ordering=$scope.sortingOptions;
                }
                queryService.query(params, function(response) {
                    var pg = response.pagination;
                    gridOpt.data = response.results;
                    gridOpt.totalItems = pg.count;
                    gridOpt.paginationCurrentPage = pg.current_page;
                }, function(response) {
                    Utils.showDefaultServerError(response);
                }).$promise.finally(function() {
                    $scope.loadingGrid = false;
                });
            }
        }
    };
}]);

app.factory('SessionService', ['$resource', function($resource) {
    return $resource('/api/v1/session/', {}, {
        get: {
            method:'GET', params: {nc: Date.now}
        }
    });
}]);

app.factory('ProfileService', ['$resource', function($resource) {
    return $resource('/api/v1/me/', {}, {
        get: {
            method:'GET', params: {nc: Date.now}
        },
        update: {
            method:'PUT'
        },
        changePassword: {
            method: 'POST',
            url: '/api/v1/me/password/'
        },
        uploadAvatar: {
            method: 'PUT',
            url: '/api/v1/me/avatar/',
            transformRequest: angular.identity,
            headers: {
                'Content-Type': 'application/base64',
                'Content-Disposition': 'attachment; filename=AVATAR'
            }
        },
        deleteAvatar: {
            method: 'DELETE',
            url: '/api/v1/me/avatar/'
        }
    });
}]);


app.factory('ProductService', ['$resource', function($resource) {
    return $resource('/api/v1/product/:id', {id: '@id'}, {
        update: {
            method: 'PUT'
        },
        query: {
            method:'GET', isArray: false
        }
    });
}]);

app.factory('CustomerService', ['$resource', function($resource) {
    return $resource('/api/v1/customer/:id', {id: '@id'}, {
        update: {
            method: 'PUT'
        },
        query: {
            method:'GET', isArray: false
        },
        uploadPhoto: {
            method: 'PUT',
            url: '/api/v1/customer/:id/photo',
            transformRequest: angular.identity,
            headers: {
                'Content-Type': 'application/base64',
                'Content-Disposition': 'attachment; filename=PHOTO'
            }
        },
        deletePhoto: {
            method: 'DELETE',
            url: '/api/v1/customer/:id/photo'
        }
    });
}]);

app.factory('UnitService', ['$resource', function($resource) {
    return $resource('/api/v1/unit/:id', {id: '@id'}, {
        update: {
            method: 'PUT'
        },
        query: {
            method:'GET', isArray: false
        }
    });
}]);

app.factory('OrderService', ['$resource', function($resource) {
    return $resource('/api/v1/order/:id', {id: '@id'}, {
        update: {
            method: 'PUT'
        },
        query: {
            method:'GET', isArray: false
        }
    });
}]);
