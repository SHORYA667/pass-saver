# PassSaver

PassSaver is a full-stack password manager that allows users to create
an account, securely log in, and store website credentials in a MongoDB
Atlas database.

## Features

- User Registration and Login
- JWT-based Authentication
- Password Hashing using bcrypt
- Store Website Credentials
- Edit and Delete Saved Passwords
- MongoDB Atlas Database
- Responsive Frontend
- REST API Backend

## Tech Stack

### Frontend

- HTML
- CSS
- JavaScript

### Backend

- Node.js
- Express.js

### Database

- MongoDB Atlas
- Mongoose

### Authentication

- JSON Web Token (JWT)
- bcrypt

## Project Structure

```text
project/
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── backend/
│   ├── server.js
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── package.json
│   └── .env
│
└── README.md
```

## Installation

### Clone the repository

```bash
git clone <repository-url>
cd project
```

### Backend

```bash
cd backend
npm install
npm start
```

### Frontend

Open `frontend/index.html` with Live Server or deploy it on Vercel.

## Environment Variables

Create a `.env` file inside the `backend` folder.

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
PORT=8000
```

## API Endpoints

### Authentication

- POST `/api/signup`
- POST `/api/login`
- GET `/api/me`

### Password Vault

- GET `/api/passwords`
- POST `/api/passwords`
- PUT `/api/passwords/:id`
- DELETE `/api/passwords/:id`

## Deployment

### Frontend

Deploy on Vercel.

### Backend

Deploy on Render.

### Database

Use MongoDB Atlas.

Update the frontend API base URL to point to the deployed backend.

## Security

- Passwords are hashed before storage.
- JWT is used for authentication.
- Protected routes require a valid Bearer token.

## Author

Developed by Shorya Sharma.
