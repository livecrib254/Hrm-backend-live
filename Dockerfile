# Use the official Node.js LTS image
FROM node:18-alpine

# Create a non-root user for enhanced security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Change ownership to the non-root user
RUN chown -R appuser:appgroup /usr/src/app

# Switch to the non-root user
USER appuser

# Expose the port the app runs on
EXPOSE 5174

# Define environment variable
ENV NODE_ENV=production

# Start the application
CMD ["node", "hrmServer.mjs"]
