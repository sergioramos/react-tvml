'use strict';

var hasOwnProperty = require('has-own-prop');
var assign = require('react/lib/Object.assign');
var clone = require('lodash.clone');
var Mount = require('./Mount');


var valueContextKey = '__ReactTVMLMenuBar_value$' + Math.random().toString(36).slice(2);

var itemsToDocuments = {};
var menuBarsToItems = {};

var unMountItems = function(ids) {
  ids.forEach(function(id) {
    Mount.unmountComponentAtNode(Mount.findReactContainerForID(id));
    delete itemsToDocuments[id];
  });
};

var updateItemsIndex = function(ev, inst, props) {
  var prevChildIds = (function() {
    if (!hasOwnProperty(menuBarsToItems, inst._rootNodeID)) {
      return [];
    }

    return clone(menuBarsToItems[inst._rootNodeID]);
  })();

  var childKeys = Object.keys(inst._renderedChildren);
  var nextChildIds = childKeys.map(function (name) {
    return inst._renderedChildren[name]._rootNodeID;
  });

  unMountItems(prevChildIds.filter(function(id) {
    return nextChildIds.indexOf(id) < 0;
  }));

  menuBarsToItems[inst._rootNodeID] = nextChildIds;
};

var getChildrenNodes = function(inst) {
  return Object.keys(inst._renderedChildren).map(function (name) {
    return inst._renderedChildren[name];
  });
};

var getChildrenNodeById = function(inst, id) {
  return getChildrenNodes(inst).filter(function(child) {
    return child._rootNodeID === id;
  }).pop();
};

var render = function(ev, item, doc, feature) {
  var el = item._currentElement.props.render(ev);

  Mount._renderSubtreeIntoContainer(null, el, doc);
  feature.setDocument(doc, ev.target);
}

var mountDocument = function(ev, item, feature) {
  var doc = Mount.generateEmptyContainer();

  render(ev, item, doc, feature);
  itemsToDocuments[item._rootNodeID] = doc;
}

var updateDocument = function(ev, item, feature) {
  var doc = itemsToDocuments[item._rootNodeID];

  render(ev, item, doc, feature);
};

var onSelect = function(inst, props, context) {
  return function(ev) {
    updateItemsIndex(ev, inst, props);

    var item = getChildrenNodeById(inst, ev.dispatchMarker);

    if (hasOwnProperty(item._currentElement.props, 'onSelect')) {
      item._currentElement.props.onSelect(ev);
    }

    var feature = ev.target.parentNode.getFeature('MenuBarDocument');
    if (!hasOwnProperty(itemsToDocuments, item._rootNodeID)) {
      mountDocument(ev, item, feature);
    } else {
      updateDocument(ev, item, feature);
    }
  };
};

var menuBar = {
  valueContextKey: valueContextKey,
  getNativeProps: function (inst, props, context) {
    return assign({}, props, {
      onSelect: onSelect(inst, props, context),
      value: undefined
    });
  }
};

module.exports = menuBar;
