#Crittercism Connector

A sample Crittercism API connector that pushes Crittercism data to Graphite.
It also provides some preconfigured dashboards using **Giraffe** (http://giraffe.kenhub.com/)

##Components:

* CrittercismClient.js - a Crittercism REST API Data Transfer Object for node.js
* cc.js - the Crittercism Connector node app
* ccconfig.js - App configuration
* Giraffe - a graphite dashboard with a long neck 
http://giraffe.kenhub.com/


##Instructions:

(1) Install Graphite

(2) Edit Graphite's conf/storage_schemas.conf and add retention settings for app data:
```
[app_perf]
pattern = ^app\..*\.services\.
retentions = 60m:90d, 1d:5y

[app_daily]
pattern = ^app\.
retentions = 1d:5y
```
(3) Start the Carbon cache, for example:
```
${GRAPHITE_HOME}/bin/carbon-cache.py start
```
(4) Start the Graphite server:
```
${GRAPHITE_HOME}/bin/run-graphite-devel-server.py
```
(5) Get the package dependencies for this app:
```
npm install
```
(6) Edit ccconfig.js in this directory and fill in your Crittercism and Graphite details.

(7) Run the app with the "now" argument to get initial data to look at:
```
node cc now
```
(8) Run the app in continuous mode with the HTTP listener for Giraffe:
```
node cc
```
Point your browser at the URL you see in the console output and you should be good to go!


##TODO

* My JavaScript could use some cleaning up!
* Some convenience methods to retrieve pre-cleaned simple data would be nice...
* It would be nice to automate the initial configuration and make it more user-friendly
* Anything else?

