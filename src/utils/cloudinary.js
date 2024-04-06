import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (file) => {
    try {
        if(!file) return null;
        const res = await cloudinary.uploader.upload(file, {resource_type: "auto"})
        console.log("file uploaded successfully on cloudinary",res.url);
        return res;
    } catch (error) {
        fs.unlinkSync(file); // remove the locally saved temp files as the upload operation failed
        return null;
    }
};

export {uploadOnCloudinary}