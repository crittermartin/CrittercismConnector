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
    async = require('async'),
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
    outstanding,
    pending = {};

var _this = this;

function getServiceMetrics(duration) {
	cc.apps(function(err, data) {
		if (err) {
			log('failed to retrieve apps: ' + JSON.stringify(err, null, '  '));
			return;
		}
		for ( app in data ) {
			delete data[app].links;
		}
		apps = data;

		updateGiraffe();

		pending.serviceMetrics = 0;
		for ( app in apps ) {
			serviceMetrics.forEach(function(element, index, array) {
				cc.performancePie([app], element, duration, null, 'service', processServiceMetric);
				pending.serviceMetrics++;
			});
		}
		log('Requested ' + pending.serviceMetrics + ' service metrics graphs from Crittercism');
	});
}

function processServiceMetric(err, data) {
	if (err) {
		log('failed to get perf pie: ' + JSON.stringify(err, null, '  '));
		return;
	}
	var app = data.params.appIds[0];
	var metric = data.params.graph;

	if ( ! perfPie[app] ) perfPie[app] = {};

	perfPie[app][metric] = data;
	pending.serviceMetrics--;
	if ( pending.serviceMetrics == 0 ) {
		sendServiceMetrics();
	}
}

function sendServiceMetrics() {
	var buffer = '';
	for ( app in perfPie ) {
		var appNameStr = apps[app].appName.split(' ').join('_').split('.').join('-');
		for ( metric in perfPie[app] ) {
			var d = new Date(perfPie[app][metric].data.end);
			var ts = d.getTime() / 1000;
			var metricStr = perfPie[app][metric].params.graph;
			for ( slice in perfPie[app][metric].data.slices ) {
				var svcName = perfPie[app][metric].data.slices[slice].name;
				var svcValue = perfPie[app][metric].data.slices[slice].value;
				var svcNameNice = svcName.split('.').join('-')
				buffer += 'app.' + appNameStr + '.services.' + svcNameNice + '.' + metricStr + ' ' + svcValue + ' ' + ts + '\n';
			}
		}
	}
	log('Sending ' + buffer.split('\n').length + ' service metrics to Graphite');
	sendBuffer(buffer);
}


function getAppMetrics(duration) {
	cc.apps(function(err, data) {
		if (err) {
			log('failed to retrieve apps: ' + JSON.stringify(err, null, '  '));
			return;
		}
		for ( app in data ) {
			delete data[app].links;
		}
		apps = data;

		pending.appMetrics = 0;
		for ( app in apps ) {
			appMetrics.forEach(function(element, index, array) {
				cc.errorGraph([app], element, duration, null, processAppMetric);
				pending.appMetrics++;
			});
		}
		log('Requested ' + pending.appMetrics + ' app metrics graphs from Crittercism');
	});
}

function processAppMetric(err, data) {
	if (err) {
		log('failed to get error graph: ' + JSON.stringify(err, null, '  '));
		return;
	}
	var app = data.params.appIds[0];
	var metric = data.params.graph;

	if ( ! errorGraph[app] ) errorGraph[app] = {};

	errorGraph[app][metric] = data;
	pending.appMetrics--;
	if ( pending.appMetrics == 0 ) {
		sendAppMetrics();
	}
}

function sendAppMetrics() {
	var buffer = '';
	for ( app in errorGraph ) {
		var appNameStr = apps[app].appName.split(' ').join('_').split('.').join('-');
		for ( metric in errorGraph[app] ) {
			var d = new Date(errorGraph[app][metric].data.start);
			var ts = d.getTime() / 1000;
			var interval = errorGraph[app][metric].data.interval;
			var metricStr = errorGraph[app][metric].params.graph;
			var series = errorGraph[app][metric].data.series[0].points;
			for ( i = 0; i < series.length; i++ ) {
				buffer += 'app.' + appNameStr + '.' + metricStr + ' ' + series[i] + ' ' + ts + '\n';
				ts += interval;
			}
		}
	}
	log('Sending ' + buffer.split('\n').length + ' app metrics to Graphite');
	sendBuffer(buffer);
}


function getGroupedAppMetrics(duration) {
	cc.apps(function(err, data) {
		if (err) {
			log('failed to retrieve apps: ' + JSON.stringify(err, null, '  '));
			return;
		}
		for ( app in data ) {
			delete data[app].links;
		}
		apps = data;

		pending.groupedAppMetrics = 0;
		for ( app in apps ) {
			errorPieMetrics.forEach(function(metric) {
				errorPieGroupings.forEach(function(groupBy) {
					cc.errorPie([app], metric, duration, null, groupBy, processGroupedAppMetric);
					pending.groupedAppMetrics++;
				});
			});
		}
		log('Requested ' + pending.groupedAppMetrics + ' grouped app metrics graphs from Crittercism');
	});
}

