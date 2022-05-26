exports.get404 = (req, res) => {
  //res.status(404).sendFile(path.join(__dirname, 'views', '404.html')); // for html
  res.status(404).render('404', {
    pageTitle: 'File not found',
    path: '/404',
    isAuthenticated: req.session.isLoggedIn
  });
}

exports.get500 = (req, res, next) => {
  res.status(500).render('500', {
    pageTitle: 'Error',
    path: '/500',
    isAuthenticated: req.session.isLoggedIn
  })
}