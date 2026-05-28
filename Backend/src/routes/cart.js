const express = require('express');
const router = express.Router();
const CartController = require('../controllers/cartController');

router.post('/estimate', CartController.estimate);

module.exports = router;
