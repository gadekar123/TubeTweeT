import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

const registerUser = asyncHandler(async (req, res, next) => {
    //get user details from the frontend
    const { fullname, email, password, username } = req.body;
    if ([fullname, email, password, username].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "Please provide all required fields")
    }
    const existingUser = await User.findOne({
        $or: [{ email }, { username }]
    })
    if (existingUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "avatar is required")
    }

    const user = await User.create({
        fullname,
        email,
        password,
        username: username.toLowerCase(),
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong, user not created");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User created successfully")
    )
});

const loginUser = asyncHandler(async (req, res, next) => {
    // get the email and password from the frontend
    // then validate if it is in correct format
    // then check if the user exists in the db or not
    // then check if the password is correct
    // then generate a token for the user
    // then send the token to the user using secure cookies
    // then save the token in the db
    // then send the user details to the frontend
    // then handle the error if any
    const { email, password, username } = req.body;
    if (!email && !username) {
        throw new ApiError(400, "Please provide either email or username")
    }

    const findUser = await User.findOne({ $or: [{ email }, { username }] })

    if (!findUser) {
        throw new ApiError(404, "User not found")
    }
    const isPasswordValid = await findUser.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password")
    }
    //now make access and refresh token , many times will be used so will out in one method
    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(findUser._id);

    //send in cookies

    const loggedInUser = await User.findById(findUser._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    } // only server can now modify the cookie

    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(
        new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully")
    )
})


const logoutUser = asyncHandler(async (req, res, next) => {
    //clear cookies and refresh token from the db
    const userId = req.user._id
    const options = {
        httpOnly: true,
        secure: true
    }

    await User.findByIdAndUpdate(
        userId,
        {
            $set: { refreshToken: undefined }
        },
        {
            new: true,
        }
    )

    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(
        new ApiResponse(200, {}, "User logged out successfully")

    )
})

const refereshAccessToken = asyncHandler(async (req, res, next) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request");
    }
    try {
        const decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);


        const user = await User.findById(decoded?.id)

        if (!user) {
            throw new ApiError(404, "invalid refersh token")
        }

        if (user.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "refersh token is expired or invalid")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newrefreshToken } = await generateAccessAndRefereshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newrefreshToken, options)
            .json(new ApiResponse(200, { accessToken, refreshToken: newrefreshToken }, "tokens refreshed successfully"));
    } catch (error) {
        throw new ApiError(401, error?.message|| "error caught while refreshing token")
    }


});


const changeCurrentPassword = asyncHandler(async (req, res, next) => {
    const {currentPassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid password")
    }

    user.password = newPassword;

    await user.save({validateBeforeSave: false});

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"))
});


const getCurrentUser= asyncHandler(async (req, res, next) => {
    return res.status(200).json(new ApiResponse(200, req.user, "Currnet User fetched successfully"));

});

const updateAccountDetails = asyncHandler(async (req, res, next) => {
    const {fullname, email} = req.body;

    if (!fullname && !email) {
        throw new ApiError(400, "Please provide either fullname or email")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {fullname, email}
        },
        {new: true}
    ).select("-password -refreshToken");

    if (!user) {
        throw new ApiError(500, "Something went wrong, user not updated");
    }

    return res.status(200).json(new ApiResponse(200, user, "User updated successfully"));
});


const updateUserAvatar = asyncHandler(async (req, res, next) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar is required")
    }

   const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {avatar: avatar.url}
        },
        {new: true}
    ).select("-password -refreshToken");
    
    if (!user) {
        throw new ApiError(500, "Something went wrong, user avatar not updated");
    }

    return res.status(200).json(new ApiResponse(200, user, "User avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res, next) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "cpver image is required")
    }

   const coverImage= await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "error while uploading cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {coverImage: coverImage.url}
        },
        {new: true}
    ).select("-password -refreshToken");
    
    if (!user) {
        throw new ApiError(500, "Something went wrong, user avatar not updated");
    }

    return res.status(200).json(new ApiResponse(200, user, "User's cover image updated successfully"));
});

export { registerUser, loginUser, logoutUser, refereshAccessToken,changeCurrentPassword, getCurrentUser,updateAccountDetails,updateUserCoverImage,updateUserAvatar}
