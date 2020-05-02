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

let feeds_to_send = [];

window.addEventListener('load', init);

function init(){
    //debug view
    document.getElementById('realSense').addEventListener('click', () => startDevice('realSense'));
    document.getElementById('kinect').addEventListener('click', () => startDevice('kinect2'));
    document.getElementById('azure').addEventListener('click', () => startDevice('azure'));
    document.getElementById('startServer').addEventListener('click', startServer);
    document.getElementById('stopAll').addEventListener('click', () =>  ipcRenderer.send('close'));
    document.getElementById('connected').style.display = "none";
}

function startDevice(type){
    if(type === 'kinect' || type === 'azure'){
        if(process.platform === 'darwin'){
            alert("Devices not supported on Mac OS. Please use on Windows");
        }else{
            ipcRenderer.send('startDevice', type, deviceCount);
        }
    }else{
        ipcRenderer.send('startDevice', type, deviceCount);
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

function sendData(evt, id, device, data){
    let dataToSend = {event: evt, id: id, device: device, data: data};
    // console.log(dataToSend);
    peer_connections.forEach(function(conn){
        conn.send(dataToSend);
    });
}

//sent from index.js line 43
ipcRenderer.on('image', (evt, {device, id, img, frameType}) => {
    let element_id = "rs";

    if(device === "azure"){
        element_id = "azure";
    }else if(device === "kinect2"){
        element_id = "kinect2";
    }

    const blob = new Blob([img], {type: 'image/webp'});
    let url = URL.createObjectURL(blob);

    let depthView = document.getElementById(element_id + '-' + id + '-view-depth');
    let colorView = document.getElementById(element_id + '-' + id + '-view-color');

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

    if(peer_connections.length > 0){
        let feedtype = device + "-" + id + "-" + frameType;

        if(feeds_to_send.indexOf(feedtype) >= 0){
            // console.log(img.length);
            sendData(frameType, id, device, img);
        }
    }
});

ipcRenderer.on('startedServer', (evt, port) => {
    ip_addr = getIpAddress();

    document.getElementById('broadcast-addr').innerHTML = ip_addr + ':' + port;
    document.getElementById('server-options').style.display = 'none';
    // document.getElementById('startServer').id = 'stopServer';
    // document.getElementById('stopServer').addEventListener('click', () => ipcRenderer.send('closeServer'));
    // document.getElementById('stopServer').addEventListener('click', () => ipcRenderer.send('closeServer'));

    peer_net = {host: "localhost", port: portNumber, path: "/"};

    initPeer();
});

ipcRenderer.on('startedDevice', (evt, type, id) => {
    deviceCount++;
    if(deviceCount <= 1){
        document.getElementById('connected').style.display = "block";
    }

    if(type == 'realSense'){
        addRealSensePanel(id);
    }else if(type == 'kinect2'){
        addKinectPanel(id);
    }else if(type == 'azure'){
        addAzurePanel(id);
    }

    //document.getElementById('devices-info').innerHTML = deviceCount + " devices currently connected";
});

function addRealSensePanel(id){
    let panelDiv = document.createElement('div');
    panelDiv.id = 'rs-' + id;
    panelDiv.setAttribute('class', 'devicePanel');
    document.getElementById('connected').append(panelDiv);

    let titlediv = document.createElement('div');
    titlediv.id = 'rs-' + id + "-title-div";
    panelDiv.append(titlediv);

    let deviceTitle = document.createElement('h3');
    deviceTitle.id = 'rs-' + id + '-title';
    deviceTitle.setAttribute("class", "device-title");
    deviceTitle.innerHTML = "realSense " + id;
    titlediv.append(deviceTitle);

    let closeButton = document.createElement("button");
    closeButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised close-btn");
    closeButton.innerHTML = 'CLOSE DEVICE';
    closeButton.id = 'rs-' + id + '-close';
    //closeButton.setAttribute('onclick', 'ipcRenderer.send("closeDevice", '+ id +')');
    titlediv.append(closeButton);

    closeButton.addEventListener('click', () => closeDevice('rs', id));

    let depthOptions = document.createElement('h4');
    depthOptions.id = 'rs-' + id + "-d-options";
    depthOptions.innerHTML = "Depth Feed Options:";
    panelDiv.append(depthOptions);

    let depthButton = document.createElement("button");
    depthButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    depthButton.innerHTML = 'start depth camera';
    depthButton.id = 'rs-' + id + '-depth';
    panelDiv.append(depthButton);

    depthButton.addEventListener('click', function(){
        document.getElementById('rs-' + id + '-depth-close').style.display = "inline-block";
        document.getElementById('rs-' + id + '-depth').style.display = "none";
        ipcRenderer.send('startDepth', 'rs', id);
    });

    let depthCloseButton = document.createElement("button");
    depthCloseButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    depthCloseButton.innerHTML = 'stop depth camera';
    depthCloseButton.id = 'rs-' + id + '-depth-close';
    depthCloseButton.style.display = "none";
    panelDiv.append(depthCloseButton);

    depthCloseButton.addEventListener('click', function(){
        document.getElementById('rs-' + id + '-depth').style.display = "inline-block";
        document.getElementById('rs-' + id + '-depth-close').style.display = "none";
        document.getElementById("rs-" + id + "-view-depth").removeAttribute("src");
        ipcRenderer.send('stopDepth', 'rs', id)
    });

    let depthSendButton = document.createElement("button");
    depthSendButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    depthSendButton.innerHTML = 'send depth feed';
    depthSendButton.id = 'rs-' + id + '-send-depth';
    panelDiv.append(depthSendButton);

    depthSendButton.addEventListener('click', function(){
        document.getElementById('rs-' + id + '-send-depth').style.display = "none";
        document.getElementById('rs-' + id + '-stop-depth').style.display = "inline-block";

        let new_feed = "realSense-" + id + "-depth";
        if(feeds_to_send.indexOf(new_feed) < 0){
            feeds_to_send.push(new_feed);
        }
    });

    let depthStopButton = document.createElement("button");
    depthStopButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    depthStopButton.innerHTML = 'stop depth feed';
    depthStopButton.id = 'rs-' + id + '-stop-depth';
    depthStopButton.style.display = "none";
    panelDiv.append(depthStopButton);

    depthStopButton.addEventListener('click', function(){
        document.getElementById('rs-' + id + '-send-depth').style.display = "inline-block";
        document.getElementById('rs-' + id + '-stop-depth').style.display = "none";

        let new_feed = "realSense-" + id + "-depth";
        if(feeds_to_send.indexOf(new_feed) >= 0){
            console.log("splice " + new_feed + " at " + feeds_to_send.indexOf(new_feed));
            console.log(feeds_to_send);
            feeds_to_send.splice(feeds_to_send.indexOf(new_feed), 1);
            console.log("after: " + feeds_to_send);
        }
        sendData("depth", id, "realSense", "stop");
    });

    let colorOptions = document.createElement('h4');
    colorOptions.id = 'rs-' + id + "-c-options";
    colorOptions.innerHTML = "Color Feed Options:";
    panelDiv.append(colorOptions);

    let colorButton = document.createElement("button");
    colorButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    colorButton.innerHTML = 'start color camera';
    colorButton.id = 'rs-' + id + '-color';
    panelDiv.append(colorButton);

    colorButton.addEventListener('click', function(){
        document.getElementById('rs-' + id + '-color-close').style.display = "inline-block";
        document.getElementById('rs-' + id + '-color').style.display = "none";
        ipcRenderer.send('startColor', 'rs', id)
    });

    let colorCloseButton = document.createElement("button");
    colorCloseButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    colorCloseButton.innerHTML = 'stop color camera';
    colorCloseButton.id = 'rs-' + id + '-color-close';
    colorCloseButton.style.display = "none";
    panelDiv.append(colorCloseButton);

    colorCloseButton.addEventListener('click', function(){
        document.getElementById('rs-' + id + '-color').style.display = "inline-block";
        document.getElementById('rs-' + id + '-color-close').style.display = "none";
        document.getElementById("rs-" + id + "-view-color").removeAttribute("src");
        ipcRenderer.send('stopColor', 'realSense', id)
    });

    let colorSendButton = document.createElement("button");
    colorSendButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    colorSendButton.innerHTML = 'send color feed';
    colorSendButton.id = 'rs-' + id + '-send-color';
    panelDiv.append(colorSendButton);

    colorSendButton.addEventListener('click', function(){
        document.getElementById('rs-' + id + '-send-color').style.display = "none";
        document.getElementById('rs-' + id + '-stop-color').style.display = "inline-block";

        let new_feed = "realSense-" + id + "-color";
        if(feeds_to_send.indexOf(new_feed) < 0){
            feeds_to_send.push(new_feed);
        }
    });

    let colorStopButton = document.createElement("button");
    colorStopButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    colorStopButton.innerHTML = 'stop color feed';
    colorStopButton.id = 'rs-' + id + '-stop-color';
    colorStopButton.style.display = "none";
    panelDiv.append(colorStopButton);

    colorStopButton.addEventListener('click', function(){
        document.getElementById('rs-' + id + '-send-color').style.display = "inline-block";
        document.getElementById('rs-' + id + '-stop-color').style.display = "none";

        let new_feed = "realSense-" + id + "-color";

        if(feeds_to_send.indexOf(new_feed) >= 0){
            console.log("splice ", new_feed);
            feeds_to_send.splice(feeds_to_send.indexOf(new_feed), 1);
        }
        sendData("color", id, "realSense", "stop");
    });

    let viewDiv = document.createElement('div');
    viewDiv.id = "rs-" + id + "-view";
    viewDiv.setAttribute("class", "viewer");

    let consoleDiv = document.createElement('p');
    consoleDiv.id = "rs-" + id + "-console";
    consoleDiv.innerHTML = "rs " + id + " viewer:";
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

function addKinectPanel(id){
    let panelDiv = document.createElement('div');
    panelDiv.id = 'kinect2-' + id;
    panelDiv.setAttribute('class', 'devicePanel');
    document.getElementById('connected').append(panelDiv);

    let titlediv = document.createElement('div');
    titlediv.id = 'kinect2-' + id + "-title-div";
    panelDiv.append(titlediv);

    let deviceTitle = document.createElement('h3');
    deviceTitle.id = 'kinect2-' + id + '-title';
    deviceTitle.setAttribute("class", "device-title");
    deviceTitle.innerHTML = "Kinect2 " + id;
    titlediv.append(deviceTitle);

    let closeButton = document.createElement("button");
    closeButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised close-btn");
    closeButton.innerHTML = 'CLOSE DEVICE';
    closeButton.id = 'kinect2-' + id + '-close';
    //closeButton.setAttribute('onclick', 'ipcRenderer.send("closeDevice", '+ id +')');
    titlediv.append(closeButton);

    closeButton.addEventListener('click', () => closeDevice('kinect2', id));

    let depthOptions = document.createElement('h4');
    depthOptions.id = 'kinect2-' + id + "-d-options";
    depthOptions.innerHTML = "Depth Feed Options:";
    panelDiv.append(depthOptions);

    let depthButton = document.createElement("button");
    depthButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    depthButton.innerHTML = 'start depth camera';
    depthButton.id = 'kinect2-' + id + '-depth';
    panelDiv.append(depthButton);

    depthButton.addEventListener('click', function(){
        document.getElementById('kinect2-' + id + '-depth-close').style.display = "inline-block";
        document.getElementById('kinect2-' + id + '-depth').style.display = "none";
        ipcRenderer.send('startDepth', 'kinect2', id);
    });

    let depthCloseButton = document.createElement("button");
    depthCloseButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    depthCloseButton.innerHTML = 'stop depth camera';
    depthCloseButton.id = 'kinect2-' + id + '-depth-close';
    depthCloseButton.style.display = "none";
    panelDiv.append(depthCloseButton);

    depthCloseButton.addEventListener('click', function(){
        document.getElementById('kinect2-' + id + '-depth').style.display = "inline-block";
        document.getElementById('kinect2-' + id + '-depth-close').style.display = "none";
        document.getElementById("kinect2-" + id + "-view-depth").removeAttribute("src");
        ipcRenderer.send('stopDepth', 'kinect2', id)
    });

    let depthSendButton = document.createElement("button");
    depthSendButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    depthSendButton.innerHTML = 'send depth feed';
    depthSendButton.id = 'kinect2-' + id + '-send-depth';
    panelDiv.append(depthSendButton);

    depthSendButton.addEventListener('click', function(){
        document.getElementById('kinect2-' + id + '-send-depth').style.display = "none";
        document.getElementById('kinect2-' + id + '-stop-depth').style.display = "inline-block";

        let new_feed = "kinect2-" + id + "-depth";
        if(feeds_to_send.indexOf(new_feed) < 0){
            feeds_to_send.push(new_feed);
        }
    });

    let depthStopButton = document.createElement("button");
    depthStopButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    depthStopButton.innerHTML = 'stop depth feed';
    depthStopButton.id = 'kinect2-' + id + '-stop-depth';
    depthStopButton.style.display = "none";
    panelDiv.append(depthStopButton);

    depthStopButton.addEventListener('click', function(){
        document.getElementById('kinect2-' + id + '-send-depth').style.display = "inline-block";
        document.getElementById('kinect2-' + id + '-stop-depth').style.display = "none";

        let new_feed = "kinect2-" + id + "-depth";
        if(feeds_to_send.indexOf(new_feed) >= 0){
            feeds_to_send.splice(feeds_to_send.indexOf(new_feed), 1);
        }
        sendData("depth", id, "kinect2", "stop");
    });

    let colorOptions = document.createElement('h4');
    colorOptions.id = 'kinect2-' + id + "-c-options";
    colorOptions.innerHTML = "Color Feed Options:";
    panelDiv.append(colorOptions);

    let colorButton = document.createElement("button");
    colorButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    colorButton.innerHTML = 'start color camera';
    colorButton.id = 'kinect2-' + id + '-color';
    panelDiv.append(colorButton);

    colorButton.addEventListener('click', function(){
        document.getElementById('kinect2-' + id + '-color-close').style.display = "inline-block";
        document.getElementById('kinect2-' + id + '-color').style.display = "none";
        ipcRenderer.send('startColor', 'kinect2', id)
    });

    let colorCloseButton = document.createElement("button");
    colorCloseButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    colorCloseButton.innerHTML = 'stop color camera';
    colorCloseButton.id = 'kinect2-' + id + '-color-close';
    colorCloseButton.style.display = "none";
    panelDiv.append(colorCloseButton);

    colorCloseButton.addEventListener('click', function(){
        document.getElementById('kinect2-' + id + '-color').style.display = "inline-block";
        document.getElementById('kinect2-' + id + '-color-close').style.display = "none";
        document.getElementById("kinect2-" + id + "-view-color").removeAttribute("src");
        ipcRenderer.send('stopColor', 'kinect2', id)
    });

    let colorSendButton = document.createElement("button");
    colorSendButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    colorSendButton.innerHTML = 'send color feed';
    colorSendButton.id = 'kinect2-' + id + '-send-color';
    panelDiv.append(colorSendButton);

    colorSendButton.addEventListener('click', function(){
        document.getElementById('kinect2-' + id + '-send-color').style.display = "none";
        document.getElementById('kinect2-' + id + '-stop-color').style.display = "inline-block";

        let new_feed = "kinect2-" + id + "-color";
        if(feeds_to_send.indexOf(new_feed) < 0){
            feeds_to_send.push(new_feed);
        }
    });

    let colorStopButton = document.createElement("button");
    colorStopButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    colorStopButton.innerHTML = 'stop color feed';
    colorStopButton.id = 'kinect2-' + id + '-stop-color';
    colorStopButton.style.display = "none";
    panelDiv.append(colorStopButton);

    colorStopButton.addEventListener('click', function(){
        document.getElementById('kinect2-' + id + '-send-color').style.display = "inline-block";
        document.getElementById('kinect2-' + id + '-stop-color').style.display = "none";

        let new_feed = "kinect2-" + id + "-color";
        if(feeds_to_send.indexOf(new_feed) >= 0){
            feeds_to_send.splice(feeds_to_send.indexOf(new_feed), 1);
        }
        sendData("color", id, "kinect2", "stop");
    });

    let viewDiv = document.createElement('div');
    viewDiv.id = "kinect2-" + id + "-view";
    viewDiv.setAttribute("class", "viewer");

    let consoleDiv = document.createElement('p');
    consoleDiv.id = "kinect2-" + id + "-console";
    consoleDiv.innerHTML = "kinect2 " + id + " viewer:";
    viewDiv.append(consoleDiv);

    document.getElementById('view').append(viewDiv);

    let colorDiv = document.createElement('img');
    colorDiv.id = "kinect2-" + id + "-view-color";
    colorDiv.setAttribute("class", "viewer-img");
    viewDiv.append(colorDiv);

    let depthDiv = document.createElement('img');
    depthDiv.id = "kinect2-" + id + "-view-depth";
    depthDiv.setAttribute("class", "viewer-img");
    viewDiv.append(depthDiv);
}

function addAzurePanel(id){
    let panelDiv = document.createElement('div');
    panelDiv.id = 'azure-' + id;
    panelDiv.setAttribute('class', 'devicePanel');
    document.getElementById('connected').append(panelDiv);

    let titlediv = document.createElement('div');
    titlediv.id = 'azure-' + id + "-title-div";
    panelDiv.append(titlediv);

    let deviceTitle = document.createElement('h3');
    deviceTitle.id = 'azure-' + id + '-title';
    deviceTitle.setAttribute("class", "device-title");
    deviceTitle.innerHTML = "Kinect Azure " + id;
    titlediv.append(deviceTitle);

    let closeButton = document.createElement("button");
    closeButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised close-btn");
    closeButton.innerHTML = 'CLOSE DEVICE';
    closeButton.id = 'azure-' + id + '-close';
    //closeButton.setAttribute('onclick', 'ipcRenderer.send("closeDevice", '+ id +')');
    titlediv.append(closeButton);

    closeButton.addEventListener('click', () => closeDevice('azure', id));

    let depthOptions = document.createElement('h4');
    depthOptions.id = 'azure-' + id + "-d-options";
    depthOptions.innerHTML = "Depth Feed Options:";
    panelDiv.append(depthOptions);

    let depthButton = document.createElement("button");
    depthButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    depthButton.innerHTML = 'start depth camera';
    depthButton.id = 'azure-' + id + '-depth';
    panelDiv.append(depthButton);

    depthButton.addEventListener('click', function(){
        document.getElementById('azure-' + id + '-depth-close').style.display = "inline-block";
        document.getElementById('azure-' + id + '-depth').style.display = "none";
        ipcRenderer.send('startDepth', 'azure', id)
    });

    let depthCloseButton = document.createElement("button");
    depthCloseButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    depthCloseButton.innerHTML = 'stop depth camera';
    depthCloseButton.id = 'azure-' + id + '-depth-close';
    depthCloseButton.style.display = "none";
    panelDiv.append(depthCloseButton);

    depthCloseButton.addEventListener('click', function(){
        document.getElementById('azure-' + id + '-depth').style.display = "inline-block";
        document.getElementById('azure-' + id + '-depth-close').style.display = "none";
        document.getElementById("azure-" + id + "-view-depth").removeAttribute("src");
        ipcRenderer.send('stopDepth', 'azure', id)
    });

    let depthSendButton = document.createElement("button");
    depthSendButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    depthSendButton.innerHTML = 'send depth feed';
    depthSendButton.id = 'azure-' + id + '-send-depth';
    panelDiv.append(depthSendButton);

    depthSendButton.addEventListener('click', function(){
        document.getElementById('azure-' + id + '-send-depth').style.display = "none";
        document.getElementById('azure-' + id + '-stop-depth').style.display = "inline-block";

        let new_feed = "azure-" + id + "-depth";
        if(feeds_to_send.indexOf(new_feed) < 0){
            feeds_to_send.push(new_feed);
        }
    });

    let depthStopButton = document.createElement("button");
    depthStopButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    depthStopButton.innerHTML = 'stop depth feed';
    depthStopButton.id = 'azure-' + id + '-stop-depth';
    depthStopButton.style.display = "none";
    panelDiv.append(depthStopButton);

    depthStopButton.addEventListener('click', function(){
        document.getElementById('azure-' + id + '-send-depth').style.display = "inline-block";
        document.getElementById('azure-' + id + '-stop-depth').style.display = "none";

        let new_feed = "azure-" + id + "-depth";
        if(feeds_to_send.indexOf(new_feed) >= 0){
            feeds_to_send.splice(feeds_to_send.indexOf(new_feed), 1);
        }
        sendData("depth", id, "azure", "stop");
    });

    let colorOptions = document.createElement('h4');
    colorOptions.id = 'azure-' + id + "-c-options";
    colorOptions.innerHTML = "Color Feed Options:";
    panelDiv.append(colorOptions);

    let colorButton = document.createElement("button");
    colorButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    colorButton.innerHTML = 'start color camera';
    colorButton.id = 'azure-' + id + '-color';
    panelDiv.append(colorButton);

    colorButton.addEventListener('click', function(){
        document.getElementById('azure-' + id + '-color-close').style.display = "inline-block";
        document.getElementById('azure-' + id + '-color').style.display = "none";
        ipcRenderer.send('startColor', 'azure', id)
    });

    let colorCloseButton = document.createElement("button");
    colorCloseButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    colorCloseButton.innerHTML = 'stop color camera';
    colorCloseButton.id = 'azure-' + id + '-color-close';
    colorCloseButton.style.display = "none";
    panelDiv.append(colorCloseButton);

    colorCloseButton.addEventListener('click', function(){
        document.getElementById('azure-' + id + '-color').style.display = "inline-block";
        document.getElementById('azure-' + id + '-color-close').style.display = "none";
        document.getElementById("azure-" + id + "-view-color").removeAttribute("src");
        ipcRenderer.send('stopColor', 'azure', id)
    });

    let colorSendButton = document.createElement("button");
    colorSendButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    colorSendButton.innerHTML = 'send color feed';
    colorSendButton.id = 'azure-' + id + '-send-color';
    panelDiv.append(colorSendButton);

    colorSendButton.addEventListener('click', function(){
        document.getElementById('azure-' + id + '-send-color').style.display = "none";
        document.getElementById('azure-' + id + '-stop-color').style.display = "inline-block";

        let new_feed = "azure-" + id + "-color";
        if(feeds_to_send.indexOf(new_feed) < 0){
            feeds_to_send.push(new_feed);
        }
    });

    let colorStopButton = document.createElement("button");
    colorStopButton.setAttribute("class", "mdl-button mdl-js-button mdl-button--raised");
    colorStopButton.innerHTML = 'stop color feed';
    colorStopButton.id = 'azure-' + id + '-stop-color';
    colorStopButton.style.display = "none";
    panelDiv.append(colorStopButton);

    colorStopButton.addEventListener('click', function(){
        document.getElementById('azure-' + id + '-send-color').style.display = "inline-block";
        document.getElementById('azure-' + id + '-stop-color').style.display = "none";

        let new_feed = "azure-" + id + "-color";
        if(feeds_to_send.indexOf(new_feed) >= 0){
            feeds_to_send.splice(feeds_to_send.indexOf(new_feed), 1);
        }
        sendData("color", id, "azure", "stop");
    });

    let viewDiv = document.createElement('div');
    viewDiv.id = "azure-" + id + "-view";
    viewDiv.setAttribute("class", "viewer");

    let consoleDiv = document.createElement('p');
    consoleDiv.id = "azure-" + id + "-console";
    consoleDiv.innerHTML = "azure " + id + " viewer:";
    viewDiv.append(consoleDiv);

    document.getElementById('view').append(viewDiv);

    let colorDiv = document.createElement('img');
    colorDiv.id = "azure-" + id + "-view-color";
    colorDiv.setAttribute("class", "viewer-img");
    colorDiv.style.filter = "hue-rotate(150deg)";
    viewDiv.append(colorDiv);

    let depthDiv = document.createElement('img');
    depthDiv.id = "azure-" + id + "-view-depth";
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

        //get all devices and sendData to client library

        for(let j = 0; j < elements.length; j++){
            elements[j].remove();
        }
    }

    sendData("close-all", null, null, null);

    deviceCount = 0;
    feeds_to_send = [];

    document.getElementById("connected").style.display = "none";
});

ipcRenderer.on('closedDevice', (evt, id) => {
    // alert('closed device of id ' + id);
    console.log("closed device of id: " + id);

    deviceCount--;

    if(deviceCount === 0){
        document.getElementById("connected").style.display = "none";
    }
});

ipcRenderer.on('closedServer', () => {
    alert('server connection closed');
});

function closeDevice(type, id){
    ipcRenderer.send('closeDevice', id);

    let deviceType = type;

    if(type === "rs"){
        deviceType = "realSense";
    }

    sendData("device-closed", id, deviceType, null);

    let elements = document.querySelectorAll("[id*='" + id + "']");

    for(let i = 0; i < elements.length; i++){
        elements[i].remove();
    }

    console.log("feeds_to_send.indexOf(type + \"-\" + id + \"-depth\")", feeds_to_send.indexOf(type + "-" + id + "-depth"));

    if(feeds_to_send.indexOf(type + "-" + id + "-depth") >= 0){
        feeds_to_send.splice(feeds_to_send.indexOf(type + "-" + id + "-depth"), 1);
    }

    if(feeds_to_send.indexOf(type + "-" + id + "-color") >= 0){
        feeds_to_send.splice(feeds_to_send.indexOf(type + "-" + id + "-color"), 1);
    }
}
