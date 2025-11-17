# Savvy Budget Navigator

A comprehensive personal finance management application designed to help you track your income, expenses, budgets, and financial goals.

## ✨ Features

- **Transaction Management**: Track all your income and expenses in KSh
- **Receipt Management**: Upload and organize digital receipts
- **Budget Tracking**: Set and monitor spending limits by category
- **Financial Goals**: Save towards specific financial targets
- **Analytics & Reports**: Visualize your financial data with interactive charts
- **Data Export**: Download your financial data in various formats
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: Radix UI, Tailwind CSS
- **State Management**: React Query
- **Backend**: Supabase (Authentication, Database, Storage)
- **Build Tool**: Vite
- **Mobile**: Capacitor (for cross-platform mobile support)

## 📦 Prerequisites

- Node.js (v16 or later)
- npm (v8 or later) or yarn
- Supabase account (for backend services)
- Git

## 🛠️ Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Keith-ngaira/Savvy-Budget-Navigator.git
   cd Savvy-Budget-Navigator
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn
   ```

3. **Environment Setup**:
   - Create a `.env` file in the root directory
   - Add your Supabase credentials:
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

## 🚀 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## 📱 Mobile Development

This project includes Capacitor for mobile app development. To run on mobile:

1. Install Capacitor CLI (if not already installed):
   ```bash
   npm install -g @capacitor/cli
   ```

2. Add platforms:
   ```bash
   npx cap add android
   # or
   npx cap add ios
   ```

3. Sync and run:
   ```bash
   npx cap sync
   npx cap open android  # or ios
   ```

## 📂 Project Structure

```
src/
├── assets/         # Static assets
├── components/     # Reusable UI components
├── hooks/          # Custom React hooks
├── integrations/   # Third-party integrations
├── lib/            # Utility functions
└── pages/          # Application pages
```

## 🌐 Deployment

### Vercel (Recommended)

1. Push your code to a GitHub repository
2. Import the project on Vercel
3. Add environment variables in Vercel project settings
4. Deploy!

### Netlify

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Build and deploy:
   ```bash
   npm run build
   netlify deploy --prod
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

- [Vite](https://vitejs.dev/) for the amazing build tooling
- [Supabase](https://supabase.com/) for the backend services
- [Radix UI](https://www.radix-ui.com/) for accessible UI components
- [Tailwind CSS](https://tailwindcss.com/) for utility-first CSS
