import React, { Component } from 'react'
import blessed from 'blessed';
import { render } from 'react-blessed';

const screen = blessed.screen({
  autoPadding: true,
  smartCSR: true,
  dockBorders: true,
  title: 'Redash',
});

class App extends Component {
    constructor (props) {
        super(props)
        this.state = {}
    }
    render () {
        return <box label="react-blessed demo"
            border={{type: 'line'}}
            style={{border: {fg: 'cyan'}}}>
        Just testing
        </box>
    }
}

render(<App screen={screen} />, screen)
