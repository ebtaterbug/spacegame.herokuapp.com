const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {});
const PORT = process.env.PORT || 3000
app.use(express.static('client'))
// app.get('/', (req, res) => {
//   res.sendFile(__dirname + '/client/game.html')
// })

const FPS = 100
const SHIP_SIZE = 30
const TURN_SPEED = 270
const SHIP_THRUST = 8

players = new Map()
bullets = new Map()

var moon = {
    mass: 10,
    x: 0,
    y: 0,
    r: 100
}

class Bullet {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.mass = 1;
    this.thrust = {
      x: 0,
      y: 0
    }
    this.timer = 60;
    this.id;
    this.r = 5;
  }

  move(){
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

  collision(object) {
      let squareDistance = (this.x-object.x)*(this.x-object.x) + (this.y-object.y)*(this.y-object.y);
      return squareDistance <= ((this.r + object.r) * (this.r + object.r))
  }

}

class Ship {
  constructor() {
      this.x = 100;
      this.y = 100;
      this.r = SHIP_SIZE / 2;
      this.a = 315 / 180 * Math.PI;
      this.rot = 0;
      this.thrusting = false;
      this.thrust = {
          x: 0,
          y: 0
      };
      this.mass = 1;
      this.id
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

  collision(object) {
    let squareDistance = (this.x-object.x)*(this.x-object.x) + (this.y-object.y)*(this.y-object.y);
    return squareDistance <= ((this.r + object.r) * (this.r + object.r))
  }
}


io.on("connection", (socket) => {
    let newPlayer = new Ship()
    newPlayer.id = socket.id
    players.set(socket.id, newPlayer)
  
  socket.on('disconnect', () => {
    players.delete(socket.id)
  })

  socket.on("shoot", () => {
    player = players.get(socket.id)
    bullet = new Bullet(player.x, player.y)
    bullet.thrust.x += 1800 * Math.cos(player.a) / FPS
    bullet.thrust.y -= 1800 * Math.sin(player.a) / FPS
    bullet.id = socket.id
    bullets.set(bullet.x, bullet)
  })

  socket.on("mouseMove", (x1, x2, y1, y2) => {
    players.get(socket.id).a = Math.atan2(
      x2 - x1, 
      y2 - y1
    )+309.43
  })

  socket.on("leftKeyDown", () => {
    players.get(socket.id).rot = TURN_SPEED / 180 * Math.PI / FPS
  })

  socket.on("rightKeyDown", () => {
    players.get(socket.id).rot = -TURN_SPEED / 180 * Math.PI / FPS
  })

  socket.on("left", () => {
    players.get(socket.id).rot += TURN_SPEED / 180 * Math.PI / FPS
  })

  socket.on("right", () => {
    players.get(socket.id).rot += -TURN_SPEED / 180 * Math.PI / FPS
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

  socket.on("thrust", () => {
    if (players.get(socket.id).thrusting == true) {
      players.get(socket.id).thrusting = false
    } else {
      players.get(socket.id).thrusting = true
    }
  })

  setInterval(emit, 2000 / FPS)
    
  function emit(){
    socket.emit("getState", [...players.values()], [...bullets.values()])
  }
})

setInterval(update, 2000 / FPS)
  
function update() {
    for (const [id, ship] of players) {
        ship.rotate()
        ship.move()
        ship.attraction()
        if (ship.collision(moon)) {
            ship.thrust.x = -ship.thrust.x/2
            ship.thrust.y = -ship.thrust.y/2
            // if ((ship.thrust.x > 1 || ship.thrust.y > 1)) {
            //   ship.thrust.x = 0
            //   ship.thrust.y = 0
            //   ship.x = 500
            //   ship.y = 500
            // }
        }
    }
    
    for (const [id, bullet]  of bullets) {
      if (bullet.timer < 1) {
        bullets.delete(id)
      }
      bullet.move()
      bullet.attraction()
      if (bullet.collision(moon)) {
        bullet.thrust.x = -bullet.thrust.x/2
        bullet.thrust.y = -bullet.thrust.y/2
      }
      for (const [id, ship] of players) {
        if (bullet.collision(ship) && (ship.id != bullet.id)) {
          ship.thrust.x = 0
          ship.thrust.y = 0
          ship.x = 500
          ship.y = 500
        }
      }
      bullet.timer -= 1
    }
}

httpServer.listen(PORT)