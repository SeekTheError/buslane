'use strict';

/*
 * Run the dashboardV2 api as a subprocess and run the test integration programatically
 * This setup as a 0 mock policy and aim to be a true end to end test for api
 */

const Mocha = require('mocha');
const fs = require('fs');
const path = require('path');

const chai = require('chai');
global.expect = chai.expect;


// process.env.BUS_DEBUG = 1;

function runTest() {

	const mochaOpts = {
		reporter: 'list',
		timeout: 4000,
	};

	if (process.env.FILTER) {
		mochaOpts.grep = new RegExp(process.env.FILTER, 'i');
	}

	const mocha = new Mocha(mochaOpts);

	const testDir = `${__dirname}/tests`;

	// Add each .js file to the mocha instance
	fs.readdirSync(testDir).filter(file =>
		// Only keep the .js files
		file.substr(-3) === '.js').forEach(file => {
		console.log(`queuing test file ${ file}`);
		mocha.addFile(
			path.join(testDir, file)
		);
	});

	// Run the tests.
	console.log('Running integration test suite');
	let exitCode = 0;
	const test = mocha.run(failures => {
		process.on('exit', () => {
			process.exit(failures); // exit with non-zero status if there were failures
		});
	});


	test.on('fail', () => {
		exitCode++;
	});

	test.on('end', () => {
		process.exit(exitCode);
	});
}

runTest();
