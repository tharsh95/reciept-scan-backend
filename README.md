# Receipt Scanner API

A Node.js backend API for scanning, processing, and managing receipts using OCR technology.

## Features

- User authentication and authorization
- Receipt upload and OCR processing
- Receipt management (CRUD operations)
- Receipt analytics and statistics
- File management with automatic cleanup
- Category management
- Search and filtering capabilities

## Tech Stack

- Node.js with TypeScript
- Express.js
- Prisma ORM
- PostgreSQL
- Tesseract.js for OCR
- JWT for authentication
- Multer for file uploads

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/tharsh95/reciept-scan-backend.git
cd receipt-scan-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the backend directory with the following variables:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-key-here"
GEMINI_API_KEY=""
```

4. Initialize the database:
```bash
npx prisma migrate dev
```

5. Start the server:
```bash
npm run dev
```

## API Routes

### Authentication

#### Register User
- **POST** `/api/users/register`
- **Body:**
  ```json
  {
    "name": "string",
    "email": "string",
    "password": "string"
  }
  ```
- **Response:** JWT token and user data

#### Login
- **POST** `/api/users/login`
- **Body:**
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response:** JWT token and user data

#### Get Profile
- **GET** `/api/users/profile`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** User profile data

### Receipts

#### Upload Receipt
- **POST** `/api/receipts/upload`
- **Headers:** 
  - `Authorization: Bearer <token>`
  - `Content-Type: multipart/form-data`
- **Body:** Form data with `receipt` file
- **Response:** Processed receipt data

#### List Receipts
- **GET** `/api/receipts`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  - `page` (default: 1)
  - `limit` (default: 10)
  - `startDate` (optional)
  - `endDate` (optional)
  - `category` (optional)
  - `search` (optional)
- **Response:** Paginated list of receipts

#### Get Receipt
- **GET** `/api/receipts/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** Receipt details

#### Update Receipt
- **PUT** `/api/receipts/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "merchantName": "string",
    "totalAmount": number,
    "purchasedAt": "string",
    "category": "string",
    "notes": "string",
    "items": [
      {
        "name": "string",
        "quantity": number,
        "price": number
      }
    ]
  }
  ```
- **Response:** Updated receipt data

#### Delete Receipt
- **DELETE** `/api/receipts/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** Success message

#### Get Receipt Statistics
- **GET** `/api/receipts/stats`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  - `startDate` (optional)
  - `endDate` (optional)
- **Response:** Receipt statistics including:
  - Total spent
  - Average amount
  - Category breakdown
  - Monthly breakdown

## Data Models

### User
```typescript
{
  id: string
  name: string
  email: string
  password: string
  createdAt: Date
  updatedAt: Date
}
```

### Receipt
```typescript
{
  id: string
  merchantName: string
  totalAmount: number
  purchasedAt: Date
  category?: string
  notes?: string
  filePath: string
  userId: string
  createdAt: Date
  updatedAt: Date
}
```

### ReceiptItem
```typescript
{
  id: string
  name: string
  quantity: number
  price: number
  receiptId: string
}
```

## File Management

- Supported file types: PDF and images
- Maximum file size: 5MB
- Files are stored in the `uploads` directory
- Automatic cleanup of orphaned files every 24 hours(Removed)

## Security

- JWT-based authentication
- Password hashing using bcrypt
- File type validation
- File size limits
- Input validation using Zod
- CORS enabled

## Development

### Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm start`: Start production server
- `npm run lint`: Run linter
- `npm run test`: Run tests

### Database Migrations

```bash
npx prisma migrate dev    # Create and apply migrations
npx prisma generate      # Generate Prisma Client
npx prisma studio       # Open Prisma Studio
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT 
