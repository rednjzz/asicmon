
// Default web refresh interval (may be changed with web_refresh config option)
let refresh = 5000;

// Default hashrate tolerance (+/- to target hashrate)
let tolerance = 0.1;
//const err_tolerance = 0.3;
const WARN_TOLERANCE = 0.15;

// GPU temperature monitoring threshold (zero disables monitoring)
let temperature = 0;
let temperature2 = 0;


// DOM Ready =============================================================

$(document).ready(function() {
    worker();
    tabs();
});

// Functions =============================================================

function worker() {

    function format_temps(temp1, temp2) {
        let tf = '';
        let t1 = temp1.split(';');
        let t2 = temp2.split(';');
        let tnum = t1.length;

        for (let i = 0; i < tnum; ++i) {
            let temp_1 = t1[i] + 'C';
            let temp_2 = t2[i] + 'C';
            if (t1[i] > temperature || t2[i] > temperature2) {
                temp_1 = '<span class="error">' + temp_1 + '</span>';
                temp_2 = '<span class="error">' + temp_2 + '</span>';
            }

            tf += ((i > 0) ? ' ' : '') + temp_1 + '/' + temp_2;
        }
        return tf;
    }

    function format_hashrates(hr,type) {
        let hashrates = '';
        switch(type){
            case "Antminer S9":
                hashrates = Number(hr).toFixed(2) + '&nbsp;TH/s';
                break;
            case "Antminer L3+":
                hashrates = 'default L3+ hashrate';
                break;
            default:
                hashrates = 'No Type Matched'
        }
        return hashrates;
    }

    $.ajax({
        url: '/miners',

        success: function(data) {
            // Target hashrate tolerance
            if (data.tolerance !== undefined) {
                tolerance = data.tolerance / 100;
            }

            // GPU temperature monitoring threshold
            if (data.temperature !== undefined) {
                temperature = data.temperature;
            }

            // For each item in JSON, add a table row and cells to the content string
            let warning = { msg: null, last_good: null };
            let error = { msg: null };

            let tableContent = '';
            $.each(data.miners, function(index, miner) {
                if (miner !== null) {
                    let error_class = (miner.error === null) ? 'class=normal' : ' class=error';
                    let offline_class = (miner.offline) ? ' class=offline' : 'class=normal';
                    let normal_class = 'class=normal';
                    let last_seen;
                    let span = 6;//(data.hashrates) ? 8 : 6;

                    if (miner.warning) {
                        // Only single last good time is reported for now
                        warning.msg = miner.warning;
                        warning.last_good = miner.last_good;
                    }

                    if (miner.error) {
                        tableContent += '<tr' + error_class + '>';
                        tableContent += '<td>' + miner.name + '</td>';
                        tableContent += '<td>' + miner.host + '</td>';
                        error.msg = miner.error;
                        last_seen = '<br>Last seen: ' + miner.last_seen;
                        tableContent += '<td colspan="' + span +' ">' + miner.error + last_seen + '</td>';
                    } else if (miner.offline) {
                        tableContent += '<tr' + offline_class + '>';
                        tableContent += '<td>' + miner.name + '</td>';
                        tableContent += '<td>' + miner.host + '</td>';
                        tableContent += '<td colspan="' + span +' ">' + miner.offline + '</td>';
                    } else {
                        tableContent += '<tr' + normal_class + '>';
                        tableContent += '<td>' + miner.name + '</td>';
                        tableContent += '<td>' + miner.host + '</td>';
                        tableContent += '<td>' + miner.uptime + '</td>';
                        tableContent += '<td>' + miner.miner_type + '</td>';
                        tableContent += '<td>' + format_hashrates(miner.hashrate_5s,miner.miner_type) + '</td>';
                        tableContent += '<td>' + format_hashrates(miner.hashrate_av,miner.miner_type) + '</td>';
                        tableContent += '<td>' + format_temps(miner.temp1,miner.temp2) + '</td>';
                        tableContent += '<td>' + miner.pools + '</td>';
                    }
                    tableContent += '<td>' + miner.comments + '</td>';
                    tableContent += '</tr>';
                }
            });

            // Inject the whole content string into existing HTML table
            $('#minerInfo table tbody').html(tableContent);
            $('#minerInfo h2').html('Total Miners');

            // Update window title and header with hashrate substitution
            //let title = "ASIC Miner(global.title)";
            //if (error.msg !== null) {
            //    title = 'Error: ' + title;
            //} else if (warning.msg !== null) {
            //    title = 'Warning: ' + title;
            //}

            //if ($('title').html() !== title) {
            //    $('title').html(title);
            //}

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