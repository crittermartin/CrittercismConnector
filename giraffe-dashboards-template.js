var dashboards = [];

dashboards[0] = {
  'name': '-- All Apps --',
  'refresh': 10000,
  'scheme': 'colorwheel',
  'metrics':
  [
    {
      'alias': 'Crash Percent',
      'target': 'aliasByNode(app.*.crashPercent,1)',
      'events': '*',
      'description': 'Crash percent by app',
      'colspan': 1
    },
    {
      'alias': 'App Loads',
      'target': 'aliasByNode(app.*.appLoads,1)',
      'events': '*',
      'description': 'App Loads by app',
      'colspan': 1
    },
    {
      'alias': 'Daily Active Users',
      'target': 'aliasByNode(app.*.dau,1)',
      'events': '*',
      'description': 'Daily Active Users by app',
      'colspan': 1
    },
    {
      'alias': 'Monthly Active Users',
      'target': 'aliasByNode(app.*.mau,1)',
      'events': '*',
      'description': 'Monthly Active Users by app',
      'colspan': 1
    }
  ]
}

function dashboardForAppName(appName) {
  return { "name": appName,
    "refresh": 10000,
    // you can use any rickshaw supported color scheme.
    // Enter palette name as string, or an array of colors
    // (see var scheme at the bottom).
    // Schemes can be configured globally (see below), per-dashboard, or per-metric
    "scheme": "colorwheel",   // this is a dashboard-specific color palette
    "description": ""
                ,
    "metrics": 
    [
      {
        "alias": "Latency by service",
        "target": "aliasByNode(app." + appName + ".services.*.latency,3)",
        "events": "*",  // instead of annotator, if you use the graphite events feature
                        // you can retrieve events matching specific tag(s) -- space separated
                        // or use * for all tags. Note you cannot use both annotator and events.
        "description": "Latency by service",
        "interpolation": "linear",
        "colspan": 1,
      },
      {
        "alias": "Errors by service",
        "target": "aliasByNode(app." + appName + ".services.*.errors,3)",
        "events": "*",  // instead of annotator, if you use the graphite events feature
                        // you can retrieve events matching specific tag(s) -- space separated
                        // or use * for all tags. Note you cannot use both annotator and events.
        "description": "Errors by service",
        "interpolation": "linear",
        "colspan": 1,
      },
      {
        "alias": "Volume by service",
        "target": "aliasByNode(app." + appName + ".services.*.volume,3)",
        "events": "*",  // instead of annotator, if you use the graphite events feature
                        // you can retrieve events matching specific tag(s) -- space separated
                        // or use * for all tags. Note you cannot use both annotator and events.
        "description": "Volume by service",
        "interpolation": "linear",
        "colspan": 1,
      },
      {
        "alias": "App Loads",
        "target": "app." + appName + ".appLoads",
        "events": "*",  // instead of annotator, if you use the graphite events feature
                        // you can retrieve events matching specific tag(s) -- space separated
                        // or use * for all tags. Note you cannot use both annotator and events.
        "description": "App Loads",
        "renderer": "bar",
        "interpolation": "linear",
        "colspan": 1,
      },
      {
        "alias": "App Loads by Version",
        "target": "aliasByNode(app." + appName + ".appLoads-groupedBy.appVersion.*,4)",
        "events": "*",  // instead of annotator, if you use the graphite events feature
                        // you can retrieve events matching specific tag(s) -- space separated
                        // or use * for all tags. Note you cannot use both annotator and events.
        "description": "App Loads by Version",
        "renderer": "bar",
        "interpolation": "linear",
        "colspan": 1,
      },      {
        "alias": "Crash Percent",
        "target": "app." + appName + ".crashPercent",
        "events": "*",  // instead of annotator, if you use the graphite events feature
                        // you can retrieve events matching specific tag(s) -- space separated
                        // or use * for all tags. Note you cannot use both annotator and events.
        "description": "Crash Percent",
        "renderer": "bar",
        "interpolation": "linear",
        "colspan": 1,
      },
      {
        "alias": "Crash Percent by Version",
        "target": "aliasByNode(app." + appName + ".crashPercent-groupedBy.appVersion.*,4)",
        "events": "*",  // instead of annotator, if you use the graphite events feature
                        // you can retrieve events matching specific tag(s) -- space separated
                        // or use * for all tags. Note you cannot use both annotator and events.
        "description": "Crash Percent by Version",
        "renderer": "bar",
        "interpolation": "linear",
        "colspan": 1,
      },
      {
        "alias": "Daily Active Users",
        "target": "app." + appName + ".dau",
        "events": "*",  // instead of annotator, if you use the graphite events feature
                        // you can retrieve events matching specific tag(s) -- space separated
                        // or use * for all tags. Note you cannot use both annotator and events.
        "description": "Daily Active Users",
        "renderer": "bar",
        "interpolation": "linear",
        "colspan": 1,
      },
    ]
  }
}

function relative_period() { return (typeof period == 'undefined') ? 1 : parseInt(period / 7) + 1; }
function entire_period() { return (typeof period == 'undefined') ? 1 : period; }
function at_least_a_day() { return entire_period() >= 1440 ? entire_period() : 1440; }

function stroke(color) { return color.brighter().brighter() }
function format_pct(n) { return d3.format(",f")(n) + "%" }

appNames.forEach(function(element) {
  dashboards[dashboards.length] = dashboardForAppName(element);
})
