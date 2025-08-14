// /services/seatmap-extractor/src/server.ts
import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { graphqlUploadExpress, GraphQLUpload } from "graphql-upload-minimal";
import { readFile } from "node:fs/promises";
import cors from "cors";
import { resolvers as baseResolvers } from "./graphql/resolvers.js";

const PORT = Number(process.env.PORT || 4002);

async function main() {
    const typeDefs = await readFile(new URL("./graphql/schema.graphql", import.meta.url), "utf8");

    const resolvers = {
        Upload: GraphQLUpload as any,
        ...baseResolvers,
    };

    const server = new ApolloServer({ typeDefs, resolvers });
    await server.start();

    const app = express();
    app.use(cors({ origin: true, credentials: true }));
    app.use("/graphql", graphqlUploadExpress({ maxFileSize: 20 * 1024 * 1024, maxFiles: 1 }), express.json(), expressMiddleware(server));

    app.get("/healthz", (_req, res) => res.json({ ok: true }));
    app.listen(PORT, () => {
        console.log(`✅ Seatmap Extractor läuft auf http://localhost:${PORT}/graphql`);
    });
}

main().catch((err) => {
    console.error("Seatmap Extractor start failed:", err);
    process.exit(1);
});
