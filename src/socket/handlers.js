const roomService = require('../services/roomService');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join_room', ({ roomId, playerName }) => {
      const player = {
        id: socket.id,
        name: playerName,
        role: null,
        isAlive: true,
      };
      const room = roomService.addPlayer(roomId, player);
      
      if (room.error) {
        socket.emit('join_error', { message: room.error });
        return;
      }

      socket.join(roomId);
      io.to(roomId).emit('room_update', room);
    });

    socket.on('start_game', (roomId) => {
      const room = roomService.startGame(roomId);
      if (room) {
        io.to(roomId).emit('game_started', room);
      }
    });

    socket.on('cast_vote', ({ roomId, targetId }) => {
      const result = roomService.castVote(roomId, socket.id, targetId);
      
      if (result?.error) {
        return;
      }

      if (result?.tie) {
        io.to(roomId).emit('vote_tie');
        const room = roomService.getRoom(roomId);
        io.to(roomId).emit('room_update', room);
      } else if (result?.voteFinished) {
        io.to(roomId).emit('game_ended', result.result);
        
        const room = roomService.getRoom(roomId);
        io.to(roomId).emit('room_update', room);
      } else {
        const room = roomService.getRoom(roomId);
        io.to(roomId).emit('room_update', room);
        io.to(roomId).emit('vote_cast', { voterId: socket.id });
      }
    });

    socket.on('kick_player', ({ roomId, targetId }) => {
      const result = roomService.kickPlayer(roomId, socket.id, targetId);
      if (result) {
        io.to(result.roomId).emit('room_update', result.room);
        io.to(result.kickedId).emit('kicked');
      }
    });

    socket.on('back_to_lobby', () => {
      const result = roomService.backToLobby(socket.id);
      if (result) {
        io.to(result.roomId).emit('room_update', result.room);
      }
    });

    socket.on('leave_room', (roomId) => {
      socket.leave(roomId);
      const disc = roomService.removePlayer(socket.id);
      if (disc) {
        io.to(disc.roomId).emit('room_update', disc.room);
      }
    });

    socket.on('disconnect', () => {
      const disc = roomService.removePlayer(socket.id);
      if (disc) {
        io.to(disc.roomId).emit('room_update', disc.room);
      }
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};
