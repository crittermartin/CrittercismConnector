// Crittercism Connector configuration
// Please fill in the values appropriate to your installation below:
//
var config = {};

config.Crittercism = {};
config.Graphite = {};

// The Giraffe dashboard server will listen on this port:
config.listenPort = 11563;

// Fill in your Crittercism details below.
// Client ID is your API access token provided by Crittercism Support.
config.Crittercism.clientID = 'YOUR_TOKEN';
config.Crittercism.username = 'YOUR_CRITTERCISM_ID';
config.Crittercism.password = 'YOUR_CRITTERCISM_PASSWORD';

// Fill in the details for your Graphite installation:
config.Graphite.host = '127.0.0.1';
// TCP port that Carbon cache server is listening on:
config.Graphite.carbonPort = 2003;
// TCP port that the Graphite HTTP server is listening on:
config.Graphite.httpPort = 8080;

module.exports = config;