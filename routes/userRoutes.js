const { Router } = require("express");
const multer = require('multer');
const path = require('path');
const { checkForAuthentication } = require("../middlewares/authentication");
const {
    createExpense,
    getAllExpenses,
    getExpenseById,
} = require("../controller/userController");
const router = Router();
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Make sure this folder exists
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });


router.post("/create-expense",
    upload.single("profileImage"),
    checkForAuthentication(),
    createExpense);

router.get("/expenses", checkForAuthentication(), getAllExpenses);
router.get("/expensesById", checkForAuthentication(), getExpenseById);

module.exports = router;