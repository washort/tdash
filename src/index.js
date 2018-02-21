import React, { Component } from 'react'
import blessed from 'blessed';
import { render } from 'react-blessed';
import { Table } from 'react-blessed-contrib';

const screen = blessed.screen({
    autoPadding: true,
    smartCSR: true,
    dockBorders: true,
    title: 'Redash',
});

const exampleData = {
  headers: ['id', 'name', 'color'],
  data: [[1, 'gomez', 'red'],
         [2, 'morticia', 'green'],
         [3, 'fester', 'violet']]
};

const boxStyle = {
  focus: {
    border: {bg: 'cyan', fg: 'red'}
  },
  border: {fg: 'cyan'}
};

function processQuery(contents) {
  return {'headers': ['id', 'name', 'color'],
          data: contents.trim().split('\n').map((row) => row.split(' '))
          };
}
class TextAreaWithLegend extends Component {
  constructor (props) {
    super(props);
    this.props = props;
    this.legend = props.legend || [];
  }

  render () {
    const legendTexts = this.legend.map(([key, name]) => [`{inverse}${key}{/inverse} ${name}`, 3 + key.length + name.length ]);
    const legendElts = [];
    let leftOffset = 1;
    for (const [txt, siz] of legendTexts) {
      legendElts.push(<text top="50%-1" left={leftOffset} tags={true} content={txt} key={leftOffset} />)
      leftOffset += siz;
    }
    return <element>
      <textarea ref="txt" {... this.props} />
      {legendElts}
    </element>
  }
}

class App extends Component {
  constructor (props) {
    super(props);
      this.state = {tableData: exampleData};
      this.submitQuery = () => this.setState({tableData: processQuery(this.query.value)});
  }

  componentDidMount () {
    const { screen } = this.props;
    screen.key([ 'q', 'C-c' ], this.quit);
    screen.key([ 'f10' ], this.submitQuery);
    screen.key('tab', screen.focusNext());
    this.query = this.refs.query.refs.txt;
    this.query.focus();
  }
  quit () {
    process.exit(0);
  }
  render () {
    return <element>
            <TextAreaWithLegend
             height="50%" label="Query" border={{type: 'line'}}
             keys={true}
             ref="query"
             style={boxStyle}
             legend={[["^E", "editor"], ["F8", "save"], ["F10", "execute"]]} />
            <Table top="50%" height="50%" border={{type: 'line'}}
             ref="table"
             style={boxStyle}
             label="Results"
             columnWidth={[4, 12, 12]}
             data={this.state.tableData} />
           </element>
  }
}

render(<App screen={screen} />, screen);
