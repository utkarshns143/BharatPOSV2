import { Button } from './components/ui/Button';
import { ProductCard } from './components/shared/ProductCard';
import type { Product } from './types';

function App() {
  // Dummy data to test the UI
  const testProduct: Product = {
    id: '123',
    name: 'Aashirvaad Atta',
    category: 'Groceries',
    isLoose: false,
    reorderPoint: 5,
    variants: [{ id: 'v1', price: 250, quantity: '5 kg', stock: 10 }]
  };

  return (
    <div className="container" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h1>BharatPOS UI Test</h1>
      
      <div style={{ display: 'flex', gap: '1rem' }}>
        <Button variant="primary">Primary Button</Button>
        <Button variant="secondary">Secondary Button</Button>
        <Button variant="danger">Danger Button</Button>
      </div>

      <div style={{ width: '300px' }}>
        <ProductCard 
          product={testProduct} 
          actionLabel="Add to Cart" 
          onActionClick={(p: Product) => alert(`Added ${p.name} to cart!`)} 
        />
      </div>
    </div>
  );
}

export default App;