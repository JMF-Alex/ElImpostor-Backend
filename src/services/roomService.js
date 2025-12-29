const wordsData = require('../words.json');

class RoomService {
  constructor() {
    this.rooms = new Map();
  }

  getRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        players: [],
        gameState: 'lobby',
        secretWord: null,
        category: null,
        impostorId: null,
        leaderId: null,
        votes: {},
        scores: {},
      });
    }
    return this.rooms.get(roomId);
  }

  addPlayer(roomId, player) {
    const room = this.getRoom(roomId);
    player.status = 'lobby';
    room.players.push(player);
    
    if (!room.leaderId) {
      room.leaderId = player.id;
    }

    if (!room.scores[player.id]) {
        room.scores[player.id] = 0;
    }
    return room;
  }

  removePlayer(socketId) {
    for (const [roomId, room] of this.rooms.entries()) {
      const index = room.players.findIndex(p => p.id === socketId);
      if (index !== -1) {
        room.players.splice(index, 1);

        if (room.players.length === 0) {
          this.rooms.delete(roomId);
          return null;
        }

        if (room.leaderId === socketId) {
          room.leaderId = room.players[0].id;
        }

        return { roomId, room };
      }
    }
    return null;
  }

  startGame(roomId) {
    const room = this.rooms.get(roomId);
    if (!room || room.players.length < 3) return null;

    room.gameState = 'playing';
    
    const categoryObj = wordsData[Math.floor(Math.random() * wordsData.length)];
    room.category = categoryObj.category;
    room.secretWord = categoryObj.words[Math.floor(Math.random() * categoryObj.words.length)];
    
    const impostorIndex = Math.floor(Math.random() * room.players.length);
    room.players.forEach((p, index) => {
      p.role = index === impostorIndex ? 'impostor' : 'friend';
      p.status = 'playing';
    });
    room.impostorId = room.players[impostorIndex].id;
    room.votes = {};

    return room;
  }

  castVote(roomId, voterId, targetId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    if (voterId === targetId) return { error: 'Self-voting not allowed' };

    if (targetId === null) {
      delete room.votes[voterId];
    } else {
      room.votes[voterId] = targetId;
    }
    
    const voteFinished = Object.keys(room.votes).length === room.players.length && room.players.length > 0;
    
    if (voteFinished) {
      const voteCounts = {};
      Object.values(room.votes).forEach(id => {
        voteCounts[id] = (voteCounts[id] || 0) + 1;
      });

      let highestVotes = 0;
      let winners = [];
      for (const [id, count] of Object.entries(voteCounts)) {
        if (count > highestVotes) {
          highestVotes = count;
          winners = [id];
        } else if (count === highestVotes) {
          winners.push(id);
        }
      }

      if (winners.length > 1) {
        room.votes = {};
        return { tie: true };
      }

      const ejectedId = winners[0];

      const isImpostorCaught = ejectedId === room.impostorId;
      const result = {
        winner: isImpostorCaught ? 'friends' : 'impostor',
        impostorName: room.players.find(p => p.id === room.impostorId).name,
        secretWord: room.secretWord,
        ejectedName: room.players.find(p => p.id === ejectedId)?.name
      };

      if (isImpostorCaught) {
        room.players.forEach(p => {
          if (p.role === 'friend') {
            room.scores[p.id] = (room.scores[p.id] || 0) + 1;
          }
        });
      } else {
        room.scores[room.impostorId] = (room.scores[room.impostorId] || 0) + 3;
      }

      room.gameState = 'ended';
      room.votes = {};
      
      return { voteFinished: true, result };
    }

    return { voteFinished: false };
  }

  backToLobby(socketId) {
    for (const [roomId, room] of this.rooms.entries()) {
      const player = room.players.find(p => p.id === socketId);
      if (player) {
        player.status = 'lobby';
        
        const everyoneBack = room.players.every(p => p.status === 'lobby');
        if (everyoneBack) {
          room.gameState = 'lobby';
          room.secretWord = null;
          room.category = null;
          room.impostorId = null;
          room.votes = {};
        }
        return { roomId, room };
      }
    }
    return null;
  }

  kickPlayer(roomId, leaderId, targetId) {
    const room = this.rooms.get(roomId);
    if (!room || room.leaderId !== leaderId) return null;

    const index = room.players.findIndex(p => p.id === targetId);
    if (index !== -1) {
      room.players.splice(index, 1);
      return { roomId, room, kickedId: targetId };
    }
    return null;
  }
}

module.exports = new RoomService();