function processGroupedAppMetric(err, data) {
	if (err) {
		log('failed to get error pie: ' + JSON.stringify(err, null, '  '));
		return;
	}

	var app = data.params.appIds[0];
	var metric = data.params.graph;
	var groupBy = data.params.groupBy;

	if ( ! errorPie[app] ) errorPie[app] = {};
	if ( ! errorPie[app][metric] ) errorPie[app][metric] = {};

	errorPie[app][metric][groupBy] = data;
	pending.groupedAppMetrics--;
	if ( pending.groupedAppMetrics == 0 ) {
		sendGroupedAppMetrics();
	}
}

function sendGroupedAppMetrics() {
	var buffer = '';
	for ( app in errorPie ) {
		var appNameStr = apps[app].appName.split(' ').join('_').split('.').join('-');
		for ( metric in errorPie[app] ) {
			for ( groupBy in errorPie[app][metric] ) {
				var d = new Date(errorPie[app][metric][groupBy].data.end);
				var ts = d.getTime() / 1000;
				var metricStr = errorPie[app][metric][groupBy].params.graph;
				var groupByStr = errorPie[app][metric][groupBy].params.groupBy;
				for ( slice in errorPie[app][metric][groupBy].data.slices ) {
					var sliceName = errorPie[app][metric][groupBy].data.slices[slice].name;
					var sliceValue = errorPie[app][metric][groupBy].data.slices[slice].value;
					var sliceNameNice = sliceName.split('.').join('-')
					buffer += 'app.' + appNameStr + '.' + metricStr + '-groupedBy.' + groupByStr + '.' + sliceNameNice + ' ' + sliceValue + ' ' + ts + '\n';
				}
			}
		}
	}

	log('Sending ' + buffer.split('\n').length + ' grouped app metrics to Graphite');
	sendBuffer(buffer);
}

function sendBuffer(buffer) {
	log('Connect to Graphite host ' + config.Graphite.host + ':' + config.Graphite.carbonPort);

	var client = net.connect(config.Graphite.carbonPort, config.Graphite.host, function() {
		client.write(buffer, 'utf8', function() {
			log('Sent ' + buffer.split('\n').length + ' data points to Graphite.');
			client.end();
		});	
	});
}

function updateGiraffe() {
	var buffer = [
		'// THIS IS A GENERATED FILE, DO NOT EDIT',
		'//',
		'// Please make edits in ../giraffe-dashboards-template.js',
		'//',
		'',
		'var graphite_url = "http://' + config.Graphite.host + ':' + config.Graphite.httpPort + '";',
		'',
		''
	].join('\n');

	var appNames = [];
	for ( app in apps ) {
		appNames.push(apps[app]['appName'].split(' ').join('_').split('.').join('-'));
	}
	buffer += 'var appNames = ' + JSON.stringify(appNames.sort(), null, '  ') + ';\n\n';

	var template = fs.readFileSync('./giraffe-dashboards-template.js', 'utf8');
	fs.writeFileSync('./giraffe/dashboards.js', buffer + template);
	log('Updated Giraffe config with ' + Object.keys(apps).length + ' apps.');
}


function listen(port) {
	var requestLogger = function(req) {
    log(req.method.red + ' ' + req.url.cyan);
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
    log('Starting up http-server, serving '.yellow
      + server.root.cyan
      + ' on port: '.yellow
      + port.toString().cyan);
    var URL = 'http://localhost:' + port + '/';
    log('Giraffe dashboards should be available at: ' + URL.red);
    log('Hit CTRL-C to stop the server');
  });
}

function log(message) {
	console.log('[' + (new Date).toLocaleString() + '] ' + message);
}

cc.init(config.Crittercism.username, config.Crittercism.password, function(err) {
	if (err) {
		log('failed to initialize: ' + err['statusCode'] + ': ' + err['error_description']);
		return;
	}
	log('Crittercism API client initialized');

	getServiceMetrics(15);
	getAppMetrics(43200);
	getGroupedAppMetrics(1440);

	var serviceMetricsRule = new schedule.RecurrenceRule();
	serviceMetricsRule.minute = [00, 15, 30, 45];
	var serviceMetricsJob = schedule.scheduleJob(serviceMetricsRule, function(){
		getServiceMetrics(15);
	});

	var appMetricsRule = new schedule.RecurrenceRule();
	appMetricsRule.minute = 5;
	var appMetricsJob = schedule.scheduleJob(appMetricsRule, function() {
		getAppMetrics(1440);
	});

	var groupedAppMetricsRule = new schedule.RecurrenceRule();
	groupedAppMetricsRule.minute = 10;
	var groupedAppMetricsJob = schedule.scheduleJob(groupedAppMetricsRule, function() {
		getGroupedAppMetrics(1440);
	});

	listen(config.listenPort);
});