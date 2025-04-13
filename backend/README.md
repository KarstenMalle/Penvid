# Penvid Finance Backend

Backend server for the Penvid Finance application, handling authentication, database access, and currency conversion.

## Features

- Connect to Supabase for data storage
- Currency conversion based on user preferences
- RESTful API endpoints for all financial data
- Swagger documentation for API testing
- TypeScript for type safety

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and API keys

### Environment Setup

Create a `.env` file in the root of the backend directory with the following variables:

```
PORT=5000
NODE_ENV=development
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
ALLOW_ORIGINS=http://localhost:3000
```

### Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the development server
npm run dev
```

## API Documentation

When running in development mode, Swagger documentation is available at:

```
http://localhost:5000/api-docs
```

## Project Structure

```
backend/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # API route controllers
│   ├── services/       # Business logic
│   ├── models/         # Data models
│   ├── middleware/     # Custom middleware
│   ├── utils/          # Utility functions
│   ├── routes/         # API route definitions
│   └── index.ts        # Entry point
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript configuration
└── swagger.json        # Swagger API documentation
```

## Key Features

### Currency Conversion

The backend handles currency conversion based on the user's preferences. All financial data is stored in USD by default and converted to the user's preferred currency when retrieved.

Supported currencies:
- USD (US Dollar)
- DKK (Danish Krone)

To add more currencies, modify the `SupportedCurrency` enum in `src/services/currencyService.ts`.

### Authentication

Authentication is handled via Supabase. The backend validates the JWT token provided by the frontend and extracts the user ID for database operations.

### Financial Data

All financial data (accounts, transactions, loans, investments, goals) is retrieved with currency conversion applied based on the user's preferences.

## API Endpoints

### Profile

- `GET /api/profile` - Get the current user's profile
- `PATCH /api/profile` - Update the current user's profile

### Currency

- `GET /api/currencies` - Get all supported currencies
- `POST /api/currencies/convert` - Convert an amount between currencies
- `POST /api/currencies/refresh` - Refresh currency rates (admin only)

### Financial Data

- `GET /api/financial/accounts` - Get user accounts
- `GET /api/financial/transactions` - Get user transactions
- `GET /api/financial/loans` - Get user loans
- `GET /api/financial/investments` - Get user investments
- `GET /api/financial/goals` - Get user financial goals

## Testing

```bash
# Run tests
npm test
```

## Development Best Practices

1. Always add proper error handling
2. Use the ApiError class for consistent error responses
3. Add logging for important operations and errors
4. Keep controllers thin and move business logic to services
5. Use TypeScript interfaces for all data structures