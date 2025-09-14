// require('dotenv').config('./env')

import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: "./env",
});

connectDB()
    .then(() => {
        try {
            app.on("error", (error) => {
                console.log("Error in starting the server", error);
                throw error;
            });

            app.listen(process.env.PORT, () => {
                console.log(`Server is running on port ${process.env.PORT}`);
            });
        } catch (error) {
            console.log("Error in starting the server", error);
        }
    })
    .catch((error) => {
        console.log("Error in DB connection", error);
    });
