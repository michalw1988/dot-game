var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(process.env.PORT || 2000);
console.log("Server started.");

var SOCKET_LIST = {};
var PLAYER_LIST = {};
var FACTORY_LIST = {};
var BULLET_LIST = {};

var walls = [];
walls.push({x:0,y:0,width:1000,height:10});
walls.push({x:990,y:0,width:10,height:600});
walls.push({x:0,y:590,width:1000,height:10});
walls.push({x:0,y:0,width:10,height:600});

walls.push({x:130,y:0,width:10,height:200});
walls.push({x:0,y:190,width:80,height:10});
walls.push({x:860,y:400,width:10,height:200});
walls.push({x:920,y:400,width:80,height:10});

walls.push({x:130,y:300,width:10,height:230});
walls.push({x:130,y:520,width:630,height:10});
walls.push({x:860,y:70,width:10,height:230});
walls.push({x:240,y:70,width:630,height:10});
walls.push({x:0,y:0,width:0,height:0});
walls.push({x:0,y:0,width:0,height:0});
walls.push({x:0,y:0,width:0,height:0});


var Bullet = function(id,x,y,angle,parentId){
	var self = {
		id:id,
		x:x,
		y:y,
		angle:angle,
		spdX:Math.cos(angle*Math.PI/180) * 6,
		spdY:Math.sin(angle*Math.PI/180) * 6,
		parentId:parentId,
		color:PLAYER_LIST[parentId].team,
	}
	self.updatePosition = function(){
		self.x += self.spdX;
		self.y += self.spdY;
		if (isCollision(5,self.x,self.y)){
			delete BULLET_LIST[self.id];
		}
		else if (isSomeoneHit(self.x,self.y,self.parentId)){
			delete BULLET_LIST[self.id];
		}
		
	}
	return self;
}

var Player = function(id){
	var self = {
		x:0,
		y:0,
		id:id,
		name:"",
		team:"",
		angle:Math.random()*360,
		score:0,
		maxSpd:3,
		pressingRight:false,
		pressingLeft:false,
		pressingUp:false,
		pressingDown:false,
		ammo:100,
		hp:100,
	}
	self.updatePosition = function(){
		if(self.pressingRight && isCollision(1,self.x,self.y) !== true)
			self.x += self.maxSpd;
		if(self.pressingLeft && isCollision(3,self.x,self.y) !== true)
			self.x -= self.maxSpd;
		if(self.pressingUp && isCollision(4,self.x,self.y) !== true)
			self.y -= self.maxSpd;
		if(self.pressingDown && isCollision(2,self.x,self.y) !== true)
			self.y += self.maxSpd;
	}
	return self;
}

var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;
	
	var player = Player(socket.id);
	PLAYER_LIST[socket.id] = player;
	
	socket.on('disconnect',function(){
		delete SOCKET_LIST[socket.id];
		delete PLAYER_LIST[socket.id];
	});
	
	socket.on('keyPress',function(data){
		if(data.inputId === 'left')
			player.pressingLeft = data.state;
		else if(data.inputId === 'right')
			player.pressingRight = data.state;
		else if(data.inputId === 'up')
			player.pressingUp = data.state;
		else if(data.inputId === 'down')
			player.pressingDown = data.state;
		else if(data.inputId === 'angle')
			player.angle = data.angle;
		else if(data.inputId === 'click' && player.ammo > 0){
			player.ammo--;
			var id = Math.random();
			var bullet = Bullet(id,player.x,player.y,player.angle,player.id);
			bullet.updatePosition();
			BULLET_LIST[id] = bullet;
		}
	});
	
	
	socket.on('playerJoined',function(data){
		player.name = data.name;
		player.team = data.team;
		
		if(data.team === 'red'){
			player.x = Math.random()*100+20;
			player.y = Math.random()*100+20;
		} else {
			player.x = Math.random()*100+880;
			player.y = Math.random()*100+480;
		}
	});
	
	socket.emit('initPack',{
		selfId:socket.id,
		walls:walls,
	});
});

setInterval(function(){
	var pack = [];
	var bullets_pack = [];
	for(var i in PLAYER_LIST){
		var player = PLAYER_LIST[i];
		player.updatePosition();
		pack.push({
			x:player.x,
			y:player.y,
			name:player.name,
			team:player.team,
			angle:player.angle,
			score:player.score,
			id:SOCKET_LIST[i].id,
			ammo:player.ammo,
			hp:player.hp,
		});	
	}
	for (var i in BULLET_LIST){
		var bullet = BULLET_LIST[i];
		bullets_pack.push({
			x:bullet.x,
			y:bullet.y,
			angle:bullet.angle,
			color:bullet.color,
		});
		bullet.updatePosition();
	}
	for(var i in SOCKET_LIST){
		var socket = SOCKET_LIST[i];
		socket.emit('updatePack',{pack,bullets_pack});
	}
},1000/25);

var isCollision = function(type, selfX, selfY){ // 1-right 2-down 3-left 4-up 5-bullet
	var posX = selfX;
	var posY = selfY;
	for (var i in walls){
		var wall = walls[i];
		
		if (type === 1 &&
			posX+5 + 3 > wall.x && 
			posX-5 + 3 < wall.x + wall.width && 
			posY+5 > wall.y &&
			posY-5 < wall.y + wall.height
		){
			return true;
		}
		else if (type === 2 &&
			posX+5 > wall.x && 
			posX-5 < wall.x + wall.width && 
			posY+5 + 3 > wall.y &&
			posY-5 + 3 < wall.y + wall.height
		){
			return true;
		}
		else if (type === 3 &&
			posX+5 - 3 > wall.x && 
			posX-5 - 3 < wall.x + wall.width && 
			posY+5 > wall.y &&
			posY-5 < wall.y + wall.height
		){
			return true;
		}
		else if (type === 4 &&
			posX+5 > wall.x && 
			posX-5 < wall.x + wall.width && 
			posY+5 - 3 > wall.y &&
			posY-5 - 3 < wall.y + wall.height
		){
			return true;
		}
		else if (type === 5 &&
			posX > wall.x && 
			posX < wall.x + wall.width && 
			posY > wall.y &&
			posY < wall.y + wall.height
		){
			return true;
		}
	}
}

var isSomeoneHit = function(bulletX,bulletY,parentId){
	for (var i in PLAYER_LIST){
		var player = PLAYER_LIST[i];
		var d = Math.sqrt( (bulletX-player.x)*(bulletX-player.x) + (bulletY-player.y)*(bulletY-player.y) );
		if (d < 5){
			PLAYER_LIST[i].hp -= 20;
			if(PLAYER_LIST[i].hp <= 0){
				PLAYER_LIST[i].hp = 100;
				PLAYER_LIST[i].ammo = 100;
				PLAYER_LIST[parentId].score++;
				if(PLAYER_LIST[i].team === 'red'){
					player.x = Math.random()*100+20;
					player.y = Math.random()*100+20;
				} else {
					player.x = Math.random()*100+880;
					player.y = Math.random()*100+480;
				}
			}
			return true;
		}
	}
}












