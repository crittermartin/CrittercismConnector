// Crittercism Connector node app
// Created by Martin Stone <martin@crittercism.com>
//
// Pulls data for all apps visible to your Crittercism ID and populates it
// in your Graphite installation under app.*, via Carbon.
//
// Configuration is in ccconfig.js; please fill in your information and read
// the README file for Graphite storage_schemas.conf info.
//
var fs = require('fs'),
    path = require('path'),
    net = require('net'),
    http = require('http'),
    httpServer = require('http-server'),
    colors = require('colors'),
    schedule = require('node-schedule'),
    CrittercismClient = require('./CrittercismClient.js'),
    config = require('./ccconfig.js');

var cc = new CrittercismClient(config.Crittercism.clientID);

var appMetrics = ['dau', 'mau', 'rating', 'crashes', 'crashPercent', 'appLoads', 'affectedUsers', 'affectedUserPercent'],
    errorPieMetrics =  ['crashes', 'crashPercent', 'appLoads'],
    errorPieGroupings = ['appVersion'],
    serviceMetrics = ['latency', 'volume', 'errors', 'dataIn', 'dataOut'];

var apps,
    perfPie = {},
    errorGraph = {},
    errorPie = {},
    initialized = false,
    outstanding;

function getAllTheData() {
	cc.apps(function(err, data) {
		if (err) {
			console.log('failed to retrieve apps: ' + JSON.stringify(err, null, '  '));
			return;
		}
		for ( app in data ) {
			delete data[app]['links'];
		}
		apps = data;

		updateGiraffe();

		outstanding = 0;

		for ( app in apps ) {
			serviceMetrics.forEach(function(element, index, array) {
				cc.performancePie([app], element, 60, 'service', eatPerfPie);
				outstanding++;
			});
			appMetrics.forEach(function(element, index, array) {
				cc.errorGraph([app], element, 43200, null, eatErrorGraph);
				outstanding++;
			});
			errorPieMetrics.forEach(function(metric) {
				errorPieGroupings.forEach(function(groupBy) {
					cc.errorPie([app], metric, 60, groupBy, eatErrorPie);
					outstanding++;
				});
			});
		}

		console.log('Getting ' + outstanding + ' graphs for ' + Object.keys(apps).length + ' apps...');
	});
}

function eatPerfPie(err, data) {
	if (err) {
		console.log('failed to get perf pie: ' + JSON.stringify(err, null, '  '));
		return;
	}
	var app = data['params']['appIds'][0];
	if ( ! perfPie[app] ) perfPie[app] = {};
	var metric = data['params']['graph'];
	perfPie[app][metric] = data;
	outstanding--;
	if ( outstanding == 0 ) {
		doAllTheStuff();
	}
}

function eatErrorGraph(err, data) {
	if (err) {
		console.log('failed to get error graph: ' + JSON.stringify(err, null, '  '));
		return;
	}
	var app = data['params']['appIds'][0];
	if ( ! errorGraph[app] ) errorGraph[app] = {};
	var metric = data['params']['graph'];
	errorGraph[app][metric] = data;
	outstanding--;
	if ( outstanding == 0 ) {
		doAllTheStuff();
	}
}

function eatErrorPie(err, data) {
	if (err) {
		console.log('failed to get error pie: ' + JSON.stringify(err, null, '  '));
		return;
	}
	var app = data['params']['appIds'][0];
	if ( ! errorPie[app] ) errorPie[app] = {};
	var metric = data['params']['graph'];
	if ( ! errorPie[app][metric] ) errorPie[app][metric] = {};
	var groupBy = data['params']['groupBy'];
	errorPie[app][metric][groupBy] = data;
	outstanding--;
	if ( outstanding == 0 ) {
		doAllTheStuff();
	}
}

