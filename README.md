# LifeLink - Blood Donation Platform

LifeLink is a modern, mobile-first web application designed to connect blood donors with recipients in real-time. Built with Next.js, Supabase, and Prisma, it provides a seamless and secure platform for managing blood requests, donations, and communication.

This project was developed as a high-fidelity prototype, with a user interface strictly designed to look and feel like a native mobile application.

## Features

- **Unified User Profile:** A single account for both donors and recipients.
- **Multi-Step Onboarding:** A comprehensive flow including profile setup and a medical screening questionnaire.
- **Dashboard:** A central hub to view your profile summary, donation eligibility, and active blood requests.
- **Interactive Map:** A Google Maps interface to visually locate nearby blood requests, with filtering by blood type.
- **End-to-End Donation Flow:** Create requests, find donors, and securely confirm donations using an OTP verification system.
- **In-App Messaging:** Securely communicate with other users directly within the application.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Database:** Supabase (PostgreSQL)
- **ORM:** Prisma
- **Authentication:** Supabase Auth
- **Styling:** Tailwind CSS with shadcn/ui
- **Mapping:** Google Maps API

---

## Environment Variables Setup

To run this project locally, you need to set up the following environment variables. Create a `.env` file in the root of the project and add the following key-value pairs.

You can find these values in your Supabase project's API settings dashboard.

-   `DATABASE_URL`: The **pooled** connection string for your Supabase database. This is used by the Prisma client for general query operations. It must include the `pgbouncer=true` parameter.
    -   Example: `postgres://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true`

-   `DATABASE_URL_NON_POOLING`: The **direct** connection string for your Supabase database. This is required by Prisma for running migrations.
    -   Example: `postgres://postgres.[ref]:[password]@aws-0-ap-southeast-1.db.supabase.co:5432/postgres`

-   `NEXT_PUBLIC_SUPABASE_URL`: The public URL for your Supabase project.
    -   Example: `https://[ref].supabase.co`

-   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The public anonymous key for your Supabase project.

-   `SUPABASE_SERVICE_ROLE_KEY`: The secret "service_role" key for your Supabase project. This is used for admin-level operations on the backend.

-   `SUPABASE_JWT_SECRET`: The JWT Secret from your Supabase project's JWT settings.

-   `GOOGLE_MAPS_API_KEY`: Your API key for the Google Maps JavaScript API. This is required for the interactive map feature.

---

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-name>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the project root and populate it with the variables listed above.

4.  **Apply database schema:**
    Push the Prisma schema to your Supabase database. This will create all the necessary tables.
    ```bash
    npx prisma db push
    ```

5.  **Apply database triggers:**
    Push the Supabase-specific migrations to set up functions and triggers (e.g., for creating user profiles on signup).
    ```bash
    npx supabase db push
    ```

6.  **Run the development server:**
    ```bash
    npm run dev
    ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.