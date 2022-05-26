const express = require('express'); // download express by npm and import it here
const path = require('path'); // for creating path
const fs = require('fs'); // for reading or writing files
const https = require('https');
const bodyParser = require('body-parser'); // parses incoming requests
const mongoose = require('mongoose'); // db
const session = require('express-session'); // for creating session -  You assign the client an ID and it makes all further requests using that ID.
const MongoDbStore = require('connect-mongodb-session')(session); // this is a function sa pass session
const csrf = require('csurf'); // for protection, ensure that people can use our session if they are working with our rendered view
const flash = require('connect-flash'); // special area for session used for storing messages.
const multer = require('multer'); // used for uploading files
const helmet = require('helmet'); // for making secure apps
const compression = require('compression'); // decreases downloadable data amount and improves performance
const morgan = require('morgan'); // logs HTTP requests and errors, and simplifies the process.

const adminRouts = require('./routes/admin');
const shopRouts = require('./routes/shop');
const authRouts = require('./routes/auth');

const errorController = require('./controllers/error');
const User = require('./models/user');
//"mongodb+srv://VVahe:vahe01@cluster0.kbjas.mongodb.net/shop";
const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.kbjas.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}`; // path to db

const app = express(); // we execute as a function, it exports function behind the scenes, app is also a valid request handler //app sets certain ways to handle incoming requests
const store = new MongoDbStore({
  uri: MONGODB_URI, // the url where we store our info
  collection: 'sessions', // name of collection for sessions
});

const csrfProtection = csrf(); // initialize session. creates middleware

// we are telling node.js to block other parallel process and do the current file reading process
// const privateKey = fs.readFileSync('server.key');
// const certificate = fs.readFileSync('server.cert');


// value comes from multer
const fileStorage = multer.diskStorage({
  // handling coming file
  destination: (req, file, cb) => {
    cb(null, 'images'); // controlling path
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + '-' + file.originalname); // creating our own unique filename
  }
})

const fileFilter = (req, file, cb) => { // filtering for desired input
  if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
    cb(null, true); // we are accepting file
  } else {
    cb(null, false); // not accepting file

  }
}
//global config value:
app.set('view engine', 'ejs'); // instead of pug or hbs
app.set('views', 'views'); // mention views folder: it can be templates or other things

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'),
  {flags: 'a'})
// configure for security and performance
app.use(helmet());
app.use(compression());
app.use(morgan('combined', {stream: accessLogStream}));

//for parsing body, this middleware transforms all coming data to <<text>>
app.use(bodyParser.urlencoded({ extended: false }));

// initializing multer for extracting files from request
app.use(multer({storage: fileStorage, fileFilter: fileFilter }).single('image')); // 'image' is input name coming from front

app.use(express.static(path.join(__dirname, 'public'))); //for handling static files - css
app.use('/images', express.static(path.join(__dirname, 'images'))); // images are also static

app.use(session({ // sets session cookie
  secret: 'my secret',
  resave: false,
  saveUninitialized: false,
  store: store}))

app.use(csrfProtection); // enable to use csrf
app.use(flash()); // now we can use flash middleware in anywhere in our application

// this middleware stores local variables in the views to be used there
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();  // generates a token which we can use in view
  next();
})


app.use((req, res, next) => {
  if (!req.session.user) {// we need to create user model in req based on our authenticated user to have access to models methods
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
      if (!user) { // if we found no user just go to next middleware instead of storing undefined user object
        return next();
      }
      req.user = user;
      next();
    })
    .catch(err => { // technical issues, otherwise use next() to go on
      next(new Error(err)); // inside async code you should use next wrapping an error, in outside you can just throw
    });
});


//this is for considering routs, note that order is matter
//app.use('/admin', adminRouts);//this is like filter, only routes starting with /admin will go in this file
app.use('/admin', adminRouts); // use adminRoutes. because we exported something there
app.use(shopRouts);
app.use(authRouts);


// register this error  route
app.get('/500', errorController.get500)

// handle not registered routes
app.use(errorController.get404); //  use controller middleware function reference here



// special error handling middleware with 4 parameters
    function errorHandler(err, req, res, next) {
      console.log(err, 'errerrerr');
      res.status(500).render('500', {
        pageTitle: 'Error',
        path: '/500',
        isAuthenticated: req.session.isLoggedIn
      })
    }
    app.use(errorHandler);

mongoose.connect(MONGODB_URI)
  .then((result) => {
    // https
    //   .createServer({key: privateKey, cert: certificate}, app)
    //   .listen(process.env.PORT || 3300);
    app.listen(process.env.PORT || 3300);

  })
  .catch((err) => {
    console.log(err);
    console.log("cannot connect");
  });



