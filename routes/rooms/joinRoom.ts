import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";
import { io } from "../../src/app"; // Ensure io is correctly imported
import "../../lib/types"; // Ensure Fastify types are properly extended

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
      // Check if the player is already in the room
      const existingPlayer = await prisma.player.findFirst({
        where: { userId, roomId: room.id },
      });

      if (existingPlayer) {
        return reply.send({ message: "Player is already in the room", room });
      }

      // Add player to the room
      const newPlayer = await prisma.player.create({
        data: {
          userId,
          roomId: room.id,
          isHost: false, // Host is assigned only on room creation
        },
      });

      const updatedRoom = await prisma.room.update({
        where: { id: room.id },
        data: {
          players: {
            connect: { id: newPlayer.id }, // Link the new player to the room
          },
          updatedAt: new Date(), // Update timestamp
        },
        include: { players: true }, // Include updated players list
      });

      // Notify all players in the room via Socket.io
      io.to(updatedRoom.id).emit("playerJoined", { room, newPlayer });

      return reply.send({ message: "Player joined successfully", room });
    }
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: "Internal Server Error" });
    }
  });
}
