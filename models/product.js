const mongoose = require('mongoose');

// constructor that allows to create schemas
const Schema = mongoose.Schema;
// create schema using Schema constructor, pass object to say how the schema should look like
const productSchema = new Schema({ // mention type along with keys
  title: { // don't need _id, automatically adds
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  userId: { // setting a relation
    type: Schema.Types.ObjectId,
    ref: 'User', // special configuration for relating model name in string
    required: true
  }
});

// export by giving model name, second argument is schema itself
module.exports = mongoose.model('Product', productSchema);

// const mongodb = require('mongodb');
// const getDb = require('../util/database').getDb;
// class Product {
//   constructor(title, price, description, imageUrl, id, userId) {
//     this.title = title;
//     this.price = price;
//     this.description = description;
//     this.imageUrl = imageUrl;
//     this._id = id ? new mongodb.ObjectId(id): null;
//     this.userid = userId; // pass user data when cretaing product
//   }
//
//   // write a method to save in database
//   save() {
//     const db = getDb();
//     let dbOp;
//     if (this._id) {
//       // Update the product
//       dbOp = db
//         .collection('products')
//         .updateOne({ _id: this._id }, { $set: this });
//     } else {
//       dbOp = db.collection('products').insertOne(this);
//     }
//     return dbOp
//       .then(result => {
//         console.log(result);
//       })
//       .catch(err => {
//         console.log(err);
//       });
//   }
//
//   static fetchAll() {
//     const db = getDb();
//     return db
//       .collection('products')
//       .find()
//       .toArray()
//       .then(products => {
//         console.log(products);
//         return products;
//       })
//       .catch(err => {
//         console.log(err);
//       });
//   }
//
//   static findById(prodId) {
//     const db = getDb();
//     return db
//       .collection('products')
//       .find({_id: new mongodb.ObjectId(prodId)})
//       .next()
//       .then(prod => {
//         console.log(prod);
//         return prod;
//       })
//       .catch(err => {
//         console.log(err);
//         console.log("cannot find product by given id")
//       })
//   }
//
//   static deleteById(prodId) {
//     const db = getDb();
//     return db
//       .collection('products')
//       .deleteOne({ _id: new mongodb.ObjectId(prodId) })
//       .then(result => {
//         console.log('Deleted');
//       })
//       .catch(err => {
//         console.log(err);
//       });
//   }
// }
//
// module.exports = Product;