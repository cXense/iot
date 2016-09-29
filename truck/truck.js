// Dependencies
var request = require('request');
var wav = require('wav');
var reader = new wav.Reader();
var Speaker = require('speaker');
var Readable = require('stream').Readable;
var util = require('util');
var fs = require('fs');
var joystick = new (require('joystick'))(0, 0, 100);


// State
var wantedSteeringPos = 0;
var steeringPos = 0;
var wantedDriveSpeed = 0;
var driveSpeed = 0;
var tipperSpeed = 0;
var startPressed = false;
var engineRunning = false;
var starting = false;
var stopping = false;

// TODOs
var siteId = 'xxxxxxxxxxxx'; // TODO: Add your site ID here
var location = 'http://www.a.com/truck.html"; // TODO: Set any valid URL here (does not need to exist anywhere)


// Helper functions to send a Cxense Insight event
function sendEvent(action) {
    var url = 'http://comcluster.cxense.com/Repo/rep.gif?ver=1&typ=pgv&acc=0' +
	'&rnd=' + encodeURIComponent(_randomString()) +
	'&sid=' + encodeURIComponent(siteId) +
	'&loc=' + encodeURIComponent(location) +
	'&ltm=' + encodeURIComponent('' + new Date().getTime()) +
	'&cp_action=' + encodeURIComponent(action) +
	'&ckp=' + encodeURIComponent('012890123801239000');
    request.get(url);
}
function _randomString() {
    var randomString = (new Date().getTime()).toString(36);
    while (randomString.length < 16) {
        randomString += Math.round(Math.random() * 2147483647).toString(36);
    }
    return randomString.substr(0, 16);
}


// Engine sound
var buff = fs.readFileSync('/home/pi/034764662-diesel-engine-yacht.wav');
util.inherits(Counter, Readable);
function Counter(opt) {
    Readable.call(this, opt);
    this._max = 1000000;
    this._index = 1;
}
Counter.prototype._read = function() {
    var engineSpeed = Math.max(Math.abs(driveSpeed), Math.abs(tipperSpeed));
    var buffLen = Math.floor((2500 + (1 - engineSpeed) * 2500)) * 8;
    // console.log('Snd read,  enngineSpeed: ' + engineSpeed + ', buffLen: ' + buffLen);

    if (starting) {
        starting = false;
        startPressed = false;
        engineRunning = true;
    }
    if (stopping) {
        stopping = false;
        startPressed = false;
        engineRunning = false;
    }

    var start = 44100 * 4 * 15;
    if (startPressed && !engineRunning) {
        start = 44100 * 4 * 0.5;
        buffLen = 44100 * 4 * 2.9;
        starting = true;
	sendEvent('engine_start');
    } else if (startPressed && engineRunning) {
        start = 44100 * 4 * 17.6;;
        buffLen = 44100 * 4 * 2.5;
        stopping = true;
	sendEvent('engine_stop');
    } else if (!engineRunning) {
        start = 44100 * 4 * 21;
        buffLen = 44100 * 4 * 0.25;    
    } else if (engineSpeed > 0.6) {
        start = 44100 * 4 * 13;
    } else if (engineSpeed > 0.2) {
        start = 44100 * 4 * 2.5;
    } 
    var buf = buff.slice(start, start + buffLen);
    this.push(buf);
};

// Create the Speaker instance
var speaker = new Speaker({
    channels: 2,          // 2 channels
    bitDepth: 16,         // 16-bit samples
    sampleRate: 44100     // 44,100 Hz sample rate
});

// PCM data from stdin gets piped into the speaker
var counter = new Counter();

counter.pipe(speaker);




// Smooth update of steering position and driving speed
setInterval(function() {
    var steeringDelta = wantedSteeringPos - steeringPos;
    var sterringDeltaSign = steeringDelta >= 0 ? 1 : -1;
    steeringDelta = Math.abs(steeringDelta);
    steeringPos += sterringDeltaSign * Math.min(steeringDelta, 0.01);

    var driveDelta = wantedDriveSpeed - driveSpeed;
    var driveDeltaSign = driveDelta >= 0 ? 1 : -1;
    driveDelta = Math.abs(driveDelta);
    driveSpeed += driveDeltaSign * Math.min(driveDelta, 0.004);
    if (driveSpeed >= 0 && lights.reverse.on) {
        toggleLight(lights.reverse);
    }
    if (driveSpeed < 0 && !lights.reverse.on) {
        toggleLight(lights.reverse);
    }

}, 10);


