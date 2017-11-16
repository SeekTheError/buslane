'use strict';

let http2;
const debug = !!process.env.BUS_DEBUG;
const fs = require('fs');

module.exports = class Buslane {

	constructor(config) {
		if (!config) {
			throw new Error('Missing required config(first param)');
		}

		this.config = config;

		if (!config.mock) {
			http2 = require('http2');
		}

		if (!config.name) {
			throw new Error('Missing required config params: name');
		}

		if (!config.map) {
			throw new Error('Missing required config params: map');
		}

		if (!config.shared_api_key) {
			throw new Error('Missing required config params: shared_api_key');
		}

		// register all the ingress that should be accessible to this service
		config.map.forEach(service => {
			if (service.name !== config.name) {
				this[service.name] = {};
				service.ingresses.forEach(egress =>
					this[service.name][egress] = this.registerEgress(service.name, egress)
				);
			}
		});

		this._services = {};
		this.clients = {};

		this.handleStream = this.handleStream.bind(this);
		this.registerEgress = this.registerEgress.bind(this);
		this.registerIngress = this.registerIngress.bind(this);
	}

	destroy() {
		this.server.close();
	}

	onReady(fn) {
		this._onReady = fn;

		if (this._ready) {
			fn();
		}
	}

	/*
		Create an http server in accordance with the service object. This object may/should contain:
			- name(String), for Debugging
			- port(Number), required
	 */
	createServer(service) {
		if (!service) {
			throw new Error('Missing service param, first arg');
		}

		if (!service.name) {
			throw new Error('Service.name is required');
		}

		if (!service.port) {
			throw new Error('Service.port is required');
		}

		if (!this.server) {

			// SSL config
			let key;
			let cert;
			try {
				key = fs.readFileSync(service.ssl_key_path || 'ssl/key.pem');
				cert = fs.readFileSync(service.ssl_cert_path || 'ssl/certificate.pem');
			}
			catch (e) {
				console.error('Could not load custom certificates, exiting\n', e);
				process.exit(0);
			}

			this.server = http2.createSecureServer({key, cert});
			const server = this.server;

			server.on('error', err => console.error(err));
			server.on('socketError', err => console.error(err));

			server.on('stream', (stream, headers) => {
				stream.streamResponse = this.streamResponse(stream);
				this.handleStream(stream, headers);
			});

			server.listen(service.port);

			server.once('listening', () => {
				console.log(`${service.name}: local bus server started on ${service.port}`);

				this._ready = true;
				if (this._onReady) {
					this._onReady();
				}
			});
		}
	}

	/*
		Attach a streamResponse method to a stream object, allowing us to calss stream.streamResponse directly
		Params
			- stream(stream, required) an http2 stream
	 */
	streamResponse(stream) {
		/*
			Format and stream the response
			Params:
				- status(number, required), the http status code
				- data(Object, require), the object to stringify and send as a response
		 */
		return (status, data) => {

			if (!status && typeof status !== 'number') {
				throw new Error('Status is required');
			}

			stream.respond({
				'content-type': 'application/json',
				':status': status
			});

			let json;
			try {
				json = JSON.stringify(data);
			}
			catch (err) {
				console.error('Could not stringify', data);
			}
			stream.end(json);
		};
	}

	/*
	 Attach a streamResponse method to a stream object, allowing us to calss stream.streamResponse directly
	 Params
		- stream(stream, required) an http2 stream
		- headers(Object) the http2 request headers
	 */
	async handleStream(stream, headers) {
		let parsed;

		try {
			parsed = JSON.parse(headers.body);
		}
		catch (e) {
			console.error('Bus: could not parse', headers.body);
			stream.streamResponse(500, {error: 'Internal Error'});
			return;
		}

		const {name, methodName, args} = parsed;

		if (headers['x-api-key'] !== this.config.shared_api_key) {
			stream.streamResponse(403, {error: 'Wrong or missing x-api-key header'});
			return;
		}

		const service = this._services[name];

		if (!service) {
			stream.streamResponse(404, {unknowIngress: name});
			return;
		}

		const method = service[methodName];

		if (!method) {
			stream.streamResponse(404, {unknowIngressMethod: methodName});
			return;
		}

		// method found, so we call it
		try {
			let result = await method.call(service, ...args);

			if (!result) {
				result = {undefined: true};
			}

			stream.streamResponse(200, result);
		}
		catch (error) {
			stream.streamResponse(500, error);
		}
	}

	/**
		Take a service description and return a http2 client.
	*/

	/*
		Create an http server in accordance with the service object. This object may/should contain:

		Params:
			- destination(object, required)
				- name(String, required)
				- host(String, optional), default to localhost'
				- port(Number, required)
			- forceRecreate(boolean, optionnal) delete the current client and create a new one
	 */
	getHttp2Client(destination, forceRecreate = false) {
		const name = destination.name;

		if (forceRecreate) {
			delete this.clients[name];
		}

		if (!this.clients[name]) {

			let ca;
			try {
				ca = fs.readFileSync(destination.ssl_cert_path || 'ssl/certificate.pem');
			}
			catch (e) {
				console.error('Could not load custom certificate server certificate for the client\n', e);
			}

			this.clients[name] = http2.connect(`https://${destination.host || 'localhost'}:${destination.port}`, {ca});
		}

		return this.clients[name];
	}

	/**
		 Return a proxy object that will assume all methods exists. If we take a config with to services with
		 on ingress each, those will be register as egress on the otherside. The proxy object is required
		 to be able to call any function. If the function does not exist on the other side an error is thrown.

		 Params:
			- stream(stream, required) an http2 stream
			- headers(Object) the http2 request headers
	 */
	registerEgress(serviceName, name) {
		const destination = this.config.map.find(x => x.name === serviceName);
		const shared_api_key = this.config.shared_api_key;
		const _this = this;

		const handler = {
			get(target, methodName) {

				// if an actual property exist, return it, this allow us to mock methods
				if (target[methodName]) {
					return target[methodName];
				}

				return (...args) => {
					return new Promise((accept, reject) => {
						const body = {name, methodName, args};

						if (destination.mock) {
							reject(new Error('Missing Mock'));
							return;
						}

						const client = _this.getHttp2Client(destination);

						const opts = {'x-api-key': shared_api_key, body: JSON.stringify(body)};

						if (debug) {
							console.log(`Bus query on ${serviceName}:${name} at ${new Date()}: `, opts.body);
						}

						let req;
						try {
							req = client.request(opts);
						}
						catch (err) {
							// the client is stale, we force a recreate and try to request again
							if (err.code === 'ERR_HTTP2_INVALID_SESSION') {
								req = _this.getHttp2Client(destination, true).request(opts);
							}
							else {
								throw err;
							}
						}

						let status;
						req.on('response', headers => {
							status = headers[':status'].toString();
						});

						let data = '';
						req.setEncoding('utf8');
						req.on('data', d => data += d);
						req.on('end', () => {
							if (!status) {
								reject(new Error(`bus: could not connect to service ${serviceName}`));
								return;
							}

							if (status[0] !== '2') {
								const error = JSON.parse(data);
								if (debug) {
									console.error(`Bus error on ${serviceName}:${name}: `, error);
								}

								error.usedIngress = `${serviceName}:${name}`;
								reject(error);
								return;
							}

							try {
								const response = JSON.parse(data);
								if (response.undefined) {
									accept();
									return;
								}

								accept(response);
							}
							catch (err) {
								console.error('Could not parse response', data);
								reject(new Error('Could not parse response'));
							}

						});
						req.end();
					});
				};
			}
		};

		return new Proxy({}, handler);
	}

	/**
		Register a service as an Ingress, making the object methods accessible to
		the other services.
		params:
			- name: The name of the ingress(ex: database, so other service could call database.sql(query))
			- obj: The object in question (ex: in our example, the database object)
	*/
	registerIngress(name, obj) {
		const service = this.config.map.find(x => x.name === this.config.name);

		if (!service) {
			throw new Error(`No know ingresses for ${name}`);
		}

		this.createServer(service);
		this._services[name] = obj;
	}

};

