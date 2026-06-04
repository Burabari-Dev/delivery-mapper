# DeliveryMapper

DeliveryMapper is a comprehensive delivery management solution designed to streamline logistics and enhance communication between customers, delivery agents, and administrators.

## Project Structure

This repository is a monorepo containing the following sub-applications:

- **customer-app**: The user-facing application used for ordering and tracking deliveries. Built with Svelte 5 and Firebase.
- **agent-app**: Dedicated tool for delivery personnel to manage routes and task status.
- **admin-app**: Centralized dashboard for system monitoring, user management, and logistics oversight.

## Technology Stack

- **Frontend Framework**: [Svelte 5](https://svelte.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Backend Services**: [Firebase](https://firebase.google.com/) (Firestore, Auth, Hosting)
- **Mapping & Geolocation**: [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/overview)

## Development and CI/CD

The project uses GitHub Actions to automate workflows:

- **Build Customer App**: Automatically generates a production build (`dist`) for the `customer-app` whenever changes are merged into the `main` branch.

---