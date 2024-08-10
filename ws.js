const WebSocket = require("ws");
const url = require("url");
const uuidv4 = require("uuid").v4;

const connections = {};
const users = {};
const admins = [];
const students = [];
var isAdmin = false;

const startWebSocketServer = (server) => {
  const wsServer = new WebSocket.Server({ server });
  wsServer.on("connection", (connection, request) => {
    //New client is connecting to the socket
    const { roomid } = url.parse(request.url, true).query;
    if (admins[roomid - 1] === 0) {
      //There is no connected admin inside this room - this new connection is the new admin
      admins[roomid - 1] = 1;
      isAdmin = true;
    } else {
      isAdmin = false;
      //One student is entering this room
      students[roomid - 1]++;
    }
    const uuid = uuidv4();
    connections[uuid] = connection;
    users[uuid] = {
      isAdmin: isAdmin,
      state: {},
    };
    // Send the user back to the client
    const messageData = {
      type: "connect",
      data: users[uuid],
    };
    const message = JSON.stringify(messageData);
    connection.send(message);
    //Update all users about the new number of connections (number of students)
    broadcast("clientUpdate", students);

    connection.on("message", (message) => handleMessage(message, uuid));
    connection.on("close", () => handleClose(uuid, roomid));
  });
  return wsServer;
};

const fillArrays = (size) => {
  admins.length = size;
  students.length = size;
  admins.fill(0);
  students.fill(0);
};

const broadcast = (type, data) => {
  Object.keys(connections).forEach((uuid) => {
    const connection = connections[uuid];
    const messageData = { type: type, data: data };
    const message = JSON.stringify(messageData);
    connection.send(message);
  });
};

const broadcastCodeUpdate = (senderUuid, data) => {
  //If client X changed his code - send all the other clients the updated state, except client X itself
  Object.keys(connections).forEach((uuid) => {
    if (uuid !== senderUuid) {
      const connection = connections[uuid];
      const messageData = { type: "codeUpdate", data: data };
      const message = JSON.stringify(messageData);
      connection.send(message);
    }
  });
};

const handleMessage = (bytes, uuid) => {
  const message = JSON.parse(bytes.toString());
  if (message.type === "codeUpdate") {
    users[uuid].state = message.data;
    broadcastCodeUpdate(uuid, users[uuid]);
  } else if (message.type === "clientUpdate") {
    users[uuid].state = message.data;
    broadcast("clientUpdate", users);
  } else if (message.type === "exit") {
    handleClose(uuid, message.data.id);
  }
};

const handleClose = (uuid, roomid) => {
  if (connections[uuid]) {
    const isAdmin = users[uuid].isAdmin;
    if (isAdmin) {
      //When the admin leaves the room, all clients need to exit the room
      admins[roomid - 1] = 0;
      broadcast("exitAll", roomid);
      students[roomid - 1] = 0;
    } else if (students[roomid - 1] > 0) {
      students[roomid - 1]--;
    }
    broadcast("clientUpdate", students);
    delete connections[uuid];
    delete users[uuid];
  }
};

module.exports = {
  fillArrays,
  startWebSocketServer,
};
