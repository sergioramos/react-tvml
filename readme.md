# react-tvml

**this is a very alpha release**

React bindings to Apple's [TVJS and TVML](https://developer.apple.com/library/prerelease/tvos/navigation/)

[![](http://g.recordit.co/qWrCpEb3MQ.gif)](https://cldup.com/u6sOUJLLE9.mp4)
(it's not this slow, click on the gif to see a video)

## install
```bash
$ npm install --save react-tvml
```

## usage

```js
var React = require('react');
var TVML = require('react-tvml');

var App = React.createClass({
  render: function() {
    return (<loadingTemplate>
      <activityIndicator>
        <text>Loading...</text>
      </activityIndicator>
    </loadingTemplate>);
  }
});

TVML.render(<App />);
```

## todo (PRs are welcome)

 * Most of the code is copied from the react dom renderer. A lot of it needs to be removed and cleaned according to TVML use case
 * push vs replace document
 * some events
 * A **lot** of polish
 * Validations: e.g. some components can only be children of some specific components
 * consistent code style and linting
 * tests

## license

BSD