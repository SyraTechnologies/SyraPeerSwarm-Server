'use strict';

var url = require('url');

module.exports = {
  mongodb: {
    server: process.env.MONGO_ADMIN_SERVER,
    port: process.env.MONGO_ADMIN_PORT,

    //ssl: connect to the server using secure SSL
    ssl: false,

    //autoReconnect: automatically reconnect if connection is lost
    autoReconnect: true,

    //poolSize: size of connection pool (number of connections to use)
    poolSize: 4,

    //set admin to true if you want to turn on admin features
    //if admin is true, the auth list below will be ignored
    //if admin is true, you will need to enter an admin username/password below (if it is needed)
    admin: true,
	
	adminUsername: process.env.MONGO_ADMIN_USERNAME,
	adminPassword: process.env.MONGO_ADMIN_PASSWORD,

    // >>>>  If you are using regular accounts, fill out auth details in the section below
    // >>>>  If you have admin auth, leave this section empty and skip to the next section
    auth: [

    ],

    //whitelist: hide all databases except the ones in this list  (empty list for no whitelist)
    whitelist: [],

    //blacklist: hide databases listed in the blacklist (empty list for no blacklist)
    blacklist: [],
  },

  site: {
    // baseUrl: the URL that mongo express will be located at - Remember to add the forward slash at the stard and end!
    baseUrl: '/mongo-express/',
    cookieKeyName: 'mongo-express',
    cookieSecret: 'cookafljasdflasjklfjaslfiesecret',
    host: process.env.HOSTNAME,
    requestSizeLimit: '50mb',
	port: process.env.PORT,
    sessionSecret: 'sessiasdflasdjflasonsecret',
	sslCert: '',
    sslEnabled: false,
    sslKey: '',
  },
  
  useBasicAuth: false,

  basicAuth: {
    username: 'admin',
    password: 'pass',
  },

  options: {
    // Display startup text on console
    console: true,

    //documentsPerPage: how many documents you want to see at once in collection view
    documentsPerPage: 10,

    //editorTheme: Name of the theme you want to use for displaying documents
    //See http://codemirror.net/demo/theme.html for all examples
    editorTheme: 'rubyblue',

    // Maximum size of a single property & single row
    // Reduces the risk of sending a huge amount of data when viewing collections
    maxPropSize: (100 * 1000),  // default 100KB
    maxRowSize: (1000 * 1000),  // default 1MB

    //The options below aren't being used yet

    //cmdType: the type of command line you want mongo express to run
    //values: eval, subprocess
    //  eval - uses db.eval. commands block, so only use this if you have to
    //  subprocess - spawns a mongo command line as a subprocess and pipes output to mongo express
    cmdType: 'eval',

    //subprocessTimeout: number of seconds of non-interaction before a subprocess is shut down
    subprocessTimeout: 300,

    //readOnly: if readOnly is true, components of writing are not visible.
    readOnly: false,

    //collapsibleJSON: if set to true, jsons will be displayed collapsible
    collapsibleJSON: true,

    //collapsibleJSONDefaultUnfold: if collapsibleJSON is set to `true`, this defines default level
    //  to which JSONs are displayed unfolded; use number or "all" to unfold all levels
    collapsibleJSONDefaultUnfold: 1,
  },
  defaultKeyNames: {

  },
};