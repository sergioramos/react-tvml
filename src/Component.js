'use strict';

// TODO: validate children elements (or parents?). Ex: <badge> can only be a child of
//  - buttonLockup
//  - header
//  - lockup
//  - overlay
//  - row
//  - text
//  - title

// TODO: validate CSS props. Only some are valid
var __DEV__ = process.env.NODE_ENV !== 'production';

var CSSPropertyOperations = require('react/lib/CSSPropertyOperations');
var DOMProperty = require('react/lib/DOMProperty');
var DOMPropertyOperations = require('react/lib/DOMPropertyOperations');
// var EventConstants = require('react/lib/EventConstants');
var EventEmitter = require('./EventEmitter');
var IDOperations = require('./IDOperations');
var MultiChild = require('react/lib/ReactMultiChild');
var Perf = require('react/lib/ReactPerf');
var UpdateQueue = require('react/lib/ReactUpdateQueue');

var assign = require('react/lib/Object.assign');
var escapeTextContentForBrowser = require('react/lib/escapeTextContentForBrowser');
var invariant = require('fbjs/lib/invariant');
var isEventSupported = require('react/lib/isEventSupported');
var keyOf = require('fbjs/lib/keyOf');
var setInnerHTML = require('react/lib/setInnerHTML');
var setTextContent = require('react/lib/setTextContent');
var shallowEqual = require('fbjs/lib/shallowEqual');
var validateDOMNesting = require('react/lib/validateDOMNesting');
var warning = require('fbjs/lib/warning');

var hasOwnProperty = require('has-own-prop');

var Mount = require('./Mount');


var ELEMENT_NODE_TYPE = 1;

// For quickly matching children type, to test if can be treated as content.
var CONTENT_TYPES = {
  'string': true,
  'number': true
};

var STYLE = keyOf({
  'style': null
});

var COMPONENT_CLASSES = {
  menubar: require('./menuBar')
};

function getDeclarationErrorAddendum(internalInstance) {
  if (internalInstance) {
    var owner = internalInstance._currentElement._owner || null;
    if (owner) {
      var name = owner.getName();
      if (name) {
        return ' This DOM node was rendered by `' + name + '`.';
      }
    }
  }
  return '';
}


function legacyGetDOMNode() {
  if (__DEV__) {
    var component = this._reactInternalComponent;
    warning(
      false,
      'ReactTVMLComponent: Do not access .getDOMNode() of a DOM node; ' +
      'instead, use the node directly.%s',
      getDeclarationErrorAddendum(component)
    );
  }
  return this;
}

function legacyIsMounted() {
  var component = this._reactInternalComponent;
  if (__DEV__) {
    warning(
      false,
      'ReactTVMLComponent: Do not access .isMounted() of a DOM node.%s',
      getDeclarationErrorAddendum(component)
    );
  }
  return !!component;
}

function legacySetStateEtc() {
  if (__DEV__) {
    var component = this._reactInternalComponent;
    warning(
      false,
      'ReactTVMLComponent: Do not access .setState(), .replaceState(), or ' +
      '.forceUpdate() of a DOM node. This is a no-op.%s',
      getDeclarationErrorAddendum(component)
    );
  }
}

function legacySetProps(partialProps, callback) {
  var component = this._reactInternalComponent;
  if (__DEV__) {
    warning(
      false,
      'ReactTVMLComponent: Do not access .setProps() of a DOM node. ' +
      'Instead, call ReactDOM.render again at the top level.%s',
      getDeclarationErrorAddendum(component)
    );
  }
  if (!component) {
    return;
  }
  UpdateQueue.enqueueSetPropsInternal(component, partialProps);
  if (callback) {
    UpdateQueue.enqueueCallbackInternal(component, callback);
  }
}

function legacyReplaceProps(partialProps, callback) {
  var component = this._reactInternalComponent;
  if (__DEV__) {
    warning(
      false,
      'ReactTVMLComponent: Do not access .replaceProps() of a DOM node. ' +
      'Instead, call ReactDOM.render again at the top level.%s',
      getDeclarationErrorAddendum(component)
    );
  }
  if (!component) {
    return;
  }
  UpdateQueue.enqueueReplacePropsInternal(component, partialProps);
  if (callback) {
    UpdateQueue.enqueueCallbackInternal(component, callback);
  }
}

