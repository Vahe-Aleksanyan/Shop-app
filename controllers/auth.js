const bcrypt = require('bcryptjs'); // for encrypting passwords
const User = require('../models/user');
const {passError} = require("express-handlebars/lib/utils");
const crypto = require('crypto'); // The crypto module provides cryptographic functionality. no need to download, it is built in
const { validationResult } = require('express-validator'); // validation Result is function to gather all errors prior validation middleware might have thrown

exports.getLogin = (req, res, next) => {
  let message = req.flash('error'); // returns array.if get error, here we get corresponding message and send it to view
    if (message.length > 0 ) {
        message = message[0];
    } else {
        message = null;
    }
      res.render("auth/login", {
        path: "/login",
        pageTitle: "Login",
        errorMessage: message,
        oldInput: {
          email: "",
          password: "",
        },
          validationErrors: []
      });
};

exports.getSignup = (req, res, next) => {
    let message = req.flash('error'); // returns array.if get error, here we get corresponding message and send it to view
    if (message.length > 0 ) {
        message = message[0];
    } else {
        message = null;
    }
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        errorMessage: message,
        oldInput: {
            email: '',
            password: '',
            confirmPassword: '',
        },
        validationErrors: []
    });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;


  //combining validation errors
    const errors = validationResult(req);
    if(!errors.isEmpty()) { // if error than reload /login page with corresponding message
       return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                password: password
            },
            validationErrors: errors.array()

        });
    }

  User.findOne({ email: email })
    .then((user) => {
      // this runs on every incoming request before our routers handle them, so we can use data stored here in all incoming routes
      if (!user) {
          // we added flash middleware so we can use it here

          return res.status(422).render('auth/login', {
              path: '/login',
              pageTitle: 'Login',
              errorMessage: 'invalid email or password.',
              oldInput: {
                  email: email,
                  password: password
              },
              validationErrors: []

          });
      }
      bcrypt
        .compare(password, user.password) // compare user password getting from front to the password of user found by email
        .then((doMatch) => {
          if (doMatch) {// true if passwords match

            req.session.isLoggedIn = true; // set session cookie
            req.session.user = user; // we share this user for all requests
            return req.session.save((err) => {// saving in database takes time, and redirect runs immediately, so write as follows
              console.log(err);
              res.redirect("/"); // redirect to the main page
            });
          }
          req.flash('error', 'invalid email or password.'); // if provided password is wrong
          res.redirect("/login"); // works in case passwords do not match
        })
        .catch((err) => {
          console.log(err);
        });
    })
    .catch((err) => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error); // goes directly to error handling middleware
    });
};

exports.postLogOut = (req, res, next) =>{
  req.session.destroy((err) => { // pass function which runs when its done destroying
    console.log(err);
      res.redirect('/');
  });
}

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;


  // validation: combines all errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors.array());
        return res.status(422).render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                password: password,
                confirmPassword: req.body.confirmPassword
            },
            validationErrors: errors.array()

        });
    }


       bcrypt
         .hash(password, 12) //encrypting String password by 12 round encryption. returns promise. can not decrypt it
         .then((hashedPassword) => {
           const user = new User({
             email: email,
             password: hashedPassword, // next store hashed password
             cart: { items: [] },
           });
           return user.save();
         })
         .then((result) => {
           res.redirect("/login");
         })
         .catch((err) => {
             const error = new Error(err);
             error.httpStatusCode = 500;
             return next(error); // goes directly to error handling middleware
         });
};

exports.postLogout = (req, res, next) => {
    req.session.destroy(err => {
        console.log(err);
        res.redirect('/');
    });
};


// just rendering the reset page
exports.getReset = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    } else {
        message = null;
    }
    res.render('auth/reset', {
        path: '/reset',
        pageTitle: 'Reset Password',
        errorMessage: message,
    })

}


// here we request for reset password, hence we create a password token by crypto,
// store the token and expire date of one hour in the corresponding user,
// then sending an email to the user to confirm that he is changing password by clicking on link with path params $token,
// then we will handle this path
exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            console.log(err);
            return res.redirect('/reset');
        }
        // store this token in db and in user object. add reset token field in user
        const token = buffer.toString('hex');
        User.findOne({ email: req.body.email })
            .then(user => {
                if (!user) {
                    req.flash('error', 'No account with that email found.');
                    return res.redirect('/reset');
                }
                user.resetToken = token;
                user.resetTokenExpiration = Date.now() + 3600000;
                return user.save();
            })
            .then(result => {
                console.log('sent email to the user');
                res.redirect(`/reset/${token}`);
                // send email to user using transport.sendMail
          //       transporter.sendMail({
          //           to: req.body.email,
          //           from: 'shop@node-complete.com',
          //           subject: 'Password reset',
          //           html: `
          //   <p>You requested a password reset</p>
          //   <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</p>
          // `
          //       });
            })
            .catch(err => {
                const error = new Error(err);
                error.httpStatusCode = 500;
                return next(error); // goes directly to error handling middleware
            });
    });
};

// here we get the token coming from mail link, find user with that token and valid expire date,
// if found such user we render new-password ejs and send to the view user id and token to use in post request
exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;
    User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
        .then(user => {
            let message = req.flash('error');
            if (message.length > 0) {
                message = message[0];
            } else {
                message = null;
            }
            res.render('auth/new-password', {
                path: '/new-password', // we will write post rout for this
                pageTitle: 'New Password',
                errorMessage: message,
                userId: user._id.toString(), // we render this id to use it in post request to reset the password
                passwordToken: token
            });
        })
        .catch(err => {
            console.log(err);
        });
};


// in this rout we get the user info which changes password, also get new password,
// find user to corresponding token, valid expire date and user id
// hashing new password and updating in user collection
exports.postNewPassword = (req, res, next) => {
    const newPassword = req.body.password;
    const userId = req.body.userId; // we add this items in new-password.ejs as a hidden data
    const passwordToken = req.body.passwordToken;
    let resetUser;

    User.findOne({
        resetToken: passwordToken,
        resetTokenExpiration: { $gt: Date.now() },
        _id: userId
    })
        .then(user => {
            resetUser = user;
            return bcrypt.hash(newPassword, 12);
        })
        .then(hashedPassword => {
            resetUser.password = hashedPassword;
            resetUser.resetToken = undefined;
            resetUser.resetTokenExpiration = undefined;
            return resetUser.save();
        })
        .then(result => {
            res.redirect('/login'); // once we save changes of password redirect to /login
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error); // goes directly to error handling middleware
        });
};


