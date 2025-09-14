import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// cors configuration
app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    })
);

app.use(express.json({limit: '16mb'}));   // to parse json body in app requests

app.use(express.urlencoded({ extended: true, limit: '16mb' })); // to parse urlencoded body in app requests

app.use(express.static("public")); // to serve static files from public

app.use(cookieParser()); // to parse cookies in app requests

export { app };
