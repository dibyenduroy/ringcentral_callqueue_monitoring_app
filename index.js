'use strict';

// Dependencies
var RC = require('ringcentral');
var http = require('http');

function dbInsert(sessionId,eventTime,accountId,extensionId,id,to_phoneNumber,queue_name,from_phoneNumber,status,uuid) {
    //Setting up the MySqlDB Connection
 
    var mysql      = require('mysql');
    var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : 'welcome',
    database : 'RingCentral'
    });
    
    connection.connect();

    var sessionId = sessionId;
    var eventTime = eventTime;
    var accountId = accountId;
    var extensionId = extensionId;
    var id= id;
    var to_phoneNumber= to_phoneNumber;
    var queue_name= queue_name;
    var from_phoneNumber= from_phoneNumber;
    var status= status;
    var uuid=uuid;
   
    
    var sqlquery = "INSERT INTO ringcentral.rc_csn (sessionId, eventTime,accountId,extensionId,id,to_phoneNumber,queue_name,from_phoneNumber,status,uuid) VALUES ("
    + '"'+sessionId+ '"'+ ","
    + '"'+eventTime + '"'+ "," 
    + '"'+accountId + '"'+ ","
    + '"'+extensionId+ '"'+ "," 
    + '"'+ id + '"'+ "," 
    + '"'+  to_phoneNumber+ '"'+ "," 
    + '"'+ queue_name+ '"'+ "," 
    + '"'+  from_phoneNumber+ '"'+ ","
    + '"'+  status+ '"'+ ","
    + '"'+ uuid+'"' +")";
    console.log(sqlquery);
    connection.query(sqlquery , function (error, results, fields) {
    if (error) throw error;
    console.log("1 row inserted");
    
    });

    connection.end();
    return 1;
}
 

  

// Handle local development and testing
if (process.env.RC_ENVIRONMENT !== 'Production') {
    require('dotenv').config();
}

// CONSTANTS - obtained from environment variables
var PORT = process.env.PORT;





// VARS
var _devices = [];
var _extensionFilterArray = [];
var server = http.createServer();


// Initialize the sdk for RC
var sdk = new RC({
    server: process.env.RC_API_BASE_URL,
    appKey: process.env.RC_APP_KEY,
    appSecret: process.env.RC_APP_SECRET,
    cachePrefix: process.env.RC_CACHE_PREFIX
});


// Bootstrap Platform and Subscription
var platform = sdk.platform();
var subscription = sdk.createSubscription();

//login
login();


function login() {
    return platform.login({
        username: process.env.RC_USERNAME,
        password: process.env.RC_PASSWORD,
        extension: process.env.RC_EXTENSION,
        cachePrefix: process.env.RC_CACHE_PREFIX
    })
        .then(function (response) {
            console.log("The RC auth object is :", JSON.stringify(response.json(), null, 2));
            console.log("Succesfully logged into the RC Account");
            init();
        })
        .catch(function (e) {
            console.log("Login Error into the Ringcentral Platform :", e);
            throw e;
        });
}


// Start the server
server.listen(PORT);

/*
 Retreive devices on Login success
 */
function init(loginData) {

    var devices = [];
    var page = 1;

    function getDevicesPage() {

        return platform
            .get('/account/~/extension', {
                page: page,
                perPage: process.env.DEVICES_PER_PAGE                                             //REDUCE NUMBER TO SPEED BOOTSTRAPPING
            })
            .then(function (response) {

                console.log("The account level extensions are :", JSON.stringify(response.json(), null, 2));
                var data = response.json();

                console.log("************** THE NUMBER OF ACCOUNT LEVEL Extensions ARE : ***************", data.records.length);

                devices = devices.concat(data.records);
                if (data.navigation.nextPage) {
                    page++;
                    return getDevicesPage();                                                     // this will be chained
                } else {
                    return devices;                                                              // this is the finally resolved thing
                }
            });

    }

    /*
     Loop until you capture all devices
     */
    return getDevicesPage()
        .then(function (devices) {
            console.log("************** The total extensions are : **********", devices.length);
            return devices;
        })
        .then(createEventFilter)
        .then(startSubscription)
        .catch(function (e) {
            console.error(e);
            throw e;
        });

}

/*
 To generate the presence Event Filter for subscription
 */
function createEventFilter(devices) {
    _devices = devices;
    for (var i = 0; i < devices.length; i++) {

        var device = devices[i];
        _extensionFilterArray.push(generatePresenceEventFilter(device));
    
    }
    return devices;
}

