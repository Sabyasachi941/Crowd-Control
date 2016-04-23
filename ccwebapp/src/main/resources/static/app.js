var app = angular.module('app', ['restangular'])
    .config(function(RestangularProvider) {
        RestangularProvider.setBaseUrl('http://localhost:8181/');
    });
 
    

    app.config(function(RestangularProvider) {

        // add a response intereceptor
        RestangularProvider.addResponseInterceptor(function(data, operation, what, url, response, deferred) {
          var extractedData;
          // .. to look for getList operations
          if (operation === "getList") {
            // .. and handle the data and meta data
            resp =  data._embedded[what];
            resp._links = data._links;
            return resp
            
          }
          
          return data;
        });
        
        RestangularProvider.setRestangularFields({
            selfLink: 'self.link'
        });


});

app.controller('IndexCtrl', function($scope, Restangular) {
        $scope.timestamps = Restangular.all('timestamps').getList();

    });

