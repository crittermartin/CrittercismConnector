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

(1) Install Graphite.  Warning, Graphite is super hard to install on a Mac!

(2) Install node.js.

(3) Edit Graphite's conf/storage_schemas.conf and add retention settings for app data:
```
[app_perf]
pattern = ^app\..*\.services\.
retentions = 15m:90d, 1d:5y

[app_daily]
pattern = ^app\.
retentions = 1d:5y
```
(4) Edit Carbon's configuration in Graphite's conf/carbon.conf so that it will let a lot of databases get created.  Change the line:
```
MAX_CREATES_PER_MINUTE = 50
```
to:
```
MAX_CREATES_PER_MINUTE = 5000
```
(5) Start the Carbon cache, for example:
```
${GRAPHITE_HOME}/bin/carbon-cache.py start
```
(6) Start the Graphite server:
```
${GRAPHITE_HOME}/bin/run-graphite-devel-server.py
```
(7) Get the package dependencies for this app:
```
npm install
```
(8) Edit ccconfig.js in the CrittercismConnector directory and fill in your Crittercism and Graphite details.

(9) Run the app:
```
node cc
```
Point your browser at the URL you see in the console output (http://localhost:11563 is the default) and you should be good to go!


##TODO

* My JavaScript could use some cleaning up!
* Some convenience methods to retrieve pre-cleaned simple data would be nice...
* It would be nice to automate the initial configuration and make it more user-friendly
* Anything else?

