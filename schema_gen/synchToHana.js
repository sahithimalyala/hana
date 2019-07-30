var hdb = require('hdb');
var fs = require('fs');
var pg = require('pg');
var dateFormat = require('dateformat');
const camelCase = require('camelcase');
const request = require('request')


var pool = new pg.Pool({    
    host: '172.32.28.238', // server name or IP address;
    port: 5432,
    database: 'new_schema',
    user: 'postgres',
    password: 'postgres'
  });

function serviceCase(key){
    var str = camelCase(key);
    str = str.charAt(0).toUpperCase()+str.substring(1);
    return str;
}


var sampleJSON = {"Vbeln" : "4900000001",
"Werks" : "1112",
"Posid" : "0001",
"Erdat" : null,
"Erzet" : "PT00H00M00S",
"Ernam" : "",
"Netwr" : "0.00",
"Waerk" : "",
"Shipto" : "",
"Mwskz" : "",
"Vatrate" : "0.00",
"VText1L" : "",
"VText1E" : "",
"Pmnt" : "",
"Text1L" : "",
"Text1E" : "",
"Kschl" : "",
"Kpein" : 0
};


pool.query('select * from zin_tables' , (err,tableRes)=>{
    var tables = tableRes.rows;
    tables.forEach(function(table){
        var query = 'select * from '+table.table_name;
        console.log(query);
        pool.query(query, (err,res)=>{
            var _once = false;
            var json = [];
            for(var i=0;i<res.rows.length;i++){
                var keys = Object.keys(res.rows[i]);
                var jsonData = {};
                keys.forEach(function(element){
                    if(element.toUpperCase() != 'STATUS' && element.toUpperCase() != 'ID' && element.toUpperCase()!='MANDT'){
                        jsonData[serviceCase(element)] = new String(res.rows[i][element]);
                    }
                });
                console.log(jsonData);

                console.log(table.table_name.toUpperCase());
                if(table.table_name.toUpperCase() == 'ZIN_ORDER_HEAD'){
                    var url = 'http://posuser:Initpass@172.32.213.171:8000/sap/opu/odata/sap/ZOT_POS_SRV/OrderHeadSet';
                    pushData(jsonData, url);
                }
                if(table.table_name.toUpperCase() == 'ZIN_ORDER_ITEM'){
                    var url = 'http://posuser:Initpass@172.32.213.171:8000/sap/opu/odata/sap/ZOT_POS_SRV/OrderItemSet';
                    pushData(jsonData, url);
                }
            }
        });
    });
});


function pushData(sampleJSON, url){
    // Set the headers
    var username = "posuser";
    var password = "Initpass";	
    var headers = {
    "Authorization": "Basic " + new Buffer(username + ":" + password).toString("base64"),
    "Content-Type":"application/json",
    "Accept":"application/json",
    "x-csrf-token":"Fetch" // get CSRF Token for post or update
    };
    // if you are using session vars
    if (request.headers && request.headers.cookie) {
    headers['Cookie'] = request.headers.cookie;
    } else {
    request.headers = {}; // initialize as object
    }
    var options = {
        url: url,
        method: 'GET',
        headers: headers,
        qs: {'sap-client': '300', 'format': 'json'}
    }

    request(options, function (error, response, body) {

        if (!error && response.statusCode == 200) {
            if (response.headers["set-cookie"]) { 
                request.headers.cookie = response.headers["set-cookie"]; // store Cookie in session
                headers['Cookie'] = request.headers.cookie; // set in headers for the next call. I guess this is the part you missed
            }
            if (response.headers['x-csrf-token']) {
                request.headers.csrf = response.headers['x-csrf-token']; // store csrf-token in session
                headers['x-csrf-token'] = request.headers.csrf; // set in headers for the next call
            }

            console.log( request.headers.csrf);
            var postOptions = {
                url: url,
                method: 'POST',
                headers: headers,
                json: sampleJSON
            };

            request.post(url, postOptions,  function (error, response, body){
                console.log(response.statusCode);
            });
        }
    });
}
