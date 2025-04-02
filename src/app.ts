import Fastify , {FastifyReply,FastifyRequest}  from 'fastify';
import { prisma } from "../lib/prisma";
import bcrypt from "bcrypt";
import {createServer} from "http";
import {Server} from "socket.io"
import "../lib/types"


const fastify = Fastify({
  logger: true, 
});

const server = createServer(fastify.server);

export const io = new Server(server, {
  cors: {
    origin: "*", 
  },
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

  

  const decoded = await bcrypt.compare(token,session.sessionToken)
  req.user = decoded;
  return reply.status(200).send({user:"You got access"})
} catch (err) {
  return reply.status(401).send({ error: "Unauthorized: Invalid token" });
}
});

fastify.get("/" ,(req: FastifyRequest, reply: FastifyReply) => {
  if(req.user){
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
