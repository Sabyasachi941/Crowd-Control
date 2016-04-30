var app = angular.module('app', ['restangular'])
    .config(function(RestangularProvider) {
        RestangularProvider.setBaseUrl('http://localhost:8181/');
    });

app.controller('IndexCtrl', function($scope, Restangular) {
    $scope.graphData = Restangular.all('graphData').getList();
});