function doAllTheStuff() {
	var buffer = '';

	for ( app in perfPie ) {
		var appNameStr = apps[app]['appName'].split(' ').join('_').split('.').join('-');
		for ( metric in perfPie[app] ) {
			var d = new Date(perfPie[app][metric]['data']['end']);
			var ts = d.getTime() / 1000;
			var metricStr = perfPie[app][metric]['params']['graph'];
			for ( slice in perfPie[app][metric]['data']['slices'] ) {
				var svcName = perfPie[app][metric]['data']['slices'][slice]['name'];
				var svcValue = perfPie[app][metric]['data']['slices'][slice]['value'];
				var svcNameNice = svcName.split('.').join('-')
				buffer += 'app.' + appNameStr + '.services.' + svcNameNice + '.' + metricStr + ' ' + svcValue + ' ' + ts + '\n';
			}
		}
	}

	for ( app in errorGraph ) {
		var appNameStr = apps[app]['appName'].split(' ').join('_').split('.').join('-');
		for ( metric in errorGraph[app] ) {
			var d = new Date(errorGraph[app][metric]['data']['start']);
			var ts = d.getTime() / 1000;
			var interval = errorGraph[app][metric]['data']['interval'];
			var metricStr = errorGraph[app][metric]['params']['graph'];
			var series = errorGraph[app][metric]['data']['series'][0]['points'];
			for ( i = 0; i < series.length; i++ ) {
				buffer += 'app.' + appNameStr + '.' + metricStr + ' ' + series[i] + ' ' + ts + '\n';
				ts += interval;
			}
		}
	}

	for ( app in errorPie ) {
		var appNameStr = apps[app]['appName'].split(' ').join('_').split('.').join('-');
		for ( metric in errorPie[app] ) {
			for ( groupBy in errorPie[app][metric] ) {
				var d = new Date(errorPie[app][metric][groupBy]['data']['end']);
				var ts = d.getTime() / 1000;
				var metricStr = errorPie[app][metric][groupBy]['params']['graph'];
				var groupByStr = errorPie[app][metric][groupBy]['params']['groupBy'];
				for ( slice in errorPie[app][metric][groupBy]['data']['slices'] ) {
					var sliceName = errorPie[app][metric][groupBy]['data']['slices'][slice]['name'];
					var sliceValue = errorPie[app][metric][groupBy]['data']['slices'][slice]['value'];
					var sliceNameNice = sliceName.split('.').join('-')
					buffer += 'app.' + appNameStr + '.' + metricStr + '-groupedBy.' + groupByStr + '.' + sliceNameNice + ' ' + sliceValue + ' ' + ts + '\n';
				}
			}
		}
	}
	console.log('Sending ' + buffer.split('\n').length + ' data points to graphite');
	sendBuffer(buffer);
}

function sendBuffer(buffer) {
	console.log('Connect to Graphite host ' + config.Graphite.host + ':' + config.Graphite.carbonPort);

	var client = net.connect(config.Graphite.carbonPort, config.Graphite.host, function() {
		console.log('Connected');
		client.write(buffer, 'utf8', function() {
			console.log('Sent ' + buffer.split('\n').length + ' data points to graphite.');
			client.end();
		});	
	});
}

function updateGiraffe() {
	var buffer = '// THIS IS A GENERATED FILE, DO NOT EDIT\n';
	buffer += '// Please make edits in ../giraffe-dashboards-template.js\n\n';
	buffer += 'var graphite_url = "http://' + config.Graphite.host + ':' + config.Graphite.httpPort + '";\n\n';
	buffer += 'var appNames = [';
	for ( app in apps ) {
		buffer += '"' + apps[app]['appName'].split(' ').join('_').split('.').join('-') + '", ';
	}
	buffer += '];\n';

	var template = fs.readFileSync('./giraffe-dashboards-template.js', 'utf8');
	fs.writeFileSync('./giraffe/dashboards.js', buffer + template);
	console.log('Updated Giraffe config with ' + Object.keys(apps).length + ' apps.');
}


function listen(port) {
	var requestLogger = function(req) {
    console.log('[%s] "%s %s" "%s"', (new Date).toUTCString(), req.method.cyan, req.url.cyan, req.headers['user-agent']);
  };

  var options = {
    root: path.dirname(process.argv[0]) + '/giraffe/',
    cache: 10,
    showDir: null,
    autoIndex: null,
    ext: null,
    logFn: requestLogger
  };

  options.headers = { 'Access-Control-Allow-Origin': '*' };

  var server = httpServer.createServer(options);
  server.listen(port, null, function() {
    console.log('Starting up http-server, serving '.yellow
      + server.root.cyan
      + ' on port: '.yellow
      + port.toString().cyan);
    var URL = 'http://localhost:' + port + '/';
    console.log('Giraffe dashboards should be available at: ' + URL.red);
    console.log('Hit CTRL-C to stop the server');
  });
}


cc.init(config.Crittercism.username, config.Crittercism.password, function(err) {
	if (err) {
		console.log('failed to initialize: ' + err['statusCode'] + ': ' + err['error_description']);
		return;
	}
	console.log('initialized');

	if ( process.argv[2] == 'now' ) {
		getAllTheData();

	} else {
		console.log('will get data every :00 and :30');
		var rule = new schedule.RecurrenceRule();
		rule.minute = [00, 30];
		var job = schedule.scheduleJob(rule, function(){ getAllTheData() });

		listen(config.listenPort);
	}
});