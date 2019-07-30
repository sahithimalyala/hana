var hdb = require('hdb');
var fs = require('fs');
var pg = require('pg');
var dateFormat = require('dateformat');

const https = require('http');
var schemaJSON = JSON.parse(fs.readFileSync('schema.json'));

var pool = new pg.Pool({    
    host: '172.32.28.238', // server name or IP address;
    port: 5432,
    database: 'new_schema',
    user: 'postgres',
    password: 'postgres'
  });

  var service_details = {};
  
  pool.query('select * from odata_details', (err,res)=>{
    var service_details = res.rows[0];
    var baseURL = 'http://'+service_details.username+':'+service_details.pwd+'@'+service_details.base_url+"/";
    
    pool.query('select * from services where active = 1', (err,res)=>{
        for(var i=0;i<res.rows.length;i++){
            var parameters = "?sap-client="+service_details.client+"&"+res.rows[i].filter_part+"&$format=json";
            var finalURL = baseURL+res.rows[i].service_name+parameters;
            console.log(finalURL);
            https.get(finalURL, (resp) => {
            let data = '';

            // A chunk of data has been recieved.
            resp.on('data', (chunk) => {
                data += chunk;
            });

            // The whole response has been received. Print out the result.
            resp.on('end', () => {
                var resultData = JSON.parse(data);
                var type = null;
                if(resultData.d!=null && resultData.d.results!=null){
                    type = resultData.d.results[0].__metadata.type;
                    type = type.split(".")[1];
                }
                if(type!=null){
                    var serviceData = "select * from services where service_name = '"+type+"Set'";
                    pool.query("select * from services where service_name = '"+type+"Set'", (err,res)=>{
                        var tableName = res.rows[0].table_name;
                        //var tableName = 'ZOT_MAT_PRC';
                        console.log(tableName);
                        var tSchema = {};
                        schemaJSON.forEach(function(tableSchema){
                            if(tableSchema.TABLE_NAME == tableName){
                                tSchema = tableSchema;
                            }
                        });
                        var keys = Object.keys(resultData.d.results[0]);
                        //Added code to construct insert query
                        var truncateQuery = "truncate "+tableName+";";
                        var insertQuery='insert into '+tableName+' (';
                        var cols=tSchema.COLUMNS;
                        //Lower Casing all Keys
                        var keysLower = [];
                        keys.forEach(function(key){
                            keysLower.push(key.toLowerCase());
                        }); 
                        
                        var colsLower = []
                        for (var i = 0; i < cols.length; i++) {
                            colsLower.push(cols[i].COLUMN_NAME.toLowerCase().replace('_',''));
                        }

                        keysLower.forEach(function(keyLower){
                            cols.forEach(function(col){
                                if(col.COLUMN_NAME.toLowerCase().replace('_','') == keyLower)
                                    insertQuery=insertQuery+col.COLUMN_NAME+',';
                            });
                        });

                        
                        var pos=insertQuery.lastIndexOf(',');
                        insertQuery=insertQuery.substring(0,pos)+') values(';
                        //Till here
                        resultData.d.results.forEach(function(result)
                        {
                            keys.forEach(function(key)
                            {
                                if(key != '__metadata'){
                                    var columns = tSchema.COLUMNS;
                                    var dataType = '';
                                    var colLength = '0';
                                    columns.forEach(function(col){
                                        if(col.COLUMN_NAME.toUpperCase() == key.toUpperCase()){
                                            dataType = col.DATA_TYPE_NAME;
                                            colLength = col.LENGTH;
                                        }
                                    });

                                    var value = result[key+'']+'';
                                    if(value.indexOf('Date')>0){
                                        var dateStr = value.replace('/','').replace('/','').trim();
                                        var dt = eval(dateStr);
                                        value = dateFormat(dt, "yyyymmdd");
                                    }else if(dataType == 'DECIMAL'){
                                        //dont do anything for now
                                    }
                                    insertQuery=insertQuery+"'"+value+"'"+',';
                                
                                }
                                
                            });
                            pos=insertQuery.lastIndexOf(',');
                            insertQuery=insertQuery.substring(0,pos)+'),('; 
                        });
                        pos=insertQuery.lastIndexOf(',(');
                        insertQuery=insertQuery.substring(0,pos) 
                        
                        var finalQuery = truncateQuery+insertQuery+";";
                        console.log(finalQuery);
                        pool.query(insertQuery, (err,res)=>{
                            console.log(err);
                        });
                    });
                }
            });

            }).on("error", (err) => {
             console.log("Error: " + finalURL);
            });
        }
    });
  });