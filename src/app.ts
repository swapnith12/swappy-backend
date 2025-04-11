import Fastify , {FastifyReply,FastifyRequest}  from 'fastify';
import { prisma } from "../lib/prisma";
import fastifySocketIO from 'fastify-socket.io';
import "../lib/types"
import {createRoom} from "../routes/rooms/createRoom"
import {joinRoom} from "../routes/rooms/joinRoom"
import fastifyCors from '@fastify/cors';
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

fastify.ready().then(() => {
  fastify.io.on("connection", async(socket:any) => {
    // const newCount = await publisher.incr(CONNECTION_COUNT)
    // await publisher.publish(CONNECTION_COUNT_UPDATED_CHANNEL,newCount)
    console.log("Socket connected:", socket.id);
    
    socket.on("roomCreated", ({ roomCode, hostID }: any) => {
      socket.join(roomCode); 
      console.log(`Host ${hostID} created and joined room ${roomCode}`);

      fastify.io.to(roomCode).emit("hostJoined", { hostID });
    });

    socket.on("joinRoom", ({ roomCode, userID }: any) => {
      socket.join(roomCode);
      console.log(`User ${userID} joined room ${roomCode}`);

      fastify.io.to(roomCode).emit("playerJoined", {
        userID,
        message: `Player ${userID} has joined the room.`,
      });
    });


    socket.on("chatMessage", ({ roomId, message, sender }: any) => {
      console.log("Received message:", message, "from", sender, "in room", roomId);
      fastify.io.to(roomId).emit("receiveMessage", { message, sender });
    });

    socket.on("onDraw", ({ roomId, drawingData }:any) => {
      socket.to(roomId).emit("onDraw", drawingData);
    });

    socket.on("clearBoard", () => {
      socket.broadcast.emit("clearBoard");
    });

    socket.on("disconnect", async() => {
      // const newCount = await publisher.decr(CONNECTION_COUNT)
      // await publisher.publish(CONNECTION_COUNT_UPDATED_CHANNEL,newCount)
      console.log("Socket disconnected:", socket.id);
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
  try {
    await fastify.listen({ port: Number(PORT) });
    console.log(`Server is now listening on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();