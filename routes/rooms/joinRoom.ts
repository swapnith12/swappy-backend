import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";
import "../../lib/types"; 

export async function joinRoom(fastify: FastifyInstance) {
  fastify.post("/joinRoom", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId, code } = req.body as { userId: string; code: string };

      if (!code) {
        return reply.status(400).send({ error: "Room code is required" });
      }

      let room = await prisma.room.findUnique({
        where: { code },
        include: { players: true },
      });

      if (!room) {
        return reply.status(404).send({ error: "Room not found" });
      }
      else{
      
      const existingPlayer = await prisma.player.findFirst({
        where: { userId, roomId: room.id },
      });

      if (existingPlayer) {
        return reply.send({ message: "Player is already in the room", room });
      }

      const roomSize = await prisma.player.count({
        where:{
          roomId:room.id
        }
      })
      if (roomSize==4){reply.status(500).send({ error: "room is full" });}
      const newPlayer = await prisma.player.create({
        data: {
          userId,
          roomId: room.id,
          isHost: false, 
        },
      });

      const updatedRoom = await prisma.room.update({
        where: { id: room.id },
        data: {
          players: {
            connect: { id: newPlayer.id }, 
          },
          updatedAt: new Date(),
        },
        include: { players: true },
      });

      fastify.io.to(updatedRoom.id).emit("playerJoined", { room, newPlayer });

      return reply.send({ message: "Player joined successfully", room });
    }
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: "Internal Server Error" });
    }
  });
}
