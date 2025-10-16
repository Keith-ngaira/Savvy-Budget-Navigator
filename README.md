# Savvy Budget Navigator

A comprehensive personal finance management application designed to help you track your income, expenses, budgets, and financial goals. Built with modern web technologies for a seamless user experience across all devices.

## ✨ Features

- **Transaction Management**: Track all your income and expenses in KSh
- **Budget Tracking**: Set and monitor spending limits by category
- **Financial Goals**: Save towards specific financial targets
- **Analytics & Reports**: Visualize your financial data with interactive charts
- **Cross-Platform**: Available on web, iOS, and Android
- **Secure**: Built with security best practices in mind

## 🚀 Tech Stack

- **Frontend**: 
  - React 18 with TypeScript
  - Vite (Build Tool)
  - Tailwind CSS with Shadcn/ui components
  - Radix UI Primitives
  - React Hook Form with Zod validation
  - TanStack Query (React Query)

- **State Management**:
  - React Context API
  - React Query for server state

- **Backend & Database**:
  - Supabase (PostgreSQL, Auth, Storage)
  - Row Level Security (RLS)

- **Mobile**:
  - Capacitor (for cross-platform mobile apps)

- **Development Tools**:
  - ESLint + Prettier
  - TypeScript
  - Git

## 📦 Prerequisites

- Node.js (v18 or later)
- npm (v9 or later) or yarn
- Git
- Supabase account (for backend services)
- Android Studio / Xcode (for mobile development)

## 🛠️ Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/savvy-budget-navigator.git
   cd savvy-budget-navigator
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key  # For admin operations
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   # or
   yarn dev
   ```
   The app will be available at `http://localhost:5173`

## 📱 Mobile App Setup

### Android
```bash
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

### iOS
```bash
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

## 🏗️ Project Structure

```
src/
├── components/     # Reusable UI components
├── lib/           # Utility functions and configurations
├── hooks/         # Custom React hooks
├── contexts/      # React context providers
├── pages/         # Application pages/routes
├── types/         # TypeScript type definitions
├── utils/         # Helper functions
└── App.tsx        # Main application component
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Shadcn/ui](https://ui.shadcn.com/) for the beautiful components
- [Radix UI](https://www.radix-ui.com/) for accessible primitives
- [Tailwind CSS](https://tailwindcss.com/) for utility-first CSS

1. **Add Transactions**: Record your income and expenses in KSh
2. **Set Budgets**: Create monthly budgets for different categories
3. **Track Goals**: Set financial goals and track your progress
4. **View Reports**: Analyze your spending patterns with interactive charts


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