var styleMutationWarning = {};

function checkAndWarnForMutatedStyle(style1, style2, component) {
  if (style1 == null || style2 == null) {
    return;
  }
  if (shallowEqual(style1, style2)) {
    return;
  }

  var componentName = component._tag;
  var owner = component._currentElement._owner;
  var ownerName;
  if (owner) {
    ownerName = owner.getName();
  }

  var hash = ownerName + '|' + componentName;

  if (hasOwnProperty(styleMutationWarning, hash)) {
    return;
  }

  styleMutationWarning[hash] = true;

  warning(
    false,
    '`%s` was passed a style object that has previously been mutated. ' +
    'Mutating `style` is deprecated. Consider cloning it beforehand. Check ' +
    'the `render` %s. Previous style: %s. Mutated style: %s.',
    componentName,
    owner ? 'of `' + ownerName + '`' : 'using <' + componentName + '>',
    JSON.stringify(style1),
    JSON.stringify(style2)
  );
}

/**
 * @param {object} component
 * @param {?object} props
 */
function assertValidProps(component, props) {
  if (!props) {
    return;
  }
  // Note the use of `==` which checks for null or undefined.
  if (__DEV__) {
    if (voidElementTags[component._tag]) {
      warning(
        props.children == null && props.dangerouslySetInnerHTML == null,
        '%s is a void element tag and must not have `children` or ' +
        'use `props.dangerouslySetInnerHTML`.%s',
        component._tag,
        component._currentElement._owner ?
          ' Check the render method of ' +
          component._currentElement._owner.getName() + '.' :
          ''
      );
    }
  }
  if (props.dangerouslySetInnerHTML != null) {
    invariant(
      props.children == null,
      'Can only set one of `children` or `props.dangerouslySetInnerHTML`.'
    );
    invariant(
      typeof props.dangerouslySetInnerHTML === 'object' &&
      '__html' in props.dangerouslySetInnerHTML,
      '`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. ' +
      'Please visit https://fb.me/react-invariant-dangerously-set-inner-html ' +
      'for more information.'
    );
  }
  if (__DEV__) {
    warning(
      props.innerHTML == null,
      'Directly setting property `innerHTML` is not permitted. ' +
      'For more information, lookup documentation on `dangerouslySetInnerHTML`.'
    );
    warning(
      !props.contentEditable || props.children == null,
      'A component is `contentEditable` and contains `children` managed by ' +
      'React. It is now your responsibility to guarantee that none of ' +
      'those nodes are unexpectedly modified or duplicated. This is ' +
      'probably not intentional.'
    );
  }
  invariant(
    props.style == null || typeof props.style === 'object',
    'The `style` prop expects a mapping from style properties to values, ' +
    'not a string. For example, style={{marginRight: spacing + \'em\'}} when ' +
    'using JSX.%s',
     getDeclarationErrorAddendum(component)
  );
}

function enqueuePutListener(id, registrationName, listener, transaction) {
  var container = Mount.findReactContainerForID(id);
  if (container) {
    var doc = container.nodeType === ELEMENT_NODE_TYPE ? container.ownerDocument : container;
    EventEmitter.listenTo(registrationName, doc);
  }
  transaction.getReactMountReady().enqueue(putListener, {
    id: id,
    registrationName: registrationName,
    listener: listener
  });
}

function putListener(id, registrationName, listener, transaction) {
  // TODO check if tvml registers events the same way as listenTo
  // TODO I'm not sure we can register events in `document` and delegate
  EventEmitter.EventEmitter.listenTo(registrationName, Mount.findReactContainerForID(id));

  transaction.getReactMountReady().enqueue(putListener, {
    id: id,
    registrationName: registrationName,
    listener: listener,
  });

  // if (container) {
  //   var doc = container.nodeType === ELEMENT_NODE_TYPE ?
  //     container.ownerDocument :
  //     container;
  //   EventEmitter.listenTo(registrationName, doc);
  // }
}

