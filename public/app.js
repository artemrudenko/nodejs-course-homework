/*
 * Frontend Logic for application
 *
 */

// Container for frontend application
let app = {};

// Config
app.config = {
  'sessionToken': false
};

// AJAX Client (for RESTful API)
app.client = {}

// Interface for making API calls
app.client.request = function (headers, path, method, queryStringObject, payload, callback) {
  // Set defaults
  headers = typeof (headers) == 'object' && headers !== null ? headers : {};
  path = typeof (path) == 'string' ? path : '/';
  method = typeof (method) == 'string' && ['POST', 'GET', 'PUT', 'DELETE'].indexOf(method.toUpperCase()) > -1 ? method.toUpperCase() : 'GET';
  queryStringObject = typeof (queryStringObject) == 'object' && queryStringObject !== null ? queryStringObject : {};
  payload = typeof (payload) == 'object' && payload !== null ? payload : {};
  callback = typeof (callback) == 'function' ? callback : false;

  // For each query string parameter sent, add it to the path
  let requestUrl = path + '?';
  let counter = 0;

  for (let queryKey in queryStringObject) {
    if (queryStringObject.hasOwnProperty(queryKey)) {
      counter++;
      // If at least one query string parameter has already been added, preprend new ones with an ampersand
      if (counter > 1) {
        requestUrl += '&';
      }
      // Add the key and value
      requestUrl += queryKey + '=' + queryStringObject[queryKey];
    }
  }

  // Form the http request as a JSON type
  let xhr = new XMLHttpRequest();
  xhr.open(method, requestUrl, true);
  xhr.setRequestHeader("Content-type", "application/json");

  // For each header sent, add it to the request
  for (let headerKey in headers) {
    if (headers.hasOwnProperty(headerKey)) {
      xhr.setRequestHeader(headerKey, headers[headerKey]);
    }
  }

  // If there is a current session token set, add that as a header
  if (app.config.sessionToken) {
    xhr.setRequestHeader("token", app.config.sessionToken.id);
  }

  // When the request comes back, handle the response
  xhr.onreadystatechange = function () {
    if (xhr.readyState == XMLHttpRequest.DONE) {
      let statusCode = xhr.status;
      // Callback if requested
      if (callback) {
        try {
          let parsedResponse = JSON.parse(xhr.responseText);
          callback(statusCode, parsedResponse);
        } catch (e) {
          callback(statusCode, false);
        }
      }
    }
  }
  // Send the payload as JSON
  xhr.send(JSON.stringify(payload));
};

// Bind the logout button
app.bindLogoutButton = function () {
  document.getElementById("logoutButton")
    .addEventListener("click", function (e) {
      // Stop it from redirecting anywhere
      e.preventDefault();
      // Log the user out
      app.logUserOut();
    });
};

// Log the user out then redirect them
app.logUserOut = function (redirectUser) {
  // Set redirectUser to default to true
  redirectUser = typeof (redirectUser) == 'boolean' ? redirectUser : true;
  // Remove user cart on session end
  app.client.request(undefined, 'api/cart', 'DELETE', undefined, undefined, function (statusCode, responsePayload) {
    // Get the current token id
    let tokenId = typeof (app.config.sessionToken.id) == 'string' ? app.config.sessionToken.id : false;
    // Send the current token to the tokens endpoint to delete it
    app.client.request(undefined, 'api/tokens', 'DELETE', { 'id': tokenId }, undefined, function (statusCode, responsePayload) {
      // Set the app.config token as false
      app.setSessionToken(false);
      // Send the user to the logged out page
      if (redirectUser) {
        window.location = '/session/deleted';
      }
    });
  });
};

