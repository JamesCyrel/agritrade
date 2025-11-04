# AgriTrade Backend API

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   - Copy `.env.example` to `.env`
   - Update the database credentials in `.env`
   - Change `JWT_SECRET` to a secure random string

3. **Start PostgreSQL**
   - Make sure PostgreSQL is running on your machine
   - The database `agritrader` will be created automatically if it doesn't exist

4. **Run the Server**
   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify JWT token

## Database Schema

The application will automatically create the following tables:
- `users` - User accounts
- `profiles` - User profiles (linked to users)

## Project Structure

```
backend/
├── config/          # Configuration files (database, etc.)
├── controllers/     # Request handlers
├── middleware/      # Custom middleware
├── models/          # Database models
├── routes/          # API routes
└── server.js        # Main server file
```

