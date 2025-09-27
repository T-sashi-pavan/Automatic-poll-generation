// File: apps/backend/src/index.ts
import http from "http";
import app from "./app";
import connectDB from "./web/config/dbconnect";
import { Server } from 'socket.io';
import { setupWebSocket } from './websocket/setup';
const PORT = process.env.PORT || 8000;

const server = http.createServer(app);
// Initialize Socket.IO and attach it to the HTTP server
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5174',
        methods: ["GET", "POST"]
    }
});
setupWebSocket(io);

// Start the server after connecting to the database
const startServer = async () => {
    try {
        await connectDB();
        server.listen(PORT, () => {
            console.log(` Server is running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error(" Failed to start server:", error);
        process.exit(1);
    }
};

startServer();