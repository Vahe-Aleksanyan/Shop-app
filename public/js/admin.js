// this is for communication server/client without reloading page but Uploading every time. This file runs in browser
const deleteProduct = (btn) => {
  const prodId = btn.parentNode.querySelector('[name=productId]').value;
  const csrf = btn.parentNode.querySelector('[name=_csrf]').value; // send async request to route

  const productElement = btn.closest('article'); // this returns the element
  // passes the info to the url which we will read in server. Async request
  fetch('/admin/product/' + prodId, { // we configure in app.js that routs start with admin
    method: 'DELETE',
    headers: {
      'csrf-token': csrf
    }
  }).then(result => {
    console.log(result);
  }).then(data => {
    console.log(data);
    productElement.parentNode.removeChild(productElement); //
  })
    .catch(err => {
    console.log(err);
  })
}