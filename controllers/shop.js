// bring middlewares here and export
const fs = require('fs'); // for static file input output
const path = require('path'); // for creating path
const PDFDocument = require('pdfkit'); // A PDF generation library
//const stripe = require('stripe')('sk_test_51KtZiSGC2hjL06gMXIXldMU4rVHVXWiP5K5SqPyRR2CuqnH84zHRczhZgcsqTk4tWenJFdEDKVazCYG6ugqdmhBE00aIn1Rnou'); // for making payments. take key from website
const stripe = require('stripe')(process.env.STRIPE_KEY); // for making payments. take key from website
const ITEMS_PER_PAGE = 2; // constant for showing items in page

const Product = require('../models/product');// order and product model
const Order = require('../models/order');

exports.getProducts = (req, res, next) => {
  // find() gives all products from database product collection
  const page = +req.query.page || 1; // user sends page number through query, use + to make it number from string
  let totalItems;
  Product.find().countDocuments() // getting quantity of products
    .then((numOfProds) => {
      totalItems = numOfProds;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE) // skips first x amounts of results. This is a mongodb function,
        .limit(ITEMS_PER_PAGE); // limits the number of items we fetch
    })
    .then((products) => {
      //console.log(products);
      res.render("shop/product-list", { // rendering a sending this data to user
        prods: products,
        pageTitle: "Products",
        path: "/",
        currentPage: page,
        hasNextPage: page * ITEMS_PER_PAGE < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems/ ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error); // goes directly to error handling middleware
    });
};


exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1; // user sends page number through query, use + to make it number from string
  let totalItems;
  Product.find().countDocuments() // getting quantity of products
    .then((numOfProds) => {
      totalItems = numOfProds;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE) // skips first x amounts of results. This is a mongodb function,
        .limit(ITEMS_PER_PAGE); // limits the number of items we fetch
    })
    .then((products) => {
      //console.log(products);
      res.render("shop/index", { // rendering a sending this data to user
        prods: products,
        pageTitle: "Shop",
        path: "/",
        currentPage: page,
        hasNextPage: page * ITEMS_PER_PAGE < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems/ ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error); // goes directly to error handling middleware
    });
};


//getting product by id
exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId) // findById is a mongoose method
    .then((product) => {
      res.render("shop/product-detail", {
        product: product,
        pageTitle: product.title,
        path: "/products",
      });
    })
    .catch((err) => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error); // goes directly to error handling middleware
    });
};


// for displaying carts, populate returns promise
exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId') // populate brings not only id but the whole data
    .then(user => {
      const products = user.cart.items;
     return res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products
      });
    })
    .catch(err => {
      console.log('something wrong');
      const error = new Error(err);
      error.httpStatusCode = 505;
      return next(error);// goes directly to error handling middleware
    });
};

exports.getCheckout = (req, res, next) => {
  let products;
  let total;
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      products = user.cart.items;
      total = 0;
      products.forEach((prod) => {
        total += prod.quantity * prod.productId.price;
      });

      // creating stripe session for payments
      return stripe.checkout.sessions.create({
        // configure session
        payment_method_types: ["card"], //saying that we accept credit card payments
        line_items: products.map(prod => { // specify which items will be checked out
          return {
            name: prod.productId.title,
            description: prod.productId.description,
            amount: prod.productId.price * 100, // specify in cents
            currency: 'usd',
            quantity: prod.quantity,

          }
        }),
        // urls to use in case of success or failer
        success_url: req.protocol + '://' + req.get('host') + '/checkout/success', // => http://localhost:3300
        cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
      });
    })
    .then((session) => {
      res.render("shop/checkout", {
        path: "/checkout",
        pageTitle: "Checkout",
        products: products,
        totalSum: total,
        sessionId: session.id, // forwarding the session id to view. There (in front) we use redirectToCheckOut function and pass this id
      });
    })

    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

//responsible for adding new products to cart
exports.postCart = (req, res, next) => {
    const prodId = req.body.productId;// client gives the id of the product to be added to cart
    Product.findById(prodId)// we find that product
      .then(product => {
        return req.user.addToCart(product); // add it to User object as a cart object, store that user in req. we defined it in user model
      })
      .then(result => {
        console.log(result);
        res.redirect('/cart');
      }).catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId; // get product id from front
  req.user
    .removeFromCart(prodId) // we created this method in user model
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};


exports.getCheckoutSuccess = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      // receive products by given ids, store in orderProducts also specifying which data we want fron each cart
      const orderProducts = user.cart.items.map((item) => {
        return { product: { ...item.productId._doc }, quantity: item.quantity }; // doc comes from mongoose, by that we get data inside the object
      });

      const order = new Order({
        // crete order collection cart items also providing other order information
        products: orderProducts,
        user: {
            email: req.user.email,
            userId: req.user },
      });
      return order.save();
    })
    .then((result) => {
      req.user.clearCart();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) =>{
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

exports.getOrders = (req, res, next) => {
    Order.find({'user.userId' : req.user._id}) // based on userid display order
        .then(orders => {
            res.render('shop/orders', {
                path: '/orders',
                pageTitle: 'Your Orders',
                orders: orders,
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;  // id comes from front
  Order.findById(orderId)
    .then(order => {
      if (!order) { // checking if we have the order corresponding to the user
        return next(new Error("no order found"));
      }
      if (order.user.userId.toString() !== req.user._id.toString()) { // checking if user is allowed to get invoice
        return next(new Error("user is not authorized"))
      }
      // if the checks are fine go and read the file and output it
      const invoiceName = 'invoice-' + orderId + '.pdf'; // manually create name of the invoice
      const invoicePath = path.join('data', 'invoices', invoiceName); // make the local path of document

      const pdfDoc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf'); // sets the representation way
      res.setHeader(
        'Content-Disposition',
        'inline; filename="' + invoiceName + '"'
      );
      pdfDoc.pipe(fs.createWriteStream(invoicePath)); // piping
      pdfDoc.pipe(res);

      pdfDoc.fontSize(26).text('Invoice', {
        underline: true
      });
      pdfDoc.text('-----------------------');
      let totalPrice = 0;
      order.products.forEach(prod => {
        totalPrice += prod.quantity * prod.product.price;
        pdfDoc
          .fontSize(14)
          .text(
            prod.product.title +
            ' - ' +
            prod.quantity +
            ' x ' +
            '$' +
            prod.product.price
          );
      });
      pdfDoc.text('---');
      pdfDoc.fontSize(20).text('Total Price: $' + totalPrice);

      pdfDoc.end();// saying that we finished writing, don't forget

      // this is for storing data in local storage
      //   fs.readFile(invoicePath, (err, data) => { // read file. Note that node reads entire file than passes to res. So this is handy for small files
      //     if (err) {
      //       return next(err);
      //     }
      //     res.setHeader('Content-Type', 'application-pdf'); // set headers how you like - representation in page
      //     res.setHeader('Content-Disposition', 'attachment; filename = " ' + invoiceName +'"' ); // header to show real name of the document
      //     res.send(data); // send data to user
      //   });


      // try streaming for bigger files - chunk by chunk

      // const file = fs.createReadStream(invoicePath);
      // res.setHeader('Content-Type', 'application-pdf');
      // res.setHeader('Content-Disposition', 'attachment; filename = " ' + invoiceName + '"');
      // file.pipe(res);
        })
    .catch(err => {
    next(err);
    })
}