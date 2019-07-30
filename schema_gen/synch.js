var hdb = require('hdb');
var fs = require('fs');
var Velocity = require('velocityjs');
var Compile = Velocity.Compile;
var pg = require('pg');



var reload = true;

var totalTables = 0;
var totalCompleted = 0;

var client = hdb.createClient({
    host: '172.32.213.171',
    port: 30415,
    user: 'SAPABAP1',
    password: 'Hana1234'
})

eval(fs.readFileSync('synchJSON.js') + '');
eval(fs.readFileSync('properties.js') + '');

var schemaJSON = JSON.parse(fs.readFileSync('schema.json'));

client.connect(function (err) {
    if (err) {
        return console.error('Connect error', err);
    }

    if (err) throw err;
    var tableList = tableTemplateJSON;
    var tables = tableList.tables;
    totalTables = tables.length;
    tables.forEach(table => {
        var tableName = table.tableName;
        var query = table.templateQuery;
        //console.log(query);
        var selectQuery = 'select * from ' + tableName +' where 1=1';

        schemaJSON.forEach(table => {
            if(table.TABLE_NAME == tableName){
                table.COLUMNS.forEach(column => {
                    if(column.COLUMN_NAME == 'WERKS'){
                        selectQuery = selectQuery+` AND (WERKS ='' OR WERKS = '`+werks+`')`;
                    }
                });
            }
        });

        synch(tableName, query);
    });

});

function synch(tableName, template) {
    const pool = new pg.Pool({
        host: '35.244.28.238', // server name or IP address;
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: 'postgres'
    });


    var Compile = Velocity.Compile;
    var context = {};
    var macros = {};
    var query = 'SELECT * FROM ' + tableName + ';';
    var selectQuery = 'select * from ' + tableName +' where 1=1';

        schemaJSON.forEach(table => {
            if(table.TABLE_NAME == tableName){
                table.COLUMNS.forEach(column => {
                    if(column.COLUMN_NAME == 'WERKS'){
                        selectQuery = selectQuery+` AND (WERKS ='' OR WERKS = '`+werks+`')`;
                    }
                });
            }
        });

        query = selectQuery;

    var asts = Velocity.parse(template);

    //console.log(asts);

    client.exec(query, function (err, rows) {
        if (err) {
            return console.error('Execute error:', err);
        }

        if (rows.length > 0) {
            context.tables = rows;
            var asts = Velocity.parse(template);
           // console.log(template);
            var a = (new Compile(asts)).render(context, macros);
            a = a.substr(0, a.length - 1);
            //console.log(a);
            if (reload) {
                a = 'truncate ' + tableName + ';' + a;
            }
            // select and return user name from id:
            pool.query(a, (err, res) => {
                if(err!=undefined) {
                    console.log(err);
                    console.log("Error Synching table "+tableName);
                }else{
                    console.log("Synched the table "+tableName+" is completed, total rows synched: "+rows.length);
                }
            });
        }else{
            console.log("Synched the table "+tableName+" is completed, total rows synched: "+rows.length);
        }
        pool.end();
        totalCompleted = totalCompleted + 1;
    });
}


function terminate() {
    if (totalCompleted == totalTables) {
        client.end();
        process.exit(1);
    }
}

setTimeout(terminate, 10000);