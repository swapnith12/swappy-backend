import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";
import "../../lib/types"


export async function createRoom(fastify: FastifyInstance) {
  fastify.post("/createRoom", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = req.body as { userId: string }; 
      const { code } = req.body as { code: string };

      if (!code) {
        return reply.status(400).send({ error: "Room code is required" });
      }

      let room = await prisma.room.findUnique({
        where: { code },
        include: { players: true },
      });

      if (!room) {
        room = await prisma.room.create({
          data: {
            code,
            createdById: userId,
            hostId: userId,
          },
          include: { players: true },
        });

        // Add creator as a player in the room
        await prisma.player.create({
          data: {
            userId,
            roomId: room.id,
            isHost: true,
          },
        });
      }

      fastify.io.emit("roomCreated",{roomCode:code,hostID:userId})

      return reply.send({ room });
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: "Internal Server Error" });
    }
  });
}
