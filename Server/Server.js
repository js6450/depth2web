const PeerServer = require('peer').PeerServer;

class Server {
    constructor(portnum, onStart = (_) => {}){

        this.port = portnum;

        this.server = PeerServer({port: this.port, path: "/"});

        console.log("setting up peer server");

        this.server.on("connection", function(client){
            console.log("connection made from client");
        });

        onStart(this.port);
    }

    // sendImage(data){
    //     this.io.sockets.emit('image', data);
    // }

    stop(){
       // socket.close();
    }

}

module.exports.Server = Server;



