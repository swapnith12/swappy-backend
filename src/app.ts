import Fastify , {FastifyReply,FastifyRequest}  from 'fastify';
import { prisma } from "../lib/prisma";
import fastifySocketIO from 'fastify-socket.io';
import "../lib/types"
import {createRoom} from "../routes/rooms/createRoom"
import {joinRoom} from "../routes/rooms/joinRoom"
import fastifyCors from '@fastify/cors';
import { Socket } from 'socket.io';
// import {Redis} from '@upstash/redis'
// import { publicEncrypt } from 'crypto';
// import { count, error } from 'console';

// const CONNECTION_COUNT = 'chat:connection_count'
// const CONNECTION_COUNT_UPDATED_CHANNEL = 'chat:updated_count'

// const publisher = new Redis({
//   url: process.env.UPSTASH_REDIS,
//   token: process.env.UPSTASH_REDIS_TOKEN,
// })

// const subscriber = new Redis({
//   url: process.env.UPSTASH_REDIS,
//   token: process.env.UPSTASH_REDIS_TOKEN,
// })

// const connection_count = await publisher.get(CONNECTION_COUNT)
// if(!connection_count){
//   await publisher.set(CONNECTION_COUNT,0)
// }

// try{subscriber.subscribe(CONNECTION_COUNT_UPDATED_CHANNEL)}
// catch(err:any){ throw new Error(err.message)}

// await subscriber.subscribe('message',()=>{})

const rooms:any= {}
let guessWord: string 

const fastify = Fastify({
  logger: false, 
});

fastify.register(fastifySocketIO,{ cors: {
  origin: true,
}})
fastify.register(fastifyCors,{
  origin:true,
  credentials:true
})
fastify.register(createRoom)
fastify.register(joinRoom)
const words = ["apple","bubble","air","iphone","water","TV","AI","hologram","movie","nothing","internet","1+1","god","moon","heroine","bananna","stool","playstation","camel","lion","mustache"]
fastify.ready().then(() => {
    fastify.io.on("connection", async(socket:any) => {
    // const newCount = await publisher.incr(CONNECTION_COUNT)
    // await publisher.publish(CONNECTION_COUNT_UPDATED_CHANNEL,newCount)
    console.log("Socket connected:", socket.id);
    
    socket.on("roomCreated", ({ roomCode, hostID }: any) => { 
      console.log(`Host ${hostID} created and joined room ${roomCode}`);
      rooms[roomCode]={
        host:hostID,
        socketID:socket.id,
        playersList:[{id:socket.id,player:hostID,score:0,host:true}]
      }
      socket.to(roomCode).emit("hostJoined", { hostID });
    });

    socket.on("joinRoom", ({ roomCode, userID }: any) => {
      const room=rooms[roomCode]
      if(room && room.playersList.length >= 0){
      room.playersList.push({id:socket.id, name: userID,score:0,host:false });
      socket.join(roomCode);
      console.log(`User ${userID} joined room ${roomCode}`);

      socket.to(roomCode).emit("playerJoined", {
        userID,
        message: `Player ${userID} has joined the room.`,
      });
      } else {
        socket.emit('error', 'Room full or does not exist');
       }
    });


    socket.on("chatMessage", ({ roomId, message, sender }: any) => {
      console.log("Received message:", message, "from", sender, "in room", roomId);
      socket.to(roomId).emit("receiveMessage", { message, sender });
      if(guessWord === message.toLowerCase()){
          socket.to(roomId).emit("CorrectGuess",{sender})
          const room = rooms[roomId]
          const currentHost = room.playersList.filter((p: { id: any; })=> p.id === socket.id)
          let currentHostIndex = room.playersList.indexOf(currentHost)
          if (currentHostIndex!==room.playersList.length && room.playersList.length!==1){
            rooms.playersList[currentHostIndex].host=false
             currentHostIndex=currentHostIndex+1
             rooms.playersList[currentHostIndex].host=true
             socket.to(roomId).emit("Now host is",rooms.playersList[currentHostIndex].name)
          }
          else if ( room.playersList.length!==1){
            rooms.playersList[currentHostIndex].host=false
            currentHostIndex=currentHostIndex-1
            rooms.playersList[currentHostIndex].host=true
            socket.to(roomId).emit("Now host is",rooms.playersList[currentHostIndex].name)
          }
          else {
            socket.to(roomId).emit("Add more players for mazaa!!")
          }
      }
    });

    socket.on("onDraw", ({ roomId, drawingData }:any) => {
      socket.to(roomId).emit("onDraw", drawingData);
    });

    socket.on("clearBoard", () => {
      socket.broadcast.emit("clearBoard");
    });
    
    socket.on("guessWord", (roomId: any) => {
      console.log(`Server received 'guessWord' event for room: ${roomId}`);
      guessWord = words[Math.floor(Math.random() * words.length)];
      console.log(`Server emitting 'guessWord': ${guessWord} to room: ${roomId}`);
      socket.to(roomId).emit('guessWord', guessWord);
    });

    socket.on("disconnect", async() => {
      // const newCount = await publisher.decr(CONNECTION_COUNT)
      // await publisher.publish(CONNECTION_COUNT_UPDATED_CHANNEL,newCount)
      console.log(`User disconnected: ${socket.id}`);
      
      for (const roomCode in rooms) {
          const room = rooms[roomCode];
          const playerLeft = room.playersList.filter((p: { id: any; })=> p.id === socket.id)
          if(playerLeft.host===true){
            if(room.playersList.length!==0){
            socket.to(roomCode).emit('Host left the room');
            const indexOfPlayer = room.playersList.indexOf(playerLeft)
            room.playersList[indexOfPlayer+1].host=true
            socket.emit("NewHost",room.playersList[indexOfPlayer].name)
            }
            else{
              delete rooms[roomCode];
              console.log(`Room ${roomCode} deleted`);
            }
          }
          else if (room.playersList.some((p: { id: any; })=> p.id === socket.id)) {
              socket.to(roomCode).emit('Player Left');
              console.log(`User left room ${roomCode}, notifying opponent`);
              room.playersList=room.playersList.filter((p: { id: any; })=>p.id!==socket.id)
              if(room.playersList.length===0){
              delete rooms[roomCode];
              }else if (room.playersList.length>1 )
              console.log(`Room ${roomCode} deleted`);
              break;
          }
      }
    });
  });
});


fastify.addHook("preHandler", async (req: FastifyRequest, reply: FastifyReply ) => {
try {
  console.log("entered Middleware")
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Unauthorized: No token provided" });
  }


  const token = authHeader.split(" ")[1];

  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
  });

  if (!session) {
    return reply.status(401).send({ error: "Unauthorized: Invalid session" });
  }

  req.user = session.userId;
  // return reply.status(200).send({user:"You got access"})
} catch (err) {
  return reply.status(401).send({ error: "Unauthorized: Invalid token" });
}
});

fastify.get("/" ,(req: FastifyRequest, reply: FastifyReply) => {
  if(req.user!==undefined || null){
  return reply.send({ message: "You have access!"});}
  else reply.status(401).send({message:"Unauthorised request"})
});


const start = async () => {
  const PORT = process.env.PORT || 4000;
  const HOST = '0.0.0.0'
  try {
    await fastify.listen({ port: Number(PORT) , host: HOST});
    console.log(`Server is now listening on http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();