function putListener() {
  var listenerToPut = this;
  EventEmitter.putListener(
    listenerToPut.id,
    listenerToPut.registrationName,
    listenerToPut.listener
  );
}

// There are so many media events, it makes sense to just
// maintain a list rather than create a `trapBubbledEvent` for each
var mediaEvents = {
  // topAbort: 'abort',
  // topCanPlay: 'canplay',
  // topCanPlayThrough: 'canplaythrough',
  // topDurationChange: 'durationchange',
  // topEmptied: 'emptied',
  // topEncrypted: 'encrypted',
  // topEnded: 'ended',
  // topError: 'error',
  // topLoadedData: 'loadeddata',
  // topLoadedMetadata: 'loadedmetadata',
  // topLoadStart: 'loadstart',
  // topPause: 'pause',
  // topPlay: 'play',
  // topPlaying: 'playing',
  // topProgress: 'progress',
  // topRateChange: 'ratechange',
  // topSeeked: 'seeked',
  // topSeeking: 'seeking',
  // topStalled: 'stalled',
  // topSuspend: 'suspend',
  // topTimeUpdate: 'timeupdate',
  // topVolumeChange: 'volumechange',
  // topWaiting: 'waiting',
};

function postUpdateSelectWrapper() {
  DOMSelect.postUpdateWrapper(this);
}

// For HTML, certain tags should omit their close tag. We keep a whitelist for
// those special cased tags.
var omittedCloseTags = {
  'badge': true,
  'decorationImage': true,
  'fullscreenImg': true,
  'heroImg': true,
  'img': true,
  'ratingBadge': true,
  'asset': true,
  'monogram': true
};

var newlineEatingTags = {
  // 'listing': true,
  // 'pre': true,
  // 'textarea': true,
};

// For HTML, certain tags cannot have children. This has the same purpose as
// `omittedCloseTags` except that `menuitem` should still have its closing tag.
var voidElementTags = assign({
}, omittedCloseTags);

// We accept any tag to be rendered but since this gets injected into arbitrary
// HTML, we want to make sure that it's a safe tag.
// http://www.w3.org/TR/REC-xml/#NT-Name

var VALID_TAG_REGEX = /^[a-zA-Z][a-zA-Z:_\.\-\d]*$/; // Simplified subset
var validatedTagCache = {};

function validateDangerousTag(tag) {
  if (!hasOwnProperty(validatedTagCache, tag)) {
    invariant(VALID_TAG_REGEX.test(tag), 'Invalid tag: %s', tag);
    validatedTagCache[tag] = true;
  }
}

function processChildContext(context, inst) {
  if (__DEV__) {
    // Pass down our tag name to child components for validation purposes
    context = assign({}, context);
    var info = context[validateDOMNesting.ancestorInfoContextKey];
    context[validateDOMNesting.ancestorInfoContextKey] =
      validateDOMNesting.updatedAncestorInfo(info, inst._tag, inst);
  }
  return context;
}

function isCustomComponent(tagName, props) {
  return tagName.indexOf('-') >= 0 || props.is != null;
}

/**
 * Creates a new React class that is idempotent and capable of containing other
 * React components. It accepts event listeners and DOM properties that are
 * valid according to `DOMProperty`.
 *
 *  - Event listeners: `onClick`, `onMouseDown`, etc.
 *  - DOM properties: `className`, `name`, `title`, etc.
 *
 * The `style` property functions differently from the DOM API. It accepts an
 * object mapping of style properties to values.
 *
 * @constructor ReactTVMLComponent
 * @extends ReactMultiChild
 */
function ReactTVMLComponent(tag) {
  validateDangerousTag(tag);
  this._tag = tag.toLowerCase();
  this._renderedChildren = null;
  this._previousStyle = null;
  this._previousStyleCopy = null;
  this._rootNodeID = null;
  this._wrapperState = null;
  this._topLevelWrapper = null;
  this._nodeWithLegacyProperties = null;
}

ReactTVMLComponent.displayName = 'ReactTVMLComponent';

