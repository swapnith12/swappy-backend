import "fastify"
import { Socket, Server as SocketIOServer } from "socket.io";

declare module "fastify" {
    interface FastifyInstance {
        io: SocketIOServer;
      }
    interface FastifyRequest {
        user?: string 
    }
  }
