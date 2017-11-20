'use strict';

const Buslane = require('../..');

function busTestConfig(name) {
	const config = {name, shared_api_key: 'test'};
	config.map = [
		{name: 'argo', port: 11211, ingresses: ['boat'], ssl_cert_path: 'ssl/certificate.pem', ssl_key_path: 'ssl/key.pem'},
		{name: 'jason', port: 11311, ingresses: []},
	];

	return config;
}


class Service {
	constructor() {

	}

	destroy() {

	}
}

class Jason extends Service {
	constructor() {
		super();

		this.buslane = new Buslane(busTestConfig('jason'));
		this.boat = this.buslane.argo.boat;
	}
}

class Argo {
	constructor() {
		this.destination = 'port';
		this.buslane = new Buslane(busTestConfig('argo'));

		// expose the db and the api object to the cluster
		this.buslane.registerIngress('boat', this);

		this.row_count = 0;
	}

	sail(destination) {
		this.destination = destination;

		console.log(`Sailing to ${destination}`);
		return true;
	}

	row() {
		this.row_count++;
	}
}

module.exports = {Jason, Argo};