// Bind the forms
app.bindForms = function () {
  if (document.querySelector("form")) {
    let allForms = document.querySelectorAll("form");
    for (let i = 0; i < allForms.length; i++) {
      allForms[i].addEventListener("submit", function (e) {
        // Stop it from submitting
        e.preventDefault();
        let formId = this.id;
        let path = this.action;
        let method = this.method.toUpperCase();

        // Hide the error message (if it's currently shown due to a previous error)
        document.querySelector("#" + formId + " .formError").style.display = 'none';
        // Hide the success message (if it's currently shown due to a previous error)
        if (document.querySelector("#" + formId + " .formSuccess")) {
          document.querySelector("#" + formId + " .formSuccess").style.display = 'none';
        }

        // Turn the inputs into a payload
        let payload = {};
        let elements = this.elements;
        for (let i = 0; i < elements.length; i++) {
          if (elements[i].type !== 'submit') {
            // Determine class of element and set value accordingly
            let classOfElement = typeof (elements[i].classList.value) == 'string' && elements[i].classList.value.length > 0 ? elements[i].classList.value : '';
            let valueOfElement = elements[i].type == 'checkbox' && classOfElement.indexOf('multiselect') == -1 ? elements[i].checked : classOfElement.indexOf('intval') == -1 ? elements[i].value : parseInt(elements[i].value);
            let elementIsChecked = elements[i].checked;
            let nameOfElement = elements[i].name;
            // Create an payload field named "id" if the elements name is actually uid
            if (nameOfElement == 'uid') {
              nameOfElement = 'id';
            }
            // If the element has the class "multiselect" add its value(s) as array elements
            if (classOfElement.indexOf('multiselect') > -1) {
              if (elementIsChecked) {
                payload[nameOfElement] = typeof (payload[nameOfElement]) == 'object' && payload[nameOfElement] instanceof Array ? payload[nameOfElement] : [];
                payload[nameOfElement].push(valueOfElement);
              }
            } else {
              payload[nameOfElement] = valueOfElement;
            }
          }
        }

        // If the method is DELETE, the payload should be a queryStringObject instead
        let queryStringObject = method == 'DELETE' ? payload : {};

        // Call the API
        app.client.request(undefined, path, method, queryStringObject, payload, function (statusCode, responsePayload) {
          // Display an error on the form if needed
          if (statusCode !== 200) {
            if (statusCode == 403) {
              // log the user out
              app.logUserOut();
            } else {
              // Try to get the error from the api, or set a default error message
              let error = typeof (responsePayload.Error) == 'string' ? responsePayload.Error : 'An error has occured, please try again';
              // Set the formError field with the error text
              document.querySelector("#" + formId + " .formError").innerHTML = error;
              // Show (unhide) the form error field on the form
              document.querySelector("#" + formId + " .formError").style.display = 'block';
            }
          } else {
            // If successful, send to form response processor
            app.formResponseProcessor(formId, payload, responsePayload);
          }
        });
      });
    }
  }
};

// Form response processor
app.formResponseProcessor = function (formId, requestPayload, responsePayload) {
  // If account creation was successful, try to immediately log the user in
  if (formId == 'accountCreate') {
    // Take the userName and password, and use it to log the user in
    let newPayload = {
      'userName': requestPayload.userName,
      'password': requestPayload.password
    };

    app.client.request(undefined, 'api/tokens', 'POST', undefined, newPayload, function (newStatusCode, newResponsePayload) {
      // Display an error on the form if needed
      if (newStatusCode !== 200) {
        // Set the formError field with the error text
        document.querySelector("#" + formId + " .formError").innerHTML = 'Sorry, an error has occured. Please try again.';
        // Show (unhide) the form error field on the form
        document.querySelector("#" + formId + " .formError").style.display = 'block';
      } else {
        // If successful, set the token and redirect the user
        app.setSessionToken(newResponsePayload);
        // Init cart
        app.client.request(undefined, 'api/cart', 'POST', undefined, undefined, function (statusCode, __) {
          if (statusCode == 200) {
            window.location = '/menu';
          } else {
            alert(`Failed to init cart!`);
            app.logUserOut();
          }
        });
      }
    });
  }
  // If login was successful, set the token in localstorage and redirect the user
  if (formId == 'sessionCreate') {
    app.setSessionToken(responsePayload);
    // Remove cart if any present
    app.client.request(undefined, 'api/cart', 'DELETE', undefined, undefined, function (_, __) {
      // Start new cart
      app.client.request(undefined, 'api/cart', 'POST', undefined, undefined, function (statusCode, responsePayload) {
        if (statusCode == 200) {
          window.location = '/menu';
        } else {
          alert(`Failed to init cart!`);
          app.logUserOut();
        }
      });
    });
  }
  // If forms saved successfully and they have success messages, show them
  let formsWithSuccessMessages = ['accountEdit1', 'accountEdit2', 'cartEdit1'];
  if (formsWithSuccessMessages.indexOf(formId) > -1) {
    document.querySelector("#" + formId + " .formSuccess").style.display = 'block';
  }
  // If the user just deleted their account, redirect them to the account-delete page
  if (formId == 'accountEdit3') {
    app.logUserOut(false);
    window.location = '/account/deleted';
  }
  // If order processed successfully, redirect to the order completed page
  if (formId == 'orderCheckout') {
    window.location = '/order/completed';
  }
};

