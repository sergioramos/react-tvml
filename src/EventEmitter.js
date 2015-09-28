// For components like lockup, listItemLockup you can expect select, play, highlight, holdselect. For Buttons only select and play events are fired. For text fields change event is sent.
'use strict';

var EventPluginHub = require('react/lib//EventPluginHub');
var EventPluginRegistry = require('react/lib//EventPluginRegistry');
var ReactEventEmitterMixin = require('react/lib//ReactEventEmitterMixin');
var EventListener = require('./EventListener');

var assign = require('react/lib/Object.assign');
var hasOwnProperty = require('has-own-prop');


/**
 * Summary of `EventEmitter` event handling:
 *
 *  - Top-level delegation is used to trap most native browser events. This
 *    may only occur in the main thread and is the responsibility of
 *    EventListener, which is injected and can therefore support pluggable
 *    event sources. This is the only work that occurs in the main thread.
 *
 *  - We normalize and de-duplicate events to account for browser quirks. This
 *    may be done in the worker thread.
 *
 *  - Forward these native events (with the associated top-level type used to
 *    trap it) to `EventPluginHub`, which in turn will ask plugins if they want
 *    to extract any synthetic events.
 *
 *  - The `EventPluginHub` will then process each event by annotating them with
 *    "dispatches", a sequence of listeners and IDs that care about that event.
 *
 *  - The `EventPluginHub` then dispatches the events.
 *
 * Overview of React and the event system:
 *
 * +------------+    .
 * |    DOM     |    .
 * +------------+    .
 *       |           .
 *       v           .
 * +------------+    .
 * | ReactEvent |    .
 * |  Listener  |    .
 * +------------+    .                         +-----------+
 *       |           .               +--------+|SimpleEvent|
 *       |           .               |         |Plugin     |
 * +-----|------+    .               v         +-----------+
 * |     |      |    .    +--------------+                    +------------+
 * |     +-----------.--->|EventPluginHub|                    |    Event   |
 * |            |    .    |              |     +-----------+  | Propagators|
 * | ReactEvent |    .    |              |     |TapEvent   |  |------------|
 * |  Emitter   |    .    |              |<---+|Plugin     |  |other plugin|
 * |            |    .    |              |     +-----------+  |  utilities |
 * |     +-----------.--->|              |                    +------------+
 * |     |      |    .    +--------------+
 * +-----|------+    .                ^        +-----------+
 *       |           .                |        |Enter/Leave|
 *       +           .                +-------+|Plugin     |
 * +-------------+   .                         +-----------+
 * | application |   .
 * |-------------|   .
 * |             |   .
 * |             |   .
 * +-------------+   .
 *                   .
 *    React Core     .  General Purpose Event Plugin System
 */

var alreadyListeningTo = {};
var reactTopListenersCounter = 0;

// For events like 'submit' which don't consistently bubble (which we trap at a
// lower node than `document`), binding at `document` would cause duplicate
// events so we don't include them here
var topEventMapping = {
  topSelect: 'select',
  topPlay: 'play',
  topHighlight: 'highlight',
  topHoldselect: 'holdselect'
};

/**
 * To ensure no conflicts with other potential React instances on the page
 */
var topListenersIDKey = '_reactListenersID' + String(Math.random()).slice(2);

function getListeningForDocument(mountAt) {
  if (!hasOwnProperty(mountAt, topListenersIDKey)) {
    mountAt[topListenersIDKey] = reactTopListenersCounter + 1;
    alreadyListeningTo[mountAt[topListenersIDKey]] = {};
  }

  return alreadyListeningTo[mountAt[topListenersIDKey]];
}

var getDependencies = function(name) {
  return EventPluginRegistry.registrationNameDependencies[name];
};

/**
 * `EventEmitter` is used to attach top-level event listeners. For
 * example:
 *
 *   EventEmitter.putListener('myID', 'onClick', myFunction);
 *
 * This would allocate a "registration" of `('onClick', myFunction)` on 'myID'.
 *
 * @internal
 */
var EventEmitter = assign({}, ReactEventEmitterMixin, {
  /**
   * Sets whether or not any created callbacks should be enabled.
   *
   * @param {boolean} enabled True if callbacks should be enabled.
   */
  setEnabled: function(enabled) {
    EventListener.setEnabled(enabled);
  },

  /**
   * @return {boolean} True if callbacks are enabled.
   */
  isEnabled: function() {
    return EventListener.isEnabled();
  },

  /**
   * We listen for bubbled touch events on the document object.
   *
   *
   * @param {string} registrationName Name of listener (e.g. `onSelect`).
   * @param {object} mountAt Document which owns the container
   */
  listenTo: function(registrationName, mountAt) {
    var isListening = getListeningForDocument(mountAt);
    var dependencies = getDependencies(registrationName);

    dependencies.forEach(function(dependency) {
      if ((hasOwnProperty(isListening, dependency) && isListening[dependency])) {
        return;
      }

      if (hasOwnProperty(topEventMapping, dependency)) {
        EventEmitter.trapBubbledEvent(dependency, topEventMapping[dependency], mountAt);
      }

      isListening[dependency] = true;
    });
  },

  trapBubbledEvent: function(topLevelType, handlerBaseName, handle) {
    return EventListener.trapBubbledEvent(topLevelType, handlerBaseName, handle);
  },

  trapCapturedEvent: function(topLevelType, handlerBaseName, handle) {
    return EventListener.trapCapturedEvent(topLevelType, handlerBaseName, handle);
  },

  eventNameDispatchConfigs: EventPluginHub.eventNameDispatchConfigs,
  registrationNameModules: EventPluginHub.registrationNameModules,
  putListener: EventPluginHub.putListener,
  getListener: EventPluginHub.getListener,
  deleteListener: EventPluginHub.deleteListener,
  deleteAllListeners: EventPluginHub.deleteAllListeners
});

module.exports = EventEmitter;
