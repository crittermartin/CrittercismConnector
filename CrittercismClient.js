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
// clientPost - fill in the params and the path to get data for any Crittercism endpoint
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

	var options = {
		hostname: this.hostname,
		port: this.port,
		method: 'POST',
		path: '/v1.0/token' + '?grant_type=password&username=' + this.user + '&password=' + this.pass,
		auth: this.clientID + ':ANYTHING'
	};

	var _this = this;
	var req = https.request(options, function(res) {
		var buffer = '';
		var failed = false;

		if ( res.statusCode != 200 ) failed = true;

	  res.setEncoding('utf8');
	  res.on('data', function (chunk) {
	    buffer += chunk;
		}).on('end', function() {
			if (failed) {
				var err = JSON.parse(buffer);
				err['statusCode'] = res.statusCode;
				err['headers'] = res.headers;
				callback(err);
				return;
			}
			var o = JSON.parse(buffer);
			_this.token = o['access_token'];
			_this.tokenStr = 'Bearer ' + _this.token;
			callback(null);
		});
	});
	req.end();
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

	var options = {
		hostname: this.hostname,
		port: this.port,
		method: 'GET',
		path: '/v1.0/apps?attributes=' + params.join('%2C'),
		auth: this.clientID + ':ANYTHING',
		headers: {
			'Content-type': 'application/json',
			'Authorization': this.tokenStr
		}
	};

	var req = https.request(options, function(res) {

		var buffer = '';
		var failed = false;
		if ( res.statusCode != 200 ) failed = true;

	  res.setEncoding('utf8');
	  res.on('data', function (chunk) {
	    buffer += chunk;
		}).on('end', function() {
			if (failed) {
				try {
					var err = JSON.parse(buffer);
					err['statusCode'] = res.statusCode;
					err['headers'] = res.headers;
					callback(err);
					return;
				} catch (e) {
					callback({'error_description': 'malformed JSON: ' + buffer});
					return;
				}
			}
			try {
				var o = JSON.parse(buffer);
			} catch (e) {
				callback({'error_description': 'malformed JSON: ' + buffer});
				return;
			}
			callback(null, o);
		});
	});

	req.end();
}

CrittercismClient.prototype.performancePie = function performancePie(appIds, graph, duration, groupBy, callback) {

	var path = '/v1.0/performanceManagement/pie';

	var params = {'params': 
		{
			'appIds': appIds,
			'graph': graph,
			'duration': duration,
			'groupBy': groupBy
		}
	};

	this.clientPost(path, params, callback);
}

CrittercismClient.prototype.errorPie = function errorPie(appIds, graph, duration, groupBy, callback) {

	var path = '/v1.0/errorMonitoring/pie';

	var params = {'params': 
		{
			'appIds': appIds,
			'graph': graph,
			'duration': duration,
			'groupBy': groupBy
		}
	};

	this.clientPost(path, params, callback);
}

CrittercismClient.prototype.errorGraph = function errorGraph(appIds, graph, duration, filter, callback) {
	var path = '/v1.0/errorMonitoring/graph';

	var params = {'params': 
		{
			'appIds': appIds,
			'graph': graph,
			'duration': duration
		}
	};

	if ( filter != null ) params['filter'] = filter;

	this.clientPost(path, params, callback);
}

CrittercismClient.prototype.clientPost = function clientPost(path, params, callback) {
	var options = {
		hostname: this.hostname,
		port: this.port,
		method: 'POST',
		path: path,
		auth: this.clientID + ':ANYTHING',
		headers: {
			'Content-type': 'application/json',
			'Authorization': this.tokenStr
		}
	};

	var req = https.request(options, function(res) {
		var buffer = '';
		var failed = false;
		if ( res.statusCode != 200 ) failed = true;

	  res.setEncoding('utf8');
	  res.on('data', function (chunk) {
	    buffer += chunk;
		}).on('end', function() {
			if (failed) {
				try {
					var err = JSON.parse(buffer);
					err['statusCode'] = res.statusCode;
					err['headers'] = res.headers;
					callback(err);
				} catch (e) {
					callback({'error_description': 'malformed JSON: ' + buffer});
				}
				return;
			}
			else {
				try {
					var o = JSON.parse(buffer);
				} catch (e) {
					callback({'error_description': 'malformed JSON: ' + buffer});
					return;
				}
				callback(null, o);
			}
		});
	});
	req.write(JSON.stringify(params));
	req.end();
}


module.exports = CrittercismClient;

