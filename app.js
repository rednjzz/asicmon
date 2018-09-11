const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const express_logger = require('morgan');
const header = require('./header');
const ejs = require('ejs');


const index = require('./routes/index');
const routeMiners = require('./routes/miners');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public/images', 'mining.png')));
app.use(express_logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req,res,next){

  req.json = {
      "title"         : config.title,
      "animation"     : config.animation,
      "header"        : config.header ? config.header : config.title,
      "miners"        : miners.json,
      "refresh"       : config.web_refresh,
      "tolerance"     : config.tolerance,
      "temperature"   : config.temperature,
      "hashrates"     : config.hashrates,
      "updated"       : moment().format("YYYY-MM-DD HH:mm:ss")
  };
  next();
});

app.use('/', index);
app.use('/miners', routeMiners);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res) {
  // render the error page
  res.status(err.status || 500);
  res.render('error', {
      message: err.message,
      error:{}
  });
});

module.exports = app;

/* --------- Booting ---------- */
//const config = require('/home/tg/config.json');
const config = require('./config.json');
const log4js = require('log4js');
const logger = log4js.getLogger();
logger.level = (config.log_level ? config.log_level : 'INFO');
logger.warn('app: booting');

/* --------- Requester ---------------*/
const moment = require('moment');
require("moment-duration-format");
const net = require('net');

let miners = [];
miners.json = [];

logger.info('config: ' + config.miners.length + ' rig(s) configured');

config.miners.forEach(function(item, i){
   logger.trace(item.name + ': config[' + i + ']');
   //settings
    let m = miners[i] = {};
    let c = config.miners[i];
    let cmd = ['pools','summary','stats'];

    m.name = c.name;
    m.host = c.host;
    m.port = c.port;
    m.poll = config.miner_poll;
    m.timeout = config.miner_timeout;
    m.data = '';

    // stats
    m.reqCnt = 0;
    m.rspCnt = 0;

    // it was never seen and never found good yet
    c.last_seen = null;
    c.last_good = null;

    cmd.forEach(function(item,i){

    });
    m.socket = new net.Socket()

        .on('connect', function(){
            logger.info(m.name + ': connected to ' + m.socket.remoteAddress + ':' + m.socket.remotePort);
            ++m.reqCnt;
            logger.trace(m.name + ' req[' + m.reqCnt + ']: ');
            m.socket.write(JSON.stringify({"command":"summary+pools+stats"}));
            m.socket.setTimeout(m.timeout);
            c.last_seen = moment().format("YYYY-MM-DD HH:mm:ss");

        })
        .on('data', function(data) {
                m.data += data.toString().replace(/}{/g, '},{').replace(/\x00/g, '');
        })
        .on('close', function() {

            if(m.data) {
                let minerData;
                let d;
                try{
                    minerData = JSON.parse(m.data);
                }catch(err){
                    console.log("Error Message:",err);
                    minerData = header;
                }

                d = bmminerAPIParse(minerData);
                //console.log(countACS(d.chain_acs));
                //console.log(m.data);

                m.data = '';
                miners.json[i] = {
                    "name": m.name,
                    "host": hostname(),
                    "user": d.User,
                    "uptime": moment.duration(parseInt(d.Elapsed), 'second').format('d [days,] hh:mm'),
                    "hashrate_5s": d.GHS_5s,
                    "hashrate_av": d.GHS_av,
                    "chain_acs": countACS(d.chain_acs),
                    "temp1": d.temp1,
                    "temp2": d.temp2,
                    "pools": d.URL,
                    "miner_type" : d.Type,
                    "target_hash": d.chain_rateideal,
                    "comments": c.comments,
                    "state" : minerState(d),
                    "offline": c.offline,
                    "error": null
                };
                //console.log(miners.json[i].temp1);
            }

            logger.info(m.name + ': connection closed');
            setTimeout(poll, m.poll);
        })
        .on('timeout', function() {
            logger.warn(m.name + ': response timeout');
            m.socket.destroy();
            miners.json[i] = {
                "name"       : m.name,
                "host"       : hostname(),
                "uptime"     : "",
                "hashrate_5s": "",
                "hashrate_av": "",
                "chain_acs"  : "",
                "temp1"      : "",
                "temp2"      : "",
                "pools"      : "",
                "target_hash": "",
                "miner_type" : "",
                "comments"   : c.comments,
                "state"      : "timeout",
                "offline"    : c.offline,
                "warning"    : null,
                "error"      : 'Error: no response',
                "last_seen"  : c.last_seen ? c.last_seen : 'never'
            };
        })
        .on('error', function(e) {
            logger.error(m.name + ': socket error: ' + e.message);
            miners.json[i] = {
                "name"       : m.name,
                "host"       : hostname(),
                "uptime"     : "",
                "hashrate_5s": "",
                "hashrate_av": "",
                "chain_acs"  : "",
                "temp1"      : "",
                "temp2"      : "",
                "pools"      : "",
                "target_hash": "",
                "miner_type" : "",
                "comments"   : c.comments,
                "state"      : "error",
                "offline"    : c.offline,
                "warning"    : null,
                "error"      : e.name + ': ' + e.message,
                "last_seen"  : c.last_seen ? c.last_seen : 'never'
            };
        })
    ;

    function poll() {
        m.socket.connect(m.port, m.host);
    }
    function hostname() {
        return c.hostname ? c.hostname : (m.host + ':' + m.port);
    }

    if ((typeof c.offline === 'undefined') || !c.offline) {
        poll();
    } else {
        miners.json[i] = {
            "name"       : m.name,
            "host"       : hostname(),
            "uptime"     : "",
            "hashrate_5s": "",
            "hashrate_av": "",
            "chain_acs"  : "",
            "temp1"      : "",
            "temp2"      : "",
            "pools"      : "",
            "target_hash": "",
            "miner_type" : "",
            "comments"   : c.comments,
            "state"      : "offline",
            "offline"    : c.offline,
            "error"      : null
        };
    }
});

