var FlowChart = require('./flowchart.chart');
var Start = require('./flowchart.symbol.start');
var End = require('./flowchart.symbol.end');
var Operation = require('./flowchart.symbol.operation');
var InputOutput = require('./flowchart.symbol.inputoutput');
var Subroutine = require('./flowchart.symbol.subroutine');
var Condition = require('./flowchart.symbol.condition');
var Select = require('./flowchart.symbol.select');

function parse(input) {
  input = input || '';
  input = input.trim();

  var chart = {
    symbols: {},
    start: null,
    drawSVG: function (container, options) {
      var self = this;

      if (this.diagram) {
        this.diagram.clean();
      }

      var diagram = new FlowChart(container, options);
      this.diagram = diagram;
      var dispSymbols = {};

      function getDisplaySymbol(s) {
        if (dispSymbols[s.key]) {
          return dispSymbols[s.key];
        }

        switch (s.symbolType) {
          case 'start':
            dispSymbols[s.key] = new Start(diagram, s);
            break;
          case 'end':
            dispSymbols[s.key] = new End(diagram, s);
            break;
          case 'operation':
            dispSymbols[s.key] = new Operation(diagram, s);
            break;
          case 'inputoutput':
            dispSymbols[s.key] = new InputOutput(diagram, s);
            break;
          case 'subroutine':
            dispSymbols[s.key] = new Subroutine(diagram, s);
            break;
          case 'condition':
            dispSymbols[s.key] = new Condition(diagram, s);
            break;
          case 'select':
            dispSymbols[s.key] = new Select(diagram, s);
            break;
          default:
            return new Error('Wrong symbol types!');
        }

        return dispSymbols[s.key];
      }

      (function constructChart(symbol, prevDisp, prev) {
        var dispSymb = getDisplaySymbol(symbol);

        if (self.start === symbol) {
          diagram.startWith(dispSymb);
        } else if (prevDisp && prev && !prevDisp.pathOk) {
          if (prevDisp instanceof (Condition)) {
            if (prev.yes === symbol) {
              prevDisp.yes(dispSymb);
            }
            if (prev.no === symbol) {
              prevDisp.no(dispSymb);
            }
          } else if (prevDisp instanceof (Select)) {
            for (var j = 1; j < 11; j++) {
              var label = 'option' + j;
              if (prev[label] === symbol) {
                prevDisp[label](dispSymb, label);
              }
            }
          } else {
            prevDisp.then(dispSymb);
          }

        }

        if (dispSymb.pathOk) {
          return dispSymb;
        }

        if (dispSymb instanceof (Condition)) {
          if (symbol.yes) {
            constructChart(symbol.yes, dispSymb, symbol);
          }
          if (symbol.no) {
            constructChart(symbol.no, dispSymb, symbol);
          }
        } else if (dispSymb instanceof (Select)) {

          for (var jj = 1; jj < 11; jj++) {
            var label2 = 'option' + jj;
            if (symbol[label2]) {
              constructChart(symbol[label2], dispSymb, symbol);
            }
          }

        } else if (symbol.next) {
          constructChart(symbol.next, dispSymb, symbol);
        }


        return dispSymb;
      })(this.start);

      diagram.render();
    },
    clean: function () {
      this.diagram.clean();
    }
  };

  var lines = [];
  var prevBreak = 0;
  for (var i0 = 1, i0len = input.length; i0 < i0len; i0++) {
    if (input[i0] === '\n' && input[i0 - 1] !== '\\') {
      var line0 = input.substring(prevBreak, i0);
      prevBreak = i0 + 1;
      lines.push(line0.replace(/\\\n/g, '\n'));
    }
  }

  if (prevBreak < input.length) {
    lines.push(input.substr(prevBreak));
  }

  for (var l = 1, len = lines.length; l < len;) {
    var currentLine = lines[l];

    if (currentLine.indexOf('->') < 0 && currentLine.indexOf('=>') < 0 && currentLine.indexOf('@>') < 0) {
      lines[l - 1] += '\n' + currentLine;
      lines.splice(l, 1);
      len--;
    } else {
      l++;
    }
  }

  function getStyle(s) {
    var startIndex = s.indexOf('(') + 1;
    var endIndex = s.indexOf(')');
    if (startIndex >= 0 && endIndex >= 0) {
      return s.substring(startIndex, endIndex);
    }
    return '{}';
  }

  function getSymbol(s) {
    var startIndex = s.indexOf('(') + 1;
    var endIndex = s.indexOf(')');
    if (startIndex >= 0 && endIndex >= 0) {
      return chart.symbols[s.substring(0, startIndex - 1)];
    }
    return chart.symbols[s];
  }

  function getNextPath(s) {
    var next = 'next';
    var startIndex = s.indexOf('(') + 1;
    var endIndex = s.indexOf(')');
    if (startIndex >= 0 && endIndex >= 0) {
      next = flowSymb.substring(startIndex, endIndex);
      if (next.indexOf(',') < 0) {
        if (next !== 'yes' && next !== 'no' && next.substr(0, 2) !== 'op') {
          next = 'next, ' + next;
        }
      }
    }
    return next;
  }

  while (lines.length > 0) {
    var line = lines.splice(0, 1)[0].trim();

    var nextSymb;

    if (line.indexOf('=>') >= 0) {
      // definition
      var parts = line.split('=>');
      var symbol = {
        key: parts[0].replace(/\(.*\)/, ''),
        symbolType: parts[1],
        text: null,
        link: null,
        target: null,
        flowstate: null,
        lineStyle: {},
        params: {}
      };

      //parse parameters
      var params = parts[0].match(/\((.*)\)/);
      if (params && params.length > 1) {
        var entries = params[1].split(',');
        for (var ii = 0; ii < entries.length; ii++) {
          var entry = entries[0].split('=');
          if (entry.length === 2) {
            symbol.params[entry[0]] = entry[1];
          }
        }
      }

      var sub;

      if (symbol.symbolType.indexOf(': ') >= 0) {
        sub = symbol.symbolType.split(': ');
        symbol.symbolType = sub.shift();
        symbol.text = sub.join(': ');
      }

      if (symbol.text && symbol.text.indexOf(':>') >= 0) {
        sub = symbol.text.split(':>');
        symbol.text = sub.shift();
        symbol.link = sub.join(':>');
      } else if (symbol.symbolType.indexOf(':>') >= 0) {
        sub = symbol.symbolType.split(':>');
        symbol.symbolType = sub.shift();
        symbol.link = sub.join(':>');
      }

      if (symbol.symbolType.indexOf('\n') >= 0) {
        symbol.symbolType = symbol.symbolType.split('\n')[0];
      }

      /* adding support for links */
      if (symbol.link) {
        var startIndex = symbol.link.indexOf('[') + 1;
        var endIndex = symbol.link.indexOf(']');
        if (startIndex >= 0 && endIndex >= 0) {
          symbol.target = symbol.link.substring(startIndex, endIndex);
          symbol.link = symbol.link.substring(0, startIndex - 1);
        }
      }
      /* end of link support */

      /* adding support for flowstates */
      if (symbol.text) {
        if (symbol.text.indexOf('|') >= 0) {
          var txtAndState = symbol.text.split('|');
          symbol.flowstate = txtAndState.pop().trim();
          symbol.text = txtAndState.join('|');
        }
      }
      /* end of flowstate support */

      chart.symbols[symbol.key] = symbol;

    } else if (line.indexOf('->') >= 0) {

      // flow
      var flowSymbols = line.split('->');
      for (var i = 0, lenS = flowSymbols.length; i < lenS; i++) {
        var flowSymb = flowSymbols[i];

        var realSymb = getSymbol(flowSymb);
        var next = getNextPath(flowSymb);

        var direction = null;
        if (next.indexOf(',') >= 0) {
          var condOpt = next.split(',');
          next = condOpt[0];
          direction = condOpt[1].trim();
        }

        if (!chart.start) {
          chart.start = realSymb;
        }

        if (i + 1 < lenS) {
          nextSymb = flowSymbols[i + 1];
          realSymb[next] = getSymbol(nextSymb);
          realSymb['direction_' + next] = direction;
          direction = null;
        }
      }
    } else if (line.indexOf('@>') >= 0) {

      // line style
      var lineStyleSymbols = line.split('@>');
      for (var iii = 0, lenSS = lineStyleSymbols.length; iii < lenSS; iii++) {

        if ((iii + 1) !== lenSS) {
          var curSymb = getSymbol(lineStyleSymbols[i]);
          nextSymb = getSymbol(lineStyleSymbols[iii + 1]);

          curSymb['lineStyle'][nextSymb.key] = JSON.parse(getStyle(lineStyleSymbols[iii + 1]));
        }
      }
    }

  }
  return chart;
}

module.exports = parse;
