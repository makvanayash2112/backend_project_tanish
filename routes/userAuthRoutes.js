const { Router } = require("express");
const { checkForAuthentication } = require("../middlewares/authentication");
const {
  loginUser,
  createPlanPassing,
  getAllPlans,
  getPlanByOrderId,
  updateGeneralDetails,
  updatePaymentDetails,
  adminCreateUser,
  addFundsToUser,
  getAllUsers,
  getUserById,
} = require("../controller/userAuthController");
const router = Router();

router.post("/login", loginUser);
router.post("/create-plan-passing", checkForAuthentication(), createPlanPassing);
router.get("/get-all-plans", checkForAuthentication(), getAllPlans);
router.post("/get-plan-by-order-id", checkForAuthentication(), getPlanByOrderId);
router.put("/update-general-details", checkForAuthentication(), updateGeneralDetails);
router.put("/update-payment-details", checkForAuthentication(), updatePaymentDetails);
router.post("/admin-create-user", checkForAuthentication(), adminCreateUser);
router.post("/add-funds-to-user", checkForAuthentication(), addFundsToUser);
router.get("/get-all-users", checkForAuthentication(), getAllUsers);
router.get("/get-user-by-id", checkForAuthentication(), getUserById);

module.exports = router;