function bmminerAPIParse(data){
    let minerInfo = {chain_acs:[]};
    minerInfo.Elapsed = data.summary[0].SUMMARY[0]['Elapsed'];
    minerInfo.GHS_5s = data.summary[0].SUMMARY[0]['GHS 5s'];
    minerInfo.GHS_av = data.summary[0].SUMMARY[0]['GHS av'];

    minerInfo.URL = data.pools[0].POOLS[0]['URL'];
    minerInfo.User = (data.pools[0].POOLS[0]['User']).substring(0,20);
    minerInfo.LastShareTime = data.pools[0].POOLS[0]['Last Share Time'];

    minerInfo.Type = data.stats[0].STATS[0]['Type'];
    minerInfo.temp_max = data.stats[0].STATS[1]['temp_max'];
    switch(minerInfo.Type){
        case "Antminer S9":
            minerInfo.Type = 'S9';

            minerInfo.temp1_1 = data.stats[0].STATS[1]['temp6'];
            minerInfo.temp1_2 = data.stats[0].STATS[1]['temp7'];
            minerInfo.temp1_3 = data.stats[0].STATS[1]['temp8'];
            minerInfo.temp1 = minerInfo.temp1_1 + ';' + minerInfo.temp1_2 + ';' + minerInfo.temp1_3;

            minerInfo.temp2_1 = data.stats[0].STATS[1]['temp2_6'];
            minerInfo.temp2_2 = data.stats[0].STATS[1]['temp2_7'];
            minerInfo.temp2_3 = data.stats[0].STATS[1]['temp2_8'];
            minerInfo.temp2 = minerInfo.temp2_1 + ';' + minerInfo.temp2_2 + ';' + minerInfo.temp2_3;

            minerInfo.chain_acn1 = data.stats[0].STATS[1]['chain_acn6'];
            minerInfo.chain_acn2 = data.stats[0].STATS[1]['chain_acn7'];
            minerInfo.chain_acn3 = data.stats[0].STATS[1]['chain_acn8'];

            minerInfo.chain_acs[0] = data.stats[0].STATS[1]['chain_acs6'];
            minerInfo.chain_acs[1] = data.stats[0].STATS[1]['chain_acs7'];
            minerInfo.chain_acs[2] = data.stats[0].STATS[1]['chain_acs8'];

            minerInfo.chain_rateideal1 = data.stats[0].STATS[1]['chain_rateideal6'];
            minerInfo.chain_rateideal2 = data.stats[0].STATS[1]['chain_rateideal7'];
            minerInfo.chain_rateideal3 = data.stats[0].STATS[1]['chain_rateideal8'];
            minerInfo.chain_rateideal = 13000;

            minerInfo.chain_rate1 = data.stats[0].STATS[1]['chain_rate6'];
            minerInfo.chain_rate2 = data.stats[0].STATS[1]['chain_rate7'];
            minerInfo.chain_rate3 = data.stats[0].STATS[1]['chain_rate8'];
            minerInfo.fan1 = data.stats[0].STATS[1]['fan3'];
            minerInfo.fan2 = data.stats[0].STATS[1]['fan6'];

            break;
        case "Antminer D3 Blissz v2.06 beta":
            minerInfo.Type = 'D3';

            minerInfo.temp1_1 = data.stats[0].STATS[1]['temp1'];
            minerInfo.temp1_2 = data.stats[0].STATS[1]['temp2'];
            minerInfo.temp1_3 = data.stats[0].STATS[1]['temp3'];
            minerInfo.temp1 = minerInfo.temp1_1 + ';' + minerInfo.temp1_2 + ';' + minerInfo.temp1_3;

            minerInfo.temp2_1 = data.stats[0].STATS[1]['temp2_1'];
            minerInfo.temp2_2 = data.stats[0].STATS[1]['temp2_2'];
            minerInfo.temp2_3 = data.stats[0].STATS[1]['temp2_3'];
            minerInfo.temp2 = minerInfo.temp2_1 + ';' + minerInfo.temp2_2 + ';' + minerInfo.temp2_3;

            minerInfo.chain_acn1 = data.stats[0].STATS[1]['chain_acn1'];
            minerInfo.chain_acn2 = data.stats[0].STATS[1]['chain_acn2'];
            minerInfo.chain_acn3 = data.stats[0].STATS[1]['chain_acn3'];

            minerInfo.chain_acs[0] = data.stats[0].STATS[1]['chain_acs1'];
            minerInfo.chain_acs[1] = data.stats[0].STATS[1]['chain_acs2'];
            minerInfo.chain_acs[2] = data.stats[0].STATS[1]['chain_acs3'];


            minerInfo.chain_rateideal1 = "4700";
            minerInfo.chain_rateideal2 = "4700";
            minerInfo.chain_rateideal3 = "4700";
            minerInfo.chain_rateideal = 14000;

            minerInfo.chain_rate1 = data.stats[0].STATS[1]['chain_rate1'];
            minerInfo.chain_rate2 = data.stats[0].STATS[1]['chain_rate2'];
            minerInfo.chain_rate3 = data.stats[0].STATS[1]['chain_rate3'];
            minerInfo.fan1 = data.stats[0].STATS[1]['fan1'];
            minerInfo.fan2 = data.stats[0].STATS[1]['fan2'];
            break;

        case "Antminer D3":
            minerInfo.Type = 'D3';

            minerInfo.temp1_1 = data.stats[0].STATS[1]['temp1'];
            minerInfo.temp1_2 = data.stats[0].STATS[1]['temp2'];
            minerInfo.temp1_3 = data.stats[0].STATS[1]['temp3'];
            minerInfo.temp1 = minerInfo.temp1_1 + ';' + minerInfo.temp1_2 + ';' + minerInfo.temp1_3;

            minerInfo.temp2_1 = data.stats[0].STATS[1]['temp2_1'];
            minerInfo.temp2_2 = data.stats[0].STATS[1]['temp2_2'];
            minerInfo.temp2_3 = data.stats[0].STATS[1]['temp2_3'];
            minerInfo.temp2 = minerInfo.temp2_1 + ';' + minerInfo.temp2_2 + ';' + minerInfo.temp2_3;

            minerInfo.chain_acn1 = data.stats[0].STATS[1]['chain_acn1'];
            minerInfo.chain_acn2 = data.stats[0].STATS[1]['chain_acn2'];
            minerInfo.chain_acn3 = data.stats[0].STATS[1]['chain_acn3'];

            minerInfo.chain_acs[0] = data.stats[0].STATS[1]['chain_acs1'];
            minerInfo.chain_acs[1] = data.stats[0].STATS[1]['chain_acs2'];
            minerInfo.chain_acs[2] = data.stats[0].STATS[1]['chain_acs3'];


            minerInfo.chain_rateideal1 = "6300";
            minerInfo.chain_rateideal2 = "6300";
            minerInfo.chain_rateideal3 = "6300";
            minerInfo.chain_rateideal = 18000;

            minerInfo.chain_rate1 = data.stats[0].STATS[1]['chain_rate1'];
            minerInfo.chain_rate2 = data.stats[0].STATS[1]['chain_rate2'];
            minerInfo.chain_rate3 = data.stats[0].STATS[1]['chain_rate3'];
            minerInfo.fan1 = data.stats[0].STATS[1]['fan1'];
            minerInfo.fan2 = data.stats[0].STATS[1]['fan2'];
            break;
        case "Antminer L3+ Blissz v1.02" :
        case "Antminer L3+" :
        case "Antminer L3++" :
            minerInfo.Type = 'L3+';

            minerInfo.temp1_1 = data.stats[0].STATS[1]['temp1'];
            minerInfo.temp1_2 = data.stats[0].STATS[1]['temp2'];
            minerInfo.temp1_3 = data.stats[0].STATS[1]['temp3'];
            minerInfo.temp1_4 = data.stats[0].STATS[1]['temp3'];
            minerInfo.temp1 = minerInfo.temp1_1 + ';' + minerInfo.temp1_2 + ';'
                + minerInfo.temp1_3 + ';' + minerInfo.temp1_4;

            minerInfo.temp2_1 = data.stats[0].STATS[1]['temp2_1'];
            minerInfo.temp2_2 = data.stats[0].STATS[1]['temp2_2'];
            minerInfo.temp2_3 = data.stats[0].STATS[1]['temp2_3'];
            minerInfo.temp2_4 = data.stats[0].STATS[1]['temp2_4'];
            minerInfo.temp2 = minerInfo.temp2_1 + ';' + minerInfo.temp2_2
                + ';' + minerInfo.temp2_3 + ';' + minerInfo.temp2_4;


            minerInfo.chain_acn1 = data.stats[0].STATS[1]['chain_acn1'];
            minerInfo.chain_acn2 = data.stats[0].STATS[1]['chain_acn2'];
            minerInfo.chain_acn3 = data.stats[0].STATS[1]['chain_acn3'];
            minerInfo.chain_acn4 = data.stats[0].STATS[1]['chain_acn4'];

            minerInfo.chain_acs[0] = data.stats[0].STATS[1]['chain_acs1'];
            minerInfo.chain_acs[1] = data.stats[0].STATS[1]['chain_acs2'];
            minerInfo.chain_acs[2] = data.stats[0].STATS[1]['chain_acs3'];
            minerInfo.chain_acs[3] = data.stats[0].STATS[1]['chain_acs4'];

            minerInfo.chain_rateideal1 = "128";
            minerInfo.chain_rateideal2 = "128";
            minerInfo.chain_rateideal3 = "128";
            minerInfo.chain_rateideal4 = "128";
            minerInfo.chain_rateideal = 500;

            minerInfo.chain_rate1 = data.stats[0].STATS[1]['chain_rate1'];
            minerInfo.chain_rate2 = data.stats[0].STATS[1]['chain_rate2'];
            minerInfo.chain_rate3 = data.stats[0].STATS[1]['chain_rate3'];
            minerInfo.chain_rate3 = data.stats[0].STATS[1]['chain_rate4'];
            minerInfo.fan1 = data.stats[0].STATS[1]['fan1'];
            minerInfo.fan2 = data.stats[0].STATS[1]['fan2'];
            break;

        case "Antminer A3":
            minerInfo.Type = 'A3';

            minerInfo.temp1_1 = data.stats[0].STATS[1]['temp1'];
            minerInfo.temp1_2 = data.stats[0].STATS[1]['temp2'];
            minerInfo.temp1_3 = data.stats[0].STATS[1]['temp3'];
            minerInfo.temp1 = minerInfo.temp1_1 + ';' + minerInfo.temp1_2 + ';' + minerInfo.temp1_3;

            minerInfo.temp2_1 = data.stats[0].STATS[1]['temp2_1'];
            minerInfo.temp2_2 = data.stats[0].STATS[1]['temp2_2'];
            minerInfo.temp2_3 = data.stats[0].STATS[1]['temp2_3'];
            minerInfo.temp2 = minerInfo.temp2_1 + ';' + minerInfo.temp2_2 + ';' + minerInfo.temp2_3;

            minerInfo.chain_acn1 = data.stats[0].STATS[1]['chain_acn1'];
            minerInfo.chain_acn2 = data.stats[0].STATS[1]['chain_acn2'];
            minerInfo.chain_acn3 = data.stats[0].STATS[1]['chain_acn3'];

            minerInfo.chain_acs[0] = data.stats[0].STATS[1]['chain_acs1'];
            minerInfo.chain_acs[1] = data.stats[0].STATS[1]['chain_acs2'];
            minerInfo.chain_acs[2] = data.stats[0].STATS[1]['chain_acs3'];

            minerInfo.chain_rateideal1 = "266";
            minerInfo.chain_rateideal2 = "266";
            minerInfo.chain_rateideal3 = "266";
            minerInfo.chain_rateideal = 800;

            minerInfo.chain_rate1 = data.stats[0].STATS[1]['chain_rate1'];
            minerInfo.chain_rate2 = data.stats[0].STATS[1]['chain_rate2'];
            minerInfo.chain_rate3 = data.stats[0].STATS[1]['chain_rate3'];
            minerInfo.fan1 = data.stats[0].STATS[1]['fan1'];
            minerInfo.fan2 = data.stats[0].STATS[1]['fan2'];
            break;
        case "Antminer B3":
            minerInfo.Type = 'B3';

            minerInfo.temp1_1 = data.stats[0].STATS[1]['temp2'];
            minerInfo.temp1_2 = data.stats[0].STATS[1]['temp3'];
            minerInfo.temp1_3 = data.stats[0].STATS[1]['temp4'];
            minerInfo.temp1 = minerInfo.temp1_1 + ';' + minerInfo.temp1_2 + ';' + minerInfo.temp1_3;

            minerInfo.temp2_1 = data.stats[0].STATS[1]['temp2_2'];
            minerInfo.temp2_2 = data.stats[0].STATS[1]['temp2_3'];
            minerInfo.temp2_3 = data.stats[0].STATS[1]['temp2_4'];
            minerInfo.temp2 = minerInfo.temp2_1 + ';' + minerInfo.temp2_2 + ';' + minerInfo.temp2_3;

            minerInfo.chain_acn1 = data.stats[0].STATS[1]['chain_acn1'];
            minerInfo.chain_acn2 = data.stats[0].STATS[1]['chain_acn2'];
            minerInfo.chain_acn3 = data.stats[0].STATS[1]['chain_acn3'];

            minerInfo.chain_acs[0] = data.stats[0].STATS[1]['chain_acs2'];
            minerInfo.chain_acs[1] = data.stats[0].STATS[1]['chain_acs3'];
            minerInfo.chain_acs[2] = data.stats[0].STATS[1]['chain_acs4'];
            minerInfo.chain_acs[3] = data.stats[0].STATS[1]['chain_acs9'];
            minerInfo.chain_acs[4] = data.stats[0].STATS[1]['chain_acs11'];
            minerInfo.chain_acs[5] = data.stats[0].STATS[1]['chain_acs13'];

            minerInfo.chain_rateideal1 = "260";
            minerInfo.chain_rateideal2 = "260";
            minerInfo.chain_rateideal3 = "260";
            minerInfo.chain_rateideal = 780;

            minerInfo.chain_rate1 = data.stats[0].STATS[1]['chain_rate2'];
            minerInfo.chain_rate2 = data.stats[0].STATS[1]['chain_rate3'];
            minerInfo.chain_rate3 = data.stats[0].STATS[1]['chain_rate4'];
            minerInfo.fan1 = data.stats[0].STATS[1]['fan3'];
            minerInfo.fan2 = data.stats[0].STATS[1]['fan6'];
            break;

        default:
            minerInfo.Type = 'XXX';
            minerInfo.temp1_1 = data.stats[0].STATS[1]['temp1'];
            minerInfo.temp1_2 = data.stats[0].STATS[1]['temp2'];
            minerInfo.temp1_3 = data.stats[0].STATS[1]['temp3'];
            minerInfo.temp1 = '0;0;0';

            minerInfo.temp2_1 = data.stats[0].STATS[1]['temp2_1'];
            minerInfo.temp2_2 = data.stats[0].STATS[1]['temp2_2'];
            minerInfo.temp2_3 = data.stats[0].STATS[1]['temp2_3'];
            minerInfo.temp2 = '0;0;0';

            minerInfo.chain_acn1 = data.stats[0].STATS[1]['chain_acn1'];
            minerInfo.chain_acn2 = data.stats[0].STATS[1]['chain_acn2'];
            minerInfo.chain_acn3 = data.stats[0].STATS[1]['chain_acn3'];

            minerInfo.chain_acs[0] = data.stats[0].STATS[1]['chain_acs1'];
            minerInfo.chain_acs[1] = data.stats[0].STATS[1]['chain_acs2'];
            minerInfo.chain_acs[2] = data.stats[0].STATS[1]['chain_acs3'];

            minerInfo.chain_rateideal1 = "0";
            minerInfo.chain_rateideal2 = "0";
            minerInfo.chain_rateideal3 = "0";
            minerInfo.chain_rateideal = 0;

            minerInfo.chain_rate1 = data.stats[0].STATS[1]['chain_rate1'];
            minerInfo.chain_rate2 = data.stats[0].STATS[1]['chain_rate2'];
            minerInfo.chain_rate3 = data.stats[0].STATS[1]['chain_rate3'];
            minerInfo.fan1 = data.stats[0].STATS[1]['fan1'];
            minerInfo.fan2 = data.stats[0].STATS[1]['fan2'];
    }

    return minerInfo;
}

function minerState(minerInfo){
    let state;
    if (minerInfo.GHS_5s < 1 || minerInfo.GHS_av < 1 ){
        state = 'zerohash';
    }
    else if((minerInfo.GHS_5s < minerInfo.chain_rateideal *0.85) ||
                      (minerInfo.GHS_av < minerInfo.chain_rateideal* 0.85)){
        state = 'warning';
    }
    else{
        state = 'normal';
    }
    //console.log(minerInfo.GHS_5s);
    //console.log(minerInfo.chain_rateideal_total*0.85);
    return state;

}

function countACS(acs){
    let num_o = 0;
    //let num_x = 0;
    try{
        acs.forEach(function(item,i){
            num_o += (item.match(/o/g) || []).length;
            //num_x += (item.match(/x/g) || []).length;
        });
    }catch(err){
        console.log("ERROR:",err);
    }

    return num_o;// + '/' + (num_o + num_x);
}
