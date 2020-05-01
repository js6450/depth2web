import Peer from "./peerjs"

class Depth2Web{

    constructor(addr){

        this.imgWidth = 320;
        this.imgHeight = 240;

        this.devices = [];

        this.depthBlob = [];
        this.colorBlob = [];

        this.depthURL = [];
        this.colorURL = [];

        this.peer_net = {host: "localhost", port: 8000, path: "/"};
        this.peer_id = "depth2web";
        this.connection = null;

        if(addr){
            this.peer_net.host = addr;
        }

        this.peer = new Peer(this.peer_net);

        this.peer.on("open", function(id){
            console.log("open connection with peer id: ", id);

            this.connect();
        }.bind(this));

        this.peer.on("connection", function(conn){
            conn.on("open", function(){
                console.log("connected to peer server");
            })
        });

    }

    connect(){
        this.connection = this.peer.connect(this.peer_id);

        this.connection.on("open", function(data){
            console.log("open data connection with peer server");
        });

        this.connection.on("data", function(sent){

            if(sent.event == "depth"){
                this.depthBlob[sent.id] = new Blob([sent.data], {type: 'image/webp'});
                this.depthURL[sent.id] = URL.createObjectURL(this.depthBlob[sent.id]);
            }

            if(sent.event == "color"){
                this.colorBlob[sent.id] = new Blob([sent.data], {type: 'image/webp'});
                this.colorURL[sent.id] = URL.createObjectURL(this.colorBlob[sent.id]);
            }
        }.bind(this));
    }

    deviceCount(){

    }

    depthCount(){
        return this.depthURL.length;
    }

    colorCount(){
        return this.colorURL.length;
    }

    getDepthBlob(){
        if(this.depthBlob){
            return this.depthBlob;
        }else{
            console.log("depth blob is not received");
        }
    }

    getDepthURL(){
        if(this.depthURL){
            return this.depthURL;
        }else{
            console.log("depth url is not received");
        }
    }

    displayDepthImage(){
        if(document.getElementById('depthImg') == null && this.depthURL != null){
            document.body.append(this.depthImg);
        }
    }

    getColorBlob(){
        if(this.colorBlob){
            return this.colorBlob;
        }else{
            return "color blob is not received";
        }
    }

    getColorURL(){
        if(this.colorURL){
            return this.colorURL;
        }else{
            return "color url is not received";
        }
    }

    displayColorImage(){
        if(document.getElementById('colorImg') == null && this.colorURL != null){
            document.body.append(this.colorImg);
        }
    }

}

window.Depth2Web = Depth2Web;