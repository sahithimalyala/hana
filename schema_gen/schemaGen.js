var hdb = require('hdb');
var fs = require('fs');
var Velocity = require('velocityjs');
var Compile = Velocity.Compile;
var pg = require('pg');

var pool = new pg.Pool({
  host: '172.32.28.238', // server name or IP address;
  port: 5432,
  database: 'new_schema',
  user: 'postgres',
  password: 'postgres'
});

eval(fs.readFileSync('properties.js') + '');

var client = hdb.createClient({
  host: '172.32.213.171',
  port: 30415,
  user: 'SYSTEM',
  password: 'Hana1234'
});

var result_json = '[';
client.on('error', function (err) {
  console.error('Network connection error', err);
});

client.connect(function (err) {
  if (err) {
    return console.error('Connect error', err);
  }

  //If connection is successful execute the query to retrieve the schema information
  client.exec(schemaQuery, function (err, rows) {
    //Post execution, close the connection and process the output
    client.end();

    if (err) {
      return console.error('Execute error:', err);
    }
    //console.log('No of rows coming from HANA ' + rows.length);
    for (i = 0; i < rows.length; i++) {
      result_json = result_json + '{ "TABLE_NAME" : "' + rows[i].TABLE_NAME + '",\n' + '"COLUMNS" : [' + rows[i].COLS + ']}';
      if (i != rows.length - 1) {
        result_json = result_json + ',\n';
      }
    }
    

    result_json = result_json + ']';
    console.log(result_json);

    var finalObject = JSON.parse(result_json);

    fs.writeFile('schema.json', JSON.stringify(finalObject), function(err){
      if (err) throw err;
      console.log('Synch JSON file created');
    });

    var context = {};
    var macros = {};
    context.tables = finalObject;
    var asts = Velocity.parse(schemaGenerationTemplate);
    var a = (new Compile(asts)).render(context, macros);
    console.log(a);
    
    pool.query(a, (err,res)=>{
      console.log(err,res);
    });

    pool.end();

    var synchJSON = {tables:[]};

    finalObject.forEach(table => {
      var tableJSON = {};
      var tableName = table.TABLE_NAME;
      tableJSON.tableName = tableName;
      var insertQuery = "INSERT INTO "+tableName+"(";
      var colNames = "";
      var vals = "";
      var columns = table.COLUMNS;
      columns.forEach(column => {
        colNames = colNames+column.COLUMN_NAME+",";
        if(column.DATA_TYPE_NAME=='DECIMAL'){
          vals = vals + `$row.`+column.COLUMN_NAME+`,`;
        }else{
          vals = vals + `'$row.`+column.COLUMN_NAME+`',`;
        }
      });
      colNames =colNames.substr(0, colNames.length-1)+ ") VALUES ";
      vals = '#foreach( $row in $tables ) ('+vals.substr(0, vals.length-1)+"),#end";
      insertQuery = insertQuery+colNames+vals;
      //console.log(insertQuery);
      tableJSON.templateQuery = insertQuery;
      synchJSON.tables.push(tableJSON);
    });

    //console.log(synchJSON);

    fs.writeFile('synchJSON.js', "var tableTemplateJSON = "+JSON.stringify(synchJSON)+";", function(err){
      if (err) throw err;
      console.log('Synch Queries Created');
    });
  });
});