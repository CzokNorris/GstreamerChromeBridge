var express = require('express');
var http = require('http');
var net = require('net');
var child = require('child_process');

var expressApp = express();
var httpServer = http.createServer(expressApp);
var currentPort = 8081;

expressApp.get('/', function (req, res) {
    var date = new Date();
    console.log('Starting');
    currentPort = currentPort + 1;

    res.writeHead(200, {
        'Date': date.toUTCString(),
        'Connection': 'close',
        'Cache-Control': 'private',
        'Content-Type': 'video/webm',
        'Server': 'CustomStreamer/0.0.1',
    });

    var tcpServer = net.createServer(function (socket) {
        console.log('tcp server');
        socket.on('data', function (data) {
            console.log('tcp data');
            res.write(data);
        });
        socket.on('close', function (had_error) {
            console.log('tcp close');
            res.end();
        });
    });

    tcpServer.maxConnections = 1;

    tcpServer.listen(currentPort, function () {
        console.log('tcp listen');
        var cmd = 'gst-launch-1.0';
        var args =
            ['videotestsrc',
                '!', 'video/x-raw,framerate=30/1,width=320,height=240',
                '!', 'videoconvert',
                '!', 'queue',
                '!', 'theoraenc',
                '!', 'queue',
                '!', 'm.', 'oggmux', 'name=m',
                '!', 'queue',
                '!', 'tcpclientsink', 'host=localhost',
                'port=' + tcpServer.address().port];

        var gstMuxer = child.spawn(cmd, args);

        gstMuxer.stderr.on('data', onSpawnError);
        gstMuxer.on('exit', onSpawnExit);

        res.connection.on('close', function () {
            gstMuxer.kill();
        });

    });
});

httpServer.listen(8080);
console.log('http listen');

function onSpawnError(data) {
    console.log(data.toString());
}

function onSpawnExit(code) {
    if (code != null) {
        console.log('GStreamer error, exit code ' + code);
    }
}

process.on('uncaughtException', function (err) {
    console.log(err);
});
