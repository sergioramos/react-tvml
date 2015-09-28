'use strict';

var EventPropagators = require('react/lib/EventPropagators');
var SyntheticEvent = require('react/lib/SyntheticEvent');

var keyOf = require('fbjs/lib/keyOf');


var eventTypes = {
  select: {
    phasedRegistrationNames: {
      bubbled: keyOf({
        onSelect: true
      }),
      captured: keyOf({
        onSelectCapture: true
      })
    }
  },
  play: {
    phasedRegistrationNames: {
      bubbled: keyOf({
        onPlay: true
      }),
      captured: keyOf({
        onPlayCapture: true
      })
    }
  },
  highlight: {
    phasedRegistrationNames: {
      bubbled: keyOf({
        onHighlight: true
      }),
      captured: keyOf({
        onHighlightCapture: true
      })
    }
  },
  holdSelect: {
    phasedRegistrationNames: {
      bubbled: keyOf({
        onHoldSelect: true
      }),
      captured: keyOf({
        onHoldSelectCapture: true
      })
    }
  }
};

var topLevelEventsToDispatchConfig = {
  topSelect: eventTypes.select,
  topPlay: eventTypes.play,
  topHighlight: eventTypes.highlight,
  topHoldSelect: eventTypes.holdSelect
};

for (var type in topLevelEventsToDispatchConfig) {
  topLevelEventsToDispatchConfig[type].dependencies = [type];
}


var SimpleEventPlugin = {
  eventTypes: eventTypes,

  /**
   * @param {string} topLevelType Record from `EventConstants`.
   * @param {DOMEventTarget} topLevelTarget The listening component root node.
   * @param {string} topLevelTargetID ID of `topLevelTarget`.
   * @param {object} nativeEvent Native browser event.
   * @return {*} An accumulation of synthetic events.
   * @see {EventPluginHub.extractEvents}
   */
  extractEvents: function (topLevelType, topLevelTarget, topLevelTargetID, nativeEvent, nativeEventTarget) {
    var dispatchConfig = topLevelEventsToDispatchConfig[topLevelType];

    if (!dispatchConfig) {
      return null;
    }

    var ev = SyntheticEvent.getPooled(dispatchConfig, topLevelTargetID, nativeEvent, nativeEventTarget);
    EventPropagators.accumulateTwoPhaseDispatches(ev);
    return ev;
  }
};

module.exports = SimpleEventPlugin;