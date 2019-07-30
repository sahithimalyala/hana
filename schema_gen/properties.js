var schemaQuery = ` SELECT 
c.TABLE_NAME TABLE_NAME,string_agg(
'{"COLUMN_NAME" : "' || COLUMN_NAME ||'",'||char(10)||
'"DATA_TYPE_NAME" : "'||DATA_TYPE_NAME||'",'||char(10)||
'"LENGTH" : "'||LENGTH||'",'||char(10)||
'"IS_NULLABLE" : "'||IS_NULLABLE||'",'||char(10)||
'"POSITION" : "'||POSITION||'"'||char(10)||
'}',','||char(10)) COLS
FROM SYS.COLUMNS c, SYS.TABLES t WHERE t.TABLE_NAME = c.TABLE_NAME 
and (t.TABLE_NAME LIKE 'ZIN%' OR t.TABLE_NAME LIKE 'ZOT%')  GROUP BY c.TABLE_NAME;
 `;


var schemaGenerationTemplate = `
#foreach( $table in $tables )
drop table if exists $table.TABLE_NAME;
create table $table.TABLE_NAME (
    ID BIGSERIAL PRIMARY KEY,
    #foreach($col in $table.COLUMNS)
    $col.COLUMN_NAME #if($col.DATA_TYPE_NAME=='NVARCHAR') CHARACTER VARYING($col.LENGTH)#elseif($col.DATA_TYPE_NAME=='DECIMAL')  DOUBLE PRECISION#else $col.DATA_TYPE_NAME($col.LENGTH)#end #if($col.IS_NULLABLE=='FALSE') NOT NULL#else NULL #end      
    #if( $foreach.hasNext ),\n#end
    #end
);
#end`;


//Some important properties for synching
//Store ID information that is captured during installation
var werks = 1110;



