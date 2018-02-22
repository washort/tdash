import got from 'got';
import React, { Component } from 'react'
import blessed from 'blessed';
import { render, list } from 'react-blessed';
import contrib from 'blessed-contrib'
import { Table } from 'react-blessed-contrib';
const API_URL = "https://sql.telemetry.mozilla.org/api";


function later(delay) {
    return new Promise(function(resolve) {
        setTimeout(resolve, delay);
    });
}

// fixed implementation of react-blessed-contrib.Table
function setTableWidgetData() {
  this.widget.options.columnWidth = this.props.columnWidth;
  if (this.props.data) {
    this.widget.setData(this.props.data);
  }
}

class Table2 extends Component {

  constructor(props) {
    super(props);
    this.componentDidMount = setTableWidgetData;
    this.componentDidUpdate = setTableWidgetData;
  }

  render() {
    const { data, ...props } = this.props;
    return React.createElement('__BLESSED_WRAPPER__', {
      ...props,
      __BLESSED_WIDGET__: contrib.table,
      ref: (el) => this.widget = el,
    });
  }

}

// Component for showing help text under a textarea
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
  border: {fg: 'cyan'},
};

function processQuery(contents) {
  return got.post(API_URL + "/query_results", {
    headers: {Cookie: process.env.REDASH_COOKIE},
    body: JSON.stringify({data_source_id: 10, query: contents, max_age: 0}),
    json: true
  }).then(pollForResult);
}

function pollForResult(res) {
  if (res.statusCode == 200) {
    const jobData = res.body.job;
    if (jobData.error) {
      screen.debug(`Query error: ${jobData.error}`);
      throw jobData.error;
    }
    if (jobData.query_result_id) {
      return got(API_URL + "/query_results/" + jobData.query_result_id, {
                 headers: {Cookie: process.env.REDASH_COOKIE},
                 json: true});
    } else {
      return later(1000).then(() =>
        got(API_URL + "/jobs/" + jobData.id, {
            headers: {Cookie: process.env.REDASH_COOKIE},
            json: true})).then(pollForResult);
    }
  } else {
    throw res.body;
  }
}

function tableize(redashData) {
  const baseColWidth = (screen.width - 2) / redashData.columns.length;
  // Even spacing, for now.
  const columnWidth = Array(redashData.columns.length).fill(baseColWidth);
  const colNames = redashData.columns.map((col) => col.friendly_name);
  const tableRows = [];
  for (let row of redashData.rows) {
    tableRows.push(colNames.map((name) => row[name]));
  }
  const out = {tableData: {headers: colNames, data: tableRows}, columnWidth};
  return out
}
function shutdown(code, msg) {
  program.clear();
  program.disableMouse();
  program.showCursor();
  program.normalBuffer();
  if (msg) {
    process.stdout.write(JSON.stringify(msg));
  }
  process.exit(code);

}

class App extends Component {
  constructor (props) {
    super(props);
    this.state = {
      tableData: {headers: [], data: []},
      columnWidth: [],

      showQuerySelector: false,
      queryList: null,
      selectedQuery: null
    };
    this.submitQuery = () => processQuery(this.query.value).then((res) =>
        this.setState(tableize(res.body.query_result.data))).catch((err) => {
          console.log(err);
          screen.debug(err.toString());
        });
    this.loadQuery = (name, i) => this.setState({selectedQuery: i, showQuerySelector: false});
    this.getQueryText = () => (this.state.selectedQuery == null) ? {} : {value: this.state.queryList[this.state.selectedQuery].query};
    this.fetchQueryList = () => {
      if (!this.state.queryList) {
        return got(API_URL + `/queries?page=1&page_size=${screen.height - 2}`, {
          headers: {Cookie: process.env.REDASH_COOKIE},
          json: true}).then((res) => res.body.results);
      } else {
        return Promise.resolve(this.state.queryList);
      }
    };
  }

  componentDidMount () {
    const { screen } = this.props;
    screen.key([ 'q', 'C-c' ], shutdown);
    screen.key([ 'f6' ], () => {this.fetchQueryList().then(
      (ql) => this.setState({queryList: ql,
                             showQuerySelector: !this.state.showQuerySelector},
                            () => this.refs.queryList.focus()))});
    screen.key([ 'f10' ], this.submitQuery);
    screen.key('tab', screen.focusNext());
    this.query = this.refs.query.refs.txt;
    this.query.focus();
  }

  render () {
    return <element>
            <TextAreaWithLegend
             height="50%" label="Query" border={{type: 'line'}}
             keys={true}
             ref="query"
             style={boxStyle}
             legend={[["^E", "editor"], ["F6", "load"], ["F8", "save"], ["F10", "execute"]]}
             {...this.getQueryText()} />
            <Table2 top="50%" height="50%" border={{type: 'line'}}
             ref="table"
             screen={screen}
             style={boxStyle}
             label="Results"
             columnSpacing={1}
             columnWidth={this.state.columnWidth}
             data={this.state.tableData} />
            {this.state.showQuerySelector && <list style={boxStyle}
             height="100%"
             width="50%"
             left="25%"
             ref="queryList"
             border={{type: 'line'}}
             selectedInverse={true}
             keys={true}
             items={this.state.queryList.map((q) => q.name)}
             onSelect={this.loadQuery}
             onCancel={() => {this.state.showQuerySelector = false;}}
             interactive={true}
             />}
           </element>
  }
}

const program = blessed.program()
var screen = blessed.screen({
  autoPadding: true,
  smartCSR: true,
  dockBorders: true,
  title: 'Redash',
  debug: true,
  log: "./tdash.log",
  program
});

render(<App screen={screen} />, screen)
