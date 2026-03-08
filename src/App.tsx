import { Navigate, Route, Routes, Outlet } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RequireRole } from './components/RequireRole';
import { DashboardLayout } from './layout/DashboardLayout';
import { StoreLayout } from './layout/StoreLayout';
import { StorefrontProvider } from './contexts/StorefrontContext';
import { ProductCreatePage } from './features/products/ProductCreatePage';
import { ProductListPage } from './features/products/ProductListPage';
import { ProductEditPage } from './features/products/ProductEditPage';
import { PriceListPage } from './features/priceLists/PriceListPage';
import { CategoriesPage } from './features/categories/CategoriesPage';
import { BrandsPage } from './features/brands/BrandsPage';
import { AttributesPage } from './features/attributes/AttributesPage';
import { PaymentMethodsPage } from './features/paymentMethods/PaymentMethodsPage';
import { PromotionsPage } from './features/promotions/PromotionsPage';
import { OrdersPage } from './features/orders/OrdersPage';
import { OrderDetailPage as AdminOrderDetailPage } from './features/orders/OrderDetailPage';
import { UsersPage } from './features/users/UsersPage';
import { AppearancePage } from './features/settings/AppearancePage';
import { StoreLoginPage } from './features/storefront/auth/StoreLoginPage';
import { StoreRegisterPage } from './features/storefront/auth/StoreRegisterPage';
import { HomePage } from './features/storefront/HomePage';
import { ShopPage } from './features/storefront/ShopPage';
import { ProductDetailPage } from './features/storefront/ProductDetailPage';
import { CheckoutPage } from './features/storefront/CheckoutPage';
import { NotFoundPage } from './features/storefront/NotFoundPage';
import { CheckoutSuccessPage } from './features/storefront/CheckoutSuccessPage';
import { AccountLayout } from './features/storefront/account/AccountLayout';
import { CustomerOrdersPage } from './features/storefront/account/CustomerOrdersPage';
import { CustomerProfilePage } from './features/storefront/account/CustomerProfilePage';
import { OrderDetailPage as StorefrontOrderDetailPage } from './features/storefront/OrderDetailPage';
import { FavoritesPage } from './features/storefront/FavoritesPage';
import { PageBySlug } from './features/storefront/PageBySlug';
import { PagesListPage } from './features/pages/PagesListPage';
import { PageEditPage } from './features/pages/PageEditPage';
import { Sidebar } from './layout/Sidebar';
import { CartProvider } from './contexts/CartContext';
import { FavoritesProvider } from './contexts/FavoritesContext';

const AdminLayout = () => (
  <div className="min-h-screen flex bg-slate-900 text-slate-100">
    <Sidebar />
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  </div>
);

export const App = () => {
  return (
    <Routes>
      {/* Tienda pública (raíz) */}
      <Route
        path="/"
        element={
          <StorefrontProvider>
            <CartProvider>
              <FavoritesProvider>
                <StoreLayout />
              </FavoritesProvider>
            </CartProvider>
          </StorefrontProvider>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="tienda" element={<ShopPage />} />
        <Route path="producto/:id" element={<ProductDetailPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="checkout/success" element={<CheckoutSuccessPage />} />
        <Route path="login" element={<StoreLoginPage />} />
        <Route path="registro" element={<StoreRegisterPage />} />
        <Route path="favoritos" element={<FavoritesPage />} />
        <Route path="mi-cuenta" element={<AccountLayout />}>
          <Route index element={<Navigate to="pedidos" replace />} />
          <Route path="pedidos" element={<CustomerOrdersPage />} />
          <Route path="datos" element={<CustomerProfilePage />} />
          <Route path="pedido/:orderId" element={<StorefrontOrderDetailPage />} />
        </Route>
        <Route path=":slug" element={<PageBySlug />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Panel de administración: rutas anidadas para que coincidan /admin/productos, etc. */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="productos" replace />} />
        <Route path="productos" element={<ProductListPage />} />
        <Route path="productos/nuevo" element={<ProductCreatePage />} />
        <Route path="productos/:productId/editar" element={<ProductEditPage />} />
        <Route path="listas-de-precios" element={<PriceListPage />} />
        <Route path="categorias" element={<CategoriesPage />} />
        <Route path="marcas" element={<BrandsPage />} />
        <Route path="atributos" element={<AttributesPage />} />
        <Route path="medios-de-pago" element={<PaymentMethodsPage />} />
        <Route path="promociones" element={<PromotionsPage />} />
        <Route path="pedidos" element={<OrdersPage />} />
        <Route path="pedidos/:orderId" element={<AdminOrderDetailPage />} />
        <Route path="apariencia" element={<AppearancePage />} />
        <Route path="paginas" element={<PagesListPage />} />
        <Route path="paginas/:pageId/editar" element={<PageEditPage />} />
        <Route
          path="usuarios"
          element={
            <RequireRole role="admin">
              <UsersPage />
            </RequireRole>
          }
        />
      </Route>
    </Routes>
  );
};
