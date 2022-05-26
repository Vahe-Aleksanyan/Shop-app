const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: { type: String, required: true },
  password: {type: String, required: true},
  resetToken: String,
  resetTokenExpiration: Date,
  cart: {
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true }, // make reference to Products
        quantity: { type: Number, required: true },
      },
    ],
  },

});


// create our own methods
userSchema.methods.addToCart = function(product) {// don't use arrow function to have 'this' referring to Schema
  // just a number
  const cartProductIndex = this.cart.items.findIndex((cp) => {
    return cp.productId.toString() === product._id.toString();
  });
  let newQuantity = 1;
  const updatedCartItems = [...this.cart.items]; // gives an array with all items in the cart

  if (cartProductIndex >= 0) {
    // if item exists in cart just update its quantity
    newQuantity = this.cart.items[cartProductIndex].quantity + 1;
    updatedCartItems[cartProductIndex].quantity = newQuantity;
  } else {
    // otherwise, add the new item in the cart
    updatedCartItems.push({
      productId:product._id, // pass only id, mongoose automatically makes it ObjectId
      quantity: newQuantity,
    });
  }

  // add in database
  const updatedCart = {
    items: updatedCartItems,
  };
  this.cart = updatedCart;
  return this.save();
}

userSchema.methods.removeFromCart = function(productId) {
  const updatedCartItems = this.cart.items.filter((item) => { // this is user
    return item.productId.toString() !== productId.toString();
  })
  this.cart.items = updatedCartItems;
  return this.save();
}
userSchema.methods.clearCart = function () {
  this.cart = { items: []}
  return this.save();
}

module.exports = mongoose.model('User', userSchema);

// const getDb = require('../util/database').getDb;
// const mongodb = require('mongodb');
// const ObjectId = mongodb.ObjectId;
// class User {
//   constructor(username, email, cart, id) {
//     this.name = username;
//     this.email = email;
//     this.cart = cart; // {items: [] }
//     this._id = id;
//   }
//
//   save() {
//     const db = getDb();
//     return db.collection("users").insertOne(this);
//   }
//
//   addToCart(product) {
//     // just a number
//     const cartProductIndex = this.cart.items.findIndex((cp) => {
//       return cp.productId.toString() === product._id.toString();
//     });
//     let newQuantity = 1;
//     const updatedCartItems = [...this.cart.items]; // gives an array with all items in the cart
//
//     if (cartProductIndex >= 0) {
//       // if item exists in cart just update its quantity
//       newQuantity = this.cart.items[cartProductIndex].quantity + 1;
//       updatedCartItems[cartProductIndex].quantity = newQuantity;
//     } else {
//       // otherwise, add the new item in the cart
//       updatedCartItems.push({
//         productId: new ObjectId(product._id), // pass only id
//         quantity: newQuantity,
//       });
//     }
//
//     // add in database
//     const updatedCart = {
//       items: updatedCartItems,
//     };
//     const db = getDb();
//     return db
//       .collection("users")
//       .updateOne(
//         { _id: new ObjectId(this._id) },
//         { $set: { cart: updatedCart } }
//       );
//   }
//
//   getCart() {
//     // this method is available to the user who has cart
//     const db = getDb();
//     // array containing all ids of carts, map over array of objects
//     const productsIdsArr = this.cart.items.map((item) => {
//       return item.productId;
//     });
//     // in products collection we find the product corresponding to each cart id, put all products on array, map over the objects to add quantity field
//     return db
//       .collection("products")
//       .find({ _id: { $in: productsIdsArr } }) // $in is a mongodb cursor which requires array
//       .toArray()
//       .then((products) => {
//         return products.map((prod) => {
//           return {
//             // return object of all cart products data along with quantity
//             ...prod,
//             quantity: this.cart.items.find((cart) => {
//               // returns product object, so access quantity at the end
//               return cart.productId.toString() === prod._id.toString();
//             }).quantity,
//           };
//         });
//       });
//   }
//
//   deleteItemFromCart(productId) {
//     // we remove product form the list of cart products with given id
//     const updatedCartArr = this.cart.items.filter((item) => {
//       return item.productId.toString() !== productId.toString();
//     });
//     // update the removed cart item in database
//     const db = getDb();
//     return db.collection("users").updateOne(
//       { _id: new ObjectId(this._id) }, // we specify the id of the user whos cart item deleted
//       { $set: { cart: { items: updatedCartArr } } } // replace items array with new array
//     );
//   }
//
//   addOrder() {
//     // make sure you pass user info. pass cart to new collection and clear cart
//     const db = getDb();
//     return this.getCart()
//       .then((products) => {
//         const order = {
//           items: products, // now product information also is a part of the order. We dont care info changes, if price changes order does not changes
//           user: {
//             // some user data
//             _id: new ObjectId(this._id),
//             name: this.name,
//           },
//         };
//         return db.collection("orders").insertOne(order);
//       })
//       .then((result) => {
//         // clean existing cart
//         this.cart = { items: [] };
//         return db
//           .collection("users")
//           .updateOne(
//             { _id: new ObjectId(this._id) },
//             { $set: { cart: { items: [] } } }
//           );
//       });
//   }
//
//   getOrders() {
//     const db = getDb();
//     return db
//       .collection("orders")
//       .find({ "user._id": new ObjectId(this._id) })
//       .toArray();
//   }
//
//   static findById(userId) {
//     const db = getDb();
//     return db
//       .collection("users")
//       .findOne({ _id: new ObjectId(userId) })
//       .then((user) => {
//         console.log(user);
//         return user;
//       })
//       .catch((err) => {
//         console.log(err);
//       });
//   }
// }
//
// module.exports = User;