import Fastify from "fastify";

const fastify = Fastify({
  logger: true,
});

fastify.get("/", function (request, reply) {
  reply.send({ hello: "world" });
});

const start = async () => {
  const PORT = process.env.PORT || 4000;
  try {
    await fastify.listen({ port: 4000 }, function (err, address) {
      if (err) {
        fastify.log.error(err);
        process.exit(1);
      }
      console.log(`Server is now listening on ${address}`);
    });
  } catch (err) {
    throw new Error("something went wrong while starting server");
  }
};

start();
