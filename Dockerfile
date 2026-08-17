# Use official Node.js LTS image
FROM node:20

# Install system dependencies
RUN apt-get update && apt-get install -y graphicsmagick imagemagick

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the code
COPY . .

# Copy traineddata file
COPY eng.traineddata ./

# Set TESSDATA_PREFIX so Tesseract can find the traineddata file
ENV TESSDATA_PREFIX=/app

# Build the app (assume TypeScript)
RUN npm run build

# Expose port (if needed, e.g., 3000)
EXPOSE 3001

# Start the app
CMD ["node", "dist/index.js"] 