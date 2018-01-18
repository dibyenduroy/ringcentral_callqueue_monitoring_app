'use strict';

const http = require('http');
const mysql = require('mysql');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'welcome',
  database: 'RingCentral',
  charset: 'utf8'
});

//html string that will be send to browser
//var reo ='<html><head><title>Node.js MySQL Select</title></head><body><h1>Node.js MySQL Select</h1>{${table}}</body></html>';



//sets and returns html table with results from sql select
//Receives sql query and callback function to return the table
function setResHtml(sql, cb){
    pool.getConnection((err, con)=>{
      if(err) throw err;
  
      con.query(sql, (err, res, cols)=>{
        if(err) throw err;
  
        var table =''; //to store html table
        // Creating another Table for Calls on Hold By Queue Name

        var table2 ='';

        var combinedtable ='';
  
        //create html table with data from res.
        for(var i=0; i<res.length; i++){
          table +='<tr><td>'+ (i+1) +'</td><td>'+ res[i].sequence +'</td><td>'+ res[i].status +'</td><td>'+ res[i].eventTime +'</td><td>'+ res[i].to_PhoneNumber +'</td><td>'+ res[i].from_phoneNumber +'</td><td>'+ res[i].queue_name+'</td></tr>';
        }
        table ='<table border="1"><tr><th>Nr.</th><th>Sequence</th><th>Status</th><th>EventTime</th><th>ToPhoneNumber</th><th>FromPhoneNumber</th><th>QueueName</th></tr>'+ table +'</table>';

        //create html table2 with data from res.
        for(var i=0; i<res.length; i++){
          table2 +='<tr><td>'+ (i+1) +'</td><td>' + res[i].Inprogress + '</td><td>' +res[i].Calls_On_Hold +'</td><td>' + res[i].queue_name + '</td><td>'+res[i].Total_Hold_Time + '</td></tr>';
        }
        table2 ='<table border="1"><tr><th>Nr.</th><th>Count of InProgress Calls </th><th>Current Calls on Hold</th><th>queue_name</th><th>Total Hold Time on the Queue</th>'+ table2 +'</table><BR>';
        
        combinedtable = table2 + table;
  
        con.release(); //Done with mysql connection
  
        return cb(table2);
      });
    });
  }

  
  
//create the server for browser access
const server = http.createServer((req, res)=>{
       
    setTimeout(function(){
        console.log('Calling this Function eveny second');
        let sql ='SELECT sequence, status,eventTime,to_PhoneNumber,from_phoneNumber,queue_name FROM ringcentral.rc_csn';
        let sql2 ='select (select count(1) InProgressCount from RingCentral.rc_csn a where status="Answered" and not exists (select * from RingCentral.rc_csn b where b.sequence> a.sequence and a.sessionid=b.sessionId)) Inprogress,count(1) Calls_On_Hold ,a.queue_name, (select SUM(TIME_TO_SEC(TIMEDIFF(replace(replace(a.eventTime,"T"," "),"Z",""),replace(replace(h.eventTime,"T"," "),"Z",""))) ) Hold_Time_In_Seconds from RingCentral.rc_csn h, RingCentral.rc_csn a where h.status = "Hold"  and a.status="Answered" and h.sessionid=a.sessionid  and h.sequence< a.sequence and a.sequence - h.sequence=1 GROUP BY a.queue_name) Total_Hold_Time from RingCentral.rc_csn a where status="Hold"  and not exists (select * from RingCentral.rc_csn b where b.sequence> a.sequence and a.sessionid=b.sessionId) GROUP BY a.queue_name';
        setResHtml(sql2, resql=>{
            //console.log(resql);
            var reo ='<html><head><meta http-equiv="refresh" content="1"><title>Call Session Notifications</title></head><body><img src="https://www.ringcentral.com/content/dam/ringcentral/images/whyringcentral/ringcentral_logo.png" height="100" width="150"><h1>Call Queue Monitoring App</h1>{${combinedtable}}</body></html>';
            reo = reo.replace('{${combinedtable}}', resql);
            res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
            res.write(reo, 'utf-8');
            res.end();    
          });
      }, 1000);
  });

  

  

  server.listen(8080, ()=>{
    console.log('Server running at //localhost:8080/');
  });