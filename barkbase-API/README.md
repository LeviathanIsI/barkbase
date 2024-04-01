# Fruits API
<img src="https://i.imgur.com/4fW408l.png" width="100%">




## Create a Route Table
Let's create a route table that will define and describe what each route in our application will do:

|       **URL**   | **REST Route** | **HTTP Verb** | **CRUD Action** |   **EJS View(s)**   |
| --------------- | -------------- | ------------- | --------------- | ------------------- |
| /fruits         | index          | GET           | read            |                     |
| /fruits/:id     | show           | GET           | read            |                     |
| /fruits         | create         | POST          | create          |                     |
| /fruits/:id     | update         | PATCH/PUT     | update          |                     |
| /fruits/:id     | destroy        | DELETE        | delete          |                     |
| /seed           |                | GET           | delete & create |                     |
| /*              |                | GET           |                 | 404.ejs             |