function generatePresenceEventFilter(item) {
    //console.log("The item is :", item);
    if (!item) {
        ;
        throw new Error('Message-Dispatcher Error: generatePresenceEventFilter requires a parameter');
    } else {
        console.log("The Presence Filter added for the extension :" + item.id + ' : /account/~/extension/' + item.id + '/presence?detailedTelephonyState=true');
        //return '/account/~/extension/' + item.id + '/presence?detailedTelephonyState=true';
        return '/restapi/v1.0/account/~/telephony/sessions';
    }
}


function startSubscription(devices) { //FIXME MAJOR Use devices list somehow

    console.log("********* STARTING TO CREATE SUBSCRIPTION ON ALL FILTERED DEVICES ***************");
    return subscription
        .setEventFilters(_extensionFilterArray)
        .register();

}


// Server Event Listeners
server.on('request', inboundRequest);

server.on('error', function (err) {
    console.error(err);
});

server.on('listening', function () {
    console.log('Server is listening to ', PORT);
});

server.on('close', function () {
    console.log('Server has closed and is no longer accepting connections');
});

// Register Platform Event Listeners
platform.on(platform.events.loginSuccess, handleLoginSuccess);
platform.on(platform.events.loginError, handleLoginError);
platform.on(platform.events.logoutSuccess, handleLogoutSuccess);
platform.on(platform.events.logoutError, handleLogoutError);
platform.on(platform.events.refreshSuccess, handleRefreshSuccess);
platform.on(platform.events.refreshError, handleRefreshError);

// Register Subscription Event Listeners
subscription.on(subscription.events.notification, handleSubscriptionNotification);
subscription.on(subscription.events.removeSuccess, handleRemoveSubscriptionSuccess);
subscription.on(subscription.events.removeError, handleRemoveSubscriptionError);
subscription.on(subscription.events.renewSuccess, handleSubscriptionRenewSuccess);
subscription.on(subscription.events.renewError, handleSubscriptionRenewError);
subscription.on(subscription.events.subscribeSuccess, handleSubscribeSuccess);
subscription.on(subscription.events.subscribeError, handleSubscribeError);

// Server Request Handler
function inboundRequest(req, res) {
    //console.log('REQUEST: ', req);
}

/**
 * Subscription Event Handlers   - to capture events on telephonyStatus ~ callConnected
 **/
function handleSubscriptionNotification(msg) {
    console.log('*************** SUBSCRIPTION NOTIFICATION: ****************(', JSON.stringify(msg, null, 2));
    var message = JSON.stringify(msg, null, 2);
    console.log('The uuid is ' +  msg.uuid+'-' + msg.timestamp +'  '+ msg.body.parties[0].status.code
              +'   '+ msg.body.parties[0].to.name );

console.log('The Number of Parties are :' + msg.body.parties.length);

 for (var i=0;i<=msg.body.parties.length-1;i++) {

    console.log("The value if i is :" + i );
    
    dbInsert(msg.body.sessionId,
        msg.body.eventTime,
        msg.body.accountId,
        msg.body.parties[i].extensionId,
        msg.body.parties[i].id,
        msg.body.parties[i].to.phoneNumber,
        msg.body.parties[i].to.name,
        msg.body.parties[i].from.phoneNumber,
        msg.body.parties[i].status.code,
        msg.uuid
    );
  console.log("1 row inserted");

 }



   // Will Insert Data into the Database



}

function handleRemoveSubscriptionSuccess(data) {
    console.log('REMOVE SUBSCRIPTION SUCCESS DATA: ', data);
}

function handleRemoveSubscriptionError(data) {
    console.log('REMOVE SUBSCRIPTION ERROR DATA: ', data);
}

function handleSubscriptionRenewSuccess(data) {
    console.log('RENEW SUBSCRIPTION SUCCESS DATA: ', data);
}

function handleSubscriptionRenewError(data) {
    console.log('RENEW SUBSCRIPTION ERROR DATA: ', data);
}

function handleSubscribeSuccess(data) {
    console.log('SUBSCRIPTION CREATED SUCCESSFULLY');
}

function handleSubscribeError(data) {
    console.log('FAILED TO CREATE SUBSCRIPTION: ', data);
}

/**
 * Platform Event Handlers
 **/
function handleLoginSuccess(data) {
    // UNCOMMENT TO VIEW LOGIN DATA
    //console.log('LOGIN SUCCESS DATA: ', data);
}

function handleLoginError(data) {
    console.log('LOGIN FAILURE DATA: ', data);
}

function handleLogoutSuccess(data) {
    console.log('LOGOUT SUCCESS DATA: ', data);
}

function handleLogoutError(data) {
    console.log('LOGOUT FAILURE DATA: ', data);
}

function handleRefreshSuccess(data) {
    console.log('REFRESH SUCCESS DATA: ', data);
}

function handleRefreshError(data) {
    console.log('REFRESH FAILURE DATA: ', data);
    console.log('Initialing Login again :');
    login();
}