// Control turn signals
var blinkOn = false;
setInterval(function() {
    blinkOn = !blinkOn;
    
    if(gpioFd) {
        [lights.directionLeft, lights.directionRight].forEach(function(light) {
            fs.write(gpioFd, 'm ' + light.gpio + ' w\n');
            fs.write(gpioFd, 'w ' + light.gpio + ' ' + ((light.on && blinkOn) ? 1 : 0) + '\n');
	});
    }
}, 500);


// The state of all lights and their mapping to GPIO pins
var lights = {
    drive: { on: false, gpio: 26 },
    brake: { on: false, gpio: 13 },
    reverse: { on: false, gpio: 6 },
    head: { on: false, gpio: 19 },
    beacon: { on: false, gpio: 20 },
    directionLeft: { on: false, gpio: 12 },
    directionRight: { on: false, gpio: 16 }
};

function toggleLight(light, name) {
    light.on = !light.on;
    if(gpioFd) {
        fs.write(gpioFd, 'm ' + light.gpio + ' w\n');
        fs.write(gpioFd, 'w ' + light.gpio + ' ' + (light.on ? 1 : 0) + '\n');
    }
    if (name) {
	sendEvent('light_' + name + '_' + (light.on ? 'on' : 'off'));
    }
}


// Read the remote control
joystick.on('axis', function(event) {
    var value = event.value / 32768; // Now in the -1 -> 0 -> 1 range
    switch(event.number) {
        case 0: wantedSteeringPos = -value; break;
        case 1: wantedDriveSpeed = -value; break;
        case 4: tipperSpeed = -value; break;
    }
    console.log(JSON.stringify(event));
});
joystick.on('button', function(event) {
    // {"time":64420,"value":1,"number":7,"type":"button","id":0}
    if (!event.init) {
        switch(event.number) {
        case 0: if (event.value === 0) { toggleLight(lights.drive, 'drive'); } break;
        case 1: if (event.value === 0) {
	    var reader = new wav.Reader();
	    reader.on('format', function (format) {
		reader.pipe(new Speaker(format));
	    });
	    fs.createReadStream('/home/pi/021476195-truck-horn-mack.wav').pipe(reader);;
	} break;
        case 2: if (event.value === 0) { toggleLight(lights.head, 'head'); } break;
        case 3: if (event.value === 0) { toggleLight(lights.beacon, 'beacon'); } break;
        case 4: if (event.value === 0) { lights.directionLeft.on = !lights.directionLeft.on; } break;
        case 5: if (event.value === 0) { lights.directionRight.on = !lights.directionRight.on; } break;
        case 6: toggleLight(lights.brake, 'brake');
            if (event.value === 0) {
	    var reader = new wav.Reader();
	    reader.on('format', function (format) {
		reader.pipe(new Speaker(format));
	    });
	    fs.createReadStream('/home/pi/026088542-truck-brakes-air-puff.wav').pipe(reader);;
	} break;
        case 7: if (event.value === 0) { startPressed = true; } break;
        // case 7: if (event.value === 0) { startPressed = true; }
        }
    }
    console.log(JSON.stringify(event));
});


var gpioFd = null;

fs.open('/dev/pigpio', 'w', function(err, fd) {
    gpioFd = fd;
    // Set the servo positiion
    setInterval(function() {
        fs.write(fd, 's 18 ' + (1500 + steeringPos * 400) + '\n');
    }, 20);
});


// Controlling the Pololu quik motor controller
var SerialPort = require("serialport").SerialPort;
var serialPort = new SerialPort("/dev/ttyAMA0", { baudrate: 9600 });
serialPort.on("open", function () {
    setInterval(function() {
        var cmd = tipperSpeed >= 0 ? 0x88 : 0x8A;
        serialPort.write([cmd, Math.abs(tipperSpeed) * 127]);
 
        var driveMotorSpeed = driveSpeed * Math.abs(driveSpeed); // Exponential
        cmd = driveMotorSpeed >= 0 ? 0x8E : 0x8C;
        serialPort.write([cmd, Math.abs(driveMotorSpeed) * 127]);
    }, 40);
});

