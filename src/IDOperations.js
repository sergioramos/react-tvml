'use strict';

var DOMChildrenOperations = require('react/lib/DOMChildrenOperations');
var DOMPropertyOperations = require('react/lib/DOMPropertyOperations');
var ReactPerf = require('react/lib/ReactPerf');
var Mount = require('./Mount');

var invariant = require('fbjs/lib/invariant');


/**
 * Operations used to process updates to DOM nodes.
 */
var ReactTVMLIDOperations = {
  /**
   * Replaces a DOM node that exists in the document with markup.
   *
   * @param {string} id ID of child to be replaced.
   * @param {string} markup Dangerous markup to inject in place of child.
   * @internal
   * @see {Danger.dangerouslyReplaceNodeWithMarkup}
   */
  replaceNodeWithMarkupByID: function(id, markup) {
    var node = Mount.getNode(id);
    DOMChildrenOperations.dangerouslyReplaceNodeWithMarkup(node, markup);
  },

  /**
   * Updates a component's children by processing a series of updates.
   *
   * @param {array<object>} updates List of update configurations.
   * @param {array<string>} markup List of markup strings.
   * @internal
   */
  processChildrenUpdates: function(updates, markup) {
    DOMChildrenOperations.processUpdates(updates.map(function(update) {
      update.parentNode = Mount.getNode(update.parentID);
      return update;
    }), markup);
  },

  /**
  * If a particular environment requires that some resources be cleaned up,
  * specify this in the injected Mixin. In the DOM, we would likely want to
  * purge any cached node ID lookups.
  *
  * @private
  */
  unmountIDFromEnvironment: function(rootNodeID) {
    Mount.purgeID(rootNodeID);
  }
};

ReactPerf.measureMethods(ReactTVMLIDOperations, 'ReactTVMLIDOperations', {
  updatePropertyByID: 'updatePropertyByID',
  replaceNodeWithMarkupByID: 'replaceNodeWithMarkupByID',
  processChildrenUpdates: 'processChildrenUpdates'
});

module.exports = ReactTVMLIDOperations;