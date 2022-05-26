const Product = require('../models/product');// import product schema
const { validationResult } = require('express-validator');
const fileHelper = require('../util/file'); // for deleting files

exports.getAddProduct = (req, res, next) => {
    res.render('admin/edit-product', { // just displaying
        pageTitle: 'Add Product',
        path: '/admin/add-product',
        editing: false,
        hasError: false,
        errorMessage: null,
        validationErrors: []
    });
};


exports.postAddProduct = (req, res, next) => { // getting data from front
  const title = req.body.title;
  const image = req.file; // getting image as file
  const price = req.body.price;
  const description = req.body.description;

 if (!image) { // in case user submits non image file dont accept it and desplay corresponding message
   return res.status(422).render('admin/edit-product', {
     pageTitle: 'Add Product',
     path: '/admin/add-product',
     editing: false,
     hasError: true,
     product: {
       title: title,
       price: price,
       description: description
     },
     errorMessage: 'Attached file is not an image',
     validationErrors: []
   });
 }

  const errors = validationResult(req); // getting all errors as an array

  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }

  const imageUrl = image.path; // getting image url

    const product = new Product({
        title: title,
        price: price,
        description: description,
        imageUrl: imageUrl,
        userId: req.user // store user id when creating product // I deleted ._id
    });
    product
        .save()
        .then(result => {
            // console.log(result);
            console.log('Created Product');
            res.redirect('/admin/products');
        })
        .catch(err => {
            return res.status(500).render('admin/edit-product', { // dont forget to set status
                pageTitle: 'Add Product',
                path: '/admin/add-product',
                editing: false,
                hasError: true,
                product: {
                    title: title,
                    imageUrl: imageUrl,
                    price: price,
                    description: description
                },
                errorMessage: errors.array()[0].msg,
                validationErrors: errors.array()
            });


           res.redirect('/500'); // we wrote a controller and registered route for this path


        });
};



exports.getProducts = (req, res, next) => {
Product.find({userId: req.user._id}) // we extracted user in app js middleware
      .then(products => {
          console.log(products);
        res.render('admin/products', {
          prods: products,
          pageTitle: 'Admin-Products',
          path: '/admin/products',
        });
      })
      .catch(err => {
          const error = new Error(err);
          error.httpStatusCode = 500;
          return next(error); // goes directly to error handling middleware
      });
};


exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit; // query comes from url, ? &. This value is always string, convert it to what you like
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId; // comes from front, id of product to be updated
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product, // now we have product in the view. Note that prods is an array in which [0] is the one we searched
        hasError: false,
        errorMessage: null,
        validationErrors: []
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error); // goes directly to error handling middleware
    });
};



exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId; // getting new values for fields
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;

  const errors = validationResult(req); // getting array of errors

  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      hasError: true,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
        _id: prodId
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }

  Product.findById(prodId)
    .then(product => {
      if (product.userId.toString() !== req.user._id.toString()) { // in order to compare ids make them string
        return res.redirect('/'); // don't allow user to edit other users products
      }
      product.title = updatedTitle; // update values to new ones
      product.price = updatedPrice;
      product.description = updatedDesc;
      if (image) {
        fileHelper.deleteFile(product.imageUrl); // delete old image
        product.imageUrl = image.path; // store new image
      }
      return product.save().then(result => { // save in db
        console.log('UPDATED PRODUCT!');
        res.redirect('/admin/products');
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error); // goes directly to error handling middleware
    });
};









exports.deleteProduct = (req, res, next) => {
  // now we have no request body. instead, we have url parameter
  const prodId = req.params.productId;

  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return next(new Error('Product not found.'));
      }
      fileHelper.deleteFile(product.imageUrl); // deleting product image
      return Product.deleteOne({ _id: prodId, userId: req.user._id }); // delete product in db
    })
    .then(() => {
      console.log('DESTROYED PRODUCT');
      // res.redirect('/admin/products'); now not using this for avoiding reloading the page
      res.status(200).json({message: "Successfully deleted"}); // return json responses. pass object and it will transform to json
    })
    .catch(err => {
     res.status(500).json({message: 'Deleting process failed'});
    });
};


