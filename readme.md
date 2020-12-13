The basic workflow is:

1) generate user token: POST 'localhost:3000/tokens' with body: { "userName": "PeterBy", "password": "thisIsPassword" }
2) view(also add, edit, remove available) menu details: GET 'localhost:3000/menu' with token in headers
3) add user cart: POST 'localhost:3000/cart' with token in headers and body: { "items": [{"name": "Peperoni", "amount": 1}] }
4) modify user cart: PUT 'localhost:3000/cart' with token in headers and body: { "items": [{"name": "4Seasons", "amount": 2 }, { "name": "Margarita", "amount": 1}]}
5) create order: POST 'localhost:3000/order' with token in headers and body: { "paymentToken": "tok_visa" }
