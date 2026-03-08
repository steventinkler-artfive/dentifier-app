/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminUsers from './pages/AdminUsers';
import Assessment from './pages/Assessment';
import AssessmentDetail from './pages/AssessmentDetail';
import Customers from './pages/Customers';
import Dashboard from './pages/Dashboard';
import EditQuote from './pages/EditQuote';
import EditVehicle from './pages/EditVehicle';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';
import PublicPricing from './pages/PublicPricing';
import QuotePDF from './pages/QuotePDF';
import Quotes from './pages/Quotes';
import Reports from './pages/Reports';
import ResetPassword from './pages/ResetPassword';
import Settings from './pages/Settings';
import Subscription from './pages/Subscription';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import Upgrade from './pages/Upgrade';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminUsers": AdminUsers,
    "Assessment": Assessment,
    "AssessmentDetail": AssessmentDetail,
    "Customers": Customers,
    "Dashboard": Dashboard,
    "EditQuote": EditQuote,
    "EditVehicle": EditVehicle,
    "ForgotPassword": ForgotPassword,
    "Home": Home,
    "PublicPricing": PublicPricing,
    "QuotePDF": QuotePDF,
    "Quotes": Quotes,
    "Reports": Reports,
    "ResetPassword": ResetPassword,
    "Settings": Settings,
    "Subscription": Subscription,
    "SubscriptionSuccess": SubscriptionSuccess,
    "Upgrade": Upgrade,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};