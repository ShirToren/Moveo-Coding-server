const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
const url = require("url");
const uuidv4 = require("uuid").v4;

const app = express();
const server = http.createServer(app);
const wsServer = new WebSocket.Server({ server });
const PORT = process.env.PORT || 8000;
const MONGODB_URI = `mongodb+srv://2karinaoist:OistrachK@bether.ledfzng.mongodb.net/?retryWrites=true&w=majority`;
var numOfClients = 0;
app.use(cors());
const connections = {};
const users = {};
const admins = [];
const students = [];
let isAdmin = false;
let codeblocks = [];
let errorMessage;

const client = new MongoClient(MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const fetchCodeBlocksFromDb = async () => {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB");
    const db = client.db("BeTher");
    codeblocks = await db.collection("CodeBlocks").find({}).toArray();
  } catch (error) {
    errorMessage = error.message;
    console.log(errorMessage);
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
};

const fillArrays = () => {
  if (codeblocks) {
    admins.length = codeblocks.length;
    students.length = codeblocks.length;
    admins.fill(0);
    students.fill(0);
  }
};

const initializeServer = async () => {
  await fetchCodeBlocksFromDb();
  fillArrays();
};

// endpoints
app.get("/", (req, res) => {
  res.send("Hello World! This is an Express server with WebSocket.");
});

app.get("/codeblocks", async (req, res) => {
  if (codeblocks) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(codeblocks));
  } else {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: errorMessage }));
  }
});

app.get("/numOfClients", (req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(numOfClients));
});

// webSocket server

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
  if (message.type === 2 || message.type === 3) {
    users[uuid].state = message.data;
    broadcast(2, users);
  } else if (message.type === 4) {
    handleClose(uuid, message.data.id, message.data.isAdmin);
  }
};

const handleClose = (uuid, roomid, isAdmin) => {
  //console.log(`${users[uuid].username} disconnected`);
  //console.log("leaving room" + roomid);
  if (isAdmin) {
    admins[roomid - 1] = 0;
    broadcast(5, roomid);
    students[roomid - 1] = 0;
  } else {
    students[roomid - 1]--;
  }
  broadcast(3, students);
  delete connections[uuid];
  delete users[uuid];
};

wsServer.on("connection", (connection, request) => {
  // console.log(admins);
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
    type: 1,
    data: users[uuid],
  };
  const message = JSON.stringify(messageData);
  connection.send(message);
  broadcast(3, students);

  connection.on("message", (message) => handleMessage(message, uuid));
});

server.listen(PORT, async () => {
  console.log(`Server is listening on port ${PORT}`);
  initializeServer();
});
