(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],2:[function(require,module,exports){
/*
 * Copyright 2012-2013 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

(function (define, location) {
	'use strict';

	var undef;

	define(function (require) {

		var mixin, origin, urlRE, absoluteUrlRE, fullyQualifiedUrlRE;

		mixin = require('./util/mixin');

		urlRE = /([a-z][a-z0-9\+\-\.]*:)\/\/([^@]+@)?(([^:\/]+)(:([0-9]+))?)?(\/[^?#]*)?(\?[^#]*)?(#\S*)?/i;
		absoluteUrlRE = /^([a-z][a-z0-9\-\+\.]*:\/\/|\/)/i;
		fullyQualifiedUrlRE = /([a-z][a-z0-9\+\-\.]*:)\/\/([^@]+@)?(([^:\/]+)(:([0-9]+))?)?\//i;

		/**
		 * Apply params to the template to create a URL.
		 *
		 * Parameters that are not applied directly to the template, are appended
		 * to the URL as query string parameters.
		 *
		 * @param {string} template the URI template
		 * @param {Object} params parameters to apply to the template
		 * @return {string} the resulting URL
		 */
		function buildUrl(template, params) {
			// internal builder to convert template with params.
			var url, name, queryStringParams, re;

			url = template;
			queryStringParams = {};

			if (params) {
				for (name in params) {
					/*jshint forin:false */
					re = new RegExp('\\{' + name + '\\}');
					if (re.test(url)) {
						url = url.replace(re, encodeURIComponent(params[name]), 'g');
					}
					else {
						queryStringParams[name] = params[name];
					}
				}
				for (name in queryStringParams) {
					url += url.indexOf('?') === -1 ? '?' : '&';
					url += encodeURIComponent(name);
					if (queryStringParams[name] !== null && queryStringParams[name] !== undefined) {
						url += '=';
						url += encodeURIComponent(queryStringParams[name]);
					}
				}
			}
			return url;
		}

		function startsWith(str, test) {
			return str.indexOf(test) === 0;
		}

		/**
		 * Create a new URL Builder
		 *
		 * @param {string|UrlBuilder} template the base template to build from, may be another UrlBuilder
		 * @param {Object} [params] base parameters
		 * @constructor
		 */
		function UrlBuilder(template, params) {
			if (!(this instanceof UrlBuilder)) {
				// invoke as a constructor
				return new UrlBuilder(template, params);
			}

			if (template instanceof UrlBuilder) {
				this._template = template.template;
				this._params = mixin({}, this._params, params);
			}
			else {
				this._template = (template || '').toString();
				this._params = params || {};
			}
		}

		UrlBuilder.prototype = {

			/**
			 * Create a new UrlBuilder instance that extends the current builder.
			 * The current builder is unmodified.
			 *
			 * @param {string} [template] URL template to append to the current template
			 * @param {Object} [params] params to combine with current params.  New params override existing params
			 * @return {UrlBuilder} the new builder
			 */
			append: function (template,  params) {
				// TODO consider query strings and fragments
				return new UrlBuilder(this._template + template, mixin({}, this._params, params));
			},

			/**
			 * Create a new UrlBuilder with a fully qualified URL based on the
			 * window's location or base href and the current templates relative URL.
			 *
			 * Path variables are preserved.
			 *
			 * *Browser only*
			 *
			 * @return {UrlBuilder} the fully qualified URL template
			 */
			fullyQualify: function () {
				if (!location) { return this; }
				if (this.isFullyQualified()) { return this; }

				var template = this._template;

				if (startsWith(template, '//')) {
					template = origin.protocol + template;
				}
				else if (startsWith(template, '/')) {
					template = origin.origin + template;
				}
				else if (!this.isAbsolute()) {
					template = origin.origin + origin.pathname.substring(0, origin.pathname.lastIndexOf('/') + 1);
				}

				if (template.indexOf('/', 8) === -1) {
					// default the pathname to '/'
					template = template + '/';
				}

				return new UrlBuilder(template, this._params);
			},

			/**
			 * True if the URL is absolute
			 *
			 * @return {boolean}
			 */
			isAbsolute: function () {
				return absoluteUrlRE.test(this.build());
			},

			/**
			 * True if the URL is fully qualified
			 *
			 * @return {boolean}
			 */
			isFullyQualified: function () {
				return fullyQualifiedUrlRE.test(this.build());
			},

			/**
			 * True if the URL is cross origin. The protocol, host and port must not be
			 * the same in order to be cross origin,
			 *
			 * @return {boolean}
			 */
			isCrossOrigin: function () {
				if (!origin) {
					return true;
				}
				var url = this.parts();
				return url.protocol !== origin.protocol ||
				       url.hostname !== origin.hostname ||
				       url.port !== origin.port;
			},

			/**
			 * Split a URL into its consituent parts following the naming convention of
			 * 'window.location'. One difference is that the port will contain the
			 * protocol default if not specified.
			 *
			 * @see https://developer.mozilla.org/en-US/docs/DOM/window.location
			 *
			 * @returns {Object} a 'window.location'-like object
			 */
			parts: function () {
				/*jshint maxcomplexity:20 */
				var url, parts;
				url = this.fullyQualify().build().match(urlRE);
				parts = {
					href: url[0],
					protocol: url[1],
					host: url[3] || '',
					hostname: url[4] || '',
					port: url[6],
					pathname: url[7] || '',
					search: url[8] || '',
					hash: url[9] || ''
				};
				parts.origin = parts.protocol + '//' + parts.host;
				parts.port = parts.port || (parts.protocol === 'https:' ? '443' : parts.protocol === 'http:' ? '80' : '');
				return parts;
			},

			/**
			 * Expand the template replacing path variables with parameters
			 *
			 * @param {Object} [params] params to combine with current params.  New params override existing params
			 * @return {string} the expanded URL
			 */
			build: function (params) {
				return buildUrl(this._template, mixin({}, this._params, params));
			},

			/**
			 * @see build
			 */
			toString: function () {
				return this.build();
			}

		};

		origin = location ? new UrlBuilder(location.href).parts() : undef;

		return UrlBuilder;
	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); },
	typeof window !== 'undefined' ? window.location : void 0
	// Boilerplate for AMD and Node
));

},{"./util/mixin":40}],3:[function(require,module,exports){
/*
 * Copyright 2014 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

(function (define) {
	'use strict';

	define(function (require) {

		var rest = require('./client/default'),
		    browser = require('./client/xhr');

		rest.setPlatformDefaultClient(browser);

		return rest;

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

},{"./client/default":5,"./client/xhr":6}],4:[function(require,module,exports){
/*
 * Copyright 2014 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

(function (define) {
	'use strict';

	define(function (/* require */) {

		/**
		 * Add common helper methods to a client impl
		 *
		 * @param {function} impl the client implementation
		 * @param {Client} [target] target of this client, used when wrapping other clients
		 * @returns {Client} the client impl with additional methods
		 */
		return function client(impl, target) {

			if (target) {

				/**
				 * @returns {Client} the target client
				 */
				impl.skip = function skip() {
					return target;
				};

			}

			/**
			 * Allow a client to easily be wrapped by an interceptor
			 *
			 * @param {Interceptor} interceptor the interceptor to wrap this client with
			 * @param [config] configuration for the interceptor
			 * @returns {Client} the newly wrapped client
			 */
			impl.wrap = function wrap(interceptor, config) {
				return interceptor(impl, config);
			};

			/**
			 * @deprecated
			 */
			impl.chain = function chain() {
				if (typeof console !== 'undefined') {
					console.log('rest.js: client.chain() is deprecated, use client.wrap() instead');
				}

				return impl.wrap.apply(this, arguments);
			};

			return impl;

		};

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

},{}],5:[function(require,module,exports){
/*
 * Copyright 2014 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

(function (define) {
	'use strict';

	var undef;

	define(function (require) {

		/**
		 * Plain JS Object containing properties that represent an HTTP request.
		 *
		 * Depending on the capabilities of the underlying client, a request
		 * may be cancelable. If a request may be canceled, the client will add
		 * a canceled flag and cancel function to the request object. Canceling
		 * the request will put the response into an error state.
		 *
		 * @field {string} [method='GET'] HTTP method, commonly GET, POST, PUT, DELETE or HEAD
		 * @field {string|UrlBuilder} [path=''] path template with optional path variables
		 * @field {Object} [params] parameters for the path template and query string
		 * @field {Object} [headers] custom HTTP headers to send, in addition to the clients default headers
		 * @field [entity] the HTTP entity, common for POST or PUT requests
		 * @field {boolean} [canceled] true if the request has been canceled, set by the client
		 * @field {Function} [cancel] cancels the request if invoked, provided by the client
		 * @field {Client} [originator] the client that first handled this request, provided by the interceptor
		 *
		 * @class Request
		 */

		/**
		 * Plain JS Object containing properties that represent an HTTP response
		 *
		 * @field {Object} [request] the request object as received by the root client
		 * @field {Object} [raw] the underlying request object, like XmlHttpRequest in a browser
		 * @field {number} [status.code] status code of the response (i.e. 200, 404)
		 * @field {string} [status.text] status phrase of the response
		 * @field {Object] [headers] response headers hash of normalized name, value pairs
		 * @field [entity] the response body
		 *
		 * @class Response
		 */

		/**
		 * HTTP client particularly suited for RESTful operations.
		 *
		 * @field {function} wrap wraps this client with a new interceptor returning the wrapped client
		 *
		 * @param {Request} the HTTP request
		 * @returns {ResponsePromise<Response>} a promise the resolves to the HTTP response
		 *
		 * @class Client
		 */

		 /**
		  * Extended when.js Promises/A+ promise with HTTP specific helpers
		  *q
		  * @method entity promise for the HTTP entity
		  * @method status promise for the HTTP status code
		  * @method headers promise for the HTTP response headers
		  * @method header promise for a specific HTTP response header
		  *
		  * @class ResponsePromise
		  * @extends Promise
		  */

		var client, target, platformDefault;

		client = require('../client');

		/**
		 * Make a request with the default client
		 * @param {Request} the HTTP request
		 * @returns {Promise<Response>} a promise the resolves to the HTTP response
		 */
		function defaultClient() {
			return target.apply(undef, arguments);
		}

		/**
		 * Change the default client
		 * @param {Client} client the new default client
		 */
		defaultClient.setDefaultClient = function setDefaultClient(client) {
			target = client;
		};

		/**
		 * Obtain a direct reference to the current default client
		 * @returns {Client} the default client
		 */
		defaultClient.getDefaultClient = function getDefaultClient() {
			return target;
		};

		/**
		 * Reset the default client to the platform default
		 */
		defaultClient.resetDefaultClient = function resetDefaultClient() {
			target = platformDefault;
		};

		/**
		 * @private
		 */
		defaultClient.setPlatformDefaultClient = function setPlatformDefaultClient(client) {
			if (platformDefault) {
				throw new Error('Unable to redefine platformDefaultClient');
			}
			target = platformDefault = client;
		};

		return client(defaultClient);

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

},{"../client":4}],6:[function(require,module,exports){
/*
 * Copyright 2012-2014 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

(function (define, global) {
	'use strict';

	define(function (require) {

		var when, UrlBuilder, normalizeHeaderName, responsePromise, client, headerSplitRE;

		when = require('when');
		UrlBuilder = require('../UrlBuilder');
		normalizeHeaderName = require('../util/normalizeHeaderName');
		responsePromise = require('../util/responsePromise');
		client = require('../client');

		// according to the spec, the line break is '\r\n', but doesn't hold true in practice
		headerSplitRE = /[\r|\n]+/;

		function parseHeaders(raw) {
			// Note: Set-Cookie will be removed by the browser
			var headers = {};

			if (!raw) { return headers; }

			raw.trim().split(headerSplitRE).forEach(function (header) {
				var boundary, name, value;
				boundary = header.indexOf(':');
				name = normalizeHeaderName(header.substring(0, boundary).trim());
				value = header.substring(boundary + 1).trim();
				if (headers[name]) {
					if (Array.isArray(headers[name])) {
						// add to an existing array
						headers[name].push(value);
					}
					else {
						// convert single value to array
						headers[name] = [headers[name], value];
					}
				}
				else {
					// new, single value
					headers[name] = value;
				}
			});

			return headers;
		}

		function safeMixin(target, source) {
			Object.keys(source || {}).forEach(function (prop) {
				// make sure the property already exists as
				// IE 6 will blow up if we add a new prop
				if (source.hasOwnProperty(prop) && prop in target) {
					try {
						target[prop] = source[prop];
					}
					catch (e) {
						// ignore, expected for some properties at some points in the request lifecycle
					}
				}
			});

			return target;
		}

		return client(function xhr(request) {
			return responsePromise.promise(function (resolve, reject) {
				/*jshint maxcomplexity:20 */

				var client, method, url, headers, entity, headerName, response, XMLHttpRequest;

				request = typeof request === 'string' ? { path: request } : request || {};
				response = { request: request };

				if (request.canceled) {
					response.error = 'precanceled';
					reject(response);
					return;
				}

				entity = request.entity;
				request.method = request.method || (entity ? 'POST' : 'GET');
				method = request.method;
				url = response.url = new UrlBuilder(request.path || '', request.params).build();

				XMLHttpRequest = request.engine || global.XMLHttpRequest;
				if (!XMLHttpRequest) {
					reject({ request: request, url: url, error: 'xhr-not-available' });
					return;
				}

				try {
					client = response.raw = new XMLHttpRequest();

					// mixin extra request properties before and after opening the request as some properties require being set at different phases of the request
					safeMixin(client, request.mixin);
					client.open(method, url, true);
					safeMixin(client, request.mixin);

					headers = request.headers;
					for (headerName in headers) {
						/*jshint forin:false */
						if (headerName === 'Content-Type' && headers[headerName] === 'multipart/form-data') {
							// XMLHttpRequest generates its own Content-Type header with the
							// appropriate multipart boundary when sending multipart/form-data.
							continue;
						}

						client.setRequestHeader(headerName, headers[headerName]);
					}

					request.canceled = false;
					request.cancel = function cancel() {
						request.canceled = true;
						client.abort();
						reject(response);
					};

					client.onreadystatechange = function (/* e */) {
						if (request.canceled) { return; }
						if (client.readyState === (XMLHttpRequest.DONE || 4)) {
							response.status = {
								code: client.status,
								text: client.statusText
							};
							response.headers = parseHeaders(client.getAllResponseHeaders());
							response.entity = client.responseText;

							if (response.status.code > 0) {
								// check status code as readystatechange fires before error event
								resolve(response);
							}
							else {
								// give the error callback a chance to fire before resolving
								// requests for file:// URLs do not have a status code
								setTimeout(function () {
									resolve(response);
								}, 0);
							}
						}
					};

					try {
						client.onerror = function (/* e */) {
							response.error = 'loaderror';
							reject(response);
						};
					}
					catch (e) {
						// IE 6 will not support error handling
					}

					client.send(entity);
				}
				catch (e) {
					response.error = 'loaderror';
					reject(response);
				}

			});
		});

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); },
	typeof window !== 'undefined' ? window : void 0
	// Boilerplate for AMD and Node
));

},{"../UrlBuilder":2,"../client":4,"../util/normalizeHeaderName":41,"../util/responsePromise":42,"when":37}],7:[function(require,module,exports){
/*
 * Copyright 2012-2015 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

(function (define) {
	'use strict';

	define(function (require) {

		var defaultClient, mixin, responsePromise, client, when;

		defaultClient = require('./client/default');
		mixin = require('./util/mixin');
		responsePromise = require('./util/responsePromise');
		client = require('./client');
		when = require('when');

		/**
		 * Interceptors have the ability to intercept the request and/org response
		 * objects.  They may augment, prune, transform or replace the
		 * request/response as needed.  Clients may be composed by wrapping
		 * together multiple interceptors.
		 *
		 * Configured interceptors are functional in nature.  Wrapping a client in
		 * an interceptor will not affect the client, merely the data that flows in
		 * and out of that client.  A common configuration can be created once and
		 * shared; specialization can be created by further wrapping that client
		 * with custom interceptors.
		 *
		 * @param {Client} [target] client to wrap
		 * @param {Object} [config] configuration for the interceptor, properties will be specific to the interceptor implementation
		 * @returns {Client} A client wrapped with the interceptor
		 *
		 * @class Interceptor
		 */

		function defaultInitHandler(config) {
			return config;
		}

		function defaultRequestHandler(request /*, config, meta */) {
			return request;
		}

		function defaultResponseHandler(response /*, config, meta */) {
			return response;
		}

		function race(promisesOrValues) {
			// this function is different than when.any as the first to reject also wins
			return when.promise(function (resolve, reject) {
				promisesOrValues.forEach(function (promiseOrValue) {
					when(promiseOrValue, resolve, reject);
				});
			});
		}

		/**
		 * Alternate return type for the request handler that allows for more complex interactions.
		 *
		 * @param properties.request the traditional request return object
		 * @param {Promise} [properties.abort] promise that resolves if/when the request is aborted
		 * @param {Client} [properties.client] override the defined client with an alternate client
		 * @param [properties.response] response for the request, short circuit the request
		 */
		function ComplexRequest(properties) {
			if (!(this instanceof ComplexRequest)) {
				// in case users forget the 'new' don't mix into the interceptor
				return new ComplexRequest(properties);
			}
			mixin(this, properties);
		}

		/**
		 * Create a new interceptor for the provided handlers.
		 *
		 * @param {Function} [handlers.init] one time intialization, must return the config object
		 * @param {Function} [handlers.request] request handler
		 * @param {Function} [handlers.response] response handler regardless of error state
		 * @param {Function} [handlers.success] response handler when the request is not in error
		 * @param {Function} [handlers.error] response handler when the request is in error, may be used to 'unreject' an error state
		 * @param {Function} [handlers.client] the client to use if otherwise not specified, defaults to platform default client
		 *
		 * @returns {Interceptor}
		 */
		function interceptor(handlers) {

			var initHandler, requestHandler, successResponseHandler, errorResponseHandler;

			handlers = handlers || {};

			initHandler            = handlers.init    || defaultInitHandler;
			requestHandler         = handlers.request || defaultRequestHandler;
			successResponseHandler = handlers.success || handlers.response || defaultResponseHandler;
			errorResponseHandler   = handlers.error   || function () {
				// Propagate the rejection, with the result of the handler
				return when((handlers.response || defaultResponseHandler).apply(this, arguments), when.reject, when.reject);
			};

			return function (target, config) {

				if (typeof target === 'object') {
					config = target;
				}
				if (typeof target !== 'function') {
					target = handlers.client || defaultClient;
				}

				config = initHandler(config || {});

				function interceptedClient(request) {
					var context, meta;
					context = {};
					meta = { 'arguments': Array.prototype.slice.call(arguments), client: interceptedClient };
					request = typeof request === 'string' ? { path: request } : request || {};
					request.originator = request.originator || interceptedClient;
					return responsePromise(
						requestHandler.call(context, request, config, meta),
						function (request) {
							var response, abort, next;
							next = target;
							if (request instanceof ComplexRequest) {
								// unpack request
								abort = request.abort;
								next = request.client || next;
								response = request.response;
								// normalize request, must be last
								request = request.request;
							}
							response = response || when(request, function (request) {
								return when(
									next(request),
									function (response) {
										return successResponseHandler.call(context, response, config, meta);
									},
									function (response) {
										return errorResponseHandler.call(context, response, config, meta);
									}
								);
							});
							return abort ? race([response, abort]) : response;
						},
						function (error) {
							return when.reject({ request: request, error: error });
						}
					);
				}

				return client(interceptedClient, target);
			};
		}

		interceptor.ComplexRequest = ComplexRequest;

		return interceptor;

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

},{"./client":4,"./client/default":5,"./util/mixin":40,"./util/responsePromise":42,"when":37}],8:[function(require,module,exports){
/*
 * Copyright 2013 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

(function (define) {
	'use strict';

	define(function (require) {

		var interceptor, mixinUtil, defaulter;

		interceptor = require('../interceptor');
		mixinUtil = require('../util/mixin');

		defaulter = (function () {

			function mixin(prop, target, defaults) {
				if (prop in target || prop in defaults) {
					target[prop] = mixinUtil({}, defaults[prop], target[prop]);
				}
			}

			function copy(prop, target, defaults) {
				if (prop in defaults && !(prop in target)) {
					target[prop] = defaults[prop];
				}
			}

			var mappings = {
				method: copy,
				path: copy,
				params: mixin,
				headers: mixin,
				entity: copy,
				mixin: mixin
			};

			return function (target, defaults) {
				for (var prop in mappings) {
					/*jshint forin: false */
					mappings[prop](prop, target, defaults);
				}
				return target;
			};

		}());

		/**
		 * Provide default values for a request. These values will be applied to the
		 * request if the request object does not already contain an explicit value.
		 *
		 * For 'params', 'headers', and 'mixin', individual values are mixed in with the
		 * request's values. The result is a new object representiing the combined
		 * request and config values. Neither input object is mutated.
		 *
		 * @param {Client} [client] client to wrap
		 * @param {string} [config.method] the default method
		 * @param {string} [config.path] the default path
		 * @param {Object} [config.params] the default params, mixed with the request's existing params
		 * @param {Object} [config.headers] the default headers, mixed with the request's existing headers
		 * @param {Object} [config.mixin] the default "mixins" (http/https options), mixed with the request's existing "mixins"
		 *
		 * @returns {Client}
		 */
		return interceptor({
			request: function handleRequest(request, config) {
				return defaulter(request, config);
			}
		});

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

},{"../interceptor":7,"../util/mixin":40}],9:[function(require,module,exports){
/*
 * Copyright 2012-2013 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

(function (define) {
	'use strict';

	define(function (require) {

		var interceptor, when;

		interceptor = require('../interceptor');
		when = require('when');

		/**
		 * Rejects the response promise based on the status code.
		 *
		 * Codes greater than or equal to the provided value are rejected.  Default
		 * value 400.
		 *
		 * @param {Client} [client] client to wrap
		 * @param {number} [config.code=400] code to indicate a rejection
		 *
		 * @returns {Client}
		 */
		return interceptor({
			init: function (config) {
				config.code = config.code || 400;
				return config;
			},
			response: function (response, config) {
				if (response.status && response.status.code >= config.code) {
					return when.reject(response);
				}
				return response;
			}
		});

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

},{"../interceptor":7,"when":37}],10:[function(require,module,exports){
/*
 * Copyright 2012-2014 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

(function (define) {
	'use strict';

	define(function (require) {

		var interceptor, mime, registry, noopConverter, when;

		interceptor = require('../interceptor');
		mime = require('../mime');
		registry = require('../mime/registry');
		when = require('when');

		noopConverter = {
			read: function (obj) { return obj; },
			write: function (obj) { return obj; }
		};

		/**
		 * MIME type support for request and response entities.  Entities are
		 * (de)serialized using the converter for the MIME type.
		 *
		 * Request entities are converted using the desired converter and the
		 * 'Accept' request header prefers this MIME.
		 *
		 * Response entities are converted based on the Content-Type response header.
		 *
		 * @param {Client} [client] client to wrap
		 * @param {string} [config.mime='text/plain'] MIME type to encode the request
		 *   entity
		 * @param {string} [config.accept] Accept header for the request
		 * @param {Client} [config.client=<request.originator>] client passed to the
		 *   converter, defaults to the client originating the request
		 * @param {Registry} [config.registry] MIME registry, defaults to the root
		 *   registry
		 * @param {boolean} [config.permissive] Allow an unkown request MIME type
		 *
		 * @returns {Client}
		 */
		return interceptor({
			init: function (config) {
				config.registry = config.registry || registry;
				return config;
			},
			request: function (request, config) {
				var type, headers;

				headers = request.headers || (request.headers = {});
				type = mime.parse(headers['Content-Type'] = headers['Content-Type'] || config.mime || 'text/plain');
				headers.Accept = headers.Accept || config.accept || type.raw + ', application/json;q=0.8, text/plain;q=0.5, */*;q=0.2';

				if (!('entity' in request)) {
					return request;
				}

				return config.registry.lookup(type).otherwise(function () {
					// failed to resolve converter
					if (config.permissive) {
						return noopConverter;
					}
					throw 'mime-unknown';
				}).then(function (converter) {
					var client = config.client || request.originator;

					return when.attempt(converter.write, request.entity, { client: client, request: request, mime: type, registry: config.registry })
						.otherwise(function() {
							throw 'mime-serialization';
						})
						.then(function(entity) {
							request.entity = entity;
							return request;
						});
				});
			},
			response: function (response, config) {
				if (!(response.headers && response.headers['Content-Type'] && response.entity)) {
					return response;
				}

				var type = mime.parse(response.headers['Content-Type']);

				return config.registry.lookup(type).otherwise(function () { return noopConverter; }).then(function (converter) {
					var client = config.client || response.request && response.request.originator;

					return when.attempt(converter.read, response.entity, { client: client, response: response, mime: type, registry: config.registry })
						.otherwise(function (e) {
							response.error = 'mime-deserialization';
							response.cause = e;
							throw response;
						})
						.then(function (entity) {
							response.entity = entity;
							return response;
						});
				});
			}
		});

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

},{"../interceptor":7,"../mime":13,"../mime/registry":14,"when":37}],11:[function(require,module,exports){
/*
 * Copyright 2012-2013 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

(function (define) {
	'use strict';

	define(function (require) {

		var interceptor, UrlBuilder;

		interceptor = require('../interceptor');
		UrlBuilder = require('../UrlBuilder');

		function startsWith(str, prefix) {
			return str.indexOf(prefix) === 0;
		}

		function endsWith(str, suffix) {
			return str.lastIndexOf(suffix) + suffix.length === str.length;
		}

		/**
		 * Prefixes the request path with a common value.
		 *
		 * @param {Client} [client] client to wrap
		 * @param {number} [config.prefix] path prefix
		 *
		 * @returns {Client}
		 */
		return interceptor({
			request: function (request, config) {
				var path;

				if (config.prefix && !(new UrlBuilder(request.path).isFullyQualified())) {
					path = config.prefix;
					if (request.path) {
						if (!endsWith(path, '/') && !startsWith(request.path, '/')) {
							// add missing '/' between path sections
							path += '/';
						}
						path += request.path;
					}
					request.path = path;
				}

				return request;
			}
		});

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

},{"../UrlBuilder":2,"../interceptor":7}],12:[function(require,module,exports){
/*
 * Copyright 2015 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

(function (define) {
	'use strict';

	define(function (require) {

		var interceptor, uriTemplate, mixin;

		interceptor = require('../interceptor');
		uriTemplate = require('../util/uriTemplate');
		mixin = require('../util/mixin');

		/**
		 * Applies request params to the path as a URI Template
		 *
		 * Params are removed from the request object, as they have been consumed.
		 *
		 * @see https://tools.ietf.org/html/rfc6570
		 *
		 * @param {Client} [client] client to wrap
		 * @param {Object} [config.params] default param values
		 * @param {string} [config.template] default template
		 *
		 * @returns {Client}
		 */
		return interceptor({
			init: function (config) {
				config.params = config.params || {};
				config.template = config.template || '';
				return config;
			},
			request: function (request, config) {
				var template, params;

				template = request.path || config.template;
				params = mixin({}, request.params, config.params);

				request.path = uriTemplate.expand(template, params);
				delete request.params;

				return request;
			}
		});

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

},{"../interceptor":7,"../util/mixin":40,"../util/uriTemplate":44}],13:[function(require,module,exports){
/*
* Copyright 2014 the original author or authors
* @license MIT, see LICENSE.txt for details
*
* @author Scott Andrews
*/

(function (define) {
	'use strict';

	var undef;

	define(function (/* require */) {

		/**
		 * Parse a MIME type into it's constituent parts
		 *
		 * @param {string} mime MIME type to parse
		 * @return {{
		 *   {string} raw the original MIME type
		 *   {string} type the type and subtype
		 *   {string} [suffix] mime suffix, including the plus, if any
		 *   {Object} params key/value pair of attributes
		 * }}
		 */
		function parse(mime) {
			var params, type;

			params = mime.split(';');
			type = params[0].trim().split('+');

			return {
				raw: mime,
				type: type[0],
				suffix: type[1] ? '+' + type[1] : '',
				params: params.slice(1).reduce(function (params, pair) {
					pair = pair.split('=');
					params[pair[0].trim()] = pair[1] ? pair[1].trim() : undef;
					return params;
				}, {})
			};
		}

		return {
			parse: parse
		};

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

},{}],14:[function(require,module,exports){
/*
 * Copyright 2012-2014 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

(function (define) {
	'use strict';

	define(function (require) {

		var mime, when, registry;

		mime = require('../mime');
		when = require('when');

		function Registry(mimes) {

			/**
			 * Lookup the converter for a MIME type
			 *
			 * @param {string} type the MIME type
			 * @return a promise for the converter
			 */
			this.lookup = function lookup(type) {
				var parsed;

				parsed = typeof type === 'string' ? mime.parse(type) : type;

				if (mimes[parsed.raw]) {
					return mimes[parsed.raw];
				}
				if (mimes[parsed.type + parsed.suffix]) {
					return mimes[parsed.type + parsed.suffix];
				}
				if (mimes[parsed.type]) {
					return mimes[parsed.type];
				}
				if (mimes[parsed.suffix]) {
					return mimes[parsed.suffix];
				}

				return when.reject(new Error('Unable to locate converter for mime "' + parsed.raw + '"'));
			};

			/**
			 * Create a late dispatched proxy to the target converter.
			 *
			 * Common when a converter is registered under multiple names and
			 * should be kept in sync if updated.
			 *
			 * @param {string} type mime converter to dispatch to
			 * @returns converter whose read/write methods target the desired mime converter
			 */
			this.delegate = function delegate(type) {
				return {
					read: function () {
						var args = arguments;
						return this.lookup(type).then(function (converter) {
							return converter.read.apply(this, args);
						}.bind(this));
					}.bind(this),
					write: function () {
						var args = arguments;
						return this.lookup(type).then(function (converter) {
							return converter.write.apply(this, args);
						}.bind(this));
					}.bind(this)
				};
			};

			/**
			 * Register a custom converter for a MIME type
			 *
			 * @param {string} type the MIME type
			 * @param converter the converter for the MIME type
			 * @return a promise for the converter
			 */
			this.register = function register(type, converter) {
				mimes[type] = when(converter);
				return mimes[type];
			};

			/**
			 * Create a child registry whoes registered converters remain local, while
			 * able to lookup converters from its parent.
			 *
			 * @returns child MIME registry
			 */
			this.child = function child() {
				return new Registry(Object.create(mimes));
			};

		}

		registry = new Registry({});

		// include provided serializers
		registry.register('application/hal', require('./type/application/hal'));
		registry.register('application/json', require('./type/application/json'));
		registry.register('application/x-www-form-urlencoded', require('./type/application/x-www-form-urlencoded'));
		registry.register('multipart/form-data', require('./type/multipart/form-data'));
		registry.register('text/plain', require('./type/text/plain'));

		registry.register('+json', registry.delegate('application/json'));

		return registry;

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

},{"../mime":13,"./type/application/hal":15,"./type/application/json":16,"./type/application/x-www-form-urlencoded":17,"./type/multipart/form-data":18,"./type/text/plain":19,"when":37}],15:[function(require,module,exports){
/*
 * Copyright 2013-2015 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

(function (define) {
	'use strict';

	define(function (require) {

		var pathPrefix, template, find, lazyPromise, responsePromise, when;

		pathPrefix = require('../../../interceptor/pathPrefix');
		template = require('../../../interceptor/template');
		find = require('../../../util/find');
		lazyPromise = require('../../../util/lazyPromise');
		responsePromise = require('../../../util/responsePromise');
		when = require('when');

		function defineProperty(obj, name, value) {
			Object.defineProperty(obj, name, {
				value: value,
				configurable: true,
				enumerable: false,
				writeable: true
			});
		}

		/**
		 * Hypertext Application Language serializer
		 *
		 * Implemented to https://tools.ietf.org/html/draft-kelly-json-hal-06
		 *
		 * As the spec is still a draft, this implementation will be updated as the
		 * spec evolves
		 *
		 * Objects are read as HAL indexing links and embedded objects on to the
		 * resource. Objects are written as plain JSON.
		 *
		 * Embedded relationships are indexed onto the resource by the relationship
		 * as a promise for the related resource.
		 *
		 * Links are indexed onto the resource as a lazy promise that will GET the
		 * resource when a handler is first registered on the promise.
		 *
		 * A `requestFor` method is added to the entity to make a request for the
		 * relationship.
		 *
		 * A `clientFor` method is added to the entity to get a full Client for a
		 * relationship.
		 *
		 * The `_links` and `_embedded` properties on the resource are made
		 * non-enumerable.
		 */
		return {

			read: function (str, opts) {
				var client, console;

				opts = opts || {};
				client = opts.client;
				console = opts.console || console;

				function deprecationWarning(relationship, deprecation) {
					if (deprecation && console && console.warn || console.log) {
						(console.warn || console.log).call(console, 'Relationship \'' + relationship + '\' is deprecated, see ' + deprecation);
					}
				}

				return opts.registry.lookup(opts.mime.suffix).then(function (converter) {
					return when(converter.read(str, opts)).then(function (root) {

						find.findProperties(root, '_embedded', function (embedded, resource, name) {
							Object.keys(embedded).forEach(function (relationship) {
								if (relationship in resource) { return; }
								var related = responsePromise({
									entity: embedded[relationship]
								});
								defineProperty(resource, relationship, related);
							});
							defineProperty(resource, name, embedded);
						});
						find.findProperties(root, '_links', function (links, resource, name) {
							Object.keys(links).forEach(function (relationship) {
								var link = links[relationship];
								if (relationship in resource) { return; }
								defineProperty(resource, relationship, responsePromise.make(lazyPromise(function () {
									if (link.deprecation) { deprecationWarning(relationship, link.deprecation); }
									if (link.templated === true) {
										return template(client)({ path: link.href });
									}
									return client({ path: link.href });
								})));
							});
							defineProperty(resource, name, links);
							defineProperty(resource, 'clientFor', function (relationship, clientOverride) {
								var link = links[relationship];
								if (!link) {
									throw new Error('Unknown relationship: ' + relationship);
								}
								if (link.deprecation) { deprecationWarning(relationship, link.deprecation); }
								if (link.templated === true) {
									return template(
										clientOverride || client,
										{ template: link.href }
									);
								}
								return pathPrefix(
									clientOverride || client,
									{ prefix: link.href }
								);
							});
							defineProperty(resource, 'requestFor', function (relationship, request, clientOverride) {
								var client = this.clientFor(relationship, clientOverride);
								return client(request);
							});
						});

						return root;
					});
				});

			},

			write: function (obj, opts) {
				return opts.registry.lookup(opts.mime.suffix).then(function (converter) {
					return converter.write(obj, opts);
				});
			}

		};
	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

},{"../../../interceptor/pathPrefix":11,"../../../interceptor/template":12,"../../../util/find":38,"../../../util/lazyPromise":39,"../../../util/responsePromise":42,"when":37}],16:[function(require,module,exports){
/*
 * Copyright 2012-2015 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

(function (define) {
	'use strict';

	define(function (/* require */) {

		/**
		 * Create a new JSON converter with custom reviver/replacer.
		 *
		 * The extended converter must be published to a MIME registry in order
		 * to be used. The existing converter will not be modified.
		 *
		 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON
		 *
		 * @param {function} [reviver=undefined] custom JSON.parse reviver
		 * @param {function|Array} [replacer=undefined] custom JSON.stringify replacer
		 */
		function createConverter(reviver, replacer) {
			return {

				read: function (str) {
					return JSON.parse(str, reviver);
				},

				write: function (obj) {
					return JSON.stringify(obj, replacer);
				},

				extend: createConverter

			};
		}

		return createConverter();

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

},{}],17:[function(require,module,exports){
/*
 * Copyright 2012 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

(function (define) {
	'use strict';

	define(function (/* require */) {

		var encodedSpaceRE, urlEncodedSpaceRE;

		encodedSpaceRE = /%20/g;
		urlEncodedSpaceRE = /\+/g;

		function urlEncode(str) {
			str = encodeURIComponent(str);
			// spec says space should be encoded as '+'
			return str.replace(encodedSpaceRE, '+');
		}

		function urlDecode(str) {
			// spec says space should be encoded as '+'
			str = str.replace(urlEncodedSpaceRE, ' ');
			return decodeURIComponent(str);
		}

		function append(str, name, value) {
			if (Array.isArray(value)) {
				value.forEach(function (value) {
					str = append(str, name, value);
				});
			}
			else {
				if (str.length > 0) {
					str += '&';
				}
				str += urlEncode(name);
				if (value !== undefined && value !== null) {
					str += '=' + urlEncode(value);
				}
			}
			return str;
		}

		return {

			read: function (str) {
				var obj = {};
				str.split('&').forEach(function (entry) {
					var pair, name, value;
					pair = entry.split('=');
					name = urlDecode(pair[0]);
					if (pair.length === 2) {
						value = urlDecode(pair[1]);
					}
					else {
						value = null;
					}
					if (name in obj) {
						if (!Array.isArray(obj[name])) {
							// convert to an array, perserving currnent value
							obj[name] = [obj[name]];
						}
						obj[name].push(value);
					}
					else {
						obj[name] = value;
					}
				});
				return obj;
			},

			write: function (obj) {
				var str = '';
				Object.keys(obj).forEach(function (name) {
					str = append(str, name, obj[name]);
				});
				return str;
			}

		};
	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

},{}],18:[function(require,module,exports){
/*
 * Copyright 2014 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Michael Jackson
 */

/* global FormData, File, Blob */

(function (define) {
	'use strict';

	define(function (/* require */) {

		function isFormElement(object) {
			return object &&
				object.nodeType === 1 && // Node.ELEMENT_NODE
				object.tagName === 'FORM';
		}

		function createFormDataFromObject(object) {
			var formData = new FormData();

			var value;
			for (var property in object) {
				if (object.hasOwnProperty(property)) {
					value = object[property];

					if (value instanceof File) {
						formData.append(property, value, value.name);
					} else if (value instanceof Blob) {
						formData.append(property, value);
					} else {
						formData.append(property, String(value));
					}
				}
			}

			return formData;
		}

		return {

			write: function (object) {
				if (typeof FormData === 'undefined') {
					throw new Error('The multipart/form-data mime serializer requires FormData support');
				}

				// Support FormData directly.
				if (object instanceof FormData) {
					return object;
				}

				// Support <form> elements.
				if (isFormElement(object)) {
					return new FormData(object);
				}

				// Support plain objects, may contain File/Blob as value.
				if (typeof object === 'object' && object !== null) {
					return createFormDataFromObject(object);
				}

				throw new Error('Unable to create FormData from object ' + object);
			}

		};
	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

},{}],19:[function(require,module,exports){
/*
 * Copyright 2012 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

(function (define) {
	'use strict';

	define(function (/* require */) {

		return {

			read: function (str) {
				return str;
			},

			write: function (obj) {
				return obj.toString();
			}

		};
	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

},{}],20:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function (require) {

	var makePromise = require('./makePromise');
	var Scheduler = require('./Scheduler');
	var async = require('./env').asap;

	return makePromise({
		scheduler: new Scheduler(async)
	});

});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });

},{"./Scheduler":21,"./env":33,"./makePromise":35}],21:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	// Credit to Twisol (https://github.com/Twisol) for suggesting
	// this type of extensible queue + trampoline approach for next-tick conflation.

	/**
	 * Async task scheduler
	 * @param {function} async function to schedule a single async function
	 * @constructor
	 */
	function Scheduler(async) {
		this._async = async;
		this._running = false;

		this._queue = this;
		this._queueLen = 0;
		this._afterQueue = {};
		this._afterQueueLen = 0;

		var self = this;
		this.drain = function() {
			self._drain();
		};
	}

	/**
	 * Enqueue a task
	 * @param {{ run:function }} task
	 */
	Scheduler.prototype.enqueue = function(task) {
		this._queue[this._queueLen++] = task;
		this.run();
	};

	/**
	 * Enqueue a task to run after the main task queue
	 * @param {{ run:function }} task
	 */
	Scheduler.prototype.afterQueue = function(task) {
		this._afterQueue[this._afterQueueLen++] = task;
		this.run();
	};

	Scheduler.prototype.run = function() {
		if (!this._running) {
			this._running = true;
			this._async(this.drain);
		}
	};

	/**
	 * Drain the handler queue entirely, and then the after queue
	 */
	Scheduler.prototype._drain = function() {
		var i = 0;
		for (; i < this._queueLen; ++i) {
			this._queue[i].run();
			this._queue[i] = void 0;
		}

		this._queueLen = 0;
		this._running = false;

		for (i = 0; i < this._afterQueueLen; ++i) {
			this._afterQueue[i].run();
			this._afterQueue[i] = void 0;
		}

		this._afterQueueLen = 0;
	};

	return Scheduler;

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],22:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	/**
	 * Custom error type for promises rejected by promise.timeout
	 * @param {string} message
	 * @constructor
	 */
	function TimeoutError (message) {
		Error.call(this);
		this.message = message;
		this.name = TimeoutError.name;
		if (typeof Error.captureStackTrace === 'function') {
			Error.captureStackTrace(this, TimeoutError);
		}
	}

	TimeoutError.prototype = Object.create(Error.prototype);
	TimeoutError.prototype.constructor = TimeoutError;

	return TimeoutError;
});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));
},{}],23:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	makeApply.tryCatchResolve = tryCatchResolve;

	return makeApply;

	function makeApply(Promise, call) {
		if(arguments.length < 2) {
			call = tryCatchResolve;
		}

		return apply;

		function apply(f, thisArg, args) {
			var p = Promise._defer();
			var l = args.length;
			var params = new Array(l);
			callAndResolve({ f:f, thisArg:thisArg, args:args, params:params, i:l-1, call:call }, p._handler);

			return p;
		}

		function callAndResolve(c, h) {
			if(c.i < 0) {
				return call(c.f, c.thisArg, c.params, h);
			}

			var handler = Promise._handler(c.args[c.i]);
			handler.fold(callAndResolveNext, c, void 0, h);
		}

		function callAndResolveNext(c, x, h) {
			c.params[c.i] = x;
			c.i -= 1;
			callAndResolve(c, h);
		}
	}

	function tryCatchResolve(f, thisArg, args, resolver) {
		try {
			resolver.resolve(f.apply(thisArg, args));
		} catch(e) {
			resolver.reject(e);
		}
	}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));



},{}],24:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(require) {

	var state = require('../state');
	var applier = require('../apply');

	return function array(Promise) {

		var applyFold = applier(Promise);
		var toPromise = Promise.resolve;
		var all = Promise.all;

		var ar = Array.prototype.reduce;
		var arr = Array.prototype.reduceRight;
		var slice = Array.prototype.slice;

		// Additional array combinators

		Promise.any = any;
		Promise.some = some;
		Promise.settle = settle;

		Promise.map = map;
		Promise.filter = filter;
		Promise.reduce = reduce;
		Promise.reduceRight = reduceRight;

		/**
		 * When this promise fulfills with an array, do
		 * onFulfilled.apply(void 0, array)
		 * @param {function} onFulfilled function to apply
		 * @returns {Promise} promise for the result of applying onFulfilled
		 */
		Promise.prototype.spread = function(onFulfilled) {
			return this.then(all).then(function(array) {
				return onFulfilled.apply(this, array);
			});
		};

		return Promise;

		/**
		 * One-winner competitive race.
		 * Return a promise that will fulfill when one of the promises
		 * in the input array fulfills, or will reject when all promises
		 * have rejected.
		 * @param {array} promises
		 * @returns {Promise} promise for the first fulfilled value
		 */
		function any(promises) {
			var p = Promise._defer();
			var resolver = p._handler;
			var l = promises.length>>>0;

			var pending = l;
			var errors = [];

			for (var h, x, i = 0; i < l; ++i) {
				x = promises[i];
				if(x === void 0 && !(i in promises)) {
					--pending;
					continue;
				}

				h = Promise._handler(x);
				if(h.state() > 0) {
					resolver.become(h);
					Promise._visitRemaining(promises, i, h);
					break;
				} else {
					h.visit(resolver, handleFulfill, handleReject);
				}
			}

			if(pending === 0) {
				resolver.reject(new RangeError('any(): array must not be empty'));
			}

			return p;

			function handleFulfill(x) {
				/*jshint validthis:true*/
				errors = null;
				this.resolve(x); // this === resolver
			}

			function handleReject(e) {
				/*jshint validthis:true*/
				if(this.resolved) { // this === resolver
					return;
				}

				errors.push(e);
				if(--pending === 0) {
					this.reject(errors);
				}
			}
		}

		/**
		 * N-winner competitive race
		 * Return a promise that will fulfill when n input promises have
		 * fulfilled, or will reject when it becomes impossible for n
		 * input promises to fulfill (ie when promises.length - n + 1
		 * have rejected)
		 * @param {array} promises
		 * @param {number} n
		 * @returns {Promise} promise for the earliest n fulfillment values
		 *
		 * @deprecated
		 */
		function some(promises, n) {
			/*jshint maxcomplexity:7*/
			var p = Promise._defer();
			var resolver = p._handler;

			var results = [];
			var errors = [];

			var l = promises.length>>>0;
			var nFulfill = 0;
			var nReject;
			var x, i; // reused in both for() loops

			// First pass: count actual array items
			for(i=0; i<l; ++i) {
				x = promises[i];
				if(x === void 0 && !(i in promises)) {
					continue;
				}
				++nFulfill;
			}

			// Compute actual goals
			n = Math.max(n, 0);
			nReject = (nFulfill - n + 1);
			nFulfill = Math.min(n, nFulfill);

			if(n > nFulfill) {
				resolver.reject(new RangeError('some(): array must contain at least '
				+ n + ' item(s), but had ' + nFulfill));
			} else if(nFulfill === 0) {
				resolver.resolve(results);
			}

			// Second pass: observe each array item, make progress toward goals
			for(i=0; i<l; ++i) {
				x = promises[i];
				if(x === void 0 && !(i in promises)) {
					continue;
				}

				Promise._handler(x).visit(resolver, fulfill, reject, resolver.notify);
			}

			return p;

			function fulfill(x) {
				/*jshint validthis:true*/
				if(this.resolved) { // this === resolver
					return;
				}

				results.push(x);
				if(--nFulfill === 0) {
					errors = null;
					this.resolve(results);
				}
			}

			function reject(e) {
				/*jshint validthis:true*/
				if(this.resolved) { // this === resolver
					return;
				}

				errors.push(e);
				if(--nReject === 0) {
					results = null;
					this.reject(errors);
				}
			}
		}

		/**
		 * Apply f to the value of each promise in a list of promises
		 * and return a new list containing the results.
		 * @param {array} promises
		 * @param {function(x:*, index:Number):*} f mapping function
		 * @returns {Promise}
		 */
		function map(promises, f) {
			return Promise._traverse(f, promises);
		}

		/**
		 * Filter the provided array of promises using the provided predicate.  Input may
		 * contain promises and values
		 * @param {Array} promises array of promises and values
		 * @param {function(x:*, index:Number):boolean} predicate filtering predicate.
		 *  Must return truthy (or promise for truthy) for items to retain.
		 * @returns {Promise} promise that will fulfill with an array containing all items
		 *  for which predicate returned truthy.
		 */
		function filter(promises, predicate) {
			var a = slice.call(promises);
			return Promise._traverse(predicate, a).then(function(keep) {
				return filterSync(a, keep);
			});
		}

		function filterSync(promises, keep) {
			// Safe because we know all promises have fulfilled if we've made it this far
			var l = keep.length;
			var filtered = new Array(l);
			for(var i=0, j=0; i<l; ++i) {
				if(keep[i]) {
					filtered[j++] = Promise._handler(promises[i]).value;
				}
			}
			filtered.length = j;
			return filtered;

		}

		/**
		 * Return a promise that will always fulfill with an array containing
		 * the outcome states of all input promises.  The returned promise
		 * will never reject.
		 * @param {Array} promises
		 * @returns {Promise} promise for array of settled state descriptors
		 */
		function settle(promises) {
			return all(promises.map(settleOne));
		}

		function settleOne(p) {
			var h = Promise._handler(p);
			if(h.state() === 0) {
				return toPromise(p).then(state.fulfilled, state.rejected);
			}

			h._unreport();
			return state.inspect(h);
		}

		/**
		 * Traditional reduce function, similar to `Array.prototype.reduce()`, but
		 * input may contain promises and/or values, and reduceFunc
		 * may return either a value or a promise, *and* initialValue may
		 * be a promise for the starting value.
		 * @param {Array|Promise} promises array or promise for an array of anything,
		 *      may contain a mix of promises and values.
		 * @param {function(accumulated:*, x:*, index:Number):*} f reduce function
		 * @returns {Promise} that will resolve to the final reduced value
		 */
		function reduce(promises, f /*, initialValue */) {
			return arguments.length > 2 ? ar.call(promises, liftCombine(f), arguments[2])
					: ar.call(promises, liftCombine(f));
		}

		/**
		 * Traditional reduce function, similar to `Array.prototype.reduceRight()`, but
		 * input may contain promises and/or values, and reduceFunc
		 * may return either a value or a promise, *and* initialValue may
		 * be a promise for the starting value.
		 * @param {Array|Promise} promises array or promise for an array of anything,
		 *      may contain a mix of promises and values.
		 * @param {function(accumulated:*, x:*, index:Number):*} f reduce function
		 * @returns {Promise} that will resolve to the final reduced value
		 */
		function reduceRight(promises, f /*, initialValue */) {
			return arguments.length > 2 ? arr.call(promises, liftCombine(f), arguments[2])
					: arr.call(promises, liftCombine(f));
		}

		function liftCombine(f) {
			return function(z, x, i) {
				return applyFold(f, void 0, [z,x,i]);
			};
		}
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

},{"../apply":23,"../state":36}],25:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function flow(Promise) {

		var resolve = Promise.resolve;
		var reject = Promise.reject;
		var origCatch = Promise.prototype['catch'];

		/**
		 * Handle the ultimate fulfillment value or rejection reason, and assume
		 * responsibility for all errors.  If an error propagates out of result
		 * or handleFatalError, it will be rethrown to the host, resulting in a
		 * loud stack track on most platforms and a crash on some.
		 * @param {function?} onResult
		 * @param {function?} onError
		 * @returns {undefined}
		 */
		Promise.prototype.done = function(onResult, onError) {
			this._handler.visit(this._handler.receiver, onResult, onError);
		};

		/**
		 * Add Error-type and predicate matching to catch.  Examples:
		 * promise.catch(TypeError, handleTypeError)
		 *   .catch(predicate, handleMatchedErrors)
		 *   .catch(handleRemainingErrors)
		 * @param onRejected
		 * @returns {*}
		 */
		Promise.prototype['catch'] = Promise.prototype.otherwise = function(onRejected) {
			if (arguments.length < 2) {
				return origCatch.call(this, onRejected);
			}

			if(typeof onRejected !== 'function') {
				return this.ensure(rejectInvalidPredicate);
			}

			return origCatch.call(this, createCatchFilter(arguments[1], onRejected));
		};

		/**
		 * Wraps the provided catch handler, so that it will only be called
		 * if the predicate evaluates truthy
		 * @param {?function} handler
		 * @param {function} predicate
		 * @returns {function} conditional catch handler
		 */
		function createCatchFilter(handler, predicate) {
			return function(e) {
				return evaluatePredicate(e, predicate)
					? handler.call(this, e)
					: reject(e);
			};
		}

		/**
		 * Ensures that onFulfilledOrRejected will be called regardless of whether
		 * this promise is fulfilled or rejected.  onFulfilledOrRejected WILL NOT
		 * receive the promises' value or reason.  Any returned value will be disregarded.
		 * onFulfilledOrRejected may throw or return a rejected promise to signal
		 * an additional error.
		 * @param {function} handler handler to be called regardless of
		 *  fulfillment or rejection
		 * @returns {Promise}
		 */
		Promise.prototype['finally'] = Promise.prototype.ensure = function(handler) {
			if(typeof handler !== 'function') {
				return this;
			}

			return this.then(function(x) {
				return runSideEffect(handler, this, identity, x);
			}, function(e) {
				return runSideEffect(handler, this, reject, e);
			});
		};

		function runSideEffect (handler, thisArg, propagate, value) {
			var result = handler.call(thisArg);
			return maybeThenable(result)
				? propagateValue(result, propagate, value)
				: propagate(value);
		}

		function propagateValue (result, propagate, x) {
			return resolve(result).then(function () {
				return propagate(x);
			});
		}

		/**
		 * Recover from a failure by returning a defaultValue.  If defaultValue
		 * is a promise, it's fulfillment value will be used.  If defaultValue is
		 * a promise that rejects, the returned promise will reject with the
		 * same reason.
		 * @param {*} defaultValue
		 * @returns {Promise} new promise
		 */
		Promise.prototype['else'] = Promise.prototype.orElse = function(defaultValue) {
			return this.then(void 0, function() {
				return defaultValue;
			});
		};

		/**
		 * Shortcut for .then(function() { return value; })
		 * @param  {*} value
		 * @return {Promise} a promise that:
		 *  - is fulfilled if value is not a promise, or
		 *  - if value is a promise, will fulfill with its value, or reject
		 *    with its reason.
		 */
		Promise.prototype['yield'] = function(value) {
			return this.then(function() {
				return value;
			});
		};

		/**
		 * Runs a side effect when this promise fulfills, without changing the
		 * fulfillment value.
		 * @param {function} onFulfilledSideEffect
		 * @returns {Promise}
		 */
		Promise.prototype.tap = function(onFulfilledSideEffect) {
			return this.then(onFulfilledSideEffect)['yield'](this);
		};

		return Promise;
	};

	function rejectInvalidPredicate() {
		throw new TypeError('catch predicate must be a function');
	}

	function evaluatePredicate(e, predicate) {
		return isError(predicate) ? e instanceof predicate : predicate(e);
	}

	function isError(predicate) {
		return predicate === Error
			|| (predicate != null && predicate.prototype instanceof Error);
	}

	function maybeThenable(x) {
		return (typeof x === 'object' || typeof x === 'function') && x !== null;
	}

	function identity(x) {
		return x;
	}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],26:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */
/** @author Jeff Escalante */

(function(define) { 'use strict';
define(function() {

	return function fold(Promise) {

		Promise.prototype.fold = function(f, z) {
			var promise = this._beget();

			this._handler.fold(function(z, x, to) {
				Promise._handler(z).fold(function(x, z, to) {
					to.resolve(f.call(this, z, x));
				}, x, this, to);
			}, z, promise._handler.receiver, promise._handler);

			return promise;
		};

		return Promise;
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],27:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(require) {

	var inspect = require('../state').inspect;

	return function inspection(Promise) {

		Promise.prototype.inspect = function() {
			return inspect(Promise._handler(this));
		};

		return Promise;
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

},{"../state":36}],28:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function generate(Promise) {

		var resolve = Promise.resolve;

		Promise.iterate = iterate;
		Promise.unfold = unfold;

		return Promise;

		/**
		 * @deprecated Use github.com/cujojs/most streams and most.iterate
		 * Generate a (potentially infinite) stream of promised values:
		 * x, f(x), f(f(x)), etc. until condition(x) returns true
		 * @param {function} f function to generate a new x from the previous x
		 * @param {function} condition function that, given the current x, returns
		 *  truthy when the iterate should stop
		 * @param {function} handler function to handle the value produced by f
		 * @param {*|Promise} x starting value, may be a promise
		 * @return {Promise} the result of the last call to f before
		 *  condition returns true
		 */
		function iterate(f, condition, handler, x) {
			return unfold(function(x) {
				return [x, f(x)];
			}, condition, handler, x);
		}

		/**
		 * @deprecated Use github.com/cujojs/most streams and most.unfold
		 * Generate a (potentially infinite) stream of promised values
		 * by applying handler(generator(seed)) iteratively until
		 * condition(seed) returns true.
		 * @param {function} unspool function that generates a [value, newSeed]
		 *  given a seed.
		 * @param {function} condition function that, given the current seed, returns
		 *  truthy when the unfold should stop
		 * @param {function} handler function to handle the value produced by unspool
		 * @param x {*|Promise} starting value, may be a promise
		 * @return {Promise} the result of the last value produced by unspool before
		 *  condition returns true
		 */
		function unfold(unspool, condition, handler, x) {
			return resolve(x).then(function(seed) {
				return resolve(condition(seed)).then(function(done) {
					return done ? seed : resolve(unspool(seed)).spread(next);
				});
			});

			function next(item, newSeed) {
				return resolve(handler(item)).then(function() {
					return unfold(unspool, condition, handler, newSeed);
				});
			}
		}
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],29:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function progress(Promise) {

		/**
		 * @deprecated
		 * Register a progress handler for this promise
		 * @param {function} onProgress
		 * @returns {Promise}
		 */
		Promise.prototype.progress = function(onProgress) {
			return this.then(void 0, void 0, onProgress);
		};

		return Promise;
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],30:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(require) {

	var env = require('../env');
	var TimeoutError = require('../TimeoutError');

	function setTimeout(f, ms, x, y) {
		return env.setTimer(function() {
			f(x, y, ms);
		}, ms);
	}

	return function timed(Promise) {
		/**
		 * Return a new promise whose fulfillment value is revealed only
		 * after ms milliseconds
		 * @param {number} ms milliseconds
		 * @returns {Promise}
		 */
		Promise.prototype.delay = function(ms) {
			var p = this._beget();
			this._handler.fold(handleDelay, ms, void 0, p._handler);
			return p;
		};

		function handleDelay(ms, x, h) {
			setTimeout(resolveDelay, ms, x, h);
		}

		function resolveDelay(x, h) {
			h.resolve(x);
		}

		/**
		 * Return a new promise that rejects after ms milliseconds unless
		 * this promise fulfills earlier, in which case the returned promise
		 * fulfills with the same value.
		 * @param {number} ms milliseconds
		 * @param {Error|*=} reason optional rejection reason to use, defaults
		 *   to a TimeoutError if not provided
		 * @returns {Promise}
		 */
		Promise.prototype.timeout = function(ms, reason) {
			var p = this._beget();
			var h = p._handler;

			var t = setTimeout(onTimeout, ms, reason, p._handler);

			this._handler.visit(h,
				function onFulfill(x) {
					env.clearTimer(t);
					this.resolve(x); // this = h
				},
				function onReject(x) {
					env.clearTimer(t);
					this.reject(x); // this = h
				},
				h.notify);

			return p;
		};

		function onTimeout(reason, h, ms) {
			var e = typeof reason === 'undefined'
				? new TimeoutError('timed out after ' + ms + 'ms')
				: reason;
			h.reject(e);
		}

		return Promise;
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

},{"../TimeoutError":22,"../env":33}],31:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(require) {

	var setTimer = require('../env').setTimer;
	var format = require('../format');

	return function unhandledRejection(Promise) {

		var logError = noop;
		var logInfo = noop;
		var localConsole;

		if(typeof console !== 'undefined') {
			// Alias console to prevent things like uglify's drop_console option from
			// removing console.log/error. Unhandled rejections fall into the same
			// category as uncaught exceptions, and build tools shouldn't silence them.
			localConsole = console;
			logError = typeof localConsole.error !== 'undefined'
				? function (e) { localConsole.error(e); }
				: function (e) { localConsole.log(e); };

			logInfo = typeof localConsole.info !== 'undefined'
				? function (e) { localConsole.info(e); }
				: function (e) { localConsole.log(e); };
		}

		Promise.onPotentiallyUnhandledRejection = function(rejection) {
			enqueue(report, rejection);
		};

		Promise.onPotentiallyUnhandledRejectionHandled = function(rejection) {
			enqueue(unreport, rejection);
		};

		Promise.onFatalRejection = function(rejection) {
			enqueue(throwit, rejection.value);
		};

		var tasks = [];
		var reported = [];
		var running = null;

		function report(r) {
			if(!r.handled) {
				reported.push(r);
				logError('Potentially unhandled rejection [' + r.id + '] ' + format.formatError(r.value));
			}
		}

		function unreport(r) {
			var i = reported.indexOf(r);
			if(i >= 0) {
				reported.splice(i, 1);
				logInfo('Handled previous rejection [' + r.id + '] ' + format.formatObject(r.value));
			}
		}

		function enqueue(f, x) {
			tasks.push(f, x);
			if(running === null) {
				running = setTimer(flush, 0);
			}
		}

		function flush() {
			running = null;
			while(tasks.length > 0) {
				tasks.shift()(tasks.shift());
			}
		}

		return Promise;
	};

	function throwit(e) {
		throw e;
	}

	function noop() {}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

},{"../env":33,"../format":34}],32:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function addWith(Promise) {
		/**
		 * Returns a promise whose handlers will be called with `this` set to
		 * the supplied receiver.  Subsequent promises derived from the
		 * returned promise will also have their handlers called with receiver
		 * as `this`. Calling `with` with undefined or no arguments will return
		 * a promise whose handlers will again be called in the usual Promises/A+
		 * way (no `this`) thus safely undoing any previous `with` in the
		 * promise chain.
		 *
		 * WARNING: Promises returned from `with`/`withThis` are NOT Promises/A+
		 * compliant, specifically violating 2.2.5 (http://promisesaplus.com/#point-41)
		 *
		 * @param {object} receiver `this` value for all handlers attached to
		 *  the returned promise.
		 * @returns {Promise}
		 */
		Promise.prototype['with'] = Promise.prototype.withThis = function(receiver) {
			var p = this._beget();
			var child = p._handler;
			child.receiver = receiver;
			this._handler.chain(child, receiver);
			return p;
		};

		return Promise;
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));


},{}],33:[function(require,module,exports){
(function (process){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

/*global process,document,setTimeout,clearTimeout,MutationObserver,WebKitMutationObserver*/
(function(define) { 'use strict';
define(function(require) {
	/*jshint maxcomplexity:6*/

	// Sniff "best" async scheduling option
	// Prefer process.nextTick or MutationObserver, then check for
	// setTimeout, and finally vertx, since its the only env that doesn't
	// have setTimeout

	var MutationObs;
	var capturedSetTimeout = typeof setTimeout !== 'undefined' && setTimeout;

	// Default env
	var setTimer = function(f, ms) { return setTimeout(f, ms); };
	var clearTimer = function(t) { return clearTimeout(t); };
	var asap = function (f) { return capturedSetTimeout(f, 0); };

	// Detect specific env
	if (isNode()) { // Node
		asap = function (f) { return process.nextTick(f); };

	} else if (MutationObs = hasMutationObserver()) { // Modern browser
		asap = initMutationObserver(MutationObs);

	} else if (!capturedSetTimeout) { // vert.x
		var vertxRequire = require;
		var vertx = vertxRequire('vertx');
		setTimer = function (f, ms) { return vertx.setTimer(ms, f); };
		clearTimer = vertx.cancelTimer;
		asap = vertx.runOnLoop || vertx.runOnContext;
	}

	return {
		setTimer: setTimer,
		clearTimer: clearTimer,
		asap: asap
	};

	function isNode () {
		return typeof process !== 'undefined' &&
			Object.prototype.toString.call(process) === '[object process]';
	}

	function hasMutationObserver () {
		return (typeof MutationObserver === 'function' && MutationObserver) ||
			(typeof WebKitMutationObserver === 'function' && WebKitMutationObserver);
	}

	function initMutationObserver(MutationObserver) {
		var scheduled;
		var node = document.createTextNode('');
		var o = new MutationObserver(run);
		o.observe(node, { characterData: true });

		function run() {
			var f = scheduled;
			scheduled = void 0;
			f();
		}

		var i = 0;
		return function (f) {
			scheduled = f;
			node.data = (i ^= 1);
		};
	}
});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

}).call(this,require('_process'))

},{"_process":1}],34:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return {
		formatError: formatError,
		formatObject: formatObject,
		tryStringify: tryStringify
	};

	/**
	 * Format an error into a string.  If e is an Error and has a stack property,
	 * it's returned.  Otherwise, e is formatted using formatObject, with a
	 * warning added about e not being a proper Error.
	 * @param {*} e
	 * @returns {String} formatted string, suitable for output to developers
	 */
	function formatError(e) {
		var s = typeof e === 'object' && e !== null && (e.stack || e.message) ? e.stack || e.message : formatObject(e);
		return e instanceof Error ? s : s + ' (WARNING: non-Error used)';
	}

	/**
	 * Format an object, detecting "plain" objects and running them through
	 * JSON.stringify if possible.
	 * @param {Object} o
	 * @returns {string}
	 */
	function formatObject(o) {
		var s = String(o);
		if(s === '[object Object]' && typeof JSON !== 'undefined') {
			s = tryStringify(o, s);
		}
		return s;
	}

	/**
	 * Try to return the result of JSON.stringify(x).  If that fails, return
	 * defaultValue
	 * @param {*} x
	 * @param {*} defaultValue
	 * @returns {String|*} JSON.stringify(x) or defaultValue
	 */
	function tryStringify(x, defaultValue) {
		try {
			return JSON.stringify(x);
		} catch(e) {
			return defaultValue;
		}
	}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],35:[function(require,module,exports){
(function (process){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function makePromise(environment) {

		var tasks = environment.scheduler;
		var emitRejection = initEmitRejection();

		var objectCreate = Object.create ||
			function(proto) {
				function Child() {}
				Child.prototype = proto;
				return new Child();
			};

		/**
		 * Create a promise whose fate is determined by resolver
		 * @constructor
		 * @returns {Promise} promise
		 * @name Promise
		 */
		function Promise(resolver, handler) {
			this._handler = resolver === Handler ? handler : init(resolver);
		}

		/**
		 * Run the supplied resolver
		 * @param resolver
		 * @returns {Pending}
		 */
		function init(resolver) {
			var handler = new Pending();

			try {
				resolver(promiseResolve, promiseReject, promiseNotify);
			} catch (e) {
				promiseReject(e);
			}

			return handler;

			/**
			 * Transition from pre-resolution state to post-resolution state, notifying
			 * all listeners of the ultimate fulfillment or rejection
			 * @param {*} x resolution value
			 */
			function promiseResolve (x) {
				handler.resolve(x);
			}
			/**
			 * Reject this promise with reason, which will be used verbatim
			 * @param {Error|*} reason rejection reason, strongly suggested
			 *   to be an Error type
			 */
			function promiseReject (reason) {
				handler.reject(reason);
			}

			/**
			 * @deprecated
			 * Issue a progress event, notifying all progress listeners
			 * @param {*} x progress event payload to pass to all listeners
			 */
			function promiseNotify (x) {
				handler.notify(x);
			}
		}

		// Creation

		Promise.resolve = resolve;
		Promise.reject = reject;
		Promise.never = never;

		Promise._defer = defer;
		Promise._handler = getHandler;

		/**
		 * Returns a trusted promise. If x is already a trusted promise, it is
		 * returned, otherwise returns a new trusted Promise which follows x.
		 * @param  {*} x
		 * @return {Promise} promise
		 */
		function resolve(x) {
			return isPromise(x) ? x
				: new Promise(Handler, new Async(getHandler(x)));
		}

		/**
		 * Return a reject promise with x as its reason (x is used verbatim)
		 * @param {*} x
		 * @returns {Promise} rejected promise
		 */
		function reject(x) {
			return new Promise(Handler, new Async(new Rejected(x)));
		}

		/**
		 * Return a promise that remains pending forever
		 * @returns {Promise} forever-pending promise.
		 */
		function never() {
			return foreverPendingPromise; // Should be frozen
		}

		/**
		 * Creates an internal {promise, resolver} pair
		 * @private
		 * @returns {Promise}
		 */
		function defer() {
			return new Promise(Handler, new Pending());
		}

		// Transformation and flow control

		/**
		 * Transform this promise's fulfillment value, returning a new Promise
		 * for the transformed result.  If the promise cannot be fulfilled, onRejected
		 * is called with the reason.  onProgress *may* be called with updates toward
		 * this promise's fulfillment.
		 * @param {function=} onFulfilled fulfillment handler
		 * @param {function=} onRejected rejection handler
		 * @param {function=} onProgress @deprecated progress handler
		 * @return {Promise} new promise
		 */
		Promise.prototype.then = function(onFulfilled, onRejected, onProgress) {
			var parent = this._handler;
			var state = parent.join().state();

			if ((typeof onFulfilled !== 'function' && state > 0) ||
				(typeof onRejected !== 'function' && state < 0)) {
				// Short circuit: value will not change, simply share handler
				return new this.constructor(Handler, parent);
			}

			var p = this._beget();
			var child = p._handler;

			parent.chain(child, parent.receiver, onFulfilled, onRejected, onProgress);

			return p;
		};

		/**
		 * If this promise cannot be fulfilled due to an error, call onRejected to
		 * handle the error. Shortcut for .then(undefined, onRejected)
		 * @param {function?} onRejected
		 * @return {Promise}
		 */
		Promise.prototype['catch'] = function(onRejected) {
			return this.then(void 0, onRejected);
		};

		/**
		 * Creates a new, pending promise of the same type as this promise
		 * @private
		 * @returns {Promise}
		 */
		Promise.prototype._beget = function() {
			return begetFrom(this._handler, this.constructor);
		};

		function begetFrom(parent, Promise) {
			var child = new Pending(parent.receiver, parent.join().context);
			return new Promise(Handler, child);
		}

		// Array combinators

		Promise.all = all;
		Promise.race = race;
		Promise._traverse = traverse;

		/**
		 * Return a promise that will fulfill when all promises in the
		 * input array have fulfilled, or will reject when one of the
		 * promises rejects.
		 * @param {array} promises array of promises
		 * @returns {Promise} promise for array of fulfillment values
		 */
		function all(promises) {
			return traverseWith(snd, null, promises);
		}

		/**
		 * Array<Promise<X>> -> Promise<Array<f(X)>>
		 * @private
		 * @param {function} f function to apply to each promise's value
		 * @param {Array} promises array of promises
		 * @returns {Promise} promise for transformed values
		 */
		function traverse(f, promises) {
			return traverseWith(tryCatch2, f, promises);
		}

		function traverseWith(tryMap, f, promises) {
			var handler = typeof f === 'function' ? mapAt : settleAt;

			var resolver = new Pending();
			var pending = promises.length >>> 0;
			var results = new Array(pending);

			for (var i = 0, x; i < promises.length && !resolver.resolved; ++i) {
				x = promises[i];

				if (x === void 0 && !(i in promises)) {
					--pending;
					continue;
				}

				traverseAt(promises, handler, i, x, resolver);
			}

			if(pending === 0) {
				resolver.become(new Fulfilled(results));
			}

			return new Promise(Handler, resolver);

			function mapAt(i, x, resolver) {
				if(!resolver.resolved) {
					traverseAt(promises, settleAt, i, tryMap(f, x, i), resolver);
				}
			}

			function settleAt(i, x, resolver) {
				results[i] = x;
				if(--pending === 0) {
					resolver.become(new Fulfilled(results));
				}
			}
		}

		function traverseAt(promises, handler, i, x, resolver) {
			if (maybeThenable(x)) {
				var h = getHandlerMaybeThenable(x);
				var s = h.state();

				if (s === 0) {
					h.fold(handler, i, void 0, resolver);
				} else if (s > 0) {
					handler(i, h.value, resolver);
				} else {
					resolver.become(h);
					visitRemaining(promises, i+1, h);
				}
			} else {
				handler(i, x, resolver);
			}
		}

		Promise._visitRemaining = visitRemaining;
		function visitRemaining(promises, start, handler) {
			for(var i=start; i<promises.length; ++i) {
				markAsHandled(getHandler(promises[i]), handler);
			}
		}

		function markAsHandled(h, handler) {
			if(h === handler) {
				return;
			}

			var s = h.state();
			if(s === 0) {
				h.visit(h, void 0, h._unreport);
			} else if(s < 0) {
				h._unreport();
			}
		}

		/**
		 * Fulfill-reject competitive race. Return a promise that will settle
		 * to the same state as the earliest input promise to settle.
		 *
		 * WARNING: The ES6 Promise spec requires that race()ing an empty array
		 * must return a promise that is pending forever.  This implementation
		 * returns a singleton forever-pending promise, the same singleton that is
		 * returned by Promise.never(), thus can be checked with ===
		 *
		 * @param {array} promises array of promises to race
		 * @returns {Promise} if input is non-empty, a promise that will settle
		 * to the same outcome as the earliest input promise to settle. if empty
		 * is empty, returns a promise that will never settle.
		 */
		function race(promises) {
			if(typeof promises !== 'object' || promises === null) {
				return reject(new TypeError('non-iterable passed to race()'));
			}

			// Sigh, race([]) is untestable unless we return *something*
			// that is recognizable without calling .then() on it.
			return promises.length === 0 ? never()
				 : promises.length === 1 ? resolve(promises[0])
				 : runRace(promises);
		}

		function runRace(promises) {
			var resolver = new Pending();
			var i, x, h;
			for(i=0; i<promises.length; ++i) {
				x = promises[i];
				if (x === void 0 && !(i in promises)) {
					continue;
				}

				h = getHandler(x);
				if(h.state() !== 0) {
					resolver.become(h);
					visitRemaining(promises, i+1, h);
					break;
				} else {
					h.visit(resolver, resolver.resolve, resolver.reject);
				}
			}
			return new Promise(Handler, resolver);
		}

		// Promise internals
		// Below this, everything is @private

		/**
		 * Get an appropriate handler for x, without checking for cycles
		 * @param {*} x
		 * @returns {object} handler
		 */
		function getHandler(x) {
			if(isPromise(x)) {
				return x._handler.join();
			}
			return maybeThenable(x) ? getHandlerUntrusted(x) : new Fulfilled(x);
		}

		/**
		 * Get a handler for thenable x.
		 * NOTE: You must only call this if maybeThenable(x) == true
		 * @param {object|function|Promise} x
		 * @returns {object} handler
		 */
		function getHandlerMaybeThenable(x) {
			return isPromise(x) ? x._handler.join() : getHandlerUntrusted(x);
		}

		/**
		 * Get a handler for potentially untrusted thenable x
		 * @param {*} x
		 * @returns {object} handler
		 */
		function getHandlerUntrusted(x) {
			try {
				var untrustedThen = x.then;
				return typeof untrustedThen === 'function'
					? new Thenable(untrustedThen, x)
					: new Fulfilled(x);
			} catch(e) {
				return new Rejected(e);
			}
		}

		/**
		 * Handler for a promise that is pending forever
		 * @constructor
		 */
		function Handler() {}

		Handler.prototype.when
			= Handler.prototype.become
			= Handler.prototype.notify // deprecated
			= Handler.prototype.fail
			= Handler.prototype._unreport
			= Handler.prototype._report
			= noop;

		Handler.prototype._state = 0;

		Handler.prototype.state = function() {
			return this._state;
		};

		/**
		 * Recursively collapse handler chain to find the handler
		 * nearest to the fully resolved value.
		 * @returns {object} handler nearest the fully resolved value
		 */
		Handler.prototype.join = function() {
			var h = this;
			while(h.handler !== void 0) {
				h = h.handler;
			}
			return h;
		};

		Handler.prototype.chain = function(to, receiver, fulfilled, rejected, progress) {
			this.when({
				resolver: to,
				receiver: receiver,
				fulfilled: fulfilled,
				rejected: rejected,
				progress: progress
			});
		};

		Handler.prototype.visit = function(receiver, fulfilled, rejected, progress) {
			this.chain(failIfRejected, receiver, fulfilled, rejected, progress);
		};

		Handler.prototype.fold = function(f, z, c, to) {
			this.when(new Fold(f, z, c, to));
		};

		/**
		 * Handler that invokes fail() on any handler it becomes
		 * @constructor
		 */
		function FailIfRejected() {}

		inherit(Handler, FailIfRejected);

		FailIfRejected.prototype.become = function(h) {
			h.fail();
		};

		var failIfRejected = new FailIfRejected();

		/**
		 * Handler that manages a queue of consumers waiting on a pending promise
		 * @constructor
		 */
		function Pending(receiver, inheritedContext) {
			Promise.createContext(this, inheritedContext);

			this.consumers = void 0;
			this.receiver = receiver;
			this.handler = void 0;
			this.resolved = false;
		}

		inherit(Handler, Pending);

		Pending.prototype._state = 0;

		Pending.prototype.resolve = function(x) {
			this.become(getHandler(x));
		};

		Pending.prototype.reject = function(x) {
			if(this.resolved) {
				return;
			}

			this.become(new Rejected(x));
		};

		Pending.prototype.join = function() {
			if (!this.resolved) {
				return this;
			}

			var h = this;

			while (h.handler !== void 0) {
				h = h.handler;
				if (h === this) {
					return this.handler = cycle();
				}
			}

			return h;
		};

		Pending.prototype.run = function() {
			var q = this.consumers;
			var handler = this.handler;
			this.handler = this.handler.join();
			this.consumers = void 0;

			for (var i = 0; i < q.length; ++i) {
				handler.when(q[i]);
			}
		};

		Pending.prototype.become = function(handler) {
			if(this.resolved) {
				return;
			}

			this.resolved = true;
			this.handler = handler;
			if(this.consumers !== void 0) {
				tasks.enqueue(this);
			}

			if(this.context !== void 0) {
				handler._report(this.context);
			}
		};

		Pending.prototype.when = function(continuation) {
			if(this.resolved) {
				tasks.enqueue(new ContinuationTask(continuation, this.handler));
			} else {
				if(this.consumers === void 0) {
					this.consumers = [continuation];
				} else {
					this.consumers.push(continuation);
				}
			}
		};

		/**
		 * @deprecated
		 */
		Pending.prototype.notify = function(x) {
			if(!this.resolved) {
				tasks.enqueue(new ProgressTask(x, this));
			}
		};

		Pending.prototype.fail = function(context) {
			var c = typeof context === 'undefined' ? this.context : context;
			this.resolved && this.handler.join().fail(c);
		};

		Pending.prototype._report = function(context) {
			this.resolved && this.handler.join()._report(context);
		};

		Pending.prototype._unreport = function() {
			this.resolved && this.handler.join()._unreport();
		};

		/**
		 * Wrap another handler and force it into a future stack
		 * @param {object} handler
		 * @constructor
		 */
		function Async(handler) {
			this.handler = handler;
		}

		inherit(Handler, Async);

		Async.prototype.when = function(continuation) {
			tasks.enqueue(new ContinuationTask(continuation, this));
		};

		Async.prototype._report = function(context) {
			this.join()._report(context);
		};

		Async.prototype._unreport = function() {
			this.join()._unreport();
		};

		/**
		 * Handler that wraps an untrusted thenable and assimilates it in a future stack
		 * @param {function} then
		 * @param {{then: function}} thenable
		 * @constructor
		 */
		function Thenable(then, thenable) {
			Pending.call(this);
			tasks.enqueue(new AssimilateTask(then, thenable, this));
		}

		inherit(Pending, Thenable);

		/**
		 * Handler for a fulfilled promise
		 * @param {*} x fulfillment value
		 * @constructor
		 */
		function Fulfilled(x) {
			Promise.createContext(this);
			this.value = x;
		}

		inherit(Handler, Fulfilled);

		Fulfilled.prototype._state = 1;

		Fulfilled.prototype.fold = function(f, z, c, to) {
			runContinuation3(f, z, this, c, to);
		};

		Fulfilled.prototype.when = function(cont) {
			runContinuation1(cont.fulfilled, this, cont.receiver, cont.resolver);
		};

		var errorId = 0;

		/**
		 * Handler for a rejected promise
		 * @param {*} x rejection reason
		 * @constructor
		 */
		function Rejected(x) {
			Promise.createContext(this);

			this.id = ++errorId;
			this.value = x;
			this.handled = false;
			this.reported = false;

			this._report();
		}

		inherit(Handler, Rejected);

		Rejected.prototype._state = -1;

		Rejected.prototype.fold = function(f, z, c, to) {
			to.become(this);
		};

		Rejected.prototype.when = function(cont) {
			if(typeof cont.rejected === 'function') {
				this._unreport();
			}
			runContinuation1(cont.rejected, this, cont.receiver, cont.resolver);
		};

		Rejected.prototype._report = function(context) {
			tasks.afterQueue(new ReportTask(this, context));
		};

		Rejected.prototype._unreport = function() {
			if(this.handled) {
				return;
			}
			this.handled = true;
			tasks.afterQueue(new UnreportTask(this));
		};

		Rejected.prototype.fail = function(context) {
			this.reported = true;
			emitRejection('unhandledRejection', this);
			Promise.onFatalRejection(this, context === void 0 ? this.context : context);
		};

		function ReportTask(rejection, context) {
			this.rejection = rejection;
			this.context = context;
		}

		ReportTask.prototype.run = function() {
			if(!this.rejection.handled && !this.rejection.reported) {
				this.rejection.reported = true;
				emitRejection('unhandledRejection', this.rejection) ||
					Promise.onPotentiallyUnhandledRejection(this.rejection, this.context);
			}
		};

		function UnreportTask(rejection) {
			this.rejection = rejection;
		}

		UnreportTask.prototype.run = function() {
			if(this.rejection.reported) {
				emitRejection('rejectionHandled', this.rejection) ||
					Promise.onPotentiallyUnhandledRejectionHandled(this.rejection);
			}
		};

		// Unhandled rejection hooks
		// By default, everything is a noop

		Promise.createContext
			= Promise.enterContext
			= Promise.exitContext
			= Promise.onPotentiallyUnhandledRejection
			= Promise.onPotentiallyUnhandledRejectionHandled
			= Promise.onFatalRejection
			= noop;

		// Errors and singletons

		var foreverPendingHandler = new Handler();
		var foreverPendingPromise = new Promise(Handler, foreverPendingHandler);

		function cycle() {
			return new Rejected(new TypeError('Promise cycle'));
		}

		// Task runners

		/**
		 * Run a single consumer
		 * @constructor
		 */
		function ContinuationTask(continuation, handler) {
			this.continuation = continuation;
			this.handler = handler;
		}

		ContinuationTask.prototype.run = function() {
			this.handler.join().when(this.continuation);
		};

		/**
		 * Run a queue of progress handlers
		 * @constructor
		 */
		function ProgressTask(value, handler) {
			this.handler = handler;
			this.value = value;
		}

		ProgressTask.prototype.run = function() {
			var q = this.handler.consumers;
			if(q === void 0) {
				return;
			}

			for (var c, i = 0; i < q.length; ++i) {
				c = q[i];
				runNotify(c.progress, this.value, this.handler, c.receiver, c.resolver);
			}
		};

		/**
		 * Assimilate a thenable, sending it's value to resolver
		 * @param {function} then
		 * @param {object|function} thenable
		 * @param {object} resolver
		 * @constructor
		 */
		function AssimilateTask(then, thenable, resolver) {
			this._then = then;
			this.thenable = thenable;
			this.resolver = resolver;
		}

		AssimilateTask.prototype.run = function() {
			var h = this.resolver;
			tryAssimilate(this._then, this.thenable, _resolve, _reject, _notify);

			function _resolve(x) { h.resolve(x); }
			function _reject(x)  { h.reject(x); }
			function _notify(x)  { h.notify(x); }
		};

		function tryAssimilate(then, thenable, resolve, reject, notify) {
			try {
				then.call(thenable, resolve, reject, notify);
			} catch (e) {
				reject(e);
			}
		}

		/**
		 * Fold a handler value with z
		 * @constructor
		 */
		function Fold(f, z, c, to) {
			this.f = f; this.z = z; this.c = c; this.to = to;
			this.resolver = failIfRejected;
			this.receiver = this;
		}

		Fold.prototype.fulfilled = function(x) {
			this.f.call(this.c, this.z, x, this.to);
		};

		Fold.prototype.rejected = function(x) {
			this.to.reject(x);
		};

		Fold.prototype.progress = function(x) {
			this.to.notify(x);
		};

		// Other helpers

		/**
		 * @param {*} x
		 * @returns {boolean} true iff x is a trusted Promise
		 */
		function isPromise(x) {
			return x instanceof Promise;
		}

		/**
		 * Test just enough to rule out primitives, in order to take faster
		 * paths in some code
		 * @param {*} x
		 * @returns {boolean} false iff x is guaranteed *not* to be a thenable
		 */
		function maybeThenable(x) {
			return (typeof x === 'object' || typeof x === 'function') && x !== null;
		}

		function runContinuation1(f, h, receiver, next) {
			if(typeof f !== 'function') {
				return next.become(h);
			}

			Promise.enterContext(h);
			tryCatchReject(f, h.value, receiver, next);
			Promise.exitContext();
		}

		function runContinuation3(f, x, h, receiver, next) {
			if(typeof f !== 'function') {
				return next.become(h);
			}

			Promise.enterContext(h);
			tryCatchReject3(f, x, h.value, receiver, next);
			Promise.exitContext();
		}

		/**
		 * @deprecated
		 */
		function runNotify(f, x, h, receiver, next) {
			if(typeof f !== 'function') {
				return next.notify(x);
			}

			Promise.enterContext(h);
			tryCatchReturn(f, x, receiver, next);
			Promise.exitContext();
		}

		function tryCatch2(f, a, b) {
			try {
				return f(a, b);
			} catch(e) {
				return reject(e);
			}
		}

		/**
		 * Return f.call(thisArg, x), or if it throws return a rejected promise for
		 * the thrown exception
		 */
		function tryCatchReject(f, x, thisArg, next) {
			try {
				next.become(getHandler(f.call(thisArg, x)));
			} catch(e) {
				next.become(new Rejected(e));
			}
		}

		/**
		 * Same as above, but includes the extra argument parameter.
		 */
		function tryCatchReject3(f, x, y, thisArg, next) {
			try {
				f.call(thisArg, x, y, next);
			} catch(e) {
				next.become(new Rejected(e));
			}
		}

		/**
		 * @deprecated
		 * Return f.call(thisArg, x), or if it throws, *return* the exception
		 */
		function tryCatchReturn(f, x, thisArg, next) {
			try {
				next.notify(f.call(thisArg, x));
			} catch(e) {
				next.notify(e);
			}
		}

		function inherit(Parent, Child) {
			Child.prototype = objectCreate(Parent.prototype);
			Child.prototype.constructor = Child;
		}

		function snd(x, y) {
			return y;
		}

		function noop() {}

		function initEmitRejection() {
			/*global process, self, CustomEvent*/
			if(typeof process !== 'undefined' && process !== null
				&& typeof process.emit === 'function') {
				// Returning falsy here means to call the default
				// onPotentiallyUnhandledRejection API.  This is safe even in
				// browserify since process.emit always returns falsy in browserify:
				// https://github.com/defunctzombie/node-process/blob/master/browser.js#L40-L46
				return function(type, rejection) {
					return type === 'unhandledRejection'
						? process.emit(type, rejection.value, rejection)
						: process.emit(type, rejection);
				};
			} else if(typeof self !== 'undefined' && typeof CustomEvent === 'function') {
				return (function(noop, self, CustomEvent) {
					var hasCustomEvent = false;
					try {
						var ev = new CustomEvent('unhandledRejection');
						hasCustomEvent = ev instanceof CustomEvent;
					} catch (e) {}

					return !hasCustomEvent ? noop : function(type, rejection) {
						var ev = new CustomEvent(type, {
							detail: {
								reason: rejection.value,
								key: rejection
							},
							bubbles: false,
							cancelable: true
						});

						return !self.dispatchEvent(ev);
					};
				}(noop, self, CustomEvent));
			}

			return noop;
		}

		return Promise;
	};
});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

}).call(this,require('_process'))

},{"_process":1}],36:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return {
		pending: toPendingState,
		fulfilled: toFulfilledState,
		rejected: toRejectedState,
		inspect: inspect
	};

	function toPendingState() {
		return { state: 'pending' };
	}

	function toRejectedState(e) {
		return { state: 'rejected', reason: e };
	}

	function toFulfilledState(x) {
		return { state: 'fulfilled', value: x };
	}

	function inspect(handler) {
		var state = handler.state();
		return state === 0 ? toPendingState()
			 : state > 0   ? toFulfilledState(handler.value)
			               : toRejectedState(handler.value);
	}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],37:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */

/**
 * Promises/A+ and when() implementation
 * when is part of the cujoJS family of libraries (http://cujojs.com/)
 * @author Brian Cavalier
 * @author John Hann
 */
(function(define) { 'use strict';
define(function (require) {

	var timed = require('./lib/decorators/timed');
	var array = require('./lib/decorators/array');
	var flow = require('./lib/decorators/flow');
	var fold = require('./lib/decorators/fold');
	var inspect = require('./lib/decorators/inspect');
	var generate = require('./lib/decorators/iterate');
	var progress = require('./lib/decorators/progress');
	var withThis = require('./lib/decorators/with');
	var unhandledRejection = require('./lib/decorators/unhandledRejection');
	var TimeoutError = require('./lib/TimeoutError');

	var Promise = [array, flow, fold, generate, progress,
		inspect, withThis, timed, unhandledRejection]
		.reduce(function(Promise, feature) {
			return feature(Promise);
		}, require('./lib/Promise'));

	var apply = require('./lib/apply')(Promise);

	// Public API

	when.promise     = promise;              // Create a pending promise
	when.resolve     = Promise.resolve;      // Create a resolved promise
	when.reject      = Promise.reject;       // Create a rejected promise

	when.lift        = lift;                 // lift a function to return promises
	when['try']      = attempt;              // call a function and return a promise
	when.attempt     = attempt;              // alias for when.try

	when.iterate     = Promise.iterate;      // DEPRECATED (use cujojs/most streams) Generate a stream of promises
	when.unfold      = Promise.unfold;       // DEPRECATED (use cujojs/most streams) Generate a stream of promises

	when.join        = join;                 // Join 2 or more promises

	when.all         = all;                  // Resolve a list of promises
	when.settle      = settle;               // Settle a list of promises

	when.any         = lift(Promise.any);    // One-winner race
	when.some        = lift(Promise.some);   // Multi-winner race
	when.race        = lift(Promise.race);   // First-to-settle race

	when.map         = map;                  // Array.map() for promises
	when.filter      = filter;               // Array.filter() for promises
	when.reduce      = lift(Promise.reduce);       // Array.reduce() for promises
	when.reduceRight = lift(Promise.reduceRight);  // Array.reduceRight() for promises

	when.isPromiseLike = isPromiseLike;      // Is something promise-like, aka thenable

	when.Promise     = Promise;              // Promise constructor
	when.defer       = defer;                // Create a {promise, resolve, reject} tuple

	// Error types

	when.TimeoutError = TimeoutError;

	/**
	 * Get a trusted promise for x, or by transforming x with onFulfilled
	 *
	 * @param {*} x
	 * @param {function?} onFulfilled callback to be called when x is
	 *   successfully fulfilled.  If promiseOrValue is an immediate value, callback
	 *   will be invoked immediately.
	 * @param {function?} onRejected callback to be called when x is
	 *   rejected.
	 * @param {function?} onProgress callback to be called when progress updates
	 *   are issued for x. @deprecated
	 * @returns {Promise} a new promise that will fulfill with the return
	 *   value of callback or errback or the completion value of promiseOrValue if
	 *   callback and/or errback is not supplied.
	 */
	function when(x, onFulfilled, onRejected, onProgress) {
		var p = Promise.resolve(x);
		if (arguments.length < 2) {
			return p;
		}

		return p.then(onFulfilled, onRejected, onProgress);
	}

	/**
	 * Creates a new promise whose fate is determined by resolver.
	 * @param {function} resolver function(resolve, reject, notify)
	 * @returns {Promise} promise whose fate is determine by resolver
	 */
	function promise(resolver) {
		return new Promise(resolver);
	}

	/**
	 * Lift the supplied function, creating a version of f that returns
	 * promises, and accepts promises as arguments.
	 * @param {function} f
	 * @returns {Function} version of f that returns promises
	 */
	function lift(f) {
		return function() {
			for(var i=0, l=arguments.length, a=new Array(l); i<l; ++i) {
				a[i] = arguments[i];
			}
			return apply(f, this, a);
		};
	}

	/**
	 * Call f in a future turn, with the supplied args, and return a promise
	 * for the result.
	 * @param {function} f
	 * @returns {Promise}
	 */
	function attempt(f /*, args... */) {
		/*jshint validthis:true */
		for(var i=0, l=arguments.length-1, a=new Array(l); i<l; ++i) {
			a[i] = arguments[i+1];
		}
		return apply(f, this, a);
	}

	/**
	 * Creates a {promise, resolver} pair, either or both of which
	 * may be given out safely to consumers.
	 * @return {{promise: Promise, resolve: function, reject: function, notify: function}}
	 */
	function defer() {
		return new Deferred();
	}

	function Deferred() {
		var p = Promise._defer();

		function resolve(x) { p._handler.resolve(x); }
		function reject(x) { p._handler.reject(x); }
		function notify(x) { p._handler.notify(x); }

		this.promise = p;
		this.resolve = resolve;
		this.reject = reject;
		this.notify = notify;
		this.resolver = { resolve: resolve, reject: reject, notify: notify };
	}

	/**
	 * Determines if x is promise-like, i.e. a thenable object
	 * NOTE: Will return true for *any thenable object*, and isn't truly
	 * safe, since it may attempt to access the `then` property of x (i.e.
	 *  clever/malicious getters may do weird things)
	 * @param {*} x anything
	 * @returns {boolean} true if x is promise-like
	 */
	function isPromiseLike(x) {
		return x && typeof x.then === 'function';
	}

	/**
	 * Return a promise that will resolve only once all the supplied arguments
	 * have resolved. The resolution value of the returned promise will be an array
	 * containing the resolution values of each of the arguments.
	 * @param {...*} arguments may be a mix of promises and values
	 * @returns {Promise}
	 */
	function join(/* ...promises */) {
		return Promise.all(arguments);
	}

	/**
	 * Return a promise that will fulfill once all input promises have
	 * fulfilled, or reject when any one input promise rejects.
	 * @param {array|Promise} promises array (or promise for an array) of promises
	 * @returns {Promise}
	 */
	function all(promises) {
		return when(promises, Promise.all);
	}

	/**
	 * Return a promise that will always fulfill with an array containing
	 * the outcome states of all input promises.  The returned promise
	 * will only reject if `promises` itself is a rejected promise.
	 * @param {array|Promise} promises array (or promise for an array) of promises
	 * @returns {Promise} promise for array of settled state descriptors
	 */
	function settle(promises) {
		return when(promises, Promise.settle);
	}

	/**
	 * Promise-aware array map function, similar to `Array.prototype.map()`,
	 * but input array may contain promises or values.
	 * @param {Array|Promise} promises array of anything, may contain promises and values
	 * @param {function(x:*, index:Number):*} mapFunc map function which may
	 *  return a promise or value
	 * @returns {Promise} promise that will fulfill with an array of mapped values
	 *  or reject if any input promise rejects.
	 */
	function map(promises, mapFunc) {
		return when(promises, function(promises) {
			return Promise.map(promises, mapFunc);
		});
	}

	/**
	 * Filter the provided array of promises using the provided predicate.  Input may
	 * contain promises and values
	 * @param {Array|Promise} promises array of promises and values
	 * @param {function(x:*, index:Number):boolean} predicate filtering predicate.
	 *  Must return truthy (or promise for truthy) for items to retain.
	 * @returns {Promise} promise that will fulfill with an array containing all items
	 *  for which predicate returned truthy.
	 */
	function filter(promises, predicate) {
		return when(promises, function(promises) {
			return Promise.filter(promises, predicate);
		});
	}

	return when;
});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });

},{"./lib/Promise":20,"./lib/TimeoutError":22,"./lib/apply":23,"./lib/decorators/array":24,"./lib/decorators/flow":25,"./lib/decorators/fold":26,"./lib/decorators/inspect":27,"./lib/decorators/iterate":28,"./lib/decorators/progress":29,"./lib/decorators/timed":30,"./lib/decorators/unhandledRejection":31,"./lib/decorators/with":32}],38:[function(require,module,exports){
/*
 * Copyright 2013 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

(function (define) {
	'use strict';

	define(function (/* require */) {

		return {

			/**
			 * Find objects within a graph the contain a property of a certain name.
			 *
			 * NOTE: this method will not discover object graph cycles.
			 *
			 * @param {*} obj object to search on
			 * @param {string} prop name of the property to search for
			 * @param {Function} callback function to receive the found properties and their parent
			 */
			findProperties: function findProperties(obj, prop, callback) {
				if (typeof obj !== 'object' || obj === null) { return; }
				if (prop in obj) {
					callback(obj[prop], obj, prop);
				}
				Object.keys(obj).forEach(function (key) {
					findProperties(obj[key], prop, callback);
				});
			}

		};

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

},{}],39:[function(require,module,exports){
/*
 * Copyright 2013 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

(function (define) {
	'use strict';

	define(function (require) {

		var when;

		when = require('when');

		/**
		 * Create a promise whose work is started only when a handler is registered.
		 *
		 * The work function will be invoked at most once. Thrown values will result
		 * in promise rejection.
		 *
		 * @param {Function} work function whose ouput is used to resolve the
		 *   returned promise.
		 * @returns {Promise} a lazy promise
		 */
		function lazyPromise(work) {
			var defer, started, resolver, promise, then;

			defer = when.defer();
			started = false;

			resolver = defer.resolver;
			promise = defer.promise;
			then = promise.then;

			promise.then = function () {
				if (!started) {
					started = true;
					when.attempt(work).then(resolver.resolve, resolver.reject);
				}
				return then.apply(promise, arguments);
			};

			return promise;
		}

		return lazyPromise;

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

},{"when":37}],40:[function(require,module,exports){
/*
 * Copyright 2012-2013 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

(function (define) {
	'use strict';

	// derived from dojo.mixin
	define(function (/* require */) {

		var empty = {};

		/**
		 * Mix the properties from the source object into the destination object.
		 * When the same property occurs in more then one object, the right most
		 * value wins.
		 *
		 * @param {Object} dest the object to copy properties to
		 * @param {Object} sources the objects to copy properties from.  May be 1 to N arguments, but not an Array.
		 * @return {Object} the destination object
		 */
		function mixin(dest /*, sources... */) {
			var i, l, source, name;

			if (!dest) { dest = {}; }
			for (i = 1, l = arguments.length; i < l; i += 1) {
				source = arguments[i];
				for (name in source) {
					if (!(name in dest) || (dest[name] !== source[name] && (!(name in empty) || empty[name] !== source[name]))) {
						dest[name] = source[name];
					}
				}
			}

			return dest; // Object
		}

		return mixin;

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

},{}],41:[function(require,module,exports){
/*
 * Copyright 2012 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

(function (define) {
	'use strict';

	define(function (/* require */) {

		/**
		 * Normalize HTTP header names using the pseudo camel case.
		 *
		 * For example:
		 *   content-type         -> Content-Type
		 *   accepts              -> Accepts
		 *   x-custom-header-name -> X-Custom-Header-Name
		 *
		 * @param {string} name the raw header name
		 * @return {string} the normalized header name
		 */
		function normalizeHeaderName(name) {
			return name.toLowerCase()
				.split('-')
				.map(function (chunk) { return chunk.charAt(0).toUpperCase() + chunk.slice(1); })
				.join('-');
		}

		return normalizeHeaderName;

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

},{}],42:[function(require,module,exports){
/*
 * Copyright 2014-2015 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

(function (define) {
	'use strict';

	define(function (require) {

		var when = require('when'),
			normalizeHeaderName = require('./normalizeHeaderName');

		function property(promise, name) {
			return promise.then(
				function (value) {
					return value && value[name];
				},
				function (value) {
					return when.reject(value && value[name]);
				}
			);
		}

		/**
		 * Obtain the response entity
		 *
		 * @returns {Promise} for the response entity
		 */
		function entity() {
			/*jshint validthis:true */
			return property(this, 'entity');
		}

		/**
		 * Obtain the response status
		 *
		 * @returns {Promise} for the response status
		 */
		function status() {
			/*jshint validthis:true */
			return property(property(this, 'status'), 'code');
		}

		/**
		 * Obtain the response headers map
		 *
		 * @returns {Promise} for the response headers map
		 */
		function headers() {
			/*jshint validthis:true */
			return property(this, 'headers');
		}

		/**
		 * Obtain a specific response header
		 *
		 * @param {String} headerName the header to retrieve
		 * @returns {Promise} for the response header's value
		 */
		function header(headerName) {
			/*jshint validthis:true */
			headerName = normalizeHeaderName(headerName);
			return property(this.headers(), headerName);
		}

		/**
		 * Follow a related resource
		 *
		 * The relationship to follow may be define as a plain string, an object
		 * with the rel and params, or an array containing one or more entries
		 * with the previous forms.
		 *
		 * Examples:
		 *   response.follow('next')
		 *
		 *   response.follow({ rel: 'next', params: { pageSize: 100 } })
		 *
		 *   response.follow([
		 *       { rel: 'items', params: { projection: 'noImages' } },
		 *       'search',
		 *       { rel: 'findByGalleryIsNull', params: { projection: 'noImages' } },
		 *       'items'
		 *   ])
		 *
		 * @param {String|Object|Array} rels one, or more, relationships to follow
		 * @returns ResponsePromise<Response> related resource
		 */
		function follow(rels) {
			/*jshint validthis:true */
			rels = [].concat(rels);
			return make(when.reduce(rels, function (response, rel) {
				if (typeof rel === 'string') {
					rel = { rel: rel };
				}
				if (typeof response.entity.clientFor !== 'function') {
					throw new Error('Hypermedia response expected');
				}
				var client = response.entity.clientFor(rel.rel);
				return client({ params: rel.params });
			}, this));
		}

		/**
		 * Wrap a Promise as an ResponsePromise
		 *
		 * @param {Promise<Response>} promise the promise for an HTTP Response
		 * @returns {ResponsePromise<Response>} wrapped promise for Response with additional helper methods
		 */
		function make(promise) {
			promise.status = status;
			promise.headers = headers;
			promise.header = header;
			promise.entity = entity;
			promise.follow = follow;
			return promise;
		}

		function responsePromise() {
			return make(when.apply(when, arguments));
		}

		responsePromise.make = make;
		responsePromise.reject = function (val) {
			return make(when.reject(val));
		};
		responsePromise.promise = function (func) {
			return make(when.promise(func));
		};

		return responsePromise;

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

},{"./normalizeHeaderName":41,"when":37}],43:[function(require,module,exports){
/*
 * Copyright 2015 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

(function (define) {
	'use strict';

	define(function (/* require */) {

		var charMap;

		charMap = (function () {
			var strings = {
				alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
				digit: '0123456789'
			};

			strings.genDelims = ':/?#[]@';
			strings.subDelims = '!$&\'()*+,;=';
			strings.reserved = strings.genDelims + strings.subDelims;
			strings.unreserved = strings.alpha + strings.digit + '-._~';
			strings.url = strings.reserved + strings.unreserved;
			strings.scheme = strings.alpha + strings.digit + '+-.';
			strings.userinfo = strings.unreserved + strings.subDelims + ':';
			strings.host = strings.unreserved + strings.subDelims;
			strings.port = strings.digit;
			strings.pchar = strings.unreserved + strings.subDelims + ':@';
			strings.segment = strings.pchar;
			strings.path = strings.segment + '/';
			strings.query = strings.pchar + '/?';
			strings.fragment = strings.pchar + '/?';

			return Object.keys(strings).reduce(function (charMap, set) {
				charMap[set] = strings[set].split('').reduce(function (chars, myChar) {
					chars[myChar] = true;
					return chars;
				}, {});
				return charMap;
			}, {});
		}());

		function encode(str, allowed) {
			if (typeof str !== 'string') {
				throw new Error('String required for URL encoding');
			}
			return str.split('').map(function (myChar) {
				if (allowed.hasOwnProperty(myChar)) {
					return myChar;
				}
				var code = myChar.charCodeAt(0);
				if (code <= 127) {
					var encoded = code.toString(16).toUpperCase();
					return '%' + (encoded.length % 2 === 1 ? '0' : '') + encoded;
				}
				else {
					return encodeURIComponent(myChar).toUpperCase();
				}
			}).join('');
		}

		function makeEncoder(allowed) {
			allowed = allowed || charMap.unreserved;
			return function (str) {
				return encode(str, allowed);
			};
		}

		function decode(str) {
			return decodeURIComponent(str);
		}

		return {

			/*
			 * Decode URL encoded strings
			 *
			 * @param {string} URL encoded string
			 * @returns {string} URL decoded string
			 */
			decode: decode,

			/*
			 * URL encode a string
			 *
			 * All but alpha-numerics and a very limited set of punctuation - . _ ~ are
			 * encoded.
			 *
			 * @param {string} string to encode
			 * @returns {string} URL encoded string
			 */
			encode: makeEncoder(),

			/*
			* URL encode a URL
			*
			* All character permitted anywhere in a URL are left unencoded even
			* if that character is not permitted in that portion of a URL.
			*
			* Note: This method is typically not what you want.
			*
			* @param {string} string to encode
			* @returns {string} URL encoded string
			*/
			encodeURL: makeEncoder(charMap.url),

			/*
			 * URL encode the scheme portion of a URL
			 *
			 * @param {string} string to encode
			 * @returns {string} URL encoded string
			 */
			encodeScheme: makeEncoder(charMap.scheme),

			/*
			 * URL encode the user info portion of a URL
			 *
			 * @param {string} string to encode
			 * @returns {string} URL encoded string
			 */
			encodeUserInfo: makeEncoder(charMap.userinfo),

			/*
			 * URL encode the host portion of a URL
			 *
			 * @param {string} string to encode
			 * @returns {string} URL encoded string
			 */
			encodeHost: makeEncoder(charMap.host),

			/*
			 * URL encode the port portion of a URL
			 *
			 * @param {string} string to encode
			 * @returns {string} URL encoded string
			 */
			encodePort: makeEncoder(charMap.port),

			/*
			 * URL encode a path segment portion of a URL
			 *
			 * @param {string} string to encode
			 * @returns {string} URL encoded string
			 */
			encodePathSegment: makeEncoder(charMap.segment),

			/*
			 * URL encode the path portion of a URL
			 *
			 * @param {string} string to encode
			 * @returns {string} URL encoded string
			 */
			encodePath: makeEncoder(charMap.path),

			/*
			 * URL encode the query portion of a URL
			 *
			 * @param {string} string to encode
			 * @returns {string} URL encoded string
			 */
			encodeQuery: makeEncoder(charMap.query),

			/*
			 * URL encode the fragment portion of a URL
			 *
			 * @param {string} string to encode
			 * @returns {string} URL encoded string
			 */
			encodeFragment: makeEncoder(charMap.fragment)

		};

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

},{}],44:[function(require,module,exports){
/*
 * Copyright 2015 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

(function (define) {
	'use strict';

	var undef;

	define(function (require) {

		var uriEncoder, operations, prefixRE;

		uriEncoder = require('./uriEncoder');

		prefixRE = /^([^:]*):([0-9]+)$/;
		operations = {
			'':  { first: '',  separator: ',', named: false, empty: '',  encoder: uriEncoder.encode },
			'+': { first: '',  separator: ',', named: false, empty: '',  encoder: uriEncoder.encodeURL },
			'#': { first: '#', separator: ',', named: false, empty: '',  encoder: uriEncoder.encodeURL },
			'.': { first: '.', separator: '.', named: false, empty: '',  encoder: uriEncoder.encode },
			'/': { first: '/', separator: '/', named: false, empty: '',  encoder: uriEncoder.encode },
			';': { first: ';', separator: ';', named: true,  empty: '',  encoder: uriEncoder.encode },
			'?': { first: '?', separator: '&', named: true,  empty: '=', encoder: uriEncoder.encode },
			'&': { first: '&', separator: '&', named: true,  empty: '=', encoder: uriEncoder.encode },
			'=': { reserved: true },
			',': { reserved: true },
			'!': { reserved: true },
			'@': { reserved: true },
			'|': { reserved: true }
		};

		function apply(operation, expression, params) {
			/*jshint maxcomplexity:11 */
			return expression.split(',').reduce(function (result, variable) {
				var opts, value;

				opts = {};
				if (variable.slice(-1) === '*') {
					variable = variable.slice(0, -1);
					opts.explode = true;
				}
				if (prefixRE.test(variable)) {
					var prefix = prefixRE.exec(variable);
					variable = prefix[1];
					opts.maxLength = parseInt(prefix[2]);
				}

				variable = uriEncoder.decode(variable);
				value = params[variable];

				if (value === undef || value === null) {
					return result;
				}
				if (Array.isArray(value)) {
					result += value.reduce(function (result, value) {
						if (result.length) {
							result += opts.explode ? operation.separator : ',';
							if (operation.named && opts.explode) {
								result += operation.encoder(variable);
								result += value.length ? '=' : operation.empty;
							}
						}
						else {
							result += operation.first;
							if (operation.named) {
								result += operation.encoder(variable);
								result += value.length ? '=' : operation.empty;
							}
						}
						result += operation.encoder(value);
						return result;
					}, '');
				}
				else if (typeof value === 'object') {
					result += Object.keys(value).reduce(function (result, name) {
						if (result.length) {
							result += opts.explode ? operation.separator : ',';
						}
						else {
							result += operation.first;
							if (operation.named && !opts.explode) {
								result += operation.encoder(variable);
								result += value[name].length ? '=' : operation.empty;
							}
						}
						result += operation.encoder(name);
						result += opts.explode ? '=' : ',';
						result += operation.encoder(value[name]);
						return result;
					}, '');
				}
				else {
					value = String(value);
					if (opts.maxLength) {
						value = value.slice(0, opts.maxLength);
					}
					result += result.length ? operation.separator : operation.first;
					if (operation.named) {
						result += operation.encoder(variable);
						result += value.length ? '=' : operation.empty;
					}
					result += operation.encoder(value);
				}

				return result;
			}, '');
		}

		function expandExpression(expression, params) {
			var operation;

			operation = operations[expression.slice(0,1)];
			if (operation) {
				expression = expression.slice(1);
			}
			else {
				operation = operations[''];
			}

			if (operation.reserved) {
				throw new Error('Reserved expression operations are not supported');
			}

			return apply(operation, expression, params);
		}

		function expandTemplate(template, params) {
			var start, end, uri;

			uri = '';
			end = 0;
			while (true) {
				start = template.indexOf('{', end);
				if (start === -1) {
					// no more expressions
					uri += template.slice(end);
					break;
				}
				uri += template.slice(end, start);
				end = template.indexOf('}', start) + 1;
				uri += expandExpression(template.slice(start + 1, end - 1), params);
			}

			return uri;
		}

		return {

			/**
			 * Expand a URI Template with parameters to form a URI.
			 *
			 * Full implementation (level 4) of rfc6570.
			 * @see https://tools.ietf.org/html/rfc6570
			 *
			 * @param {string} template URI template
			 * @param {Object} [params] params to apply to the template durring expantion
			 * @returns {string} expanded URI
			 */
			expand: expandTemplate

		};

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

},{"./uriEncoder":43}],45:[function(require,module,exports){
'use strict';

define(function () {
    'use strict';

    /* Convert a single or array of resources into "URI1\nURI2\nURI3..." */

    return {
        read: function read(str /*, opts */) {
            return str.split('\n');
        },
        write: function write(obj /*, opts */) {
            // If this is an Array, extract the self URI and then join using a newline
            if (obj instanceof Array) {
                return obj.map(function (resource) {
                    return resource._links.self.href;
                }).join('\n');
            } else {
                // otherwise, just return the self URI
                return obj._links.self.href;
            }
        }
    };
});

},{}],46:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var client = require('./client');

var App = function (_React$Component) {
    _inherits(App, _React$Component);

    function App(props) {
        _classCallCheck(this, App);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(App).call(this, props));

        _this.state = { timestamps: [] };
        return _this;
    }

    _createClass(App, [{
        key: 'componentDidMount',
        value: function componentDidMount() {
            var _this2 = this;

            client({ method: 'GET', path: 'timestamps' }).done(function (response) {
                _this2.setState({ timestamps: response.entity._embedded.timestamps });
            });
        }
    }, {
        key: 'render',
        value: function render() {
            return _react2.default.createElement(TimestampList, { timestamps: this.state.timestamps });
        }
    }]);

    return App;
}(_react2.default.Component);

var TimestampList = function (_React$Component2) {
    _inherits(TimestampList, _React$Component2);

    function TimestampList() {
        _classCallCheck(this, TimestampList);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(TimestampList).apply(this, arguments));
    }

    _createClass(TimestampList, [{
        key: 'render',
        value: function render() {
            var timestamps = this.props.timestamps.map(function (timestamp) {
                return _react2.default.createElement(Timestamp, { key: timestamp._links.self.href, timestamp: timestamp });
            });
            return _react2.default.createElement(
                'table',
                null,
                _react2.default.createElement(
                    'tr',
                    null,
                    _react2.default.createElement(
                        'th',
                        null,
                        'TimestampsLOL'
                    )
                ),
                timestamps
            );
        }
    }]);

    return TimestampList;
}(_react2.default.Component);

var Timestamp = function (_React$Component3) {
    _inherits(Timestamp, _React$Component3);

    function Timestamp() {
        _classCallCheck(this, Timestamp);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Timestamp).apply(this, arguments));
    }

    _createClass(Timestamp, [{
        key: 'render',
        value: function render() {
            return _react2.default.createElement(
                'tr',
                null,
                _react2.default.createElement(
                    'td',
                    null,
                    this.props.timestamp.timestamp
                )
            );
        }
    }]);

    return Timestamp;
}(_react2.default.Component);

ReactDOM.render(_react2.default.createElement(App, null), document.getElementById('react'));

},{"./client":47,"react":"react"}],47:[function(require,module,exports){
'use strict';

var rest = require('rest');
var defaultRequest = require('rest/interceptor/defaultRequest');
var mime = require('rest/interceptor/mime');
var errorCode = require('rest/interceptor/errorCode');
var baseRegistry = require('rest/mime/registry');

var registry = baseRegistry.child();

registry.register('text/uri-list', require('./api/uriListConverter'));
registry.register('application/hal+json', require('rest/mime/type/application/hal'));

module.exports = rest.wrap(mime, { registry: registry }).wrap(errorCode).wrap(defaultRequest, { headers: { 'Accept': 'application/hal+json' } });

},{"./api/uriListConverter":45,"rest":3,"rest/interceptor/defaultRequest":8,"rest/interceptor/errorCode":9,"rest/interceptor/mime":10,"rest/mime/registry":14,"rest/mime/type/application/hal":15}]},{},[46])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3Jlc3QvVXJsQnVpbGRlci5qcyIsIm5vZGVfbW9kdWxlcy9yZXN0L2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvcmVzdC9jbGllbnQuanMiLCJub2RlX21vZHVsZXMvcmVzdC9jbGllbnQvZGVmYXVsdC5qcyIsIm5vZGVfbW9kdWxlcy9yZXN0L2NsaWVudC94aHIuanMiLCJub2RlX21vZHVsZXMvcmVzdC9pbnRlcmNlcHRvci5qcyIsIm5vZGVfbW9kdWxlcy9yZXN0L2ludGVyY2VwdG9yL2RlZmF1bHRSZXF1ZXN0LmpzIiwibm9kZV9tb2R1bGVzL3Jlc3QvaW50ZXJjZXB0b3IvZXJyb3JDb2RlLmpzIiwibm9kZV9tb2R1bGVzL3Jlc3QvaW50ZXJjZXB0b3IvbWltZS5qcyIsIm5vZGVfbW9kdWxlcy9yZXN0L2ludGVyY2VwdG9yL3BhdGhQcmVmaXguanMiLCJub2RlX21vZHVsZXMvcmVzdC9pbnRlcmNlcHRvci90ZW1wbGF0ZS5qcyIsIm5vZGVfbW9kdWxlcy9yZXN0L21pbWUuanMiLCJub2RlX21vZHVsZXMvcmVzdC9taW1lL3JlZ2lzdHJ5LmpzIiwibm9kZV9tb2R1bGVzL3Jlc3QvbWltZS90eXBlL2FwcGxpY2F0aW9uL2hhbC5qcyIsIm5vZGVfbW9kdWxlcy9yZXN0L21pbWUvdHlwZS9hcHBsaWNhdGlvbi9qc29uLmpzIiwibm9kZV9tb2R1bGVzL3Jlc3QvbWltZS90eXBlL2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZC5qcyIsIm5vZGVfbW9kdWxlcy9yZXN0L21pbWUvdHlwZS9tdWx0aXBhcnQvZm9ybS1kYXRhLmpzIiwibm9kZV9tb2R1bGVzL3Jlc3QvbWltZS90eXBlL3RleHQvcGxhaW4uanMiLCJub2RlX21vZHVsZXMvcmVzdC9ub2RlX21vZHVsZXMvd2hlbi9saWIvUHJvbWlzZS5qcyIsIm5vZGVfbW9kdWxlcy9yZXN0L25vZGVfbW9kdWxlcy93aGVuL2xpYi9TY2hlZHVsZXIuanMiLCJub2RlX21vZHVsZXMvcmVzdC9ub2RlX21vZHVsZXMvd2hlbi9saWIvVGltZW91dEVycm9yLmpzIiwibm9kZV9tb2R1bGVzL3Jlc3Qvbm9kZV9tb2R1bGVzL3doZW4vbGliL2FwcGx5LmpzIiwibm9kZV9tb2R1bGVzL3Jlc3Qvbm9kZV9tb2R1bGVzL3doZW4vbGliL2RlY29yYXRvcnMvYXJyYXkuanMiLCJub2RlX21vZHVsZXMvcmVzdC9ub2RlX21vZHVsZXMvd2hlbi9saWIvZGVjb3JhdG9ycy9mbG93LmpzIiwibm9kZV9tb2R1bGVzL3Jlc3Qvbm9kZV9tb2R1bGVzL3doZW4vbGliL2RlY29yYXRvcnMvZm9sZC5qcyIsIm5vZGVfbW9kdWxlcy9yZXN0L25vZGVfbW9kdWxlcy93aGVuL2xpYi9kZWNvcmF0b3JzL2luc3BlY3QuanMiLCJub2RlX21vZHVsZXMvcmVzdC9ub2RlX21vZHVsZXMvd2hlbi9saWIvZGVjb3JhdG9ycy9pdGVyYXRlLmpzIiwibm9kZV9tb2R1bGVzL3Jlc3Qvbm9kZV9tb2R1bGVzL3doZW4vbGliL2RlY29yYXRvcnMvcHJvZ3Jlc3MuanMiLCJub2RlX21vZHVsZXMvcmVzdC9ub2RlX21vZHVsZXMvd2hlbi9saWIvZGVjb3JhdG9ycy90aW1lZC5qcyIsIm5vZGVfbW9kdWxlcy9yZXN0L25vZGVfbW9kdWxlcy93aGVuL2xpYi9kZWNvcmF0b3JzL3VuaGFuZGxlZFJlamVjdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9yZXN0L25vZGVfbW9kdWxlcy93aGVuL2xpYi9kZWNvcmF0b3JzL3dpdGguanMiLCJub2RlX21vZHVsZXMvcmVzdC9ub2RlX21vZHVsZXMvd2hlbi9saWIvZW52LmpzIiwibm9kZV9tb2R1bGVzL3Jlc3Qvbm9kZV9tb2R1bGVzL3doZW4vbGliL2Zvcm1hdC5qcyIsIm5vZGVfbW9kdWxlcy9yZXN0L25vZGVfbW9kdWxlcy93aGVuL2xpYi9tYWtlUHJvbWlzZS5qcyIsIm5vZGVfbW9kdWxlcy9yZXN0L25vZGVfbW9kdWxlcy93aGVuL2xpYi9zdGF0ZS5qcyIsIm5vZGVfbW9kdWxlcy9yZXN0L25vZGVfbW9kdWxlcy93aGVuL3doZW4uanMiLCJub2RlX21vZHVsZXMvcmVzdC91dGlsL2ZpbmQuanMiLCJub2RlX21vZHVsZXMvcmVzdC91dGlsL2xhenlQcm9taXNlLmpzIiwibm9kZV9tb2R1bGVzL3Jlc3QvdXRpbC9taXhpbi5qcyIsIm5vZGVfbW9kdWxlcy9yZXN0L3V0aWwvbm9ybWFsaXplSGVhZGVyTmFtZS5qcyIsIm5vZGVfbW9kdWxlcy9yZXN0L3V0aWwvcmVzcG9uc2VQcm9taXNlLmpzIiwibm9kZV9tb2R1bGVzL3Jlc3QvdXRpbC91cmlFbmNvZGVyLmpzIiwibm9kZV9tb2R1bGVzL3Jlc3QvdXRpbC91cmlUZW1wbGF0ZS5qcyIsInNyYy9tYWluL3Jlc291cmNlcy9zdGF0aWMvYXBpL3VyaUxpc3RDb252ZXJ0ZXIuanMiLCJzcmMvbWFpbi9yZXNvdXJjZXMvc3RhdGljL2FwcC5qcyIsInNyYy9tYWluL3Jlc291cmNlcy9zdGF0aWMvY2xpZW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDLzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM1S0EsT0FBTyxZQUFXO0FBQ2Q7OztBQURjO0FBSWQsV0FBTztBQUNILGNBQU0sY0FBUyxlQUFULEVBQTBCO0FBQzVCLG1CQUFPLElBQUksS0FBSixDQUFVLElBQVYsQ0FBUCxDQUQ0QjtTQUExQjtBQUdOLGVBQU8sZUFBUyxlQUFULEVBQTBCOztBQUU3QixnQkFBSSxlQUFlLEtBQWYsRUFBc0I7QUFDdEIsdUJBQU8sSUFBSSxHQUFKLENBQVEsVUFBUyxRQUFULEVBQW1CO0FBQzlCLDJCQUFPLFNBQVMsTUFBVCxDQUFnQixJQUFoQixDQUFxQixJQUFyQixDQUR1QjtpQkFBbkIsQ0FBUixDQUVKLElBRkksQ0FFQyxJQUZELENBQVAsQ0FEc0I7YUFBMUIsTUFJTzs7QUFDSCx1QkFBTyxJQUFJLE1BQUosQ0FBVyxJQUFYLENBQWdCLElBQWhCLENBREo7YUFKUDtTQUZHO0tBSlgsQ0FKYztDQUFYLENBQVA7OztBQ0FBOzs7O0FBRUE7Ozs7Ozs7Ozs7OztBQUNBLElBQU0sU0FBUyxRQUFRLFVBQVIsQ0FBVDs7SUFFQTs7O0FBRUYsYUFGRSxHQUVGLENBQVksS0FBWixFQUFtQjs4QkFGakIsS0FFaUI7OzJFQUZqQixnQkFHUSxRQURTOztBQUVmLGNBQUssS0FBTCxHQUFhLEVBQUMsWUFBWSxFQUFaLEVBQWQsQ0FGZTs7S0FBbkI7O2lCQUZFOzs0Q0FPa0I7OztBQUNoQixtQkFBTyxFQUFDLFFBQVEsS0FBUixFQUFlLE1BQU0sWUFBTixFQUF2QixFQUE0QyxJQUE1QyxDQUFpRCxvQkFBWTtBQUN6RCx1QkFBSyxRQUFMLENBQWMsRUFBQyxZQUFZLFNBQVMsTUFBVCxDQUFnQixTQUFoQixDQUEwQixVQUExQixFQUEzQixFQUR5RDthQUFaLENBQWpELENBRGdCOzs7O2lDQUtYO0FBQ0wsbUJBQ0ksOEJBQUMsYUFBRCxJQUFlLFlBQVksS0FBSyxLQUFMLENBQVcsVUFBWCxFQUEzQixDQURKLENBREs7Ozs7V0FaUDtFQUFZLGdCQUFNLFNBQU47O0lBbUJaOzs7Ozs7Ozs7OztpQ0FDTztBQUNMLGdCQUFJLGFBQWEsS0FBSyxLQUFMLENBQVcsVUFBWCxDQUFzQixHQUF0QixDQUEwQjt1QkFDdkMsOEJBQUMsU0FBRCxJQUFXLEtBQUssVUFBVSxNQUFWLENBQWlCLElBQWpCLENBQXNCLElBQXRCLEVBQTRCLFdBQVcsU0FBWCxFQUE1QzthQUR1QyxDQUF2QyxDQURDO0FBSUwsbUJBQ0k7OztnQkFDUjs7O29CQUNDOzs7O3FCQUREO2lCQURRO2dCQUlQLFVBSk87YUFESixDQUpLOzs7O1dBRFA7RUFBc0IsZ0JBQU0sU0FBTjs7SUFpQnRCOzs7Ozs7Ozs7OztpQ0FDTztBQUNMLG1CQUNJOzs7Z0JBQ0k7OztvQkFBSyxLQUFLLEtBQUwsQ0FBVyxTQUFYLENBQXFCLFNBQXJCO2lCQURUO2FBREosQ0FESzs7OztXQURQO0VBQWtCLGdCQUFNLFNBQU47O0FBVXhCLFNBQVMsTUFBVCxDQUNBLDhCQUFDLEdBQUQsT0FEQSxFQUVJLFNBQVMsY0FBVCxDQUF3QixPQUF4QixDQUZKOzs7QUNuREE7O0FBRUEsSUFBSSxPQUFPLFFBQVEsTUFBUixDQUFQO0FBQ0osSUFBSSxpQkFBaUIsUUFBUSxpQ0FBUixDQUFqQjtBQUNKLElBQUksT0FBTyxRQUFRLHVCQUFSLENBQVA7QUFDSixJQUFJLFlBQVksUUFBUSw0QkFBUixDQUFaO0FBQ0osSUFBSSxlQUFlLFFBQVEsb0JBQVIsQ0FBZjs7QUFFSixJQUFJLFdBQVcsYUFBYSxLQUFiLEVBQVg7O0FBRUosU0FBUyxRQUFULENBQWtCLGVBQWxCLEVBQW1DLFFBQVEsd0JBQVIsQ0FBbkM7QUFDQSxTQUFTLFFBQVQsQ0FBa0Isc0JBQWxCLEVBQTBDLFFBQVEsZ0NBQVIsQ0FBMUM7O0FBRUEsT0FBTyxPQUFQLEdBQWlCLEtBQ1osSUFEWSxDQUNQLElBRE8sRUFDRCxFQUFFLFVBQVUsUUFBVixFQURELEVBRVosSUFGWSxDQUVQLFNBRk8sRUFHWixJQUhZLENBR1AsY0FITyxFQUdTLEVBQUUsU0FBUyxFQUFFLFVBQVUsc0JBQVYsRUFBWCxFQUhYLENBQWpCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBzZXRUaW1lb3V0KGRyYWluUXVldWUsIDApO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgdGhlIG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzXG4gKiBAbGljZW5zZSBNSVQsIHNlZSBMSUNFTlNFLnR4dCBmb3IgZGV0YWlsc1xuICpcbiAqIEBhdXRob3IgU2NvdHQgQW5kcmV3c1xuICovXG5cbihmdW5jdGlvbiAoZGVmaW5lLCBsb2NhdGlvbikge1xuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIHVuZGVmO1xuXG5cdGRlZmluZShmdW5jdGlvbiAocmVxdWlyZSkge1xuXG5cdFx0dmFyIG1peGluLCBvcmlnaW4sIHVybFJFLCBhYnNvbHV0ZVVybFJFLCBmdWxseVF1YWxpZmllZFVybFJFO1xuXG5cdFx0bWl4aW4gPSByZXF1aXJlKCcuL3V0aWwvbWl4aW4nKTtcblxuXHRcdHVybFJFID0gLyhbYS16XVthLXowLTlcXCtcXC1cXC5dKjopXFwvXFwvKFteQF0rQCk/KChbXjpcXC9dKykoOihbMC05XSspKT8pPyhcXC9bXj8jXSopPyhcXD9bXiNdKik/KCNcXFMqKT8vaTtcblx0XHRhYnNvbHV0ZVVybFJFID0gL14oW2Etel1bYS16MC05XFwtXFwrXFwuXSo6XFwvXFwvfFxcLykvaTtcblx0XHRmdWxseVF1YWxpZmllZFVybFJFID0gLyhbYS16XVthLXowLTlcXCtcXC1cXC5dKjopXFwvXFwvKFteQF0rQCk/KChbXjpcXC9dKykoOihbMC05XSspKT8pP1xcLy9pO1xuXG5cdFx0LyoqXG5cdFx0ICogQXBwbHkgcGFyYW1zIHRvIHRoZSB0ZW1wbGF0ZSB0byBjcmVhdGUgYSBVUkwuXG5cdFx0ICpcblx0XHQgKiBQYXJhbWV0ZXJzIHRoYXQgYXJlIG5vdCBhcHBsaWVkIGRpcmVjdGx5IHRvIHRoZSB0ZW1wbGF0ZSwgYXJlIGFwcGVuZGVkXG5cdFx0ICogdG8gdGhlIFVSTCBhcyBxdWVyeSBzdHJpbmcgcGFyYW1ldGVycy5cblx0XHQgKlxuXHRcdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZW1wbGF0ZSB0aGUgVVJJIHRlbXBsYXRlXG5cdFx0ICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyBwYXJhbWV0ZXJzIHRvIGFwcGx5IHRvIHRoZSB0ZW1wbGF0ZVxuXHRcdCAqIEByZXR1cm4ge3N0cmluZ30gdGhlIHJlc3VsdGluZyBVUkxcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBidWlsZFVybCh0ZW1wbGF0ZSwgcGFyYW1zKSB7XG5cdFx0XHQvLyBpbnRlcm5hbCBidWlsZGVyIHRvIGNvbnZlcnQgdGVtcGxhdGUgd2l0aCBwYXJhbXMuXG5cdFx0XHR2YXIgdXJsLCBuYW1lLCBxdWVyeVN0cmluZ1BhcmFtcywgcmU7XG5cblx0XHRcdHVybCA9IHRlbXBsYXRlO1xuXHRcdFx0cXVlcnlTdHJpbmdQYXJhbXMgPSB7fTtcblxuXHRcdFx0aWYgKHBhcmFtcykge1xuXHRcdFx0XHRmb3IgKG5hbWUgaW4gcGFyYW1zKSB7XG5cdFx0XHRcdFx0Lypqc2hpbnQgZm9yaW46ZmFsc2UgKi9cblx0XHRcdFx0XHRyZSA9IG5ldyBSZWdFeHAoJ1xcXFx7JyArIG5hbWUgKyAnXFxcXH0nKTtcblx0XHRcdFx0XHRpZiAocmUudGVzdCh1cmwpKSB7XG5cdFx0XHRcdFx0XHR1cmwgPSB1cmwucmVwbGFjZShyZSwgZW5jb2RlVVJJQ29tcG9uZW50KHBhcmFtc1tuYW1lXSksICdnJyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0cXVlcnlTdHJpbmdQYXJhbXNbbmFtZV0gPSBwYXJhbXNbbmFtZV07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGZvciAobmFtZSBpbiBxdWVyeVN0cmluZ1BhcmFtcykge1xuXHRcdFx0XHRcdHVybCArPSB1cmwuaW5kZXhPZignPycpID09PSAtMSA/ICc/JyA6ICcmJztcblx0XHRcdFx0XHR1cmwgKz0gZW5jb2RlVVJJQ29tcG9uZW50KG5hbWUpO1xuXHRcdFx0XHRcdGlmIChxdWVyeVN0cmluZ1BhcmFtc1tuYW1lXSAhPT0gbnVsbCAmJiBxdWVyeVN0cmluZ1BhcmFtc1tuYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHR1cmwgKz0gJz0nO1xuXHRcdFx0XHRcdFx0dXJsICs9IGVuY29kZVVSSUNvbXBvbmVudChxdWVyeVN0cmluZ1BhcmFtc1tuYW1lXSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdXJsO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHN0YXJ0c1dpdGgoc3RyLCB0ZXN0KSB7XG5cdFx0XHRyZXR1cm4gc3RyLmluZGV4T2YodGVzdCkgPT09IDA7XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogQ3JlYXRlIGEgbmV3IFVSTCBCdWlsZGVyXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge3N0cmluZ3xVcmxCdWlsZGVyfSB0ZW1wbGF0ZSB0aGUgYmFzZSB0ZW1wbGF0ZSB0byBidWlsZCBmcm9tLCBtYXkgYmUgYW5vdGhlciBVcmxCdWlsZGVyXG5cdFx0ICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIGJhc2UgcGFyYW1ldGVyc1xuXHRcdCAqIEBjb25zdHJ1Y3RvclxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIFVybEJ1aWxkZXIodGVtcGxhdGUsIHBhcmFtcykge1xuXHRcdFx0aWYgKCEodGhpcyBpbnN0YW5jZW9mIFVybEJ1aWxkZXIpKSB7XG5cdFx0XHRcdC8vIGludm9rZSBhcyBhIGNvbnN0cnVjdG9yXG5cdFx0XHRcdHJldHVybiBuZXcgVXJsQnVpbGRlcih0ZW1wbGF0ZSwgcGFyYW1zKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHRlbXBsYXRlIGluc3RhbmNlb2YgVXJsQnVpbGRlcikge1xuXHRcdFx0XHR0aGlzLl90ZW1wbGF0ZSA9IHRlbXBsYXRlLnRlbXBsYXRlO1xuXHRcdFx0XHR0aGlzLl9wYXJhbXMgPSBtaXhpbih7fSwgdGhpcy5fcGFyYW1zLCBwYXJhbXMpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHRoaXMuX3RlbXBsYXRlID0gKHRlbXBsYXRlIHx8ICcnKS50b1N0cmluZygpO1xuXHRcdFx0XHR0aGlzLl9wYXJhbXMgPSBwYXJhbXMgfHwge307XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0VXJsQnVpbGRlci5wcm90b3R5cGUgPSB7XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQ3JlYXRlIGEgbmV3IFVybEJ1aWxkZXIgaW5zdGFuY2UgdGhhdCBleHRlbmRzIHRoZSBjdXJyZW50IGJ1aWxkZXIuXG5cdFx0XHQgKiBUaGUgY3VycmVudCBidWlsZGVyIGlzIHVubW9kaWZpZWQuXG5cdFx0XHQgKlxuXHRcdFx0ICogQHBhcmFtIHtzdHJpbmd9IFt0ZW1wbGF0ZV0gVVJMIHRlbXBsYXRlIHRvIGFwcGVuZCB0byB0aGUgY3VycmVudCB0ZW1wbGF0ZVxuXHRcdFx0ICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIHBhcmFtcyB0byBjb21iaW5lIHdpdGggY3VycmVudCBwYXJhbXMuICBOZXcgcGFyYW1zIG92ZXJyaWRlIGV4aXN0aW5nIHBhcmFtc1xuXHRcdFx0ICogQHJldHVybiB7VXJsQnVpbGRlcn0gdGhlIG5ldyBidWlsZGVyXG5cdFx0XHQgKi9cblx0XHRcdGFwcGVuZDogZnVuY3Rpb24gKHRlbXBsYXRlLCAgcGFyYW1zKSB7XG5cdFx0XHRcdC8vIFRPRE8gY29uc2lkZXIgcXVlcnkgc3RyaW5ncyBhbmQgZnJhZ21lbnRzXG5cdFx0XHRcdHJldHVybiBuZXcgVXJsQnVpbGRlcih0aGlzLl90ZW1wbGF0ZSArIHRlbXBsYXRlLCBtaXhpbih7fSwgdGhpcy5fcGFyYW1zLCBwYXJhbXMpKTtcblx0XHRcdH0sXG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQ3JlYXRlIGEgbmV3IFVybEJ1aWxkZXIgd2l0aCBhIGZ1bGx5IHF1YWxpZmllZCBVUkwgYmFzZWQgb24gdGhlXG5cdFx0XHQgKiB3aW5kb3cncyBsb2NhdGlvbiBvciBiYXNlIGhyZWYgYW5kIHRoZSBjdXJyZW50IHRlbXBsYXRlcyByZWxhdGl2ZSBVUkwuXG5cdFx0XHQgKlxuXHRcdFx0ICogUGF0aCB2YXJpYWJsZXMgYXJlIHByZXNlcnZlZC5cblx0XHRcdCAqXG5cdFx0XHQgKiAqQnJvd3NlciBvbmx5KlxuXHRcdFx0ICpcblx0XHRcdCAqIEByZXR1cm4ge1VybEJ1aWxkZXJ9IHRoZSBmdWxseSBxdWFsaWZpZWQgVVJMIHRlbXBsYXRlXG5cdFx0XHQgKi9cblx0XHRcdGZ1bGx5UXVhbGlmeTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRpZiAoIWxvY2F0aW9uKSB7IHJldHVybiB0aGlzOyB9XG5cdFx0XHRcdGlmICh0aGlzLmlzRnVsbHlRdWFsaWZpZWQoKSkgeyByZXR1cm4gdGhpczsgfVxuXG5cdFx0XHRcdHZhciB0ZW1wbGF0ZSA9IHRoaXMuX3RlbXBsYXRlO1xuXG5cdFx0XHRcdGlmIChzdGFydHNXaXRoKHRlbXBsYXRlLCAnLy8nKSkge1xuXHRcdFx0XHRcdHRlbXBsYXRlID0gb3JpZ2luLnByb3RvY29sICsgdGVtcGxhdGU7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAoc3RhcnRzV2l0aCh0ZW1wbGF0ZSwgJy8nKSkge1xuXHRcdFx0XHRcdHRlbXBsYXRlID0gb3JpZ2luLm9yaWdpbiArIHRlbXBsYXRlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKCF0aGlzLmlzQWJzb2x1dGUoKSkge1xuXHRcdFx0XHRcdHRlbXBsYXRlID0gb3JpZ2luLm9yaWdpbiArIG9yaWdpbi5wYXRobmFtZS5zdWJzdHJpbmcoMCwgb3JpZ2luLnBhdGhuYW1lLmxhc3RJbmRleE9mKCcvJykgKyAxKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICh0ZW1wbGF0ZS5pbmRleE9mKCcvJywgOCkgPT09IC0xKSB7XG5cdFx0XHRcdFx0Ly8gZGVmYXVsdCB0aGUgcGF0aG5hbWUgdG8gJy8nXG5cdFx0XHRcdFx0dGVtcGxhdGUgPSB0ZW1wbGF0ZSArICcvJztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJldHVybiBuZXcgVXJsQnVpbGRlcih0ZW1wbGF0ZSwgdGhpcy5fcGFyYW1zKTtcblx0XHRcdH0sXG5cblx0XHRcdC8qKlxuXHRcdFx0ICogVHJ1ZSBpZiB0aGUgVVJMIGlzIGFic29sdXRlXG5cdFx0XHQgKlxuXHRcdFx0ICogQHJldHVybiB7Ym9vbGVhbn1cblx0XHRcdCAqL1xuXHRcdFx0aXNBYnNvbHV0ZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gYWJzb2x1dGVVcmxSRS50ZXN0KHRoaXMuYnVpbGQoKSk7XG5cdFx0XHR9LFxuXG5cdFx0XHQvKipcblx0XHRcdCAqIFRydWUgaWYgdGhlIFVSTCBpcyBmdWxseSBxdWFsaWZpZWRcblx0XHRcdCAqXG5cdFx0XHQgKiBAcmV0dXJuIHtib29sZWFufVxuXHRcdFx0ICovXG5cdFx0XHRpc0Z1bGx5UXVhbGlmaWVkOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBmdWxseVF1YWxpZmllZFVybFJFLnRlc3QodGhpcy5idWlsZCgpKTtcblx0XHRcdH0sXG5cblx0XHRcdC8qKlxuXHRcdFx0ICogVHJ1ZSBpZiB0aGUgVVJMIGlzIGNyb3NzIG9yaWdpbi4gVGhlIHByb3RvY29sLCBob3N0IGFuZCBwb3J0IG11c3Qgbm90IGJlXG5cdFx0XHQgKiB0aGUgc2FtZSBpbiBvcmRlciB0byBiZSBjcm9zcyBvcmlnaW4sXG5cdFx0XHQgKlxuXHRcdFx0ICogQHJldHVybiB7Ym9vbGVhbn1cblx0XHRcdCAqL1xuXHRcdFx0aXNDcm9zc09yaWdpbjogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRpZiAoIW9yaWdpbikge1xuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciB1cmwgPSB0aGlzLnBhcnRzKCk7XG5cdFx0XHRcdHJldHVybiB1cmwucHJvdG9jb2wgIT09IG9yaWdpbi5wcm90b2NvbCB8fFxuXHRcdFx0XHQgICAgICAgdXJsLmhvc3RuYW1lICE9PSBvcmlnaW4uaG9zdG5hbWUgfHxcblx0XHRcdFx0ICAgICAgIHVybC5wb3J0ICE9PSBvcmlnaW4ucG9ydDtcblx0XHRcdH0sXG5cblx0XHRcdC8qKlxuXHRcdFx0ICogU3BsaXQgYSBVUkwgaW50byBpdHMgY29uc2l0dWVudCBwYXJ0cyBmb2xsb3dpbmcgdGhlIG5hbWluZyBjb252ZW50aW9uIG9mXG5cdFx0XHQgKiAnd2luZG93LmxvY2F0aW9uJy4gT25lIGRpZmZlcmVuY2UgaXMgdGhhdCB0aGUgcG9ydCB3aWxsIGNvbnRhaW4gdGhlXG5cdFx0XHQgKiBwcm90b2NvbCBkZWZhdWx0IGlmIG5vdCBzcGVjaWZpZWQuXG5cdFx0XHQgKlxuXHRcdFx0ICogQHNlZSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL0RPTS93aW5kb3cubG9jYXRpb25cblx0XHRcdCAqXG5cdFx0XHQgKiBAcmV0dXJucyB7T2JqZWN0fSBhICd3aW5kb3cubG9jYXRpb24nLWxpa2Ugb2JqZWN0XG5cdFx0XHQgKi9cblx0XHRcdHBhcnRzOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdC8qanNoaW50IG1heGNvbXBsZXhpdHk6MjAgKi9cblx0XHRcdFx0dmFyIHVybCwgcGFydHM7XG5cdFx0XHRcdHVybCA9IHRoaXMuZnVsbHlRdWFsaWZ5KCkuYnVpbGQoKS5tYXRjaCh1cmxSRSk7XG5cdFx0XHRcdHBhcnRzID0ge1xuXHRcdFx0XHRcdGhyZWY6IHVybFswXSxcblx0XHRcdFx0XHRwcm90b2NvbDogdXJsWzFdLFxuXHRcdFx0XHRcdGhvc3Q6IHVybFszXSB8fCAnJyxcblx0XHRcdFx0XHRob3N0bmFtZTogdXJsWzRdIHx8ICcnLFxuXHRcdFx0XHRcdHBvcnQ6IHVybFs2XSxcblx0XHRcdFx0XHRwYXRobmFtZTogdXJsWzddIHx8ICcnLFxuXHRcdFx0XHRcdHNlYXJjaDogdXJsWzhdIHx8ICcnLFxuXHRcdFx0XHRcdGhhc2g6IHVybFs5XSB8fCAnJ1xuXHRcdFx0XHR9O1xuXHRcdFx0XHRwYXJ0cy5vcmlnaW4gPSBwYXJ0cy5wcm90b2NvbCArICcvLycgKyBwYXJ0cy5ob3N0O1xuXHRcdFx0XHRwYXJ0cy5wb3J0ID0gcGFydHMucG9ydCB8fCAocGFydHMucHJvdG9jb2wgPT09ICdodHRwczonID8gJzQ0MycgOiBwYXJ0cy5wcm90b2NvbCA9PT0gJ2h0dHA6JyA/ICc4MCcgOiAnJyk7XG5cdFx0XHRcdHJldHVybiBwYXJ0cztcblx0XHRcdH0sXG5cblx0XHRcdC8qKlxuXHRcdFx0ICogRXhwYW5kIHRoZSB0ZW1wbGF0ZSByZXBsYWNpbmcgcGF0aCB2YXJpYWJsZXMgd2l0aCBwYXJhbWV0ZXJzXG5cdFx0XHQgKlxuXHRcdFx0ICogQHBhcmFtIHtPYmplY3R9IFtwYXJhbXNdIHBhcmFtcyB0byBjb21iaW5lIHdpdGggY3VycmVudCBwYXJhbXMuICBOZXcgcGFyYW1zIG92ZXJyaWRlIGV4aXN0aW5nIHBhcmFtc1xuXHRcdFx0ICogQHJldHVybiB7c3RyaW5nfSB0aGUgZXhwYW5kZWQgVVJMXG5cdFx0XHQgKi9cblx0XHRcdGJ1aWxkOiBmdW5jdGlvbiAocGFyYW1zKSB7XG5cdFx0XHRcdHJldHVybiBidWlsZFVybCh0aGlzLl90ZW1wbGF0ZSwgbWl4aW4oe30sIHRoaXMuX3BhcmFtcywgcGFyYW1zKSk7XG5cdFx0XHR9LFxuXG5cdFx0XHQvKipcblx0XHRcdCAqIEBzZWUgYnVpbGRcblx0XHRcdCAqL1xuXHRcdFx0dG9TdHJpbmc6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuYnVpbGQoKTtcblx0XHRcdH1cblxuXHRcdH07XG5cblx0XHRvcmlnaW4gPSBsb2NhdGlvbiA/IG5ldyBVcmxCdWlsZGVyKGxvY2F0aW9uLmhyZWYpLnBhcnRzKCkgOiB1bmRlZjtcblxuXHRcdHJldHVybiBVcmxCdWlsZGVyO1xuXHR9KTtcblxufShcblx0dHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lIDogZnVuY3Rpb24gKGZhY3RvcnkpIHsgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUpOyB9LFxuXHR0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdy5sb2NhdGlvbiA6IHZvaWQgMFxuXHQvLyBCb2lsZXJwbGF0ZSBmb3IgQU1EIGFuZCBOb2RlXG4pKTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNCB0aGUgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4gKlxuICogQGF1dGhvciBTY290dCBBbmRyZXdzXG4gKi9cblxuKGZ1bmN0aW9uIChkZWZpbmUpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGRlZmluZShmdW5jdGlvbiAocmVxdWlyZSkge1xuXG5cdFx0dmFyIHJlc3QgPSByZXF1aXJlKCcuL2NsaWVudC9kZWZhdWx0JyksXG5cdFx0ICAgIGJyb3dzZXIgPSByZXF1aXJlKCcuL2NsaWVudC94aHInKTtcblxuXHRcdHJlc3Quc2V0UGxhdGZvcm1EZWZhdWx0Q2xpZW50KGJyb3dzZXIpO1xuXG5cdFx0cmV0dXJuIHJlc3Q7XG5cblx0fSk7XG5cbn0oXG5cdHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZSA6IGZ1bmN0aW9uIChmYWN0b3J5KSB7IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKTsgfVxuXHQvLyBCb2lsZXJwbGF0ZSBmb3IgQU1EIGFuZCBOb2RlXG4pKTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNCB0aGUgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4gKlxuICogQGF1dGhvciBTY290dCBBbmRyZXdzXG4gKi9cblxuKGZ1bmN0aW9uIChkZWZpbmUpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGRlZmluZShmdW5jdGlvbiAoLyogcmVxdWlyZSAqLykge1xuXG5cdFx0LyoqXG5cdFx0ICogQWRkIGNvbW1vbiBoZWxwZXIgbWV0aG9kcyB0byBhIGNsaWVudCBpbXBsXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge2Z1bmN0aW9ufSBpbXBsIHRoZSBjbGllbnQgaW1wbGVtZW50YXRpb25cblx0XHQgKiBAcGFyYW0ge0NsaWVudH0gW3RhcmdldF0gdGFyZ2V0IG9mIHRoaXMgY2xpZW50LCB1c2VkIHdoZW4gd3JhcHBpbmcgb3RoZXIgY2xpZW50c1xuXHRcdCAqIEByZXR1cm5zIHtDbGllbnR9IHRoZSBjbGllbnQgaW1wbCB3aXRoIGFkZGl0aW9uYWwgbWV0aG9kc1xuXHRcdCAqL1xuXHRcdHJldHVybiBmdW5jdGlvbiBjbGllbnQoaW1wbCwgdGFyZ2V0KSB7XG5cblx0XHRcdGlmICh0YXJnZXQpIHtcblxuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogQHJldHVybnMge0NsaWVudH0gdGhlIHRhcmdldCBjbGllbnRcblx0XHRcdFx0ICovXG5cdFx0XHRcdGltcGwuc2tpcCA9IGZ1bmN0aW9uIHNraXAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRhcmdldDtcblx0XHRcdFx0fTtcblxuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqIEFsbG93IGEgY2xpZW50IHRvIGVhc2lseSBiZSB3cmFwcGVkIGJ5IGFuIGludGVyY2VwdG9yXG5cdFx0XHQgKlxuXHRcdFx0ICogQHBhcmFtIHtJbnRlcmNlcHRvcn0gaW50ZXJjZXB0b3IgdGhlIGludGVyY2VwdG9yIHRvIHdyYXAgdGhpcyBjbGllbnQgd2l0aFxuXHRcdFx0ICogQHBhcmFtIFtjb25maWddIGNvbmZpZ3VyYXRpb24gZm9yIHRoZSBpbnRlcmNlcHRvclxuXHRcdFx0ICogQHJldHVybnMge0NsaWVudH0gdGhlIG5ld2x5IHdyYXBwZWQgY2xpZW50XG5cdFx0XHQgKi9cblx0XHRcdGltcGwud3JhcCA9IGZ1bmN0aW9uIHdyYXAoaW50ZXJjZXB0b3IsIGNvbmZpZykge1xuXHRcdFx0XHRyZXR1cm4gaW50ZXJjZXB0b3IoaW1wbCwgY29uZmlnKTtcblx0XHRcdH07XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQGRlcHJlY2F0ZWRcblx0XHRcdCAqL1xuXHRcdFx0aW1wbC5jaGFpbiA9IGZ1bmN0aW9uIGNoYWluKCkge1xuXHRcdFx0XHRpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3QuanM6IGNsaWVudC5jaGFpbigpIGlzIGRlcHJlY2F0ZWQsIHVzZSBjbGllbnQud3JhcCgpIGluc3RlYWQnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJldHVybiBpbXBsLndyYXAuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0XHRcdH07XG5cblx0XHRcdHJldHVybiBpbXBsO1xuXG5cdFx0fTtcblxuXHR9KTtcblxufShcblx0dHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lIDogZnVuY3Rpb24gKGZhY3RvcnkpIHsgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUpOyB9XG5cdC8vIEJvaWxlcnBsYXRlIGZvciBBTUQgYW5kIE5vZGVcbikpO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDE0IHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuICogQGxpY2Vuc2UgTUlULCBzZWUgTElDRU5TRS50eHQgZm9yIGRldGFpbHNcbiAqXG4gKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiAqL1xuXG4oZnVuY3Rpb24gKGRlZmluZSkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIHVuZGVmO1xuXG5cdGRlZmluZShmdW5jdGlvbiAocmVxdWlyZSkge1xuXG5cdFx0LyoqXG5cdFx0ICogUGxhaW4gSlMgT2JqZWN0IGNvbnRhaW5pbmcgcHJvcGVydGllcyB0aGF0IHJlcHJlc2VudCBhbiBIVFRQIHJlcXVlc3QuXG5cdFx0ICpcblx0XHQgKiBEZXBlbmRpbmcgb24gdGhlIGNhcGFiaWxpdGllcyBvZiB0aGUgdW5kZXJseWluZyBjbGllbnQsIGEgcmVxdWVzdFxuXHRcdCAqIG1heSBiZSBjYW5jZWxhYmxlLiBJZiBhIHJlcXVlc3QgbWF5IGJlIGNhbmNlbGVkLCB0aGUgY2xpZW50IHdpbGwgYWRkXG5cdFx0ICogYSBjYW5jZWxlZCBmbGFnIGFuZCBjYW5jZWwgZnVuY3Rpb24gdG8gdGhlIHJlcXVlc3Qgb2JqZWN0LiBDYW5jZWxpbmdcblx0XHQgKiB0aGUgcmVxdWVzdCB3aWxsIHB1dCB0aGUgcmVzcG9uc2UgaW50byBhbiBlcnJvciBzdGF0ZS5cblx0XHQgKlxuXHRcdCAqIEBmaWVsZCB7c3RyaW5nfSBbbWV0aG9kPSdHRVQnXSBIVFRQIG1ldGhvZCwgY29tbW9ubHkgR0VULCBQT1NULCBQVVQsIERFTEVURSBvciBIRUFEXG5cdFx0ICogQGZpZWxkIHtzdHJpbmd8VXJsQnVpbGRlcn0gW3BhdGg9JyddIHBhdGggdGVtcGxhdGUgd2l0aCBvcHRpb25hbCBwYXRoIHZhcmlhYmxlc1xuXHRcdCAqIEBmaWVsZCB7T2JqZWN0fSBbcGFyYW1zXSBwYXJhbWV0ZXJzIGZvciB0aGUgcGF0aCB0ZW1wbGF0ZSBhbmQgcXVlcnkgc3RyaW5nXG5cdFx0ICogQGZpZWxkIHtPYmplY3R9IFtoZWFkZXJzXSBjdXN0b20gSFRUUCBoZWFkZXJzIHRvIHNlbmQsIGluIGFkZGl0aW9uIHRvIHRoZSBjbGllbnRzIGRlZmF1bHQgaGVhZGVyc1xuXHRcdCAqIEBmaWVsZCBbZW50aXR5XSB0aGUgSFRUUCBlbnRpdHksIGNvbW1vbiBmb3IgUE9TVCBvciBQVVQgcmVxdWVzdHNcblx0XHQgKiBAZmllbGQge2Jvb2xlYW59IFtjYW5jZWxlZF0gdHJ1ZSBpZiB0aGUgcmVxdWVzdCBoYXMgYmVlbiBjYW5jZWxlZCwgc2V0IGJ5IHRoZSBjbGllbnRcblx0XHQgKiBAZmllbGQge0Z1bmN0aW9ufSBbY2FuY2VsXSBjYW5jZWxzIHRoZSByZXF1ZXN0IGlmIGludm9rZWQsIHByb3ZpZGVkIGJ5IHRoZSBjbGllbnRcblx0XHQgKiBAZmllbGQge0NsaWVudH0gW29yaWdpbmF0b3JdIHRoZSBjbGllbnQgdGhhdCBmaXJzdCBoYW5kbGVkIHRoaXMgcmVxdWVzdCwgcHJvdmlkZWQgYnkgdGhlIGludGVyY2VwdG9yXG5cdFx0ICpcblx0XHQgKiBAY2xhc3MgUmVxdWVzdFxuXHRcdCAqL1xuXG5cdFx0LyoqXG5cdFx0ICogUGxhaW4gSlMgT2JqZWN0IGNvbnRhaW5pbmcgcHJvcGVydGllcyB0aGF0IHJlcHJlc2VudCBhbiBIVFRQIHJlc3BvbnNlXG5cdFx0ICpcblx0XHQgKiBAZmllbGQge09iamVjdH0gW3JlcXVlc3RdIHRoZSByZXF1ZXN0IG9iamVjdCBhcyByZWNlaXZlZCBieSB0aGUgcm9vdCBjbGllbnRcblx0XHQgKiBAZmllbGQge09iamVjdH0gW3Jhd10gdGhlIHVuZGVybHlpbmcgcmVxdWVzdCBvYmplY3QsIGxpa2UgWG1sSHR0cFJlcXVlc3QgaW4gYSBicm93c2VyXG5cdFx0ICogQGZpZWxkIHtudW1iZXJ9IFtzdGF0dXMuY29kZV0gc3RhdHVzIGNvZGUgb2YgdGhlIHJlc3BvbnNlIChpLmUuIDIwMCwgNDA0KVxuXHRcdCAqIEBmaWVsZCB7c3RyaW5nfSBbc3RhdHVzLnRleHRdIHN0YXR1cyBwaHJhc2Ugb2YgdGhlIHJlc3BvbnNlXG5cdFx0ICogQGZpZWxkIHtPYmplY3RdIFtoZWFkZXJzXSByZXNwb25zZSBoZWFkZXJzIGhhc2ggb2Ygbm9ybWFsaXplZCBuYW1lLCB2YWx1ZSBwYWlyc1xuXHRcdCAqIEBmaWVsZCBbZW50aXR5XSB0aGUgcmVzcG9uc2UgYm9keVxuXHRcdCAqXG5cdFx0ICogQGNsYXNzIFJlc3BvbnNlXG5cdFx0ICovXG5cblx0XHQvKipcblx0XHQgKiBIVFRQIGNsaWVudCBwYXJ0aWN1bGFybHkgc3VpdGVkIGZvciBSRVNUZnVsIG9wZXJhdGlvbnMuXG5cdFx0ICpcblx0XHQgKiBAZmllbGQge2Z1bmN0aW9ufSB3cmFwIHdyYXBzIHRoaXMgY2xpZW50IHdpdGggYSBuZXcgaW50ZXJjZXB0b3IgcmV0dXJuaW5nIHRoZSB3cmFwcGVkIGNsaWVudFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtSZXF1ZXN0fSB0aGUgSFRUUCByZXF1ZXN0XG5cdFx0ICogQHJldHVybnMge1Jlc3BvbnNlUHJvbWlzZTxSZXNwb25zZT59IGEgcHJvbWlzZSB0aGUgcmVzb2x2ZXMgdG8gdGhlIEhUVFAgcmVzcG9uc2Vcblx0XHQgKlxuXHRcdCAqIEBjbGFzcyBDbGllbnRcblx0XHQgKi9cblxuXHRcdCAvKipcblx0XHQgICogRXh0ZW5kZWQgd2hlbi5qcyBQcm9taXNlcy9BKyBwcm9taXNlIHdpdGggSFRUUCBzcGVjaWZpYyBoZWxwZXJzXG5cdFx0ICAqcVxuXHRcdCAgKiBAbWV0aG9kIGVudGl0eSBwcm9taXNlIGZvciB0aGUgSFRUUCBlbnRpdHlcblx0XHQgICogQG1ldGhvZCBzdGF0dXMgcHJvbWlzZSBmb3IgdGhlIEhUVFAgc3RhdHVzIGNvZGVcblx0XHQgICogQG1ldGhvZCBoZWFkZXJzIHByb21pc2UgZm9yIHRoZSBIVFRQIHJlc3BvbnNlIGhlYWRlcnNcblx0XHQgICogQG1ldGhvZCBoZWFkZXIgcHJvbWlzZSBmb3IgYSBzcGVjaWZpYyBIVFRQIHJlc3BvbnNlIGhlYWRlclxuXHRcdCAgKlxuXHRcdCAgKiBAY2xhc3MgUmVzcG9uc2VQcm9taXNlXG5cdFx0ICAqIEBleHRlbmRzIFByb21pc2Vcblx0XHQgICovXG5cblx0XHR2YXIgY2xpZW50LCB0YXJnZXQsIHBsYXRmb3JtRGVmYXVsdDtcblxuXHRcdGNsaWVudCA9IHJlcXVpcmUoJy4uL2NsaWVudCcpO1xuXG5cdFx0LyoqXG5cdFx0ICogTWFrZSBhIHJlcXVlc3Qgd2l0aCB0aGUgZGVmYXVsdCBjbGllbnRcblx0XHQgKiBAcGFyYW0ge1JlcXVlc3R9IHRoZSBIVFRQIHJlcXVlc3Rcblx0XHQgKiBAcmV0dXJucyB7UHJvbWlzZTxSZXNwb25zZT59IGEgcHJvbWlzZSB0aGUgcmVzb2x2ZXMgdG8gdGhlIEhUVFAgcmVzcG9uc2Vcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBkZWZhdWx0Q2xpZW50KCkge1xuXHRcdFx0cmV0dXJuIHRhcmdldC5hcHBseSh1bmRlZiwgYXJndW1lbnRzKTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBDaGFuZ2UgdGhlIGRlZmF1bHQgY2xpZW50XG5cdFx0ICogQHBhcmFtIHtDbGllbnR9IGNsaWVudCB0aGUgbmV3IGRlZmF1bHQgY2xpZW50XG5cdFx0ICovXG5cdFx0ZGVmYXVsdENsaWVudC5zZXREZWZhdWx0Q2xpZW50ID0gZnVuY3Rpb24gc2V0RGVmYXVsdENsaWVudChjbGllbnQpIHtcblx0XHRcdHRhcmdldCA9IGNsaWVudDtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogT2J0YWluIGEgZGlyZWN0IHJlZmVyZW5jZSB0byB0aGUgY3VycmVudCBkZWZhdWx0IGNsaWVudFxuXHRcdCAqIEByZXR1cm5zIHtDbGllbnR9IHRoZSBkZWZhdWx0IGNsaWVudFxuXHRcdCAqL1xuXHRcdGRlZmF1bHRDbGllbnQuZ2V0RGVmYXVsdENsaWVudCA9IGZ1bmN0aW9uIGdldERlZmF1bHRDbGllbnQoKSB7XG5cdFx0XHRyZXR1cm4gdGFyZ2V0O1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBSZXNldCB0aGUgZGVmYXVsdCBjbGllbnQgdG8gdGhlIHBsYXRmb3JtIGRlZmF1bHRcblx0XHQgKi9cblx0XHRkZWZhdWx0Q2xpZW50LnJlc2V0RGVmYXVsdENsaWVudCA9IGZ1bmN0aW9uIHJlc2V0RGVmYXVsdENsaWVudCgpIHtcblx0XHRcdHRhcmdldCA9IHBsYXRmb3JtRGVmYXVsdDtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogQHByaXZhdGVcblx0XHQgKi9cblx0XHRkZWZhdWx0Q2xpZW50LnNldFBsYXRmb3JtRGVmYXVsdENsaWVudCA9IGZ1bmN0aW9uIHNldFBsYXRmb3JtRGVmYXVsdENsaWVudChjbGllbnQpIHtcblx0XHRcdGlmIChwbGF0Zm9ybURlZmF1bHQpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gcmVkZWZpbmUgcGxhdGZvcm1EZWZhdWx0Q2xpZW50Jyk7XG5cdFx0XHR9XG5cdFx0XHR0YXJnZXQgPSBwbGF0Zm9ybURlZmF1bHQgPSBjbGllbnQ7XG5cdFx0fTtcblxuXHRcdHJldHVybiBjbGllbnQoZGVmYXVsdENsaWVudCk7XG5cblx0fSk7XG5cbn0oXG5cdHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZSA6IGZ1bmN0aW9uIChmYWN0b3J5KSB7IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKTsgfVxuXHQvLyBCb2lsZXJwbGF0ZSBmb3IgQU1EIGFuZCBOb2RlXG4pKTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE0IHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuICogQGxpY2Vuc2UgTUlULCBzZWUgTElDRU5TRS50eHQgZm9yIGRldGFpbHNcbiAqXG4gKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiAqL1xuXG4oZnVuY3Rpb24gKGRlZmluZSwgZ2xvYmFsKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRkZWZpbmUoZnVuY3Rpb24gKHJlcXVpcmUpIHtcblxuXHRcdHZhciB3aGVuLCBVcmxCdWlsZGVyLCBub3JtYWxpemVIZWFkZXJOYW1lLCByZXNwb25zZVByb21pc2UsIGNsaWVudCwgaGVhZGVyU3BsaXRSRTtcblxuXHRcdHdoZW4gPSByZXF1aXJlKCd3aGVuJyk7XG5cdFx0VXJsQnVpbGRlciA9IHJlcXVpcmUoJy4uL1VybEJ1aWxkZXInKTtcblx0XHRub3JtYWxpemVIZWFkZXJOYW1lID0gcmVxdWlyZSgnLi4vdXRpbC9ub3JtYWxpemVIZWFkZXJOYW1lJyk7XG5cdFx0cmVzcG9uc2VQcm9taXNlID0gcmVxdWlyZSgnLi4vdXRpbC9yZXNwb25zZVByb21pc2UnKTtcblx0XHRjbGllbnQgPSByZXF1aXJlKCcuLi9jbGllbnQnKTtcblxuXHRcdC8vIGFjY29yZGluZyB0byB0aGUgc3BlYywgdGhlIGxpbmUgYnJlYWsgaXMgJ1xcclxcbicsIGJ1dCBkb2Vzbid0IGhvbGQgdHJ1ZSBpbiBwcmFjdGljZVxuXHRcdGhlYWRlclNwbGl0UkUgPSAvW1xccnxcXG5dKy87XG5cblx0XHRmdW5jdGlvbiBwYXJzZUhlYWRlcnMocmF3KSB7XG5cdFx0XHQvLyBOb3RlOiBTZXQtQ29va2llIHdpbGwgYmUgcmVtb3ZlZCBieSB0aGUgYnJvd3NlclxuXHRcdFx0dmFyIGhlYWRlcnMgPSB7fTtcblxuXHRcdFx0aWYgKCFyYXcpIHsgcmV0dXJuIGhlYWRlcnM7IH1cblxuXHRcdFx0cmF3LnRyaW0oKS5zcGxpdChoZWFkZXJTcGxpdFJFKS5mb3JFYWNoKGZ1bmN0aW9uIChoZWFkZXIpIHtcblx0XHRcdFx0dmFyIGJvdW5kYXJ5LCBuYW1lLCB2YWx1ZTtcblx0XHRcdFx0Ym91bmRhcnkgPSBoZWFkZXIuaW5kZXhPZignOicpO1xuXHRcdFx0XHRuYW1lID0gbm9ybWFsaXplSGVhZGVyTmFtZShoZWFkZXIuc3Vic3RyaW5nKDAsIGJvdW5kYXJ5KS50cmltKCkpO1xuXHRcdFx0XHR2YWx1ZSA9IGhlYWRlci5zdWJzdHJpbmcoYm91bmRhcnkgKyAxKS50cmltKCk7XG5cdFx0XHRcdGlmIChoZWFkZXJzW25hbWVdKSB7XG5cdFx0XHRcdFx0aWYgKEFycmF5LmlzQXJyYXkoaGVhZGVyc1tuYW1lXSkpIHtcblx0XHRcdFx0XHRcdC8vIGFkZCB0byBhbiBleGlzdGluZyBhcnJheVxuXHRcdFx0XHRcdFx0aGVhZGVyc1tuYW1lXS5wdXNoKHZhbHVlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHQvLyBjb252ZXJ0IHNpbmdsZSB2YWx1ZSB0byBhcnJheVxuXHRcdFx0XHRcdFx0aGVhZGVyc1tuYW1lXSA9IFtoZWFkZXJzW25hbWVdLCB2YWx1ZV07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdC8vIG5ldywgc2luZ2xlIHZhbHVlXG5cdFx0XHRcdFx0aGVhZGVyc1tuYW1lXSA9IHZhbHVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIGhlYWRlcnM7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc2FmZU1peGluKHRhcmdldCwgc291cmNlKSB7XG5cdFx0XHRPYmplY3Qua2V5cyhzb3VyY2UgfHwge30pLmZvckVhY2goZnVuY3Rpb24gKHByb3ApIHtcblx0XHRcdFx0Ly8gbWFrZSBzdXJlIHRoZSBwcm9wZXJ0eSBhbHJlYWR5IGV4aXN0cyBhc1xuXHRcdFx0XHQvLyBJRSA2IHdpbGwgYmxvdyB1cCBpZiB3ZSBhZGQgYSBuZXcgcHJvcFxuXHRcdFx0XHRpZiAoc291cmNlLmhhc093blByb3BlcnR5KHByb3ApICYmIHByb3AgaW4gdGFyZ2V0KSB7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y2F0Y2ggKGUpIHtcblx0XHRcdFx0XHRcdC8vIGlnbm9yZSwgZXhwZWN0ZWQgZm9yIHNvbWUgcHJvcGVydGllcyBhdCBzb21lIHBvaW50cyBpbiB0aGUgcmVxdWVzdCBsaWZlY3ljbGVcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm4gdGFyZ2V0O1xuXHRcdH1cblxuXHRcdHJldHVybiBjbGllbnQoZnVuY3Rpb24geGhyKHJlcXVlc3QpIHtcblx0XHRcdHJldHVybiByZXNwb25zZVByb21pc2UucHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdFx0XHRcdC8qanNoaW50IG1heGNvbXBsZXhpdHk6MjAgKi9cblxuXHRcdFx0XHR2YXIgY2xpZW50LCBtZXRob2QsIHVybCwgaGVhZGVycywgZW50aXR5LCBoZWFkZXJOYW1lLCByZXNwb25zZSwgWE1MSHR0cFJlcXVlc3Q7XG5cblx0XHRcdFx0cmVxdWVzdCA9IHR5cGVvZiByZXF1ZXN0ID09PSAnc3RyaW5nJyA/IHsgcGF0aDogcmVxdWVzdCB9IDogcmVxdWVzdCB8fCB7fTtcblx0XHRcdFx0cmVzcG9uc2UgPSB7IHJlcXVlc3Q6IHJlcXVlc3QgfTtcblxuXHRcdFx0XHRpZiAocmVxdWVzdC5jYW5jZWxlZCkge1xuXHRcdFx0XHRcdHJlc3BvbnNlLmVycm9yID0gJ3ByZWNhbmNlbGVkJztcblx0XHRcdFx0XHRyZWplY3QocmVzcG9uc2UpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGVudGl0eSA9IHJlcXVlc3QuZW50aXR5O1xuXHRcdFx0XHRyZXF1ZXN0Lm1ldGhvZCA9IHJlcXVlc3QubWV0aG9kIHx8IChlbnRpdHkgPyAnUE9TVCcgOiAnR0VUJyk7XG5cdFx0XHRcdG1ldGhvZCA9IHJlcXVlc3QubWV0aG9kO1xuXHRcdFx0XHR1cmwgPSByZXNwb25zZS51cmwgPSBuZXcgVXJsQnVpbGRlcihyZXF1ZXN0LnBhdGggfHwgJycsIHJlcXVlc3QucGFyYW1zKS5idWlsZCgpO1xuXG5cdFx0XHRcdFhNTEh0dHBSZXF1ZXN0ID0gcmVxdWVzdC5lbmdpbmUgfHwgZ2xvYmFsLlhNTEh0dHBSZXF1ZXN0O1xuXHRcdFx0XHRpZiAoIVhNTEh0dHBSZXF1ZXN0KSB7XG5cdFx0XHRcdFx0cmVqZWN0KHsgcmVxdWVzdDogcmVxdWVzdCwgdXJsOiB1cmwsIGVycm9yOiAneGhyLW5vdC1hdmFpbGFibGUnIH0pO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0Y2xpZW50ID0gcmVzcG9uc2UucmF3ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cblx0XHRcdFx0XHQvLyBtaXhpbiBleHRyYSByZXF1ZXN0IHByb3BlcnRpZXMgYmVmb3JlIGFuZCBhZnRlciBvcGVuaW5nIHRoZSByZXF1ZXN0IGFzIHNvbWUgcHJvcGVydGllcyByZXF1aXJlIGJlaW5nIHNldCBhdCBkaWZmZXJlbnQgcGhhc2VzIG9mIHRoZSByZXF1ZXN0XG5cdFx0XHRcdFx0c2FmZU1peGluKGNsaWVudCwgcmVxdWVzdC5taXhpbik7XG5cdFx0XHRcdFx0Y2xpZW50Lm9wZW4obWV0aG9kLCB1cmwsIHRydWUpO1xuXHRcdFx0XHRcdHNhZmVNaXhpbihjbGllbnQsIHJlcXVlc3QubWl4aW4pO1xuXG5cdFx0XHRcdFx0aGVhZGVycyA9IHJlcXVlc3QuaGVhZGVycztcblx0XHRcdFx0XHRmb3IgKGhlYWRlck5hbWUgaW4gaGVhZGVycykge1xuXHRcdFx0XHRcdFx0Lypqc2hpbnQgZm9yaW46ZmFsc2UgKi9cblx0XHRcdFx0XHRcdGlmIChoZWFkZXJOYW1lID09PSAnQ29udGVudC1UeXBlJyAmJiBoZWFkZXJzW2hlYWRlck5hbWVdID09PSAnbXVsdGlwYXJ0L2Zvcm0tZGF0YScpIHtcblx0XHRcdFx0XHRcdFx0Ly8gWE1MSHR0cFJlcXVlc3QgZ2VuZXJhdGVzIGl0cyBvd24gQ29udGVudC1UeXBlIGhlYWRlciB3aXRoIHRoZVxuXHRcdFx0XHRcdFx0XHQvLyBhcHByb3ByaWF0ZSBtdWx0aXBhcnQgYm91bmRhcnkgd2hlbiBzZW5kaW5nIG11bHRpcGFydC9mb3JtLWRhdGEuXG5cdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRjbGllbnQuc2V0UmVxdWVzdEhlYWRlcihoZWFkZXJOYW1lLCBoZWFkZXJzW2hlYWRlck5hbWVdKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRyZXF1ZXN0LmNhbmNlbGVkID0gZmFsc2U7XG5cdFx0XHRcdFx0cmVxdWVzdC5jYW5jZWwgPSBmdW5jdGlvbiBjYW5jZWwoKSB7XG5cdFx0XHRcdFx0XHRyZXF1ZXN0LmNhbmNlbGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRcdGNsaWVudC5hYm9ydCgpO1xuXHRcdFx0XHRcdFx0cmVqZWN0KHJlc3BvbnNlKTtcblx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0Y2xpZW50Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgvKiBlICovKSB7XG5cdFx0XHRcdFx0XHRpZiAocmVxdWVzdC5jYW5jZWxlZCkgeyByZXR1cm47IH1cblx0XHRcdFx0XHRcdGlmIChjbGllbnQucmVhZHlTdGF0ZSA9PT0gKFhNTEh0dHBSZXF1ZXN0LkRPTkUgfHwgNCkpIHtcblx0XHRcdFx0XHRcdFx0cmVzcG9uc2Uuc3RhdHVzID0ge1xuXHRcdFx0XHRcdFx0XHRcdGNvZGU6IGNsaWVudC5zdGF0dXMsXG5cdFx0XHRcdFx0XHRcdFx0dGV4dDogY2xpZW50LnN0YXR1c1RleHRcblx0XHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdFx0cmVzcG9uc2UuaGVhZGVycyA9IHBhcnNlSGVhZGVycyhjbGllbnQuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkpO1xuXHRcdFx0XHRcdFx0XHRyZXNwb25zZS5lbnRpdHkgPSBjbGllbnQucmVzcG9uc2VUZXh0O1xuXG5cdFx0XHRcdFx0XHRcdGlmIChyZXNwb25zZS5zdGF0dXMuY29kZSA+IDApIHtcblx0XHRcdFx0XHRcdFx0XHQvLyBjaGVjayBzdGF0dXMgY29kZSBhcyByZWFkeXN0YXRlY2hhbmdlIGZpcmVzIGJlZm9yZSBlcnJvciBldmVudFxuXHRcdFx0XHRcdFx0XHRcdHJlc29sdmUocmVzcG9uc2UpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdC8vIGdpdmUgdGhlIGVycm9yIGNhbGxiYWNrIGEgY2hhbmNlIHRvIGZpcmUgYmVmb3JlIHJlc29sdmluZ1xuXHRcdFx0XHRcdFx0XHRcdC8vIHJlcXVlc3RzIGZvciBmaWxlOi8vIFVSTHMgZG8gbm90IGhhdmUgYSBzdGF0dXMgY29kZVxuXHRcdFx0XHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0cmVzb2x2ZShyZXNwb25zZSk7XG5cdFx0XHRcdFx0XHRcdFx0fSwgMCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGNsaWVudC5vbmVycm9yID0gZnVuY3Rpb24gKC8qIGUgKi8pIHtcblx0XHRcdFx0XHRcdFx0cmVzcG9uc2UuZXJyb3IgPSAnbG9hZGVycm9yJztcblx0XHRcdFx0XHRcdFx0cmVqZWN0KHJlc3BvbnNlKTtcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNhdGNoIChlKSB7XG5cdFx0XHRcdFx0XHQvLyBJRSA2IHdpbGwgbm90IHN1cHBvcnQgZXJyb3IgaGFuZGxpbmdcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRjbGllbnQuc2VuZChlbnRpdHkpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNhdGNoIChlKSB7XG5cdFx0XHRcdFx0cmVzcG9uc2UuZXJyb3IgPSAnbG9hZGVycm9yJztcblx0XHRcdFx0XHRyZWplY3QocmVzcG9uc2UpO1xuXHRcdFx0XHR9XG5cblx0XHRcdH0pO1xuXHRcdH0pO1xuXG5cdH0pO1xuXG59KFxuXHR0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUgOiBmdW5jdGlvbiAoZmFjdG9yeSkgeyBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSk7IH0sXG5cdHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDogdm9pZCAwXG5cdC8vIEJvaWxlcnBsYXRlIGZvciBBTUQgYW5kIE5vZGVcbikpO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDEyLTIwMTUgdGhlIG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzXG4gKiBAbGljZW5zZSBNSVQsIHNlZSBMSUNFTlNFLnR4dCBmb3IgZGV0YWlsc1xuICpcbiAqIEBhdXRob3IgU2NvdHQgQW5kcmV3c1xuICovXG5cbihmdW5jdGlvbiAoZGVmaW5lKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRkZWZpbmUoZnVuY3Rpb24gKHJlcXVpcmUpIHtcblxuXHRcdHZhciBkZWZhdWx0Q2xpZW50LCBtaXhpbiwgcmVzcG9uc2VQcm9taXNlLCBjbGllbnQsIHdoZW47XG5cblx0XHRkZWZhdWx0Q2xpZW50ID0gcmVxdWlyZSgnLi9jbGllbnQvZGVmYXVsdCcpO1xuXHRcdG1peGluID0gcmVxdWlyZSgnLi91dGlsL21peGluJyk7XG5cdFx0cmVzcG9uc2VQcm9taXNlID0gcmVxdWlyZSgnLi91dGlsL3Jlc3BvbnNlUHJvbWlzZScpO1xuXHRcdGNsaWVudCA9IHJlcXVpcmUoJy4vY2xpZW50Jyk7XG5cdFx0d2hlbiA9IHJlcXVpcmUoJ3doZW4nKTtcblxuXHRcdC8qKlxuXHRcdCAqIEludGVyY2VwdG9ycyBoYXZlIHRoZSBhYmlsaXR5IHRvIGludGVyY2VwdCB0aGUgcmVxdWVzdCBhbmQvb3JnIHJlc3BvbnNlXG5cdFx0ICogb2JqZWN0cy4gIFRoZXkgbWF5IGF1Z21lbnQsIHBydW5lLCB0cmFuc2Zvcm0gb3IgcmVwbGFjZSB0aGVcblx0XHQgKiByZXF1ZXN0L3Jlc3BvbnNlIGFzIG5lZWRlZC4gIENsaWVudHMgbWF5IGJlIGNvbXBvc2VkIGJ5IHdyYXBwaW5nXG5cdFx0ICogdG9nZXRoZXIgbXVsdGlwbGUgaW50ZXJjZXB0b3JzLlxuXHRcdCAqXG5cdFx0ICogQ29uZmlndXJlZCBpbnRlcmNlcHRvcnMgYXJlIGZ1bmN0aW9uYWwgaW4gbmF0dXJlLiAgV3JhcHBpbmcgYSBjbGllbnQgaW5cblx0XHQgKiBhbiBpbnRlcmNlcHRvciB3aWxsIG5vdCBhZmZlY3QgdGhlIGNsaWVudCwgbWVyZWx5IHRoZSBkYXRhIHRoYXQgZmxvd3MgaW5cblx0XHQgKiBhbmQgb3V0IG9mIHRoYXQgY2xpZW50LiAgQSBjb21tb24gY29uZmlndXJhdGlvbiBjYW4gYmUgY3JlYXRlZCBvbmNlIGFuZFxuXHRcdCAqIHNoYXJlZDsgc3BlY2lhbGl6YXRpb24gY2FuIGJlIGNyZWF0ZWQgYnkgZnVydGhlciB3cmFwcGluZyB0aGF0IGNsaWVudFxuXHRcdCAqIHdpdGggY3VzdG9tIGludGVyY2VwdG9ycy5cblx0XHQgKlxuXHRcdCAqIEBwYXJhbSB7Q2xpZW50fSBbdGFyZ2V0XSBjbGllbnQgdG8gd3JhcFxuXHRcdCAqIEBwYXJhbSB7T2JqZWN0fSBbY29uZmlnXSBjb25maWd1cmF0aW9uIGZvciB0aGUgaW50ZXJjZXB0b3IsIHByb3BlcnRpZXMgd2lsbCBiZSBzcGVjaWZpYyB0byB0aGUgaW50ZXJjZXB0b3IgaW1wbGVtZW50YXRpb25cblx0XHQgKiBAcmV0dXJucyB7Q2xpZW50fSBBIGNsaWVudCB3cmFwcGVkIHdpdGggdGhlIGludGVyY2VwdG9yXG5cdFx0ICpcblx0XHQgKiBAY2xhc3MgSW50ZXJjZXB0b3Jcblx0XHQgKi9cblxuXHRcdGZ1bmN0aW9uIGRlZmF1bHRJbml0SGFuZGxlcihjb25maWcpIHtcblx0XHRcdHJldHVybiBjb25maWc7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZGVmYXVsdFJlcXVlc3RIYW5kbGVyKHJlcXVlc3QgLyosIGNvbmZpZywgbWV0YSAqLykge1xuXHRcdFx0cmV0dXJuIHJlcXVlc3Q7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZGVmYXVsdFJlc3BvbnNlSGFuZGxlcihyZXNwb25zZSAvKiwgY29uZmlnLCBtZXRhICovKSB7XG5cdFx0XHRyZXR1cm4gcmVzcG9uc2U7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcmFjZShwcm9taXNlc09yVmFsdWVzKSB7XG5cdFx0XHQvLyB0aGlzIGZ1bmN0aW9uIGlzIGRpZmZlcmVudCB0aGFuIHdoZW4uYW55IGFzIHRoZSBmaXJzdCB0byByZWplY3QgYWxzbyB3aW5zXG5cdFx0XHRyZXR1cm4gd2hlbi5wcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0XHRcdFx0cHJvbWlzZXNPclZhbHVlcy5mb3JFYWNoKGZ1bmN0aW9uIChwcm9taXNlT3JWYWx1ZSkge1xuXHRcdFx0XHRcdHdoZW4ocHJvbWlzZU9yVmFsdWUsIHJlc29sdmUsIHJlamVjdCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogQWx0ZXJuYXRlIHJldHVybiB0eXBlIGZvciB0aGUgcmVxdWVzdCBoYW5kbGVyIHRoYXQgYWxsb3dzIGZvciBtb3JlIGNvbXBsZXggaW50ZXJhY3Rpb25zLlxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHByb3BlcnRpZXMucmVxdWVzdCB0aGUgdHJhZGl0aW9uYWwgcmVxdWVzdCByZXR1cm4gb2JqZWN0XG5cdFx0ICogQHBhcmFtIHtQcm9taXNlfSBbcHJvcGVydGllcy5hYm9ydF0gcHJvbWlzZSB0aGF0IHJlc29sdmVzIGlmL3doZW4gdGhlIHJlcXVlc3QgaXMgYWJvcnRlZFxuXHRcdCAqIEBwYXJhbSB7Q2xpZW50fSBbcHJvcGVydGllcy5jbGllbnRdIG92ZXJyaWRlIHRoZSBkZWZpbmVkIGNsaWVudCB3aXRoIGFuIGFsdGVybmF0ZSBjbGllbnRcblx0XHQgKiBAcGFyYW0gW3Byb3BlcnRpZXMucmVzcG9uc2VdIHJlc3BvbnNlIGZvciB0aGUgcmVxdWVzdCwgc2hvcnQgY2lyY3VpdCB0aGUgcmVxdWVzdFxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIENvbXBsZXhSZXF1ZXN0KHByb3BlcnRpZXMpIHtcblx0XHRcdGlmICghKHRoaXMgaW5zdGFuY2VvZiBDb21wbGV4UmVxdWVzdCkpIHtcblx0XHRcdFx0Ly8gaW4gY2FzZSB1c2VycyBmb3JnZXQgdGhlICduZXcnIGRvbid0IG1peCBpbnRvIHRoZSBpbnRlcmNlcHRvclxuXHRcdFx0XHRyZXR1cm4gbmV3IENvbXBsZXhSZXF1ZXN0KHByb3BlcnRpZXMpO1xuXHRcdFx0fVxuXHRcdFx0bWl4aW4odGhpcywgcHJvcGVydGllcyk7XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogQ3JlYXRlIGEgbmV3IGludGVyY2VwdG9yIGZvciB0aGUgcHJvdmlkZWQgaGFuZGxlcnMuXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbaGFuZGxlcnMuaW5pdF0gb25lIHRpbWUgaW50aWFsaXphdGlvbiwgbXVzdCByZXR1cm4gdGhlIGNvbmZpZyBvYmplY3Rcblx0XHQgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbaGFuZGxlcnMucmVxdWVzdF0gcmVxdWVzdCBoYW5kbGVyXG5cdFx0ICogQHBhcmFtIHtGdW5jdGlvbn0gW2hhbmRsZXJzLnJlc3BvbnNlXSByZXNwb25zZSBoYW5kbGVyIHJlZ2FyZGxlc3Mgb2YgZXJyb3Igc3RhdGVcblx0XHQgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbaGFuZGxlcnMuc3VjY2Vzc10gcmVzcG9uc2UgaGFuZGxlciB3aGVuIHRoZSByZXF1ZXN0IGlzIG5vdCBpbiBlcnJvclxuXHRcdCAqIEBwYXJhbSB7RnVuY3Rpb259IFtoYW5kbGVycy5lcnJvcl0gcmVzcG9uc2UgaGFuZGxlciB3aGVuIHRoZSByZXF1ZXN0IGlzIGluIGVycm9yLCBtYXkgYmUgdXNlZCB0byAndW5yZWplY3QnIGFuIGVycm9yIHN0YXRlXG5cdFx0ICogQHBhcmFtIHtGdW5jdGlvbn0gW2hhbmRsZXJzLmNsaWVudF0gdGhlIGNsaWVudCB0byB1c2UgaWYgb3RoZXJ3aXNlIG5vdCBzcGVjaWZpZWQsIGRlZmF1bHRzIHRvIHBsYXRmb3JtIGRlZmF1bHQgY2xpZW50XG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7SW50ZXJjZXB0b3J9XG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gaW50ZXJjZXB0b3IoaGFuZGxlcnMpIHtcblxuXHRcdFx0dmFyIGluaXRIYW5kbGVyLCByZXF1ZXN0SGFuZGxlciwgc3VjY2Vzc1Jlc3BvbnNlSGFuZGxlciwgZXJyb3JSZXNwb25zZUhhbmRsZXI7XG5cblx0XHRcdGhhbmRsZXJzID0gaGFuZGxlcnMgfHwge307XG5cblx0XHRcdGluaXRIYW5kbGVyICAgICAgICAgICAgPSBoYW5kbGVycy5pbml0ICAgIHx8IGRlZmF1bHRJbml0SGFuZGxlcjtcblx0XHRcdHJlcXVlc3RIYW5kbGVyICAgICAgICAgPSBoYW5kbGVycy5yZXF1ZXN0IHx8IGRlZmF1bHRSZXF1ZXN0SGFuZGxlcjtcblx0XHRcdHN1Y2Nlc3NSZXNwb25zZUhhbmRsZXIgPSBoYW5kbGVycy5zdWNjZXNzIHx8IGhhbmRsZXJzLnJlc3BvbnNlIHx8IGRlZmF1bHRSZXNwb25zZUhhbmRsZXI7XG5cdFx0XHRlcnJvclJlc3BvbnNlSGFuZGxlciAgID0gaGFuZGxlcnMuZXJyb3IgICB8fCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdC8vIFByb3BhZ2F0ZSB0aGUgcmVqZWN0aW9uLCB3aXRoIHRoZSByZXN1bHQgb2YgdGhlIGhhbmRsZXJcblx0XHRcdFx0cmV0dXJuIHdoZW4oKGhhbmRsZXJzLnJlc3BvbnNlIHx8IGRlZmF1bHRSZXNwb25zZUhhbmRsZXIpLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyksIHdoZW4ucmVqZWN0LCB3aGVuLnJlamVjdCk7XG5cdFx0XHR9O1xuXG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwgY29uZmlnKSB7XG5cblx0XHRcdFx0aWYgKHR5cGVvZiB0YXJnZXQgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdFx0Y29uZmlnID0gdGFyZ2V0O1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICh0eXBlb2YgdGFyZ2V0ICE9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdFx0dGFyZ2V0ID0gaGFuZGxlcnMuY2xpZW50IHx8IGRlZmF1bHRDbGllbnQ7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25maWcgPSBpbml0SGFuZGxlcihjb25maWcgfHwge30pO1xuXG5cdFx0XHRcdGZ1bmN0aW9uIGludGVyY2VwdGVkQ2xpZW50KHJlcXVlc3QpIHtcblx0XHRcdFx0XHR2YXIgY29udGV4dCwgbWV0YTtcblx0XHRcdFx0XHRjb250ZXh0ID0ge307XG5cdFx0XHRcdFx0bWV0YSA9IHsgJ2FyZ3VtZW50cyc6IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyksIGNsaWVudDogaW50ZXJjZXB0ZWRDbGllbnQgfTtcblx0XHRcdFx0XHRyZXF1ZXN0ID0gdHlwZW9mIHJlcXVlc3QgPT09ICdzdHJpbmcnID8geyBwYXRoOiByZXF1ZXN0IH0gOiByZXF1ZXN0IHx8IHt9O1xuXHRcdFx0XHRcdHJlcXVlc3Qub3JpZ2luYXRvciA9IHJlcXVlc3Qub3JpZ2luYXRvciB8fCBpbnRlcmNlcHRlZENsaWVudDtcblx0XHRcdFx0XHRyZXR1cm4gcmVzcG9uc2VQcm9taXNlKFxuXHRcdFx0XHRcdFx0cmVxdWVzdEhhbmRsZXIuY2FsbChjb250ZXh0LCByZXF1ZXN0LCBjb25maWcsIG1ldGEpLFxuXHRcdFx0XHRcdFx0ZnVuY3Rpb24gKHJlcXVlc3QpIHtcblx0XHRcdFx0XHRcdFx0dmFyIHJlc3BvbnNlLCBhYm9ydCwgbmV4dDtcblx0XHRcdFx0XHRcdFx0bmV4dCA9IHRhcmdldDtcblx0XHRcdFx0XHRcdFx0aWYgKHJlcXVlc3QgaW5zdGFuY2VvZiBDb21wbGV4UmVxdWVzdCkge1xuXHRcdFx0XHRcdFx0XHRcdC8vIHVucGFjayByZXF1ZXN0XG5cdFx0XHRcdFx0XHRcdFx0YWJvcnQgPSByZXF1ZXN0LmFib3J0O1xuXHRcdFx0XHRcdFx0XHRcdG5leHQgPSByZXF1ZXN0LmNsaWVudCB8fCBuZXh0O1xuXHRcdFx0XHRcdFx0XHRcdHJlc3BvbnNlID0gcmVxdWVzdC5yZXNwb25zZTtcblx0XHRcdFx0XHRcdFx0XHQvLyBub3JtYWxpemUgcmVxdWVzdCwgbXVzdCBiZSBsYXN0XG5cdFx0XHRcdFx0XHRcdFx0cmVxdWVzdCA9IHJlcXVlc3QucmVxdWVzdDtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRyZXNwb25zZSA9IHJlc3BvbnNlIHx8IHdoZW4ocmVxdWVzdCwgZnVuY3Rpb24gKHJlcXVlc3QpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gd2hlbihcblx0XHRcdFx0XHRcdFx0XHRcdG5leHQocmVxdWVzdCksXG5cdFx0XHRcdFx0XHRcdFx0XHRmdW5jdGlvbiAocmVzcG9uc2UpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHN1Y2Nlc3NSZXNwb25zZUhhbmRsZXIuY2FsbChjb250ZXh0LCByZXNwb25zZSwgY29uZmlnLCBtZXRhKTtcblx0XHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0XHRmdW5jdGlvbiAocmVzcG9uc2UpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGVycm9yUmVzcG9uc2VIYW5kbGVyLmNhbGwoY29udGV4dCwgcmVzcG9uc2UsIGNvbmZpZywgbWV0YSk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBhYm9ydCA/IHJhY2UoW3Jlc3BvbnNlLCBhYm9ydF0pIDogcmVzcG9uc2U7XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0ZnVuY3Rpb24gKGVycm9yKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB3aGVuLnJlamVjdCh7IHJlcXVlc3Q6IHJlcXVlc3QsIGVycm9yOiBlcnJvciB9KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHQpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIGNsaWVudChpbnRlcmNlcHRlZENsaWVudCwgdGFyZ2V0KTtcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aW50ZXJjZXB0b3IuQ29tcGxleFJlcXVlc3QgPSBDb21wbGV4UmVxdWVzdDtcblxuXHRcdHJldHVybiBpbnRlcmNlcHRvcjtcblxuXHR9KTtcblxufShcblx0dHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lIDogZnVuY3Rpb24gKGZhY3RvcnkpIHsgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUpOyB9XG5cdC8vIEJvaWxlcnBsYXRlIGZvciBBTUQgYW5kIE5vZGVcbikpO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDEzIHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuICogQGxpY2Vuc2UgTUlULCBzZWUgTElDRU5TRS50eHQgZm9yIGRldGFpbHNcbiAqXG4gKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiAqL1xuXG4oZnVuY3Rpb24gKGRlZmluZSkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0ZGVmaW5lKGZ1bmN0aW9uIChyZXF1aXJlKSB7XG5cblx0XHR2YXIgaW50ZXJjZXB0b3IsIG1peGluVXRpbCwgZGVmYXVsdGVyO1xuXG5cdFx0aW50ZXJjZXB0b3IgPSByZXF1aXJlKCcuLi9pbnRlcmNlcHRvcicpO1xuXHRcdG1peGluVXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwvbWl4aW4nKTtcblxuXHRcdGRlZmF1bHRlciA9IChmdW5jdGlvbiAoKSB7XG5cblx0XHRcdGZ1bmN0aW9uIG1peGluKHByb3AsIHRhcmdldCwgZGVmYXVsdHMpIHtcblx0XHRcdFx0aWYgKHByb3AgaW4gdGFyZ2V0IHx8IHByb3AgaW4gZGVmYXVsdHMpIHtcblx0XHRcdFx0XHR0YXJnZXRbcHJvcF0gPSBtaXhpblV0aWwoe30sIGRlZmF1bHRzW3Byb3BdLCB0YXJnZXRbcHJvcF0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGZ1bmN0aW9uIGNvcHkocHJvcCwgdGFyZ2V0LCBkZWZhdWx0cykge1xuXHRcdFx0XHRpZiAocHJvcCBpbiBkZWZhdWx0cyAmJiAhKHByb3AgaW4gdGFyZ2V0KSkge1xuXHRcdFx0XHRcdHRhcmdldFtwcm9wXSA9IGRlZmF1bHRzW3Byb3BdO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHZhciBtYXBwaW5ncyA9IHtcblx0XHRcdFx0bWV0aG9kOiBjb3B5LFxuXHRcdFx0XHRwYXRoOiBjb3B5LFxuXHRcdFx0XHRwYXJhbXM6IG1peGluLFxuXHRcdFx0XHRoZWFkZXJzOiBtaXhpbixcblx0XHRcdFx0ZW50aXR5OiBjb3B5LFxuXHRcdFx0XHRtaXhpbjogbWl4aW5cblx0XHRcdH07XG5cblx0XHRcdHJldHVybiBmdW5jdGlvbiAodGFyZ2V0LCBkZWZhdWx0cykge1xuXHRcdFx0XHRmb3IgKHZhciBwcm9wIGluIG1hcHBpbmdzKSB7XG5cdFx0XHRcdFx0Lypqc2hpbnQgZm9yaW46IGZhbHNlICovXG5cdFx0XHRcdFx0bWFwcGluZ3NbcHJvcF0ocHJvcCwgdGFyZ2V0LCBkZWZhdWx0cyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHRhcmdldDtcblx0XHRcdH07XG5cblx0XHR9KCkpO1xuXG5cdFx0LyoqXG5cdFx0ICogUHJvdmlkZSBkZWZhdWx0IHZhbHVlcyBmb3IgYSByZXF1ZXN0LiBUaGVzZSB2YWx1ZXMgd2lsbCBiZSBhcHBsaWVkIHRvIHRoZVxuXHRcdCAqIHJlcXVlc3QgaWYgdGhlIHJlcXVlc3Qgb2JqZWN0IGRvZXMgbm90IGFscmVhZHkgY29udGFpbiBhbiBleHBsaWNpdCB2YWx1ZS5cblx0XHQgKlxuXHRcdCAqIEZvciAncGFyYW1zJywgJ2hlYWRlcnMnLCBhbmQgJ21peGluJywgaW5kaXZpZHVhbCB2YWx1ZXMgYXJlIG1peGVkIGluIHdpdGggdGhlXG5cdFx0ICogcmVxdWVzdCdzIHZhbHVlcy4gVGhlIHJlc3VsdCBpcyBhIG5ldyBvYmplY3QgcmVwcmVzZW50aWluZyB0aGUgY29tYmluZWRcblx0XHQgKiByZXF1ZXN0IGFuZCBjb25maWcgdmFsdWVzLiBOZWl0aGVyIGlucHV0IG9iamVjdCBpcyBtdXRhdGVkLlxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtDbGllbnR9IFtjbGllbnRdIGNsaWVudCB0byB3cmFwXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IFtjb25maWcubWV0aG9kXSB0aGUgZGVmYXVsdCBtZXRob2Rcblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gW2NvbmZpZy5wYXRoXSB0aGUgZGVmYXVsdCBwYXRoXG5cdFx0ICogQHBhcmFtIHtPYmplY3R9IFtjb25maWcucGFyYW1zXSB0aGUgZGVmYXVsdCBwYXJhbXMsIG1peGVkIHdpdGggdGhlIHJlcXVlc3QncyBleGlzdGluZyBwYXJhbXNcblx0XHQgKiBAcGFyYW0ge09iamVjdH0gW2NvbmZpZy5oZWFkZXJzXSB0aGUgZGVmYXVsdCBoZWFkZXJzLCBtaXhlZCB3aXRoIHRoZSByZXF1ZXN0J3MgZXhpc3RpbmcgaGVhZGVyc1xuXHRcdCAqIEBwYXJhbSB7T2JqZWN0fSBbY29uZmlnLm1peGluXSB0aGUgZGVmYXVsdCBcIm1peGluc1wiIChodHRwL2h0dHBzIG9wdGlvbnMpLCBtaXhlZCB3aXRoIHRoZSByZXF1ZXN0J3MgZXhpc3RpbmcgXCJtaXhpbnNcIlxuXHRcdCAqXG5cdFx0ICogQHJldHVybnMge0NsaWVudH1cblx0XHQgKi9cblx0XHRyZXR1cm4gaW50ZXJjZXB0b3Ioe1xuXHRcdFx0cmVxdWVzdDogZnVuY3Rpb24gaGFuZGxlUmVxdWVzdChyZXF1ZXN0LCBjb25maWcpIHtcblx0XHRcdFx0cmV0dXJuIGRlZmF1bHRlcihyZXF1ZXN0LCBjb25maWcpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdH0pO1xuXG59KFxuXHR0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUgOiBmdW5jdGlvbiAoZmFjdG9yeSkgeyBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSk7IH1cblx0Ly8gQm9pbGVycGxhdGUgZm9yIEFNRCBhbmQgTm9kZVxuKSk7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTItMjAxMyB0aGUgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4gKlxuICogQGF1dGhvciBTY290dCBBbmRyZXdzXG4gKi9cblxuKGZ1bmN0aW9uIChkZWZpbmUpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGRlZmluZShmdW5jdGlvbiAocmVxdWlyZSkge1xuXG5cdFx0dmFyIGludGVyY2VwdG9yLCB3aGVuO1xuXG5cdFx0aW50ZXJjZXB0b3IgPSByZXF1aXJlKCcuLi9pbnRlcmNlcHRvcicpO1xuXHRcdHdoZW4gPSByZXF1aXJlKCd3aGVuJyk7XG5cblx0XHQvKipcblx0XHQgKiBSZWplY3RzIHRoZSByZXNwb25zZSBwcm9taXNlIGJhc2VkIG9uIHRoZSBzdGF0dXMgY29kZS5cblx0XHQgKlxuXHRcdCAqIENvZGVzIGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0byB0aGUgcHJvdmlkZWQgdmFsdWUgYXJlIHJlamVjdGVkLiAgRGVmYXVsdFxuXHRcdCAqIHZhbHVlIDQwMC5cblx0XHQgKlxuXHRcdCAqIEBwYXJhbSB7Q2xpZW50fSBbY2xpZW50XSBjbGllbnQgdG8gd3JhcFxuXHRcdCAqIEBwYXJhbSB7bnVtYmVyfSBbY29uZmlnLmNvZGU9NDAwXSBjb2RlIHRvIGluZGljYXRlIGEgcmVqZWN0aW9uXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7Q2xpZW50fVxuXHRcdCAqL1xuXHRcdHJldHVybiBpbnRlcmNlcHRvcih7XG5cdFx0XHRpbml0OiBmdW5jdGlvbiAoY29uZmlnKSB7XG5cdFx0XHRcdGNvbmZpZy5jb2RlID0gY29uZmlnLmNvZGUgfHwgNDAwO1xuXHRcdFx0XHRyZXR1cm4gY29uZmlnO1xuXHRcdFx0fSxcblx0XHRcdHJlc3BvbnNlOiBmdW5jdGlvbiAocmVzcG9uc2UsIGNvbmZpZykge1xuXHRcdFx0XHRpZiAocmVzcG9uc2Uuc3RhdHVzICYmIHJlc3BvbnNlLnN0YXR1cy5jb2RlID49IGNvbmZpZy5jb2RlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHdoZW4ucmVqZWN0KHJlc3BvbnNlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2U7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0fSk7XG5cbn0oXG5cdHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZSA6IGZ1bmN0aW9uIChmYWN0b3J5KSB7IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKTsgfVxuXHQvLyBCb2lsZXJwbGF0ZSBmb3IgQU1EIGFuZCBOb2RlXG4pKTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE0IHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuICogQGxpY2Vuc2UgTUlULCBzZWUgTElDRU5TRS50eHQgZm9yIGRldGFpbHNcbiAqXG4gKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiAqL1xuXG4oZnVuY3Rpb24gKGRlZmluZSkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0ZGVmaW5lKGZ1bmN0aW9uIChyZXF1aXJlKSB7XG5cblx0XHR2YXIgaW50ZXJjZXB0b3IsIG1pbWUsIHJlZ2lzdHJ5LCBub29wQ29udmVydGVyLCB3aGVuO1xuXG5cdFx0aW50ZXJjZXB0b3IgPSByZXF1aXJlKCcuLi9pbnRlcmNlcHRvcicpO1xuXHRcdG1pbWUgPSByZXF1aXJlKCcuLi9taW1lJyk7XG5cdFx0cmVnaXN0cnkgPSByZXF1aXJlKCcuLi9taW1lL3JlZ2lzdHJ5Jyk7XG5cdFx0d2hlbiA9IHJlcXVpcmUoJ3doZW4nKTtcblxuXHRcdG5vb3BDb252ZXJ0ZXIgPSB7XG5cdFx0XHRyZWFkOiBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmo7IH0sXG5cdFx0XHR3cml0ZTogZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqOyB9XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIE1JTUUgdHlwZSBzdXBwb3J0IGZvciByZXF1ZXN0IGFuZCByZXNwb25zZSBlbnRpdGllcy4gIEVudGl0aWVzIGFyZVxuXHRcdCAqIChkZSlzZXJpYWxpemVkIHVzaW5nIHRoZSBjb252ZXJ0ZXIgZm9yIHRoZSBNSU1FIHR5cGUuXG5cdFx0ICpcblx0XHQgKiBSZXF1ZXN0IGVudGl0aWVzIGFyZSBjb252ZXJ0ZWQgdXNpbmcgdGhlIGRlc2lyZWQgY29udmVydGVyIGFuZCB0aGVcblx0XHQgKiAnQWNjZXB0JyByZXF1ZXN0IGhlYWRlciBwcmVmZXJzIHRoaXMgTUlNRS5cblx0XHQgKlxuXHRcdCAqIFJlc3BvbnNlIGVudGl0aWVzIGFyZSBjb252ZXJ0ZWQgYmFzZWQgb24gdGhlIENvbnRlbnQtVHlwZSByZXNwb25zZSBoZWFkZXIuXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge0NsaWVudH0gW2NsaWVudF0gY2xpZW50IHRvIHdyYXBcblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gW2NvbmZpZy5taW1lPSd0ZXh0L3BsYWluJ10gTUlNRSB0eXBlIHRvIGVuY29kZSB0aGUgcmVxdWVzdFxuXHRcdCAqICAgZW50aXR5XG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IFtjb25maWcuYWNjZXB0XSBBY2NlcHQgaGVhZGVyIGZvciB0aGUgcmVxdWVzdFxuXHRcdCAqIEBwYXJhbSB7Q2xpZW50fSBbY29uZmlnLmNsaWVudD08cmVxdWVzdC5vcmlnaW5hdG9yPl0gY2xpZW50IHBhc3NlZCB0byB0aGVcblx0XHQgKiAgIGNvbnZlcnRlciwgZGVmYXVsdHMgdG8gdGhlIGNsaWVudCBvcmlnaW5hdGluZyB0aGUgcmVxdWVzdFxuXHRcdCAqIEBwYXJhbSB7UmVnaXN0cnl9IFtjb25maWcucmVnaXN0cnldIE1JTUUgcmVnaXN0cnksIGRlZmF1bHRzIHRvIHRoZSByb290XG5cdFx0ICogICByZWdpc3RyeVxuXHRcdCAqIEBwYXJhbSB7Ym9vbGVhbn0gW2NvbmZpZy5wZXJtaXNzaXZlXSBBbGxvdyBhbiB1bmtvd24gcmVxdWVzdCBNSU1FIHR5cGVcblx0XHQgKlxuXHRcdCAqIEByZXR1cm5zIHtDbGllbnR9XG5cdFx0ICovXG5cdFx0cmV0dXJuIGludGVyY2VwdG9yKHtcblx0XHRcdGluaXQ6IGZ1bmN0aW9uIChjb25maWcpIHtcblx0XHRcdFx0Y29uZmlnLnJlZ2lzdHJ5ID0gY29uZmlnLnJlZ2lzdHJ5IHx8IHJlZ2lzdHJ5O1xuXHRcdFx0XHRyZXR1cm4gY29uZmlnO1xuXHRcdFx0fSxcblx0XHRcdHJlcXVlc3Q6IGZ1bmN0aW9uIChyZXF1ZXN0LCBjb25maWcpIHtcblx0XHRcdFx0dmFyIHR5cGUsIGhlYWRlcnM7XG5cblx0XHRcdFx0aGVhZGVycyA9IHJlcXVlc3QuaGVhZGVycyB8fCAocmVxdWVzdC5oZWFkZXJzID0ge30pO1xuXHRcdFx0XHR0eXBlID0gbWltZS5wYXJzZShoZWFkZXJzWydDb250ZW50LVR5cGUnXSA9IGhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddIHx8IGNvbmZpZy5taW1lIHx8ICd0ZXh0L3BsYWluJyk7XG5cdFx0XHRcdGhlYWRlcnMuQWNjZXB0ID0gaGVhZGVycy5BY2NlcHQgfHwgY29uZmlnLmFjY2VwdCB8fCB0eXBlLnJhdyArICcsIGFwcGxpY2F0aW9uL2pzb247cT0wLjgsIHRleHQvcGxhaW47cT0wLjUsICovKjtxPTAuMic7XG5cblx0XHRcdFx0aWYgKCEoJ2VudGl0eScgaW4gcmVxdWVzdCkpIHtcblx0XHRcdFx0XHRyZXR1cm4gcmVxdWVzdDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJldHVybiBjb25maWcucmVnaXN0cnkubG9va3VwKHR5cGUpLm90aGVyd2lzZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Ly8gZmFpbGVkIHRvIHJlc29sdmUgY29udmVydGVyXG5cdFx0XHRcdFx0aWYgKGNvbmZpZy5wZXJtaXNzaXZlKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gbm9vcENvbnZlcnRlcjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dGhyb3cgJ21pbWUtdW5rbm93bic7XG5cdFx0XHRcdH0pLnRoZW4oZnVuY3Rpb24gKGNvbnZlcnRlcikge1xuXHRcdFx0XHRcdHZhciBjbGllbnQgPSBjb25maWcuY2xpZW50IHx8IHJlcXVlc3Qub3JpZ2luYXRvcjtcblxuXHRcdFx0XHRcdHJldHVybiB3aGVuLmF0dGVtcHQoY29udmVydGVyLndyaXRlLCByZXF1ZXN0LmVudGl0eSwgeyBjbGllbnQ6IGNsaWVudCwgcmVxdWVzdDogcmVxdWVzdCwgbWltZTogdHlwZSwgcmVnaXN0cnk6IGNvbmZpZy5yZWdpc3RyeSB9KVxuXHRcdFx0XHRcdFx0Lm90aGVyd2lzZShmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0dGhyb3cgJ21pbWUtc2VyaWFsaXphdGlvbic7XG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0LnRoZW4oZnVuY3Rpb24oZW50aXR5KSB7XG5cdFx0XHRcdFx0XHRcdHJlcXVlc3QuZW50aXR5ID0gZW50aXR5O1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gcmVxdWVzdDtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0sXG5cdFx0XHRyZXNwb25zZTogZnVuY3Rpb24gKHJlc3BvbnNlLCBjb25maWcpIHtcblx0XHRcdFx0aWYgKCEocmVzcG9uc2UuaGVhZGVycyAmJiByZXNwb25zZS5oZWFkZXJzWydDb250ZW50LVR5cGUnXSAmJiByZXNwb25zZS5lbnRpdHkpKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dmFyIHR5cGUgPSBtaW1lLnBhcnNlKHJlc3BvbnNlLmhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddKTtcblxuXHRcdFx0XHRyZXR1cm4gY29uZmlnLnJlZ2lzdHJ5Lmxvb2t1cCh0eXBlKS5vdGhlcndpc2UoZnVuY3Rpb24gKCkgeyByZXR1cm4gbm9vcENvbnZlcnRlcjsgfSkudGhlbihmdW5jdGlvbiAoY29udmVydGVyKSB7XG5cdFx0XHRcdFx0dmFyIGNsaWVudCA9IGNvbmZpZy5jbGllbnQgfHwgcmVzcG9uc2UucmVxdWVzdCAmJiByZXNwb25zZS5yZXF1ZXN0Lm9yaWdpbmF0b3I7XG5cblx0XHRcdFx0XHRyZXR1cm4gd2hlbi5hdHRlbXB0KGNvbnZlcnRlci5yZWFkLCByZXNwb25zZS5lbnRpdHksIHsgY2xpZW50OiBjbGllbnQsIHJlc3BvbnNlOiByZXNwb25zZSwgbWltZTogdHlwZSwgcmVnaXN0cnk6IGNvbmZpZy5yZWdpc3RyeSB9KVxuXHRcdFx0XHRcdFx0Lm90aGVyd2lzZShmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRcdFx0XHRyZXNwb25zZS5lcnJvciA9ICdtaW1lLWRlc2VyaWFsaXphdGlvbic7XG5cdFx0XHRcdFx0XHRcdHJlc3BvbnNlLmNhdXNlID0gZTtcblx0XHRcdFx0XHRcdFx0dGhyb3cgcmVzcG9uc2U7XG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0LnRoZW4oZnVuY3Rpb24gKGVudGl0eSkge1xuXHRcdFx0XHRcdFx0XHRyZXNwb25zZS5lbnRpdHkgPSBlbnRpdHk7XG5cdFx0XHRcdFx0XHRcdHJldHVybiByZXNwb25zZTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHR9KTtcblxufShcblx0dHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lIDogZnVuY3Rpb24gKGZhY3RvcnkpIHsgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUpOyB9XG5cdC8vIEJvaWxlcnBsYXRlIGZvciBBTUQgYW5kIE5vZGVcbikpO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgdGhlIG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzXG4gKiBAbGljZW5zZSBNSVQsIHNlZSBMSUNFTlNFLnR4dCBmb3IgZGV0YWlsc1xuICpcbiAqIEBhdXRob3IgU2NvdHQgQW5kcmV3c1xuICovXG5cbihmdW5jdGlvbiAoZGVmaW5lKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRkZWZpbmUoZnVuY3Rpb24gKHJlcXVpcmUpIHtcblxuXHRcdHZhciBpbnRlcmNlcHRvciwgVXJsQnVpbGRlcjtcblxuXHRcdGludGVyY2VwdG9yID0gcmVxdWlyZSgnLi4vaW50ZXJjZXB0b3InKTtcblx0XHRVcmxCdWlsZGVyID0gcmVxdWlyZSgnLi4vVXJsQnVpbGRlcicpO1xuXG5cdFx0ZnVuY3Rpb24gc3RhcnRzV2l0aChzdHIsIHByZWZpeCkge1xuXHRcdFx0cmV0dXJuIHN0ci5pbmRleE9mKHByZWZpeCkgPT09IDA7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZW5kc1dpdGgoc3RyLCBzdWZmaXgpIHtcblx0XHRcdHJldHVybiBzdHIubGFzdEluZGV4T2Yoc3VmZml4KSArIHN1ZmZpeC5sZW5ndGggPT09IHN0ci5sZW5ndGg7XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogUHJlZml4ZXMgdGhlIHJlcXVlc3QgcGF0aCB3aXRoIGEgY29tbW9uIHZhbHVlLlxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtDbGllbnR9IFtjbGllbnRdIGNsaWVudCB0byB3cmFwXG5cdFx0ICogQHBhcmFtIHtudW1iZXJ9IFtjb25maWcucHJlZml4XSBwYXRoIHByZWZpeFxuXHRcdCAqXG5cdFx0ICogQHJldHVybnMge0NsaWVudH1cblx0XHQgKi9cblx0XHRyZXR1cm4gaW50ZXJjZXB0b3Ioe1xuXHRcdFx0cmVxdWVzdDogZnVuY3Rpb24gKHJlcXVlc3QsIGNvbmZpZykge1xuXHRcdFx0XHR2YXIgcGF0aDtcblxuXHRcdFx0XHRpZiAoY29uZmlnLnByZWZpeCAmJiAhKG5ldyBVcmxCdWlsZGVyKHJlcXVlc3QucGF0aCkuaXNGdWxseVF1YWxpZmllZCgpKSkge1xuXHRcdFx0XHRcdHBhdGggPSBjb25maWcucHJlZml4O1xuXHRcdFx0XHRcdGlmIChyZXF1ZXN0LnBhdGgpIHtcblx0XHRcdFx0XHRcdGlmICghZW5kc1dpdGgocGF0aCwgJy8nKSAmJiAhc3RhcnRzV2l0aChyZXF1ZXN0LnBhdGgsICcvJykpIHtcblx0XHRcdFx0XHRcdFx0Ly8gYWRkIG1pc3NpbmcgJy8nIGJldHdlZW4gcGF0aCBzZWN0aW9uc1xuXHRcdFx0XHRcdFx0XHRwYXRoICs9ICcvJztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHBhdGggKz0gcmVxdWVzdC5wYXRoO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXF1ZXN0LnBhdGggPSBwYXRoO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIHJlcXVlc3Q7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0fSk7XG5cbn0oXG5cdHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZSA6IGZ1bmN0aW9uIChmYWN0b3J5KSB7IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKTsgfVxuXHQvLyBCb2lsZXJwbGF0ZSBmb3IgQU1EIGFuZCBOb2RlXG4pKTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNSB0aGUgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4gKlxuICogQGF1dGhvciBTY290dCBBbmRyZXdzXG4gKi9cblxuKGZ1bmN0aW9uIChkZWZpbmUpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGRlZmluZShmdW5jdGlvbiAocmVxdWlyZSkge1xuXG5cdFx0dmFyIGludGVyY2VwdG9yLCB1cmlUZW1wbGF0ZSwgbWl4aW47XG5cblx0XHRpbnRlcmNlcHRvciA9IHJlcXVpcmUoJy4uL2ludGVyY2VwdG9yJyk7XG5cdFx0dXJpVGVtcGxhdGUgPSByZXF1aXJlKCcuLi91dGlsL3VyaVRlbXBsYXRlJyk7XG5cdFx0bWl4aW4gPSByZXF1aXJlKCcuLi91dGlsL21peGluJyk7XG5cblx0XHQvKipcblx0XHQgKiBBcHBsaWVzIHJlcXVlc3QgcGFyYW1zIHRvIHRoZSBwYXRoIGFzIGEgVVJJIFRlbXBsYXRlXG5cdFx0ICpcblx0XHQgKiBQYXJhbXMgYXJlIHJlbW92ZWQgZnJvbSB0aGUgcmVxdWVzdCBvYmplY3QsIGFzIHRoZXkgaGF2ZSBiZWVuIGNvbnN1bWVkLlxuXHRcdCAqXG5cdFx0ICogQHNlZSBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjU3MFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtDbGllbnR9IFtjbGllbnRdIGNsaWVudCB0byB3cmFwXG5cdFx0ICogQHBhcmFtIHtPYmplY3R9IFtjb25maWcucGFyYW1zXSBkZWZhdWx0IHBhcmFtIHZhbHVlc1xuXHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBbY29uZmlnLnRlbXBsYXRlXSBkZWZhdWx0IHRlbXBsYXRlXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7Q2xpZW50fVxuXHRcdCAqL1xuXHRcdHJldHVybiBpbnRlcmNlcHRvcih7XG5cdFx0XHRpbml0OiBmdW5jdGlvbiAoY29uZmlnKSB7XG5cdFx0XHRcdGNvbmZpZy5wYXJhbXMgPSBjb25maWcucGFyYW1zIHx8IHt9O1xuXHRcdFx0XHRjb25maWcudGVtcGxhdGUgPSBjb25maWcudGVtcGxhdGUgfHwgJyc7XG5cdFx0XHRcdHJldHVybiBjb25maWc7XG5cdFx0XHR9LFxuXHRcdFx0cmVxdWVzdDogZnVuY3Rpb24gKHJlcXVlc3QsIGNvbmZpZykge1xuXHRcdFx0XHR2YXIgdGVtcGxhdGUsIHBhcmFtcztcblxuXHRcdFx0XHR0ZW1wbGF0ZSA9IHJlcXVlc3QucGF0aCB8fCBjb25maWcudGVtcGxhdGU7XG5cdFx0XHRcdHBhcmFtcyA9IG1peGluKHt9LCByZXF1ZXN0LnBhcmFtcywgY29uZmlnLnBhcmFtcyk7XG5cblx0XHRcdFx0cmVxdWVzdC5wYXRoID0gdXJpVGVtcGxhdGUuZXhwYW5kKHRlbXBsYXRlLCBwYXJhbXMpO1xuXHRcdFx0XHRkZWxldGUgcmVxdWVzdC5wYXJhbXM7XG5cblx0XHRcdFx0cmV0dXJuIHJlcXVlc3Q7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0fSk7XG5cbn0oXG5cdHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZSA6IGZ1bmN0aW9uIChmYWN0b3J5KSB7IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKTsgfVxuXHQvLyBCb2lsZXJwbGF0ZSBmb3IgQU1EIGFuZCBOb2RlXG4pKTtcbiIsIi8qXG4qIENvcHlyaWdodCAyMDE0IHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuKiBAbGljZW5zZSBNSVQsIHNlZSBMSUNFTlNFLnR4dCBmb3IgZGV0YWlsc1xuKlxuKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiovXG5cbihmdW5jdGlvbiAoZGVmaW5lKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgdW5kZWY7XG5cblx0ZGVmaW5lKGZ1bmN0aW9uICgvKiByZXF1aXJlICovKSB7XG5cblx0XHQvKipcblx0XHQgKiBQYXJzZSBhIE1JTUUgdHlwZSBpbnRvIGl0J3MgY29uc3RpdHVlbnQgcGFydHNcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBtaW1lIE1JTUUgdHlwZSB0byBwYXJzZVxuXHRcdCAqIEByZXR1cm4ge3tcblx0XHQgKiAgIHtzdHJpbmd9IHJhdyB0aGUgb3JpZ2luYWwgTUlNRSB0eXBlXG5cdFx0ICogICB7c3RyaW5nfSB0eXBlIHRoZSB0eXBlIGFuZCBzdWJ0eXBlXG5cdFx0ICogICB7c3RyaW5nfSBbc3VmZml4XSBtaW1lIHN1ZmZpeCwgaW5jbHVkaW5nIHRoZSBwbHVzLCBpZiBhbnlcblx0XHQgKiAgIHtPYmplY3R9IHBhcmFtcyBrZXkvdmFsdWUgcGFpciBvZiBhdHRyaWJ1dGVzXG5cdFx0ICogfX1cblx0XHQgKi9cblx0XHRmdW5jdGlvbiBwYXJzZShtaW1lKSB7XG5cdFx0XHR2YXIgcGFyYW1zLCB0eXBlO1xuXG5cdFx0XHRwYXJhbXMgPSBtaW1lLnNwbGl0KCc7Jyk7XG5cdFx0XHR0eXBlID0gcGFyYW1zWzBdLnRyaW0oKS5zcGxpdCgnKycpO1xuXG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRyYXc6IG1pbWUsXG5cdFx0XHRcdHR5cGU6IHR5cGVbMF0sXG5cdFx0XHRcdHN1ZmZpeDogdHlwZVsxXSA/ICcrJyArIHR5cGVbMV0gOiAnJyxcblx0XHRcdFx0cGFyYW1zOiBwYXJhbXMuc2xpY2UoMSkucmVkdWNlKGZ1bmN0aW9uIChwYXJhbXMsIHBhaXIpIHtcblx0XHRcdFx0XHRwYWlyID0gcGFpci5zcGxpdCgnPScpO1xuXHRcdFx0XHRcdHBhcmFtc1twYWlyWzBdLnRyaW0oKV0gPSBwYWlyWzFdID8gcGFpclsxXS50cmltKCkgOiB1bmRlZjtcblx0XHRcdFx0XHRyZXR1cm4gcGFyYW1zO1xuXHRcdFx0XHR9LCB7fSlcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHBhcnNlOiBwYXJzZVxuXHRcdH07XG5cblx0fSk7XG5cbn0oXG5cdHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZSA6IGZ1bmN0aW9uIChmYWN0b3J5KSB7IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKTsgfVxuXHQvLyBCb2lsZXJwbGF0ZSBmb3IgQU1EIGFuZCBOb2RlXG4pKTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE0IHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuICogQGxpY2Vuc2UgTUlULCBzZWUgTElDRU5TRS50eHQgZm9yIGRldGFpbHNcbiAqXG4gKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiAqL1xuXG4oZnVuY3Rpb24gKGRlZmluZSkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0ZGVmaW5lKGZ1bmN0aW9uIChyZXF1aXJlKSB7XG5cblx0XHR2YXIgbWltZSwgd2hlbiwgcmVnaXN0cnk7XG5cblx0XHRtaW1lID0gcmVxdWlyZSgnLi4vbWltZScpO1xuXHRcdHdoZW4gPSByZXF1aXJlKCd3aGVuJyk7XG5cblx0XHRmdW5jdGlvbiBSZWdpc3RyeShtaW1lcykge1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIExvb2t1cCB0aGUgY29udmVydGVyIGZvciBhIE1JTUUgdHlwZVxuXHRcdFx0ICpcblx0XHRcdCAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIHRoZSBNSU1FIHR5cGVcblx0XHRcdCAqIEByZXR1cm4gYSBwcm9taXNlIGZvciB0aGUgY29udmVydGVyXG5cdFx0XHQgKi9cblx0XHRcdHRoaXMubG9va3VwID0gZnVuY3Rpb24gbG9va3VwKHR5cGUpIHtcblx0XHRcdFx0dmFyIHBhcnNlZDtcblxuXHRcdFx0XHRwYXJzZWQgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyBtaW1lLnBhcnNlKHR5cGUpIDogdHlwZTtcblxuXHRcdFx0XHRpZiAobWltZXNbcGFyc2VkLnJhd10pIHtcblx0XHRcdFx0XHRyZXR1cm4gbWltZXNbcGFyc2VkLnJhd107XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKG1pbWVzW3BhcnNlZC50eXBlICsgcGFyc2VkLnN1ZmZpeF0pIHtcblx0XHRcdFx0XHRyZXR1cm4gbWltZXNbcGFyc2VkLnR5cGUgKyBwYXJzZWQuc3VmZml4XTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAobWltZXNbcGFyc2VkLnR5cGVdKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG1pbWVzW3BhcnNlZC50eXBlXTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAobWltZXNbcGFyc2VkLnN1ZmZpeF0pIHtcblx0XHRcdFx0XHRyZXR1cm4gbWltZXNbcGFyc2VkLnN1ZmZpeF07XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gd2hlbi5yZWplY3QobmV3IEVycm9yKCdVbmFibGUgdG8gbG9jYXRlIGNvbnZlcnRlciBmb3IgbWltZSBcIicgKyBwYXJzZWQucmF3ICsgJ1wiJykpO1xuXHRcdFx0fTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBDcmVhdGUgYSBsYXRlIGRpc3BhdGNoZWQgcHJveHkgdG8gdGhlIHRhcmdldCBjb252ZXJ0ZXIuXG5cdFx0XHQgKlxuXHRcdFx0ICogQ29tbW9uIHdoZW4gYSBjb252ZXJ0ZXIgaXMgcmVnaXN0ZXJlZCB1bmRlciBtdWx0aXBsZSBuYW1lcyBhbmRcblx0XHRcdCAqIHNob3VsZCBiZSBrZXB0IGluIHN5bmMgaWYgdXBkYXRlZC5cblx0XHRcdCAqXG5cdFx0XHQgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSBtaW1lIGNvbnZlcnRlciB0byBkaXNwYXRjaCB0b1xuXHRcdFx0ICogQHJldHVybnMgY29udmVydGVyIHdob3NlIHJlYWQvd3JpdGUgbWV0aG9kcyB0YXJnZXQgdGhlIGRlc2lyZWQgbWltZSBjb252ZXJ0ZXJcblx0XHRcdCAqL1xuXHRcdFx0dGhpcy5kZWxlZ2F0ZSA9IGZ1bmN0aW9uIGRlbGVnYXRlKHR5cGUpIHtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRyZWFkOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHR2YXIgYXJncyA9IGFyZ3VtZW50cztcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLmxvb2t1cCh0eXBlKS50aGVuKGZ1bmN0aW9uIChjb252ZXJ0ZXIpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGNvbnZlcnRlci5yZWFkLmFwcGx5KHRoaXMsIGFyZ3MpO1xuXHRcdFx0XHRcdFx0fS5iaW5kKHRoaXMpKTtcblx0XHRcdFx0XHR9LmJpbmQodGhpcyksXG5cdFx0XHRcdFx0d3JpdGU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHZhciBhcmdzID0gYXJndW1lbnRzO1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMubG9va3VwKHR5cGUpLnRoZW4oZnVuY3Rpb24gKGNvbnZlcnRlcikge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gY29udmVydGVyLndyaXRlLmFwcGx5KHRoaXMsIGFyZ3MpO1xuXHRcdFx0XHRcdFx0fS5iaW5kKHRoaXMpKTtcblx0XHRcdFx0XHR9LmJpbmQodGhpcylcblx0XHRcdFx0fTtcblx0XHRcdH07XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogUmVnaXN0ZXIgYSBjdXN0b20gY29udmVydGVyIGZvciBhIE1JTUUgdHlwZVxuXHRcdFx0ICpcblx0XHRcdCAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIHRoZSBNSU1FIHR5cGVcblx0XHRcdCAqIEBwYXJhbSBjb252ZXJ0ZXIgdGhlIGNvbnZlcnRlciBmb3IgdGhlIE1JTUUgdHlwZVxuXHRcdFx0ICogQHJldHVybiBhIHByb21pc2UgZm9yIHRoZSBjb252ZXJ0ZXJcblx0XHRcdCAqL1xuXHRcdFx0dGhpcy5yZWdpc3RlciA9IGZ1bmN0aW9uIHJlZ2lzdGVyKHR5cGUsIGNvbnZlcnRlcikge1xuXHRcdFx0XHRtaW1lc1t0eXBlXSA9IHdoZW4oY29udmVydGVyKTtcblx0XHRcdFx0cmV0dXJuIG1pbWVzW3R5cGVdO1xuXHRcdFx0fTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBDcmVhdGUgYSBjaGlsZCByZWdpc3RyeSB3aG9lcyByZWdpc3RlcmVkIGNvbnZlcnRlcnMgcmVtYWluIGxvY2FsLCB3aGlsZVxuXHRcdFx0ICogYWJsZSB0byBsb29rdXAgY29udmVydGVycyBmcm9tIGl0cyBwYXJlbnQuXG5cdFx0XHQgKlxuXHRcdFx0ICogQHJldHVybnMgY2hpbGQgTUlNRSByZWdpc3RyeVxuXHRcdFx0ICovXG5cdFx0XHR0aGlzLmNoaWxkID0gZnVuY3Rpb24gY2hpbGQoKSB7XG5cdFx0XHRcdHJldHVybiBuZXcgUmVnaXN0cnkoT2JqZWN0LmNyZWF0ZShtaW1lcykpO1xuXHRcdFx0fTtcblxuXHRcdH1cblxuXHRcdHJlZ2lzdHJ5ID0gbmV3IFJlZ2lzdHJ5KHt9KTtcblxuXHRcdC8vIGluY2x1ZGUgcHJvdmlkZWQgc2VyaWFsaXplcnNcblx0XHRyZWdpc3RyeS5yZWdpc3RlcignYXBwbGljYXRpb24vaGFsJywgcmVxdWlyZSgnLi90eXBlL2FwcGxpY2F0aW9uL2hhbCcpKTtcblx0XHRyZWdpc3RyeS5yZWdpc3RlcignYXBwbGljYXRpb24vanNvbicsIHJlcXVpcmUoJy4vdHlwZS9hcHBsaWNhdGlvbi9qc29uJykpO1xuXHRcdHJlZ2lzdHJ5LnJlZ2lzdGVyKCdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnLCByZXF1aXJlKCcuL3R5cGUvYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJykpO1xuXHRcdHJlZ2lzdHJ5LnJlZ2lzdGVyKCdtdWx0aXBhcnQvZm9ybS1kYXRhJywgcmVxdWlyZSgnLi90eXBlL211bHRpcGFydC9mb3JtLWRhdGEnKSk7XG5cdFx0cmVnaXN0cnkucmVnaXN0ZXIoJ3RleHQvcGxhaW4nLCByZXF1aXJlKCcuL3R5cGUvdGV4dC9wbGFpbicpKTtcblxuXHRcdHJlZ2lzdHJ5LnJlZ2lzdGVyKCcranNvbicsIHJlZ2lzdHJ5LmRlbGVnYXRlKCdhcHBsaWNhdGlvbi9qc29uJykpO1xuXG5cdFx0cmV0dXJuIHJlZ2lzdHJ5O1xuXG5cdH0pO1xuXG59KFxuXHR0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUgOiBmdW5jdGlvbiAoZmFjdG9yeSkgeyBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSk7IH1cblx0Ly8gQm9pbGVycGxhdGUgZm9yIEFNRCBhbmQgTm9kZVxuKSk7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTMtMjAxNSB0aGUgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4gKlxuICogQGF1dGhvciBTY290dCBBbmRyZXdzXG4gKi9cblxuKGZ1bmN0aW9uIChkZWZpbmUpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGRlZmluZShmdW5jdGlvbiAocmVxdWlyZSkge1xuXG5cdFx0dmFyIHBhdGhQcmVmaXgsIHRlbXBsYXRlLCBmaW5kLCBsYXp5UHJvbWlzZSwgcmVzcG9uc2VQcm9taXNlLCB3aGVuO1xuXG5cdFx0cGF0aFByZWZpeCA9IHJlcXVpcmUoJy4uLy4uLy4uL2ludGVyY2VwdG9yL3BhdGhQcmVmaXgnKTtcblx0XHR0ZW1wbGF0ZSA9IHJlcXVpcmUoJy4uLy4uLy4uL2ludGVyY2VwdG9yL3RlbXBsYXRlJyk7XG5cdFx0ZmluZCA9IHJlcXVpcmUoJy4uLy4uLy4uL3V0aWwvZmluZCcpO1xuXHRcdGxhenlQcm9taXNlID0gcmVxdWlyZSgnLi4vLi4vLi4vdXRpbC9sYXp5UHJvbWlzZScpO1xuXHRcdHJlc3BvbnNlUHJvbWlzZSA9IHJlcXVpcmUoJy4uLy4uLy4uL3V0aWwvcmVzcG9uc2VQcm9taXNlJyk7XG5cdFx0d2hlbiA9IHJlcXVpcmUoJ3doZW4nKTtcblxuXHRcdGZ1bmN0aW9uIGRlZmluZVByb3BlcnR5KG9iaiwgbmFtZSwgdmFsdWUpIHtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosIG5hbWUsIHtcblx0XHRcdFx0dmFsdWU6IHZhbHVlLFxuXHRcdFx0XHRjb25maWd1cmFibGU6IHRydWUsXG5cdFx0XHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdFx0XHR3cml0ZWFibGU6IHRydWVcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIEh5cGVydGV4dCBBcHBsaWNhdGlvbiBMYW5ndWFnZSBzZXJpYWxpemVyXG5cdFx0ICpcblx0XHQgKiBJbXBsZW1lbnRlZCB0byBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvZHJhZnQta2VsbHktanNvbi1oYWwtMDZcblx0XHQgKlxuXHRcdCAqIEFzIHRoZSBzcGVjIGlzIHN0aWxsIGEgZHJhZnQsIHRoaXMgaW1wbGVtZW50YXRpb24gd2lsbCBiZSB1cGRhdGVkIGFzIHRoZVxuXHRcdCAqIHNwZWMgZXZvbHZlc1xuXHRcdCAqXG5cdFx0ICogT2JqZWN0cyBhcmUgcmVhZCBhcyBIQUwgaW5kZXhpbmcgbGlua3MgYW5kIGVtYmVkZGVkIG9iamVjdHMgb24gdG8gdGhlXG5cdFx0ICogcmVzb3VyY2UuIE9iamVjdHMgYXJlIHdyaXR0ZW4gYXMgcGxhaW4gSlNPTi5cblx0XHQgKlxuXHRcdCAqIEVtYmVkZGVkIHJlbGF0aW9uc2hpcHMgYXJlIGluZGV4ZWQgb250byB0aGUgcmVzb3VyY2UgYnkgdGhlIHJlbGF0aW9uc2hpcFxuXHRcdCAqIGFzIGEgcHJvbWlzZSBmb3IgdGhlIHJlbGF0ZWQgcmVzb3VyY2UuXG5cdFx0ICpcblx0XHQgKiBMaW5rcyBhcmUgaW5kZXhlZCBvbnRvIHRoZSByZXNvdXJjZSBhcyBhIGxhenkgcHJvbWlzZSB0aGF0IHdpbGwgR0VUIHRoZVxuXHRcdCAqIHJlc291cmNlIHdoZW4gYSBoYW5kbGVyIGlzIGZpcnN0IHJlZ2lzdGVyZWQgb24gdGhlIHByb21pc2UuXG5cdFx0ICpcblx0XHQgKiBBIGByZXF1ZXN0Rm9yYCBtZXRob2QgaXMgYWRkZWQgdG8gdGhlIGVudGl0eSB0byBtYWtlIGEgcmVxdWVzdCBmb3IgdGhlXG5cdFx0ICogcmVsYXRpb25zaGlwLlxuXHRcdCAqXG5cdFx0ICogQSBgY2xpZW50Rm9yYCBtZXRob2QgaXMgYWRkZWQgdG8gdGhlIGVudGl0eSB0byBnZXQgYSBmdWxsIENsaWVudCBmb3IgYVxuXHRcdCAqIHJlbGF0aW9uc2hpcC5cblx0XHQgKlxuXHRcdCAqIFRoZSBgX2xpbmtzYCBhbmQgYF9lbWJlZGRlZGAgcHJvcGVydGllcyBvbiB0aGUgcmVzb3VyY2UgYXJlIG1hZGVcblx0XHQgKiBub24tZW51bWVyYWJsZS5cblx0XHQgKi9cblx0XHRyZXR1cm4ge1xuXG5cdFx0XHRyZWFkOiBmdW5jdGlvbiAoc3RyLCBvcHRzKSB7XG5cdFx0XHRcdHZhciBjbGllbnQsIGNvbnNvbGU7XG5cblx0XHRcdFx0b3B0cyA9IG9wdHMgfHwge307XG5cdFx0XHRcdGNsaWVudCA9IG9wdHMuY2xpZW50O1xuXHRcdFx0XHRjb25zb2xlID0gb3B0cy5jb25zb2xlIHx8IGNvbnNvbGU7XG5cblx0XHRcdFx0ZnVuY3Rpb24gZGVwcmVjYXRpb25XYXJuaW5nKHJlbGF0aW9uc2hpcCwgZGVwcmVjYXRpb24pIHtcblx0XHRcdFx0XHRpZiAoZGVwcmVjYXRpb24gJiYgY29uc29sZSAmJiBjb25zb2xlLndhcm4gfHwgY29uc29sZS5sb2cpIHtcblx0XHRcdFx0XHRcdChjb25zb2xlLndhcm4gfHwgY29uc29sZS5sb2cpLmNhbGwoY29uc29sZSwgJ1JlbGF0aW9uc2hpcCBcXCcnICsgcmVsYXRpb25zaGlwICsgJ1xcJyBpcyBkZXByZWNhdGVkLCBzZWUgJyArIGRlcHJlY2F0aW9uKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gb3B0cy5yZWdpc3RyeS5sb29rdXAob3B0cy5taW1lLnN1ZmZpeCkudGhlbihmdW5jdGlvbiAoY29udmVydGVyKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHdoZW4oY29udmVydGVyLnJlYWQoc3RyLCBvcHRzKSkudGhlbihmdW5jdGlvbiAocm9vdCkge1xuXG5cdFx0XHRcdFx0XHRmaW5kLmZpbmRQcm9wZXJ0aWVzKHJvb3QsICdfZW1iZWRkZWQnLCBmdW5jdGlvbiAoZW1iZWRkZWQsIHJlc291cmNlLCBuYW1lKSB7XG5cdFx0XHRcdFx0XHRcdE9iamVjdC5rZXlzKGVtYmVkZGVkKS5mb3JFYWNoKGZ1bmN0aW9uIChyZWxhdGlvbnNoaXApIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAocmVsYXRpb25zaGlwIGluIHJlc291cmNlKSB7IHJldHVybjsgfVxuXHRcdFx0XHRcdFx0XHRcdHZhciByZWxhdGVkID0gcmVzcG9uc2VQcm9taXNlKHtcblx0XHRcdFx0XHRcdFx0XHRcdGVudGl0eTogZW1iZWRkZWRbcmVsYXRpb25zaGlwXVxuXHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRcdGRlZmluZVByb3BlcnR5KHJlc291cmNlLCByZWxhdGlvbnNoaXAsIHJlbGF0ZWQpO1xuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0ZGVmaW5lUHJvcGVydHkocmVzb3VyY2UsIG5hbWUsIGVtYmVkZGVkKTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0ZmluZC5maW5kUHJvcGVydGllcyhyb290LCAnX2xpbmtzJywgZnVuY3Rpb24gKGxpbmtzLCByZXNvdXJjZSwgbmFtZSkge1xuXHRcdFx0XHRcdFx0XHRPYmplY3Qua2V5cyhsaW5rcykuZm9yRWFjaChmdW5jdGlvbiAocmVsYXRpb25zaGlwKSB7XG5cdFx0XHRcdFx0XHRcdFx0dmFyIGxpbmsgPSBsaW5rc1tyZWxhdGlvbnNoaXBdO1xuXHRcdFx0XHRcdFx0XHRcdGlmIChyZWxhdGlvbnNoaXAgaW4gcmVzb3VyY2UpIHsgcmV0dXJuOyB9XG5cdFx0XHRcdFx0XHRcdFx0ZGVmaW5lUHJvcGVydHkocmVzb3VyY2UsIHJlbGF0aW9uc2hpcCwgcmVzcG9uc2VQcm9taXNlLm1ha2UobGF6eVByb21pc2UoZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKGxpbmsuZGVwcmVjYXRpb24pIHsgZGVwcmVjYXRpb25XYXJuaW5nKHJlbGF0aW9uc2hpcCwgbGluay5kZXByZWNhdGlvbik7IH1cblx0XHRcdFx0XHRcdFx0XHRcdGlmIChsaW5rLnRlbXBsYXRlZCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdGVtcGxhdGUoY2xpZW50KSh7IHBhdGg6IGxpbmsuaHJlZiB9KTtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBjbGllbnQoeyBwYXRoOiBsaW5rLmhyZWYgfSk7XG5cdFx0XHRcdFx0XHRcdFx0fSkpKTtcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdGRlZmluZVByb3BlcnR5KHJlc291cmNlLCBuYW1lLCBsaW5rcyk7XG5cdFx0XHRcdFx0XHRcdGRlZmluZVByb3BlcnR5KHJlc291cmNlLCAnY2xpZW50Rm9yJywgZnVuY3Rpb24gKHJlbGF0aW9uc2hpcCwgY2xpZW50T3ZlcnJpZGUpIHtcblx0XHRcdFx0XHRcdFx0XHR2YXIgbGluayA9IGxpbmtzW3JlbGF0aW9uc2hpcF07XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCFsaW5rKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gcmVsYXRpb25zaGlwOiAnICsgcmVsYXRpb25zaGlwKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGxpbmsuZGVwcmVjYXRpb24pIHsgZGVwcmVjYXRpb25XYXJuaW5nKHJlbGF0aW9uc2hpcCwgbGluay5kZXByZWNhdGlvbik7IH1cblx0XHRcdFx0XHRcdFx0XHRpZiAobGluay50ZW1wbGF0ZWQgPT09IHRydWUpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiB0ZW1wbGF0ZShcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y2xpZW50T3ZlcnJpZGUgfHwgY2xpZW50LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR7IHRlbXBsYXRlOiBsaW5rLmhyZWYgfVxuXHRcdFx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHBhdGhQcmVmaXgoXG5cdFx0XHRcdFx0XHRcdFx0XHRjbGllbnRPdmVycmlkZSB8fCBjbGllbnQsXG5cdFx0XHRcdFx0XHRcdFx0XHR7IHByZWZpeDogbGluay5ocmVmIH1cblx0XHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0ZGVmaW5lUHJvcGVydHkocmVzb3VyY2UsICdyZXF1ZXN0Rm9yJywgZnVuY3Rpb24gKHJlbGF0aW9uc2hpcCwgcmVxdWVzdCwgY2xpZW50T3ZlcnJpZGUpIHtcblx0XHRcdFx0XHRcdFx0XHR2YXIgY2xpZW50ID0gdGhpcy5jbGllbnRGb3IocmVsYXRpb25zaGlwLCBjbGllbnRPdmVycmlkZSk7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGNsaWVudChyZXF1ZXN0KTtcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdFx0cmV0dXJuIHJvb3Q7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHR9LFxuXG5cdFx0XHR3cml0ZTogZnVuY3Rpb24gKG9iaiwgb3B0cykge1xuXHRcdFx0XHRyZXR1cm4gb3B0cy5yZWdpc3RyeS5sb29rdXAob3B0cy5taW1lLnN1ZmZpeCkudGhlbihmdW5jdGlvbiAoY29udmVydGVyKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGNvbnZlcnRlci53cml0ZShvYmosIG9wdHMpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdH07XG5cdH0pO1xuXG59KFxuXHR0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUgOiBmdW5jdGlvbiAoZmFjdG9yeSkgeyBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSk7IH1cblx0Ly8gQm9pbGVycGxhdGUgZm9yIEFNRCBhbmQgTm9kZVxuKSk7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTItMjAxNSB0aGUgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4gKlxuICogQGF1dGhvciBTY290dCBBbmRyZXdzXG4gKi9cblxuKGZ1bmN0aW9uIChkZWZpbmUpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGRlZmluZShmdW5jdGlvbiAoLyogcmVxdWlyZSAqLykge1xuXG5cdFx0LyoqXG5cdFx0ICogQ3JlYXRlIGEgbmV3IEpTT04gY29udmVydGVyIHdpdGggY3VzdG9tIHJldml2ZXIvcmVwbGFjZXIuXG5cdFx0ICpcblx0XHQgKiBUaGUgZXh0ZW5kZWQgY29udmVydGVyIG11c3QgYmUgcHVibGlzaGVkIHRvIGEgTUlNRSByZWdpc3RyeSBpbiBvcmRlclxuXHRcdCAqIHRvIGJlIHVzZWQuIFRoZSBleGlzdGluZyBjb252ZXJ0ZXIgd2lsbCBub3QgYmUgbW9kaWZpZWQuXG5cdFx0ICpcblx0XHQgKiBAc2VlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0pTT05cblx0XHQgKlxuXHRcdCAqIEBwYXJhbSB7ZnVuY3Rpb259IFtyZXZpdmVyPXVuZGVmaW5lZF0gY3VzdG9tIEpTT04ucGFyc2UgcmV2aXZlclxuXHRcdCAqIEBwYXJhbSB7ZnVuY3Rpb258QXJyYXl9IFtyZXBsYWNlcj11bmRlZmluZWRdIGN1c3RvbSBKU09OLnN0cmluZ2lmeSByZXBsYWNlclxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGNyZWF0ZUNvbnZlcnRlcihyZXZpdmVyLCByZXBsYWNlcikge1xuXHRcdFx0cmV0dXJuIHtcblxuXHRcdFx0XHRyZWFkOiBmdW5jdGlvbiAoc3RyKSB7XG5cdFx0XHRcdFx0cmV0dXJuIEpTT04ucGFyc2Uoc3RyLCByZXZpdmVyKTtcblx0XHRcdFx0fSxcblxuXHRcdFx0XHR3cml0ZTogZnVuY3Rpb24gKG9iaikge1xuXHRcdFx0XHRcdHJldHVybiBKU09OLnN0cmluZ2lmeShvYmosIHJlcGxhY2VyKTtcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRleHRlbmQ6IGNyZWF0ZUNvbnZlcnRlclxuXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdHJldHVybiBjcmVhdGVDb252ZXJ0ZXIoKTtcblxuXHR9KTtcblxufShcblx0dHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lIDogZnVuY3Rpb24gKGZhY3RvcnkpIHsgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUpOyB9XG5cdC8vIEJvaWxlcnBsYXRlIGZvciBBTUQgYW5kIE5vZGVcbikpO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDEyIHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuICogQGxpY2Vuc2UgTUlULCBzZWUgTElDRU5TRS50eHQgZm9yIGRldGFpbHNcbiAqXG4gKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiAqL1xuXG4oZnVuY3Rpb24gKGRlZmluZSkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0ZGVmaW5lKGZ1bmN0aW9uICgvKiByZXF1aXJlICovKSB7XG5cblx0XHR2YXIgZW5jb2RlZFNwYWNlUkUsIHVybEVuY29kZWRTcGFjZVJFO1xuXG5cdFx0ZW5jb2RlZFNwYWNlUkUgPSAvJTIwL2c7XG5cdFx0dXJsRW5jb2RlZFNwYWNlUkUgPSAvXFwrL2c7XG5cblx0XHRmdW5jdGlvbiB1cmxFbmNvZGUoc3RyKSB7XG5cdFx0XHRzdHIgPSBlbmNvZGVVUklDb21wb25lbnQoc3RyKTtcblx0XHRcdC8vIHNwZWMgc2F5cyBzcGFjZSBzaG91bGQgYmUgZW5jb2RlZCBhcyAnKydcblx0XHRcdHJldHVybiBzdHIucmVwbGFjZShlbmNvZGVkU3BhY2VSRSwgJysnKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiB1cmxEZWNvZGUoc3RyKSB7XG5cdFx0XHQvLyBzcGVjIHNheXMgc3BhY2Ugc2hvdWxkIGJlIGVuY29kZWQgYXMgJysnXG5cdFx0XHRzdHIgPSBzdHIucmVwbGFjZSh1cmxFbmNvZGVkU3BhY2VSRSwgJyAnKTtcblx0XHRcdHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoc3RyKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBhcHBlbmQoc3RyLCBuYW1lLCB2YWx1ZSkge1xuXHRcdFx0aWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG5cdFx0XHRcdHZhbHVlLmZvckVhY2goZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0XHRcdFx0c3RyID0gYXBwZW5kKHN0ciwgbmFtZSwgdmFsdWUpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRpZiAoc3RyLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRzdHIgKz0gJyYnO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHN0ciArPSB1cmxFbmNvZGUobmFtZSk7XG5cdFx0XHRcdGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsKSB7XG5cdFx0XHRcdFx0c3RyICs9ICc9JyArIHVybEVuY29kZSh2YWx1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBzdHI7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblxuXHRcdFx0cmVhZDogZnVuY3Rpb24gKHN0cikge1xuXHRcdFx0XHR2YXIgb2JqID0ge307XG5cdFx0XHRcdHN0ci5zcGxpdCgnJicpLmZvckVhY2goZnVuY3Rpb24gKGVudHJ5KSB7XG5cdFx0XHRcdFx0dmFyIHBhaXIsIG5hbWUsIHZhbHVlO1xuXHRcdFx0XHRcdHBhaXIgPSBlbnRyeS5zcGxpdCgnPScpO1xuXHRcdFx0XHRcdG5hbWUgPSB1cmxEZWNvZGUocGFpclswXSk7XG5cdFx0XHRcdFx0aWYgKHBhaXIubGVuZ3RoID09PSAyKSB7XG5cdFx0XHRcdFx0XHR2YWx1ZSA9IHVybERlY29kZShwYWlyWzFdKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHR2YWx1ZSA9IG51bGw7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChuYW1lIGluIG9iaikge1xuXHRcdFx0XHRcdFx0aWYgKCFBcnJheS5pc0FycmF5KG9ialtuYW1lXSkpIHtcblx0XHRcdFx0XHRcdFx0Ly8gY29udmVydCB0byBhbiBhcnJheSwgcGVyc2VydmluZyBjdXJybmVudCB2YWx1ZVxuXHRcdFx0XHRcdFx0XHRvYmpbbmFtZV0gPSBbb2JqW25hbWVdXTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdG9ialtuYW1lXS5wdXNoKHZhbHVlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRvYmpbbmFtZV0gPSB2YWx1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZXR1cm4gb2JqO1xuXHRcdFx0fSxcblxuXHRcdFx0d3JpdGU6IGZ1bmN0aW9uIChvYmopIHtcblx0XHRcdFx0dmFyIHN0ciA9ICcnO1xuXHRcdFx0XHRPYmplY3Qua2V5cyhvYmopLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcblx0XHRcdFx0XHRzdHIgPSBhcHBlbmQoc3RyLCBuYW1lLCBvYmpbbmFtZV0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuIHN0cjtcblx0XHRcdH1cblxuXHRcdH07XG5cdH0pO1xuXG59KFxuXHR0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUgOiBmdW5jdGlvbiAoZmFjdG9yeSkgeyBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSk7IH1cblx0Ly8gQm9pbGVycGxhdGUgZm9yIEFNRCBhbmQgTm9kZVxuKSk7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTQgdGhlIG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzXG4gKiBAbGljZW5zZSBNSVQsIHNlZSBMSUNFTlNFLnR4dCBmb3IgZGV0YWlsc1xuICpcbiAqIEBhdXRob3IgTWljaGFlbCBKYWNrc29uXG4gKi9cblxuLyogZ2xvYmFsIEZvcm1EYXRhLCBGaWxlLCBCbG9iICovXG5cbihmdW5jdGlvbiAoZGVmaW5lKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRkZWZpbmUoZnVuY3Rpb24gKC8qIHJlcXVpcmUgKi8pIHtcblxuXHRcdGZ1bmN0aW9uIGlzRm9ybUVsZW1lbnQob2JqZWN0KSB7XG5cdFx0XHRyZXR1cm4gb2JqZWN0ICYmXG5cdFx0XHRcdG9iamVjdC5ub2RlVHlwZSA9PT0gMSAmJiAvLyBOb2RlLkVMRU1FTlRfTk9ERVxuXHRcdFx0XHRvYmplY3QudGFnTmFtZSA9PT0gJ0ZPUk0nO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGNyZWF0ZUZvcm1EYXRhRnJvbU9iamVjdChvYmplY3QpIHtcblx0XHRcdHZhciBmb3JtRGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuXG5cdFx0XHR2YXIgdmFsdWU7XG5cdFx0XHRmb3IgKHZhciBwcm9wZXJ0eSBpbiBvYmplY3QpIHtcblx0XHRcdFx0aWYgKG9iamVjdC5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpIHtcblx0XHRcdFx0XHR2YWx1ZSA9IG9iamVjdFtwcm9wZXJ0eV07XG5cblx0XHRcdFx0XHRpZiAodmFsdWUgaW5zdGFuY2VvZiBGaWxlKSB7XG5cdFx0XHRcdFx0XHRmb3JtRGF0YS5hcHBlbmQocHJvcGVydHksIHZhbHVlLCB2YWx1ZS5uYW1lKTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgQmxvYikge1xuXHRcdFx0XHRcdFx0Zm9ybURhdGEuYXBwZW5kKHByb3BlcnR5LCB2YWx1ZSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGZvcm1EYXRhLmFwcGVuZChwcm9wZXJ0eSwgU3RyaW5nKHZhbHVlKSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBmb3JtRGF0YTtcblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXG5cdFx0XHR3cml0ZTogZnVuY3Rpb24gKG9iamVjdCkge1xuXHRcdFx0XHRpZiAodHlwZW9mIEZvcm1EYXRhID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcignVGhlIG11bHRpcGFydC9mb3JtLWRhdGEgbWltZSBzZXJpYWxpemVyIHJlcXVpcmVzIEZvcm1EYXRhIHN1cHBvcnQnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFN1cHBvcnQgRm9ybURhdGEgZGlyZWN0bHkuXG5cdFx0XHRcdGlmIChvYmplY3QgaW5zdGFuY2VvZiBGb3JtRGF0YSkge1xuXHRcdFx0XHRcdHJldHVybiBvYmplY3Q7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBTdXBwb3J0IDxmb3JtPiBlbGVtZW50cy5cblx0XHRcdFx0aWYgKGlzRm9ybUVsZW1lbnQob2JqZWN0KSkge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgRm9ybURhdGEob2JqZWN0KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFN1cHBvcnQgcGxhaW4gb2JqZWN0cywgbWF5IGNvbnRhaW4gRmlsZS9CbG9iIGFzIHZhbHVlLlxuXHRcdFx0XHRpZiAodHlwZW9mIG9iamVjdCA9PT0gJ29iamVjdCcgJiYgb2JqZWN0ICE9PSBudWxsKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGNyZWF0ZUZvcm1EYXRhRnJvbU9iamVjdChvYmplY3QpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gY3JlYXRlIEZvcm1EYXRhIGZyb20gb2JqZWN0ICcgKyBvYmplY3QpO1xuXHRcdFx0fVxuXG5cdFx0fTtcblx0fSk7XG5cbn0oXG5cdHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZSA6IGZ1bmN0aW9uIChmYWN0b3J5KSB7IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKTsgfVxuXHQvLyBCb2lsZXJwbGF0ZSBmb3IgQU1EIGFuZCBOb2RlXG4pKTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxMiB0aGUgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4gKlxuICogQGF1dGhvciBTY290dCBBbmRyZXdzXG4gKi9cblxuKGZ1bmN0aW9uIChkZWZpbmUpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGRlZmluZShmdW5jdGlvbiAoLyogcmVxdWlyZSAqLykge1xuXG5cdFx0cmV0dXJuIHtcblxuXHRcdFx0cmVhZDogZnVuY3Rpb24gKHN0cikge1xuXHRcdFx0XHRyZXR1cm4gc3RyO1xuXHRcdFx0fSxcblxuXHRcdFx0d3JpdGU6IGZ1bmN0aW9uIChvYmopIHtcblx0XHRcdFx0cmV0dXJuIG9iai50b1N0cmluZygpO1xuXHRcdFx0fVxuXG5cdFx0fTtcblx0fSk7XG5cbn0oXG5cdHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZSA6IGZ1bmN0aW9uIChmYWN0b3J5KSB7IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKTsgfVxuXHQvLyBCb2lsZXJwbGF0ZSBmb3IgQU1EIGFuZCBOb2RlXG4pKTtcbiIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG4oZnVuY3Rpb24oZGVmaW5lKSB7ICd1c2Ugc3RyaWN0JztcbmRlZmluZShmdW5jdGlvbiAocmVxdWlyZSkge1xuXG5cdHZhciBtYWtlUHJvbWlzZSA9IHJlcXVpcmUoJy4vbWFrZVByb21pc2UnKTtcblx0dmFyIFNjaGVkdWxlciA9IHJlcXVpcmUoJy4vU2NoZWR1bGVyJyk7XG5cdHZhciBhc3luYyA9IHJlcXVpcmUoJy4vZW52JykuYXNhcDtcblxuXHRyZXR1cm4gbWFrZVByb21pc2Uoe1xuXHRcdHNjaGVkdWxlcjogbmV3IFNjaGVkdWxlcihhc3luYylcblx0fSk7XG5cbn0pO1xufSkodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lIDogZnVuY3Rpb24gKGZhY3RvcnkpIHsgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUpOyB9KTtcbiIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG4oZnVuY3Rpb24oZGVmaW5lKSB7ICd1c2Ugc3RyaWN0JztcbmRlZmluZShmdW5jdGlvbigpIHtcblxuXHQvLyBDcmVkaXQgdG8gVHdpc29sIChodHRwczovL2dpdGh1Yi5jb20vVHdpc29sKSBmb3Igc3VnZ2VzdGluZ1xuXHQvLyB0aGlzIHR5cGUgb2YgZXh0ZW5zaWJsZSBxdWV1ZSArIHRyYW1wb2xpbmUgYXBwcm9hY2ggZm9yIG5leHQtdGljayBjb25mbGF0aW9uLlxuXG5cdC8qKlxuXHQgKiBBc3luYyB0YXNrIHNjaGVkdWxlclxuXHQgKiBAcGFyYW0ge2Z1bmN0aW9ufSBhc3luYyBmdW5jdGlvbiB0byBzY2hlZHVsZSBhIHNpbmdsZSBhc3luYyBmdW5jdGlvblxuXHQgKiBAY29uc3RydWN0b3Jcblx0ICovXG5cdGZ1bmN0aW9uIFNjaGVkdWxlcihhc3luYykge1xuXHRcdHRoaXMuX2FzeW5jID0gYXN5bmM7XG5cdFx0dGhpcy5fcnVubmluZyA9IGZhbHNlO1xuXG5cdFx0dGhpcy5fcXVldWUgPSB0aGlzO1xuXHRcdHRoaXMuX3F1ZXVlTGVuID0gMDtcblx0XHR0aGlzLl9hZnRlclF1ZXVlID0ge307XG5cdFx0dGhpcy5fYWZ0ZXJRdWV1ZUxlbiA9IDA7XG5cblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dGhpcy5kcmFpbiA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0c2VsZi5fZHJhaW4oKTtcblx0XHR9O1xuXHR9XG5cblx0LyoqXG5cdCAqIEVucXVldWUgYSB0YXNrXG5cdCAqIEBwYXJhbSB7eyBydW46ZnVuY3Rpb24gfX0gdGFza1xuXHQgKi9cblx0U2NoZWR1bGVyLnByb3RvdHlwZS5lbnF1ZXVlID0gZnVuY3Rpb24odGFzaykge1xuXHRcdHRoaXMuX3F1ZXVlW3RoaXMuX3F1ZXVlTGVuKytdID0gdGFzaztcblx0XHR0aGlzLnJ1bigpO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBFbnF1ZXVlIGEgdGFzayB0byBydW4gYWZ0ZXIgdGhlIG1haW4gdGFzayBxdWV1ZVxuXHQgKiBAcGFyYW0ge3sgcnVuOmZ1bmN0aW9uIH19IHRhc2tcblx0ICovXG5cdFNjaGVkdWxlci5wcm90b3R5cGUuYWZ0ZXJRdWV1ZSA9IGZ1bmN0aW9uKHRhc2spIHtcblx0XHR0aGlzLl9hZnRlclF1ZXVlW3RoaXMuX2FmdGVyUXVldWVMZW4rK10gPSB0YXNrO1xuXHRcdHRoaXMucnVuKCk7XG5cdH07XG5cblx0U2NoZWR1bGVyLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbigpIHtcblx0XHRpZiAoIXRoaXMuX3J1bm5pbmcpIHtcblx0XHRcdHRoaXMuX3J1bm5pbmcgPSB0cnVlO1xuXHRcdFx0dGhpcy5fYXN5bmModGhpcy5kcmFpbik7XG5cdFx0fVxuXHR9O1xuXG5cdC8qKlxuXHQgKiBEcmFpbiB0aGUgaGFuZGxlciBxdWV1ZSBlbnRpcmVseSwgYW5kIHRoZW4gdGhlIGFmdGVyIHF1ZXVlXG5cdCAqL1xuXHRTY2hlZHVsZXIucHJvdG90eXBlLl9kcmFpbiA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBpID0gMDtcblx0XHRmb3IgKDsgaSA8IHRoaXMuX3F1ZXVlTGVuOyArK2kpIHtcblx0XHRcdHRoaXMuX3F1ZXVlW2ldLnJ1bigpO1xuXHRcdFx0dGhpcy5fcXVldWVbaV0gPSB2b2lkIDA7XG5cdFx0fVxuXG5cdFx0dGhpcy5fcXVldWVMZW4gPSAwO1xuXHRcdHRoaXMuX3J1bm5pbmcgPSBmYWxzZTtcblxuXHRcdGZvciAoaSA9IDA7IGkgPCB0aGlzLl9hZnRlclF1ZXVlTGVuOyArK2kpIHtcblx0XHRcdHRoaXMuX2FmdGVyUXVldWVbaV0ucnVuKCk7XG5cdFx0XHR0aGlzLl9hZnRlclF1ZXVlW2ldID0gdm9pZCAwO1xuXHRcdH1cblxuXHRcdHRoaXMuX2FmdGVyUXVldWVMZW4gPSAwO1xuXHR9O1xuXG5cdHJldHVybiBTY2hlZHVsZXI7XG5cbn0pO1xufSh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUgOiBmdW5jdGlvbihmYWN0b3J5KSB7IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpOyB9KSk7XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuKGZ1bmN0aW9uKGRlZmluZSkgeyAndXNlIHN0cmljdCc7XG5kZWZpbmUoZnVuY3Rpb24oKSB7XG5cblx0LyoqXG5cdCAqIEN1c3RvbSBlcnJvciB0eXBlIGZvciBwcm9taXNlcyByZWplY3RlZCBieSBwcm9taXNlLnRpbWVvdXRcblx0ICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2Vcblx0ICogQGNvbnN0cnVjdG9yXG5cdCAqL1xuXHRmdW5jdGlvbiBUaW1lb3V0RXJyb3IgKG1lc3NhZ2UpIHtcblx0XHRFcnJvci5jYWxsKHRoaXMpO1xuXHRcdHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG5cdFx0dGhpcy5uYW1lID0gVGltZW91dEVycm9yLm5hbWU7XG5cdFx0aWYgKHR5cGVvZiBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0RXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgVGltZW91dEVycm9yKTtcblx0XHR9XG5cdH1cblxuXHRUaW1lb3V0RXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUpO1xuXHRUaW1lb3V0RXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVGltZW91dEVycm9yO1xuXG5cdHJldHVybiBUaW1lb3V0RXJyb3I7XG59KTtcbn0odHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lIDogZnVuY3Rpb24oZmFjdG9yeSkgeyBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTsgfSkpOyIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG4oZnVuY3Rpb24oZGVmaW5lKSB7ICd1c2Ugc3RyaWN0JztcbmRlZmluZShmdW5jdGlvbigpIHtcblxuXHRtYWtlQXBwbHkudHJ5Q2F0Y2hSZXNvbHZlID0gdHJ5Q2F0Y2hSZXNvbHZlO1xuXG5cdHJldHVybiBtYWtlQXBwbHk7XG5cblx0ZnVuY3Rpb24gbWFrZUFwcGx5KFByb21pc2UsIGNhbGwpIHtcblx0XHRpZihhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuXHRcdFx0Y2FsbCA9IHRyeUNhdGNoUmVzb2x2ZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gYXBwbHk7XG5cblx0XHRmdW5jdGlvbiBhcHBseShmLCB0aGlzQXJnLCBhcmdzKSB7XG5cdFx0XHR2YXIgcCA9IFByb21pc2UuX2RlZmVyKCk7XG5cdFx0XHR2YXIgbCA9IGFyZ3MubGVuZ3RoO1xuXHRcdFx0dmFyIHBhcmFtcyA9IG5ldyBBcnJheShsKTtcblx0XHRcdGNhbGxBbmRSZXNvbHZlKHsgZjpmLCB0aGlzQXJnOnRoaXNBcmcsIGFyZ3M6YXJncywgcGFyYW1zOnBhcmFtcywgaTpsLTEsIGNhbGw6Y2FsbCB9LCBwLl9oYW5kbGVyKTtcblxuXHRcdFx0cmV0dXJuIHA7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gY2FsbEFuZFJlc29sdmUoYywgaCkge1xuXHRcdFx0aWYoYy5pIDwgMCkge1xuXHRcdFx0XHRyZXR1cm4gY2FsbChjLmYsIGMudGhpc0FyZywgYy5wYXJhbXMsIGgpO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgaGFuZGxlciA9IFByb21pc2UuX2hhbmRsZXIoYy5hcmdzW2MuaV0pO1xuXHRcdFx0aGFuZGxlci5mb2xkKGNhbGxBbmRSZXNvbHZlTmV4dCwgYywgdm9pZCAwLCBoKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBjYWxsQW5kUmVzb2x2ZU5leHQoYywgeCwgaCkge1xuXHRcdFx0Yy5wYXJhbXNbYy5pXSA9IHg7XG5cdFx0XHRjLmkgLT0gMTtcblx0XHRcdGNhbGxBbmRSZXNvbHZlKGMsIGgpO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIHRyeUNhdGNoUmVzb2x2ZShmLCB0aGlzQXJnLCBhcmdzLCByZXNvbHZlcikge1xuXHRcdHRyeSB7XG5cdFx0XHRyZXNvbHZlci5yZXNvbHZlKGYuYXBwbHkodGhpc0FyZywgYXJncykpO1xuXHRcdH0gY2F0Y2goZSkge1xuXHRcdFx0cmVzb2x2ZXIucmVqZWN0KGUpO1xuXHRcdH1cblx0fVxuXG59KTtcbn0odHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lIDogZnVuY3Rpb24oZmFjdG9yeSkgeyBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTsgfSkpO1xuXG5cbiIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG4oZnVuY3Rpb24oZGVmaW5lKSB7ICd1c2Ugc3RyaWN0JztcbmRlZmluZShmdW5jdGlvbihyZXF1aXJlKSB7XG5cblx0dmFyIHN0YXRlID0gcmVxdWlyZSgnLi4vc3RhdGUnKTtcblx0dmFyIGFwcGxpZXIgPSByZXF1aXJlKCcuLi9hcHBseScpO1xuXG5cdHJldHVybiBmdW5jdGlvbiBhcnJheShQcm9taXNlKSB7XG5cblx0XHR2YXIgYXBwbHlGb2xkID0gYXBwbGllcihQcm9taXNlKTtcblx0XHR2YXIgdG9Qcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlO1xuXHRcdHZhciBhbGwgPSBQcm9taXNlLmFsbDtcblxuXHRcdHZhciBhciA9IEFycmF5LnByb3RvdHlwZS5yZWR1Y2U7XG5cdFx0dmFyIGFyciA9IEFycmF5LnByb3RvdHlwZS5yZWR1Y2VSaWdodDtcblx0XHR2YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5cblx0XHQvLyBBZGRpdGlvbmFsIGFycmF5IGNvbWJpbmF0b3JzXG5cblx0XHRQcm9taXNlLmFueSA9IGFueTtcblx0XHRQcm9taXNlLnNvbWUgPSBzb21lO1xuXHRcdFByb21pc2Uuc2V0dGxlID0gc2V0dGxlO1xuXG5cdFx0UHJvbWlzZS5tYXAgPSBtYXA7XG5cdFx0UHJvbWlzZS5maWx0ZXIgPSBmaWx0ZXI7XG5cdFx0UHJvbWlzZS5yZWR1Y2UgPSByZWR1Y2U7XG5cdFx0UHJvbWlzZS5yZWR1Y2VSaWdodCA9IHJlZHVjZVJpZ2h0O1xuXG5cdFx0LyoqXG5cdFx0ICogV2hlbiB0aGlzIHByb21pc2UgZnVsZmlsbHMgd2l0aCBhbiBhcnJheSwgZG9cblx0XHQgKiBvbkZ1bGZpbGxlZC5hcHBseSh2b2lkIDAsIGFycmF5KVxuXHRcdCAqIEBwYXJhbSB7ZnVuY3Rpb259IG9uRnVsZmlsbGVkIGZ1bmN0aW9uIHRvIGFwcGx5XG5cdFx0ICogQHJldHVybnMge1Byb21pc2V9IHByb21pc2UgZm9yIHRoZSByZXN1bHQgb2YgYXBwbHlpbmcgb25GdWxmaWxsZWRcblx0XHQgKi9cblx0XHRQcm9taXNlLnByb3RvdHlwZS5zcHJlYWQgPSBmdW5jdGlvbihvbkZ1bGZpbGxlZCkge1xuXHRcdFx0cmV0dXJuIHRoaXMudGhlbihhbGwpLnRoZW4oZnVuY3Rpb24oYXJyYXkpIHtcblx0XHRcdFx0cmV0dXJuIG9uRnVsZmlsbGVkLmFwcGx5KHRoaXMsIGFycmF5KTtcblx0XHRcdH0pO1xuXHRcdH07XG5cblx0XHRyZXR1cm4gUHJvbWlzZTtcblxuXHRcdC8qKlxuXHRcdCAqIE9uZS13aW5uZXIgY29tcGV0aXRpdmUgcmFjZS5cblx0XHQgKiBSZXR1cm4gYSBwcm9taXNlIHRoYXQgd2lsbCBmdWxmaWxsIHdoZW4gb25lIG9mIHRoZSBwcm9taXNlc1xuXHRcdCAqIGluIHRoZSBpbnB1dCBhcnJheSBmdWxmaWxscywgb3Igd2lsbCByZWplY3Qgd2hlbiBhbGwgcHJvbWlzZXNcblx0XHQgKiBoYXZlIHJlamVjdGVkLlxuXHRcdCAqIEBwYXJhbSB7YXJyYXl9IHByb21pc2VzXG5cdFx0ICogQHJldHVybnMge1Byb21pc2V9IHByb21pc2UgZm9yIHRoZSBmaXJzdCBmdWxmaWxsZWQgdmFsdWVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBhbnkocHJvbWlzZXMpIHtcblx0XHRcdHZhciBwID0gUHJvbWlzZS5fZGVmZXIoKTtcblx0XHRcdHZhciByZXNvbHZlciA9IHAuX2hhbmRsZXI7XG5cdFx0XHR2YXIgbCA9IHByb21pc2VzLmxlbmd0aD4+PjA7XG5cblx0XHRcdHZhciBwZW5kaW5nID0gbDtcblx0XHRcdHZhciBlcnJvcnMgPSBbXTtcblxuXHRcdFx0Zm9yICh2YXIgaCwgeCwgaSA9IDA7IGkgPCBsOyArK2kpIHtcblx0XHRcdFx0eCA9IHByb21pc2VzW2ldO1xuXHRcdFx0XHRpZih4ID09PSB2b2lkIDAgJiYgIShpIGluIHByb21pc2VzKSkge1xuXHRcdFx0XHRcdC0tcGVuZGluZztcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGggPSBQcm9taXNlLl9oYW5kbGVyKHgpO1xuXHRcdFx0XHRpZihoLnN0YXRlKCkgPiAwKSB7XG5cdFx0XHRcdFx0cmVzb2x2ZXIuYmVjb21lKGgpO1xuXHRcdFx0XHRcdFByb21pc2UuX3Zpc2l0UmVtYWluaW5nKHByb21pc2VzLCBpLCBoKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRoLnZpc2l0KHJlc29sdmVyLCBoYW5kbGVGdWxmaWxsLCBoYW5kbGVSZWplY3QpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmKHBlbmRpbmcgPT09IDApIHtcblx0XHRcdFx0cmVzb2x2ZXIucmVqZWN0KG5ldyBSYW5nZUVycm9yKCdhbnkoKTogYXJyYXkgbXVzdCBub3QgYmUgZW1wdHknKSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBwO1xuXG5cdFx0XHRmdW5jdGlvbiBoYW5kbGVGdWxmaWxsKHgpIHtcblx0XHRcdFx0Lypqc2hpbnQgdmFsaWR0aGlzOnRydWUqL1xuXHRcdFx0XHRlcnJvcnMgPSBudWxsO1xuXHRcdFx0XHR0aGlzLnJlc29sdmUoeCk7IC8vIHRoaXMgPT09IHJlc29sdmVyXG5cdFx0XHR9XG5cblx0XHRcdGZ1bmN0aW9uIGhhbmRsZVJlamVjdChlKSB7XG5cdFx0XHRcdC8qanNoaW50IHZhbGlkdGhpczp0cnVlKi9cblx0XHRcdFx0aWYodGhpcy5yZXNvbHZlZCkgeyAvLyB0aGlzID09PSByZXNvbHZlclxuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGVycm9ycy5wdXNoKGUpO1xuXHRcdFx0XHRpZigtLXBlbmRpbmcgPT09IDApIHtcblx0XHRcdFx0XHR0aGlzLnJlamVjdChlcnJvcnMpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogTi13aW5uZXIgY29tcGV0aXRpdmUgcmFjZVxuXHRcdCAqIFJldHVybiBhIHByb21pc2UgdGhhdCB3aWxsIGZ1bGZpbGwgd2hlbiBuIGlucHV0IHByb21pc2VzIGhhdmVcblx0XHQgKiBmdWxmaWxsZWQsIG9yIHdpbGwgcmVqZWN0IHdoZW4gaXQgYmVjb21lcyBpbXBvc3NpYmxlIGZvciBuXG5cdFx0ICogaW5wdXQgcHJvbWlzZXMgdG8gZnVsZmlsbCAoaWUgd2hlbiBwcm9taXNlcy5sZW5ndGggLSBuICsgMVxuXHRcdCAqIGhhdmUgcmVqZWN0ZWQpXG5cdFx0ICogQHBhcmFtIHthcnJheX0gcHJvbWlzZXNcblx0XHQgKiBAcGFyYW0ge251bWJlcn0gblxuXHRcdCAqIEByZXR1cm5zIHtQcm9taXNlfSBwcm9taXNlIGZvciB0aGUgZWFybGllc3QgbiBmdWxmaWxsbWVudCB2YWx1ZXNcblx0XHQgKlxuXHRcdCAqIEBkZXByZWNhdGVkXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gc29tZShwcm9taXNlcywgbikge1xuXHRcdFx0Lypqc2hpbnQgbWF4Y29tcGxleGl0eTo3Ki9cblx0XHRcdHZhciBwID0gUHJvbWlzZS5fZGVmZXIoKTtcblx0XHRcdHZhciByZXNvbHZlciA9IHAuX2hhbmRsZXI7XG5cblx0XHRcdHZhciByZXN1bHRzID0gW107XG5cdFx0XHR2YXIgZXJyb3JzID0gW107XG5cblx0XHRcdHZhciBsID0gcHJvbWlzZXMubGVuZ3RoPj4+MDtcblx0XHRcdHZhciBuRnVsZmlsbCA9IDA7XG5cdFx0XHR2YXIgblJlamVjdDtcblx0XHRcdHZhciB4LCBpOyAvLyByZXVzZWQgaW4gYm90aCBmb3IoKSBsb29wc1xuXG5cdFx0XHQvLyBGaXJzdCBwYXNzOiBjb3VudCBhY3R1YWwgYXJyYXkgaXRlbXNcblx0XHRcdGZvcihpPTA7IGk8bDsgKytpKSB7XG5cdFx0XHRcdHggPSBwcm9taXNlc1tpXTtcblx0XHRcdFx0aWYoeCA9PT0gdm9pZCAwICYmICEoaSBpbiBwcm9taXNlcykpIHtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHQrK25GdWxmaWxsO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBDb21wdXRlIGFjdHVhbCBnb2Fsc1xuXHRcdFx0biA9IE1hdGgubWF4KG4sIDApO1xuXHRcdFx0blJlamVjdCA9IChuRnVsZmlsbCAtIG4gKyAxKTtcblx0XHRcdG5GdWxmaWxsID0gTWF0aC5taW4obiwgbkZ1bGZpbGwpO1xuXG5cdFx0XHRpZihuID4gbkZ1bGZpbGwpIHtcblx0XHRcdFx0cmVzb2x2ZXIucmVqZWN0KG5ldyBSYW5nZUVycm9yKCdzb21lKCk6IGFycmF5IG11c3QgY29udGFpbiBhdCBsZWFzdCAnXG5cdFx0XHRcdCsgbiArICcgaXRlbShzKSwgYnV0IGhhZCAnICsgbkZ1bGZpbGwpKTtcblx0XHRcdH0gZWxzZSBpZihuRnVsZmlsbCA9PT0gMCkge1xuXHRcdFx0XHRyZXNvbHZlci5yZXNvbHZlKHJlc3VsdHMpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBTZWNvbmQgcGFzczogb2JzZXJ2ZSBlYWNoIGFycmF5IGl0ZW0sIG1ha2UgcHJvZ3Jlc3MgdG93YXJkIGdvYWxzXG5cdFx0XHRmb3IoaT0wOyBpPGw7ICsraSkge1xuXHRcdFx0XHR4ID0gcHJvbWlzZXNbaV07XG5cdFx0XHRcdGlmKHggPT09IHZvaWQgMCAmJiAhKGkgaW4gcHJvbWlzZXMpKSB7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRQcm9taXNlLl9oYW5kbGVyKHgpLnZpc2l0KHJlc29sdmVyLCBmdWxmaWxsLCByZWplY3QsIHJlc29sdmVyLm5vdGlmeSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBwO1xuXG5cdFx0XHRmdW5jdGlvbiBmdWxmaWxsKHgpIHtcblx0XHRcdFx0Lypqc2hpbnQgdmFsaWR0aGlzOnRydWUqL1xuXHRcdFx0XHRpZih0aGlzLnJlc29sdmVkKSB7IC8vIHRoaXMgPT09IHJlc29sdmVyXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmVzdWx0cy5wdXNoKHgpO1xuXHRcdFx0XHRpZigtLW5GdWxmaWxsID09PSAwKSB7XG5cdFx0XHRcdFx0ZXJyb3JzID0gbnVsbDtcblx0XHRcdFx0XHR0aGlzLnJlc29sdmUocmVzdWx0cyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0ZnVuY3Rpb24gcmVqZWN0KGUpIHtcblx0XHRcdFx0Lypqc2hpbnQgdmFsaWR0aGlzOnRydWUqL1xuXHRcdFx0XHRpZih0aGlzLnJlc29sdmVkKSB7IC8vIHRoaXMgPT09IHJlc29sdmVyXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZXJyb3JzLnB1c2goZSk7XG5cdFx0XHRcdGlmKC0tblJlamVjdCA9PT0gMCkge1xuXHRcdFx0XHRcdHJlc3VsdHMgPSBudWxsO1xuXHRcdFx0XHRcdHRoaXMucmVqZWN0KGVycm9ycyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBBcHBseSBmIHRvIHRoZSB2YWx1ZSBvZiBlYWNoIHByb21pc2UgaW4gYSBsaXN0IG9mIHByb21pc2VzXG5cdFx0ICogYW5kIHJldHVybiBhIG5ldyBsaXN0IGNvbnRhaW5pbmcgdGhlIHJlc3VsdHMuXG5cdFx0ICogQHBhcmFtIHthcnJheX0gcHJvbWlzZXNcblx0XHQgKiBAcGFyYW0ge2Z1bmN0aW9uKHg6KiwgaW5kZXg6TnVtYmVyKToqfSBmIG1hcHBpbmcgZnVuY3Rpb25cblx0XHQgKiBAcmV0dXJucyB7UHJvbWlzZX1cblx0XHQgKi9cblx0XHRmdW5jdGlvbiBtYXAocHJvbWlzZXMsIGYpIHtcblx0XHRcdHJldHVybiBQcm9taXNlLl90cmF2ZXJzZShmLCBwcm9taXNlcyk7XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogRmlsdGVyIHRoZSBwcm92aWRlZCBhcnJheSBvZiBwcm9taXNlcyB1c2luZyB0aGUgcHJvdmlkZWQgcHJlZGljYXRlLiAgSW5wdXQgbWF5XG5cdFx0ICogY29udGFpbiBwcm9taXNlcyBhbmQgdmFsdWVzXG5cdFx0ICogQHBhcmFtIHtBcnJheX0gcHJvbWlzZXMgYXJyYXkgb2YgcHJvbWlzZXMgYW5kIHZhbHVlc1xuXHRcdCAqIEBwYXJhbSB7ZnVuY3Rpb24oeDoqLCBpbmRleDpOdW1iZXIpOmJvb2xlYW59IHByZWRpY2F0ZSBmaWx0ZXJpbmcgcHJlZGljYXRlLlxuXHRcdCAqICBNdXN0IHJldHVybiB0cnV0aHkgKG9yIHByb21pc2UgZm9yIHRydXRoeSkgZm9yIGl0ZW1zIHRvIHJldGFpbi5cblx0XHQgKiBAcmV0dXJucyB7UHJvbWlzZX0gcHJvbWlzZSB0aGF0IHdpbGwgZnVsZmlsbCB3aXRoIGFuIGFycmF5IGNvbnRhaW5pbmcgYWxsIGl0ZW1zXG5cdFx0ICogIGZvciB3aGljaCBwcmVkaWNhdGUgcmV0dXJuZWQgdHJ1dGh5LlxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGZpbHRlcihwcm9taXNlcywgcHJlZGljYXRlKSB7XG5cdFx0XHR2YXIgYSA9IHNsaWNlLmNhbGwocHJvbWlzZXMpO1xuXHRcdFx0cmV0dXJuIFByb21pc2UuX3RyYXZlcnNlKHByZWRpY2F0ZSwgYSkudGhlbihmdW5jdGlvbihrZWVwKSB7XG5cdFx0XHRcdHJldHVybiBmaWx0ZXJTeW5jKGEsIGtlZXApO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZmlsdGVyU3luYyhwcm9taXNlcywga2VlcCkge1xuXHRcdFx0Ly8gU2FmZSBiZWNhdXNlIHdlIGtub3cgYWxsIHByb21pc2VzIGhhdmUgZnVsZmlsbGVkIGlmIHdlJ3ZlIG1hZGUgaXQgdGhpcyBmYXJcblx0XHRcdHZhciBsID0ga2VlcC5sZW5ndGg7XG5cdFx0XHR2YXIgZmlsdGVyZWQgPSBuZXcgQXJyYXkobCk7XG5cdFx0XHRmb3IodmFyIGk9MCwgaj0wOyBpPGw7ICsraSkge1xuXHRcdFx0XHRpZihrZWVwW2ldKSB7XG5cdFx0XHRcdFx0ZmlsdGVyZWRbaisrXSA9IFByb21pc2UuX2hhbmRsZXIocHJvbWlzZXNbaV0pLnZhbHVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRmaWx0ZXJlZC5sZW5ndGggPSBqO1xuXHRcdFx0cmV0dXJuIGZpbHRlcmVkO1xuXG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogUmV0dXJuIGEgcHJvbWlzZSB0aGF0IHdpbGwgYWx3YXlzIGZ1bGZpbGwgd2l0aCBhbiBhcnJheSBjb250YWluaW5nXG5cdFx0ICogdGhlIG91dGNvbWUgc3RhdGVzIG9mIGFsbCBpbnB1dCBwcm9taXNlcy4gIFRoZSByZXR1cm5lZCBwcm9taXNlXG5cdFx0ICogd2lsbCBuZXZlciByZWplY3QuXG5cdFx0ICogQHBhcmFtIHtBcnJheX0gcHJvbWlzZXNcblx0XHQgKiBAcmV0dXJucyB7UHJvbWlzZX0gcHJvbWlzZSBmb3IgYXJyYXkgb2Ygc2V0dGxlZCBzdGF0ZSBkZXNjcmlwdG9yc1xuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIHNldHRsZShwcm9taXNlcykge1xuXHRcdFx0cmV0dXJuIGFsbChwcm9taXNlcy5tYXAoc2V0dGxlT25lKSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc2V0dGxlT25lKHApIHtcblx0XHRcdHZhciBoID0gUHJvbWlzZS5faGFuZGxlcihwKTtcblx0XHRcdGlmKGguc3RhdGUoKSA9PT0gMCkge1xuXHRcdFx0XHRyZXR1cm4gdG9Qcm9taXNlKHApLnRoZW4oc3RhdGUuZnVsZmlsbGVkLCBzdGF0ZS5yZWplY3RlZCk7XG5cdFx0XHR9XG5cblx0XHRcdGguX3VucmVwb3J0KCk7XG5cdFx0XHRyZXR1cm4gc3RhdGUuaW5zcGVjdChoKTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBUcmFkaXRpb25hbCByZWR1Y2UgZnVuY3Rpb24sIHNpbWlsYXIgdG8gYEFycmF5LnByb3RvdHlwZS5yZWR1Y2UoKWAsIGJ1dFxuXHRcdCAqIGlucHV0IG1heSBjb250YWluIHByb21pc2VzIGFuZC9vciB2YWx1ZXMsIGFuZCByZWR1Y2VGdW5jXG5cdFx0ICogbWF5IHJldHVybiBlaXRoZXIgYSB2YWx1ZSBvciBhIHByb21pc2UsICphbmQqIGluaXRpYWxWYWx1ZSBtYXlcblx0XHQgKiBiZSBhIHByb21pc2UgZm9yIHRoZSBzdGFydGluZyB2YWx1ZS5cblx0XHQgKiBAcGFyYW0ge0FycmF5fFByb21pc2V9IHByb21pc2VzIGFycmF5IG9yIHByb21pc2UgZm9yIGFuIGFycmF5IG9mIGFueXRoaW5nLFxuXHRcdCAqICAgICAgbWF5IGNvbnRhaW4gYSBtaXggb2YgcHJvbWlzZXMgYW5kIHZhbHVlcy5cblx0XHQgKiBAcGFyYW0ge2Z1bmN0aW9uKGFjY3VtdWxhdGVkOiosIHg6KiwgaW5kZXg6TnVtYmVyKToqfSBmIHJlZHVjZSBmdW5jdGlvblxuXHRcdCAqIEByZXR1cm5zIHtQcm9taXNlfSB0aGF0IHdpbGwgcmVzb2x2ZSB0byB0aGUgZmluYWwgcmVkdWNlZCB2YWx1ZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIHJlZHVjZShwcm9taXNlcywgZiAvKiwgaW5pdGlhbFZhbHVlICovKSB7XG5cdFx0XHRyZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA+IDIgPyBhci5jYWxsKHByb21pc2VzLCBsaWZ0Q29tYmluZShmKSwgYXJndW1lbnRzWzJdKVxuXHRcdFx0XHRcdDogYXIuY2FsbChwcm9taXNlcywgbGlmdENvbWJpbmUoZikpO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIFRyYWRpdGlvbmFsIHJlZHVjZSBmdW5jdGlvbiwgc2ltaWxhciB0byBgQXJyYXkucHJvdG90eXBlLnJlZHVjZVJpZ2h0KClgLCBidXRcblx0XHQgKiBpbnB1dCBtYXkgY29udGFpbiBwcm9taXNlcyBhbmQvb3IgdmFsdWVzLCBhbmQgcmVkdWNlRnVuY1xuXHRcdCAqIG1heSByZXR1cm4gZWl0aGVyIGEgdmFsdWUgb3IgYSBwcm9taXNlLCAqYW5kKiBpbml0aWFsVmFsdWUgbWF5XG5cdFx0ICogYmUgYSBwcm9taXNlIGZvciB0aGUgc3RhcnRpbmcgdmFsdWUuXG5cdFx0ICogQHBhcmFtIHtBcnJheXxQcm9taXNlfSBwcm9taXNlcyBhcnJheSBvciBwcm9taXNlIGZvciBhbiBhcnJheSBvZiBhbnl0aGluZyxcblx0XHQgKiAgICAgIG1heSBjb250YWluIGEgbWl4IG9mIHByb21pc2VzIGFuZCB2YWx1ZXMuXG5cdFx0ICogQHBhcmFtIHtmdW5jdGlvbihhY2N1bXVsYXRlZDoqLCB4OiosIGluZGV4Ok51bWJlcik6Kn0gZiByZWR1Y2UgZnVuY3Rpb25cblx0XHQgKiBAcmV0dXJucyB7UHJvbWlzZX0gdGhhdCB3aWxsIHJlc29sdmUgdG8gdGhlIGZpbmFsIHJlZHVjZWQgdmFsdWVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiByZWR1Y2VSaWdodChwcm9taXNlcywgZiAvKiwgaW5pdGlhbFZhbHVlICovKSB7XG5cdFx0XHRyZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA+IDIgPyBhcnIuY2FsbChwcm9taXNlcywgbGlmdENvbWJpbmUoZiksIGFyZ3VtZW50c1syXSlcblx0XHRcdFx0XHQ6IGFyci5jYWxsKHByb21pc2VzLCBsaWZ0Q29tYmluZShmKSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gbGlmdENvbWJpbmUoZikge1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uKHosIHgsIGkpIHtcblx0XHRcdFx0cmV0dXJuIGFwcGx5Rm9sZChmLCB2b2lkIDAsIFt6LHgsaV0pO1xuXHRcdFx0fTtcblx0XHR9XG5cdH07XG5cbn0pO1xufSh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUgOiBmdW5jdGlvbihmYWN0b3J5KSB7IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKTsgfSkpO1xuIiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbihmdW5jdGlvbihkZWZpbmUpIHsgJ3VzZSBzdHJpY3QnO1xuZGVmaW5lKGZ1bmN0aW9uKCkge1xuXG5cdHJldHVybiBmdW5jdGlvbiBmbG93KFByb21pc2UpIHtcblxuXHRcdHZhciByZXNvbHZlID0gUHJvbWlzZS5yZXNvbHZlO1xuXHRcdHZhciByZWplY3QgPSBQcm9taXNlLnJlamVjdDtcblx0XHR2YXIgb3JpZ0NhdGNoID0gUHJvbWlzZS5wcm90b3R5cGVbJ2NhdGNoJ107XG5cblx0XHQvKipcblx0XHQgKiBIYW5kbGUgdGhlIHVsdGltYXRlIGZ1bGZpbGxtZW50IHZhbHVlIG9yIHJlamVjdGlvbiByZWFzb24sIGFuZCBhc3N1bWVcblx0XHQgKiByZXNwb25zaWJpbGl0eSBmb3IgYWxsIGVycm9ycy4gIElmIGFuIGVycm9yIHByb3BhZ2F0ZXMgb3V0IG9mIHJlc3VsdFxuXHRcdCAqIG9yIGhhbmRsZUZhdGFsRXJyb3IsIGl0IHdpbGwgYmUgcmV0aHJvd24gdG8gdGhlIGhvc3QsIHJlc3VsdGluZyBpbiBhXG5cdFx0ICogbG91ZCBzdGFjayB0cmFjayBvbiBtb3N0IHBsYXRmb3JtcyBhbmQgYSBjcmFzaCBvbiBzb21lLlxuXHRcdCAqIEBwYXJhbSB7ZnVuY3Rpb24/fSBvblJlc3VsdFxuXHRcdCAqIEBwYXJhbSB7ZnVuY3Rpb24/fSBvbkVycm9yXG5cdFx0ICogQHJldHVybnMge3VuZGVmaW5lZH1cblx0XHQgKi9cblx0XHRQcm9taXNlLnByb3RvdHlwZS5kb25lID0gZnVuY3Rpb24ob25SZXN1bHQsIG9uRXJyb3IpIHtcblx0XHRcdHRoaXMuX2hhbmRsZXIudmlzaXQodGhpcy5faGFuZGxlci5yZWNlaXZlciwgb25SZXN1bHQsIG9uRXJyb3IpO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBBZGQgRXJyb3ItdHlwZSBhbmQgcHJlZGljYXRlIG1hdGNoaW5nIHRvIGNhdGNoLiAgRXhhbXBsZXM6XG5cdFx0ICogcHJvbWlzZS5jYXRjaChUeXBlRXJyb3IsIGhhbmRsZVR5cGVFcnJvcilcblx0XHQgKiAgIC5jYXRjaChwcmVkaWNhdGUsIGhhbmRsZU1hdGNoZWRFcnJvcnMpXG5cdFx0ICogICAuY2F0Y2goaGFuZGxlUmVtYWluaW5nRXJyb3JzKVxuXHRcdCAqIEBwYXJhbSBvblJlamVjdGVkXG5cdFx0ICogQHJldHVybnMgeyp9XG5cdFx0ICovXG5cdFx0UHJvbWlzZS5wcm90b3R5cGVbJ2NhdGNoJ10gPSBQcm9taXNlLnByb3RvdHlwZS5vdGhlcndpc2UgPSBmdW5jdGlvbihvblJlamVjdGVkKSB7XG5cdFx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcblx0XHRcdFx0cmV0dXJuIG9yaWdDYXRjaC5jYWxsKHRoaXMsIG9uUmVqZWN0ZWQpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZih0eXBlb2Ygb25SZWplY3RlZCAhPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5lbnN1cmUocmVqZWN0SW52YWxpZFByZWRpY2F0ZSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBvcmlnQ2F0Y2guY2FsbCh0aGlzLCBjcmVhdGVDYXRjaEZpbHRlcihhcmd1bWVudHNbMV0sIG9uUmVqZWN0ZWQpKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogV3JhcHMgdGhlIHByb3ZpZGVkIGNhdGNoIGhhbmRsZXIsIHNvIHRoYXQgaXQgd2lsbCBvbmx5IGJlIGNhbGxlZFxuXHRcdCAqIGlmIHRoZSBwcmVkaWNhdGUgZXZhbHVhdGVzIHRydXRoeVxuXHRcdCAqIEBwYXJhbSB7P2Z1bmN0aW9ufSBoYW5kbGVyXG5cdFx0ICogQHBhcmFtIHtmdW5jdGlvbn0gcHJlZGljYXRlXG5cdFx0ICogQHJldHVybnMge2Z1bmN0aW9ufSBjb25kaXRpb25hbCBjYXRjaCBoYW5kbGVyXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gY3JlYXRlQ2F0Y2hGaWx0ZXIoaGFuZGxlciwgcHJlZGljYXRlKSB7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRyZXR1cm4gZXZhbHVhdGVQcmVkaWNhdGUoZSwgcHJlZGljYXRlKVxuXHRcdFx0XHRcdD8gaGFuZGxlci5jYWxsKHRoaXMsIGUpXG5cdFx0XHRcdFx0OiByZWplY3QoZSk7XG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIEVuc3VyZXMgdGhhdCBvbkZ1bGZpbGxlZE9yUmVqZWN0ZWQgd2lsbCBiZSBjYWxsZWQgcmVnYXJkbGVzcyBvZiB3aGV0aGVyXG5cdFx0ICogdGhpcyBwcm9taXNlIGlzIGZ1bGZpbGxlZCBvciByZWplY3RlZC4gIG9uRnVsZmlsbGVkT3JSZWplY3RlZCBXSUxMIE5PVFxuXHRcdCAqIHJlY2VpdmUgdGhlIHByb21pc2VzJyB2YWx1ZSBvciByZWFzb24uICBBbnkgcmV0dXJuZWQgdmFsdWUgd2lsbCBiZSBkaXNyZWdhcmRlZC5cblx0XHQgKiBvbkZ1bGZpbGxlZE9yUmVqZWN0ZWQgbWF5IHRocm93IG9yIHJldHVybiBhIHJlamVjdGVkIHByb21pc2UgdG8gc2lnbmFsXG5cdFx0ICogYW4gYWRkaXRpb25hbCBlcnJvci5cblx0XHQgKiBAcGFyYW0ge2Z1bmN0aW9ufSBoYW5kbGVyIGhhbmRsZXIgdG8gYmUgY2FsbGVkIHJlZ2FyZGxlc3Mgb2Zcblx0XHQgKiAgZnVsZmlsbG1lbnQgb3IgcmVqZWN0aW9uXG5cdFx0ICogQHJldHVybnMge1Byb21pc2V9XG5cdFx0ICovXG5cdFx0UHJvbWlzZS5wcm90b3R5cGVbJ2ZpbmFsbHknXSA9IFByb21pc2UucHJvdG90eXBlLmVuc3VyZSA9IGZ1bmN0aW9uKGhhbmRsZXIpIHtcblx0XHRcdGlmKHR5cGVvZiBoYW5kbGVyICE9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdGhpcy50aGVuKGZ1bmN0aW9uKHgpIHtcblx0XHRcdFx0cmV0dXJuIHJ1blNpZGVFZmZlY3QoaGFuZGxlciwgdGhpcywgaWRlbnRpdHksIHgpO1xuXHRcdFx0fSwgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRyZXR1cm4gcnVuU2lkZUVmZmVjdChoYW5kbGVyLCB0aGlzLCByZWplY3QsIGUpO1xuXHRcdFx0fSk7XG5cdFx0fTtcblxuXHRcdGZ1bmN0aW9uIHJ1blNpZGVFZmZlY3QgKGhhbmRsZXIsIHRoaXNBcmcsIHByb3BhZ2F0ZSwgdmFsdWUpIHtcblx0XHRcdHZhciByZXN1bHQgPSBoYW5kbGVyLmNhbGwodGhpc0FyZyk7XG5cdFx0XHRyZXR1cm4gbWF5YmVUaGVuYWJsZShyZXN1bHQpXG5cdFx0XHRcdD8gcHJvcGFnYXRlVmFsdWUocmVzdWx0LCBwcm9wYWdhdGUsIHZhbHVlKVxuXHRcdFx0XHQ6IHByb3BhZ2F0ZSh2YWx1ZSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcHJvcGFnYXRlVmFsdWUgKHJlc3VsdCwgcHJvcGFnYXRlLCB4KSB7XG5cdFx0XHRyZXR1cm4gcmVzb2x2ZShyZXN1bHQpLnRoZW4oZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gcHJvcGFnYXRlKHgpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogUmVjb3ZlciBmcm9tIGEgZmFpbHVyZSBieSByZXR1cm5pbmcgYSBkZWZhdWx0VmFsdWUuICBJZiBkZWZhdWx0VmFsdWVcblx0XHQgKiBpcyBhIHByb21pc2UsIGl0J3MgZnVsZmlsbG1lbnQgdmFsdWUgd2lsbCBiZSB1c2VkLiAgSWYgZGVmYXVsdFZhbHVlIGlzXG5cdFx0ICogYSBwcm9taXNlIHRoYXQgcmVqZWN0cywgdGhlIHJldHVybmVkIHByb21pc2Ugd2lsbCByZWplY3Qgd2l0aCB0aGVcblx0XHQgKiBzYW1lIHJlYXNvbi5cblx0XHQgKiBAcGFyYW0geyp9IGRlZmF1bHRWYWx1ZVxuXHRcdCAqIEByZXR1cm5zIHtQcm9taXNlfSBuZXcgcHJvbWlzZVxuXHRcdCAqL1xuXHRcdFByb21pc2UucHJvdG90eXBlWydlbHNlJ10gPSBQcm9taXNlLnByb3RvdHlwZS5vckVsc2UgPSBmdW5jdGlvbihkZWZhdWx0VmFsdWUpIHtcblx0XHRcdHJldHVybiB0aGlzLnRoZW4odm9pZCAwLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGRlZmF1bHRWYWx1ZTtcblx0XHRcdH0pO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBTaG9ydGN1dCBmb3IgLnRoZW4oZnVuY3Rpb24oKSB7IHJldHVybiB2YWx1ZTsgfSlcblx0XHQgKiBAcGFyYW0gIHsqfSB2YWx1ZVxuXHRcdCAqIEByZXR1cm4ge1Byb21pc2V9IGEgcHJvbWlzZSB0aGF0OlxuXHRcdCAqICAtIGlzIGZ1bGZpbGxlZCBpZiB2YWx1ZSBpcyBub3QgYSBwcm9taXNlLCBvclxuXHRcdCAqICAtIGlmIHZhbHVlIGlzIGEgcHJvbWlzZSwgd2lsbCBmdWxmaWxsIHdpdGggaXRzIHZhbHVlLCBvciByZWplY3Rcblx0XHQgKiAgICB3aXRoIGl0cyByZWFzb24uXG5cdFx0ICovXG5cdFx0UHJvbWlzZS5wcm90b3R5cGVbJ3lpZWxkJ10gPSBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0cmV0dXJuIHRoaXMudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIHZhbHVlO1xuXHRcdFx0fSk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFJ1bnMgYSBzaWRlIGVmZmVjdCB3aGVuIHRoaXMgcHJvbWlzZSBmdWxmaWxscywgd2l0aG91dCBjaGFuZ2luZyB0aGVcblx0XHQgKiBmdWxmaWxsbWVudCB2YWx1ZS5cblx0XHQgKiBAcGFyYW0ge2Z1bmN0aW9ufSBvbkZ1bGZpbGxlZFNpZGVFZmZlY3Rcblx0XHQgKiBAcmV0dXJucyB7UHJvbWlzZX1cblx0XHQgKi9cblx0XHRQcm9taXNlLnByb3RvdHlwZS50YXAgPSBmdW5jdGlvbihvbkZ1bGZpbGxlZFNpZGVFZmZlY3QpIHtcblx0XHRcdHJldHVybiB0aGlzLnRoZW4ob25GdWxmaWxsZWRTaWRlRWZmZWN0KVsneWllbGQnXSh0aGlzKTtcblx0XHR9O1xuXG5cdFx0cmV0dXJuIFByb21pc2U7XG5cdH07XG5cblx0ZnVuY3Rpb24gcmVqZWN0SW52YWxpZFByZWRpY2F0ZSgpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdjYXRjaCBwcmVkaWNhdGUgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cdH1cblxuXHRmdW5jdGlvbiBldmFsdWF0ZVByZWRpY2F0ZShlLCBwcmVkaWNhdGUpIHtcblx0XHRyZXR1cm4gaXNFcnJvcihwcmVkaWNhdGUpID8gZSBpbnN0YW5jZW9mIHByZWRpY2F0ZSA6IHByZWRpY2F0ZShlKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGlzRXJyb3IocHJlZGljYXRlKSB7XG5cdFx0cmV0dXJuIHByZWRpY2F0ZSA9PT0gRXJyb3Jcblx0XHRcdHx8IChwcmVkaWNhdGUgIT0gbnVsbCAmJiBwcmVkaWNhdGUucHJvdG90eXBlIGluc3RhbmNlb2YgRXJyb3IpO1xuXHR9XG5cblx0ZnVuY3Rpb24gbWF5YmVUaGVuYWJsZSh4KSB7XG5cdFx0cmV0dXJuICh0eXBlb2YgeCA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIHggPT09ICdmdW5jdGlvbicpICYmIHggIT09IG51bGw7XG5cdH1cblxuXHRmdW5jdGlvbiBpZGVudGl0eSh4KSB7XG5cdFx0cmV0dXJuIHg7XG5cdH1cblxufSk7XG59KHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZSA6IGZ1bmN0aW9uKGZhY3RvcnkpIHsgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7IH0pKTtcbiIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuLyoqIEBhdXRob3IgSmVmZiBFc2NhbGFudGUgKi9cblxuKGZ1bmN0aW9uKGRlZmluZSkgeyAndXNlIHN0cmljdCc7XG5kZWZpbmUoZnVuY3Rpb24oKSB7XG5cblx0cmV0dXJuIGZ1bmN0aW9uIGZvbGQoUHJvbWlzZSkge1xuXG5cdFx0UHJvbWlzZS5wcm90b3R5cGUuZm9sZCA9IGZ1bmN0aW9uKGYsIHopIHtcblx0XHRcdHZhciBwcm9taXNlID0gdGhpcy5fYmVnZXQoKTtcblxuXHRcdFx0dGhpcy5faGFuZGxlci5mb2xkKGZ1bmN0aW9uKHosIHgsIHRvKSB7XG5cdFx0XHRcdFByb21pc2UuX2hhbmRsZXIoeikuZm9sZChmdW5jdGlvbih4LCB6LCB0bykge1xuXHRcdFx0XHRcdHRvLnJlc29sdmUoZi5jYWxsKHRoaXMsIHosIHgpKTtcblx0XHRcdFx0fSwgeCwgdGhpcywgdG8pO1xuXHRcdFx0fSwgeiwgcHJvbWlzZS5faGFuZGxlci5yZWNlaXZlciwgcHJvbWlzZS5faGFuZGxlcik7XG5cblx0XHRcdHJldHVybiBwcm9taXNlO1xuXHRcdH07XG5cblx0XHRyZXR1cm4gUHJvbWlzZTtcblx0fTtcblxufSk7XG59KHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZSA6IGZ1bmN0aW9uKGZhY3RvcnkpIHsgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7IH0pKTtcbiIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG4oZnVuY3Rpb24oZGVmaW5lKSB7ICd1c2Ugc3RyaWN0JztcbmRlZmluZShmdW5jdGlvbihyZXF1aXJlKSB7XG5cblx0dmFyIGluc3BlY3QgPSByZXF1aXJlKCcuLi9zdGF0ZScpLmluc3BlY3Q7XG5cblx0cmV0dXJuIGZ1bmN0aW9uIGluc3BlY3Rpb24oUHJvbWlzZSkge1xuXG5cdFx0UHJvbWlzZS5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIGluc3BlY3QoUHJvbWlzZS5faGFuZGxlcih0aGlzKSk7XG5cdFx0fTtcblxuXHRcdHJldHVybiBQcm9taXNlO1xuXHR9O1xuXG59KTtcbn0odHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lIDogZnVuY3Rpb24oZmFjdG9yeSkgeyBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSk7IH0pKTtcbiIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG4oZnVuY3Rpb24oZGVmaW5lKSB7ICd1c2Ugc3RyaWN0JztcbmRlZmluZShmdW5jdGlvbigpIHtcblxuXHRyZXR1cm4gZnVuY3Rpb24gZ2VuZXJhdGUoUHJvbWlzZSkge1xuXG5cdFx0dmFyIHJlc29sdmUgPSBQcm9taXNlLnJlc29sdmU7XG5cblx0XHRQcm9taXNlLml0ZXJhdGUgPSBpdGVyYXRlO1xuXHRcdFByb21pc2UudW5mb2xkID0gdW5mb2xkO1xuXG5cdFx0cmV0dXJuIFByb21pc2U7XG5cblx0XHQvKipcblx0XHQgKiBAZGVwcmVjYXRlZCBVc2UgZ2l0aHViLmNvbS9jdWpvanMvbW9zdCBzdHJlYW1zIGFuZCBtb3N0Lml0ZXJhdGVcblx0XHQgKiBHZW5lcmF0ZSBhIChwb3RlbnRpYWxseSBpbmZpbml0ZSkgc3RyZWFtIG9mIHByb21pc2VkIHZhbHVlczpcblx0XHQgKiB4LCBmKHgpLCBmKGYoeCkpLCBldGMuIHVudGlsIGNvbmRpdGlvbih4KSByZXR1cm5zIHRydWVcblx0XHQgKiBAcGFyYW0ge2Z1bmN0aW9ufSBmIGZ1bmN0aW9uIHRvIGdlbmVyYXRlIGEgbmV3IHggZnJvbSB0aGUgcHJldmlvdXMgeFxuXHRcdCAqIEBwYXJhbSB7ZnVuY3Rpb259IGNvbmRpdGlvbiBmdW5jdGlvbiB0aGF0LCBnaXZlbiB0aGUgY3VycmVudCB4LCByZXR1cm5zXG5cdFx0ICogIHRydXRoeSB3aGVuIHRoZSBpdGVyYXRlIHNob3VsZCBzdG9wXG5cdFx0ICogQHBhcmFtIHtmdW5jdGlvbn0gaGFuZGxlciBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHZhbHVlIHByb2R1Y2VkIGJ5IGZcblx0XHQgKiBAcGFyYW0geyp8UHJvbWlzZX0geCBzdGFydGluZyB2YWx1ZSwgbWF5IGJlIGEgcHJvbWlzZVxuXHRcdCAqIEByZXR1cm4ge1Byb21pc2V9IHRoZSByZXN1bHQgb2YgdGhlIGxhc3QgY2FsbCB0byBmIGJlZm9yZVxuXHRcdCAqICBjb25kaXRpb24gcmV0dXJucyB0cnVlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gaXRlcmF0ZShmLCBjb25kaXRpb24sIGhhbmRsZXIsIHgpIHtcblx0XHRcdHJldHVybiB1bmZvbGQoZnVuY3Rpb24oeCkge1xuXHRcdFx0XHRyZXR1cm4gW3gsIGYoeCldO1xuXHRcdFx0fSwgY29uZGl0aW9uLCBoYW5kbGVyLCB4KTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBAZGVwcmVjYXRlZCBVc2UgZ2l0aHViLmNvbS9jdWpvanMvbW9zdCBzdHJlYW1zIGFuZCBtb3N0LnVuZm9sZFxuXHRcdCAqIEdlbmVyYXRlIGEgKHBvdGVudGlhbGx5IGluZmluaXRlKSBzdHJlYW0gb2YgcHJvbWlzZWQgdmFsdWVzXG5cdFx0ICogYnkgYXBwbHlpbmcgaGFuZGxlcihnZW5lcmF0b3Ioc2VlZCkpIGl0ZXJhdGl2ZWx5IHVudGlsXG5cdFx0ICogY29uZGl0aW9uKHNlZWQpIHJldHVybnMgdHJ1ZS5cblx0XHQgKiBAcGFyYW0ge2Z1bmN0aW9ufSB1bnNwb29sIGZ1bmN0aW9uIHRoYXQgZ2VuZXJhdGVzIGEgW3ZhbHVlLCBuZXdTZWVkXVxuXHRcdCAqICBnaXZlbiBhIHNlZWQuXG5cdFx0ICogQHBhcmFtIHtmdW5jdGlvbn0gY29uZGl0aW9uIGZ1bmN0aW9uIHRoYXQsIGdpdmVuIHRoZSBjdXJyZW50IHNlZWQsIHJldHVybnNcblx0XHQgKiAgdHJ1dGh5IHdoZW4gdGhlIHVuZm9sZCBzaG91bGQgc3RvcFxuXHRcdCAqIEBwYXJhbSB7ZnVuY3Rpb259IGhhbmRsZXIgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSB2YWx1ZSBwcm9kdWNlZCBieSB1bnNwb29sXG5cdFx0ICogQHBhcmFtIHggeyp8UHJvbWlzZX0gc3RhcnRpbmcgdmFsdWUsIG1heSBiZSBhIHByb21pc2Vcblx0XHQgKiBAcmV0dXJuIHtQcm9taXNlfSB0aGUgcmVzdWx0IG9mIHRoZSBsYXN0IHZhbHVlIHByb2R1Y2VkIGJ5IHVuc3Bvb2wgYmVmb3JlXG5cdFx0ICogIGNvbmRpdGlvbiByZXR1cm5zIHRydWVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiB1bmZvbGQodW5zcG9vbCwgY29uZGl0aW9uLCBoYW5kbGVyLCB4KSB7XG5cdFx0XHRyZXR1cm4gcmVzb2x2ZSh4KS50aGVuKGZ1bmN0aW9uKHNlZWQpIHtcblx0XHRcdFx0cmV0dXJuIHJlc29sdmUoY29uZGl0aW9uKHNlZWQpKS50aGVuKGZ1bmN0aW9uKGRvbmUpIHtcblx0XHRcdFx0XHRyZXR1cm4gZG9uZSA/IHNlZWQgOiByZXNvbHZlKHVuc3Bvb2woc2VlZCkpLnNwcmVhZChuZXh0KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0ZnVuY3Rpb24gbmV4dChpdGVtLCBuZXdTZWVkKSB7XG5cdFx0XHRcdHJldHVybiByZXNvbHZlKGhhbmRsZXIoaXRlbSkpLnRoZW4oZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHVuZm9sZCh1bnNwb29sLCBjb25kaXRpb24sIGhhbmRsZXIsIG5ld1NlZWQpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cbn0pO1xufSh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUgOiBmdW5jdGlvbihmYWN0b3J5KSB7IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpOyB9KSk7XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuKGZ1bmN0aW9uKGRlZmluZSkgeyAndXNlIHN0cmljdCc7XG5kZWZpbmUoZnVuY3Rpb24oKSB7XG5cblx0cmV0dXJuIGZ1bmN0aW9uIHByb2dyZXNzKFByb21pc2UpIHtcblxuXHRcdC8qKlxuXHRcdCAqIEBkZXByZWNhdGVkXG5cdFx0ICogUmVnaXN0ZXIgYSBwcm9ncmVzcyBoYW5kbGVyIGZvciB0aGlzIHByb21pc2Vcblx0XHQgKiBAcGFyYW0ge2Z1bmN0aW9ufSBvblByb2dyZXNzXG5cdFx0ICogQHJldHVybnMge1Byb21pc2V9XG5cdFx0ICovXG5cdFx0UHJvbWlzZS5wcm90b3R5cGUucHJvZ3Jlc3MgPSBmdW5jdGlvbihvblByb2dyZXNzKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy50aGVuKHZvaWQgMCwgdm9pZCAwLCBvblByb2dyZXNzKTtcblx0XHR9O1xuXG5cdFx0cmV0dXJuIFByb21pc2U7XG5cdH07XG5cbn0pO1xufSh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUgOiBmdW5jdGlvbihmYWN0b3J5KSB7IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpOyB9KSk7XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuKGZ1bmN0aW9uKGRlZmluZSkgeyAndXNlIHN0cmljdCc7XG5kZWZpbmUoZnVuY3Rpb24ocmVxdWlyZSkge1xuXG5cdHZhciBlbnYgPSByZXF1aXJlKCcuLi9lbnYnKTtcblx0dmFyIFRpbWVvdXRFcnJvciA9IHJlcXVpcmUoJy4uL1RpbWVvdXRFcnJvcicpO1xuXG5cdGZ1bmN0aW9uIHNldFRpbWVvdXQoZiwgbXMsIHgsIHkpIHtcblx0XHRyZXR1cm4gZW52LnNldFRpbWVyKGZ1bmN0aW9uKCkge1xuXHRcdFx0Zih4LCB5LCBtcyk7XG5cdFx0fSwgbXMpO1xuXHR9XG5cblx0cmV0dXJuIGZ1bmN0aW9uIHRpbWVkKFByb21pc2UpIHtcblx0XHQvKipcblx0XHQgKiBSZXR1cm4gYSBuZXcgcHJvbWlzZSB3aG9zZSBmdWxmaWxsbWVudCB2YWx1ZSBpcyByZXZlYWxlZCBvbmx5XG5cdFx0ICogYWZ0ZXIgbXMgbWlsbGlzZWNvbmRzXG5cdFx0ICogQHBhcmFtIHtudW1iZXJ9IG1zIG1pbGxpc2Vjb25kc1xuXHRcdCAqIEByZXR1cm5zIHtQcm9taXNlfVxuXHRcdCAqL1xuXHRcdFByb21pc2UucHJvdG90eXBlLmRlbGF5ID0gZnVuY3Rpb24obXMpIHtcblx0XHRcdHZhciBwID0gdGhpcy5fYmVnZXQoKTtcblx0XHRcdHRoaXMuX2hhbmRsZXIuZm9sZChoYW5kbGVEZWxheSwgbXMsIHZvaWQgMCwgcC5faGFuZGxlcik7XG5cdFx0XHRyZXR1cm4gcDtcblx0XHR9O1xuXG5cdFx0ZnVuY3Rpb24gaGFuZGxlRGVsYXkobXMsIHgsIGgpIHtcblx0XHRcdHNldFRpbWVvdXQocmVzb2x2ZURlbGF5LCBtcywgeCwgaCk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcmVzb2x2ZURlbGF5KHgsIGgpIHtcblx0XHRcdGgucmVzb2x2ZSh4KTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBSZXR1cm4gYSBuZXcgcHJvbWlzZSB0aGF0IHJlamVjdHMgYWZ0ZXIgbXMgbWlsbGlzZWNvbmRzIHVubGVzc1xuXHRcdCAqIHRoaXMgcHJvbWlzZSBmdWxmaWxscyBlYXJsaWVyLCBpbiB3aGljaCBjYXNlIHRoZSByZXR1cm5lZCBwcm9taXNlXG5cdFx0ICogZnVsZmlsbHMgd2l0aCB0aGUgc2FtZSB2YWx1ZS5cblx0XHQgKiBAcGFyYW0ge251bWJlcn0gbXMgbWlsbGlzZWNvbmRzXG5cdFx0ICogQHBhcmFtIHtFcnJvcnwqPX0gcmVhc29uIG9wdGlvbmFsIHJlamVjdGlvbiByZWFzb24gdG8gdXNlLCBkZWZhdWx0c1xuXHRcdCAqICAgdG8gYSBUaW1lb3V0RXJyb3IgaWYgbm90IHByb3ZpZGVkXG5cdFx0ICogQHJldHVybnMge1Byb21pc2V9XG5cdFx0ICovXG5cdFx0UHJvbWlzZS5wcm90b3R5cGUudGltZW91dCA9IGZ1bmN0aW9uKG1zLCByZWFzb24pIHtcblx0XHRcdHZhciBwID0gdGhpcy5fYmVnZXQoKTtcblx0XHRcdHZhciBoID0gcC5faGFuZGxlcjtcblxuXHRcdFx0dmFyIHQgPSBzZXRUaW1lb3V0KG9uVGltZW91dCwgbXMsIHJlYXNvbiwgcC5faGFuZGxlcik7XG5cblx0XHRcdHRoaXMuX2hhbmRsZXIudmlzaXQoaCxcblx0XHRcdFx0ZnVuY3Rpb24gb25GdWxmaWxsKHgpIHtcblx0XHRcdFx0XHRlbnYuY2xlYXJUaW1lcih0KTtcblx0XHRcdFx0XHR0aGlzLnJlc29sdmUoeCk7IC8vIHRoaXMgPSBoXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGZ1bmN0aW9uIG9uUmVqZWN0KHgpIHtcblx0XHRcdFx0XHRlbnYuY2xlYXJUaW1lcih0KTtcblx0XHRcdFx0XHR0aGlzLnJlamVjdCh4KTsgLy8gdGhpcyA9IGhcblx0XHRcdFx0fSxcblx0XHRcdFx0aC5ub3RpZnkpO1xuXG5cdFx0XHRyZXR1cm4gcDtcblx0XHR9O1xuXG5cdFx0ZnVuY3Rpb24gb25UaW1lb3V0KHJlYXNvbiwgaCwgbXMpIHtcblx0XHRcdHZhciBlID0gdHlwZW9mIHJlYXNvbiA9PT0gJ3VuZGVmaW5lZCdcblx0XHRcdFx0PyBuZXcgVGltZW91dEVycm9yKCd0aW1lZCBvdXQgYWZ0ZXIgJyArIG1zICsgJ21zJylcblx0XHRcdFx0OiByZWFzb247XG5cdFx0XHRoLnJlamVjdChlKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUHJvbWlzZTtcblx0fTtcblxufSk7XG59KHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZSA6IGZ1bmN0aW9uKGZhY3RvcnkpIHsgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUpOyB9KSk7XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuKGZ1bmN0aW9uKGRlZmluZSkgeyAndXNlIHN0cmljdCc7XG5kZWZpbmUoZnVuY3Rpb24ocmVxdWlyZSkge1xuXG5cdHZhciBzZXRUaW1lciA9IHJlcXVpcmUoJy4uL2VudicpLnNldFRpbWVyO1xuXHR2YXIgZm9ybWF0ID0gcmVxdWlyZSgnLi4vZm9ybWF0Jyk7XG5cblx0cmV0dXJuIGZ1bmN0aW9uIHVuaGFuZGxlZFJlamVjdGlvbihQcm9taXNlKSB7XG5cblx0XHR2YXIgbG9nRXJyb3IgPSBub29wO1xuXHRcdHZhciBsb2dJbmZvID0gbm9vcDtcblx0XHR2YXIgbG9jYWxDb25zb2xlO1xuXG5cdFx0aWYodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHQvLyBBbGlhcyBjb25zb2xlIHRvIHByZXZlbnQgdGhpbmdzIGxpa2UgdWdsaWZ5J3MgZHJvcF9jb25zb2xlIG9wdGlvbiBmcm9tXG5cdFx0XHQvLyByZW1vdmluZyBjb25zb2xlLmxvZy9lcnJvci4gVW5oYW5kbGVkIHJlamVjdGlvbnMgZmFsbCBpbnRvIHRoZSBzYW1lXG5cdFx0XHQvLyBjYXRlZ29yeSBhcyB1bmNhdWdodCBleGNlcHRpb25zLCBhbmQgYnVpbGQgdG9vbHMgc2hvdWxkbid0IHNpbGVuY2UgdGhlbS5cblx0XHRcdGxvY2FsQ29uc29sZSA9IGNvbnNvbGU7XG5cdFx0XHRsb2dFcnJvciA9IHR5cGVvZiBsb2NhbENvbnNvbGUuZXJyb3IgIT09ICd1bmRlZmluZWQnXG5cdFx0XHRcdD8gZnVuY3Rpb24gKGUpIHsgbG9jYWxDb25zb2xlLmVycm9yKGUpOyB9XG5cdFx0XHRcdDogZnVuY3Rpb24gKGUpIHsgbG9jYWxDb25zb2xlLmxvZyhlKTsgfTtcblxuXHRcdFx0bG9nSW5mbyA9IHR5cGVvZiBsb2NhbENvbnNvbGUuaW5mbyAhPT0gJ3VuZGVmaW5lZCdcblx0XHRcdFx0PyBmdW5jdGlvbiAoZSkgeyBsb2NhbENvbnNvbGUuaW5mbyhlKTsgfVxuXHRcdFx0XHQ6IGZ1bmN0aW9uIChlKSB7IGxvY2FsQ29uc29sZS5sb2coZSk7IH07XG5cdFx0fVxuXG5cdFx0UHJvbWlzZS5vblBvdGVudGlhbGx5VW5oYW5kbGVkUmVqZWN0aW9uID0gZnVuY3Rpb24ocmVqZWN0aW9uKSB7XG5cdFx0XHRlbnF1ZXVlKHJlcG9ydCwgcmVqZWN0aW9uKTtcblx0XHR9O1xuXG5cdFx0UHJvbWlzZS5vblBvdGVudGlhbGx5VW5oYW5kbGVkUmVqZWN0aW9uSGFuZGxlZCA9IGZ1bmN0aW9uKHJlamVjdGlvbikge1xuXHRcdFx0ZW5xdWV1ZSh1bnJlcG9ydCwgcmVqZWN0aW9uKTtcblx0XHR9O1xuXG5cdFx0UHJvbWlzZS5vbkZhdGFsUmVqZWN0aW9uID0gZnVuY3Rpb24ocmVqZWN0aW9uKSB7XG5cdFx0XHRlbnF1ZXVlKHRocm93aXQsIHJlamVjdGlvbi52YWx1ZSk7XG5cdFx0fTtcblxuXHRcdHZhciB0YXNrcyA9IFtdO1xuXHRcdHZhciByZXBvcnRlZCA9IFtdO1xuXHRcdHZhciBydW5uaW5nID0gbnVsbDtcblxuXHRcdGZ1bmN0aW9uIHJlcG9ydChyKSB7XG5cdFx0XHRpZighci5oYW5kbGVkKSB7XG5cdFx0XHRcdHJlcG9ydGVkLnB1c2gocik7XG5cdFx0XHRcdGxvZ0Vycm9yKCdQb3RlbnRpYWxseSB1bmhhbmRsZWQgcmVqZWN0aW9uIFsnICsgci5pZCArICddICcgKyBmb3JtYXQuZm9ybWF0RXJyb3Ioci52YWx1ZSkpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHVucmVwb3J0KHIpIHtcblx0XHRcdHZhciBpID0gcmVwb3J0ZWQuaW5kZXhPZihyKTtcblx0XHRcdGlmKGkgPj0gMCkge1xuXHRcdFx0XHRyZXBvcnRlZC5zcGxpY2UoaSwgMSk7XG5cdFx0XHRcdGxvZ0luZm8oJ0hhbmRsZWQgcHJldmlvdXMgcmVqZWN0aW9uIFsnICsgci5pZCArICddICcgKyBmb3JtYXQuZm9ybWF0T2JqZWN0KHIudmFsdWUpKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBlbnF1ZXVlKGYsIHgpIHtcblx0XHRcdHRhc2tzLnB1c2goZiwgeCk7XG5cdFx0XHRpZihydW5uaW5nID09PSBudWxsKSB7XG5cdFx0XHRcdHJ1bm5pbmcgPSBzZXRUaW1lcihmbHVzaCwgMCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZmx1c2goKSB7XG5cdFx0XHRydW5uaW5nID0gbnVsbDtcblx0XHRcdHdoaWxlKHRhc2tzLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0dGFza3Muc2hpZnQoKSh0YXNrcy5zaGlmdCgpKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gUHJvbWlzZTtcblx0fTtcblxuXHRmdW5jdGlvbiB0aHJvd2l0KGUpIHtcblx0XHR0aHJvdyBlO1xuXHR9XG5cblx0ZnVuY3Rpb24gbm9vcCgpIHt9XG5cbn0pO1xufSh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUgOiBmdW5jdGlvbihmYWN0b3J5KSB7IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKTsgfSkpO1xuIiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbihmdW5jdGlvbihkZWZpbmUpIHsgJ3VzZSBzdHJpY3QnO1xuZGVmaW5lKGZ1bmN0aW9uKCkge1xuXG5cdHJldHVybiBmdW5jdGlvbiBhZGRXaXRoKFByb21pc2UpIHtcblx0XHQvKipcblx0XHQgKiBSZXR1cm5zIGEgcHJvbWlzZSB3aG9zZSBoYW5kbGVycyB3aWxsIGJlIGNhbGxlZCB3aXRoIGB0aGlzYCBzZXQgdG9cblx0XHQgKiB0aGUgc3VwcGxpZWQgcmVjZWl2ZXIuICBTdWJzZXF1ZW50IHByb21pc2VzIGRlcml2ZWQgZnJvbSB0aGVcblx0XHQgKiByZXR1cm5lZCBwcm9taXNlIHdpbGwgYWxzbyBoYXZlIHRoZWlyIGhhbmRsZXJzIGNhbGxlZCB3aXRoIHJlY2VpdmVyXG5cdFx0ICogYXMgYHRoaXNgLiBDYWxsaW5nIGB3aXRoYCB3aXRoIHVuZGVmaW5lZCBvciBubyBhcmd1bWVudHMgd2lsbCByZXR1cm5cblx0XHQgKiBhIHByb21pc2Ugd2hvc2UgaGFuZGxlcnMgd2lsbCBhZ2FpbiBiZSBjYWxsZWQgaW4gdGhlIHVzdWFsIFByb21pc2VzL0ErXG5cdFx0ICogd2F5IChubyBgdGhpc2ApIHRodXMgc2FmZWx5IHVuZG9pbmcgYW55IHByZXZpb3VzIGB3aXRoYCBpbiB0aGVcblx0XHQgKiBwcm9taXNlIGNoYWluLlxuXHRcdCAqXG5cdFx0ICogV0FSTklORzogUHJvbWlzZXMgcmV0dXJuZWQgZnJvbSBgd2l0aGAvYHdpdGhUaGlzYCBhcmUgTk9UIFByb21pc2VzL0ErXG5cdFx0ICogY29tcGxpYW50LCBzcGVjaWZpY2FsbHkgdmlvbGF0aW5nIDIuMi41IChodHRwOi8vcHJvbWlzZXNhcGx1cy5jb20vI3BvaW50LTQxKVxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtvYmplY3R9IHJlY2VpdmVyIGB0aGlzYCB2YWx1ZSBmb3IgYWxsIGhhbmRsZXJzIGF0dGFjaGVkIHRvXG5cdFx0ICogIHRoZSByZXR1cm5lZCBwcm9taXNlLlxuXHRcdCAqIEByZXR1cm5zIHtQcm9taXNlfVxuXHRcdCAqL1xuXHRcdFByb21pc2UucHJvdG90eXBlWyd3aXRoJ10gPSBQcm9taXNlLnByb3RvdHlwZS53aXRoVGhpcyA9IGZ1bmN0aW9uKHJlY2VpdmVyKSB7XG5cdFx0XHR2YXIgcCA9IHRoaXMuX2JlZ2V0KCk7XG5cdFx0XHR2YXIgY2hpbGQgPSBwLl9oYW5kbGVyO1xuXHRcdFx0Y2hpbGQucmVjZWl2ZXIgPSByZWNlaXZlcjtcblx0XHRcdHRoaXMuX2hhbmRsZXIuY2hhaW4oY2hpbGQsIHJlY2VpdmVyKTtcblx0XHRcdHJldHVybiBwO1xuXHRcdH07XG5cblx0XHRyZXR1cm4gUHJvbWlzZTtcblx0fTtcblxufSk7XG59KHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZSA6IGZ1bmN0aW9uKGZhY3RvcnkpIHsgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7IH0pKTtcblxuIiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbi8qZ2xvYmFsIHByb2Nlc3MsZG9jdW1lbnQsc2V0VGltZW91dCxjbGVhclRpbWVvdXQsTXV0YXRpb25PYnNlcnZlcixXZWJLaXRNdXRhdGlvbk9ic2VydmVyKi9cbihmdW5jdGlvbihkZWZpbmUpIHsgJ3VzZSBzdHJpY3QnO1xuZGVmaW5lKGZ1bmN0aW9uKHJlcXVpcmUpIHtcblx0Lypqc2hpbnQgbWF4Y29tcGxleGl0eTo2Ki9cblxuXHQvLyBTbmlmZiBcImJlc3RcIiBhc3luYyBzY2hlZHVsaW5nIG9wdGlvblxuXHQvLyBQcmVmZXIgcHJvY2Vzcy5uZXh0VGljayBvciBNdXRhdGlvbk9ic2VydmVyLCB0aGVuIGNoZWNrIGZvclxuXHQvLyBzZXRUaW1lb3V0LCBhbmQgZmluYWxseSB2ZXJ0eCwgc2luY2UgaXRzIHRoZSBvbmx5IGVudiB0aGF0IGRvZXNuJ3Rcblx0Ly8gaGF2ZSBzZXRUaW1lb3V0XG5cblx0dmFyIE11dGF0aW9uT2JzO1xuXHR2YXIgY2FwdHVyZWRTZXRUaW1lb3V0ID0gdHlwZW9mIHNldFRpbWVvdXQgIT09ICd1bmRlZmluZWQnICYmIHNldFRpbWVvdXQ7XG5cblx0Ly8gRGVmYXVsdCBlbnZcblx0dmFyIHNldFRpbWVyID0gZnVuY3Rpb24oZiwgbXMpIHsgcmV0dXJuIHNldFRpbWVvdXQoZiwgbXMpOyB9O1xuXHR2YXIgY2xlYXJUaW1lciA9IGZ1bmN0aW9uKHQpIHsgcmV0dXJuIGNsZWFyVGltZW91dCh0KTsgfTtcblx0dmFyIGFzYXAgPSBmdW5jdGlvbiAoZikgeyByZXR1cm4gY2FwdHVyZWRTZXRUaW1lb3V0KGYsIDApOyB9O1xuXG5cdC8vIERldGVjdCBzcGVjaWZpYyBlbnZcblx0aWYgKGlzTm9kZSgpKSB7IC8vIE5vZGVcblx0XHRhc2FwID0gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHByb2Nlc3MubmV4dFRpY2soZik7IH07XG5cblx0fSBlbHNlIGlmIChNdXRhdGlvbk9icyA9IGhhc011dGF0aW9uT2JzZXJ2ZXIoKSkgeyAvLyBNb2Rlcm4gYnJvd3NlclxuXHRcdGFzYXAgPSBpbml0TXV0YXRpb25PYnNlcnZlcihNdXRhdGlvbk9icyk7XG5cblx0fSBlbHNlIGlmICghY2FwdHVyZWRTZXRUaW1lb3V0KSB7IC8vIHZlcnQueFxuXHRcdHZhciB2ZXJ0eFJlcXVpcmUgPSByZXF1aXJlO1xuXHRcdHZhciB2ZXJ0eCA9IHZlcnR4UmVxdWlyZSgndmVydHgnKTtcblx0XHRzZXRUaW1lciA9IGZ1bmN0aW9uIChmLCBtcykgeyByZXR1cm4gdmVydHguc2V0VGltZXIobXMsIGYpOyB9O1xuXHRcdGNsZWFyVGltZXIgPSB2ZXJ0eC5jYW5jZWxUaW1lcjtcblx0XHRhc2FwID0gdmVydHgucnVuT25Mb29wIHx8IHZlcnR4LnJ1bk9uQ29udGV4dDtcblx0fVxuXG5cdHJldHVybiB7XG5cdFx0c2V0VGltZXI6IHNldFRpbWVyLFxuXHRcdGNsZWFyVGltZXI6IGNsZWFyVGltZXIsXG5cdFx0YXNhcDogYXNhcFxuXHR9O1xuXG5cdGZ1bmN0aW9uIGlzTm9kZSAoKSB7XG5cdFx0cmV0dXJuIHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJlxuXHRcdFx0T2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHByb2Nlc3MpID09PSAnW29iamVjdCBwcm9jZXNzXSc7XG5cdH1cblxuXHRmdW5jdGlvbiBoYXNNdXRhdGlvbk9ic2VydmVyICgpIHtcblx0XHRyZXR1cm4gKHR5cGVvZiBNdXRhdGlvbk9ic2VydmVyID09PSAnZnVuY3Rpb24nICYmIE11dGF0aW9uT2JzZXJ2ZXIpIHx8XG5cdFx0XHQodHlwZW9mIFdlYktpdE11dGF0aW9uT2JzZXJ2ZXIgPT09ICdmdW5jdGlvbicgJiYgV2ViS2l0TXV0YXRpb25PYnNlcnZlcik7XG5cdH1cblxuXHRmdW5jdGlvbiBpbml0TXV0YXRpb25PYnNlcnZlcihNdXRhdGlvbk9ic2VydmVyKSB7XG5cdFx0dmFyIHNjaGVkdWxlZDtcblx0XHR2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcblx0XHR2YXIgbyA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKHJ1bik7XG5cdFx0by5vYnNlcnZlKG5vZGUsIHsgY2hhcmFjdGVyRGF0YTogdHJ1ZSB9KTtcblxuXHRcdGZ1bmN0aW9uIHJ1bigpIHtcblx0XHRcdHZhciBmID0gc2NoZWR1bGVkO1xuXHRcdFx0c2NoZWR1bGVkID0gdm9pZCAwO1xuXHRcdFx0ZigpO1xuXHRcdH1cblxuXHRcdHZhciBpID0gMDtcblx0XHRyZXR1cm4gZnVuY3Rpb24gKGYpIHtcblx0XHRcdHNjaGVkdWxlZCA9IGY7XG5cdFx0XHRub2RlLmRhdGEgPSAoaSBePSAxKTtcblx0XHR9O1xuXHR9XG59KTtcbn0odHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lIDogZnVuY3Rpb24oZmFjdG9yeSkgeyBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSk7IH0pKTtcbiIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG4oZnVuY3Rpb24oZGVmaW5lKSB7ICd1c2Ugc3RyaWN0JztcbmRlZmluZShmdW5jdGlvbigpIHtcblxuXHRyZXR1cm4ge1xuXHRcdGZvcm1hdEVycm9yOiBmb3JtYXRFcnJvcixcblx0XHRmb3JtYXRPYmplY3Q6IGZvcm1hdE9iamVjdCxcblx0XHR0cnlTdHJpbmdpZnk6IHRyeVN0cmluZ2lmeVxuXHR9O1xuXG5cdC8qKlxuXHQgKiBGb3JtYXQgYW4gZXJyb3IgaW50byBhIHN0cmluZy4gIElmIGUgaXMgYW4gRXJyb3IgYW5kIGhhcyBhIHN0YWNrIHByb3BlcnR5LFxuXHQgKiBpdCdzIHJldHVybmVkLiAgT3RoZXJ3aXNlLCBlIGlzIGZvcm1hdHRlZCB1c2luZyBmb3JtYXRPYmplY3QsIHdpdGggYVxuXHQgKiB3YXJuaW5nIGFkZGVkIGFib3V0IGUgbm90IGJlaW5nIGEgcHJvcGVyIEVycm9yLlxuXHQgKiBAcGFyYW0geyp9IGVcblx0ICogQHJldHVybnMge1N0cmluZ30gZm9ybWF0dGVkIHN0cmluZywgc3VpdGFibGUgZm9yIG91dHB1dCB0byBkZXZlbG9wZXJzXG5cdCAqL1xuXHRmdW5jdGlvbiBmb3JtYXRFcnJvcihlKSB7XG5cdFx0dmFyIHMgPSB0eXBlb2YgZSA9PT0gJ29iamVjdCcgJiYgZSAhPT0gbnVsbCAmJiAoZS5zdGFjayB8fCBlLm1lc3NhZ2UpID8gZS5zdGFjayB8fCBlLm1lc3NhZ2UgOiBmb3JtYXRPYmplY3QoZSk7XG5cdFx0cmV0dXJuIGUgaW5zdGFuY2VvZiBFcnJvciA/IHMgOiBzICsgJyAoV0FSTklORzogbm9uLUVycm9yIHVzZWQpJztcblx0fVxuXG5cdC8qKlxuXHQgKiBGb3JtYXQgYW4gb2JqZWN0LCBkZXRlY3RpbmcgXCJwbGFpblwiIG9iamVjdHMgYW5kIHJ1bm5pbmcgdGhlbSB0aHJvdWdoXG5cdCAqIEpTT04uc3RyaW5naWZ5IGlmIHBvc3NpYmxlLlxuXHQgKiBAcGFyYW0ge09iamVjdH0gb1xuXHQgKiBAcmV0dXJucyB7c3RyaW5nfVxuXHQgKi9cblx0ZnVuY3Rpb24gZm9ybWF0T2JqZWN0KG8pIHtcblx0XHR2YXIgcyA9IFN0cmluZyhvKTtcblx0XHRpZihzID09PSAnW29iamVjdCBPYmplY3RdJyAmJiB0eXBlb2YgSlNPTiAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdHMgPSB0cnlTdHJpbmdpZnkobywgcyk7XG5cdFx0fVxuXHRcdHJldHVybiBzO1xuXHR9XG5cblx0LyoqXG5cdCAqIFRyeSB0byByZXR1cm4gdGhlIHJlc3VsdCBvZiBKU09OLnN0cmluZ2lmeSh4KS4gIElmIHRoYXQgZmFpbHMsIHJldHVyblxuXHQgKiBkZWZhdWx0VmFsdWVcblx0ICogQHBhcmFtIHsqfSB4XG5cdCAqIEBwYXJhbSB7Kn0gZGVmYXVsdFZhbHVlXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd8Kn0gSlNPTi5zdHJpbmdpZnkoeCkgb3IgZGVmYXVsdFZhbHVlXG5cdCAqL1xuXHRmdW5jdGlvbiB0cnlTdHJpbmdpZnkoeCwgZGVmYXVsdFZhbHVlKSB7XG5cdFx0dHJ5IHtcblx0XHRcdHJldHVybiBKU09OLnN0cmluZ2lmeSh4KTtcblx0XHR9IGNhdGNoKGUpIHtcblx0XHRcdHJldHVybiBkZWZhdWx0VmFsdWU7XG5cdFx0fVxuXHR9XG5cbn0pO1xufSh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUgOiBmdW5jdGlvbihmYWN0b3J5KSB7IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpOyB9KSk7XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuKGZ1bmN0aW9uKGRlZmluZSkgeyAndXNlIHN0cmljdCc7XG5kZWZpbmUoZnVuY3Rpb24oKSB7XG5cblx0cmV0dXJuIGZ1bmN0aW9uIG1ha2VQcm9taXNlKGVudmlyb25tZW50KSB7XG5cblx0XHR2YXIgdGFza3MgPSBlbnZpcm9ubWVudC5zY2hlZHVsZXI7XG5cdFx0dmFyIGVtaXRSZWplY3Rpb24gPSBpbml0RW1pdFJlamVjdGlvbigpO1xuXG5cdFx0dmFyIG9iamVjdENyZWF0ZSA9IE9iamVjdC5jcmVhdGUgfHxcblx0XHRcdGZ1bmN0aW9uKHByb3RvKSB7XG5cdFx0XHRcdGZ1bmN0aW9uIENoaWxkKCkge31cblx0XHRcdFx0Q2hpbGQucHJvdG90eXBlID0gcHJvdG87XG5cdFx0XHRcdHJldHVybiBuZXcgQ2hpbGQoKTtcblx0XHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBDcmVhdGUgYSBwcm9taXNlIHdob3NlIGZhdGUgaXMgZGV0ZXJtaW5lZCBieSByZXNvbHZlclxuXHRcdCAqIEBjb25zdHJ1Y3RvclxuXHRcdCAqIEByZXR1cm5zIHtQcm9taXNlfSBwcm9taXNlXG5cdFx0ICogQG5hbWUgUHJvbWlzZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIFByb21pc2UocmVzb2x2ZXIsIGhhbmRsZXIpIHtcblx0XHRcdHRoaXMuX2hhbmRsZXIgPSByZXNvbHZlciA9PT0gSGFuZGxlciA/IGhhbmRsZXIgOiBpbml0KHJlc29sdmVyKTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBSdW4gdGhlIHN1cHBsaWVkIHJlc29sdmVyXG5cdFx0ICogQHBhcmFtIHJlc29sdmVyXG5cdFx0ICogQHJldHVybnMge1BlbmRpbmd9XG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gaW5pdChyZXNvbHZlcikge1xuXHRcdFx0dmFyIGhhbmRsZXIgPSBuZXcgUGVuZGluZygpO1xuXG5cdFx0XHR0cnkge1xuXHRcdFx0XHRyZXNvbHZlcihwcm9taXNlUmVzb2x2ZSwgcHJvbWlzZVJlamVjdCwgcHJvbWlzZU5vdGlmeSk7XG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdHByb21pc2VSZWplY3QoZSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBoYW5kbGVyO1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIFRyYW5zaXRpb24gZnJvbSBwcmUtcmVzb2x1dGlvbiBzdGF0ZSB0byBwb3N0LXJlc29sdXRpb24gc3RhdGUsIG5vdGlmeWluZ1xuXHRcdFx0ICogYWxsIGxpc3RlbmVycyBvZiB0aGUgdWx0aW1hdGUgZnVsZmlsbG1lbnQgb3IgcmVqZWN0aW9uXG5cdFx0XHQgKiBAcGFyYW0geyp9IHggcmVzb2x1dGlvbiB2YWx1ZVxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBwcm9taXNlUmVzb2x2ZSAoeCkge1xuXHRcdFx0XHRoYW5kbGVyLnJlc29sdmUoeCk7XG5cdFx0XHR9XG5cdFx0XHQvKipcblx0XHRcdCAqIFJlamVjdCB0aGlzIHByb21pc2Ugd2l0aCByZWFzb24sIHdoaWNoIHdpbGwgYmUgdXNlZCB2ZXJiYXRpbVxuXHRcdFx0ICogQHBhcmFtIHtFcnJvcnwqfSByZWFzb24gcmVqZWN0aW9uIHJlYXNvbiwgc3Ryb25nbHkgc3VnZ2VzdGVkXG5cdFx0XHQgKiAgIHRvIGJlIGFuIEVycm9yIHR5cGVcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gcHJvbWlzZVJlamVjdCAocmVhc29uKSB7XG5cdFx0XHRcdGhhbmRsZXIucmVqZWN0KHJlYXNvbik7XG5cdFx0XHR9XG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQGRlcHJlY2F0ZWRcblx0XHRcdCAqIElzc3VlIGEgcHJvZ3Jlc3MgZXZlbnQsIG5vdGlmeWluZyBhbGwgcHJvZ3Jlc3MgbGlzdGVuZXJzXG5cdFx0XHQgKiBAcGFyYW0geyp9IHggcHJvZ3Jlc3MgZXZlbnQgcGF5bG9hZCB0byBwYXNzIHRvIGFsbCBsaXN0ZW5lcnNcblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gcHJvbWlzZU5vdGlmeSAoeCkge1xuXHRcdFx0XHRoYW5kbGVyLm5vdGlmeSh4KTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBDcmVhdGlvblxuXG5cdFx0UHJvbWlzZS5yZXNvbHZlID0gcmVzb2x2ZTtcblx0XHRQcm9taXNlLnJlamVjdCA9IHJlamVjdDtcblx0XHRQcm9taXNlLm5ldmVyID0gbmV2ZXI7XG5cblx0XHRQcm9taXNlLl9kZWZlciA9IGRlZmVyO1xuXHRcdFByb21pc2UuX2hhbmRsZXIgPSBnZXRIYW5kbGVyO1xuXG5cdFx0LyoqXG5cdFx0ICogUmV0dXJucyBhIHRydXN0ZWQgcHJvbWlzZS4gSWYgeCBpcyBhbHJlYWR5IGEgdHJ1c3RlZCBwcm9taXNlLCBpdCBpc1xuXHRcdCAqIHJldHVybmVkLCBvdGhlcndpc2UgcmV0dXJucyBhIG5ldyB0cnVzdGVkIFByb21pc2Ugd2hpY2ggZm9sbG93cyB4LlxuXHRcdCAqIEBwYXJhbSAgeyp9IHhcblx0XHQgKiBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gcmVzb2x2ZSh4KSB7XG5cdFx0XHRyZXR1cm4gaXNQcm9taXNlKHgpID8geFxuXHRcdFx0XHQ6IG5ldyBQcm9taXNlKEhhbmRsZXIsIG5ldyBBc3luYyhnZXRIYW5kbGVyKHgpKSk7XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogUmV0dXJuIGEgcmVqZWN0IHByb21pc2Ugd2l0aCB4IGFzIGl0cyByZWFzb24gKHggaXMgdXNlZCB2ZXJiYXRpbSlcblx0XHQgKiBAcGFyYW0geyp9IHhcblx0XHQgKiBAcmV0dXJucyB7UHJvbWlzZX0gcmVqZWN0ZWQgcHJvbWlzZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIHJlamVjdCh4KSB7XG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2UoSGFuZGxlciwgbmV3IEFzeW5jKG5ldyBSZWplY3RlZCh4KSkpO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIFJldHVybiBhIHByb21pc2UgdGhhdCByZW1haW5zIHBlbmRpbmcgZm9yZXZlclxuXHRcdCAqIEByZXR1cm5zIHtQcm9taXNlfSBmb3JldmVyLXBlbmRpbmcgcHJvbWlzZS5cblx0XHQgKi9cblx0XHRmdW5jdGlvbiBuZXZlcigpIHtcblx0XHRcdHJldHVybiBmb3JldmVyUGVuZGluZ1Byb21pc2U7IC8vIFNob3VsZCBiZSBmcm96ZW5cblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBDcmVhdGVzIGFuIGludGVybmFsIHtwcm9taXNlLCByZXNvbHZlcn0gcGFpclxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICogQHJldHVybnMge1Byb21pc2V9XG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gZGVmZXIoKSB7XG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2UoSGFuZGxlciwgbmV3IFBlbmRpbmcoKSk7XG5cdFx0fVxuXG5cdFx0Ly8gVHJhbnNmb3JtYXRpb24gYW5kIGZsb3cgY29udHJvbFxuXG5cdFx0LyoqXG5cdFx0ICogVHJhbnNmb3JtIHRoaXMgcHJvbWlzZSdzIGZ1bGZpbGxtZW50IHZhbHVlLCByZXR1cm5pbmcgYSBuZXcgUHJvbWlzZVxuXHRcdCAqIGZvciB0aGUgdHJhbnNmb3JtZWQgcmVzdWx0LiAgSWYgdGhlIHByb21pc2UgY2Fubm90IGJlIGZ1bGZpbGxlZCwgb25SZWplY3RlZFxuXHRcdCAqIGlzIGNhbGxlZCB3aXRoIHRoZSByZWFzb24uICBvblByb2dyZXNzICptYXkqIGJlIGNhbGxlZCB3aXRoIHVwZGF0ZXMgdG93YXJkXG5cdFx0ICogdGhpcyBwcm9taXNlJ3MgZnVsZmlsbG1lbnQuXG5cdFx0ICogQHBhcmFtIHtmdW5jdGlvbj19IG9uRnVsZmlsbGVkIGZ1bGZpbGxtZW50IGhhbmRsZXJcblx0XHQgKiBAcGFyYW0ge2Z1bmN0aW9uPX0gb25SZWplY3RlZCByZWplY3Rpb24gaGFuZGxlclxuXHRcdCAqIEBwYXJhbSB7ZnVuY3Rpb249fSBvblByb2dyZXNzIEBkZXByZWNhdGVkIHByb2dyZXNzIGhhbmRsZXJcblx0XHQgKiBAcmV0dXJuIHtQcm9taXNlfSBuZXcgcHJvbWlzZVxuXHRcdCAqL1xuXHRcdFByb21pc2UucHJvdG90eXBlLnRoZW4gPSBmdW5jdGlvbihvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCwgb25Qcm9ncmVzcykge1xuXHRcdFx0dmFyIHBhcmVudCA9IHRoaXMuX2hhbmRsZXI7XG5cdFx0XHR2YXIgc3RhdGUgPSBwYXJlbnQuam9pbigpLnN0YXRlKCk7XG5cblx0XHRcdGlmICgodHlwZW9mIG9uRnVsZmlsbGVkICE9PSAnZnVuY3Rpb24nICYmIHN0YXRlID4gMCkgfHxcblx0XHRcdFx0KHR5cGVvZiBvblJlamVjdGVkICE9PSAnZnVuY3Rpb24nICYmIHN0YXRlIDwgMCkpIHtcblx0XHRcdFx0Ly8gU2hvcnQgY2lyY3VpdDogdmFsdWUgd2lsbCBub3QgY2hhbmdlLCBzaW1wbHkgc2hhcmUgaGFuZGxlclxuXHRcdFx0XHRyZXR1cm4gbmV3IHRoaXMuY29uc3RydWN0b3IoSGFuZGxlciwgcGFyZW50KTtcblx0XHRcdH1cblxuXHRcdFx0dmFyIHAgPSB0aGlzLl9iZWdldCgpO1xuXHRcdFx0dmFyIGNoaWxkID0gcC5faGFuZGxlcjtcblxuXHRcdFx0cGFyZW50LmNoYWluKGNoaWxkLCBwYXJlbnQucmVjZWl2ZXIsIG9uRnVsZmlsbGVkLCBvblJlamVjdGVkLCBvblByb2dyZXNzKTtcblxuXHRcdFx0cmV0dXJuIHA7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIElmIHRoaXMgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkIGR1ZSB0byBhbiBlcnJvciwgY2FsbCBvblJlamVjdGVkIHRvXG5cdFx0ICogaGFuZGxlIHRoZSBlcnJvci4gU2hvcnRjdXQgZm9yIC50aGVuKHVuZGVmaW5lZCwgb25SZWplY3RlZClcblx0XHQgKiBAcGFyYW0ge2Z1bmN0aW9uP30gb25SZWplY3RlZFxuXHRcdCAqIEByZXR1cm4ge1Byb21pc2V9XG5cdFx0ICovXG5cdFx0UHJvbWlzZS5wcm90b3R5cGVbJ2NhdGNoJ10gPSBmdW5jdGlvbihvblJlamVjdGVkKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy50aGVuKHZvaWQgMCwgb25SZWplY3RlZCk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIENyZWF0ZXMgYSBuZXcsIHBlbmRpbmcgcHJvbWlzZSBvZiB0aGUgc2FtZSB0eXBlIGFzIHRoaXMgcHJvbWlzZVxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICogQHJldHVybnMge1Byb21pc2V9XG5cdFx0ICovXG5cdFx0UHJvbWlzZS5wcm90b3R5cGUuX2JlZ2V0ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gYmVnZXRGcm9tKHRoaXMuX2hhbmRsZXIsIHRoaXMuY29uc3RydWN0b3IpO1xuXHRcdH07XG5cblx0XHRmdW5jdGlvbiBiZWdldEZyb20ocGFyZW50LCBQcm9taXNlKSB7XG5cdFx0XHR2YXIgY2hpbGQgPSBuZXcgUGVuZGluZyhwYXJlbnQucmVjZWl2ZXIsIHBhcmVudC5qb2luKCkuY29udGV4dCk7XG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2UoSGFuZGxlciwgY2hpbGQpO1xuXHRcdH1cblxuXHRcdC8vIEFycmF5IGNvbWJpbmF0b3JzXG5cblx0XHRQcm9taXNlLmFsbCA9IGFsbDtcblx0XHRQcm9taXNlLnJhY2UgPSByYWNlO1xuXHRcdFByb21pc2UuX3RyYXZlcnNlID0gdHJhdmVyc2U7XG5cblx0XHQvKipcblx0XHQgKiBSZXR1cm4gYSBwcm9taXNlIHRoYXQgd2lsbCBmdWxmaWxsIHdoZW4gYWxsIHByb21pc2VzIGluIHRoZVxuXHRcdCAqIGlucHV0IGFycmF5IGhhdmUgZnVsZmlsbGVkLCBvciB3aWxsIHJlamVjdCB3aGVuIG9uZSBvZiB0aGVcblx0XHQgKiBwcm9taXNlcyByZWplY3RzLlxuXHRcdCAqIEBwYXJhbSB7YXJyYXl9IHByb21pc2VzIGFycmF5IG9mIHByb21pc2VzXG5cdFx0ICogQHJldHVybnMge1Byb21pc2V9IHByb21pc2UgZm9yIGFycmF5IG9mIGZ1bGZpbGxtZW50IHZhbHVlc1xuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGFsbChwcm9taXNlcykge1xuXHRcdFx0cmV0dXJuIHRyYXZlcnNlV2l0aChzbmQsIG51bGwsIHByb21pc2VzKTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBBcnJheTxQcm9taXNlPFg+PiAtPiBQcm9taXNlPEFycmF5PGYoWCk+PlxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICogQHBhcmFtIHtmdW5jdGlvbn0gZiBmdW5jdGlvbiB0byBhcHBseSB0byBlYWNoIHByb21pc2UncyB2YWx1ZVxuXHRcdCAqIEBwYXJhbSB7QXJyYXl9IHByb21pc2VzIGFycmF5IG9mIHByb21pc2VzXG5cdFx0ICogQHJldHVybnMge1Byb21pc2V9IHByb21pc2UgZm9yIHRyYW5zZm9ybWVkIHZhbHVlc1xuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIHRyYXZlcnNlKGYsIHByb21pc2VzKSB7XG5cdFx0XHRyZXR1cm4gdHJhdmVyc2VXaXRoKHRyeUNhdGNoMiwgZiwgcHJvbWlzZXMpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHRyYXZlcnNlV2l0aCh0cnlNYXAsIGYsIHByb21pc2VzKSB7XG5cdFx0XHR2YXIgaGFuZGxlciA9IHR5cGVvZiBmID09PSAnZnVuY3Rpb24nID8gbWFwQXQgOiBzZXR0bGVBdDtcblxuXHRcdFx0dmFyIHJlc29sdmVyID0gbmV3IFBlbmRpbmcoKTtcblx0XHRcdHZhciBwZW5kaW5nID0gcHJvbWlzZXMubGVuZ3RoID4+PiAwO1xuXHRcdFx0dmFyIHJlc3VsdHMgPSBuZXcgQXJyYXkocGVuZGluZyk7XG5cblx0XHRcdGZvciAodmFyIGkgPSAwLCB4OyBpIDwgcHJvbWlzZXMubGVuZ3RoICYmICFyZXNvbHZlci5yZXNvbHZlZDsgKytpKSB7XG5cdFx0XHRcdHggPSBwcm9taXNlc1tpXTtcblxuXHRcdFx0XHRpZiAoeCA9PT0gdm9pZCAwICYmICEoaSBpbiBwcm9taXNlcykpIHtcblx0XHRcdFx0XHQtLXBlbmRpbmc7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR0cmF2ZXJzZUF0KHByb21pc2VzLCBoYW5kbGVyLCBpLCB4LCByZXNvbHZlcik7XG5cdFx0XHR9XG5cblx0XHRcdGlmKHBlbmRpbmcgPT09IDApIHtcblx0XHRcdFx0cmVzb2x2ZXIuYmVjb21lKG5ldyBGdWxmaWxsZWQocmVzdWx0cykpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2UoSGFuZGxlciwgcmVzb2x2ZXIpO1xuXG5cdFx0XHRmdW5jdGlvbiBtYXBBdChpLCB4LCByZXNvbHZlcikge1xuXHRcdFx0XHRpZighcmVzb2x2ZXIucmVzb2x2ZWQpIHtcblx0XHRcdFx0XHR0cmF2ZXJzZUF0KHByb21pc2VzLCBzZXR0bGVBdCwgaSwgdHJ5TWFwKGYsIHgsIGkpLCByZXNvbHZlcik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0ZnVuY3Rpb24gc2V0dGxlQXQoaSwgeCwgcmVzb2x2ZXIpIHtcblx0XHRcdFx0cmVzdWx0c1tpXSA9IHg7XG5cdFx0XHRcdGlmKC0tcGVuZGluZyA9PT0gMCkge1xuXHRcdFx0XHRcdHJlc29sdmVyLmJlY29tZShuZXcgRnVsZmlsbGVkKHJlc3VsdHMpKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHRyYXZlcnNlQXQocHJvbWlzZXMsIGhhbmRsZXIsIGksIHgsIHJlc29sdmVyKSB7XG5cdFx0XHRpZiAobWF5YmVUaGVuYWJsZSh4KSkge1xuXHRcdFx0XHR2YXIgaCA9IGdldEhhbmRsZXJNYXliZVRoZW5hYmxlKHgpO1xuXHRcdFx0XHR2YXIgcyA9IGguc3RhdGUoKTtcblxuXHRcdFx0XHRpZiAocyA9PT0gMCkge1xuXHRcdFx0XHRcdGguZm9sZChoYW5kbGVyLCBpLCB2b2lkIDAsIHJlc29sdmVyKTtcblx0XHRcdFx0fSBlbHNlIGlmIChzID4gMCkge1xuXHRcdFx0XHRcdGhhbmRsZXIoaSwgaC52YWx1ZSwgcmVzb2x2ZXIpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJlc29sdmVyLmJlY29tZShoKTtcblx0XHRcdFx0XHR2aXNpdFJlbWFpbmluZyhwcm9taXNlcywgaSsxLCBoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aGFuZGxlcihpLCB4LCByZXNvbHZlcik7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0UHJvbWlzZS5fdmlzaXRSZW1haW5pbmcgPSB2aXNpdFJlbWFpbmluZztcblx0XHRmdW5jdGlvbiB2aXNpdFJlbWFpbmluZyhwcm9taXNlcywgc3RhcnQsIGhhbmRsZXIpIHtcblx0XHRcdGZvcih2YXIgaT1zdGFydDsgaTxwcm9taXNlcy5sZW5ndGg7ICsraSkge1xuXHRcdFx0XHRtYXJrQXNIYW5kbGVkKGdldEhhbmRsZXIocHJvbWlzZXNbaV0pLCBoYW5kbGVyKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBtYXJrQXNIYW5kbGVkKGgsIGhhbmRsZXIpIHtcblx0XHRcdGlmKGggPT09IGhhbmRsZXIpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgcyA9IGguc3RhdGUoKTtcblx0XHRcdGlmKHMgPT09IDApIHtcblx0XHRcdFx0aC52aXNpdChoLCB2b2lkIDAsIGguX3VucmVwb3J0KTtcblx0XHRcdH0gZWxzZSBpZihzIDwgMCkge1xuXHRcdFx0XHRoLl91bnJlcG9ydCgpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIEZ1bGZpbGwtcmVqZWN0IGNvbXBldGl0aXZlIHJhY2UuIFJldHVybiBhIHByb21pc2UgdGhhdCB3aWxsIHNldHRsZVxuXHRcdCAqIHRvIHRoZSBzYW1lIHN0YXRlIGFzIHRoZSBlYXJsaWVzdCBpbnB1dCBwcm9taXNlIHRvIHNldHRsZS5cblx0XHQgKlxuXHRcdCAqIFdBUk5JTkc6IFRoZSBFUzYgUHJvbWlzZSBzcGVjIHJlcXVpcmVzIHRoYXQgcmFjZSgpaW5nIGFuIGVtcHR5IGFycmF5XG5cdFx0ICogbXVzdCByZXR1cm4gYSBwcm9taXNlIHRoYXQgaXMgcGVuZGluZyBmb3JldmVyLiAgVGhpcyBpbXBsZW1lbnRhdGlvblxuXHRcdCAqIHJldHVybnMgYSBzaW5nbGV0b24gZm9yZXZlci1wZW5kaW5nIHByb21pc2UsIHRoZSBzYW1lIHNpbmdsZXRvbiB0aGF0IGlzXG5cdFx0ICogcmV0dXJuZWQgYnkgUHJvbWlzZS5uZXZlcigpLCB0aHVzIGNhbiBiZSBjaGVja2VkIHdpdGggPT09XG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge2FycmF5fSBwcm9taXNlcyBhcnJheSBvZiBwcm9taXNlcyB0byByYWNlXG5cdFx0ICogQHJldHVybnMge1Byb21pc2V9IGlmIGlucHV0IGlzIG5vbi1lbXB0eSwgYSBwcm9taXNlIHRoYXQgd2lsbCBzZXR0bGVcblx0XHQgKiB0byB0aGUgc2FtZSBvdXRjb21lIGFzIHRoZSBlYXJsaWVzdCBpbnB1dCBwcm9taXNlIHRvIHNldHRsZS4gaWYgZW1wdHlcblx0XHQgKiBpcyBlbXB0eSwgcmV0dXJucyBhIHByb21pc2UgdGhhdCB3aWxsIG5ldmVyIHNldHRsZS5cblx0XHQgKi9cblx0XHRmdW5jdGlvbiByYWNlKHByb21pc2VzKSB7XG5cdFx0XHRpZih0eXBlb2YgcHJvbWlzZXMgIT09ICdvYmplY3QnIHx8IHByb21pc2VzID09PSBudWxsKSB7XG5cdFx0XHRcdHJldHVybiByZWplY3QobmV3IFR5cGVFcnJvcignbm9uLWl0ZXJhYmxlIHBhc3NlZCB0byByYWNlKCknKSk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFNpZ2gsIHJhY2UoW10pIGlzIHVudGVzdGFibGUgdW5sZXNzIHdlIHJldHVybiAqc29tZXRoaW5nKlxuXHRcdFx0Ly8gdGhhdCBpcyByZWNvZ25pemFibGUgd2l0aG91dCBjYWxsaW5nIC50aGVuKCkgb24gaXQuXG5cdFx0XHRyZXR1cm4gcHJvbWlzZXMubGVuZ3RoID09PSAwID8gbmV2ZXIoKVxuXHRcdFx0XHQgOiBwcm9taXNlcy5sZW5ndGggPT09IDEgPyByZXNvbHZlKHByb21pc2VzWzBdKVxuXHRcdFx0XHQgOiBydW5SYWNlKHByb21pc2VzKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBydW5SYWNlKHByb21pc2VzKSB7XG5cdFx0XHR2YXIgcmVzb2x2ZXIgPSBuZXcgUGVuZGluZygpO1xuXHRcdFx0dmFyIGksIHgsIGg7XG5cdFx0XHRmb3IoaT0wOyBpPHByb21pc2VzLmxlbmd0aDsgKytpKSB7XG5cdFx0XHRcdHggPSBwcm9taXNlc1tpXTtcblx0XHRcdFx0aWYgKHggPT09IHZvaWQgMCAmJiAhKGkgaW4gcHJvbWlzZXMpKSB7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRoID0gZ2V0SGFuZGxlcih4KTtcblx0XHRcdFx0aWYoaC5zdGF0ZSgpICE9PSAwKSB7XG5cdFx0XHRcdFx0cmVzb2x2ZXIuYmVjb21lKGgpO1xuXHRcdFx0XHRcdHZpc2l0UmVtYWluaW5nKHByb21pc2VzLCBpKzEsIGgpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGgudmlzaXQocmVzb2x2ZXIsIHJlc29sdmVyLnJlc29sdmUsIHJlc29sdmVyLnJlamVjdCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBuZXcgUHJvbWlzZShIYW5kbGVyLCByZXNvbHZlcik7XG5cdFx0fVxuXG5cdFx0Ly8gUHJvbWlzZSBpbnRlcm5hbHNcblx0XHQvLyBCZWxvdyB0aGlzLCBldmVyeXRoaW5nIGlzIEBwcml2YXRlXG5cblx0XHQvKipcblx0XHQgKiBHZXQgYW4gYXBwcm9wcmlhdGUgaGFuZGxlciBmb3IgeCwgd2l0aG91dCBjaGVja2luZyBmb3IgY3ljbGVzXG5cdFx0ICogQHBhcmFtIHsqfSB4XG5cdFx0ICogQHJldHVybnMge29iamVjdH0gaGFuZGxlclxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGdldEhhbmRsZXIoeCkge1xuXHRcdFx0aWYoaXNQcm9taXNlKHgpKSB7XG5cdFx0XHRcdHJldHVybiB4Ll9oYW5kbGVyLmpvaW4oKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBtYXliZVRoZW5hYmxlKHgpID8gZ2V0SGFuZGxlclVudHJ1c3RlZCh4KSA6IG5ldyBGdWxmaWxsZWQoeCk7XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogR2V0IGEgaGFuZGxlciBmb3IgdGhlbmFibGUgeC5cblx0XHQgKiBOT1RFOiBZb3UgbXVzdCBvbmx5IGNhbGwgdGhpcyBpZiBtYXliZVRoZW5hYmxlKHgpID09IHRydWVcblx0XHQgKiBAcGFyYW0ge29iamVjdHxmdW5jdGlvbnxQcm9taXNlfSB4XG5cdFx0ICogQHJldHVybnMge29iamVjdH0gaGFuZGxlclxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGdldEhhbmRsZXJNYXliZVRoZW5hYmxlKHgpIHtcblx0XHRcdHJldHVybiBpc1Byb21pc2UoeCkgPyB4Ll9oYW5kbGVyLmpvaW4oKSA6IGdldEhhbmRsZXJVbnRydXN0ZWQoeCk7XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogR2V0IGEgaGFuZGxlciBmb3IgcG90ZW50aWFsbHkgdW50cnVzdGVkIHRoZW5hYmxlIHhcblx0XHQgKiBAcGFyYW0geyp9IHhcblx0XHQgKiBAcmV0dXJucyB7b2JqZWN0fSBoYW5kbGVyXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gZ2V0SGFuZGxlclVudHJ1c3RlZCh4KSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHR2YXIgdW50cnVzdGVkVGhlbiA9IHgudGhlbjtcblx0XHRcdFx0cmV0dXJuIHR5cGVvZiB1bnRydXN0ZWRUaGVuID09PSAnZnVuY3Rpb24nXG5cdFx0XHRcdFx0PyBuZXcgVGhlbmFibGUodW50cnVzdGVkVGhlbiwgeClcblx0XHRcdFx0XHQ6IG5ldyBGdWxmaWxsZWQoeCk7XG5cdFx0XHR9IGNhdGNoKGUpIHtcblx0XHRcdFx0cmV0dXJuIG5ldyBSZWplY3RlZChlKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBIYW5kbGVyIGZvciBhIHByb21pc2UgdGhhdCBpcyBwZW5kaW5nIGZvcmV2ZXJcblx0XHQgKiBAY29uc3RydWN0b3Jcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBIYW5kbGVyKCkge31cblxuXHRcdEhhbmRsZXIucHJvdG90eXBlLndoZW5cblx0XHRcdD0gSGFuZGxlci5wcm90b3R5cGUuYmVjb21lXG5cdFx0XHQ9IEhhbmRsZXIucHJvdG90eXBlLm5vdGlmeSAvLyBkZXByZWNhdGVkXG5cdFx0XHQ9IEhhbmRsZXIucHJvdG90eXBlLmZhaWxcblx0XHRcdD0gSGFuZGxlci5wcm90b3R5cGUuX3VucmVwb3J0XG5cdFx0XHQ9IEhhbmRsZXIucHJvdG90eXBlLl9yZXBvcnRcblx0XHRcdD0gbm9vcDtcblxuXHRcdEhhbmRsZXIucHJvdG90eXBlLl9zdGF0ZSA9IDA7XG5cblx0XHRIYW5kbGVyLnByb3RvdHlwZS5zdGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuX3N0YXRlO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBSZWN1cnNpdmVseSBjb2xsYXBzZSBoYW5kbGVyIGNoYWluIHRvIGZpbmQgdGhlIGhhbmRsZXJcblx0XHQgKiBuZWFyZXN0IHRvIHRoZSBmdWxseSByZXNvbHZlZCB2YWx1ZS5cblx0XHQgKiBAcmV0dXJucyB7b2JqZWN0fSBoYW5kbGVyIG5lYXJlc3QgdGhlIGZ1bGx5IHJlc29sdmVkIHZhbHVlXG5cdFx0ICovXG5cdFx0SGFuZGxlci5wcm90b3R5cGUuam9pbiA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGggPSB0aGlzO1xuXHRcdFx0d2hpbGUoaC5oYW5kbGVyICE9PSB2b2lkIDApIHtcblx0XHRcdFx0aCA9IGguaGFuZGxlcjtcblx0XHRcdH1cblx0XHRcdHJldHVybiBoO1xuXHRcdH07XG5cblx0XHRIYW5kbGVyLnByb3RvdHlwZS5jaGFpbiA9IGZ1bmN0aW9uKHRvLCByZWNlaXZlciwgZnVsZmlsbGVkLCByZWplY3RlZCwgcHJvZ3Jlc3MpIHtcblx0XHRcdHRoaXMud2hlbih7XG5cdFx0XHRcdHJlc29sdmVyOiB0byxcblx0XHRcdFx0cmVjZWl2ZXI6IHJlY2VpdmVyLFxuXHRcdFx0XHRmdWxmaWxsZWQ6IGZ1bGZpbGxlZCxcblx0XHRcdFx0cmVqZWN0ZWQ6IHJlamVjdGVkLFxuXHRcdFx0XHRwcm9ncmVzczogcHJvZ3Jlc3Ncblx0XHRcdH0pO1xuXHRcdH07XG5cblx0XHRIYW5kbGVyLnByb3RvdHlwZS52aXNpdCA9IGZ1bmN0aW9uKHJlY2VpdmVyLCBmdWxmaWxsZWQsIHJlamVjdGVkLCBwcm9ncmVzcykge1xuXHRcdFx0dGhpcy5jaGFpbihmYWlsSWZSZWplY3RlZCwgcmVjZWl2ZXIsIGZ1bGZpbGxlZCwgcmVqZWN0ZWQsIHByb2dyZXNzKTtcblx0XHR9O1xuXG5cdFx0SGFuZGxlci5wcm90b3R5cGUuZm9sZCA9IGZ1bmN0aW9uKGYsIHosIGMsIHRvKSB7XG5cdFx0XHR0aGlzLndoZW4obmV3IEZvbGQoZiwgeiwgYywgdG8pKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogSGFuZGxlciB0aGF0IGludm9rZXMgZmFpbCgpIG9uIGFueSBoYW5kbGVyIGl0IGJlY29tZXNcblx0XHQgKiBAY29uc3RydWN0b3Jcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBGYWlsSWZSZWplY3RlZCgpIHt9XG5cblx0XHRpbmhlcml0KEhhbmRsZXIsIEZhaWxJZlJlamVjdGVkKTtcblxuXHRcdEZhaWxJZlJlamVjdGVkLnByb3RvdHlwZS5iZWNvbWUgPSBmdW5jdGlvbihoKSB7XG5cdFx0XHRoLmZhaWwoKTtcblx0XHR9O1xuXG5cdFx0dmFyIGZhaWxJZlJlamVjdGVkID0gbmV3IEZhaWxJZlJlamVjdGVkKCk7XG5cblx0XHQvKipcblx0XHQgKiBIYW5kbGVyIHRoYXQgbWFuYWdlcyBhIHF1ZXVlIG9mIGNvbnN1bWVycyB3YWl0aW5nIG9uIGEgcGVuZGluZyBwcm9taXNlXG5cdFx0ICogQGNvbnN0cnVjdG9yXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gUGVuZGluZyhyZWNlaXZlciwgaW5oZXJpdGVkQ29udGV4dCkge1xuXHRcdFx0UHJvbWlzZS5jcmVhdGVDb250ZXh0KHRoaXMsIGluaGVyaXRlZENvbnRleHQpO1xuXG5cdFx0XHR0aGlzLmNvbnN1bWVycyA9IHZvaWQgMDtcblx0XHRcdHRoaXMucmVjZWl2ZXIgPSByZWNlaXZlcjtcblx0XHRcdHRoaXMuaGFuZGxlciA9IHZvaWQgMDtcblx0XHRcdHRoaXMucmVzb2x2ZWQgPSBmYWxzZTtcblx0XHR9XG5cblx0XHRpbmhlcml0KEhhbmRsZXIsIFBlbmRpbmcpO1xuXG5cdFx0UGVuZGluZy5wcm90b3R5cGUuX3N0YXRlID0gMDtcblxuXHRcdFBlbmRpbmcucHJvdG90eXBlLnJlc29sdmUgPSBmdW5jdGlvbih4KSB7XG5cdFx0XHR0aGlzLmJlY29tZShnZXRIYW5kbGVyKHgpKTtcblx0XHR9O1xuXG5cdFx0UGVuZGluZy5wcm90b3R5cGUucmVqZWN0ID0gZnVuY3Rpb24oeCkge1xuXHRcdFx0aWYodGhpcy5yZXNvbHZlZCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuYmVjb21lKG5ldyBSZWplY3RlZCh4KSk7XG5cdFx0fTtcblxuXHRcdFBlbmRpbmcucHJvdG90eXBlLmpvaW4gPSBmdW5jdGlvbigpIHtcblx0XHRcdGlmICghdGhpcy5yZXNvbHZlZCkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH1cblxuXHRcdFx0dmFyIGggPSB0aGlzO1xuXG5cdFx0XHR3aGlsZSAoaC5oYW5kbGVyICE9PSB2b2lkIDApIHtcblx0XHRcdFx0aCA9IGguaGFuZGxlcjtcblx0XHRcdFx0aWYgKGggPT09IHRoaXMpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5oYW5kbGVyID0gY3ljbGUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gaDtcblx0XHR9O1xuXG5cdFx0UGVuZGluZy5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgcSA9IHRoaXMuY29uc3VtZXJzO1xuXHRcdFx0dmFyIGhhbmRsZXIgPSB0aGlzLmhhbmRsZXI7XG5cdFx0XHR0aGlzLmhhbmRsZXIgPSB0aGlzLmhhbmRsZXIuam9pbigpO1xuXHRcdFx0dGhpcy5jb25zdW1lcnMgPSB2b2lkIDA7XG5cblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgcS5sZW5ndGg7ICsraSkge1xuXHRcdFx0XHRoYW5kbGVyLndoZW4ocVtpXSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdFBlbmRpbmcucHJvdG90eXBlLmJlY29tZSA9IGZ1bmN0aW9uKGhhbmRsZXIpIHtcblx0XHRcdGlmKHRoaXMucmVzb2x2ZWQpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnJlc29sdmVkID0gdHJ1ZTtcblx0XHRcdHRoaXMuaGFuZGxlciA9IGhhbmRsZXI7XG5cdFx0XHRpZih0aGlzLmNvbnN1bWVycyAhPT0gdm9pZCAwKSB7XG5cdFx0XHRcdHRhc2tzLmVucXVldWUodGhpcyk7XG5cdFx0XHR9XG5cblx0XHRcdGlmKHRoaXMuY29udGV4dCAhPT0gdm9pZCAwKSB7XG5cdFx0XHRcdGhhbmRsZXIuX3JlcG9ydCh0aGlzLmNvbnRleHQpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRQZW5kaW5nLnByb3RvdHlwZS53aGVuID0gZnVuY3Rpb24oY29udGludWF0aW9uKSB7XG5cdFx0XHRpZih0aGlzLnJlc29sdmVkKSB7XG5cdFx0XHRcdHRhc2tzLmVucXVldWUobmV3IENvbnRpbnVhdGlvblRhc2soY29udGludWF0aW9uLCB0aGlzLmhhbmRsZXIpKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmKHRoaXMuY29uc3VtZXJzID09PSB2b2lkIDApIHtcblx0XHRcdFx0XHR0aGlzLmNvbnN1bWVycyA9IFtjb250aW51YXRpb25dO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRoaXMuY29uc3VtZXJzLnB1c2goY29udGludWF0aW9uKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBAZGVwcmVjYXRlZFxuXHRcdCAqL1xuXHRcdFBlbmRpbmcucHJvdG90eXBlLm5vdGlmeSA9IGZ1bmN0aW9uKHgpIHtcblx0XHRcdGlmKCF0aGlzLnJlc29sdmVkKSB7XG5cdFx0XHRcdHRhc2tzLmVucXVldWUobmV3IFByb2dyZXNzVGFzayh4LCB0aGlzKSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdFBlbmRpbmcucHJvdG90eXBlLmZhaWwgPSBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0XHR2YXIgYyA9IHR5cGVvZiBjb250ZXh0ID09PSAndW5kZWZpbmVkJyA/IHRoaXMuY29udGV4dCA6IGNvbnRleHQ7XG5cdFx0XHR0aGlzLnJlc29sdmVkICYmIHRoaXMuaGFuZGxlci5qb2luKCkuZmFpbChjKTtcblx0XHR9O1xuXG5cdFx0UGVuZGluZy5wcm90b3R5cGUuX3JlcG9ydCA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRcdHRoaXMucmVzb2x2ZWQgJiYgdGhpcy5oYW5kbGVyLmpvaW4oKS5fcmVwb3J0KGNvbnRleHQpO1xuXHRcdH07XG5cblx0XHRQZW5kaW5nLnByb3RvdHlwZS5fdW5yZXBvcnQgPSBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMucmVzb2x2ZWQgJiYgdGhpcy5oYW5kbGVyLmpvaW4oKS5fdW5yZXBvcnQoKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogV3JhcCBhbm90aGVyIGhhbmRsZXIgYW5kIGZvcmNlIGl0IGludG8gYSBmdXR1cmUgc3RhY2tcblx0XHQgKiBAcGFyYW0ge29iamVjdH0gaGFuZGxlclxuXHRcdCAqIEBjb25zdHJ1Y3RvclxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIEFzeW5jKGhhbmRsZXIpIHtcblx0XHRcdHRoaXMuaGFuZGxlciA9IGhhbmRsZXI7XG5cdFx0fVxuXG5cdFx0aW5oZXJpdChIYW5kbGVyLCBBc3luYyk7XG5cblx0XHRBc3luYy5wcm90b3R5cGUud2hlbiA9IGZ1bmN0aW9uKGNvbnRpbnVhdGlvbikge1xuXHRcdFx0dGFza3MuZW5xdWV1ZShuZXcgQ29udGludWF0aW9uVGFzayhjb250aW51YXRpb24sIHRoaXMpKTtcblx0XHR9O1xuXG5cdFx0QXN5bmMucHJvdG90eXBlLl9yZXBvcnQgPSBmdW5jdGlvbihjb250ZXh0KSB7XG5cdFx0XHR0aGlzLmpvaW4oKS5fcmVwb3J0KGNvbnRleHQpO1xuXHRcdH07XG5cblx0XHRBc3luYy5wcm90b3R5cGUuX3VucmVwb3J0ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLmpvaW4oKS5fdW5yZXBvcnQoKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogSGFuZGxlciB0aGF0IHdyYXBzIGFuIHVudHJ1c3RlZCB0aGVuYWJsZSBhbmQgYXNzaW1pbGF0ZXMgaXQgaW4gYSBmdXR1cmUgc3RhY2tcblx0XHQgKiBAcGFyYW0ge2Z1bmN0aW9ufSB0aGVuXG5cdFx0ICogQHBhcmFtIHt7dGhlbjogZnVuY3Rpb259fSB0aGVuYWJsZVxuXHRcdCAqIEBjb25zdHJ1Y3RvclxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIFRoZW5hYmxlKHRoZW4sIHRoZW5hYmxlKSB7XG5cdFx0XHRQZW5kaW5nLmNhbGwodGhpcyk7XG5cdFx0XHR0YXNrcy5lbnF1ZXVlKG5ldyBBc3NpbWlsYXRlVGFzayh0aGVuLCB0aGVuYWJsZSwgdGhpcykpO1xuXHRcdH1cblxuXHRcdGluaGVyaXQoUGVuZGluZywgVGhlbmFibGUpO1xuXG5cdFx0LyoqXG5cdFx0ICogSGFuZGxlciBmb3IgYSBmdWxmaWxsZWQgcHJvbWlzZVxuXHRcdCAqIEBwYXJhbSB7Kn0geCBmdWxmaWxsbWVudCB2YWx1ZVxuXHRcdCAqIEBjb25zdHJ1Y3RvclxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIEZ1bGZpbGxlZCh4KSB7XG5cdFx0XHRQcm9taXNlLmNyZWF0ZUNvbnRleHQodGhpcyk7XG5cdFx0XHR0aGlzLnZhbHVlID0geDtcblx0XHR9XG5cblx0XHRpbmhlcml0KEhhbmRsZXIsIEZ1bGZpbGxlZCk7XG5cblx0XHRGdWxmaWxsZWQucHJvdG90eXBlLl9zdGF0ZSA9IDE7XG5cblx0XHRGdWxmaWxsZWQucHJvdG90eXBlLmZvbGQgPSBmdW5jdGlvbihmLCB6LCBjLCB0bykge1xuXHRcdFx0cnVuQ29udGludWF0aW9uMyhmLCB6LCB0aGlzLCBjLCB0byk7XG5cdFx0fTtcblxuXHRcdEZ1bGZpbGxlZC5wcm90b3R5cGUud2hlbiA9IGZ1bmN0aW9uKGNvbnQpIHtcblx0XHRcdHJ1bkNvbnRpbnVhdGlvbjEoY29udC5mdWxmaWxsZWQsIHRoaXMsIGNvbnQucmVjZWl2ZXIsIGNvbnQucmVzb2x2ZXIpO1xuXHRcdH07XG5cblx0XHR2YXIgZXJyb3JJZCA9IDA7XG5cblx0XHQvKipcblx0XHQgKiBIYW5kbGVyIGZvciBhIHJlamVjdGVkIHByb21pc2Vcblx0XHQgKiBAcGFyYW0geyp9IHggcmVqZWN0aW9uIHJlYXNvblxuXHRcdCAqIEBjb25zdHJ1Y3RvclxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIFJlamVjdGVkKHgpIHtcblx0XHRcdFByb21pc2UuY3JlYXRlQ29udGV4dCh0aGlzKTtcblxuXHRcdFx0dGhpcy5pZCA9ICsrZXJyb3JJZDtcblx0XHRcdHRoaXMudmFsdWUgPSB4O1xuXHRcdFx0dGhpcy5oYW5kbGVkID0gZmFsc2U7XG5cdFx0XHR0aGlzLnJlcG9ydGVkID0gZmFsc2U7XG5cblx0XHRcdHRoaXMuX3JlcG9ydCgpO1xuXHRcdH1cblxuXHRcdGluaGVyaXQoSGFuZGxlciwgUmVqZWN0ZWQpO1xuXG5cdFx0UmVqZWN0ZWQucHJvdG90eXBlLl9zdGF0ZSA9IC0xO1xuXG5cdFx0UmVqZWN0ZWQucHJvdG90eXBlLmZvbGQgPSBmdW5jdGlvbihmLCB6LCBjLCB0bykge1xuXHRcdFx0dG8uYmVjb21lKHRoaXMpO1xuXHRcdH07XG5cblx0XHRSZWplY3RlZC5wcm90b3R5cGUud2hlbiA9IGZ1bmN0aW9uKGNvbnQpIHtcblx0XHRcdGlmKHR5cGVvZiBjb250LnJlamVjdGVkID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdHRoaXMuX3VucmVwb3J0KCk7XG5cdFx0XHR9XG5cdFx0XHRydW5Db250aW51YXRpb24xKGNvbnQucmVqZWN0ZWQsIHRoaXMsIGNvbnQucmVjZWl2ZXIsIGNvbnQucmVzb2x2ZXIpO1xuXHRcdH07XG5cblx0XHRSZWplY3RlZC5wcm90b3R5cGUuX3JlcG9ydCA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcblx0XHRcdHRhc2tzLmFmdGVyUXVldWUobmV3IFJlcG9ydFRhc2sodGhpcywgY29udGV4dCkpO1xuXHRcdH07XG5cblx0XHRSZWplY3RlZC5wcm90b3R5cGUuX3VucmVwb3J0ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRpZih0aGlzLmhhbmRsZWQpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5oYW5kbGVkID0gdHJ1ZTtcblx0XHRcdHRhc2tzLmFmdGVyUXVldWUobmV3IFVucmVwb3J0VGFzayh0aGlzKSk7XG5cdFx0fTtcblxuXHRcdFJlamVjdGVkLnByb3RvdHlwZS5mYWlsID0gZnVuY3Rpb24oY29udGV4dCkge1xuXHRcdFx0dGhpcy5yZXBvcnRlZCA9IHRydWU7XG5cdFx0XHRlbWl0UmVqZWN0aW9uKCd1bmhhbmRsZWRSZWplY3Rpb24nLCB0aGlzKTtcblx0XHRcdFByb21pc2Uub25GYXRhbFJlamVjdGlvbih0aGlzLCBjb250ZXh0ID09PSB2b2lkIDAgPyB0aGlzLmNvbnRleHQgOiBjb250ZXh0KTtcblx0XHR9O1xuXG5cdFx0ZnVuY3Rpb24gUmVwb3J0VGFzayhyZWplY3Rpb24sIGNvbnRleHQpIHtcblx0XHRcdHRoaXMucmVqZWN0aW9uID0gcmVqZWN0aW9uO1xuXHRcdFx0dGhpcy5jb250ZXh0ID0gY29udGV4dDtcblx0XHR9XG5cblx0XHRSZXBvcnRUYXNrLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbigpIHtcblx0XHRcdGlmKCF0aGlzLnJlamVjdGlvbi5oYW5kbGVkICYmICF0aGlzLnJlamVjdGlvbi5yZXBvcnRlZCkge1xuXHRcdFx0XHR0aGlzLnJlamVjdGlvbi5yZXBvcnRlZCA9IHRydWU7XG5cdFx0XHRcdGVtaXRSZWplY3Rpb24oJ3VuaGFuZGxlZFJlamVjdGlvbicsIHRoaXMucmVqZWN0aW9uKSB8fFxuXHRcdFx0XHRcdFByb21pc2Uub25Qb3RlbnRpYWxseVVuaGFuZGxlZFJlamVjdGlvbih0aGlzLnJlamVjdGlvbiwgdGhpcy5jb250ZXh0KTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0ZnVuY3Rpb24gVW5yZXBvcnRUYXNrKHJlamVjdGlvbikge1xuXHRcdFx0dGhpcy5yZWplY3Rpb24gPSByZWplY3Rpb247XG5cdFx0fVxuXG5cdFx0VW5yZXBvcnRUYXNrLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbigpIHtcblx0XHRcdGlmKHRoaXMucmVqZWN0aW9uLnJlcG9ydGVkKSB7XG5cdFx0XHRcdGVtaXRSZWplY3Rpb24oJ3JlamVjdGlvbkhhbmRsZWQnLCB0aGlzLnJlamVjdGlvbikgfHxcblx0XHRcdFx0XHRQcm9taXNlLm9uUG90ZW50aWFsbHlVbmhhbmRsZWRSZWplY3Rpb25IYW5kbGVkKHRoaXMucmVqZWN0aW9uKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0Ly8gVW5oYW5kbGVkIHJlamVjdGlvbiBob29rc1xuXHRcdC8vIEJ5IGRlZmF1bHQsIGV2ZXJ5dGhpbmcgaXMgYSBub29wXG5cblx0XHRQcm9taXNlLmNyZWF0ZUNvbnRleHRcblx0XHRcdD0gUHJvbWlzZS5lbnRlckNvbnRleHRcblx0XHRcdD0gUHJvbWlzZS5leGl0Q29udGV4dFxuXHRcdFx0PSBQcm9taXNlLm9uUG90ZW50aWFsbHlVbmhhbmRsZWRSZWplY3Rpb25cblx0XHRcdD0gUHJvbWlzZS5vblBvdGVudGlhbGx5VW5oYW5kbGVkUmVqZWN0aW9uSGFuZGxlZFxuXHRcdFx0PSBQcm9taXNlLm9uRmF0YWxSZWplY3Rpb25cblx0XHRcdD0gbm9vcDtcblxuXHRcdC8vIEVycm9ycyBhbmQgc2luZ2xldG9uc1xuXG5cdFx0dmFyIGZvcmV2ZXJQZW5kaW5nSGFuZGxlciA9IG5ldyBIYW5kbGVyKCk7XG5cdFx0dmFyIGZvcmV2ZXJQZW5kaW5nUHJvbWlzZSA9IG5ldyBQcm9taXNlKEhhbmRsZXIsIGZvcmV2ZXJQZW5kaW5nSGFuZGxlcik7XG5cblx0XHRmdW5jdGlvbiBjeWNsZSgpIHtcblx0XHRcdHJldHVybiBuZXcgUmVqZWN0ZWQobmV3IFR5cGVFcnJvcignUHJvbWlzZSBjeWNsZScpKTtcblx0XHR9XG5cblx0XHQvLyBUYXNrIHJ1bm5lcnNcblxuXHRcdC8qKlxuXHRcdCAqIFJ1biBhIHNpbmdsZSBjb25zdW1lclxuXHRcdCAqIEBjb25zdHJ1Y3RvclxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIENvbnRpbnVhdGlvblRhc2soY29udGludWF0aW9uLCBoYW5kbGVyKSB7XG5cdFx0XHR0aGlzLmNvbnRpbnVhdGlvbiA9IGNvbnRpbnVhdGlvbjtcblx0XHRcdHRoaXMuaGFuZGxlciA9IGhhbmRsZXI7XG5cdFx0fVxuXG5cdFx0Q29udGludWF0aW9uVGFzay5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLmhhbmRsZXIuam9pbigpLndoZW4odGhpcy5jb250aW51YXRpb24pO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBSdW4gYSBxdWV1ZSBvZiBwcm9ncmVzcyBoYW5kbGVyc1xuXHRcdCAqIEBjb25zdHJ1Y3RvclxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIFByb2dyZXNzVGFzayh2YWx1ZSwgaGFuZGxlcikge1xuXHRcdFx0dGhpcy5oYW5kbGVyID0gaGFuZGxlcjtcblx0XHRcdHRoaXMudmFsdWUgPSB2YWx1ZTtcblx0XHR9XG5cblx0XHRQcm9ncmVzc1Rhc2sucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHEgPSB0aGlzLmhhbmRsZXIuY29uc3VtZXJzO1xuXHRcdFx0aWYocSA9PT0gdm9pZCAwKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Zm9yICh2YXIgYywgaSA9IDA7IGkgPCBxLmxlbmd0aDsgKytpKSB7XG5cdFx0XHRcdGMgPSBxW2ldO1xuXHRcdFx0XHRydW5Ob3RpZnkoYy5wcm9ncmVzcywgdGhpcy52YWx1ZSwgdGhpcy5oYW5kbGVyLCBjLnJlY2VpdmVyLCBjLnJlc29sdmVyKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogQXNzaW1pbGF0ZSBhIHRoZW5hYmxlLCBzZW5kaW5nIGl0J3MgdmFsdWUgdG8gcmVzb2x2ZXJcblx0XHQgKiBAcGFyYW0ge2Z1bmN0aW9ufSB0aGVuXG5cdFx0ICogQHBhcmFtIHtvYmplY3R8ZnVuY3Rpb259IHRoZW5hYmxlXG5cdFx0ICogQHBhcmFtIHtvYmplY3R9IHJlc29sdmVyXG5cdFx0ICogQGNvbnN0cnVjdG9yXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gQXNzaW1pbGF0ZVRhc2sodGhlbiwgdGhlbmFibGUsIHJlc29sdmVyKSB7XG5cdFx0XHR0aGlzLl90aGVuID0gdGhlbjtcblx0XHRcdHRoaXMudGhlbmFibGUgPSB0aGVuYWJsZTtcblx0XHRcdHRoaXMucmVzb2x2ZXIgPSByZXNvbHZlcjtcblx0XHR9XG5cblx0XHRBc3NpbWlsYXRlVGFzay5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgaCA9IHRoaXMucmVzb2x2ZXI7XG5cdFx0XHR0cnlBc3NpbWlsYXRlKHRoaXMuX3RoZW4sIHRoaXMudGhlbmFibGUsIF9yZXNvbHZlLCBfcmVqZWN0LCBfbm90aWZ5KTtcblxuXHRcdFx0ZnVuY3Rpb24gX3Jlc29sdmUoeCkgeyBoLnJlc29sdmUoeCk7IH1cblx0XHRcdGZ1bmN0aW9uIF9yZWplY3QoeCkgIHsgaC5yZWplY3QoeCk7IH1cblx0XHRcdGZ1bmN0aW9uIF9ub3RpZnkoeCkgIHsgaC5ub3RpZnkoeCk7IH1cblx0XHR9O1xuXG5cdFx0ZnVuY3Rpb24gdHJ5QXNzaW1pbGF0ZSh0aGVuLCB0aGVuYWJsZSwgcmVzb2x2ZSwgcmVqZWN0LCBub3RpZnkpIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHRoZW4uY2FsbCh0aGVuYWJsZSwgcmVzb2x2ZSwgcmVqZWN0LCBub3RpZnkpO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRyZWplY3QoZSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogRm9sZCBhIGhhbmRsZXIgdmFsdWUgd2l0aCB6XG5cdFx0ICogQGNvbnN0cnVjdG9yXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gRm9sZChmLCB6LCBjLCB0bykge1xuXHRcdFx0dGhpcy5mID0gZjsgdGhpcy56ID0gejsgdGhpcy5jID0gYzsgdGhpcy50byA9IHRvO1xuXHRcdFx0dGhpcy5yZXNvbHZlciA9IGZhaWxJZlJlamVjdGVkO1xuXHRcdFx0dGhpcy5yZWNlaXZlciA9IHRoaXM7XG5cdFx0fVxuXG5cdFx0Rm9sZC5wcm90b3R5cGUuZnVsZmlsbGVkID0gZnVuY3Rpb24oeCkge1xuXHRcdFx0dGhpcy5mLmNhbGwodGhpcy5jLCB0aGlzLnosIHgsIHRoaXMudG8pO1xuXHRcdH07XG5cblx0XHRGb2xkLnByb3RvdHlwZS5yZWplY3RlZCA9IGZ1bmN0aW9uKHgpIHtcblx0XHRcdHRoaXMudG8ucmVqZWN0KHgpO1xuXHRcdH07XG5cblx0XHRGb2xkLnByb3RvdHlwZS5wcm9ncmVzcyA9IGZ1bmN0aW9uKHgpIHtcblx0XHRcdHRoaXMudG8ubm90aWZ5KHgpO1xuXHRcdH07XG5cblx0XHQvLyBPdGhlciBoZWxwZXJzXG5cblx0XHQvKipcblx0XHQgKiBAcGFyYW0geyp9IHhcblx0XHQgKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZmYgeCBpcyBhIHRydXN0ZWQgUHJvbWlzZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGlzUHJvbWlzZSh4KSB7XG5cdFx0XHRyZXR1cm4geCBpbnN0YW5jZW9mIFByb21pc2U7XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogVGVzdCBqdXN0IGVub3VnaCB0byBydWxlIG91dCBwcmltaXRpdmVzLCBpbiBvcmRlciB0byB0YWtlIGZhc3RlclxuXHRcdCAqIHBhdGhzIGluIHNvbWUgY29kZVxuXHRcdCAqIEBwYXJhbSB7Kn0geFxuXHRcdCAqIEByZXR1cm5zIHtib29sZWFufSBmYWxzZSBpZmYgeCBpcyBndWFyYW50ZWVkICpub3QqIHRvIGJlIGEgdGhlbmFibGVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBtYXliZVRoZW5hYmxlKHgpIHtcblx0XHRcdHJldHVybiAodHlwZW9mIHggPT09ICdvYmplY3QnIHx8IHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nKSAmJiB4ICE9PSBudWxsO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHJ1bkNvbnRpbnVhdGlvbjEoZiwgaCwgcmVjZWl2ZXIsIG5leHQpIHtcblx0XHRcdGlmKHR5cGVvZiBmICE9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdHJldHVybiBuZXh0LmJlY29tZShoKTtcblx0XHRcdH1cblxuXHRcdFx0UHJvbWlzZS5lbnRlckNvbnRleHQoaCk7XG5cdFx0XHR0cnlDYXRjaFJlamVjdChmLCBoLnZhbHVlLCByZWNlaXZlciwgbmV4dCk7XG5cdFx0XHRQcm9taXNlLmV4aXRDb250ZXh0KCk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcnVuQ29udGludWF0aW9uMyhmLCB4LCBoLCByZWNlaXZlciwgbmV4dCkge1xuXHRcdFx0aWYodHlwZW9mIGYgIT09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0cmV0dXJuIG5leHQuYmVjb21lKGgpO1xuXHRcdFx0fVxuXG5cdFx0XHRQcm9taXNlLmVudGVyQ29udGV4dChoKTtcblx0XHRcdHRyeUNhdGNoUmVqZWN0MyhmLCB4LCBoLnZhbHVlLCByZWNlaXZlciwgbmV4dCk7XG5cdFx0XHRQcm9taXNlLmV4aXRDb250ZXh0KCk7XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogQGRlcHJlY2F0ZWRcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBydW5Ob3RpZnkoZiwgeCwgaCwgcmVjZWl2ZXIsIG5leHQpIHtcblx0XHRcdGlmKHR5cGVvZiBmICE9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdHJldHVybiBuZXh0Lm5vdGlmeSh4KTtcblx0XHRcdH1cblxuXHRcdFx0UHJvbWlzZS5lbnRlckNvbnRleHQoaCk7XG5cdFx0XHR0cnlDYXRjaFJldHVybihmLCB4LCByZWNlaXZlciwgbmV4dCk7XG5cdFx0XHRQcm9taXNlLmV4aXRDb250ZXh0KCk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdHJ5Q2F0Y2gyKGYsIGEsIGIpIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHJldHVybiBmKGEsIGIpO1xuXHRcdFx0fSBjYXRjaChlKSB7XG5cdFx0XHRcdHJldHVybiByZWplY3QoZSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogUmV0dXJuIGYuY2FsbCh0aGlzQXJnLCB4KSwgb3IgaWYgaXQgdGhyb3dzIHJldHVybiBhIHJlamVjdGVkIHByb21pc2UgZm9yXG5cdFx0ICogdGhlIHRocm93biBleGNlcHRpb25cblx0XHQgKi9cblx0XHRmdW5jdGlvbiB0cnlDYXRjaFJlamVjdChmLCB4LCB0aGlzQXJnLCBuZXh0KSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRuZXh0LmJlY29tZShnZXRIYW5kbGVyKGYuY2FsbCh0aGlzQXJnLCB4KSkpO1xuXHRcdFx0fSBjYXRjaChlKSB7XG5cdFx0XHRcdG5leHQuYmVjb21lKG5ldyBSZWplY3RlZChlKSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogU2FtZSBhcyBhYm92ZSwgYnV0IGluY2x1ZGVzIHRoZSBleHRyYSBhcmd1bWVudCBwYXJhbWV0ZXIuXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gdHJ5Q2F0Y2hSZWplY3QzKGYsIHgsIHksIHRoaXNBcmcsIG5leHQpIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdGYuY2FsbCh0aGlzQXJnLCB4LCB5LCBuZXh0KTtcblx0XHRcdH0gY2F0Y2goZSkge1xuXHRcdFx0XHRuZXh0LmJlY29tZShuZXcgUmVqZWN0ZWQoZSkpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIEBkZXByZWNhdGVkXG5cdFx0ICogUmV0dXJuIGYuY2FsbCh0aGlzQXJnLCB4KSwgb3IgaWYgaXQgdGhyb3dzLCAqcmV0dXJuKiB0aGUgZXhjZXB0aW9uXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gdHJ5Q2F0Y2hSZXR1cm4oZiwgeCwgdGhpc0FyZywgbmV4dCkge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0bmV4dC5ub3RpZnkoZi5jYWxsKHRoaXNBcmcsIHgpKTtcblx0XHRcdH0gY2F0Y2goZSkge1xuXHRcdFx0XHRuZXh0Lm5vdGlmeShlKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBpbmhlcml0KFBhcmVudCwgQ2hpbGQpIHtcblx0XHRcdENoaWxkLnByb3RvdHlwZSA9IG9iamVjdENyZWF0ZShQYXJlbnQucHJvdG90eXBlKTtcblx0XHRcdENoaWxkLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENoaWxkO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHNuZCh4LCB5KSB7XG5cdFx0XHRyZXR1cm4geTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBub29wKCkge31cblxuXHRcdGZ1bmN0aW9uIGluaXRFbWl0UmVqZWN0aW9uKCkge1xuXHRcdFx0LypnbG9iYWwgcHJvY2Vzcywgc2VsZiwgQ3VzdG9tRXZlbnQqL1xuXHRcdFx0aWYodHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHByb2Nlc3MgIT09IG51bGxcblx0XHRcdFx0JiYgdHlwZW9mIHByb2Nlc3MuZW1pdCA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHQvLyBSZXR1cm5pbmcgZmFsc3kgaGVyZSBtZWFucyB0byBjYWxsIHRoZSBkZWZhdWx0XG5cdFx0XHRcdC8vIG9uUG90ZW50aWFsbHlVbmhhbmRsZWRSZWplY3Rpb24gQVBJLiAgVGhpcyBpcyBzYWZlIGV2ZW4gaW5cblx0XHRcdFx0Ly8gYnJvd3NlcmlmeSBzaW5jZSBwcm9jZXNzLmVtaXQgYWx3YXlzIHJldHVybnMgZmFsc3kgaW4gYnJvd3NlcmlmeTpcblx0XHRcdFx0Ly8gaHR0cHM6Ly9naXRodWIuY29tL2RlZnVuY3R6b21iaWUvbm9kZS1wcm9jZXNzL2Jsb2IvbWFzdGVyL2Jyb3dzZXIuanMjTDQwLUw0NlxuXHRcdFx0XHRyZXR1cm4gZnVuY3Rpb24odHlwZSwgcmVqZWN0aW9uKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHR5cGUgPT09ICd1bmhhbmRsZWRSZWplY3Rpb24nXG5cdFx0XHRcdFx0XHQ/IHByb2Nlc3MuZW1pdCh0eXBlLCByZWplY3Rpb24udmFsdWUsIHJlamVjdGlvbilcblx0XHRcdFx0XHRcdDogcHJvY2Vzcy5lbWl0KHR5cGUsIHJlamVjdGlvbik7XG5cdFx0XHRcdH07XG5cdFx0XHR9IGVsc2UgaWYodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBDdXN0b21FdmVudCA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRyZXR1cm4gKGZ1bmN0aW9uKG5vb3AsIHNlbGYsIEN1c3RvbUV2ZW50KSB7XG5cdFx0XHRcdFx0dmFyIGhhc0N1c3RvbUV2ZW50ID0gZmFsc2U7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdHZhciBldiA9IG5ldyBDdXN0b21FdmVudCgndW5oYW5kbGVkUmVqZWN0aW9uJyk7XG5cdFx0XHRcdFx0XHRoYXNDdXN0b21FdmVudCA9IGV2IGluc3RhbmNlb2YgQ3VzdG9tRXZlbnQ7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZSkge31cblxuXHRcdFx0XHRcdHJldHVybiAhaGFzQ3VzdG9tRXZlbnQgPyBub29wIDogZnVuY3Rpb24odHlwZSwgcmVqZWN0aW9uKSB7XG5cdFx0XHRcdFx0XHR2YXIgZXYgPSBuZXcgQ3VzdG9tRXZlbnQodHlwZSwge1xuXHRcdFx0XHRcdFx0XHRkZXRhaWw6IHtcblx0XHRcdFx0XHRcdFx0XHRyZWFzb246IHJlamVjdGlvbi52YWx1ZSxcblx0XHRcdFx0XHRcdFx0XHRrZXk6IHJlamVjdGlvblxuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRidWJibGVzOiBmYWxzZSxcblx0XHRcdFx0XHRcdFx0Y2FuY2VsYWJsZTogdHJ1ZVxuXHRcdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRcdHJldHVybiAhc2VsZi5kaXNwYXRjaEV2ZW50KGV2KTtcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9KG5vb3AsIHNlbGYsIEN1c3RvbUV2ZW50KSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBub29wO1xuXHRcdH1cblxuXHRcdHJldHVybiBQcm9taXNlO1xuXHR9O1xufSk7XG59KHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZSA6IGZ1bmN0aW9uKGZhY3RvcnkpIHsgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7IH0pKTtcbiIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG4oZnVuY3Rpb24oZGVmaW5lKSB7ICd1c2Ugc3RyaWN0JztcbmRlZmluZShmdW5jdGlvbigpIHtcblxuXHRyZXR1cm4ge1xuXHRcdHBlbmRpbmc6IHRvUGVuZGluZ1N0YXRlLFxuXHRcdGZ1bGZpbGxlZDogdG9GdWxmaWxsZWRTdGF0ZSxcblx0XHRyZWplY3RlZDogdG9SZWplY3RlZFN0YXRlLFxuXHRcdGluc3BlY3Q6IGluc3BlY3Rcblx0fTtcblxuXHRmdW5jdGlvbiB0b1BlbmRpbmdTdGF0ZSgpIHtcblx0XHRyZXR1cm4geyBzdGF0ZTogJ3BlbmRpbmcnIH07XG5cdH1cblxuXHRmdW5jdGlvbiB0b1JlamVjdGVkU3RhdGUoZSkge1xuXHRcdHJldHVybiB7IHN0YXRlOiAncmVqZWN0ZWQnLCByZWFzb246IGUgfTtcblx0fVxuXG5cdGZ1bmN0aW9uIHRvRnVsZmlsbGVkU3RhdGUoeCkge1xuXHRcdHJldHVybiB7IHN0YXRlOiAnZnVsZmlsbGVkJywgdmFsdWU6IHggfTtcblx0fVxuXG5cdGZ1bmN0aW9uIGluc3BlY3QoaGFuZGxlcikge1xuXHRcdHZhciBzdGF0ZSA9IGhhbmRsZXIuc3RhdGUoKTtcblx0XHRyZXR1cm4gc3RhdGUgPT09IDAgPyB0b1BlbmRpbmdTdGF0ZSgpXG5cdFx0XHQgOiBzdGF0ZSA+IDAgICA/IHRvRnVsZmlsbGVkU3RhdGUoaGFuZGxlci52YWx1ZSlcblx0XHRcdCAgICAgICAgICAgICAgIDogdG9SZWplY3RlZFN0YXRlKGhhbmRsZXIudmFsdWUpO1xuXHR9XG5cbn0pO1xufSh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUgOiBmdW5jdGlvbihmYWN0b3J5KSB7IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpOyB9KSk7XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cblxuLyoqXG4gKiBQcm9taXNlcy9BKyBhbmQgd2hlbigpIGltcGxlbWVudGF0aW9uXG4gKiB3aGVuIGlzIHBhcnQgb2YgdGhlIGN1am9KUyBmYW1pbHkgb2YgbGlicmFyaWVzIChodHRwOi8vY3Vqb2pzLmNvbS8pXG4gKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyXG4gKiBAYXV0aG9yIEpvaG4gSGFublxuICovXG4oZnVuY3Rpb24oZGVmaW5lKSB7ICd1c2Ugc3RyaWN0JztcbmRlZmluZShmdW5jdGlvbiAocmVxdWlyZSkge1xuXG5cdHZhciB0aW1lZCA9IHJlcXVpcmUoJy4vbGliL2RlY29yYXRvcnMvdGltZWQnKTtcblx0dmFyIGFycmF5ID0gcmVxdWlyZSgnLi9saWIvZGVjb3JhdG9ycy9hcnJheScpO1xuXHR2YXIgZmxvdyA9IHJlcXVpcmUoJy4vbGliL2RlY29yYXRvcnMvZmxvdycpO1xuXHR2YXIgZm9sZCA9IHJlcXVpcmUoJy4vbGliL2RlY29yYXRvcnMvZm9sZCcpO1xuXHR2YXIgaW5zcGVjdCA9IHJlcXVpcmUoJy4vbGliL2RlY29yYXRvcnMvaW5zcGVjdCcpO1xuXHR2YXIgZ2VuZXJhdGUgPSByZXF1aXJlKCcuL2xpYi9kZWNvcmF0b3JzL2l0ZXJhdGUnKTtcblx0dmFyIHByb2dyZXNzID0gcmVxdWlyZSgnLi9saWIvZGVjb3JhdG9ycy9wcm9ncmVzcycpO1xuXHR2YXIgd2l0aFRoaXMgPSByZXF1aXJlKCcuL2xpYi9kZWNvcmF0b3JzL3dpdGgnKTtcblx0dmFyIHVuaGFuZGxlZFJlamVjdGlvbiA9IHJlcXVpcmUoJy4vbGliL2RlY29yYXRvcnMvdW5oYW5kbGVkUmVqZWN0aW9uJyk7XG5cdHZhciBUaW1lb3V0RXJyb3IgPSByZXF1aXJlKCcuL2xpYi9UaW1lb3V0RXJyb3InKTtcblxuXHR2YXIgUHJvbWlzZSA9IFthcnJheSwgZmxvdywgZm9sZCwgZ2VuZXJhdGUsIHByb2dyZXNzLFxuXHRcdGluc3BlY3QsIHdpdGhUaGlzLCB0aW1lZCwgdW5oYW5kbGVkUmVqZWN0aW9uXVxuXHRcdC5yZWR1Y2UoZnVuY3Rpb24oUHJvbWlzZSwgZmVhdHVyZSkge1xuXHRcdFx0cmV0dXJuIGZlYXR1cmUoUHJvbWlzZSk7XG5cdFx0fSwgcmVxdWlyZSgnLi9saWIvUHJvbWlzZScpKTtcblxuXHR2YXIgYXBwbHkgPSByZXF1aXJlKCcuL2xpYi9hcHBseScpKFByb21pc2UpO1xuXG5cdC8vIFB1YmxpYyBBUElcblxuXHR3aGVuLnByb21pc2UgICAgID0gcHJvbWlzZTsgICAgICAgICAgICAgIC8vIENyZWF0ZSBhIHBlbmRpbmcgcHJvbWlzZVxuXHR3aGVuLnJlc29sdmUgICAgID0gUHJvbWlzZS5yZXNvbHZlOyAgICAgIC8vIENyZWF0ZSBhIHJlc29sdmVkIHByb21pc2Vcblx0d2hlbi5yZWplY3QgICAgICA9IFByb21pc2UucmVqZWN0OyAgICAgICAvLyBDcmVhdGUgYSByZWplY3RlZCBwcm9taXNlXG5cblx0d2hlbi5saWZ0ICAgICAgICA9IGxpZnQ7ICAgICAgICAgICAgICAgICAvLyBsaWZ0IGEgZnVuY3Rpb24gdG8gcmV0dXJuIHByb21pc2VzXG5cdHdoZW5bJ3RyeSddICAgICAgPSBhdHRlbXB0OyAgICAgICAgICAgICAgLy8gY2FsbCBhIGZ1bmN0aW9uIGFuZCByZXR1cm4gYSBwcm9taXNlXG5cdHdoZW4uYXR0ZW1wdCAgICAgPSBhdHRlbXB0OyAgICAgICAgICAgICAgLy8gYWxpYXMgZm9yIHdoZW4udHJ5XG5cblx0d2hlbi5pdGVyYXRlICAgICA9IFByb21pc2UuaXRlcmF0ZTsgICAgICAvLyBERVBSRUNBVEVEICh1c2UgY3Vqb2pzL21vc3Qgc3RyZWFtcykgR2VuZXJhdGUgYSBzdHJlYW0gb2YgcHJvbWlzZXNcblx0d2hlbi51bmZvbGQgICAgICA9IFByb21pc2UudW5mb2xkOyAgICAgICAvLyBERVBSRUNBVEVEICh1c2UgY3Vqb2pzL21vc3Qgc3RyZWFtcykgR2VuZXJhdGUgYSBzdHJlYW0gb2YgcHJvbWlzZXNcblxuXHR3aGVuLmpvaW4gICAgICAgID0gam9pbjsgICAgICAgICAgICAgICAgIC8vIEpvaW4gMiBvciBtb3JlIHByb21pc2VzXG5cblx0d2hlbi5hbGwgICAgICAgICA9IGFsbDsgICAgICAgICAgICAgICAgICAvLyBSZXNvbHZlIGEgbGlzdCBvZiBwcm9taXNlc1xuXHR3aGVuLnNldHRsZSAgICAgID0gc2V0dGxlOyAgICAgICAgICAgICAgIC8vIFNldHRsZSBhIGxpc3Qgb2YgcHJvbWlzZXNcblxuXHR3aGVuLmFueSAgICAgICAgID0gbGlmdChQcm9taXNlLmFueSk7ICAgIC8vIE9uZS13aW5uZXIgcmFjZVxuXHR3aGVuLnNvbWUgICAgICAgID0gbGlmdChQcm9taXNlLnNvbWUpOyAgIC8vIE11bHRpLXdpbm5lciByYWNlXG5cdHdoZW4ucmFjZSAgICAgICAgPSBsaWZ0KFByb21pc2UucmFjZSk7ICAgLy8gRmlyc3QtdG8tc2V0dGxlIHJhY2VcblxuXHR3aGVuLm1hcCAgICAgICAgID0gbWFwOyAgICAgICAgICAgICAgICAgIC8vIEFycmF5Lm1hcCgpIGZvciBwcm9taXNlc1xuXHR3aGVuLmZpbHRlciAgICAgID0gZmlsdGVyOyAgICAgICAgICAgICAgIC8vIEFycmF5LmZpbHRlcigpIGZvciBwcm9taXNlc1xuXHR3aGVuLnJlZHVjZSAgICAgID0gbGlmdChQcm9taXNlLnJlZHVjZSk7ICAgICAgIC8vIEFycmF5LnJlZHVjZSgpIGZvciBwcm9taXNlc1xuXHR3aGVuLnJlZHVjZVJpZ2h0ID0gbGlmdChQcm9taXNlLnJlZHVjZVJpZ2h0KTsgIC8vIEFycmF5LnJlZHVjZVJpZ2h0KCkgZm9yIHByb21pc2VzXG5cblx0d2hlbi5pc1Byb21pc2VMaWtlID0gaXNQcm9taXNlTGlrZTsgICAgICAvLyBJcyBzb21ldGhpbmcgcHJvbWlzZS1saWtlLCBha2EgdGhlbmFibGVcblxuXHR3aGVuLlByb21pc2UgICAgID0gUHJvbWlzZTsgICAgICAgICAgICAgIC8vIFByb21pc2UgY29uc3RydWN0b3Jcblx0d2hlbi5kZWZlciAgICAgICA9IGRlZmVyOyAgICAgICAgICAgICAgICAvLyBDcmVhdGUgYSB7cHJvbWlzZSwgcmVzb2x2ZSwgcmVqZWN0fSB0dXBsZVxuXG5cdC8vIEVycm9yIHR5cGVzXG5cblx0d2hlbi5UaW1lb3V0RXJyb3IgPSBUaW1lb3V0RXJyb3I7XG5cblx0LyoqXG5cdCAqIEdldCBhIHRydXN0ZWQgcHJvbWlzZSBmb3IgeCwgb3IgYnkgdHJhbnNmb3JtaW5nIHggd2l0aCBvbkZ1bGZpbGxlZFxuXHQgKlxuXHQgKiBAcGFyYW0geyp9IHhcblx0ICogQHBhcmFtIHtmdW5jdGlvbj99IG9uRnVsZmlsbGVkIGNhbGxiYWNrIHRvIGJlIGNhbGxlZCB3aGVuIHggaXNcblx0ICogICBzdWNjZXNzZnVsbHkgZnVsZmlsbGVkLiAgSWYgcHJvbWlzZU9yVmFsdWUgaXMgYW4gaW1tZWRpYXRlIHZhbHVlLCBjYWxsYmFja1xuXHQgKiAgIHdpbGwgYmUgaW52b2tlZCBpbW1lZGlhdGVseS5cblx0ICogQHBhcmFtIHtmdW5jdGlvbj99IG9uUmVqZWN0ZWQgY2FsbGJhY2sgdG8gYmUgY2FsbGVkIHdoZW4geCBpc1xuXHQgKiAgIHJlamVjdGVkLlxuXHQgKiBAcGFyYW0ge2Z1bmN0aW9uP30gb25Qcm9ncmVzcyBjYWxsYmFjayB0byBiZSBjYWxsZWQgd2hlbiBwcm9ncmVzcyB1cGRhdGVzXG5cdCAqICAgYXJlIGlzc3VlZCBmb3IgeC4gQGRlcHJlY2F0ZWRcblx0ICogQHJldHVybnMge1Byb21pc2V9IGEgbmV3IHByb21pc2UgdGhhdCB3aWxsIGZ1bGZpbGwgd2l0aCB0aGUgcmV0dXJuXG5cdCAqICAgdmFsdWUgb2YgY2FsbGJhY2sgb3IgZXJyYmFjayBvciB0aGUgY29tcGxldGlvbiB2YWx1ZSBvZiBwcm9taXNlT3JWYWx1ZSBpZlxuXHQgKiAgIGNhbGxiYWNrIGFuZC9vciBlcnJiYWNrIGlzIG5vdCBzdXBwbGllZC5cblx0ICovXG5cdGZ1bmN0aW9uIHdoZW4oeCwgb25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQsIG9uUHJvZ3Jlc3MpIHtcblx0XHR2YXIgcCA9IFByb21pc2UucmVzb2x2ZSh4KTtcblx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcblx0XHRcdHJldHVybiBwO1xuXHRcdH1cblxuXHRcdHJldHVybiBwLnRoZW4ob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQsIG9uUHJvZ3Jlc3MpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENyZWF0ZXMgYSBuZXcgcHJvbWlzZSB3aG9zZSBmYXRlIGlzIGRldGVybWluZWQgYnkgcmVzb2x2ZXIuXG5cdCAqIEBwYXJhbSB7ZnVuY3Rpb259IHJlc29sdmVyIGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCwgbm90aWZ5KVxuXHQgKiBAcmV0dXJucyB7UHJvbWlzZX0gcHJvbWlzZSB3aG9zZSBmYXRlIGlzIGRldGVybWluZSBieSByZXNvbHZlclxuXHQgKi9cblx0ZnVuY3Rpb24gcHJvbWlzZShyZXNvbHZlcikge1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlcik7XG5cdH1cblxuXHQvKipcblx0ICogTGlmdCB0aGUgc3VwcGxpZWQgZnVuY3Rpb24sIGNyZWF0aW5nIGEgdmVyc2lvbiBvZiBmIHRoYXQgcmV0dXJuc1xuXHQgKiBwcm9taXNlcywgYW5kIGFjY2VwdHMgcHJvbWlzZXMgYXMgYXJndW1lbnRzLlxuXHQgKiBAcGFyYW0ge2Z1bmN0aW9ufSBmXG5cdCAqIEByZXR1cm5zIHtGdW5jdGlvbn0gdmVyc2lvbiBvZiBmIHRoYXQgcmV0dXJucyBwcm9taXNlc1xuXHQgKi9cblx0ZnVuY3Rpb24gbGlmdChmKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdFx0Zm9yKHZhciBpPTAsIGw9YXJndW1lbnRzLmxlbmd0aCwgYT1uZXcgQXJyYXkobCk7IGk8bDsgKytpKSB7XG5cdFx0XHRcdGFbaV0gPSBhcmd1bWVudHNbaV07XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYXBwbHkoZiwgdGhpcywgYSk7XG5cdFx0fTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDYWxsIGYgaW4gYSBmdXR1cmUgdHVybiwgd2l0aCB0aGUgc3VwcGxpZWQgYXJncywgYW5kIHJldHVybiBhIHByb21pc2Vcblx0ICogZm9yIHRoZSByZXN1bHQuXG5cdCAqIEBwYXJhbSB7ZnVuY3Rpb259IGZcblx0ICogQHJldHVybnMge1Byb21pc2V9XG5cdCAqL1xuXHRmdW5jdGlvbiBhdHRlbXB0KGYgLyosIGFyZ3MuLi4gKi8pIHtcblx0XHQvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuXHRcdGZvcih2YXIgaT0wLCBsPWFyZ3VtZW50cy5sZW5ndGgtMSwgYT1uZXcgQXJyYXkobCk7IGk8bDsgKytpKSB7XG5cdFx0XHRhW2ldID0gYXJndW1lbnRzW2krMV07XG5cdFx0fVxuXHRcdHJldHVybiBhcHBseShmLCB0aGlzLCBhKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDcmVhdGVzIGEge3Byb21pc2UsIHJlc29sdmVyfSBwYWlyLCBlaXRoZXIgb3IgYm90aCBvZiB3aGljaFxuXHQgKiBtYXkgYmUgZ2l2ZW4gb3V0IHNhZmVseSB0byBjb25zdW1lcnMuXG5cdCAqIEByZXR1cm4ge3twcm9taXNlOiBQcm9taXNlLCByZXNvbHZlOiBmdW5jdGlvbiwgcmVqZWN0OiBmdW5jdGlvbiwgbm90aWZ5OiBmdW5jdGlvbn19XG5cdCAqL1xuXHRmdW5jdGlvbiBkZWZlcigpIHtcblx0XHRyZXR1cm4gbmV3IERlZmVycmVkKCk7XG5cdH1cblxuXHRmdW5jdGlvbiBEZWZlcnJlZCgpIHtcblx0XHR2YXIgcCA9IFByb21pc2UuX2RlZmVyKCk7XG5cblx0XHRmdW5jdGlvbiByZXNvbHZlKHgpIHsgcC5faGFuZGxlci5yZXNvbHZlKHgpOyB9XG5cdFx0ZnVuY3Rpb24gcmVqZWN0KHgpIHsgcC5faGFuZGxlci5yZWplY3QoeCk7IH1cblx0XHRmdW5jdGlvbiBub3RpZnkoeCkgeyBwLl9oYW5kbGVyLm5vdGlmeSh4KTsgfVxuXG5cdFx0dGhpcy5wcm9taXNlID0gcDtcblx0XHR0aGlzLnJlc29sdmUgPSByZXNvbHZlO1xuXHRcdHRoaXMucmVqZWN0ID0gcmVqZWN0O1xuXHRcdHRoaXMubm90aWZ5ID0gbm90aWZ5O1xuXHRcdHRoaXMucmVzb2x2ZXIgPSB7IHJlc29sdmU6IHJlc29sdmUsIHJlamVjdDogcmVqZWN0LCBub3RpZnk6IG5vdGlmeSB9O1xuXHR9XG5cblx0LyoqXG5cdCAqIERldGVybWluZXMgaWYgeCBpcyBwcm9taXNlLWxpa2UsIGkuZS4gYSB0aGVuYWJsZSBvYmplY3Rcblx0ICogTk9URTogV2lsbCByZXR1cm4gdHJ1ZSBmb3IgKmFueSB0aGVuYWJsZSBvYmplY3QqLCBhbmQgaXNuJ3QgdHJ1bHlcblx0ICogc2FmZSwgc2luY2UgaXQgbWF5IGF0dGVtcHQgdG8gYWNjZXNzIHRoZSBgdGhlbmAgcHJvcGVydHkgb2YgeCAoaS5lLlxuXHQgKiAgY2xldmVyL21hbGljaW91cyBnZXR0ZXJzIG1heSBkbyB3ZWlyZCB0aGluZ3MpXG5cdCAqIEBwYXJhbSB7Kn0geCBhbnl0aGluZ1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZiB4IGlzIHByb21pc2UtbGlrZVxuXHQgKi9cblx0ZnVuY3Rpb24gaXNQcm9taXNlTGlrZSh4KSB7XG5cdFx0cmV0dXJuIHggJiYgdHlwZW9mIHgudGhlbiA9PT0gJ2Z1bmN0aW9uJztcblx0fVxuXG5cdC8qKlxuXHQgKiBSZXR1cm4gYSBwcm9taXNlIHRoYXQgd2lsbCByZXNvbHZlIG9ubHkgb25jZSBhbGwgdGhlIHN1cHBsaWVkIGFyZ3VtZW50c1xuXHQgKiBoYXZlIHJlc29sdmVkLiBUaGUgcmVzb2x1dGlvbiB2YWx1ZSBvZiB0aGUgcmV0dXJuZWQgcHJvbWlzZSB3aWxsIGJlIGFuIGFycmF5XG5cdCAqIGNvbnRhaW5pbmcgdGhlIHJlc29sdXRpb24gdmFsdWVzIG9mIGVhY2ggb2YgdGhlIGFyZ3VtZW50cy5cblx0ICogQHBhcmFtIHsuLi4qfSBhcmd1bWVudHMgbWF5IGJlIGEgbWl4IG9mIHByb21pc2VzIGFuZCB2YWx1ZXNcblx0ICogQHJldHVybnMge1Byb21pc2V9XG5cdCAqL1xuXHRmdW5jdGlvbiBqb2luKC8qIC4uLnByb21pc2VzICovKSB7XG5cdFx0cmV0dXJuIFByb21pc2UuYWxsKGFyZ3VtZW50cyk7XG5cdH1cblxuXHQvKipcblx0ICogUmV0dXJuIGEgcHJvbWlzZSB0aGF0IHdpbGwgZnVsZmlsbCBvbmNlIGFsbCBpbnB1dCBwcm9taXNlcyBoYXZlXG5cdCAqIGZ1bGZpbGxlZCwgb3IgcmVqZWN0IHdoZW4gYW55IG9uZSBpbnB1dCBwcm9taXNlIHJlamVjdHMuXG5cdCAqIEBwYXJhbSB7YXJyYXl8UHJvbWlzZX0gcHJvbWlzZXMgYXJyYXkgKG9yIHByb21pc2UgZm9yIGFuIGFycmF5KSBvZiBwcm9taXNlc1xuXHQgKiBAcmV0dXJucyB7UHJvbWlzZX1cblx0ICovXG5cdGZ1bmN0aW9uIGFsbChwcm9taXNlcykge1xuXHRcdHJldHVybiB3aGVuKHByb21pc2VzLCBQcm9taXNlLmFsbCk7XG5cdH1cblxuXHQvKipcblx0ICogUmV0dXJuIGEgcHJvbWlzZSB0aGF0IHdpbGwgYWx3YXlzIGZ1bGZpbGwgd2l0aCBhbiBhcnJheSBjb250YWluaW5nXG5cdCAqIHRoZSBvdXRjb21lIHN0YXRlcyBvZiBhbGwgaW5wdXQgcHJvbWlzZXMuICBUaGUgcmV0dXJuZWQgcHJvbWlzZVxuXHQgKiB3aWxsIG9ubHkgcmVqZWN0IGlmIGBwcm9taXNlc2AgaXRzZWxmIGlzIGEgcmVqZWN0ZWQgcHJvbWlzZS5cblx0ICogQHBhcmFtIHthcnJheXxQcm9taXNlfSBwcm9taXNlcyBhcnJheSAob3IgcHJvbWlzZSBmb3IgYW4gYXJyYXkpIG9mIHByb21pc2VzXG5cdCAqIEByZXR1cm5zIHtQcm9taXNlfSBwcm9taXNlIGZvciBhcnJheSBvZiBzZXR0bGVkIHN0YXRlIGRlc2NyaXB0b3JzXG5cdCAqL1xuXHRmdW5jdGlvbiBzZXR0bGUocHJvbWlzZXMpIHtcblx0XHRyZXR1cm4gd2hlbihwcm9taXNlcywgUHJvbWlzZS5zZXR0bGUpO1xuXHR9XG5cblx0LyoqXG5cdCAqIFByb21pc2UtYXdhcmUgYXJyYXkgbWFwIGZ1bmN0aW9uLCBzaW1pbGFyIHRvIGBBcnJheS5wcm90b3R5cGUubWFwKClgLFxuXHQgKiBidXQgaW5wdXQgYXJyYXkgbWF5IGNvbnRhaW4gcHJvbWlzZXMgb3IgdmFsdWVzLlxuXHQgKiBAcGFyYW0ge0FycmF5fFByb21pc2V9IHByb21pc2VzIGFycmF5IG9mIGFueXRoaW5nLCBtYXkgY29udGFpbiBwcm9taXNlcyBhbmQgdmFsdWVzXG5cdCAqIEBwYXJhbSB7ZnVuY3Rpb24oeDoqLCBpbmRleDpOdW1iZXIpOip9IG1hcEZ1bmMgbWFwIGZ1bmN0aW9uIHdoaWNoIG1heVxuXHQgKiAgcmV0dXJuIGEgcHJvbWlzZSBvciB2YWx1ZVxuXHQgKiBAcmV0dXJucyB7UHJvbWlzZX0gcHJvbWlzZSB0aGF0IHdpbGwgZnVsZmlsbCB3aXRoIGFuIGFycmF5IG9mIG1hcHBlZCB2YWx1ZXNcblx0ICogIG9yIHJlamVjdCBpZiBhbnkgaW5wdXQgcHJvbWlzZSByZWplY3RzLlxuXHQgKi9cblx0ZnVuY3Rpb24gbWFwKHByb21pc2VzLCBtYXBGdW5jKSB7XG5cdFx0cmV0dXJuIHdoZW4ocHJvbWlzZXMsIGZ1bmN0aW9uKHByb21pc2VzKSB7XG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5tYXAocHJvbWlzZXMsIG1hcEZ1bmMpO1xuXHRcdH0pO1xuXHR9XG5cblx0LyoqXG5cdCAqIEZpbHRlciB0aGUgcHJvdmlkZWQgYXJyYXkgb2YgcHJvbWlzZXMgdXNpbmcgdGhlIHByb3ZpZGVkIHByZWRpY2F0ZS4gIElucHV0IG1heVxuXHQgKiBjb250YWluIHByb21pc2VzIGFuZCB2YWx1ZXNcblx0ICogQHBhcmFtIHtBcnJheXxQcm9taXNlfSBwcm9taXNlcyBhcnJheSBvZiBwcm9taXNlcyBhbmQgdmFsdWVzXG5cdCAqIEBwYXJhbSB7ZnVuY3Rpb24oeDoqLCBpbmRleDpOdW1iZXIpOmJvb2xlYW59IHByZWRpY2F0ZSBmaWx0ZXJpbmcgcHJlZGljYXRlLlxuXHQgKiAgTXVzdCByZXR1cm4gdHJ1dGh5IChvciBwcm9taXNlIGZvciB0cnV0aHkpIGZvciBpdGVtcyB0byByZXRhaW4uXG5cdCAqIEByZXR1cm5zIHtQcm9taXNlfSBwcm9taXNlIHRoYXQgd2lsbCBmdWxmaWxsIHdpdGggYW4gYXJyYXkgY29udGFpbmluZyBhbGwgaXRlbXNcblx0ICogIGZvciB3aGljaCBwcmVkaWNhdGUgcmV0dXJuZWQgdHJ1dGh5LlxuXHQgKi9cblx0ZnVuY3Rpb24gZmlsdGVyKHByb21pc2VzLCBwcmVkaWNhdGUpIHtcblx0XHRyZXR1cm4gd2hlbihwcm9taXNlcywgZnVuY3Rpb24ocHJvbWlzZXMpIHtcblx0XHRcdHJldHVybiBQcm9taXNlLmZpbHRlcihwcm9taXNlcywgcHJlZGljYXRlKTtcblx0XHR9KTtcblx0fVxuXG5cdHJldHVybiB3aGVuO1xufSk7XG59KSh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUgOiBmdW5jdGlvbiAoZmFjdG9yeSkgeyBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSk7IH0pO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDEzIHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuICogQGxpY2Vuc2UgTUlULCBzZWUgTElDRU5TRS50eHQgZm9yIGRldGFpbHNcbiAqXG4gKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiAqL1xuXG4oZnVuY3Rpb24gKGRlZmluZSkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0ZGVmaW5lKGZ1bmN0aW9uICgvKiByZXF1aXJlICovKSB7XG5cblx0XHRyZXR1cm4ge1xuXG5cdFx0XHQvKipcblx0XHRcdCAqIEZpbmQgb2JqZWN0cyB3aXRoaW4gYSBncmFwaCB0aGUgY29udGFpbiBhIHByb3BlcnR5IG9mIGEgY2VydGFpbiBuYW1lLlxuXHRcdFx0ICpcblx0XHRcdCAqIE5PVEU6IHRoaXMgbWV0aG9kIHdpbGwgbm90IGRpc2NvdmVyIG9iamVjdCBncmFwaCBjeWNsZXMuXG5cdFx0XHQgKlxuXHRcdFx0ICogQHBhcmFtIHsqfSBvYmogb2JqZWN0IHRvIHNlYXJjaCBvblxuXHRcdFx0ICogQHBhcmFtIHtzdHJpbmd9IHByb3AgbmFtZSBvZiB0aGUgcHJvcGVydHkgdG8gc2VhcmNoIGZvclxuXHRcdFx0ICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgZm91bmQgcHJvcGVydGllcyBhbmQgdGhlaXIgcGFyZW50XG5cdFx0XHQgKi9cblx0XHRcdGZpbmRQcm9wZXJ0aWVzOiBmdW5jdGlvbiBmaW5kUHJvcGVydGllcyhvYmosIHByb3AsIGNhbGxiYWNrKSB7XG5cdFx0XHRcdGlmICh0eXBlb2Ygb2JqICE9PSAnb2JqZWN0JyB8fCBvYmogPT09IG51bGwpIHsgcmV0dXJuOyB9XG5cdFx0XHRcdGlmIChwcm9wIGluIG9iaikge1xuXHRcdFx0XHRcdGNhbGxiYWNrKG9ialtwcm9wXSwgb2JqLCBwcm9wKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRPYmplY3Qua2V5cyhvYmopLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuXHRcdFx0XHRcdGZpbmRQcm9wZXJ0aWVzKG9ialtrZXldLCBwcm9wLCBjYWxsYmFjayk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0fTtcblxuXHR9KTtcblxufShcblx0dHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lIDogZnVuY3Rpb24gKGZhY3RvcnkpIHsgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUpOyB9XG5cdC8vIEJvaWxlcnBsYXRlIGZvciBBTUQgYW5kIE5vZGVcbikpO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDEzIHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuICogQGxpY2Vuc2UgTUlULCBzZWUgTElDRU5TRS50eHQgZm9yIGRldGFpbHNcbiAqXG4gKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiAqL1xuXG4oZnVuY3Rpb24gKGRlZmluZSkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0ZGVmaW5lKGZ1bmN0aW9uIChyZXF1aXJlKSB7XG5cblx0XHR2YXIgd2hlbjtcblxuXHRcdHdoZW4gPSByZXF1aXJlKCd3aGVuJyk7XG5cblx0XHQvKipcblx0XHQgKiBDcmVhdGUgYSBwcm9taXNlIHdob3NlIHdvcmsgaXMgc3RhcnRlZCBvbmx5IHdoZW4gYSBoYW5kbGVyIGlzIHJlZ2lzdGVyZWQuXG5cdFx0ICpcblx0XHQgKiBUaGUgd29yayBmdW5jdGlvbiB3aWxsIGJlIGludm9rZWQgYXQgbW9zdCBvbmNlLiBUaHJvd24gdmFsdWVzIHdpbGwgcmVzdWx0XG5cdFx0ICogaW4gcHJvbWlzZSByZWplY3Rpb24uXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge0Z1bmN0aW9ufSB3b3JrIGZ1bmN0aW9uIHdob3NlIG91cHV0IGlzIHVzZWQgdG8gcmVzb2x2ZSB0aGVcblx0XHQgKiAgIHJldHVybmVkIHByb21pc2UuXG5cdFx0ICogQHJldHVybnMge1Byb21pc2V9IGEgbGF6eSBwcm9taXNlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gbGF6eVByb21pc2Uod29yaykge1xuXHRcdFx0dmFyIGRlZmVyLCBzdGFydGVkLCByZXNvbHZlciwgcHJvbWlzZSwgdGhlbjtcblxuXHRcdFx0ZGVmZXIgPSB3aGVuLmRlZmVyKCk7XG5cdFx0XHRzdGFydGVkID0gZmFsc2U7XG5cblx0XHRcdHJlc29sdmVyID0gZGVmZXIucmVzb2x2ZXI7XG5cdFx0XHRwcm9taXNlID0gZGVmZXIucHJvbWlzZTtcblx0XHRcdHRoZW4gPSBwcm9taXNlLnRoZW47XG5cblx0XHRcdHByb21pc2UudGhlbiA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0aWYgKCFzdGFydGVkKSB7XG5cdFx0XHRcdFx0c3RhcnRlZCA9IHRydWU7XG5cdFx0XHRcdFx0d2hlbi5hdHRlbXB0KHdvcmspLnRoZW4ocmVzb2x2ZXIucmVzb2x2ZSwgcmVzb2x2ZXIucmVqZWN0KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gdGhlbi5hcHBseShwcm9taXNlLCBhcmd1bWVudHMpO1xuXHRcdFx0fTtcblxuXHRcdFx0cmV0dXJuIHByb21pc2U7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGxhenlQcm9taXNlO1xuXG5cdH0pO1xuXG59KFxuXHR0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUgOiBmdW5jdGlvbiAoZmFjdG9yeSkgeyBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSk7IH1cblx0Ly8gQm9pbGVycGxhdGUgZm9yIEFNRCBhbmQgTm9kZVxuKSk7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTItMjAxMyB0aGUgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4gKlxuICogQGF1dGhvciBTY290dCBBbmRyZXdzXG4gKi9cblxuKGZ1bmN0aW9uIChkZWZpbmUpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdC8vIGRlcml2ZWQgZnJvbSBkb2pvLm1peGluXG5cdGRlZmluZShmdW5jdGlvbiAoLyogcmVxdWlyZSAqLykge1xuXG5cdFx0dmFyIGVtcHR5ID0ge307XG5cblx0XHQvKipcblx0XHQgKiBNaXggdGhlIHByb3BlcnRpZXMgZnJvbSB0aGUgc291cmNlIG9iamVjdCBpbnRvIHRoZSBkZXN0aW5hdGlvbiBvYmplY3QuXG5cdFx0ICogV2hlbiB0aGUgc2FtZSBwcm9wZXJ0eSBvY2N1cnMgaW4gbW9yZSB0aGVuIG9uZSBvYmplY3QsIHRoZSByaWdodCBtb3N0XG5cdFx0ICogdmFsdWUgd2lucy5cblx0XHQgKlxuXHRcdCAqIEBwYXJhbSB7T2JqZWN0fSBkZXN0IHRoZSBvYmplY3QgdG8gY29weSBwcm9wZXJ0aWVzIHRvXG5cdFx0ICogQHBhcmFtIHtPYmplY3R9IHNvdXJjZXMgdGhlIG9iamVjdHMgdG8gY29weSBwcm9wZXJ0aWVzIGZyb20uICBNYXkgYmUgMSB0byBOIGFyZ3VtZW50cywgYnV0IG5vdCBhbiBBcnJheS5cblx0XHQgKiBAcmV0dXJuIHtPYmplY3R9IHRoZSBkZXN0aW5hdGlvbiBvYmplY3Rcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBtaXhpbihkZXN0IC8qLCBzb3VyY2VzLi4uICovKSB7XG5cdFx0XHR2YXIgaSwgbCwgc291cmNlLCBuYW1lO1xuXG5cdFx0XHRpZiAoIWRlc3QpIHsgZGVzdCA9IHt9OyB9XG5cdFx0XHRmb3IgKGkgPSAxLCBsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGw7IGkgKz0gMSkge1xuXHRcdFx0XHRzb3VyY2UgPSBhcmd1bWVudHNbaV07XG5cdFx0XHRcdGZvciAobmFtZSBpbiBzb3VyY2UpIHtcblx0XHRcdFx0XHRpZiAoIShuYW1lIGluIGRlc3QpIHx8IChkZXN0W25hbWVdICE9PSBzb3VyY2VbbmFtZV0gJiYgKCEobmFtZSBpbiBlbXB0eSkgfHwgZW1wdHlbbmFtZV0gIT09IHNvdXJjZVtuYW1lXSkpKSB7XG5cdFx0XHRcdFx0XHRkZXN0W25hbWVdID0gc291cmNlW25hbWVdO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gZGVzdDsgLy8gT2JqZWN0XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG1peGluO1xuXG5cdH0pO1xuXG59KFxuXHR0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUgOiBmdW5jdGlvbiAoZmFjdG9yeSkgeyBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSk7IH1cblx0Ly8gQm9pbGVycGxhdGUgZm9yIEFNRCBhbmQgTm9kZVxuKSk7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTIgdGhlIG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzXG4gKiBAbGljZW5zZSBNSVQsIHNlZSBMSUNFTlNFLnR4dCBmb3IgZGV0YWlsc1xuICpcbiAqIEBhdXRob3IgU2NvdHQgQW5kcmV3c1xuICovXG5cbihmdW5jdGlvbiAoZGVmaW5lKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHRkZWZpbmUoZnVuY3Rpb24gKC8qIHJlcXVpcmUgKi8pIHtcblxuXHRcdC8qKlxuXHRcdCAqIE5vcm1hbGl6ZSBIVFRQIGhlYWRlciBuYW1lcyB1c2luZyB0aGUgcHNldWRvIGNhbWVsIGNhc2UuXG5cdFx0ICpcblx0XHQgKiBGb3IgZXhhbXBsZTpcblx0XHQgKiAgIGNvbnRlbnQtdHlwZSAgICAgICAgIC0+IENvbnRlbnQtVHlwZVxuXHRcdCAqICAgYWNjZXB0cyAgICAgICAgICAgICAgLT4gQWNjZXB0c1xuXHRcdCAqICAgeC1jdXN0b20taGVhZGVyLW5hbWUgLT4gWC1DdXN0b20tSGVhZGVyLU5hbWVcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIHRoZSByYXcgaGVhZGVyIG5hbWVcblx0XHQgKiBAcmV0dXJuIHtzdHJpbmd9IHRoZSBub3JtYWxpemVkIGhlYWRlciBuYW1lXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gbm9ybWFsaXplSGVhZGVyTmFtZShuYW1lKSB7XG5cdFx0XHRyZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpXG5cdFx0XHRcdC5zcGxpdCgnLScpXG5cdFx0XHRcdC5tYXAoZnVuY3Rpb24gKGNodW5rKSB7IHJldHVybiBjaHVuay5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGNodW5rLnNsaWNlKDEpOyB9KVxuXHRcdFx0XHQuam9pbignLScpO1xuXHRcdH1cblxuXHRcdHJldHVybiBub3JtYWxpemVIZWFkZXJOYW1lO1xuXG5cdH0pO1xuXG59KFxuXHR0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUgOiBmdW5jdGlvbiAoZmFjdG9yeSkgeyBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSk7IH1cblx0Ly8gQm9pbGVycGxhdGUgZm9yIEFNRCBhbmQgTm9kZVxuKSk7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTQtMjAxNSB0aGUgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIEBsaWNlbnNlIE1JVCwgc2VlIExJQ0VOU0UudHh0IGZvciBkZXRhaWxzXG4gKlxuICogQGF1dGhvciBTY290dCBBbmRyZXdzXG4gKi9cblxuKGZ1bmN0aW9uIChkZWZpbmUpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdGRlZmluZShmdW5jdGlvbiAocmVxdWlyZSkge1xuXG5cdFx0dmFyIHdoZW4gPSByZXF1aXJlKCd3aGVuJyksXG5cdFx0XHRub3JtYWxpemVIZWFkZXJOYW1lID0gcmVxdWlyZSgnLi9ub3JtYWxpemVIZWFkZXJOYW1lJyk7XG5cblx0XHRmdW5jdGlvbiBwcm9wZXJ0eShwcm9taXNlLCBuYW1lKSB7XG5cdFx0XHRyZXR1cm4gcHJvbWlzZS50aGVuKFxuXHRcdFx0XHRmdW5jdGlvbiAodmFsdWUpIHtcblx0XHRcdFx0XHRyZXR1cm4gdmFsdWUgJiYgdmFsdWVbbmFtZV07XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRcdFx0XHRcdHJldHVybiB3aGVuLnJlamVjdCh2YWx1ZSAmJiB2YWx1ZVtuYW1lXSk7XG5cdFx0XHRcdH1cblx0XHRcdCk7XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogT2J0YWluIHRoZSByZXNwb25zZSBlbnRpdHlcblx0XHQgKlxuXHRcdCAqIEByZXR1cm5zIHtQcm9taXNlfSBmb3IgdGhlIHJlc3BvbnNlIGVudGl0eVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGVudGl0eSgpIHtcblx0XHRcdC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG5cdFx0XHRyZXR1cm4gcHJvcGVydHkodGhpcywgJ2VudGl0eScpO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIE9idGFpbiB0aGUgcmVzcG9uc2Ugc3RhdHVzXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7UHJvbWlzZX0gZm9yIHRoZSByZXNwb25zZSBzdGF0dXNcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBzdGF0dXMoKSB7XG5cdFx0XHQvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuXHRcdFx0cmV0dXJuIHByb3BlcnR5KHByb3BlcnR5KHRoaXMsICdzdGF0dXMnKSwgJ2NvZGUnKTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBPYnRhaW4gdGhlIHJlc3BvbnNlIGhlYWRlcnMgbWFwXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7UHJvbWlzZX0gZm9yIHRoZSByZXNwb25zZSBoZWFkZXJzIG1hcFxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGhlYWRlcnMoKSB7XG5cdFx0XHQvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuXHRcdFx0cmV0dXJuIHByb3BlcnR5KHRoaXMsICdoZWFkZXJzJyk7XG5cdFx0fVxuXG5cdFx0LyoqXG5cdFx0ICogT2J0YWluIGEgc3BlY2lmaWMgcmVzcG9uc2UgaGVhZGVyXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge1N0cmluZ30gaGVhZGVyTmFtZSB0aGUgaGVhZGVyIHRvIHJldHJpZXZlXG5cdFx0ICogQHJldHVybnMge1Byb21pc2V9IGZvciB0aGUgcmVzcG9uc2UgaGVhZGVyJ3MgdmFsdWVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBoZWFkZXIoaGVhZGVyTmFtZSkge1xuXHRcdFx0Lypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cblx0XHRcdGhlYWRlck5hbWUgPSBub3JtYWxpemVIZWFkZXJOYW1lKGhlYWRlck5hbWUpO1xuXHRcdFx0cmV0dXJuIHByb3BlcnR5KHRoaXMuaGVhZGVycygpLCBoZWFkZXJOYW1lKTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBGb2xsb3cgYSByZWxhdGVkIHJlc291cmNlXG5cdFx0ICpcblx0XHQgKiBUaGUgcmVsYXRpb25zaGlwIHRvIGZvbGxvdyBtYXkgYmUgZGVmaW5lIGFzIGEgcGxhaW4gc3RyaW5nLCBhbiBvYmplY3Rcblx0XHQgKiB3aXRoIHRoZSByZWwgYW5kIHBhcmFtcywgb3IgYW4gYXJyYXkgY29udGFpbmluZyBvbmUgb3IgbW9yZSBlbnRyaWVzXG5cdFx0ICogd2l0aCB0aGUgcHJldmlvdXMgZm9ybXMuXG5cdFx0ICpcblx0XHQgKiBFeGFtcGxlczpcblx0XHQgKiAgIHJlc3BvbnNlLmZvbGxvdygnbmV4dCcpXG5cdFx0ICpcblx0XHQgKiAgIHJlc3BvbnNlLmZvbGxvdyh7IHJlbDogJ25leHQnLCBwYXJhbXM6IHsgcGFnZVNpemU6IDEwMCB9IH0pXG5cdFx0ICpcblx0XHQgKiAgIHJlc3BvbnNlLmZvbGxvdyhbXG5cdFx0ICogICAgICAgeyByZWw6ICdpdGVtcycsIHBhcmFtczogeyBwcm9qZWN0aW9uOiAnbm9JbWFnZXMnIH0gfSxcblx0XHQgKiAgICAgICAnc2VhcmNoJyxcblx0XHQgKiAgICAgICB7IHJlbDogJ2ZpbmRCeUdhbGxlcnlJc051bGwnLCBwYXJhbXM6IHsgcHJvamVjdGlvbjogJ25vSW1hZ2VzJyB9IH0sXG5cdFx0ICogICAgICAgJ2l0ZW1zJ1xuXHRcdCAqICAgXSlcblx0XHQgKlxuXHRcdCAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdHxBcnJheX0gcmVscyBvbmUsIG9yIG1vcmUsIHJlbGF0aW9uc2hpcHMgdG8gZm9sbG93XG5cdFx0ICogQHJldHVybnMgUmVzcG9uc2VQcm9taXNlPFJlc3BvbnNlPiByZWxhdGVkIHJlc291cmNlXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gZm9sbG93KHJlbHMpIHtcblx0XHRcdC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG5cdFx0XHRyZWxzID0gW10uY29uY2F0KHJlbHMpO1xuXHRcdFx0cmV0dXJuIG1ha2Uod2hlbi5yZWR1Y2UocmVscywgZnVuY3Rpb24gKHJlc3BvbnNlLCByZWwpIHtcblx0XHRcdFx0aWYgKHR5cGVvZiByZWwgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRcdFx0cmVsID0geyByZWw6IHJlbCB9O1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICh0eXBlb2YgcmVzcG9uc2UuZW50aXR5LmNsaWVudEZvciAhPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcignSHlwZXJtZWRpYSByZXNwb25zZSBleHBlY3RlZCcpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciBjbGllbnQgPSByZXNwb25zZS5lbnRpdHkuY2xpZW50Rm9yKHJlbC5yZWwpO1xuXHRcdFx0XHRyZXR1cm4gY2xpZW50KHsgcGFyYW1zOiByZWwucGFyYW1zIH0pO1xuXHRcdFx0fSwgdGhpcykpO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIFdyYXAgYSBQcm9taXNlIGFzIGFuIFJlc3BvbnNlUHJvbWlzZVxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtQcm9taXNlPFJlc3BvbnNlPn0gcHJvbWlzZSB0aGUgcHJvbWlzZSBmb3IgYW4gSFRUUCBSZXNwb25zZVxuXHRcdCAqIEByZXR1cm5zIHtSZXNwb25zZVByb21pc2U8UmVzcG9uc2U+fSB3cmFwcGVkIHByb21pc2UgZm9yIFJlc3BvbnNlIHdpdGggYWRkaXRpb25hbCBoZWxwZXIgbWV0aG9kc1xuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIG1ha2UocHJvbWlzZSkge1xuXHRcdFx0cHJvbWlzZS5zdGF0dXMgPSBzdGF0dXM7XG5cdFx0XHRwcm9taXNlLmhlYWRlcnMgPSBoZWFkZXJzO1xuXHRcdFx0cHJvbWlzZS5oZWFkZXIgPSBoZWFkZXI7XG5cdFx0XHRwcm9taXNlLmVudGl0eSA9IGVudGl0eTtcblx0XHRcdHByb21pc2UuZm9sbG93ID0gZm9sbG93O1xuXHRcdFx0cmV0dXJuIHByb21pc2U7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcmVzcG9uc2VQcm9taXNlKCkge1xuXHRcdFx0cmV0dXJuIG1ha2Uod2hlbi5hcHBseSh3aGVuLCBhcmd1bWVudHMpKTtcblx0XHR9XG5cblx0XHRyZXNwb25zZVByb21pc2UubWFrZSA9IG1ha2U7XG5cdFx0cmVzcG9uc2VQcm9taXNlLnJlamVjdCA9IGZ1bmN0aW9uICh2YWwpIHtcblx0XHRcdHJldHVybiBtYWtlKHdoZW4ucmVqZWN0KHZhbCkpO1xuXHRcdH07XG5cdFx0cmVzcG9uc2VQcm9taXNlLnByb21pc2UgPSBmdW5jdGlvbiAoZnVuYykge1xuXHRcdFx0cmV0dXJuIG1ha2Uod2hlbi5wcm9taXNlKGZ1bmMpKTtcblx0XHR9O1xuXG5cdFx0cmV0dXJuIHJlc3BvbnNlUHJvbWlzZTtcblxuXHR9KTtcblxufShcblx0dHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lIDogZnVuY3Rpb24gKGZhY3RvcnkpIHsgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUpOyB9XG5cdC8vIEJvaWxlcnBsYXRlIGZvciBBTUQgYW5kIE5vZGVcbikpO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDE1IHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuICogQGxpY2Vuc2UgTUlULCBzZWUgTElDRU5TRS50eHQgZm9yIGRldGFpbHNcbiAqXG4gKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiAqL1xuXG4oZnVuY3Rpb24gKGRlZmluZSkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0ZGVmaW5lKGZ1bmN0aW9uICgvKiByZXF1aXJlICovKSB7XG5cblx0XHR2YXIgY2hhck1hcDtcblxuXHRcdGNoYXJNYXAgPSAoZnVuY3Rpb24gKCkge1xuXHRcdFx0dmFyIHN0cmluZ3MgPSB7XG5cdFx0XHRcdGFscGhhOiAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eicsXG5cdFx0XHRcdGRpZ2l0OiAnMDEyMzQ1Njc4OSdcblx0XHRcdH07XG5cblx0XHRcdHN0cmluZ3MuZ2VuRGVsaW1zID0gJzovPyNbXUAnO1xuXHRcdFx0c3RyaW5ncy5zdWJEZWxpbXMgPSAnISQmXFwnKCkqKyw7PSc7XG5cdFx0XHRzdHJpbmdzLnJlc2VydmVkID0gc3RyaW5ncy5nZW5EZWxpbXMgKyBzdHJpbmdzLnN1YkRlbGltcztcblx0XHRcdHN0cmluZ3MudW5yZXNlcnZlZCA9IHN0cmluZ3MuYWxwaGEgKyBzdHJpbmdzLmRpZ2l0ICsgJy0uX34nO1xuXHRcdFx0c3RyaW5ncy51cmwgPSBzdHJpbmdzLnJlc2VydmVkICsgc3RyaW5ncy51bnJlc2VydmVkO1xuXHRcdFx0c3RyaW5ncy5zY2hlbWUgPSBzdHJpbmdzLmFscGhhICsgc3RyaW5ncy5kaWdpdCArICcrLS4nO1xuXHRcdFx0c3RyaW5ncy51c2VyaW5mbyA9IHN0cmluZ3MudW5yZXNlcnZlZCArIHN0cmluZ3Muc3ViRGVsaW1zICsgJzonO1xuXHRcdFx0c3RyaW5ncy5ob3N0ID0gc3RyaW5ncy51bnJlc2VydmVkICsgc3RyaW5ncy5zdWJEZWxpbXM7XG5cdFx0XHRzdHJpbmdzLnBvcnQgPSBzdHJpbmdzLmRpZ2l0O1xuXHRcdFx0c3RyaW5ncy5wY2hhciA9IHN0cmluZ3MudW5yZXNlcnZlZCArIHN0cmluZ3Muc3ViRGVsaW1zICsgJzpAJztcblx0XHRcdHN0cmluZ3Muc2VnbWVudCA9IHN0cmluZ3MucGNoYXI7XG5cdFx0XHRzdHJpbmdzLnBhdGggPSBzdHJpbmdzLnNlZ21lbnQgKyAnLyc7XG5cdFx0XHRzdHJpbmdzLnF1ZXJ5ID0gc3RyaW5ncy5wY2hhciArICcvPyc7XG5cdFx0XHRzdHJpbmdzLmZyYWdtZW50ID0gc3RyaW5ncy5wY2hhciArICcvPyc7XG5cblx0XHRcdHJldHVybiBPYmplY3Qua2V5cyhzdHJpbmdzKS5yZWR1Y2UoZnVuY3Rpb24gKGNoYXJNYXAsIHNldCkge1xuXHRcdFx0XHRjaGFyTWFwW3NldF0gPSBzdHJpbmdzW3NldF0uc3BsaXQoJycpLnJlZHVjZShmdW5jdGlvbiAoY2hhcnMsIG15Q2hhcikge1xuXHRcdFx0XHRcdGNoYXJzW215Q2hhcl0gPSB0cnVlO1xuXHRcdFx0XHRcdHJldHVybiBjaGFycztcblx0XHRcdFx0fSwge30pO1xuXHRcdFx0XHRyZXR1cm4gY2hhck1hcDtcblx0XHRcdH0sIHt9KTtcblx0XHR9KCkpO1xuXG5cdFx0ZnVuY3Rpb24gZW5jb2RlKHN0ciwgYWxsb3dlZCkge1xuXHRcdFx0aWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcignU3RyaW5nIHJlcXVpcmVkIGZvciBVUkwgZW5jb2RpbmcnKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBzdHIuc3BsaXQoJycpLm1hcChmdW5jdGlvbiAobXlDaGFyKSB7XG5cdFx0XHRcdGlmIChhbGxvd2VkLmhhc093blByb3BlcnR5KG15Q2hhcikpIHtcblx0XHRcdFx0XHRyZXR1cm4gbXlDaGFyO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciBjb2RlID0gbXlDaGFyLmNoYXJDb2RlQXQoMCk7XG5cdFx0XHRcdGlmIChjb2RlIDw9IDEyNykge1xuXHRcdFx0XHRcdHZhciBlbmNvZGVkID0gY29kZS50b1N0cmluZygxNikudG9VcHBlckNhc2UoKTtcblx0XHRcdFx0XHRyZXR1cm4gJyUnICsgKGVuY29kZWQubGVuZ3RoICUgMiA9PT0gMSA/ICcwJyA6ICcnKSArIGVuY29kZWQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChteUNoYXIpLnRvVXBwZXJDYXNlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pLmpvaW4oJycpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIG1ha2VFbmNvZGVyKGFsbG93ZWQpIHtcblx0XHRcdGFsbG93ZWQgPSBhbGxvd2VkIHx8IGNoYXJNYXAudW5yZXNlcnZlZDtcblx0XHRcdHJldHVybiBmdW5jdGlvbiAoc3RyKSB7XG5cdFx0XHRcdHJldHVybiBlbmNvZGUoc3RyLCBhbGxvd2VkKTtcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZGVjb2RlKHN0cikge1xuXHRcdFx0cmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChzdHIpO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cblx0XHRcdC8qXG5cdFx0XHQgKiBEZWNvZGUgVVJMIGVuY29kZWQgc3RyaW5nc1xuXHRcdFx0ICpcblx0XHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBVUkwgZW5jb2RlZCBzdHJpbmdcblx0XHRcdCAqIEByZXR1cm5zIHtzdHJpbmd9IFVSTCBkZWNvZGVkIHN0cmluZ1xuXHRcdFx0ICovXG5cdFx0XHRkZWNvZGU6IGRlY29kZSxcblxuXHRcdFx0Lypcblx0XHRcdCAqIFVSTCBlbmNvZGUgYSBzdHJpbmdcblx0XHRcdCAqXG5cdFx0XHQgKiBBbGwgYnV0IGFscGhhLW51bWVyaWNzIGFuZCBhIHZlcnkgbGltaXRlZCBzZXQgb2YgcHVuY3R1YXRpb24gLSAuIF8gfiBhcmVcblx0XHRcdCAqIGVuY29kZWQuXG5cdFx0XHQgKlxuXHRcdFx0ICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZyB0byBlbmNvZGVcblx0XHRcdCAqIEByZXR1cm5zIHtzdHJpbmd9IFVSTCBlbmNvZGVkIHN0cmluZ1xuXHRcdFx0ICovXG5cdFx0XHRlbmNvZGU6IG1ha2VFbmNvZGVyKCksXG5cblx0XHRcdC8qXG5cdFx0XHQqIFVSTCBlbmNvZGUgYSBVUkxcblx0XHRcdCpcblx0XHRcdCogQWxsIGNoYXJhY3RlciBwZXJtaXR0ZWQgYW55d2hlcmUgaW4gYSBVUkwgYXJlIGxlZnQgdW5lbmNvZGVkIGV2ZW5cblx0XHRcdCogaWYgdGhhdCBjaGFyYWN0ZXIgaXMgbm90IHBlcm1pdHRlZCBpbiB0aGF0IHBvcnRpb24gb2YgYSBVUkwuXG5cdFx0XHQqXG5cdFx0XHQqIE5vdGU6IFRoaXMgbWV0aG9kIGlzIHR5cGljYWxseSBub3Qgd2hhdCB5b3Ugd2FudC5cblx0XHRcdCpcblx0XHRcdCogQHBhcmFtIHtzdHJpbmd9IHN0cmluZyB0byBlbmNvZGVcblx0XHRcdCogQHJldHVybnMge3N0cmluZ30gVVJMIGVuY29kZWQgc3RyaW5nXG5cdFx0XHQqL1xuXHRcdFx0ZW5jb2RlVVJMOiBtYWtlRW5jb2RlcihjaGFyTWFwLnVybCksXG5cblx0XHRcdC8qXG5cdFx0XHQgKiBVUkwgZW5jb2RlIHRoZSBzY2hlbWUgcG9ydGlvbiBvZiBhIFVSTFxuXHRcdFx0ICpcblx0XHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgdG8gZW5jb2RlXG5cdFx0XHQgKiBAcmV0dXJucyB7c3RyaW5nfSBVUkwgZW5jb2RlZCBzdHJpbmdcblx0XHRcdCAqL1xuXHRcdFx0ZW5jb2RlU2NoZW1lOiBtYWtlRW5jb2RlcihjaGFyTWFwLnNjaGVtZSksXG5cblx0XHRcdC8qXG5cdFx0XHQgKiBVUkwgZW5jb2RlIHRoZSB1c2VyIGluZm8gcG9ydGlvbiBvZiBhIFVSTFxuXHRcdFx0ICpcblx0XHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgdG8gZW5jb2RlXG5cdFx0XHQgKiBAcmV0dXJucyB7c3RyaW5nfSBVUkwgZW5jb2RlZCBzdHJpbmdcblx0XHRcdCAqL1xuXHRcdFx0ZW5jb2RlVXNlckluZm86IG1ha2VFbmNvZGVyKGNoYXJNYXAudXNlcmluZm8pLFxuXG5cdFx0XHQvKlxuXHRcdFx0ICogVVJMIGVuY29kZSB0aGUgaG9zdCBwb3J0aW9uIG9mIGEgVVJMXG5cdFx0XHQgKlxuXHRcdFx0ICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZyB0byBlbmNvZGVcblx0XHRcdCAqIEByZXR1cm5zIHtzdHJpbmd9IFVSTCBlbmNvZGVkIHN0cmluZ1xuXHRcdFx0ICovXG5cdFx0XHRlbmNvZGVIb3N0OiBtYWtlRW5jb2RlcihjaGFyTWFwLmhvc3QpLFxuXG5cdFx0XHQvKlxuXHRcdFx0ICogVVJMIGVuY29kZSB0aGUgcG9ydCBwb3J0aW9uIG9mIGEgVVJMXG5cdFx0XHQgKlxuXHRcdFx0ICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZyB0byBlbmNvZGVcblx0XHRcdCAqIEByZXR1cm5zIHtzdHJpbmd9IFVSTCBlbmNvZGVkIHN0cmluZ1xuXHRcdFx0ICovXG5cdFx0XHRlbmNvZGVQb3J0OiBtYWtlRW5jb2RlcihjaGFyTWFwLnBvcnQpLFxuXG5cdFx0XHQvKlxuXHRcdFx0ICogVVJMIGVuY29kZSBhIHBhdGggc2VnbWVudCBwb3J0aW9uIG9mIGEgVVJMXG5cdFx0XHQgKlxuXHRcdFx0ICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZyB0byBlbmNvZGVcblx0XHRcdCAqIEByZXR1cm5zIHtzdHJpbmd9IFVSTCBlbmNvZGVkIHN0cmluZ1xuXHRcdFx0ICovXG5cdFx0XHRlbmNvZGVQYXRoU2VnbWVudDogbWFrZUVuY29kZXIoY2hhck1hcC5zZWdtZW50KSxcblxuXHRcdFx0Lypcblx0XHRcdCAqIFVSTCBlbmNvZGUgdGhlIHBhdGggcG9ydGlvbiBvZiBhIFVSTFxuXHRcdFx0ICpcblx0XHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgdG8gZW5jb2RlXG5cdFx0XHQgKiBAcmV0dXJucyB7c3RyaW5nfSBVUkwgZW5jb2RlZCBzdHJpbmdcblx0XHRcdCAqL1xuXHRcdFx0ZW5jb2RlUGF0aDogbWFrZUVuY29kZXIoY2hhck1hcC5wYXRoKSxcblxuXHRcdFx0Lypcblx0XHRcdCAqIFVSTCBlbmNvZGUgdGhlIHF1ZXJ5IHBvcnRpb24gb2YgYSBVUkxcblx0XHRcdCAqXG5cdFx0XHQgKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIHRvIGVuY29kZVxuXHRcdFx0ICogQHJldHVybnMge3N0cmluZ30gVVJMIGVuY29kZWQgc3RyaW5nXG5cdFx0XHQgKi9cblx0XHRcdGVuY29kZVF1ZXJ5OiBtYWtlRW5jb2RlcihjaGFyTWFwLnF1ZXJ5KSxcblxuXHRcdFx0Lypcblx0XHRcdCAqIFVSTCBlbmNvZGUgdGhlIGZyYWdtZW50IHBvcnRpb24gb2YgYSBVUkxcblx0XHRcdCAqXG5cdFx0XHQgKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIHRvIGVuY29kZVxuXHRcdFx0ICogQHJldHVybnMge3N0cmluZ30gVVJMIGVuY29kZWQgc3RyaW5nXG5cdFx0XHQgKi9cblx0XHRcdGVuY29kZUZyYWdtZW50OiBtYWtlRW5jb2RlcihjaGFyTWFwLmZyYWdtZW50KVxuXG5cdFx0fTtcblxuXHR9KTtcblxufShcblx0dHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lIDogZnVuY3Rpb24gKGZhY3RvcnkpIHsgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUpOyB9XG5cdC8vIEJvaWxlcnBsYXRlIGZvciBBTUQgYW5kIE5vZGVcbikpO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDE1IHRoZSBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9yc1xuICogQGxpY2Vuc2UgTUlULCBzZWUgTElDRU5TRS50eHQgZm9yIGRldGFpbHNcbiAqXG4gKiBAYXV0aG9yIFNjb3R0IEFuZHJld3NcbiAqL1xuXG4oZnVuY3Rpb24gKGRlZmluZSkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIHVuZGVmO1xuXG5cdGRlZmluZShmdW5jdGlvbiAocmVxdWlyZSkge1xuXG5cdFx0dmFyIHVyaUVuY29kZXIsIG9wZXJhdGlvbnMsIHByZWZpeFJFO1xuXG5cdFx0dXJpRW5jb2RlciA9IHJlcXVpcmUoJy4vdXJpRW5jb2RlcicpO1xuXG5cdFx0cHJlZml4UkUgPSAvXihbXjpdKik6KFswLTldKykkLztcblx0XHRvcGVyYXRpb25zID0ge1xuXHRcdFx0Jyc6ICB7IGZpcnN0OiAnJywgIHNlcGFyYXRvcjogJywnLCBuYW1lZDogZmFsc2UsIGVtcHR5OiAnJywgIGVuY29kZXI6IHVyaUVuY29kZXIuZW5jb2RlIH0sXG5cdFx0XHQnKyc6IHsgZmlyc3Q6ICcnLCAgc2VwYXJhdG9yOiAnLCcsIG5hbWVkOiBmYWxzZSwgZW1wdHk6ICcnLCAgZW5jb2RlcjogdXJpRW5jb2Rlci5lbmNvZGVVUkwgfSxcblx0XHRcdCcjJzogeyBmaXJzdDogJyMnLCBzZXBhcmF0b3I6ICcsJywgbmFtZWQ6IGZhbHNlLCBlbXB0eTogJycsICBlbmNvZGVyOiB1cmlFbmNvZGVyLmVuY29kZVVSTCB9LFxuXHRcdFx0Jy4nOiB7IGZpcnN0OiAnLicsIHNlcGFyYXRvcjogJy4nLCBuYW1lZDogZmFsc2UsIGVtcHR5OiAnJywgIGVuY29kZXI6IHVyaUVuY29kZXIuZW5jb2RlIH0sXG5cdFx0XHQnLyc6IHsgZmlyc3Q6ICcvJywgc2VwYXJhdG9yOiAnLycsIG5hbWVkOiBmYWxzZSwgZW1wdHk6ICcnLCAgZW5jb2RlcjogdXJpRW5jb2Rlci5lbmNvZGUgfSxcblx0XHRcdCc7JzogeyBmaXJzdDogJzsnLCBzZXBhcmF0b3I6ICc7JywgbmFtZWQ6IHRydWUsICBlbXB0eTogJycsICBlbmNvZGVyOiB1cmlFbmNvZGVyLmVuY29kZSB9LFxuXHRcdFx0Jz8nOiB7IGZpcnN0OiAnPycsIHNlcGFyYXRvcjogJyYnLCBuYW1lZDogdHJ1ZSwgIGVtcHR5OiAnPScsIGVuY29kZXI6IHVyaUVuY29kZXIuZW5jb2RlIH0sXG5cdFx0XHQnJic6IHsgZmlyc3Q6ICcmJywgc2VwYXJhdG9yOiAnJicsIG5hbWVkOiB0cnVlLCAgZW1wdHk6ICc9JywgZW5jb2RlcjogdXJpRW5jb2Rlci5lbmNvZGUgfSxcblx0XHRcdCc9JzogeyByZXNlcnZlZDogdHJ1ZSB9LFxuXHRcdFx0JywnOiB7IHJlc2VydmVkOiB0cnVlIH0sXG5cdFx0XHQnISc6IHsgcmVzZXJ2ZWQ6IHRydWUgfSxcblx0XHRcdCdAJzogeyByZXNlcnZlZDogdHJ1ZSB9LFxuXHRcdFx0J3wnOiB7IHJlc2VydmVkOiB0cnVlIH1cblx0XHR9O1xuXG5cdFx0ZnVuY3Rpb24gYXBwbHkob3BlcmF0aW9uLCBleHByZXNzaW9uLCBwYXJhbXMpIHtcblx0XHRcdC8qanNoaW50IG1heGNvbXBsZXhpdHk6MTEgKi9cblx0XHRcdHJldHVybiBleHByZXNzaW9uLnNwbGl0KCcsJykucmVkdWNlKGZ1bmN0aW9uIChyZXN1bHQsIHZhcmlhYmxlKSB7XG5cdFx0XHRcdHZhciBvcHRzLCB2YWx1ZTtcblxuXHRcdFx0XHRvcHRzID0ge307XG5cdFx0XHRcdGlmICh2YXJpYWJsZS5zbGljZSgtMSkgPT09ICcqJykge1xuXHRcdFx0XHRcdHZhcmlhYmxlID0gdmFyaWFibGUuc2xpY2UoMCwgLTEpO1xuXHRcdFx0XHRcdG9wdHMuZXhwbG9kZSA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHByZWZpeFJFLnRlc3QodmFyaWFibGUpKSB7XG5cdFx0XHRcdFx0dmFyIHByZWZpeCA9IHByZWZpeFJFLmV4ZWModmFyaWFibGUpO1xuXHRcdFx0XHRcdHZhcmlhYmxlID0gcHJlZml4WzFdO1xuXHRcdFx0XHRcdG9wdHMubWF4TGVuZ3RoID0gcGFyc2VJbnQocHJlZml4WzJdKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZhcmlhYmxlID0gdXJpRW5jb2Rlci5kZWNvZGUodmFyaWFibGUpO1xuXHRcdFx0XHR2YWx1ZSA9IHBhcmFtc1t2YXJpYWJsZV07XG5cblx0XHRcdFx0aWYgKHZhbHVlID09PSB1bmRlZiB8fCB2YWx1ZSA9PT0gbnVsbCkge1xuXHRcdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG5cdFx0XHRcdFx0cmVzdWx0ICs9IHZhbHVlLnJlZHVjZShmdW5jdGlvbiAocmVzdWx0LCB2YWx1ZSkge1xuXHRcdFx0XHRcdFx0aWYgKHJlc3VsdC5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdFx0cmVzdWx0ICs9IG9wdHMuZXhwbG9kZSA/IG9wZXJhdGlvbi5zZXBhcmF0b3IgOiAnLCc7XG5cdFx0XHRcdFx0XHRcdGlmIChvcGVyYXRpb24ubmFtZWQgJiYgb3B0cy5leHBsb2RlKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmVzdWx0ICs9IG9wZXJhdGlvbi5lbmNvZGVyKHZhcmlhYmxlKTtcblx0XHRcdFx0XHRcdFx0XHRyZXN1bHQgKz0gdmFsdWUubGVuZ3RoID8gJz0nIDogb3BlcmF0aW9uLmVtcHR5O1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdFx0cmVzdWx0ICs9IG9wZXJhdGlvbi5maXJzdDtcblx0XHRcdFx0XHRcdFx0aWYgKG9wZXJhdGlvbi5uYW1lZCkge1xuXHRcdFx0XHRcdFx0XHRcdHJlc3VsdCArPSBvcGVyYXRpb24uZW5jb2Rlcih2YXJpYWJsZSk7XG5cdFx0XHRcdFx0XHRcdFx0cmVzdWx0ICs9IHZhbHVlLmxlbmd0aCA/ICc9JyA6IG9wZXJhdGlvbi5lbXB0eTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmVzdWx0ICs9IG9wZXJhdGlvbi5lbmNvZGVyKHZhbHVlKTtcblx0XHRcdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHRcdFx0fSwgJycpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0XHRyZXN1bHQgKz0gT2JqZWN0LmtleXModmFsdWUpLnJlZHVjZShmdW5jdGlvbiAocmVzdWx0LCBuYW1lKSB7XG5cdFx0XHRcdFx0XHRpZiAocmVzdWx0Lmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0XHRyZXN1bHQgKz0gb3B0cy5leHBsb2RlID8gb3BlcmF0aW9uLnNlcGFyYXRvciA6ICcsJztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRyZXN1bHQgKz0gb3BlcmF0aW9uLmZpcnN0O1xuXHRcdFx0XHRcdFx0XHRpZiAob3BlcmF0aW9uLm5hbWVkICYmICFvcHRzLmV4cGxvZGUpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXN1bHQgKz0gb3BlcmF0aW9uLmVuY29kZXIodmFyaWFibGUpO1xuXHRcdFx0XHRcdFx0XHRcdHJlc3VsdCArPSB2YWx1ZVtuYW1lXS5sZW5ndGggPyAnPScgOiBvcGVyYXRpb24uZW1wdHk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJlc3VsdCArPSBvcGVyYXRpb24uZW5jb2RlcihuYW1lKTtcblx0XHRcdFx0XHRcdHJlc3VsdCArPSBvcHRzLmV4cGxvZGUgPyAnPScgOiAnLCc7XG5cdFx0XHRcdFx0XHRyZXN1bHQgKz0gb3BlcmF0aW9uLmVuY29kZXIodmFsdWVbbmFtZV0pO1xuXHRcdFx0XHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHRcdFx0XHR9LCAnJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0dmFsdWUgPSBTdHJpbmcodmFsdWUpO1xuXHRcdFx0XHRcdGlmIChvcHRzLm1heExlbmd0aCkge1xuXHRcdFx0XHRcdFx0dmFsdWUgPSB2YWx1ZS5zbGljZSgwLCBvcHRzLm1heExlbmd0aCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJlc3VsdCArPSByZXN1bHQubGVuZ3RoID8gb3BlcmF0aW9uLnNlcGFyYXRvciA6IG9wZXJhdGlvbi5maXJzdDtcblx0XHRcdFx0XHRpZiAob3BlcmF0aW9uLm5hbWVkKSB7XG5cdFx0XHRcdFx0XHRyZXN1bHQgKz0gb3BlcmF0aW9uLmVuY29kZXIodmFyaWFibGUpO1xuXHRcdFx0XHRcdFx0cmVzdWx0ICs9IHZhbHVlLmxlbmd0aCA/ICc9JyA6IG9wZXJhdGlvbi5lbXB0eTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmVzdWx0ICs9IG9wZXJhdGlvbi5lbmNvZGVyKHZhbHVlKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHR9LCAnJyk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZXhwYW5kRXhwcmVzc2lvbihleHByZXNzaW9uLCBwYXJhbXMpIHtcblx0XHRcdHZhciBvcGVyYXRpb247XG5cblx0XHRcdG9wZXJhdGlvbiA9IG9wZXJhdGlvbnNbZXhwcmVzc2lvbi5zbGljZSgwLDEpXTtcblx0XHRcdGlmIChvcGVyYXRpb24pIHtcblx0XHRcdFx0ZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uc2xpY2UoMSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0b3BlcmF0aW9uID0gb3BlcmF0aW9uc1snJ107XG5cdFx0XHR9XG5cblx0XHRcdGlmIChvcGVyYXRpb24ucmVzZXJ2ZWQpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdSZXNlcnZlZCBleHByZXNzaW9uIG9wZXJhdGlvbnMgYXJlIG5vdCBzdXBwb3J0ZWQnKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGFwcGx5KG9wZXJhdGlvbiwgZXhwcmVzc2lvbiwgcGFyYW1zKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBleHBhbmRUZW1wbGF0ZSh0ZW1wbGF0ZSwgcGFyYW1zKSB7XG5cdFx0XHR2YXIgc3RhcnQsIGVuZCwgdXJpO1xuXG5cdFx0XHR1cmkgPSAnJztcblx0XHRcdGVuZCA9IDA7XG5cdFx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0XHRzdGFydCA9IHRlbXBsYXRlLmluZGV4T2YoJ3snLCBlbmQpO1xuXHRcdFx0XHRpZiAoc3RhcnQgPT09IC0xKSB7XG5cdFx0XHRcdFx0Ly8gbm8gbW9yZSBleHByZXNzaW9uc1xuXHRcdFx0XHRcdHVyaSArPSB0ZW1wbGF0ZS5zbGljZShlbmQpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHVyaSArPSB0ZW1wbGF0ZS5zbGljZShlbmQsIHN0YXJ0KTtcblx0XHRcdFx0ZW5kID0gdGVtcGxhdGUuaW5kZXhPZignfScsIHN0YXJ0KSArIDE7XG5cdFx0XHRcdHVyaSArPSBleHBhbmRFeHByZXNzaW9uKHRlbXBsYXRlLnNsaWNlKHN0YXJ0ICsgMSwgZW5kIC0gMSksIHBhcmFtcyk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB1cmk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBFeHBhbmQgYSBVUkkgVGVtcGxhdGUgd2l0aCBwYXJhbWV0ZXJzIHRvIGZvcm0gYSBVUkkuXG5cdFx0XHQgKlxuXHRcdFx0ICogRnVsbCBpbXBsZW1lbnRhdGlvbiAobGV2ZWwgNCkgb2YgcmZjNjU3MC5cblx0XHRcdCAqIEBzZWUgaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY1NzBcblx0XHRcdCAqXG5cdFx0XHQgKiBAcGFyYW0ge3N0cmluZ30gdGVtcGxhdGUgVVJJIHRlbXBsYXRlXG5cdFx0XHQgKiBAcGFyYW0ge09iamVjdH0gW3BhcmFtc10gcGFyYW1zIHRvIGFwcGx5IHRvIHRoZSB0ZW1wbGF0ZSBkdXJyaW5nIGV4cGFudGlvblxuXHRcdFx0ICogQHJldHVybnMge3N0cmluZ30gZXhwYW5kZWQgVVJJXG5cdFx0XHQgKi9cblx0XHRcdGV4cGFuZDogZXhwYW5kVGVtcGxhdGVcblxuXHRcdH07XG5cblx0fSk7XG5cbn0oXG5cdHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZSA6IGZ1bmN0aW9uIChmYWN0b3J5KSB7IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKTsgfVxuXHQvLyBCb2lsZXJwbGF0ZSBmb3IgQU1EIGFuZCBOb2RlXG4pKTtcbiIsImRlZmluZShmdW5jdGlvbigpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvKiBDb252ZXJ0IGEgc2luZ2xlIG9yIGFycmF5IG9mIHJlc291cmNlcyBpbnRvIFwiVVJJMVxcblVSSTJcXG5VUkkzLi4uXCIgKi9cbiAgICByZXR1cm4ge1xuICAgICAgICByZWFkOiBmdW5jdGlvbihzdHIgLyosIG9wdHMgKi8pIHtcbiAgICAgICAgICAgIHJldHVybiBzdHIuc3BsaXQoJ1xcbicpO1xuICAgICAgICB9LFxuICAgICAgICB3cml0ZTogZnVuY3Rpb24ob2JqIC8qLCBvcHRzICovKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGlzIGlzIGFuIEFycmF5LCBleHRyYWN0IHRoZSBzZWxmIFVSSSBhbmQgdGhlbiBqb2luIHVzaW5nIGEgbmV3bGluZVxuICAgICAgICAgICAgaWYgKG9iaiBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iai5tYXAoZnVuY3Rpb24ocmVzb3VyY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc291cmNlLl9saW5rcy5zZWxmLmhyZWY7XG4gICAgICAgICAgICAgICAgfSkuam9pbignXFxuJyk7XG4gICAgICAgICAgICB9IGVsc2UgeyAvLyBvdGhlcndpc2UsIGp1c3QgcmV0dXJuIHRoZSBzZWxmIFVSSVxuICAgICAgICAgICAgICAgIHJldHVybiBvYmouX2xpbmtzLnNlbGYuaHJlZjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbn0pOyIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcbmNvbnN0IGNsaWVudCA9IHJlcXVpcmUoJy4vY2xpZW50Jyk7XG5cbmNsYXNzIEFwcCBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cbiAgICBjb25zdHJ1Y3Rvcihwcm9wcykge1xuICAgICAgICBzdXBlcihwcm9wcyk7XG4gICAgICAgIHRoaXMuc3RhdGUgPSB7dGltZXN0YW1wczogW119O1xuICAgIH1cblxuICAgIGNvbXBvbmVudERpZE1vdW50KCkge1xuICAgICAgICBjbGllbnQoe21ldGhvZDogJ0dFVCcsIHBhdGg6ICd0aW1lc3RhbXBzJ30pLmRvbmUocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZSh7dGltZXN0YW1wczogcmVzcG9uc2UuZW50aXR5Ll9lbWJlZGRlZC50aW1lc3RhbXBzfSk7XG4gICAgfSk7XG4gICAgfVxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIDxUaW1lc3RhbXBMaXN0IHRpbWVzdGFtcHM9e3RoaXMuc3RhdGUudGltZXN0YW1wc30vPlxuICAgIClcbiAgICB9XG59XG5cbmNsYXNzIFRpbWVzdGFtcExpc3QgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnR7XG4gICAgcmVuZGVyKCkge1xuICAgICAgICB2YXIgdGltZXN0YW1wcyA9IHRoaXMucHJvcHMudGltZXN0YW1wcy5tYXAodGltZXN0YW1wID0+XG4gICAgICAgICAgICA8VGltZXN0YW1wIGtleT17dGltZXN0YW1wLl9saW5rcy5zZWxmLmhyZWZ9IHRpbWVzdGFtcD17dGltZXN0YW1wfS8+XG4gICAgKTtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIDx0YWJsZT5cblx0XHRcdFx0PHRyPlxuXHRcdFx0XHRcdDx0aD5UaW1lc3RhbXBzTE9MPC90aD5cblx0XHRcdFx0PC90cj5cblx0XHRcdFx0e3RpbWVzdGFtcHN9XG5cdFx0XHQ8L3RhYmxlPlxuXG4gICAgKVxuICAgIH1cbn1cblxuY2xhc3MgVGltZXN0YW1wIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50e1xuICAgIHJlbmRlcigpIHtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgICA8dGQ+e3RoaXMucHJvcHMudGltZXN0YW1wLnRpbWVzdGFtcH08L3RkPlxuICAgICAgICAgICAgPC90cj5cbiAgICApXG4gICAgfVxufVxuXG5SZWFjdERPTS5yZW5kZXIoXG48QXBwIC8+LFxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZWFjdCcpXG4pXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciByZXN0ID0gcmVxdWlyZSgncmVzdCcpO1xudmFyIGRlZmF1bHRSZXF1ZXN0ID0gcmVxdWlyZSgncmVzdC9pbnRlcmNlcHRvci9kZWZhdWx0UmVxdWVzdCcpO1xudmFyIG1pbWUgPSByZXF1aXJlKCdyZXN0L2ludGVyY2VwdG9yL21pbWUnKTtcbnZhciBlcnJvckNvZGUgPSByZXF1aXJlKCdyZXN0L2ludGVyY2VwdG9yL2Vycm9yQ29kZScpO1xudmFyIGJhc2VSZWdpc3RyeSA9IHJlcXVpcmUoJ3Jlc3QvbWltZS9yZWdpc3RyeScpO1xuXG52YXIgcmVnaXN0cnkgPSBiYXNlUmVnaXN0cnkuY2hpbGQoKTtcblxucmVnaXN0cnkucmVnaXN0ZXIoJ3RleHQvdXJpLWxpc3QnLCByZXF1aXJlKCcuL2FwaS91cmlMaXN0Q29udmVydGVyJykpO1xucmVnaXN0cnkucmVnaXN0ZXIoJ2FwcGxpY2F0aW9uL2hhbCtqc29uJywgcmVxdWlyZSgncmVzdC9taW1lL3R5cGUvYXBwbGljYXRpb24vaGFsJykpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlc3RcbiAgICAud3JhcChtaW1lLCB7IHJlZ2lzdHJ5OiByZWdpc3RyeSB9KVxuICAgIC53cmFwKGVycm9yQ29kZSlcbiAgICAud3JhcChkZWZhdWx0UmVxdWVzdCwgeyBoZWFkZXJzOiB7ICdBY2NlcHQnOiAnYXBwbGljYXRpb24vaGFsK2pzb24nIH19KTtcbiJdfQ==
