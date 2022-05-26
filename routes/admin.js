// this file handles creation of products

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin');
const { getEditProduct } = require("../controllers/admin"); // import middleware function controller
const isAuth = require('../middleware/is-auth');

const {body} = require('express-validator');
const {isLength} = require("validator");

// 'use' allows to add middleware function, pass a function which will be executed for all incoming requests
//app.use((req, res, next) => {
//    console.log("in the middleware");
// use next() for executing other middleware
//    next();
//});


router.get('/add-product', isAuth, adminController.getAddProduct); // pass the controller reference here, and the check the authentication

router.get('/products', isAuth, adminController.getProducts);

router.post(
    '/add-product',
    [
        body('title')
            .isString()
            .isLength({ min: 3 })
            .trim(),
        body('price').isFloat(),
        body('description')
            .isLength({ min: 5, max: 400 })
            .trim()
    ],
    isAuth,
    adminController.postAddProduct // just pass reference
);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

router.post(
  '/edit-product',
  [
    body('title')
      .isString()
      .isLength({ min: 3 })
      .trim(),
    body('price').isFloat(),
    body('description')
      .isLength({ min: 5, max: 400 })
      .trim()
  ],
  isAuth,
  adminController.postEditProduct
);


// when using browser side javaScript to send requests we have access to delete, put and other http words
router.delete('/product/:productId', isAuth, adminController.deleteProduct); // delete requests can have dynamic url parameters


//exports.routes = router;
module.exports = router;// another way to export, you should write "const adminRouts = require('./routes/admin');" in admin.js
