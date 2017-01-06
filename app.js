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

var Factory = function(x,y){
	var self = {
		x:x,
		y:y,
	}
	return self;
}

FACTORY_LIST[0] = Factory(75,300);
FACTORY_LIST[1] = Factory(120,150);
FACTORY_LIST[2] = Factory(120,450);
FACTORY_LIST[3] = Factory(250,50);
FACTORY_LIST[4] = Factory(250,550);
FACTORY_LIST[5] = Factory(400,190);
FACTORY_LIST[6] = Factory(400,410);

FACTORY_LIST[7] = Factory(600,190);
FACTORY_LIST[8] = Factory(600,410);
FACTORY_LIST[9] = Factory(750,50);
FACTORY_LIST[10] = Factory(750,550);
FACTORY_LIST[11] = Factory(880,150);
FACTORY_LIST[12] = Factory(880,450);
FACTORY_LIST[13] = Factory(925,300);

var Player = function(id){
	var self = {
		x:250,
		y:250,
		id:id,
		name:"",
		team:"",
		pressingRight:false,
		pressingLeft:false,
		pressingUp:false,
		pressingDown:false,
		maxSpd:10,
		score:0,
	}
	self.updatePosition = function(){
		if(self.pressingRight)
			self.x += self.maxSpd;
		if(self.pressingLeft)
			self.x -= self.maxSpd;
		if(self.pressingUp)
			self.y -= self.maxSpd;
		if(self.pressingDown)
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
	});
	
	
	socket.on('playerJoined',function(data){
		player.name = data.name;
		player.team = data.team;
	});
	
	socket.emit('initPack',{
		selfId:socket.id,
	});
});

setInterval(function(){
	var pack = [];
	var factories = [];
	for(var i in PLAYER_LIST){
		var player = PLAYER_LIST[i];
		player.updatePosition();
		pack.push({
			x:player.x,
			y:player.y,
			name:player.name,
			team:player.team,
			score:player.score,
			id:SOCKET_LIST[i].id,
		});	
	}
	for (var i in FACTORY_LIST){
		var factory = FACTORY_LIST[i];
		factories.push({
			x:factory.x,
			y:factory.y,
		});
	}
	for(var i in SOCKET_LIST){
		var socket = SOCKET_LIST[i];
		socket.emit('updatePack',{pack,factories});
	}
},1000/25);