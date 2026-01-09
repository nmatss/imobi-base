import type { Preview } from '@storybook/react-vite';
import { useEffect } from 'react';
import '../client/src/index.css'; // Tailwind CSS

// Decorator para tema dark/light
const withTheme = (Story: any, context: any) => {
  const { theme } = context.globals;

  useEffect(() => {
    const htmlElement = document.documentElement;

    // Remove classes de tema existentes
    htmlElement.classList.remove('light', 'dark');

    // Adiciona a classe do tema selecionado
    htmlElement.classList.add(theme || 'light');
  }, [theme]);

  return (
    <div className={theme || 'light'}>
      <div className="min-h-screen bg-background text-foreground p-4">
        <Story />
      </div>
    </div>
  );
};

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      disable: true, // Desabilitar porque estamos usando nosso próprio tema
    },
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', icon: 'sun', title: 'Light' },
          { value: 'dark', icon: 'moon', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [withTheme],
};

export default preview;
