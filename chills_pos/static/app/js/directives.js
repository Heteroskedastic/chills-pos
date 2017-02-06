app.directive('stringToNumber', function() {
  return {
    require: 'ngModel',
    link: function(scope, element, attrs, ngModel) {
      ngModel.$parsers.push(function(value) {
        return '' + value;
      });
      ngModel.$formatters.push(function(value) {
        return parseFloat(value);
      });
    }
  };
});

app.directive('uiSelectOpenOnFocus', ['$timeout', function ($timeout) {
    return {
        require: 'uiSelect',
        restrict: 'A',
        link: function ($scope, el, attrs, uiSelect) {
            var closing = false;

            angular.element(uiSelect.focusser).on('focus', function () {
                if (!closing) {
                    uiSelect.activate();
                }
            });

            // Because ui-select immediately focuses the focusser after closing
            // we need to not re-activate after closing
            $scope.$on('uis:close', function () {
                closing = true;
                $timeout(function () { // I'm so sorry
                    closing = false;
                });
            });
        }
    };
}]);

app.directive('ngFocusOn', function () {
    return {
        restrict: 'A',
        link: {
            post: function (scope, elem, attr) {
                scope.$on(attr.ngFocusOn, function (e) {
                    window.setTimeout(function () {
                        elem[0].focus();
                    }, 0);
                });
            }
        }
    };
});