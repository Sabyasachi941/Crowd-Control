var app = angular.module('app', ['restangular'])
    .config(function(RestangularProvider) {
        RestangularProvider.setBaseUrl('http://ccwebapp-env.eu-west-1.elasticbeanstalk.com/');
    });

app.controller('IndexCtrl', function($scope, Restangular) {
    $scope.graphData = Restangular.all('graphData').getList();
});