// Get the session token from localstorage and set it in the app.config object
app.getSessionToken = function () {
  let tokenString = localStorage.getItem('token');
  if (typeof (tokenString) == 'string') {
    try {
      let token = JSON.parse(tokenString);
      app.config.sessionToken = token;
      app.setLoggedInClass(typeof (token) == 'object');
    } catch (e) {
      app.config.sessionToken = false;
      app.setLoggedInClass(false);
    }
  }
};

// Set (or remove) the loggedIn class from the body
app.setLoggedInClass = function (add) {
  let target = document.querySelector("body");
  if (add) {
    target.classList.add('loggedIn');
  } else {
    target.classList.remove('loggedIn');
  }
};

// Set the session token in the app.config object as well as localstorage
app.setSessionToken = function (token) {
  app.config.sessionToken = token;
  let tokenString = JSON.stringify(token);
  localStorage.setItem('token', tokenString);
  app.setLoggedInClass(typeof (token) == 'object');
};

// Renew the token
app.renewToken = function (callback) {
  let currentToken = typeof (app.config.sessionToken) == 'object' ? app.config.sessionToken : false;
  if (currentToken) {
    // Update the token with a new expiration
    let payload = {
      'id': currentToken.id,
      'extend': true
    };
    app.client.request(undefined, 'api/tokens', 'PUT', undefined, payload, function (statusCode, responsePayload) {
      // Display an error on the form if needed
      if (statusCode == 200) {
        // Get the new token details
        let queryStringObject = { 'id': currentToken.id };
        app.client.request(undefined, 'api/tokens', 'GET', queryStringObject, undefined, function (statusCode, responsePayload) {
          // Display an error on the form if needed
          if (statusCode == 200) {
            app.setSessionToken(responsePayload);
            callback(false);
          } else {
            app.setSessionToken(false);
            callback(true);
          }
        });
      } else {
        app.setSessionToken(false);
        callback(true);
      }
    });
  } else {
    app.setSessionToken(false);
    callback(true);
  }
};

// Load data on the page
app.loadDataOnPage = function () {
  // Get the current page from the body class
  let bodyClasses = document.querySelector("body").classList;
  let primaryClass = typeof (bodyClasses[0]) == 'string' ? bodyClasses[0] : false;
  switch (primaryClass) {
    case 'accountEdit':
      app.loadAccountEditPage();
      break;
    case 'menuList':
      app.loadMenuListPage();
      break;
    case 'userCart':
      app.loadUserCartPage();
      break;
    case 'userOrder':
      app.loadOrderPage();
      break;
    case 'userOrderCompleted':
      app.loadOrderCompletedPage();
      break;
    default:
      break
  }
};

