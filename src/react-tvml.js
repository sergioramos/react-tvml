var Injection = require('react/lib/ReactInjection');
var EventPluginRegistry = require('react/lib/EventPluginRegistry');
var ComponentEnvironment = require('react/lib/ReactComponentEnvironment');
var ReactIsomorphic = require('react/lib/ReactIsomorphic');
var ReactDOMServer = require('react/lib/ReactDOMServer');
var EventPlugin = require('./EventPlugin');
var EventListener = require('./EventListener');
var Component = require('./Component');
var TextComponent = require('./TextComponent');
var ReconcileTransaction = require('./ReconcileTransaction');
var IDOperations = require('./IDOperations');
var Mount = require('./Mount');

var assign = require('react/lib/Object.assign')


EventPluginRegistry._resetEventPlugins();

EventPluginRegistry.registrationNameDependencies = {};

Injection.EventEmitter.injectReactEventListener(EventListener);

/**
 * Inject modules for resolving DOM hierarchy and plugin ordering.
 */
Injection.EventPluginHub.injectEventPluginOrder(['EventPlugin']);
// Injection.EventPluginHub.injectInstanceHandle(ReactInstanceHandles);
Injection.EventPluginHub.injectMount(Mount);

/**
 * Some important event plugins included by default (without having to require
 * them).
 */
Injection.EventPluginHub.injectEventPluginsByName({
  EventPlugin: EventPlugin
});

Injection.NativeComponent.injectGenericComponentClass(Component);
Injection.NativeComponent.injectTextComponentClass(TextComponent);

// Injection.Class.injectMixin(ReactBrowserComponentMixin);

// Injection.DOMProperty.injectDOMPropertyConfig(HTMLDOMPropertyConfig);
// Injection.DOMProperty.injectDOMPropertyConfig(SVGDOMPropertyConfig);
//
// Injection.EmptyComponent.injectEmptyComponent('noscript');

Injection.Updates.injectReconcileTransaction(ReconcileTransaction);
// Injection.Updates.injectBatchingStrategy(ReactDefaultBatchingStrategy);

// Injection.RootIndex.injectCreateReactRootIndex(
//   ExecutionEnvironment.canUseDOM ? ClientReactRootIndex.createReactRootIndex : ServerReactRootIndex.createReactRootIndex
// );

ComponentEnvironment.unmountIDFromEnvironment = IDOperations.unmountIDFromEnvironment;
ComponentEnvironment.replaceNodeWithMarkupByID = IDOperations.replaceNodeWithMarkupByID;
ComponentEnvironment.processChildrenUpdates = IDOperations.processChildrenUpdates;

Injection.EventEmitter.injectReactEventListener(EventListener);


module.exports = assign(assign({}, ReactIsomorphic), {
  findDOMNode: require('react/lib/findDOMNode'),
  render: Mount.render,
  unmountComponentAtNode: Mount.unmountComponentAtNode,
  // Server
  renderToString: ReactDOMServer.renderToString,
  renderToStaticMarkup: ReactDOMServer.renderToStaticMarkup
});
