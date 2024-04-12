import { Router } from "express";
import { registerUser,loginUser, logoutUser, refereshAccessToken,getCurrentUser ,changeCurrentPassword,updateAccountDetails,updateUserCoverImage,updateUserAvatar} from "../controllers/user.controllers.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJwt } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(upload.fields([
    {name: "avatar", maxCount: 1},
    {name: "coverImage", maxCount: 1}
]),registerUser)

router.route("/login").post(loginUser)
router.route("/getuser").get(verifyJwt,getCurrentUser)
router.route("/change-password").post(verifyJwt,changeCurrentPassword)
router.route("/update-details").put(verifyJwt,updateAccountDetails)
router.route("/update-avatar").put(verifyJwt,upload.single("avatar"),updateUserAvatar)
router.route("/update-cover-image").put(verifyJwt,upload.single("coverImage"),updateUserCoverImage)
//secured routes 
router.route("/logout").post(verifyJwt,logoutUser)
router.route("/refresh").post(refereshAccessToken)

export default router;