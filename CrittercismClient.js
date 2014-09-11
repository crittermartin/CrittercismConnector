// Crittercism Client DTO
// Created by Martin Stone <martin@crittercism.com>
//
// Provides the following methods:
//
// init - connect to Crittercism and obtain a bearer token for subsequent requests
// apps - get info about all apps visible to your Crittercism ID
// performancePie - get data from /performanceManagement/pie endpoint
// errorPie - get data from /errorMonitoring/pie endpoint
// errorGraph - get data from /errorMonitoring/pie endpoint
//
// Please see http://docs.crittercism.com/api/api.html for detailed information
// about the Crittercism REST API.
//
var https = require('https');

function CrittercismClient(clientID) {
	this.hostname = 'developers.crittercism.com';
	this.port = 443;
	this.clientID = clientID;
}

CrittercismClient.prototype.init = function init(user, pass, callback) {
	this.user = user;
	this.pass = pass;

	var path = '/v1.0/token' + '?grant_type=password&username=' + this.user + '&password=' + this.pass;

	var _this = this;
	this.clientPost(path, null, function(err, data) {
		if (err) {
			callback(err);
			return;
		} else {
			_this.token = data.access_token;
			_this.tokenStr = 'Bearer ' + _this.token;
			callback(null);
		}
	});
}

CrittercismClient.prototype.apps = function apps(callback) {
	var params = [
		'appName',
		'appType',
		'appVersions',
		'crashPercent',
		'dau',
		'latency',
		'latestAppStoreReleaseDate',
		'latestVersionString',
		'linkToAppStore',
		'iconURL',
		'mau',
		'rating',
		'role'
	];

	var path = '/v1.0/apps?attributes=' + params.join('%2C');

	this.clientGet(path, callback);
}

CrittercismClient.prototype.performancePie = function performancePie(appIds, graph, duration, filter, groupBy, callback) {

	var path = '/v1.0/performanceManagement/pie';

	var params = {'params': 
		{
			appIds: appIds,
			graph: graph,
			duration: duration,
			groupBy: groupBy
		}
	};

	if ( filter != null ) params.filters = filter;

	this.clientPost(path, params, callback);
}

CrittercismClient.prototype.errorPie = function errorPie(appIds, graph, duration, filter, groupBy, callback) {

	var path = '/v1.0/errorMonitoring/pie';

	var params = {'params': 
		{
			appIds: appIds,
			graph: graph,
			duration: duration,
			groupBy: groupBy
		}
	};

	if ( filter != null ) params.filters = filter;

	this.clientPost(path, params, callback);
}

CrittercismClient.prototype.errorSparklines = function errorSparklines(appIds, graph, duration, filter, groupBy, callback) {

	var path = '/v1.0/errorMonitoring/sparklines';

	var params = {'params': 
		{
			appIds: appIds,
			graph: graph,
			duration: duration,
			groupBy: groupBy
		}
	};

	if ( filter != null ) params.filters = filter;

	this.clientPost(path, params, callback);
}

CrittercismClient.prototype.errorGraph = function errorGraph(appIds, graph, duration, filter, callback) {
	var path = '/v1.0/errorMonitoring/graph';

	var params = {'params': 
		{
			appIds: appIds,
			graph: graph,
			duration: duration
		}
	};

	if ( filter != null ) params.filters = filter;

	this.clientPost(path, params, callback);
}

////////////////////////////////
//
// HTTPS client functions
//
CrittercismClient.prototype.clientGet = function clientGet(url, callback) {
	this.clientRequest('GET', url, null, callback);
}

CrittercismClient.prototype.clientPost = function clientPost(url, params, callback) {
	this.clientRequest('POST', url, params, callback);
}

CrittercismClient.prototype.clientRequest = function clientRequest(method, url, params, callback) {
	var options = {
		hostname: this.hostname,
		port: this.port,
		method: method,
		path: url,
		auth: this.clientID + ':ANYTHING',
		headers: {
			'Content-type': 'application/json',
			'Authorization': this.tokenStr
		}
	};

	var req = https.request(options, function(res) {
		var buffer = '';
		var failed = false;

		if ( res.statusCode < 200 || res.statusCode > 204 ) failed = true;

	  res.setEncoding('utf8');
	  res.on('data', function (chunk) {
	    buffer += chunk;
		}).on('end', function() {
			if (failed) {
				callback(res);
				return;
			}
			var o;
			try {
				o = JSON.parse(buffer);
			} catch(e) {
				o = e.message;
			}

			callback(null, o);
		});
	});
	if (params != null) {
		req.write(JSON.stringify(params));
	}
	req.end();
}

module.exports = CrittercismClient;