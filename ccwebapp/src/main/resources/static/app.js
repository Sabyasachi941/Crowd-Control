'use strict';

const React = require('react');
const client = require('./client');

class App extends React.Component {

    constructor(props) {
        super(props);
        this.state = {timestamps: []};
    }

    componentDidMount() {
        client({method: 'GET', path: 'timestamps'}).done(response => {
            this.setState({timestamps: response.entity._embedded.timestamps});
    });
    }

    render() {
        return (
            <TimestampList timestamps={this.state.timestamps}/>
    )
    }
}

class TimestampList extends React.Component{
    render() {
        var timestamps = this.props.timestamps.map(timestamp =>
            <Timestamp key={timestamp._links.self.href} timestamp={timestamp}/>
    );
        return (
            <table>
            <tr>
                <th>ID</th>
                <th>Timestamp</th>
                <th>Venue</th>
            </tr>
            {timestamps}
        </table>
    )
    }
}

class Timestamp extends React.Component{
    render() {
        return (
            <tr>
                <td>{this.props.timestamp.id}</td>
                <td>{this.props.timestamp.timestamp}</td>
                <td>{this.props.timestamp.venue_id}</td>
            </tr>
    )
    }
}

React.render(
<App />,
    document.getElementById('react')
)
