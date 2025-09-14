// for saving the files in server or cloudinary

import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY, // Click 'View API Keys' above to copy your API key
    api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View API Keys' above to copy your API secret
});


const uploadOnCloudinary = async (localFilePath) => {
    try{
        if (!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto", // jpeg, png gif, pdf, mp4
            folder: "PlayApp", // optional folder name to save the file in cloudinary
        })
        // file uploaded on cloudinary successfully
        console.log("File is uploaded on cloudinary ",response.url);
        return response;
    }
    catch(error){
        fs.unlinkSync(localFilePath); // remove the file from local uploads folder if it is not uploaded on cloudinary on some error
        return null;
    }
}

