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
    const { roomid } = url.parse(request.url, true).query;
    if (admins[roomid - 1] === 0) {
      admins[roomid - 1] = 1;
      isAdmin = true;
    } else {
      isAdmin = false;
      students[roomid - 1]++;
    }
    const uuid = uuidv4();
    connections[uuid] = connection;
    users[uuid] = {
      isAdmin: isAdmin,
      state: {},
    };
    const messageData = {
      type: "connect",
      data: users[uuid],
    };
    const message = JSON.stringify(messageData);
    connection.send(message);
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

const handleMessage = (bytes, uuid) => {
  const message = JSON.parse(bytes.toString());
  if (message.type === "codeUpdate" || message.type === "clientUpdate") {
    users[uuid].state = message.data;
    broadcast("codeUpdate", users);
  } else if (message.type === "exit") {
    handleClose(uuid, message.data.id);
  }
};

const handleClose = (uuid, roomid) => {
  if (connections[uuid]) {
    const isAdmin = users[uuid].isAdmin;
    if (isAdmin) {
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
