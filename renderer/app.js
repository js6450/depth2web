const {ipcRenderer} = require('electron');
// const io = require('socket.io-client');
const os = require('os');

let deviceCount = 0;

let peer_net;
let peer_id = "depth2web";
let peer_ids = [];
let peer_connections = [];
let peer = null;
let connection = null;
let peer_id_display = null;
let new_peer_entry = false;
let new_peer_info;
let ip_addr;
let portNumber;

window.addEventListener('load', init);

function init(){

    //debug view

    document.getElementById('realSense').addEventListener('click', () => startDevice('realSense'));
    document.getElementById('kinect').addEventListener('click', () => startDevice('kinect'));
    document.getElementById('azure').addEventListener('click', () => startDevice('azure'));

    document.getElementById('startServer').addEventListener('click', startServer);

    document.getElementById('stopAll').addEventListener('click', () =>  ipcRenderer.send('close'));
}

function startDevice(type){

    if(type === 'kinect' || type === 'azure'){
        if(process.platform === 'darwin'){
            alert("Devices not supported on Mac OS. Please use on Windows");
        }else{
            ipcRenderer.send('startDevice', type, deviceCount);
            deviceCount++;
        }
    }else{
        ipcRenderer.send('startDevice', type, deviceCount);
        deviceCount++;
    }

}

function startServer(){
    portNumber = document.getElementById('addr').value;
    if(portNumber == ""){
        portNumber = 8000;
    }
    ipcRenderer.send('startServer', portNumber);
}

function getIpAddress(){
    let inters = os.networkInterfaces();
    let ipAddresses = [];

    Object.keys(inters).forEach(function(intname){
        let alias = 0;

        inters[intname].forEach(function(inter){
            if("IPv4" !== inter.family || inter.internal !== false){
                return;
            }

            //if statement needed?
            if(alias >= 1){
                ipAddresses.push(inter.address);
            }else{
                ipAddresses.push(inter.address);
            }

            ++alias;
        })

    });

    return ipAddresses;
}

function initPeer(){
    peer = new Peer(peer_id, peer_net);

    peer.on("error", function(err){
        console.log(err);
    });

    peer.on("open", function(id){
        peer_id = id;
        console.log("opened with peer id " + id);
    });

    peer.on("connection", function(conn){
        let connection = conn;

        peer_connections.push(connection);

        connection.on("open", function(){
            console.log("new connection from peer " + connection.peer);
        });

        connection.on("data", function(msg){

        });
    });

    peer.on("close", function(){
        console.log("peer connection closed");

        if(new_peer_entry){
            peer = null;
            initPeer();
            new_peer_entry = false;
        }
    });
}

function sendData(evt, id, data){
    let dataToSend = {event: evt, id: id, data: data};
    // console.log(dataToSend);

    peer_connections.forEach(function(conn){
        conn.send(dataToSend);
    });
}

//sent from index.js line 43
ipcRenderer.on('image', (evt, {device, id, img, frameType}) => {
    // console.log('image received of type: ' + frameType);

    const blob = new Blob([img], {type: 'image/webp'});
    let url = URL.createObjectURL(blob);

    let depthView = document.getElementById('rs-' + id + '-view-depth');
    let colorView = document.getElementById('rs-' + id + '-view-color');

    if(device == 'realSense'){
        if(frameType == "depth"){
            if(depthView != null){
                depthView.src = url;
            }
        }

        if(frameType == "color"){
            if(colorView != null){
                colorView.src = url;
            }
        }
    }

    if(device == 'kinect'){
        document.getElementById('kinect-view').src = url;
    }

    if(peer_connections.length > 0){
        sendData(frameType, id, img);
    }
});

ipcRenderer.on('startedServer', (evt, port) => {
    ip_addr = getIpAddress();

    document.getElementById('broadcast-addr').innerHTML = ip_addr + ':' + port;
    document.getElementById('startServer').innerHTML = 'stop';
    document.getElementById('startServer').id = 'stopServer';
    document.getElementById('stopServer').addEventListener('click', () => ipcRenderer.send('closeServer'));

    peer_net = {host: "localhost", port: portNumber, path: "/"};

    initPeer();
});

ipcRenderer.on('startedDevice', (evt, type, id) => {
    if(deviceCount <= 1){
        console.log('show device panel');
    }

    if(type == 'realSense'){
        addRealSensePanel(id);
    }else{
        console.log('show kinect panel');
    }

    //document.getElementById('devices-info').innerHTML = deviceCount + " devices currently connected";
});

function addRealSensePanel(id){

    let panelDiv = document.createElement('div');
    panelDiv.id = 'rs-' + id;
    panelDiv.setAttribute('class', 'devicePanel');
    document.getElementById('connected').append(panelDiv);

    let deviceTitle = document.createElement('h3');
    deviceTitle.id = 'rs-' + id + '-title';
    deviceTitle.innerHTML = "Real Sense " + id;
    panelDiv.append(deviceTitle);

    let depthButton = document.createElement("button");
    depthButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    depthButton.innerHTML = 'start depth camera';
    depthButton.id = 'rs-' + id + '-depth';
    panelDiv.append(depthButton);

    depthButton.addEventListener('click', () => ipcRenderer.send('startDepth', 'realSense', id));

    let colorButton = document.createElement("button");
    colorButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    colorButton.innerHTML = 'start color camera';
    colorButton.id = 'rs-' + id + '-color';
    panelDiv.append(colorButton);

    colorButton.addEventListener('click', () => ipcRenderer.send('startColor', 'realSense', id));

    let closeButton = document.createElement("button");
    closeButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    closeButton.innerHTML = 'CLOSE DEVICE';
    closeButton.id = 'rs-' + id + '-close';
    //closeButton.setAttribute('onclick', 'ipcRenderer.send("closeDevice", '+ id +')');
    panelDiv.append(closeButton);

    closeButton.addEventListener('click', () => closeDevice('rs', id));

    let viewDiv = document.createElement('div');
    viewDiv.id = "rs-" + id + "-view";
    viewDiv.setAttribute("class", "viewer");

    let consoleDiv = document.createElement('p');
    consoleDiv.id = "rs-" + id + "-console";
    consoleDiv.innerHTML = "realSense " + id + " viewer:";
    viewDiv.append(consoleDiv);

    document.getElementById('view').append(viewDiv);

    let colorDiv = document.createElement('img');
    colorDiv.id = "rs-" + id + "-view-color";
    colorDiv.setAttribute("class", "viewer-img");
    viewDiv.append(colorDiv);

    let depthDiv = document.createElement('img');
    depthDiv.id = "rs-" + id + "-view-depth";
    depthDiv.setAttribute("class", "viewer-img");
    viewDiv.append(depthDiv);
}

ipcRenderer.on('startError', (err) => {
    alert('device start error: ' + err);
});

ipcRenderer.on('closed', () => {
    alert('closed all device connections');

    for(let i = 0; i < deviceCount; i++){
        let elements = document.querySelectorAll("[id*='" + i + "']");

        for(let j = 0; j < elements.length; j++){
            elements[j].remove();
        }
    }

    deviceCount = 0;
});

ipcRenderer.on('closedDevice', (evt, id) => {
    // alert('closed device of id ' + id);
    console.log("closed device of id: " + id);

    deviceCount--;
});

ipcRenderer.on('closedServer', () => {
    alert('server connection closed');
});

function closeDevice(type, id){
    ipcRenderer.send('closeDevice', id);

    let elements = document.querySelectorAll("[id*='" + id + "']");

    for(let i = 0; i < elements.length; i++){
        elements[i].remove();
    }
}
