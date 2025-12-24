const { Router } = require("express");
const { checkForAuthentication } = require("../middlewares/authentication");
const {
  signupWithEmail,
  unifiedLogin,
  resendVerificationLink,
  logoutUser
} = require("../controller/userAuthController");
const router = Router();

router.post("/signup/email", signupWithEmail);

router.post("/resendVerificationLink", resendVerificationLink);

router.post("/login", unifiedLogin);

router.post("/logout", checkForAuthentication(), logoutUser);

module.exports = router;