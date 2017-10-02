'use strict';


const services = require('../mock/services.js');

let argo;
let jason;
describe('Simple::', () => {
	beforeEach(next => {
		if (argo) {
			// kill the existing webserver
			argo.buslane.destroy();
		}

		argo = new services.Argo();
		jason = new services.Jason();

		argo.buslane.onReady(next);
	});

	it('can call a method, and we can see the result on the other side', async() => {
		await jason.boat.sail('sea');

		expect(argo.destination).to.equal('sea');
	});

	it('perform under (light) stress', async() => {
		const count = 100;
		const ts = `time for ${count} calls`;

		const prs = [];
		console.time(ts);
		for (let i = 0; i < count; i++) {
			prs.push(jason.boat.row());
		}
		await Promise.all(prs);
		console.timeEnd(ts);

		expect(argo.row_count).to.equal(count);
	});

	it('Can regenerate the connection after the client was destroyed', async() => {
		await jason.boat.sail('sea');

		expect(argo.destination).to.equal('sea');
		console.log(jason.buslane.clients.argo.destroy());


		await jason.boat.sail('ocean');

		expect(argo.destination).to.equal('ocean');
	});

});
