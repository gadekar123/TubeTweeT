import { Router } from "express";
import { registerUser, loginUser, logoutUser, refereshAccessToken, getCurrentUser, getWatchHistory, changeCurrentPassword, updateAccountDetails, updateUserCoverImage, updateUserAvatar, getUserChannelProfile } from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJwt } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 }
]), registerUser)

router.route("/login").post(loginUser)



router.route("/logout").post(verifyJwt, logoutUser)
router.route("/getuser").get(verifyJwt, getCurrentUser)
router.route("/refresh").post(refereshAccessToken)
router.route("/change-password").post(verifyJwt, changeCurrentPassword)
router.route("/update-details").patch(verifyJwt, updateAccountDetails)
router.route("/update-avatar").patch(verifyJwt, upload.single("avatar"), updateUserAvatar)
router.route("/update-cover-image").patch(verifyJwt, upload.single("coverImage"), updateUserCoverImage)
router.route("/c/:username").get(verifyJwt, getUserChannelProfile)
router.route("/watch-history").get(verifyJwt, getWatchHistory)

export default router;