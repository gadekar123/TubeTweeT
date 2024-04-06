import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
const registerUser = asyncHandler(async (req, res, next) => {
    //get user details from the frontend
    const {fullname, email, password, username} = req.body;
    if( [fullname, email, password, username].some((field) => field?.trim() === "") ){
        throw new ApiError(400, "Please provide all required fields")
    }
    const existingUser = User.findOne({
        $or: [{ email }, { username }]
    })
    if(existingUser){
        throw new ApiError(409, "User with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath ){
        throw new ApiError(400, "avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : undefined;

    if( !avatar ){
        throw new ApiError(400, "avatar is required")
    }

    User.create({
        fullname,
        email,
        password,
        username: username.toLowerCase(),
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    })
});




export { registerUser}