const { fetchCodeBlocksFromDb } = require("./mongo");
const { fillArrays } = require("./ws");
const { startWebSocketServer } = require("./ws");
const express = require("express");
const http = require("http");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
startWebSocketServer(server);
const PORT = 8000;
app.use(cors());
var codeblocks;

// endpoints
app.get("/codeblocks", async (req, res) => {
  if (codeblocks) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(codeblocks));
  } else {
    const result = await fetchCodeBlocksFromDb();
    if (result.codeblocks) {
      codeblocks = result.codeblocks;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(codeblocks));
      //Fill admins ans students arrays - using in the ws server
      fillArrays(codeblocks.length);
    } else {
      const errorMessage = result.errorMessage;
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: errorMessage }));
    }
  }
});

server.listen(PORT, async () => {
  console.log(`Server is listening on port ${PORT}`);
});
