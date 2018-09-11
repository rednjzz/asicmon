
// Default web refresh interval (may be changed with web_refresh config option)
let refresh = 5000;

// Default hashrate tolerance (+/- to target hashrate)
let tolerance = 0.1;
//const err_tolerance = 0.3;
const WARN_TOLERANCE = 0.15;

// GPU temperature monitoring threshold (zero disables monitoring)
let temperature1 = 70;
let temperature2 = 85;

// DOM Ready =============================================================

$(document).ready(function() {
    worker();

    tabs();
});

// Functions =============================================================

function worker() {

    function format_temps(temp1, temp2) {
        let tf = '';
        if ((temp1 !== 'undefined') && (temp2 !== undefined)){
            let t1 = temp1.split(';');
            let t2 = temp2.split(';');
            let tnum = t1.length;

            for (let i = 0; i < tnum; ++i) {
                let temp_1 = t1[i] + 'C';
                let temp_2 = t2[i] + 'C';
                if (t1[i] > temperature1 || t2[i] > temperature2) {
                    temp_1 = '<span class="error">' + temp_1 + '</span>';
                    temp_2 = '<span class="error">' + temp_2 + '</span>';
                }

                tf += ((i > 0) ? ' ' : '') + temp_1 + '/' + temp_2;
            }
        }else {
            tf = '##/##';
        }

        return tf;
    }
    function format_hashrates(hr,type) {
        let hashrates = '';
        switch(type){
            case "S9":
                hashrates = (Number(hr)/1000).toFixed(2) + '&nbsp;TH/s';
                break;
            case "D3":
                hashrates = (Number(hr)/1000).toFixed(2) + '&nbsp;GH/s';
                break;
            case "L3+":
                hashrates = Number(hr).toFixed(2) + '&nbsp;MH/s';
                break;
            case "A3":
                hashrates = Number(hr).toFixed(2) + '&nbsp;GH/s';
                break;
            case "B3":
                hashrates = Number(hr).toFixed(2) + '&nbsp;H/s';
                break;
            default:
                hashrates = 'No Type Matched'
        }
        return hashrates;
    }
    function format_acs(acs,type){
        let acsValue = '0/0';
        switch(type){
            case "S9":
                if(acs <= 126){
                    acsValue = '<span class="error">' + acs + '/' + '189'  + '</span>';
                }else if(acs < 189){
                    acsValue = '<span class="warning">' + acs + '/' + '189'  + '</span>';
                }else{
                    acsValue = '<span class="goodhash">' + acs + '/' + '189'  + '</span>';
                }

                break;
            case "D3":
                if(acs <= 120){
                    acsValue = '<span class="error">' + acs + '/' + '180'  + '</span>';
                }else if(acs < 180){
                    acsValue = '<span class="warning">' + acs + '/' + '180'  + '</span>';
                }else{
                    acsValue = '<span class="goodhash">' + acs + '/' + '180'  + '</span>';
                }
                break;
            case "L3+":
                if(acs <= 216){
                    acsValue = '<span class="error">' + acs + '/' + '288'  + '</span>';
                }else if(acs < 288){
                    acsValue = '<span class="warning">' + acs + '/' + '288'  + '</span>';
                }else{
                    acsValue = '<span class="goodhash">' + acs + '/' + '288'  + '</span>';
                }
                break;
            case "A3":
                if(acs <= 120){
                    acsValue = '<span class="error">' + acs + '/' + '180'  + '</span>';
                }else if(acs < 180){
                    acsValue = '<span class="warning">' + acs + '/' + '180'  + '</span>';
                }else{
                    acsValue = '<span class="goodhash">' + acs + '/' + '180'  + '</span>';
                }
                break;
            case "B3":
                if(acs <= 8){
                    acsValue = '<span class="error">' + acs + '/' + '12'  + '</span>';
                }else if(acs < 12){
                    acsValue = '<span class="warning">' + acs + '/' + '12'  + '</span>';
                }else{
                    acsValue = '<span class="goodhash">' + acs + '/' + '12'  + '</span>';
                }
                break;
            default:
                acsValue = 'No Type Matched'
        }
        return acsValue;
    }

    function makeTableContents(miner) {
        if (miner !== null) {
            let minerClass = ' class=' + miner.state;
            let span = 7;
            let spane = 7;
            let tableContent = '';

            switch (miner.state) {
                case 'error':
                    tableContent += '<tr' + minerClass + '>';
                    tableContent += '<td>' + miner.name + '</td>';
                    tableContent += '<td>' + miner.host + '</td>';
                    tableContent += '<td>' + miner.user + '</td>';
                    tableContent += '<td colspan="' + spane + ' ">' + miner.error + '<br>Last seen: ' + miner.last_seen + '</td>';
                    break;
                case 'warnning':
                    tableContent += '<tr' + minerClass + '>';
                    tableContent += '<td>' + miner.name + '</td>';
                    tableContent += '<td>' + miner.host + '</td>';
                    tableContent += '<td>' + miner.user + '</td>';
                    tableContent += '<td>' + miner.uptime + '</td>';
                    tableContent += '<td>' + miner.miner_type + '</td>';
                    tableContent += '<td>' + format_hashrates(miner.hashrate_5s, miner.miner_type) + '</td>';
                    tableContent += '<td>' + format_hashrates(miner.hashrate_av, miner.miner_type) + '</td>';
                    tableContent += '<td>' + format_acs(miner.chain_acs,miner.miner_type) + '</td>';
                    tableContent += '<td>' + format_temps(miner.temp1, miner.temp2) + '</td>';
                    tableContent += '<td>' + miner.pools + '</td>';
                    break;
                case 'offline':
                    tableContent += '<tr' + minerClass + '>';
                    tableContent += '<td>' + miner.name + '</td>';
                    tableContent += '<td>' + miner.host + '</td>';
                    tableContent += '<td colspan="' + span + ' ">' + miner.offline + '</td>';
                    break;
                default: //normal
                    tableContent += '<tr' + minerClass + '>';
                    tableContent += '<td>' + miner.name + '</td>';
                    tableContent += '<td>' + miner.host + '</td>';
                    tableContent += '<td>' + miner.user + '</td>';
                    tableContent += '<td>' + miner.uptime + '</td>';
                    tableContent += '<td>' + miner.miner_type + '</td>';
                    tableContent += '<td>' + format_hashrates(miner.hashrate_5s, miner.miner_type) + '</td>';
                    tableContent += '<td>' + format_hashrates(miner.hashrate_av, miner.miner_type) + '</td>';
                    tableContent += '<td>' + format_acs(miner.chain_acs,miner.miner_type) + '</td>';
                    tableContent += '<td>' + format_temps(miner.temp1, miner.temp2) + '</td>';
                    tableContent += '<td>' + miner.pools + '</td>';
            }
            tableContent += '<td>' + miner.state + '</td>';
            tableContent += '<td>' + miner.comments + '</td>';
            tableContent += '</tr>';

            return tableContent;

        }
    }

    $.ajax({
        url: '/miners',

        success: function(data) {

            // For each item in JSON, add a table row and cells to the content string
            let warning = { msg: null, last_good: null };
            let error = { msg: null };

            let tableContent = '';
            let errorContent = '';
            let warningContent = '';
            let offlineContent = '';
            let numTotal=0;
            let numError= 0;
            let numWarning = 0;
            let numOffline = 0;
            let numNormal = 0;
            let numManage = 0;

            $.each(data.miners, function(index, miner) {
                numTotal++;
                numManage++;

                    let currentContent = makeTableContents(miner);

                    tableContent += currentContent; //table Content is sum of curr.cont

                    switch(miner.state) {
                        case 'warning':
                            warningContent += currentContent;
                            numWarning++;
                            break;
                        case 'error':
                            errorContent += currentContent;
                            numError++;
                            break;
                        case 'zerohash':
                            errorContent += currentContent;
                            numError++;
                            break;
                        case 'offline':
                            offlineContent += currentContent;
                            numOffline++;
                            numManage--;
                            break;
                        default:
                            numNormal++;
                    }
            });

            // Inject the whole content string into existing HTML table
            $('#minerInfo table tbody').html(tableContent);
            $('#err-minerInfo table tbody').html(errorContent);
            $('#lowhash-minerInfo table tbody').html(warningContent);
            $('#offline-minerInfo table tbody').html(offlineContent);

            //$('#minerInfo h2').html('Total Miners  ' + numNormal + '/' + numWarning + '/' + numError + '/' + numOffline + ':' + numTotal );
            $('ul.dashboard li.info-total').html('Total &nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp   Miners : ' + numTotal);
            $('ul.dashboard li.info-manage').html('Managed &nbsp   Miners : ' + numManage);
            $('ul.dashboard li.info-error').html('Error &nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp   Miners : ' + numError);
            $('ul.dashboard li.info-warning').html('Warnning &nbsp  Miners : ' + numWarning);
            $('ul.dashboard li.info-offline').html('Offline  &nbsp&nbsp&nbsp&nbsp&nbsp Miners : ' + numOffline);


            $('#err-minerInfo h2').html('Error Miners :' + numError);
            $('#lowhash-minerInfo h2').html('Lowhash Miners :' + numWarning);
            $('#offline-minerInfo').find('h2').html('Offline Miners :' + numOffline);

            // Update summary

            // Display last update date/time and warning message
            let lastUpdated = 'Last updated: ' + data.updated +
                ((warning.msg !== null) ? ('<br><span class="error">' + warning.msg + ', last seen good: ' + warning.last_good + '</span>') : '');
            $('#lastUpdated').html(lastUpdated).removeClass("error");

            // Update refresh interval if defined
            if (data.refresh !== undefined) {
                refresh = data.refresh;
            }
        },

        error: function() {
            // Mark last update time with error flag
            $('#lastUpdated').addClass("error");
            $('title').html('FATAL: No response from server');
        },
        complete: function() {
            // Schedule the next request when the current one's complete
            setTimeout(worker, refresh);
        }
    });

    $('#find').click(function(){
        var searchData = $("input[name=find]").val();
        //if (searchData === null){
        //    searchData = '';
        //}

        $.ajax({
            url: '/miners',

            success: function(data) {
                var findMiners = data.miners.filter(function (el) {
                    return el.comments.includes(searchData)
                });
                data.miners = findMiners;
                let tableContent = '';
                let numFind = 0;
                $.each(data.miners, function(index, miner) {
                    numFind++;
                    let currentContent = makeTableContents(miner);
                    tableContent += currentContent;
                });
                $('#find-minerInfo table tbody').html(tableContent);
                $('#find-minerInfo').find('h2').html('Find Miners :' + numFind);

                //makeTableContents(data);
            },
            error: function(){

            },
            complete: function(){

            }

        });
    });
}

function tabs(){
    $('ul.tabs li').click(function(){
        let tab_id = $(this).attr('data-tab');

        $('ul.tabs li').removeClass('current');
        $('.tab-content').removeClass('current');

        $(this).addClass('current');
        $("#"+tab_id).addClass('current');
    })
}