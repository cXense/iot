// Dependencies
var fs = require('fs');
var request = require('request');
var crypto = require('crypto');


// TODOs
var username = 'xxx@xxx.com'; // TODO: Add your Cxense user name (email) here
var apiKey = 'xxxxxxxxxxxxx'; // TODO: Add your API key here
var siteId = 'xxxxxxxxxxxxx'; // TODO: Add your site ID here


// State
var led = {
    red:   { current: 0, wanted: 0, gpio: 12, max: 255 },
    green: { current: 0, wanted: 0, gpio: 20, max: 511 },
    blue:  { current: 0, wanted: 0, gpio: 21, max: 400 },
    white: { current: 0, wanted: 0, gpio: 16, max: 255 }
};
var leds = [ led.red, led.green, led.blue, led.white ];
var blink = false;


// This code writes the RGB values to the GPIO pins (using pigpio)
fs.open('/dev/pigpio', 'w', function(err, fd) {
    leds.forEach(function(led) {
        fs.write(fd, 'm ' + led.gpio + ' w\n');
        fs.write(fd, 'pfs 100\n');
        fs.write(fd, 'prs ' + led.gpio + ' ' + led.max + '\n');
    });

    setInterval(function() {
        leds.forEach(function(led) {
            fs.write(fd, 'p ' + led.gpio + ' ' + (blink ? 0 : Math.round(led.current)) + '\n');
            led.current += (led.wanted - led.current) / 100;
        });
    }, 20);
});


// This code reads (polls) the wanted stats from the CXense Insight traffic API
function pollEvents() {
    // Setup the crypto header
    var date = new Date().toISOString(),
    hmac = crypto.createHmac('sha256', apiKey).update(date).digest('hex');

    // Send the request and parse the response
    request.post({
        url: 'https://api.cxense.com/traffic',
        headers: { 'X-cXense-Authentication': 'username=' + username + ' date=' + date + ' hmac-sha256-hex=' + hmac },
        body: { start: -50, siteId: siteId, historyFields: ['events'], historyBuckets: 5 },
        json: true
    }, function (error, response, body) {
        var color = 'blue';
        try {
            if (!error && response.statusCode === 200) {
                if (body && body.historyData && body.historyData.events) {
                    // console.log('The event group count: ' + JSON.stringify(body, null, 4));
                    var events = body.historyData.events;
                    var avg = events.reduce(function (prev, current) {
                        return prev + current;
                    }, 0) / events.length;
                    var latest = events[events.length - 1];

                    if (latest > avg * 2) color = 'green';
                    else if (latest > avg) color = 'greenish';
                    else if (latest < avg / 2) color = 'red';
                    else if (latest < avg) color = 'redish';
                    else color = 'white';

                    console.log('Current: ' + latest + ', avg: ' + avg);

                } else {
                    console.log('No data from API');
                    color = 'white';
                }
            } else {
                console.log('Error: ' + error + ', response.statusCode: ' + response.statusCode);
            }
        } catch(e) {
            console.log('Exception: ' + e);
        }

        console.log('Cube color: ' + color);

        switch(color) {
            case 'green': led.red.wanted = 0; led.green.wanted = 255; led.blue.wanted = 0; led.white.wanted = 0; break;
            case 'greenish': led.red.wanted = 0; led.green.wanted = 255; led.blue.wanted = 0; led.white.wanted = 0; break;
            case 'red': led.red.wanted = 255; led.green.wanted = 0; led.blue.wanted = 0; led.white.wanted = 0; break;
            case 'redish': led.red.wanted = 255; led.green.wanted = 0; led.blue.wanted = 0; led.white.wanted = 0; break;
            case 'white': led.red.wanted = 0; led.green.wanted = 0; led.blue.wanted = 0; led.white.wanted = 255; break;
        }

        setTimeout(pollEvents, 1000);
    });
}

// Kick off the polling loop
pollEvents();