// Load the account edit page specifically
app.loadAccountEditPage = function () {
  // Get the userName from the current token, or log the user out if none is there
  let userName = typeof (app.config.sessionToken.userName) == 'string' ? app.config.sessionToken.userName : false;
  if (userName) {
    // Fetch the user data
    let queryStringObject = { 'userName': userName };
    app.client.request(undefined, 'api/users', 'GET', queryStringObject, undefined, function (statusCode, responsePayload) {
      if (statusCode == 200) {
        // Put the data into the forms as values where needed
        document.querySelector("#accountEdit1 .userNameInput").value = responsePayload.userName;
        document.querySelector("#accountEdit1 .streetInput").value = responsePayload.street;
        document.querySelector("#accountEdit1 .displayEmailInput").value = responsePayload.email;

        // Put the hidden email field into both forms
        let hiddenEmailInputs = document.querySelectorAll("input.hiddenEmailInput");
        for (let i = 0; i < hiddenEmailInputs.length; i++) {
          hiddenEmailInputs[i].value = responsePayload.email;
        }
      } else {
        // If the request comes back as something other than 200, log the user our (on the assumption that the api is temporarily down or the users token is bad)
        app.logUserOut();
      }
    });
  } else {
    app.logUserOut();
  }
};

// Load the menu page specifically
app.loadMenuListPage = function () {
  // Get the current token, or log the user out if none is there
  let id = typeof (app.config.sessionToken.id) == 'string' ? app.config.sessionToken.id : false;
  if (id) {
    app.client.request(undefined, 'api/menu', 'GET', undefined, undefined,
      (statusCode, menuItems) => {
        if (statusCode == 200) {
          if (menuItems.length > 0) {
            // app.client.request(undefined, 'api/cart', 'GET', undefined, undefined,
            //   (statusCode, cartData) => {
            //     if (statusCode != 200) {

            //     }
            //   });
            // Show each menuItem as a new row in the table
            menuItems.forEach(function (menuItem, index) {
              // Make the menu item data into a table row
              let table = document.getElementById("menuListTable");
              let tr = table.insertRow(-1);
              tr.classList.add('menuRow');
              let td0 = tr.insertCell(0);
              let td1 = tr.insertCell(1);
              let td2 = tr.insertCell(2);
              let td3 = tr.insertCell(3);
              let td4 = tr.insertCell(4);
              let td5 = tr.insertCell(5);
              td0.innerHTML = menuItem.name;
              td1.innerHTML = `$${menuItem.price}`;
              td2.innerHTML = menuItem.weight;
              td3.innerHTML = menuItem.description;
              td4.innerHTML = `<input id="quantity-${menuItem.name}-${index}" name="quantity" />`
              td5.innerHTML = `<button id="add-${menuItem.name}-${index}" class="cta blue add-to-cart-btn">Add to Cart</button>`;
              document.getElementById(`add-${menuItem.name}-${index}`)
                .addEventListener("click", function (e) {
                  e.preventDefault();
                  const quantity = parseInt(document.getElementById(`quantity-${menuItem.name}-${index}`).value);
                  const payload = { name: menuItem.name, quantity };
                  app.client.request(undefined, "api/cart", "PUT", undefined, payload,
                    (statusCode, responsePayload) => {
                      if (statusCode == 200) {
                        alert("Cart Item has been successfully updated!");
                      } else {
                        alert(responsePayload.Error);
                      }
                    }
                  );
                });
            });
          }
        } else {
          app.logUserOut();
        }
      });
  } else {
    app.logUserOut();
  }
};

