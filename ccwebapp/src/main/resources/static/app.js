var app = angular.module('app', ['restangular'])
    .config(function(RestangularProvider) {
        RestangularProvider.setBaseUrl('htt,://localhost:8181/');
    });

app.controller('IndexCtrl', function($scope, Restangular) {
    $scope.graphData = Restangular.all('CurrentAttendance').getList();
});