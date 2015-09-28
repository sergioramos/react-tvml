'use strict';

var CallbackQueue = require('react/lib/CallbackQueue');
var PooledClass = require('react/lib/PooledClass');
var ReactDOMFeatureFlags = require('react/lib/ReactDOMFeatureFlags');
var Transaction = require('react/lib/Transaction');

var assign = require('react/lib/Object.assign');


/**
 * Provides a queue for collecting `componentDidMount` and
 * `componentDidUpdate` callbacks during the the transaction.
 */
var ON_DOM_READY_QUEUEING = {
  initialize: function() {
    this.reactMountReady.reset();
  },
  close: function() {
    this.reactMountReady.notifyAll();
  }
};

function ReactTVMLReconcileTransaction(forceHTML) {
  this.reinitializeTransaction();

  // Only server-side rendering really needs this option
  this.renderToStaticMarkup = false;
  this.reactMountReady = CallbackQueue.getPooled(null);
  this.useCreateElement = !forceHTML && ReactDOMFeatureFlags.useCreateElement;
}

var Mixin = {
  /**
   * @see Transaction
   * @abstract
   * @final
   * @return {array<object>} List of operation wrap procedures.
   *   TODO: convert to array<TransactionWrapper>
   */
  getTransactionWrappers: function() {
    return [ON_DOM_READY_QUEUEING];
  },

  /**
   * @return {object} The queue to collect `onDOMReady` callbacks with.
   */
  getReactMountReady: function() {
    return this.reactMountReady;
  },

  /**
   * `PooledClass` looks for this, and will invoke this before allowing this
   * instance to be reused.
   */
  destructor: function() {
    CallbackQueue.release(this.reactMountReady);
    this.reactMountReady = null;
  }
};

assign(ReactTVMLReconcileTransaction.prototype, Transaction.Mixin, Mixin);

PooledClass.addPoolingTo(ReactTVMLReconcileTransaction);

module.exports = ReactTVMLReconcileTransaction;