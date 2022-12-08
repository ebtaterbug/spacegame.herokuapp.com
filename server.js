const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { /* options */ });
const PORT = process.env.PORT || 3000
app.use(express.static('client'))


const FPS = 100
const SHIP_SIZE = 30
const TURN_SPEED = 180
const SHIP_THRUST = 7

players = new Map()

var moon = {
    mass: 10,
    x: 500,
    y: 500
}

class Ship {
  constructor() {
      this.x = 50;
      this.y = 50;
      this.r = SHIP_SIZE / 2;
      this.a = 90 / 180 * Math.PI;
      this.rot = 0;
      this.thrusting = false;
      this.thrust = {
          x: 0,
          y: 0
      };
      this.mass = 1;
  }

  rotate(){
      this.a += this.rot
  }

  move(){
      if(this.thrusting) {
          this.thrust.x += SHIP_THRUST * Math.cos(this.a) / FPS
          this.thrust.y -= SHIP_THRUST * Math.sin(this.a) / FPS
      }

      this.x += this.thrust.x
      this.y += this.thrust.y
  }

  attraction() {  
      const sx = this.x;
      const sy = this.y;
      const ox = moon.x;
      const oy = moon.y;
      const dx = ox-sx;
      const dy = oy-sy;
      const d = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));

      if (d==0) return [0, 0];

      const F = 10000 * this.mass * moon.mass / Math.pow(d, 2);

      const o = Math.atan2(dy, dx);
      const Fx = Math.cos(o) * F;
      const Fy = Math.sin(o) * F;
      
      this.thrust.x += Fx / FPS
      this.thrust.y += Fy / FPS
  }

  moonCollision() {
      let squareDistance = (this.x-moon.x)*(this.x-moon.x) + (this.y-moon.y)*(this.y-moon.y);
      return squareDistance <= ((15 + 100) * (15 + 100))
  }
}


io.on("connection", (socket) => {
    let newPlayer = new Ship()
    players.set(socket.id, newPlayer)
  
  socket.on('disconnect', () => {
    players.delete(socket.id)
  })

  socket.on("leftKeyDown", () => {
    players.get(socket.id).rot = TURN_SPEED / 180 * Math.PI / FPS
  })

  socket.on("rightKeyDown", () => {
    players.get(socket.id).rot = -TURN_SPEED / 180 * Math.PI / FPS
  })

  socket.on("upKeyDown", () => {
    players.get(socket.id).thrusting = true
   })

  socket.on("leftKeyUp", () => {
    players.get(socket.id).rot = 0
  })

  socket.on("rightKeyUp", () => {
    players.get(socket.id).rot = 0
  })

  socket.on("upKeyUp", () => {
    players.get(socket.id).thrusting = false
  })

// Game Loop
setInterval(update, 2000 / FPS)
  
function update() {
    for (const [id, ship] of players) {
        ship.rotate()
        ship.move()
        ship.attraction()
        if (ship.moonCollision()) {
            ship.thrust.x = -ship.thrust.x/2
            ship.thrust.y = -ship.thrust.y/2
        }
    }
    socket.emit("getPlayers", [...players.values()])
}
  
})


httpServer.listen(PORT)