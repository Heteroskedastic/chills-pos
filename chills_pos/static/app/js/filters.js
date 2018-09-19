// Source: dist/.temp/filters/default/default.js
app.filter('default', function () {
    return function (input, value) {
        if (input !== null && input !== undefined && input !== '') {
            return input;
        }
        return value || '';
    };
});

app.filter('findById', function () {
    return function (input, value) {
        if(input) {
              for (var i=0; i<input.length; i++) {
                  if (input[i].id == value) {
                      return input[i];
                  }
              }

        }
    };
});

app.filter('displayObject', function () {
    return function (input, fields) {
        if(input) {
            var s = [];
            fields = fields.split(',');
            fields.forEach(function (f) {
                s.push(input[f]);
            });
            if(s.length == 1) {
                return s[0]
            }
            return s.join(' ');
        }
    };
});

app.filter('productTypeFormat', function () {
    return function (input, extraCss) {
        var html = input;
        if(input === 'needs') {
            html = '<span class="label label-danger {0}">Needs</span>';
        } else if(input === 'want') {
            html = '<span class="label label-success {0}">Want</span>';
        }
        return html.f(extraCss || '');
    };
});

app.filter('orderObjectBy', function() {
    return function(items, field, reverse) {
        var filtered = [];
        angular.forEach(items, function(item) {
            filtered.push(item);
        });
        filtered.sort(function (a, b) {
            return (a[field] > b[field] ? 1 : -1);
        });
        if(reverse) filtered.reverse();
        return filtered;
    };
});


app.filter('sumByKey', function() {
    return function(items, prop) {
        if (typeof(items) === 'undefined' || typeof(prop) === 'undefined') {
            return 0;
        }
        return items.reduce( function(a, b) {
            return a + (b[prop]||0);
        }, 0);
    };
});


app.filter('limitTo2', function ($filter) {
    return function (input, limit, selectedItem) {
        var filters,
            limitTo1 = $filter('limitTo');
        filters = limitTo1(input, limit);
        if (input && selectedItem) {
            var selectedItemIndex = input.findIndex(function(item) {
                return item.id === selectedItem;
            });
            if (selectedItemIndex >= limit) {
                filters.push(input[selectedItemIndex]);
            }

        }
        return filters;


    };
});
