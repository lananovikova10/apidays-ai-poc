# README

## Overview

This repository contains a Proof of Concept (PoC) for an API Documentation drafts generation app. 
The purpose of this PoC is to demonstrate and evaluate key functionalities and approaches related to documenting and interacting with APIs effectively.

## Project Structure

- **my-app/**: Contains the main application code.
    - **src/**: The source directory with the main components, utilities, and configuration files.
    - **public/**: Publicly accessible assets needed by the application.
    - **.env.local**: Environmental variables specific to this PoC.
- **netlify.toml**: Configuration file for deploying on Netlify.

## Key Features

- **Generate early drafts for conceptual API topics using GenAI**
- **Using OpenAPI spec and meeting notes as an input**

## Setup Instructions

Follow these steps to get the PoC up and running locally:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/lananovikova10/apidays-poc.git
   ```

2. **Navigate to the app directory:**
   ```bash
   cd api-docs-poc/my-app
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser at http://localhost:3000** to see the application in action.

## Deployment

The application is configured for deployment on Netlify. Ensure all changes are pushed to the main branch to trigger automatic deployments.

## Technologies Used

- **React**: For building the user interface.
- **TypeScript**: Offers type safety throughout the codebase.
- **Next.js**: Framework for server-side rendering and static site generation.
- **Tailwind CSS**: Provides utility-first CSS framework for styling.
- **Hugging Face Transformers**: Request to the GenAI model. 

## Contributing

Contributions are welcome! Please follow the steps below:

1. Fork the repository.
2. Create a new branch: `git checkout -b feature/my-feature`.
3. Make your changes and commit them: `git commit -m 'Add some feature'`.
4. Push your changes: `git push origin feature/my-feature`.
5. Submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For any questions or feedback, please contact: [Your Email] or open an issue.