// Load the user cart specifically
app.loadUserCartPage = function () {
  // Get the current token, or log the user out if none is there
  let id = typeof (app.config.sessionToken.id) == 'string' ? app.config.sessionToken.id : false;
  if (id) {
    app.client.request(undefined, 'api/cart', 'GET', undefined, undefined,
      (statusCode, cartData) => {
        if (statusCode == 200) {
          if (cartData.items.length > 0) {
            app.client.request(undefined, 'api/menu', 'GET', undefined, undefined,
              (statusCode, menuData) => {
                if (statusCode == 200) {
                  // Show each cart item as a new row in the table
                  cartData.items.forEach((cartItem, index) => {
                    // Make the cart item data into a table row
                    let table = document.getElementById("userCartTable");
                    let tr = table.insertRow(-1);
                    tr.classList.add('cartRow');
                    tr.classList.add(index.toString());
                    let td0 = tr.insertCell(0);
                    let td1 = tr.insertCell(1);
                    let td2 = tr.insertCell(2);
                    let td3 = tr.insertCell(3);
                    td0.innerHTML = cartItem.name;
                    td1.innerHTML = menuData.find(item => item.name == cartItem.name).description;
                    td2.innerHTML = `<input id="quantity-${cartItem.name}-${index}" name="quantity" />`
                    td3.innerHTML = `<button id="update-${cartItem.name}-${index}" class="cta blue update-cart-btn">Update Cart</button>`;
                    document.getElementById(`quantity-${cartItem.name}-${index}`).value = cartItem.quantity;
                    document.getElementById(`update-${cartItem.name}-${index}`)
                      .addEventListener("click", function (e) {
                        e.preventDefault();
                        const quantity = parseInt(document.getElementById(`quantity-${cartItem.name}-${index}`).value);
                        const payload = { name: cartItem.name, quantity, index };
                        app.client.request(undefined, "api/cart", "PUT", undefined, payload,
                          (statusCode, responsePayload) => {
                            if (statusCode == 200) {
                              alert("Cart Item has been successfully updated!");
                            } else {
                              alert(responsePayload.Error);
                            }
                          }
                        );
                      });
                  });
                } else {
                  app.logUserOut();
                }
              });
            document.getElementById("placeOrderCTA").style.display = 'block';
          } else {
            // Show the createCheck CTA
            document.getElementById("addToCartCTA").style.display = 'block';
          }
        } else {
          app.logUserOut();
        }
      });
  } else {
    app.logUserOut();
  }
};

app.loadOrderPage = function () {
  // Get the current token, or log the user out if none is there
  let userName = typeof (app.config.sessionToken.userName) == 'string' ? app.config.sessionToken.userName : false;
  if (userName) {
    app.client.request(undefined, 'api/users', 'GET', { userName }, undefined,
      (statusCode, userData) => {
        if (statusCode == 200) {
          document.querySelector("#orderCheckout .displayEmailInput").value = userData.email;
          document.querySelector(".hiddenEmailInput").value = userData.email;

          app.client.request(undefined, 'api/cart', 'GET', undefined, undefined,
            (statusCode, cartData) => {
              if (statusCode == 200) {
                document.querySelector(".total").value = cartData.total;
              } else {
                app.logUserOut();
              }
            });
        } else {
          app.logUserOut();
        }
      });
  } else {
    app.logUserOut();
  }
};

app.loadOrderCompletedPage = function () {
  // Get the current token, or log the user out if none is there
  let userName = typeof (app.config.sessionToken.userName) == 'string' ? app.config.sessionToken.userName : false;
  if (userName) {
    app.client.request(undefined, 'api/users', 'GET', { userName }, undefined,
      (statusCode, userData) => {
        if (statusCode == 200) {
          const lastOrderId = userData.orders[userData.orders.length - 1];
          document.querySelector("#orderCompleted .orderId").value = lastOrderId;
          document.querySelector("#orderCompleted .email").value = userData.email;
          app.client.request(undefined, 'api/order', 'GET', { id: lastOrderId }, undefined,
            (statusCode, orderData) => {
              if (statusCode == 200) {
                document.querySelector("#orderCompleted .orderDate").value = orderData.date;
                document.querySelector("#orderCompleted .total").value = orderData.details.cart.total;
                document.querySelector("#orderCompleted .items").textContent = JSON.stringify(orderData.details.cart.items, undefined, 2);
              } else {
                app.logUserOut();
              }
            });
        } else {
          app.logUserOut();
        }
      });
  } else {
    app.logUserOut();
  }
};

// Loop to renew token often
app.tokenRenewalLoop = function () {
  setInterval(function () {
    app.renewToken(function (err) {
      if (!err) {
        console.log("Token renewed successfully @ " + Date.now());
      }
    });
  }, 1000 * 60);
};

// Init (bootstrapping)
app.init = function () {
  // Bind all form submissions
  app.bindForms();
  // Bind logout logout button
  app.bindLogoutButton();
  // Get the token from localstorage
  app.getSessionToken();
  // Renew token
  app.tokenRenewalLoop();
  // Load data on page
  app.loadDataOnPage();
};

// Call the init processes after the window loads
window.onload = function () {
  app.init();
};
