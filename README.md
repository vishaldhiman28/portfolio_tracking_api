# portfolio_tracking_api
A portfolio tracking API, which allows adding/deleting/updating trades and can do basic return calculations etc


## API Documentation 
  Check Postman Documentation <a href="https://documenter.getpostman.com/view/10207322/TVKEYHgu">Here</a>.



## Brief Description

```bash
├── app
│ ├── controllers
│
├── portfolio.controller.js: This defines all the logic that will be executed based on theparticular endpoint of the api.
│
└── validator
│
└── portfolio.validator.js: This contains simple schema for json data validation forAPI endpoint.
│ ├── models
│
├── portfolio_model.js : This defines the schema for the portfolio collection which contains all security.
│
└── trade_model.js : This defines the schema for the trades collection.
│ └── routes
│
├──routes.js: This defines all the api endpoint and associate them with the Function of the endpoint defined in the controllers.
├── config
│
├──database.config.js : This contains the database connection url.
└── server.js : This contains the main code for setting up express server and It also contains Code to establish connection with the Database. It also connect all   
                defined Routes for the api to server.
```