ReactTVMLComponent.Mixin = {

  construct: function(element) {
    this._currentElement = element;
  },

  /**
   * Generates root tag markup then recurses. This method has side effects and
   * is not idempotent.
   *
   * @internal
   * @param {string} rootID The root DOM ID for this node.
   * @param {ReactReconcileTransaction|ReactServerRenderingTransaction} transaction
   * @param {object} context
   * @return {string} The computed markup.
   */
  mountComponent: function(rootID, transaction, context) {
    this._rootNodeID = rootID;

    var props = this._currentElement.props;

    if (hasOwnProperty(COMPONENT_CLASSES, this._tag)) {
      if (hasOwnProperty(COMPONENT_CLASSES[this._tag], 'getNativeProps')) {
        props = COMPONENT_CLASSES[this._tag].getNativeProps(this, props, context);
      }
    }

    assertValidProps(this, props);
    if (__DEV__) {
      if (context[validateDOMNesting.ancestorInfoContextKey]) {
        validateDOMNesting(
          this._tag,
          this,
          context[validateDOMNesting.ancestorInfoContextKey]
        );
      }
    }

    var mountImage;
    // isn't useCreateElement always false?
    if (transaction.useCreateElement) {
      var ownerDocument = context[Mount.ownerDocumentContextKey];
      var el = ownerDocument.createElement(this._currentElement.type);
      DOMPropertyOperations.setAttributeForID(el, this._rootNodeID);
      // Populate node cache
      Mount.getID(el);
      this._updateDOMProperties({}, props, transaction, el);
      this._createInitialChildren(transaction, props, context, el);
      mountImage = el;
    } else {
      var tagOpen = this._createOpenTagMarkupAndPutListeners(transaction, props);
      var tagContent = this._createContentMarkup(transaction, props, context);
      if (!tagContent && omittedCloseTags[this._tag]) {
        mountImage = tagOpen + '/>';
      } else {
        mountImage =
          tagOpen + '>' + tagContent + '</' + this._currentElement.type + '>';
      }
    }

    return mountImage;
  },

  /**
   * Creates markup for the open tag and all attributes.
   *
   * This method has side effects because events get registered.
   *
   * Iterating over object properties is faster than iterating over arrays.
   * @see http://jsperf.com/obj-vs-arr-iteration
   *
   * @private
   * @param {ReactReconcileTransaction|ReactServerRenderingTransaction} transaction
   * @param {object} props
   * @return {string} Markup of opening tag.
   */
  _createOpenTagMarkupAndPutListeners: function(transaction, props) {
    var ret = '<' + this._currentElement.type;

    for (var propKey in props) {
      if (!hasOwnProperty(props, propKey)) {
        continue;
      }
      var propValue = props[propKey];
      if (propValue == null) {
        continue;
      }
      if (hasOwnProperty(EventEmitter.registrationNameModules, propKey)) {
        enqueuePutListener(this._rootNodeID, propKey, propValue, transaction);
      } else {
        if (propKey === STYLE) {
          if (propValue) {
            if (__DEV__) {
              // See `_updateDOMProperties`. style block
              this._previousStyle = propValue;
            }
            propValue = this._previousStyleCopy = assign({}, props.style);
          }
          propValue = CSSPropertyOperations.createMarkupForStyles(propValue);
        }
        var markup = null;
        if (this._tag != null && isCustomComponent(this._tag, props)) {
          markup = DOMPropertyOperations.createMarkupForCustomAttribute(propKey, propValue);
        } else {
          markup = DOMPropertyOperations.createMarkupForProperty(propKey, propValue);
        }
        if (markup) {
          ret += ' ' + markup;
        }
      }
    }

    // For static pages, no need to put React ID and checksum. Saves lots of
    // bytes.
    if (transaction.renderToStaticMarkup) {
      return ret;
    }

    var markupForID = DOMPropertyOperations.createMarkupForID(this._rootNodeID);
    return ret + ' ' + markupForID;
  },

  /**
   * Creates markup for the content between the tags.
   *
   * @private
   * @param {ReactReconcileTransaction|ReactServerRenderingTransaction} transaction
   * @param {object} props
   * @param {object} context
   * @return {string} Content markup.
   */
  _createContentMarkup: function(transaction, props, context) {
    var ret = '';

    // Intentional use of != to avoid catching zero/false.
    var innerHTML = props.dangerouslySetInnerHTML;
    if (innerHTML != null) {
      if (innerHTML.__html != null) {
        ret = innerHTML.__html;
      }
    } else {
      var contentToUse =
        CONTENT_TYPES[typeof props.children] ? props.children : null;
      var childrenToUse = contentToUse != null ? null : props.children;
      if (contentToUse != null) {
        // TODO: Validate that text is allowed as a child of this node
        ret = escapeTextContentForBrowser(contentToUse);
      } else if (childrenToUse != null) {
        var mountImages = this.mountChildren(
          childrenToUse,
          transaction,
          processChildContext(context, this)
        );
        ret = mountImages.join('');
      }
    }
    if (newlineEatingTags[this._tag] && ret.charAt(0) === '\n') {
      // text/html ignores the first character in these tags if it's a newline
      // Prefer to break application/xml over text/html (for now) by adding
      // a newline specifically to get eaten by the parser. (Alternately for
      // textareas, replacing "^\n" with "\r\n" doesn't get eaten, and the first
      // \r is normalized out by HTMLTextAreaElement#value.)
      // See: <http://www.w3.org/TR/html-polyglot/#newlines-in-textarea-and-pre>
      // See: <http://www.w3.org/TR/html5/syntax.html#element-restrictions>
      // See: <http://www.w3.org/TR/html5/syntax.html#newlines>
      // See: Parsing of "textarea" "listing" and "pre" elements
      //  from <http://www.w3.org/TR/html5/syntax.html#parsing-main-inbody>
      return '\n' + ret;
    } else {
      return ret;
    }
  },

  _createInitialChildren: function(transaction, props, context, el) {
    // Intentional use of != to avoid catching zero/false.
    var innerHTML = props.dangerouslySetInnerHTML;
    if (innerHTML != null) {
      if (innerHTML.__html != null) {
        setInnerHTML(el, innerHTML.__html);
      }
    } else {
      var contentToUse =
        CONTENT_TYPES[typeof props.children] ? props.children : null;
      var childrenToUse = contentToUse != null ? null : props.children;
      if (contentToUse != null) {
        // TODO: Validate that text is allowed as a child of this node
        setTextContent(el, contentToUse);
      } else if (childrenToUse != null) {
        var mountImages = this.mountChildren(
          childrenToUse,
          transaction,
          processChildContext(context, this)
        );
        for (var i = 0; i < mountImages.length; i++) {
          el.appendChild(mountImages[i]);
        }
      }
    }
  },

  /**
   * Receives a next element and updates the component.
   *
   * @internal
   * @param {ReactElement} nextElement
   * @param {ReactReconcileTransaction|ReactServerRenderingTransaction} transaction
   * @param {object} context
   */
  receiveComponent: function(nextElement, transaction, context) {
    var prevElement = this._currentElement;
    this._currentElement = nextElement;
    this.updateComponent(transaction, prevElement, nextElement, context);
  },

  /**
   * Updates a native DOM component after it has already been allocated and
   * attached to the DOM. Reconciles the root DOM node, then recurses.
   *
   * @param {ReactReconcileTransaction} transaction
   * @param {ReactElement} prevElement
   * @param {ReactElement} nextElement
   * @internal
   * @overridable
   */
  updateComponent: function(transaction, prevElement, nextElement, context) {
    var lastProps = prevElement.props;
    var nextProps = this._currentElement.props;

    if (hasOwnProperty(COMPONENT_CLASSES, this._tag)) {
      if (hasOwnProperty(COMPONENT_CLASSES[this._tag], 'getNativeProps')) {
        lastProps = COMPONENT_CLASSES[this._tag].getNativeProps(this, lastProps);
        nextProps = COMPONENT_CLASSES[this._tag].getNativeProps(this, nextProps);
      }
    }

    assertValidProps(this, nextProps);
    this._updateDOMProperties(lastProps, nextProps, transaction, null);
    this._updateDOMChildren(
      lastProps,
      nextProps,
      transaction,
      processChildContext(context, this)
    );
  },

  /**
   * Reconciles the properties by detecting differences in property values and
   * updating the DOM as necessary. This function is probably the single most
   * critical path for performance optimization.
   *
   * TODO: Benchmark whether checking for changed values in memory actually
   *       improves performance (especially statically positioned elements).
   * TODO: Benchmark the effects of putting this at the top since 99% of props
   *       do not change for a given reconciliation.
   * TODO: Benchmark areas that can be improved with caching.
   *
   * @private
   * @param {object} lastProps
   * @param {object} nextProps
   * @param {ReactReconcileTransaction} transaction
   * @param {?DOMElement} node
   */
  _updateDOMProperties: function(lastProps, nextProps, transaction, node) {
    var propKey;
    var styleName;
    var styleUpdates;
    for (propKey in lastProps) {
      if (hasOwnProperty(nextProps, propKey) || !hasOwnProperty(lastProps, propKey)) {
        continue;
      }
      if (propKey === STYLE) {
        var lastStyle = this._previousStyleCopy;
        for (styleName in lastStyle) {
          if (hasOwnProperty(lastStyle, styleName)) {
            styleUpdates = styleUpdates || {};
            styleUpdates[styleName] = '';
          }
        }
        this._previousStyleCopy = null;
      } else if (hasOwnProperty(EventEmitter.registrationNameModules, propKey)) {
        if (lastProps[propKey]) {
          // Only call deleteListener if there was a listener previously or
          // else willDeleteListener gets called when there wasn't actually a
          // listener (e.g., onClick={null})
          EventEmitter.deleteListener(this._rootNodeID, propKey);
        }
      } else if (
          DOMProperty.properties[propKey] ||
          DOMProperty.isCustomAttribute(propKey)) {
        if (!node) {
          node = Mount.getNode(this._rootNodeID);
        }
        DOMPropertyOperations.deleteValueForProperty(node, propKey);
      }
    }
    for (propKey in nextProps) {
      var nextProp = nextProps[propKey];
      var lastProp = propKey === STYLE ?
        this._previousStyleCopy :
        lastProps[propKey];
      if (!hasOwnProperty(nextProps, propKey) || nextProp === lastProp) {
        continue;
      }
      if (propKey === STYLE) {
        if (nextProp) {
          if (__DEV__) {
            checkAndWarnForMutatedStyle(
              this._previousStyleCopy,
              this._previousStyle,
              this
            );
            this._previousStyle = nextProp;
          }
          nextProp = this._previousStyleCopy = assign({}, nextProp);
        } else {
          this._previousStyleCopy = null;
        }
        if (lastProp) {
          // Unset styles on `lastProp` but not on `nextProp`.
          for (styleName in lastProp) {
            if (hasOwnProperty(lastProp, styleName) &&
                (!nextProp || !hasOwnProperty(nextProp, styleName))) {
              styleUpdates = styleUpdates || {};
              styleUpdates[styleName] = '';
            }
          }
          // Update styles that changed since `lastProp`.
          for (styleName in nextProp) {
            if (hasOwnProperty(nextProp, styleName) &&
                lastProp[styleName] !== nextProp[styleName]) {
              styleUpdates = styleUpdates || {};
              styleUpdates[styleName] = nextProp[styleName];
            }
          }
        } else {
          // Relies on `updateStylesByID` not mutating `styleUpdates`.
          styleUpdates = nextProp;
        }
      } else if (hasOwnProperty(propKey)) {
        if (nextProp) {
          enqueuePutListener(this._rootNodeID, propKey, nextProp, transaction);
        } else if (lastProp) {
          EventEmitter.deleteListener(this._rootNodeID, propKey);
        }
      } else if (isCustomComponent(this._tag, nextProps)) {
        if (!node) {
          node = Mount.getNode(this._rootNodeID);
        }
        DOMPropertyOperations.setValueForAttribute(
          node,
          propKey,
          nextProp
        );
      } else if (
          DOMProperty.properties[propKey] ||
          DOMProperty.isCustomAttribute(propKey)) {
        if (!node) {
          node = Mount.getNode(this._rootNodeID);
        }
        // If we're updating to null or undefined, we should remove the property
        // from the DOM node instead of inadvertantly setting to a string. This
        // brings us in line with the same behavior we have on initial render.
        if (nextProp != null) {
          DOMPropertyOperations.setValueForProperty(node, propKey, nextProp);
        } else {
          DOMPropertyOperations.deleteValueForProperty(node, propKey);
        }
      }
    }
    if (styleUpdates) {
      if (!node) {
        node = Mount.getNode(this._rootNodeID);
      }
      CSSPropertyOperations.setValueForStyles(node, styleUpdates);
    }
  },

  /**
   * Reconciles the children with the various properties that affect the
   * children content.
   *
   * @param {object} lastProps
   * @param {object} nextProps
   * @param {ReactReconcileTransaction} transaction
   * @param {object} context
   */
  _updateDOMChildren: function(lastProps, nextProps, transaction, context) {
    var lastContent =
      CONTENT_TYPES[typeof lastProps.children] ? lastProps.children : null;
    var nextContent =
      CONTENT_TYPES[typeof nextProps.children] ? nextProps.children : null;

    var lastHtml =
      lastProps.dangerouslySetInnerHTML &&
      lastProps.dangerouslySetInnerHTML.__html;
    var nextHtml =
      nextProps.dangerouslySetInnerHTML &&
      nextProps.dangerouslySetInnerHTML.__html;

    // Note the use of `!=` which checks for null or undefined.
    var lastChildren = lastContent != null ? null : lastProps.children;
    var nextChildren = nextContent != null ? null : nextProps.children;

    // If we're switching from children to content/html or vice versa, remove
    // the old content
    var lastHasContentOrHtml = lastContent != null || lastHtml != null;
    var nextHasContentOrHtml = nextContent != null || nextHtml != null;
    if (lastChildren != null && nextChildren == null) {
      this.updateChildren(null, transaction, context);
    } else if (lastHasContentOrHtml && !nextHasContentOrHtml) {
      this.updateTextContent('');
    }

    if (nextContent != null) {
      if (lastContent !== nextContent) {
        this.updateTextContent('' + nextContent);
      }
    } else if (nextHtml != null) {
      if (lastHtml !== nextHtml) {
        this.updateMarkup('' + nextHtml);
      }
    } else if (nextChildren != null) {
      this.updateChildren(nextChildren, transaction, context);
    }
  },

  /**
   * Destroys all event registrations for this instance. Does not remove from
   * the DOM. That must be done by the parent.
   *
   * @internal
   */
  unmountComponent: function() {
    this.unmountChildren();
    EventEmitter.deleteAllListeners(this._rootNodeID);
    IDOperations.unmountIDFromEnvironment(this._rootNodeID);
    this._rootNodeID = null;
    this._wrapperState = null;
    if (this._nodeWithLegacyProperties) {
      var node = this._nodeWithLegacyProperties;
      node._reactInternalComponent = null;
      this._nodeWithLegacyProperties = null;
    }
  },

  getPublicInstance: function() {
    if (this._nodeWithLegacyProperties) {
      return this._nodeWithLegacyProperties;
    }

    var node = Mount.getNode(this._rootNodeID);

    node._reactInternalComponent = this;
    node.getDOMNode = legacyGetDOMNode;
    node.isMounted = legacyIsMounted;
    node.setState = legacySetStateEtc;
    node.replaceState = legacySetStateEtc;
    node.forceUpdate = legacySetStateEtc;
    node.setProps = legacySetProps;
    node.replaceProps = legacyReplaceProps;

    // updateComponent will update this property on subsequent renders
    node.props = this._currentElement.props;

    this._nodeWithLegacyProperties = node;
  }
};

Perf.measureMethods(ReactTVMLComponent, 'ReactTVMLComponent', {
  mountComponent: 'mountComponent',
  updateComponent: 'updateComponent'
});

assign(
  ReactTVMLComponent.prototype,
  ReactTVMLComponent.Mixin,
  MultiChild.Mixin
);

module.exports = ReactTVMLComponent;
