const React = require('react');
var ReactDOM = require('react-dom');
var LineChart = require('/Users/harryquigley/node_modules/react-chartjs').Line;
var Chart = require('/Users/harryquigley/node_modules/chartjs');


var Hello = React.createClass({
    render: function() {
        return <div>Hello, haters!</div>;
    }
});
 
ReactDOM.render(<Hello />, document.getElementById('line'));